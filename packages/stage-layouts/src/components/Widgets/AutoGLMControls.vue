<script setup lang="ts">
import { useAutoGLMStore } from '@proj-airi/stage-ui/stores/autoglm'
import { storeToRefs } from 'pinia'
import {
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  VisuallyHidden,
} from 'reka-ui'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const props = withDefaults(defineProps<{
  variant?: 'desktop' | 'floating'
}>(), {
  variant: 'desktop',
})

const autoGLM = useAutoGLMStore()
const { t } = useI18n()
const {
  config,
  enabled,
  connected,
  keyboardReady,
  wsReady,
  running,
  stepCount,
  statusMessage,
  lastError,
  pendingDecision,
  modelConfigured,
  ready,
  connectionLabel,
} = storeToRefs(autoGLM)

const configOpen = ref(false)
const busy = ref(false)
const actionError = ref('')
const decisionValue = ref('')

const showSwitch = computed(() => ready.value || enabled.value)
const currentStatus = computed(() => actionError.value || lastError.value || statusMessage.value)

const buttonClasses = computed(() => {
  if (props.variant === 'floating') {
    return [
      'border-2 border-solid border-neutral-100/60 dark:border-neutral-800/30',
      'bg-neutral-50/70 dark:bg-neutral-800/70',
      'w-fit flex items-center self-end justify-center rounded-xl p-2 backdrop-blur-md',
      'outline-none transition-all duration-200 active:scale-95',
      'text-neutral-500 dark:text-neutral-400 hover:text-primary-500 dark:hover:text-primary-300',
    ]
  }

  return [
    'max-h-[10lh] min-h-[1lh]',
    'bg-neutral-100 dark:bg-neutral-800',
    'text-lg text-neutral-500 dark:text-neutral-400 hover:text-primary-500 dark:hover:text-primary-300',
    'flex items-center justify-center rounded-md p-2 outline-none',
    'transition-colors transition-transform active:scale-95',
  ]
})

const switchClasses = computed(() => [
  props.variant === 'floating'
    ? 'h-8 w-14 border-2 border-solid border-neutral-100/60 dark:border-neutral-800/30'
    : 'h-8 w-14',
  enabled.value
    ? 'bg-primary-400/80 dark:bg-primary-500/70'
    : 'bg-neutral-100 dark:bg-neutral-800',
  'relative flex items-center rounded-full p-1 outline-none backdrop-blur-md',
  'transition-colors transition-transform active:scale-95',
])

const switchThumbClasses = computed(() => [
  enabled.value ? 'translate-x-6 bg-white text-primary-500' : 'translate-x-0 bg-white dark:bg-neutral-700 text-neutral-500',
  'h-6 w-6 flex items-center justify-center rounded-full shadow-sm',
  'transition-transform duration-200 ease-in-out',
])

function fieldClasses() {
  return [
    'w-full rounded-lg px-3 py-2 text-sm outline-none',
    'border-2 border-solid border-neutral-200/60 dark:border-neutral-700/60',
    'bg-neutral-50/80 dark:bg-neutral-950/70',
    'text-neutral-700 dark:text-neutral-100 placeholder:text-neutral-400',
    'focus:border-primary-300 dark:focus:border-primary-500/60',
  ]
}

function modeButtonClasses(active: boolean) {
  return [
    'rounded-lg px-3 py-2 text-sm outline-none transition-all duration-200',
    active
      ? 'bg-primary-500/20 text-primary-700 dark:bg-primary-400/20 dark:text-primary-100'
      : 'bg-neutral-100/70 text-neutral-600 hover:bg-neutral-200/70 dark:bg-neutral-800/70 dark:text-neutral-300 dark:hover:bg-neutral-700/70',
  ]
}

async function runAction(action: () => Promise<void>) {
  busy.value = true
  actionError.value = ''
  try {
    await action()
  }
  catch (error) {
    actionError.value = error instanceof Error ? error.message : String(error)
  }
  finally {
    busy.value = false
  }
}

async function handleToggle() {
  await runAction(async () => {
    await autoGLM.toggleEnabled()
  })
}

function handleDialogOpen(value: boolean) {
  configOpen.value = value
}

function closeDecision() {
  autoGLM.resolveDecision({ confirmed: false, value: '' })
}

