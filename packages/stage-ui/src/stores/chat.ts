import type { WebSocketEventInputs } from '@proj-airi/server-sdk'
import type { ChatProvider } from '@xsai-ext/providers/utils'
import type { CommonContentPart, Message, ToolMessage } from '@xsai/shared-chat'

import type { ChatAssistantMessage, ChatSlices, ChatStreamEventContext, StreamingAssistantMessage } from '../types/chat'
import type { StreamEvent, StreamOptions } from './llm'

import { createQueue } from '@proj-airi/stream-kit'
import { nanoid } from 'nanoid'
import { defineStore, storeToRefs } from 'pinia'
import { ref, toRaw } from 'vue'

import { useAnalytics } from '../composables'
import { useLlmmarkerParser } from '../composables/llm-marker-parser'
import { categorizeResponse, createStreamingCategorizer } from '../composables/response-categoriser'
import {
  extractLive2DExpressionControls,
  makeLive2DExpressionControlSpecial,
  stripLive2DExpressionControls,
} from '../constants/live2d-expression-controls'
import { useAutoGLMStore } from './autoglm'
import { createDatetimeContext } from './chat/context-providers'
import { useChatContextStore } from './chat/context-store'
import { createChatHooks } from './chat/hooks'
import { useChatSessionStore } from './chat/session-store'
import { useChatStreamStore } from './chat/stream-store'
import { useLLM } from './llm'
import { useConsciousnessStore } from './modules/consciousness'

interface SendOptions {
  model?: string
  chatProvider?: ChatProvider
  providerConfig?: Record<string, unknown>
  attachments?: { type: 'image' | 'file', data: string, mimeType: string, filename?: string }[]
  tools?: StreamOptions['tools']
  input?: WebSocketEventInputs
}

interface ForkOptions {
  fromSessionId?: string
  atIndex?: number
  reason?: string
  hidden?: boolean
}

interface QueuedSend {
  sendingMessage: string
  options: SendOptions
  generation: number
  sessionId: string
  cancelled?: boolean
  deferred: {
    resolve: () => void
    reject: (error: unknown) => void
  }
}

