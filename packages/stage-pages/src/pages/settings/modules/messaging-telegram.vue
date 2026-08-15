<script setup lang="ts">
import { MessagingTelegram } from '@proj-airi/stage-ui/components'
</script>

<template>
  <MessagingTelegram />
</template>

<route lang="yaml">
meta:
  layout: settings
  titleKey: settings.pages.modules.messaging-telegram.title
  subtitleKey: settings.title
  stageTransition:
    name: slide
    pageSpecificAvailable: true
</route>