function confirmDecision() {
  autoGLM.resolveDecision({ confirmed: true, value: decisionValue.value.trim() })
}

watch(pendingDecision, () => {
  decisionValue.value = ''
})
</script>

<template>
  <div flex="~ items-center gap-2">
    <button
      v-if="showSwitch"
      :class="switchClasses"
      role="switch"
      :aria-checked="enabled"
      :title="enabled ? t('stage.autoglm.disable') : t('stage.autoglm.enable')"
      :disabled="busy || running"
      @click="handleToggle"
    >
      <span :class="switchThumbClasses">
        <div :class="enabled ? 'i-solar:check-circle-bold' : 'i-solar:close-circle-bold'" class="h-4 w-4" />
      </span>
    </button>

    <button
      :class="buttonClasses"
      title="AutoGLM"
      aria-label="AutoGLM"
      @click="configOpen = true"
    >
      <div class="i-solar:smartphone-bold-duotone h-5 w-5" />
    </button>

    <DialogRoot :open="configOpen" @update:open="handleDialogOpen">
      <DialogPortal>
        <DialogOverlay
          :class="[
            'fixed inset-0 z-[9999]',
            'bg-black/45 backdrop-blur-sm',
            'data-[state=closed]:animate-fadeOut data-[state=open]:animate-fadeIn',
          ]"
        />
        <DialogContent
          :class="[
            'fixed left-1/2 top-1/2 z-[9999]',
            'max-h-[88vh] max-w-4xl w-[92dvw]',
            'flex flex-col overflow-hidden rounded-2xl',
            'bg-white/95 p-5 shadow-xl outline-none backdrop-blur-md dark:bg-neutral-900/95',
            '-translate-x-1/2 -translate-y-1/2',
            'data-[state=closed]:animate-contentHide data-[state=open]:animate-contentShow',
          ]"
        >
          <VisuallyHidden>
            <DialogTitle>AutoGLM</DialogTitle>
          </VisuallyHidden>

          <div flex="~ items-start justify-between gap-4" border="b solid neutral-200/70 dark:neutral-800" pb-4>
            <div flex="~ col gap-1">
              <div flex="~ items-center gap-2">
                <div class="i-solar:smartphone-bold-duotone h-5 w-5 text-primary-500" />
                <h2 text="lg neutral-900 dark:neutral-50" font-semibold>
                  AutoGLM
                </h2>
              </div>
              <!-- description intentionally removed per request -->
            </div>
            <button
              :class="[
                'h-8 w-8 flex items-center justify-center rounded-lg',
                'bg-neutral-100 text-neutral-500 outline-none transition-colors',
                'hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700',
              ]"
              @click="configOpen = false"
            >
              <div class="i-solar:close-circle-outline h-5 w-5" />
            </button>
          </div>

          <div class="overflow-y-auto py-4 pr-1" flex="~ col gap-4">
            <section
              :class="[
                'grid grid-cols-1 gap-3 rounded-xl border border-neutral-200/70 p-4',
                'bg-neutral-50/70 dark:border-neutral-800 dark:bg-neutral-950/40',
              ]"
            >
              <div flex="~ items-center justify-between gap-3">
                <div>
                  <h3 text="sm neutral-900 dark:neutral-100" font-semibold>
                    {{ t('stage.autoglm.sections.service.title') }}
                  </h3>
                  <p text="xs neutral-500 dark:neutral-400">
                    {{ t('stage.autoglm.sections.service.description') }}
                  </p>
                </div>
                <div flex="~ items-center gap-2" text="xs neutral-500 dark:neutral-400">
                  <span
                    :class="wsReady ? 'bg-emerald-400' : 'bg-amber-400'"
                    class="h-2 w-2 rounded-full"
                  />
                  {{ wsReady ? t('stage.autoglm.status.websocket-connected') : t('stage.autoglm.status.websocket-disconnected') }}
                </div>
              </div>

              <!-- service URL display removed (do not show connected python service URL) -->
              <button
                :class="modeButtonClasses(false)"
                :disabled="busy || !modelConfigured"
                @click="runAction(autoGLM.applyConfiguration)"
              >
                {{ t('stage.autoglm.actions.apply-config') }}
              </button>
            </section>

            <section
              :class="[
                'grid grid-cols-1 gap-3 rounded-xl border border-neutral-200/70 p-4',
                'bg-neutral-50/70 dark:border-neutral-800 dark:bg-neutral-950/40',
              ]"
            >
              <div>
                <h3 text="sm neutral-900 dark:neutral-100" font-semibold>
                  {{ t('stage.autoglm.sections.model.title') }}
                </h3>
                <p text="xs neutral-500 dark:neutral-400">
                  {{ t('stage.autoglm.sections.model.description') }}
                </p>
              </div>
              <div grid="~ cols-3 gap-2">
                <button :class="modeButtonClasses(config.mode === 'cloud')" @click="autoGLM.setMode('cloud')">
                  {{ t('stage.autoglm.modes.cloud') }}
                </button>
                <button :class="modeButtonClasses(config.mode === 'local')" @click="autoGLM.setMode('local')">
                  {{ t('stage.autoglm.modes.local') }}
                </button>
                <button :class="modeButtonClasses(config.mode === 'custom')" @click="autoGLM.setMode('custom')">
                  {{ t('stage.autoglm.modes.custom') }}
                </button>
              </div>
              <label v-if="config.mode === 'cloud'" flex="~ col gap-1">
                <span text="xs neutral-500 dark:neutral-400">API Key</span>
                <input v-model="config.apiKey" type="password" :class="fieldClasses()" placeholder="sk-...">
              </label>
              <div grid="~ cols-1 md:cols-2 gap-3">
                <label flex="~ col gap-1">
                  <span text="xs neutral-500 dark:neutral-400">Base URL</span>
                  <input v-model="config.baseUrl" :class="fieldClasses()">
                </label>
                <label flex="~ col gap-1">
                  <span text="xs neutral-500 dark:neutral-400">Model</span>
                  <input v-model="config.model" :class="fieldClasses()">
                </label>
              </div>
              <label flex="~ col gap-1">
                <span text="xs neutral-500 dark:neutral-400">{{ t('stage.autoglm.fields.max-steps') }}</span>
                <input v-model.number="config.maxSteps" type="number" min="10" max="200" :class="fieldClasses()">
              </label>
            </section>

            <section
              :class="[
                'grid grid-cols-1 gap-3 rounded-xl border border-neutral-200/70 p-4',
                'bg-neutral-50/70 dark:border-neutral-800 dark:bg-neutral-950/40',
              ]"
            >
              <div flex="~ items-start justify-between gap-3">
                <div>
                  <h3 text="sm neutral-900 dark:neutral-100" font-semibold>
                    {{ t('stage.autoglm.sections.phone.title') }}
                  </h3>
                  <p text="xs neutral-500 dark:neutral-400">
                    {{ t('stage.autoglm.sections.phone.description') }}
                  </p>
                </div>
                <div flex="~ col items-end gap-1" text="xs neutral-500 dark:neutral-400">
                  <span>{{ connectionLabel }}</span>
                  <span>{{ keyboardReady ? t('stage.autoglm.status.keyboard-ready') : t('stage.autoglm.status.keyboard-unchecked') }}</span>
                </div>
              </div>

              <div grid="~ cols-2 gap-2">
                <button :class="modeButtonClasses(config.linkMode === 'bridge')" @click="autoGLM.setLinkMode('bridge')">
                  {{ t('stage.autoglm.link-modes.bridge') }}
                </button>
                <button :class="modeButtonClasses(config.linkMode === 'webusb')" @click="autoGLM.setLinkMode('webusb')">
                  WebUSB
                </button>
              </div>

              <div flex="~ items-center gap-2">
                <button
                  :class="modeButtonClasses(false)"
                  :disabled="busy"
                  @click="runAction(autoGLM.connectDevice)"
                >
                  {{ t('stage.autoglm.actions.connect-phone') }}
                </button>
                <button
                  :class="modeButtonClasses(false)"
                  :disabled="busy || !connected"
                  @click="runAction(autoGLM.refreshKeyboardStatus)"
                >
                  {{ t('stage.autoglm.actions.check-keyboard') }}
                </button>
              </div>
            </section>

            <section
              :class="[
                'grid grid-cols-1 gap-3 rounded-xl border border-neutral-200/70 p-4',
                'bg-neutral-50/70 dark:border-neutral-800 dark:bg-neutral-950/40',
              ]"
            >
              <div>
                <h3 text="sm neutral-900 dark:neutral-100" font-semibold>
                  {{ t('stage.autoglm.sections.wireless.title') }}
                </h3>
                <p text="xs neutral-500 dark:neutral-400">
                  {{ t('stage.autoglm.sections.wireless.description') }}
                </p>
              </div>
              <div grid="~ cols-1 md:cols-4 gap-3">
                <label flex="~ col gap-1">
                  <span text="xs neutral-500 dark:neutral-400">{{ t('stage.autoglm.fields.ip-address') }}</span>
                  <input v-model="config.wifiIp" :class="fieldClasses()">
                </label>
                <label flex="~ col gap-1">
                  <span text="xs neutral-500 dark:neutral-400">{{ t('stage.autoglm.fields.pair-port') }}</span>
                  <input v-model="config.pairPort" type="number" :class="fieldClasses()">
                </label>
                <label flex="~ col gap-1">
                  <span text="xs neutral-500 dark:neutral-400">{{ t('stage.autoglm.fields.pair-code') }}</span>
                  <input v-model="config.pairCode" :class="fieldClasses()">
                </label>
                <label flex="~ col gap-1">
                  <span text="xs neutral-500 dark:neutral-400">{{ t('stage.autoglm.fields.adb-port') }}</span>
                  <input v-model="config.adbPort" type="number" :class="fieldClasses()">
                </label>
              </div>
              <div flex="~ items-center gap-2">
                <button :class="modeButtonClasses(false)" :disabled="busy" @click="runAction(autoGLM.pairWireless)">
                  {{ t('stage.autoglm.actions.pair') }}
                </button>
                <button :class="modeButtonClasses(false)" :disabled="busy" @click="runAction(autoGLM.connectWireless)">
                  {{ t('stage.autoglm.actions.connect') }}
                </button>
                <button :class="modeButtonClasses(false)" :disabled="busy" @click="runAction(autoGLM.disconnectWireless)">
                  {{ t('stage.autoglm.actions.disconnect') }}
                </button>
              </div>
            </section>

            <div
              v-if="currentStatus || running"
              :class="[
                'rounded-xl border border-neutral-200/70 px-4 py-3 text-sm',
                'bg-white/70 text-neutral-600 dark:border-neutral-800 dark:bg-neutral-950/40 dark:text-neutral-300',
              ]"
            >
              <span v-if="running">{{ t('stage.autoglm.status.running', { step: stepCount }) }}</span>
              <span v-else>{{ currentStatus }}</span>
            </div>
          </div>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>

    <DialogRoot :open="!!pendingDecision" @update:open="value => { if (!value) closeDecision() }">
      <DialogPortal>
        <DialogOverlay class="fixed inset-0 z-[10000] bg-black/45 backdrop-blur-sm" />
        <DialogContent
          :class="[
            'fixed left-1/2 top-1/2 z-[10000]',
            'max-w-md w-[92dvw] rounded-2xl bg-white/95 p-5 shadow-xl outline-none',
            'dark:bg-neutral-900/95 -translate-x-1/2 -translate-y-1/2',
          ]"
        >
          <VisuallyHidden>
            <DialogTitle>{{ pendingDecision?.title }}</DialogTitle>
          </VisuallyHidden>
          <div flex="~ col gap-4">
            <div>
              <h3 text="base neutral-900 dark:neutral-50" font-semibold>
                {{ pendingDecision?.title }}
              </h3>
              <p mt-1 text="sm neutral-500 dark:neutral-400">
                {{ pendingDecision?.message }}
              </p>
            </div>
            <input
              v-if="pendingDecision?.input"
              v-model="decisionValue"
              :class="fieldClasses()"
              @keydown.enter.prevent="confirmDecision"
            >
            <div flex="~ justify-end gap-2">
              <button :class="modeButtonClasses(false)" @click="closeDecision">
                {{ pendingDecision?.cancelText || 'Cancel' }}
              </button>
              <button :class="modeButtonClasses(true)" @click="confirmDecision">
                {{ pendingDecision?.confirmText || 'OK' }}
              </button>
            </div>
          </div>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  </div>
</template>
