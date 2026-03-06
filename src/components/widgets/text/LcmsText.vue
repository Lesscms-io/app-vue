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

const htmlContent = computed(() => {
  // API returns { html: { pl: "..." } } or { content: { pl: "..." } }
  const raw = extractValue(props.data.html) || extractValue(props.data.content) || ''
  return replacePlaceholders(raw)
})
</script>

<template>
  <div
    class="lcms-text"
    v-html="htmlContent"
  />
</template>
