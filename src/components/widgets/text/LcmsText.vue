<script setup lang="ts">
/**
 * Text Widget (Rich Text)
 *
 * Renders HTML content from TipTap editor.
 */

import { computed } from 'vue'
import { useLanguage } from '@/composables/useLanguage'
import type { TextWidgetData } from '@/types/widgets'

defineOptions({
  inheritAttrs: false
})

interface Props {
  data: TextWidgetData
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const { extractValue } = useLanguage(props.language)

const htmlContent = computed(() => {
  // API returns { html: { pl: "..." } } or { content: { pl: "..." } }
  return extractValue(props.data.html) || extractValue(props.data.content) || ''
})
</script>

<template>
  <div
    class="lcms-text"
    v-html="htmlContent"
  />
</template>
