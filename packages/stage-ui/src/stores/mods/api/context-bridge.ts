import type { ChatProvider } from '@xsai-ext/providers/utils'
import type { UserMessage } from '@xsai/shared-chat'

import type { ChatStreamEvent, ChatStreamEventContext, ContextMessage } from '../../../types/chat'

import { isStageTamagotchi, isStageWeb } from '@proj-airi/stage-shared'
import { useBroadcastChannel } from '@vueuse/core'
import { Mutex } from 'es-toolkit'
import { nanoid } from 'nanoid'
import { defineStore, storeToRefs } from 'pinia'
import { ref, toRaw, watch } from 'vue'

import { useChatOrchestratorStore } from '../../chat'
import { CHAT_STREAM_CHANNEL_NAME, CONTEXT_CHANNEL_NAME } from '../../chat/constants'
import { useChatContextStore } from '../../chat/context-store'
import { useChatSessionStore } from '../../chat/session-store'
import { useChatStreamStore } from '../../chat/stream-store'
import { useConsciousnessStore } from '../../modules/consciousness'
import { useSpeechStore } from '../../modules/speech'
import { useProvidersStore } from '../../providers'
import { useModsServerChannelStore } from './channel-server'

function cloneContextForBroadcast(context: ChatStreamEventContext): ChatStreamEventContext {
  const raw = toRaw(context)
  const cloneable = {
    ...raw,
    input: raw.input
      ? {
          ...raw.input,
          data: {
            ...raw.input.data,
            attachments: undefined,
          },
        }
      : undefined,
  }
  return structuredClone(cloneable)
}

