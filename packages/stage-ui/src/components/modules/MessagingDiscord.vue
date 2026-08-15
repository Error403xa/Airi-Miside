<script setup lang="ts">
import { Button, FieldCheckbox, FieldInput } from '@proj-airi/ui'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { useDiscordStore } from '../../stores/modules/discord'

const { t } = useI18n()
const discordStore = useDiscordStore()
const {
  enabled,
  token,
  statusKind,
  lastError,
  botUsername,
  lastSyncAt,
  lastStatusAt,
  isConnecting,
} = storeToRefs(discordStore)

const statusLabelKey = computed(() => `settings.pages.modules.messaging-discord.status.${statusKind.value}`)
const statusDetail = computed(() => t(`settings.pages.modules.messaging-discord.status-detail.${statusKind.value}`))
const statusToneClasses = computed(() => {
  if (statusKind.value === 'ready') {
    return {
      panel: ['border-green-200/70', 'bg-green-50/80', 'text-green-950', 'dark:border-green-900/50', 'dark:bg-green-950/30', 'dark:text-green-50'],
      dot: ['bg-green-500'],
      icon: 'i-lucide-check-circle-2',
    }
  }

  if (statusKind.value === 'error') {
    return {
      panel: ['border-red-200/70', 'bg-red-50/80', 'text-red-950', 'dark:border-red-900/50', 'dark:bg-red-950/30', 'dark:text-red-50'],
      dot: ['bg-red-500'],
      icon: 'i-lucide-circle-alert',
    }
  }

  if (isConnecting.value) {
    return {
      panel: ['border-sky-200/70', 'bg-sky-50/80', 'text-sky-950', 'dark:border-sky-900/50', 'dark:bg-sky-950/30', 'dark:text-sky-50'],
      dot: ['bg-sky-500', 'animate-pulse'],
      icon: 'i-svg-spinners:ring-resize',
    }
  }

  return {
    panel: ['border-neutral-200/70', 'bg-neutral-50/80', 'text-neutral-950', 'dark:border-neutral-800/70', 'dark:bg-neutral-900/60', 'dark:text-neutral-50'],
    dot: ['bg-neutral-400'],
    icon: 'i-lucide-circle-dashed',
  }
})

const lastSyncText = computed(() => lastSyncAt.value ? new Date(lastSyncAt.value).toLocaleTimeString() : t('settings.pages.modules.messaging-discord.never'))
const lastStatusText = computed(() => lastStatusAt.value ? new Date(lastStatusAt.value).toLocaleTimeString() : t('settings.pages.modules.messaging-discord.never'))
const errorDetail = computed(() => {
  if (lastError.value.includes('@proj-airi/server-runtime'))
    return t('settings.pages.modules.messaging-discord.errors.server-runtime')
  if (lastError.value.includes('@proj-airi/discord-bot'))
    return t('settings.pages.modules.messaging-discord.errors.discord-service')

  return lastError.value
})
</script>

<template>
  <div flex="~ col gap-6">
    <FieldCheckbox
      v-model="enabled"
      :label="t('settings.pages.modules.messaging-discord.enable')"
      :description="t('settings.pages.modules.messaging-discord.enable-description')"
    />

    <FieldInput
      v-model="token"
      type="password"
      :label="t('settings.pages.modules.messaging-discord.token')"
      :description="t('settings.pages.modules.messaging-discord.token-description')"
      :placeholder="t('settings.pages.modules.messaging-discord.token-placeholder')"
    />

    <div>
      <Button
        :label="t('settings.common.save')"
        variant="primary"
        @click="discordStore.saveSettings()"
      />
    </div>

    <div
      :class="[
        'rounded-lg border border-solid p-4',
        'transition-colors duration-200',
        statusToneClasses.panel,
      ]"
    >
      <div :class="['flex items-start gap-3']">
        <div :class="['relative mt-1 h-3 w-3 shrink-0']">
          <div :class="['h-3 w-3 rounded-full', statusToneClasses.dot]" />
        </div>

        <div :class="['min-w-0 flex-1']">
          <div :class="['flex flex-wrap items-center gap-2']">
            <div :class="[statusToneClasses.icon, 'h-4 w-4 shrink-0']" />
            <div :class="['text-sm font-medium']">
              {{ t(statusLabelKey) }}
            </div>
            <div
              v-if="botUsername"
              :class="[
                'rounded-md px-2 py-0.5',
                'bg-white/70 text-xs text-neutral-700',
                'dark:bg-black/20 dark:text-neutral-200',
              ]"
            >
              {{ botUsername }}
            </div>
          </div>

          <p :class="['mt-1 text-xs opacity-80']">
            {{ statusDetail }}
          </p>

          <p
            v-if="lastError"
            :class="[
              'mt-3 break-words rounded-md px-3 py-2',
              'bg-white/70 text-xs text-red-900',
              'dark:bg-black/20 dark:text-red-100',
            ]"
          >
            {{ errorDetail }}
          </p>

          <div :class="['mt-3 flex flex-wrap items-center gap-3 text-xs opacity-70']">
            <span>{{ t('settings.pages.modules.messaging-discord.last-sync', { time: lastSyncText }) }}</span>
            <span>{{ t('settings.pages.modules.messaging-discord.last-status', { time: lastStatusText }) }}</span>
          </div>
        </div>

        <Button
          :label="t('settings.pages.modules.messaging-discord.retry')"
          icon="i-lucide-refresh-cw"
          variant="secondary"
          size="sm"
          :loading="isConnecting"
          @click="discordStore.retryConnection()"
        />
      </div>
    </div>
  </div>
</template>
