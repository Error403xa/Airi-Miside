<script setup lang="ts">
import DOMPurify from 'dompurify'

import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { useMarkdown } from '../../composables/markdown'

interface Props {
  content: string
  class?: string
}

const props = defineProps<Props>()

const processedContent = ref('')
const { process, processSync } = useMarkdown()
const hasCodeFence = computed(() => /`{3,}/.test(props.content))

let processVersion = 0
let processTimer: ReturnType<typeof setTimeout> | undefined

async function processContent() {
  const version = ++processVersion
  const content = props.content

  if (!props.content) {
    processedContent.value = ''
    return
  }

  try {
    const html = hasCodeFence.value
      ? await process(content)
      : processSync(content)

    if (version === processVersion)
      processedContent.value = DOMPurify.sanitize(html)
  }
  catch (error) {
    console.warn('Failed to process markdown with syntax highlighting, using fallback:', error)
    if (version === processVersion)
      processedContent.value = DOMPurify.sanitize(processSync(content))
  }
}

function scheduleProcessContent() {
  if (processTimer)
    clearTimeout(processTimer)

  processTimer = setTimeout(processContent, hasCodeFence.value ? 80 : 24)
}

// Process content when it changes
watch(() => props.content, scheduleProcessContent, { immediate: true })

onMounted(() => {
  scheduleProcessContent()
})

onBeforeUnmount(() => {
  if (processTimer)
    clearTimeout(processTimer)
})
</script>

<template>
  <div
    :class="props.class"
    class="markdown-content max-w-full min-w-0 overflow-hidden"
    v-html="processedContent"
  />
</template>

<style scoped>
.markdown-content :deep(pre) {
  overflow-x: auto;
  max-width: 100%;
  border-radius: 6px;
  padding: 1rem;
  margin: 0.5rem 0;
}

.markdown-content :deep(p),
.markdown-content :deep(li),
.markdown-content :deep(blockquote),
.markdown-content :deep(td),
.markdown-content :deep(th) {
  overflow-wrap: anywhere;
}

.markdown-content :deep(table) {
  display: block;
  max-width: 100%;
  overflow-x: auto;
}

.markdown-content :deep(code) {
  font-family: 'Fira Code', 'Monaco', 'Consolas', monospace;
  font-size: 0.875em;
}

.markdown-content :deep(pre code) {
  display: block;
  width: fit-content;
  min-width: 100%;
}

/* Ensure horizontal scrolling for wide code blocks */
.markdown-content :deep(pre.shiki) {
  overflow-x: auto;
  white-space: pre;
}

.markdown-content :deep(.shiki) {
  border-radius: 6px;
  padding: 1rem;
  margin: 0.5rem 0;
}

/* Fallback styles for non-shiki code blocks */
.markdown-content :deep(pre:not(.shiki)) {
  background: #f6f8fa;
  border: 1px solid #d0d7de;
}

.dark .markdown-content :deep(pre:not(.shiki)) {
  background: #161b22;
  border: 1px solid #30363d;
}

/* Force Shiki multi-theme output to follow our dark mode */
.dark .markdown-content :deep(.shiki) {
  background: var(--shiki-dark-bg, #0d1117) !important;
  color: var(--shiki-dark, #e6edf3) !important;
}

.dark .markdown-content :deep(.shiki span[style*="--shiki-dark"]) {
  color: var(--shiki-dark, inherit) !important;
}

.dark .markdown-content :deep(.shiki span[style*="--shiki-dark-background"]) {
  background-color: var(--shiki-dark-background, var(--shiki-dark-bg, transparent)) !important;
}
</style>
