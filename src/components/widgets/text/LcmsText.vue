<script setup lang="ts">
/**
 * Text Widget (Rich Text)
 *
 * Renders HTML content from TipTap editor.
 * Supports {fieldname} placeholders replaced with collection entry values.
 */

import { computed, inject, unref } from 'vue'
import { useLanguage } from '@/composables/useLanguage'
import type { TextWidgetData } from '@/types/widgets'
import type { CollectionEntry } from '@/api/types'
import type { Ref } from 'vue'

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

const injectedEntry = inject<CollectionEntry | Ref<CollectionEntry | null> | null>('lcms-collection-entry', null)

function resolveFieldValue(content: Record<string, any>, fieldName: string): string {
  const val = content[fieldName]
  if (val == null) return `{${fieldName}}`
  if (typeof val === 'string') return val
  // Select-type enriched values: [{ code, value, value_translation }]
  if (Array.isArray(val)) {
    return val.map((item: any) => {
      if (typeof item === 'string') return item
      if (item?.value_translation) return extractValue(item.value_translation) || item.value || item.code || ''
      return item?.value || item?.code || String(item)
    }).join(', ')
  }
  // Multilingual object: { pl: "...", en: "..." }
  if (typeof val === 'object') {
    return extractValue(val) || `{${fieldName}}`
  }
  return String(val)
}

function replacePlaceholders(text: string): string {
  if (!text || !text.includes('{')) return text
  const entry = unref(injectedEntry)
  if (!entry?.content) return text
  return text.replace(/\{([\w-]+)\}/g, (match, fieldName) => {
    return resolveFieldValue(entry.content, fieldName)
  })
}

// Text element-group color support
const textColor = computed(() => {
  const val = props.data.text?.color
  if (!val) return null
  if (val.startsWith('var:')) {
    const parts = val.split(':')
    const code = parts[1]
    const opacity = parts.length >= 3 ? parseInt(parts[2]) : 100
    if (opacity < 100) {
      return `color-mix(in srgb, var(--lcms-color-${code}) ${opacity}%, transparent)`
    }
    return `var(--lcms-color-${code})`
  }
  return val
})

const textHoverColor = computed(() => {
  const val = props.data.text?.['color:hover']
  if (!val) return null
  if (val.startsWith('var:')) {
    const parts = val.split(':')
    const code = parts[1]
    const opacity = parts.length >= 3 ? parseInt(parts[2]) : 100
    if (opacity < 100) {
      return `color-mix(in srgb, var(--lcms-color-${code}) ${opacity}%, transparent)`
    }
    return `var(--lcms-color-${code})`
  }
  return val
})

const rootStyle = computed(() => {
  const style: Record<string, string> = {}
  if (textColor.value) style['color'] = textColor.value
  if (textHoverColor.value) style['--hover-text-color'] = textHoverColor.value
  return style
})

const htmlContent = computed(() => {
  // API returns { text: { html: { pl: "..." } } } or { html: { pl: "..." } } or { content: { pl: "..." } }
  const raw = extractValue(props.data.text?.html) || extractValue(props.data.html) || extractValue(props.data.content) || ''
  return replacePlaceholders(raw)
})
</script>

<template>
  <div
    class="lcms-text"
    :class="{ 'has-hover': !!textHoverColor }"
    :style="rootStyle"
    v-html="htmlContent"
  />
</template>
