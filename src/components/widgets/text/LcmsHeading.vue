<script setup lang="ts">
/**
 * Heading Widget
 *
 * Renders a heading element (h1-h6) with alignment.
 * Supports both plain text and HTML content.
 * Supports {fieldname} placeholders replaced with collection entry values.
 */

import { computed, inject, unref } from 'vue'
import { useLanguage } from '@/composables/useLanguage'
import type { HeadingWidgetData } from '@/types/widgets'
import type { CollectionEntry } from '@/api/types'
import type { Ref } from 'vue'

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

// Heading element-group color support
function resolveColor(val: string | null | undefined): string | null {
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
}

const headingColor = computed(() => resolveColor(props.data.heading?.color))
const headingHoverColor = computed(() => resolveColor(props.data.heading?.['color:hover']))

const headingStyle = computed(() => {
  const style: Record<string, string> = {}
  if (headingColor.value) style['color'] = headingColor.value
  if (headingHoverColor.value) style['--hover-heading-color'] = headingHoverColor.value
  return style
})

// API returns { heading: { html: { pl: "..." } } } or { html: { pl: "..." } } or { text: { pl: "..." } }
const headingContent = computed(() => {
  const raw = extractValue(props.data.heading?.html) || extractValue(props.data.html) || extractValue(props.data.text) || ''
  return replacePlaceholders(raw)
})

// Check if content is HTML (contains tags)
const isHtml = computed(() => {
  return headingContent.value.includes('<')
})

// Get level from config or data
const headingLevel = computed(() => {
  const level = props.data.config?.level || props.data.widget?.level || props.data.level || 2
  return `h${level}`
})

const textAlign = computed(() => props.data.align || props.settings?.textAlign || 'left')

// Dynamic content source settings (for future dynamic mode)
const contentSource = computed(() => props.data.config?.content_source || props.data.content_source || 'static')
const collectionCode = computed(() => props.data.collection_code || null)
const fieldCode = computed(() => props.data.field_code || null)
const entryId = computed(() => props.data.entry_id || null)
</script>

<template>
  <div
    class="lcms-heading"
    :class="[`lcms-heading--${textAlign}`, { 'has-hover': !!headingHoverColor }]"
    :style="headingStyle"
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
      :data-level="props.data.widget?.level || props.data.level || 2"
    >
      {{ headingContent }}
    </component>
  </div>
</template>