export const useChatOrchestratorStore = defineStore('chat-orchestrator', () => {
  const llmStore = useLLM()
  const consciousnessStore = useConsciousnessStore()
  const { activeProvider } = storeToRefs(consciousnessStore)
  const { trackFirstMessage } = useAnalytics()

  const chatSession = useChatSessionStore()
  const chatStream = useChatStreamStore()
  const chatContext = useChatContextStore()
  const { activeSessionId } = storeToRefs(chatSession)
  const { streamingMessage } = storeToRefs(chatStream)

  const sending = ref(false)
  const pendingQueuedSends = ref<QueuedSend[]>([])
  const hooks = createChatHooks()

  const sendQueue = createQueue<QueuedSend>({
    handlers: [
      async ({ data }) => {
        const { sendingMessage, options, generation, deferred, sessionId, cancelled } = data

        if (cancelled)
          return

        if (chatSession.getSessionGeneration(sessionId) !== generation) {
          deferred.reject(new Error('Chat session was reset before send could start'))
          return
        }

        try {
          await performSend(sendingMessage, options, generation, sessionId)
          deferred.resolve()
        }
        catch (error) {
          deferred.reject(error)
        }
      },
    ],
  })

  sendQueue.on('enqueue', (queuedSend) => {
    pendingQueuedSends.value = [...pendingQueuedSends.value, queuedSend]
  })

  sendQueue.on('dequeue', (queuedSend) => {
    pendingQueuedSends.value = pendingQueuedSends.value.filter(item => item !== queuedSend)
  })

  async function performSend(
    sendingMessage: string,
    options: SendOptions,
    generation: number,
    sessionId: string,
  ) {
    if (!sendingMessage && !options.attachments?.length)
      return

    chatSession.ensureSession(sessionId)

    const autoGLM = useAutoGLMStore()
    if (autoGLM.shouldHandleChat && sendingMessage.trim() && !options.attachments?.length) {
      await performAutoGLMSend(sendingMessage, generation, sessionId)
      return
    }

    if (!options.model || !options.chatProvider)
      throw new Error('Chat provider is not configured')

    // Inject current datetime context before composing the message
    chatContext.ingestContextMessage(createDatetimeContext())

    const sendingCreatedAt = Date.now()
    const streamingMessageContext: ChatStreamEventContext = {
      message: { role: 'user', content: sendingMessage, createdAt: sendingCreatedAt, id: nanoid() },
      contexts: chatContext.getContextsSnapshot(),
      composedMessage: [],
      input: options.input,
    }

    const isStaleGeneration = () => chatSession.getSessionGeneration(sessionId) !== generation
    const shouldAbort = () => isStaleGeneration()
    if (shouldAbort())
      return

    sending.value = true

    const isForegroundSession = () => sessionId === activeSessionId.value

    const buildingMessage: StreamingAssistantMessage = { role: 'assistant', content: '', slices: [], tool_results: [], createdAt: Date.now(), id: nanoid() }
    let pendingExpressionControlText = ''

    let updateUIFrame: number | undefined
    const flushUI = () => {
      if (updateUIFrame != null) {
        cancelAnimationFrame(updateUIFrame)
        updateUIFrame = undefined
      }
      if (isForegroundSession()) {
        streamingMessage.value = JSON.parse(JSON.stringify(buildingMessage))
      }
    }
    const updateUI = () => {
      if (updateUIFrame != null)
        return

      updateUIFrame = requestAnimationFrame(() => {
        updateUIFrame = undefined
        flushUI()
      })
    }
    const handleAssistantLiteral = async (literal: string, context: ChatStreamEventContext) => {
      pendingExpressionControlText += literal

      let textForExtraction = pendingExpressionControlText
      pendingExpressionControlText = ''

      const incompleteControlStart = textForExtraction.lastIndexOf('[[')
      if (incompleteControlStart >= 0 && !textForExtraction.includes(']]', incompleteControlStart + 2)) {
        pendingExpressionControlText = textForExtraction.slice(incompleteControlStart)
        textForExtraction = textForExtraction.slice(0, incompleteControlStart)
      }
      else if (textForExtraction.endsWith('[')) {
        pendingExpressionControlText = '['
        textForExtraction = textForExtraction.slice(0, -1)
      }

      if (pendingExpressionControlText.length > 200) {
        textForExtraction += pendingExpressionControlText
        pendingExpressionControlText = ''
      }

      const expressionControlResult = extractLive2DExpressionControls(textForExtraction)
      for (const control of expressionControlResult.controls)
        await hooks.emitTokenSpecialHooks(makeLive2DExpressionControlSpecial(control), context)

      if (expressionControlResult.visibleText.trim()) {
        buildingMessage.content += expressionControlResult.visibleText

        await hooks.emitTokenLiteralHooks(expressionControlResult.visibleText, context)

        const lastSlice = buildingMessage.slices.at(-1)
        if (lastSlice?.type === 'text') {
          lastSlice.text += expressionControlResult.visibleText
        }
        else {
          buildingMessage.slices.push({
            type: 'text',
            text: expressionControlResult.visibleText,
          })
        }
        updateUI()
      }
    }
    const flushPendingExpressionControlText = async (context: ChatStreamEventContext) => {
      if (!pendingExpressionControlText)
        return

      const tail = pendingExpressionControlText
      pendingExpressionControlText = ''
      await handleAssistantLiteral(tail, context)
    }

    flushUI()
    trackFirstMessage()

    try {
      await hooks.emitBeforeMessageComposedHooks(sendingMessage, streamingMessageContext)

      const contentParts: CommonContentPart[] = [{ type: 'text', text: sendingMessage }]

      if (options.attachments) {
        for (const attachment of options.attachments) {
          if (attachment.type === 'image') {
            contentParts.push({
              type: 'image_url',
              image_url: {
                url: `data:${attachment.mimeType};base64,${attachment.data}`,
              },
            })
          }
          else {
            contentParts.push({
              type: 'file',
              file: {
                file_data: `data:${attachment.mimeType};base64,${attachment.data}`,
                filename: attachment.filename,
              },
            })
          }
        }
      }

      const finalContent = contentParts.length > 1 ? contentParts : sendingMessage
      if (!streamingMessageContext.input) {
        streamingMessageContext.input = {
          type: 'input:text',
          data: {
            text: sendingMessage,
          },
        }
      }

      if (shouldAbort())
        return

      const sessionMessagesForSend = chatSession.getSessionMessages(sessionId)
      sessionMessagesForSend.push({ role: 'user', content: finalContent, createdAt: sendingCreatedAt, id: nanoid() })
      chatSession.persistSessionMessages(sessionId)

      const categorizer = createStreamingCategorizer(activeProvider.value)
      let streamPosition = 0

      const parser = useLlmmarkerParser({
        onLiteral: async (literal) => {
          if (shouldAbort())
            return

          categorizer.consume(literal)

          const speechOnly = categorizer.filterToSpeech(literal, streamPosition)
          streamPosition += literal.length

          await handleAssistantLiteral(speechOnly, streamingMessageContext)
        },
        onSpecial: async (special) => {
          if (shouldAbort())
            return

          await hooks.emitTokenSpecialHooks(special, streamingMessageContext)
        },
        onEnd: async (fullText) => {
          if (isStaleGeneration())
            return

          const finalCategorization = categorizeResponse(stripLive2DExpressionControls(fullText), activeProvider.value)

          buildingMessage.categorization = {
            speech: finalCategorization.speech,
            reasoning: finalCategorization.reasoning,
          }
          updateUI()
        },
        minLiteralEmitLength: 4,
      })

      const toolCallQueue = createQueue<ChatSlices>({
        handlers: [
          async (ctx) => {
            if (shouldAbort())
              return
            if (ctx.data.type === 'tool-call') {
              buildingMessage.slices.push(ctx.data)
              updateUI()
              return
            }

            if (ctx.data.type === 'tool-call-result') {
              buildingMessage.tool_results.push(ctx.data)
              updateUI()
            }
          },
        ],
      })

      let newMessages = sessionMessagesForSend.map((msg) => {
        const { context: _context, id: _id, createdAt: _createdAt, ...withoutContext } = msg
        const rawMessage = toRaw(withoutContext)

        if (rawMessage.role === 'assistant') {
          const { slices: _slices, tool_results: _toolResults, categorization: _categorization, ...rest } = rawMessage as ChatAssistantMessage
          return toRaw(rest)
        }

        return rawMessage
      })

      const contextsSnapshot = chatContext.getContextsSnapshot()
      if (Object.keys(contextsSnapshot).length > 0) {
        const system = newMessages.slice(0, 1)
        const afterSystem = newMessages.slice(1, newMessages.length)

        newMessages = [
          ...system,
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: ''
                  + 'These are the contextual information retrieved or on-demand updated from other modules, you may use them as context for chat, or reference of the next action, tool call, etc.:\n'
                  + `${Object.entries(contextsSnapshot).map(([key, value]) => `Module ${key}: ${JSON.stringify(value)}`).join('\n')}\n`,
              },
            ],
          },
          ...afterSystem,
        ]
      }

      streamingMessageContext.composedMessage = newMessages as Message[]

      await hooks.emitAfterMessageComposedHooks(sendingMessage, streamingMessageContext)
      newMessages = streamingMessageContext.composedMessage as typeof newMessages
      await hooks.emitBeforeSendHooks(sendingMessage, streamingMessageContext)

      const headers = (options.providerConfig?.headers || {}) as Record<string, string>

      if (shouldAbort())
        return

      await llmStore.stream(options.model, options.chatProvider, newMessages as Message[], {
        headers,
        tools: options.tools,
        // NOTICE: xsai stream may emit `finish` before tool steps continue, so keep waiting until
        // the final non-tool finish to avoid ending the chat turn with no assistant reply.
        waitForTools: true,
        onStreamEvent: async (event: StreamEvent) => {
          switch (event.type) {
            case 'tool-call':
              toolCallQueue.enqueue({
                type: 'tool-call',
                toolCall: event,
              })

              break
            case 'tool-result':
              toolCallQueue.enqueue({
                type: 'tool-call-result',
                id: event.toolCallId,
                result: event.result,
              })

              break
            case 'text-delta':
              await parser.consume(event.text)
              break
            case 'finish':
              break
            case 'error':
              throw event.error ?? new Error('Stream error')
          }
        },
      })

      await parser.end()
      await flushPendingExpressionControlText(streamingMessageContext)
      flushUI()

      if (!isStaleGeneration() && buildingMessage.slices.length > 0) {
        sessionMessagesForSend.push(toRaw(buildingMessage))
        chatSession.persistSessionMessages(sessionId)
      }

      try {
        const assistantText = typeof buildingMessage.content === 'string' ? buildingMessage.content : ''

        await hooks.emitStreamEndHooks(streamingMessageContext)
        await hooks.emitAssistantResponseEndHooks(assistantText, streamingMessageContext)

        await hooks.emitAfterSendHooks(sendingMessage, streamingMessageContext)
        await hooks.emitAssistantMessageHooks({ ...buildingMessage }, assistantText, streamingMessageContext)
        await hooks.emitChatTurnCompleteHooks({
          output: { ...buildingMessage },
          outputText: assistantText,
          toolCalls: sessionMessagesForSend.filter(msg => msg.role === 'tool') as ToolMessage[],
        }, streamingMessageContext)
      }
      catch (error) {
        console.error('Error running post-send chat hooks:', error)
      }

      if (isForegroundSession()) {
        streamingMessage.value = { role: 'assistant', content: '', slices: [], tool_results: [] }
      }
    }
    catch (error) {
      console.error('Error sending message:', error)
      throw error
    }
    finally {
      sending.value = false
    }
  }

  async function performAutoGLMSend(
    sendingMessage: string,
    generation: number,
    sessionId: string,
  ) {
    const autoGLM = useAutoGLMStore()
    const isStaleGeneration = () => chatSession.getSessionGeneration(sessionId) !== generation
    const shouldAbort = () => isStaleGeneration()
    if (shouldAbort())
      return

    chatSession.ensureSession(sessionId)
    chatContext.ingestContextMessage(createDatetimeContext())

    const sendingCreatedAt = Date.now()
    const userMessage = { role: 'user' as const, content: sendingMessage, createdAt: sendingCreatedAt, id: nanoid() }
    const streamingMessageContext: ChatStreamEventContext = {
      message: userMessage,
      contexts: chatContext.getContextsSnapshot(),
      composedMessage: [],
      input: {
        type: 'input:text',
        data: {
          text: sendingMessage,
        },
      },
    }

    sending.value = true

    const isForegroundSession = () => sessionId === activeSessionId.value
    const buildingMessage: StreamingAssistantMessage = {
      role: 'assistant',
      content: '',
      slices: [],
      tool_results: [],
      createdAt: Date.now(),
      id: nanoid(),
    }
    let pendingExpressionControlText = ''

    let updateUIFrame: number | undefined
    const flushUI = () => {
      if (updateUIFrame != null) {
        cancelAnimationFrame(updateUIFrame)
        updateUIFrame = undefined
      }
      if (isForegroundSession())
        streamingMessage.value = JSON.parse(JSON.stringify(buildingMessage))
    }
    const updateUI = () => {
      if (updateUIFrame != null)
        return

      updateUIFrame = requestAnimationFrame(() => {
        updateUIFrame = undefined
        flushUI()
      })
    }

    function appendAssistantLiteral(literal: string) {
      if (!literal)
        return

      buildingMessage.content += literal
      const lastSlice = buildingMessage.slices.at(-1)
      if (lastSlice?.type === 'text') {
        lastSlice.text += literal
      }
      else {
        buildingMessage.slices.push({
          type: 'text',
          text: literal,
        })
      }
      updateUI()
    }

    async function handleAssistantLiteral(literal: string, context: ChatStreamEventContext) {
      pendingExpressionControlText += literal

      let textForExtraction = pendingExpressionControlText
      pendingExpressionControlText = ''

      const incompleteControlStart = textForExtraction.lastIndexOf('[[')
      if (incompleteControlStart >= 0 && !textForExtraction.includes(']]', incompleteControlStart + 2)) {
        pendingExpressionControlText = textForExtraction.slice(incompleteControlStart)
        textForExtraction = textForExtraction.slice(0, incompleteControlStart)
      }
      else if (textForExtraction.endsWith('[')) {
        pendingExpressionControlText = '['
        textForExtraction = textForExtraction.slice(0, -1)
      }

      if (pendingExpressionControlText.length > 200) {
        textForExtraction += pendingExpressionControlText
        pendingExpressionControlText = ''
      }

      const expressionControlResult = extractLive2DExpressionControls(textForExtraction)
      for (const control of expressionControlResult.controls)
        await hooks.emitTokenSpecialHooks(makeLive2DExpressionControlSpecial(control), context)

      appendAssistantLiteral(expressionControlResult.visibleText)
      if (expressionControlResult.visibleText)
        await hooks.emitTokenLiteralHooks(expressionControlResult.visibleText, context)
    }

    async function flushPendingExpressionControlText(context: ChatStreamEventContext) {
      if (!pendingExpressionControlText)
        return

      const tail = pendingExpressionControlText
      pendingExpressionControlText = ''
      await handleAssistantLiteral(tail, context)
    }

    flushUI()
    trackFirstMessage()

    try {
      await hooks.emitBeforeMessageComposedHooks(sendingMessage, streamingMessageContext)

      if (shouldAbort())
        return

      const sessionMessagesForSend = chatSession.getSessionMessages(sessionId)
      sessionMessagesForSend.push(userMessage)
      chatSession.persistSessionMessages(sessionId)

      await hooks.emitAfterMessageComposedHooks(sendingMessage, streamingMessageContext)
      await hooks.emitBeforeSendHooks(sendingMessage, streamingMessageContext)

      const fullText = await autoGLM.runTask(sendingMessage, {
        onAssistantText: async (literal) => {
          if (shouldAbort())
            return

          await handleAssistantLiteral(literal, streamingMessageContext)
        },
        onUserText: async (text) => {
          if (shouldAbort())
            return

          sessionMessagesForSend.push({
            role: 'user',
            content: text,
            createdAt: Date.now(),
            id: nanoid(),
          })
          chatSession.persistSessionMessages(sessionId)
        },
      })
      await flushPendingExpressionControlText(streamingMessageContext)
      flushUI()

      if (!isStaleGeneration() && buildingMessage.slices.length > 0) {
        sessionMessagesForSend.push(toRaw(buildingMessage))
        chatSession.persistSessionMessages(sessionId)
      }

      try {
        const assistantText = typeof buildingMessage.content === 'string'
          ? buildingMessage.content
          : stripLive2DExpressionControls(typeof fullText === 'string' ? fullText : '')

        await hooks.emitStreamEndHooks(streamingMessageContext)
        await hooks.emitAssistantResponseEndHooks(assistantText, streamingMessageContext)
        await hooks.emitAfterSendHooks(sendingMessage, streamingMessageContext)
        await hooks.emitAssistantMessageHooks({ ...buildingMessage }, assistantText, streamingMessageContext)
        await hooks.emitChatTurnCompleteHooks({
          output: { ...buildingMessage },
          outputText: assistantText,
          toolCalls: [],
        }, streamingMessageContext)
      }
      catch (error) {
        console.error('Error running post-send chat hooks:', error)
      }

      if (isForegroundSession())
        streamingMessage.value = { role: 'assistant', content: '', slices: [], tool_results: [] }
    }
    catch (error) {
      console.error('Error sending AutoGLM message:', error)
      throw error
    }
    finally {
      sending.value = false
    }
  }

  async function ingest(
    sendingMessage: string,
    options: SendOptions,
    targetSessionId?: string,
  ) {
    const sessionId = targetSessionId || activeSessionId.value
    const generation = chatSession.getSessionGeneration(sessionId)

    return new Promise<void>((resolve, reject) => {
      sendQueue.enqueue({
        sendingMessage,
        options,
        generation,
        sessionId,
        deferred: { resolve, reject },
      })
    })
  }

  async function ingestOnFork(
    sendingMessage: string,
    options: SendOptions,
    forkOptions?: ForkOptions,
  ) {
    const baseSessionId = forkOptions?.fromSessionId ?? activeSessionId.value
    if (!forkOptions)
      return ingest(sendingMessage, options, baseSessionId)

    const forkSessionId = await chatSession.forkSession({
      fromSessionId: baseSessionId,
      atIndex: forkOptions.atIndex,
      reason: forkOptions.reason,
      hidden: forkOptions.hidden,
    })
    return ingest(sendingMessage, options, forkSessionId || baseSessionId)
  }

  function cancelPendingSends(sessionId?: string) {
    for (const queued of pendingQueuedSends.value) {
      if (sessionId && queued.sessionId !== sessionId)
        continue

      queued.cancelled = true
      queued.deferred.reject(new Error('Chat session was reset before send could start'))
    }

    pendingQueuedSends.value = sessionId
      ? pendingQueuedSends.value.filter(item => item.sessionId !== sessionId)
      : []
  }

  return {
    sending,

    discoverToolsCompatibility: llmStore.discoverToolsCompatibility,

    ingest,
    ingestOnFork,
    cancelPendingSends,

    clearHooks: hooks.clearHooks,

    emitBeforeMessageComposedHooks: hooks.emitBeforeMessageComposedHooks,
    emitAfterMessageComposedHooks: hooks.emitAfterMessageComposedHooks,
    emitBeforeSendHooks: hooks.emitBeforeSendHooks,
    emitAfterSendHooks: hooks.emitAfterSendHooks,
    emitTokenLiteralHooks: hooks.emitTokenLiteralHooks,
    emitTokenSpecialHooks: hooks.emitTokenSpecialHooks,
    emitStreamEndHooks: hooks.emitStreamEndHooks,
    emitAssistantResponseEndHooks: hooks.emitAssistantResponseEndHooks,
    emitAssistantMessageHooks: hooks.emitAssistantMessageHooks,
    emitChatTurnCompleteHooks: hooks.emitChatTurnCompleteHooks,

    onBeforeMessageComposed: hooks.onBeforeMessageComposed,
    onAfterMessageComposed: hooks.onAfterMessageComposed,
    onBeforeSend: hooks.onBeforeSend,
    onAfterSend: hooks.onAfterSend,
    onTokenLiteral: hooks.onTokenLiteral,
    onTokenSpecial: hooks.onTokenSpecial,
    onStreamEnd: hooks.onStreamEnd,
    onAssistantResponseEnd: hooks.onAssistantResponseEnd,
    onAssistantMessage: hooks.onAssistantMessage,
    onChatTurnComplete: hooks.onChatTurnComplete,
  }
})