export const useContextBridgeStore = defineStore('mods:api:context-bridge', () => {
  const mutex = new Mutex()

  const chatOrchestrator = useChatOrchestratorStore()
  const chatSession = useChatSessionStore()
  const chatStream = useChatStreamStore()
  const chatContext = useChatContextStore()
  const serverChannelStore = useModsServerChannelStore()
  const consciousnessStore = useConsciousnessStore()
  const providersStore = useProvidersStore()
  const { activeProvider, activeModel } = storeToRefs(consciousnessStore)

  // Synthesize an entire assistant reply into one audio clip (mp3 from the
  // official gateway) so bot modules (telegram/discord/qq) can forward a voice
  // message. Mirrors the provider/model/voice fallback logic in Stage.vue's
  // streaming TTS pipeline, but produces a single non-streamed clip.
  // Returns null (never throws) when speech is unconfigured or synthesis fails.
  async function synthesizeReplyAudio(text: string): Promise<ArrayBuffer | null> {
    try {
      const trimmed = text?.trim()
      if (!trimmed)
        return null

      // Lazy-access speechStore to avoid triggering its immediate watcher
      // before async provider validation completes (race condition that
      // resets activeSpeechProvider to 'speech-noop').
      const speechStore = useSpeechStore()
      const activeSpeechProvider = speechStore.activeSpeechProvider
      const activeSpeechModel = speechStore.activeSpeechModel
      const activeSpeechVoice = speechStore.activeSpeechVoice

      if (!activeSpeechProvider || activeSpeechProvider === 'speech-noop')
        return null

      const provider = await providersStore.getProviderInstance(activeSpeechProvider) as any
      if (!provider)
        return null

      const providerConfig = providersStore.getProviderConfig(activeSpeechProvider)
      let model = activeSpeechModel
      let voiceInfo = activeSpeechVoice

      if (activeSpeechProvider === 'openai-compatible-audio-speech' || activeSpeechProvider === 'airi-official-audio-speech') {
        if (!model) {
          model = (providerConfig?.model as string)
            || (activeSpeechProvider === 'airi-official-audio-speech' ? 'stepfun/stepaudio-2.5-tts' : 'tts-1')
        }
        if (!voiceInfo) {
          const fallbackVoiceId = (providerConfig?.voice as string)
            || (activeSpeechProvider === 'airi-official-audio-speech' ? 'yuanqishaonv' : 'alloy')
          voiceInfo = {
            id: fallbackVoiceId,
            name: fallbackVoiceId,
            description: fallbackVoiceId,
            previewURL: '',
            languages: [{ code: 'en', title: 'English' }],
            provider: activeSpeechProvider,
            gender: 'neutral',
          } as any
        }
      }

      if (!model || !voiceInfo)
        return null

      const audio = await speechStore.speech(provider, model, trimmed, voiceInfo.id, providerConfig)
      if (!audio || audio.byteLength === 0)
        return null

      return audio
    }
    catch (err) {
      console.error('[context-bridge] reply audio synthesis failed:', err)
      return null
    }
  }

  const { post: broadcastContext, data: incomingContext } = useBroadcastChannel<ContextMessage, ContextMessage>({ name: CONTEXT_CHANNEL_NAME })
  const { post: broadcastStreamEvent, data: incomingStreamEvent } = useBroadcastChannel<ChatStreamEvent, ChatStreamEvent>({ name: CHAT_STREAM_CHANNEL_NAME })

  const disposeHookFns = ref<Array<() => void>>([])
  let remoteStreamGuard: { sessionId: string, generation: number } | null = null

  async function initialize() {
    await mutex.acquire()

    try {
      let isProcessingRemoteStream = false

      const { stop } = watch(incomingContext, (event) => {
        if (event)
          chatContext.ingestContextMessage(event)
      })
      disposeHookFns.value.push(stop)

      disposeHookFns.value.push(serverChannelStore.onContextUpdate((event) => {
        const contextMessage: ContextMessage = {
          ...event.data,
          metadata: event.metadata,
          createdAt: Date.now(),
        }
        chatContext.ingestContextMessage(contextMessage)
        broadcastContext(toRaw(contextMessage))
      }))

      disposeHookFns.value.push(serverChannelStore.onEvent('input:text', async (event) => {
        const {
          text,
          textRaw,
          attachments,
          overrides,
          contextUpdates,
        } = event.data

        const normalizedContextUpdates = contextUpdates?.map((update) => {
          const id = update.id ?? nanoid()
          const contextId = update.contextId ?? id
          return {
            ...update,
            id,
            contextId,
          }
        })

        if (normalizedContextUpdates?.length) {
          const createdAt = Date.now()
          for (const update of normalizedContextUpdates) {
            chatContext.ingestContextMessage({
              ...update,
              metadata: event.metadata,
              createdAt,
            })
          }
        }

        if (activeProvider.value && activeModel.value) {
          const chatProvider = await providersStore.getProviderInstance<ChatProvider>(activeProvider.value)

          let messageText = text
          const targetSessionId = overrides?.sessionId

          if (overrides?.messagePrefix) {
            messageText = `${overrides.messagePrefix}${text}`
          }

          // TODO(@nekomeowww): This only guard for input:text events handling and doesn't cover the entire ingestion
          // process. Another critical path of spark:notify is affected too, I think for better future development
          // experience, we should discover and find either a leader election or distributed lock solution to
          // coordinate the modules that handles context bridge ingestion across multiple windows/tabs.
          //
          // Background behind this, as server-sdk is in fact integrated in every Stage Web window/tab, each
          // window/tab has its own connection & chat orchestrator instance, when multiple windows/tabs are open,
          // each of them will receive the same input:text event and process ingestion independently, causing
          // duplicated messages handling and output:* events emission.
          //
          // We don't have ability to control how many windows/tabs the user will open (sometimes) user will forget
          // to close the extra windows/tabs, so we need a way to coordinate the ingestion processing to
          // ensure only one window/tab is handling the ingestion at a time.
          //
          // SharedWorker solution was considered but it's completely disabled in Chromium based Android browsers
          // (which is a big portion of mobile Stage Web users as stage-ui serves as the unified / universal
          // api wrapper for most of the shared logic across Web, Pocket, and Tamagotchi).
          //
          // Read more here:
          // - https://chromestatus.com/feature/6265472244514816
          // - https://developer.mozilla.org/en-US/docs/Web/API/SharedWorker
          // - https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API
          navigator.locks.request('context-bridge:event:input:text', async () => {
            try {
              await chatOrchestrator.ingest(messageText, {
                model: activeModel.value,
                chatProvider,
                attachments,
                input: {
                  type: 'input:text',
                  data: {
                    ...event.data,
                    text,
                    textRaw,
                    overrides,
                    contextUpdates: normalizedContextUpdates,
                  },
                },
              }, targetSessionId)
            }
            catch (err) {
              console.error('Error ingesting text input via context bridge:', err)
              serverChannelStore.send({
                type: 'output:gen-ai:chat:message',
                data: {
                  ...event.data,
                  message: { role: 'assistant', content: `AIRI could not complete the request: ${err instanceof Error ? err.message : String(err)}` },
                },
              })
            }
          })
        }
        else {
          serverChannelStore.send({
            type: 'output:gen-ai:chat:message',
            data: {
              ...event.data,
              message: { role: 'assistant', content: 'AIRI has no active chat model. Configure an AI provider and model in AIRI, then try again.' },
            },
          })
        }
      }))

      disposeHookFns.value.push(
        chatOrchestrator.onBeforeMessageComposed(async (message, context) => {
          if (isProcessingRemoteStream)
            return

          broadcastStreamEvent({ type: 'before-compose', message, sessionId: chatSession.activeSessionId, context: cloneContextForBroadcast(context) })
        }),
        chatOrchestrator.onAfterMessageComposed(async (message, context) => {
          if (isProcessingRemoteStream)
            return

          broadcastStreamEvent({ type: 'after-compose', message, sessionId: chatSession.activeSessionId, context: cloneContextForBroadcast(context) })
        }),
        chatOrchestrator.onBeforeSend(async (message, context) => {
          if (isProcessingRemoteStream)
            return

          broadcastStreamEvent({ type: 'before-send', message, sessionId: chatSession.activeSessionId, context: cloneContextForBroadcast(context) })
        }),
        chatOrchestrator.onAfterSend(async (message, context) => {
          if (isProcessingRemoteStream)
            return

          broadcastStreamEvent({ type: 'after-send', message, sessionId: chatSession.activeSessionId, context: cloneContextForBroadcast(context) })
        }),
        chatOrchestrator.onTokenLiteral(async (literal, context) => {
          if (isProcessingRemoteStream)
            return

          broadcastStreamEvent({ type: 'token-literal', literal, sessionId: chatSession.activeSessionId, context: cloneContextForBroadcast(context) })
        }),
        chatOrchestrator.onTokenSpecial(async (special, context) => {
          if (isProcessingRemoteStream)
            return

          broadcastStreamEvent({ type: 'token-special', special, sessionId: chatSession.activeSessionId, context: cloneContextForBroadcast(context) })
        }),
        chatOrchestrator.onStreamEnd(async (context) => {
          if (isProcessingRemoteStream)
            return

          broadcastStreamEvent({ type: 'stream-end', sessionId: chatSession.activeSessionId, context: cloneContextForBroadcast(context) })
        }),
        chatOrchestrator.onAssistantResponseEnd(async (message, context) => {
          if (isProcessingRemoteStream)
            return

          broadcastStreamEvent({ type: 'assistant-end', message, sessionId: chatSession.activeSessionId, context: cloneContextForBroadcast(context) })
        }),

        chatOrchestrator.onAssistantMessage(async (message, messageText, context) => {
          serverChannelStore.send({
            type: 'output:gen-ai:chat:message',
            data: {
              ...context.input?.data,
              message,
              'stage-web': isStageWeb(),
              'stage-tamagotchi': isStageTamagotchi(),
              'gen-ai:chat': {
                message: context.message as UserMessage,
                composedMessage: context.composedMessage,
                contexts: context.contexts,
                input: context.input,
              },
            },
          })

          // Voice reply for bot modules: only when the request originated from a
          // messaging bot (telegram/qq/discord), synthesize the whole reply once
          // and forward the audio so the bot can send a voice message. This never
          // blocks or breaks the text reply above (which was already sent).
          const inputData = context.input?.data as Record<string, unknown> | undefined
          const botSource = inputData?.telegram ?? inputData?.qq ?? inputData?.discord
          if (botSource) {
            void (async () => {
              try {
                const audio = await synthesizeReplyAudio(messageText)
                if (!audio)
                  return

                // Encode to base64 so the audio survives WebSocket/superjson
                // round-tripping as a plain string (raw ArrayBuffer degrades to
                // a plain object on the bot side).
                const bytes = new Uint8Array(audio)
                let binary = ''
                for (let i = 0; i < bytes.length; i++)
                  binary += String.fromCharCode(bytes[i])
                const audioBase64 = btoa(binary)

                serverChannelStore.send({
                  type: 'output:gen-ai:speech:audio',
                  data: {
                    audioBase64,
                    mimeType: 'audio/mpeg',
                    transcript: messageText,
                    ...(inputData?.telegram ? { telegram: inputData.telegram } : {}),
                    ...(inputData?.qq ? { qq: inputData.qq } : {}),
                    ...(inputData?.discord ? { discord: inputData.discord } : {}),
                    'gen-ai:chat': {
                      message: context.message as UserMessage,
                      composedMessage: context.composedMessage,
                      contexts: context.contexts,
                      input: context.input,
                    },
                  } as any,
                })
              }
              catch (err) {
                console.error('[context-bridge] failed to send reply audio:', err)
              }
            })()
          }
        }),

        chatOrchestrator.onChatTurnComplete(async (chat, context) => {
          serverChannelStore.send({
            type: 'output:gen-ai:chat:complete',
            data: {
              ...context.input?.data,
              'message': chat.output,
              // TODO: tool calls should be captured properly
              'toolCalls': [],
              'stage-web': isStageWeb(),
              'stage-tamagotchi': isStageTamagotchi(),
              // TODO: Properly calculate usage data
              'usage': {
                promptTokens: 0,
                completionTokens: 0,
                totalTokens: 0,
                source: 'estimate-based',
              },
              'gen-ai:chat': {
                message: context.message as UserMessage,
                composedMessage: context.composedMessage,
                contexts: context.contexts,
                input: context.input,
              },
            },
          })
        }),
      )

      const { stop: stopIncomingStreamWatch } = watch(incomingStreamEvent, async (event) => {
        if (!event)
          return

        isProcessingRemoteStream = true

        try {
          // Use the receiver's active session to avoid clobbering chat state when events come from other windows/devtools.
          switch (event.type) {
            case 'before-compose':
              await chatOrchestrator.emitBeforeMessageComposedHooks(event.message, event.context)
              break
            case 'after-compose':
              await chatOrchestrator.emitAfterMessageComposedHooks(event.message, event.context)
              break
            case 'before-send':
              await chatOrchestrator.emitBeforeSendHooks(event.message, event.context)
              remoteStreamGuard = {
                sessionId: chatSession.activeSessionId,
                generation: chatSession.getSessionGenerationValue(),
              }
              chatOrchestrator.sending = true
              chatStream.beginStream()
              break
            case 'after-send':
              await chatOrchestrator.emitAfterSendHooks(event.message, event.context)
              break
            case 'token-literal':
              if (!remoteStreamGuard)
                return
              if (remoteStreamGuard.sessionId !== chatSession.activeSessionId)
                return
              if (chatSession.getSessionGenerationValue(remoteStreamGuard.sessionId) !== remoteStreamGuard.generation)
                return
              chatStream.appendStreamLiteral(event.literal)
              await chatOrchestrator.emitTokenLiteralHooks(event.literal, event.context)
              break
            case 'token-special':
              await chatOrchestrator.emitTokenSpecialHooks(event.special, event.context)
              break
            case 'stream-end':
              if (!remoteStreamGuard)
                break
              if (remoteStreamGuard.sessionId !== chatSession.activeSessionId)
                break
              if (chatSession.getSessionGenerationValue(remoteStreamGuard.sessionId) !== remoteStreamGuard.generation)
                break
              await chatOrchestrator.emitStreamEndHooks(event.context)
              chatStream.finalizeStream()
              chatOrchestrator.sending = false
              remoteStreamGuard = null
              break
            case 'assistant-end':
              if (!remoteStreamGuard)
                break
              if (remoteStreamGuard.sessionId !== chatSession.activeSessionId)
                break
              if (chatSession.getSessionGenerationValue(remoteStreamGuard.sessionId) !== remoteStreamGuard.generation)
                break
              await chatOrchestrator.emitAssistantResponseEndHooks(event.message, event.context)
              chatStream.finalizeStream(event.message)
              chatOrchestrator.sending = false
              remoteStreamGuard = null
              break
          }
        }
        finally {
          isProcessingRemoteStream = false
        }
      })
      disposeHookFns.value.push(stopIncomingStreamWatch)
    }
    finally {
      mutex.release()
    }
  }

  async function dispose() {
    await mutex.acquire()

    try {
      for (const fn of disposeHookFns.value) {
        fn()
      }
    }
    finally {
      mutex.release()
    }

    disposeHookFns.value = []
  }

  return {
    initialize,
    dispose,
  }
})
