<script setup lang="ts">
/**
 * Heading Widget
 *
 * Renders a heading element (h1-h6) with alignment.
 * Supports both plain text and HTML content.
 */

import { computed } from 'vue'
import { useLanguage } from '@/composables/useLanguage'
import type { HeadingWidgetData } from '@/types/widgets'

defineOptions({
  inheritAttrs: false
})

interface Props {
  data: HeadingWidgetData
  settings?: any
  language?: string
}

const props = defineProps<Props>()

const { extractValue } = useLanguage(props.language)

// API returns { html: { pl: "..." } } or { text: { pl: "..." } }
const headingContent = computed(() => {
  return extractValue(props.data.html) || extractValue(props.data.text) || ''
})

// Check if content is HTML (contains tags)
const isHtml = computed(() => {
  return headingContent.value.includes('<')
})

// Get level from config or data
const headingLevel = computed(() => {
  const level = props.data.config?.level || props.data.level || 2
  return `h${level}`
})

const textAlign = computed(() => props.data.align || props.settings?.textAlign || 'left')
</script>

<template>
  <div
    class="lcms-heading"
    :class="`lcms-heading--${textAlign}`"
  >
    <!-- If content is HTML, render it directly -->
    <div
      v-if="isHtml"
      class="lcms-heading__html"
      v-html="headingContent"
    />
    <!-- Otherwise render as plain text in heading tag -->
    <component
      v-else
      :is="headingLevel"
      class="lcms-heading__text"
    >
      {{ headingContent }}
    </component>
  </div>
</template>
