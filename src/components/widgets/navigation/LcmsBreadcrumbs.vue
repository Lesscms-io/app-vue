<script setup lang="ts">
/**
 * Breadcrumbs Widget
 *
 * Renders breadcrumb navigation based on current page hierarchy.
 * Supports custom separator, colors, home link toggle, and dynamic last element from collection.
 */

import { computed, ref, watch } from 'vue'
import { useLanguage } from '@/composables/useLanguage'
import { useApiOptional } from '@/composables/useApi'

defineOptions({
  inheritAttrs: false
})

interface Props {
  data: Record<string, any>
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const { extractValue } = useLanguage(props.language)
const api = useApiOptional()

const config = computed(() => props.data.widget || props.data || {})

const separator = computed(() => config.value.separator || '/')
const showHome = computed(() => {
  if (config.value.show_home !== undefined) return config.value.show_home
  if (config.value.showHome !== undefined) return config.value.showHome
  return true
})
const homeLabel = computed(() => {
  const label = config.value.home_label || config.value.homeLabel
  if (label && typeof label === 'object') {
    return extractValue(label) as string || 'Home'
  }
  return label || 'Home'
})
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

const color = computed(() => resolveColor(config.value.color))
const activeColor = computed(() => resolveColor(config.value.active_color || config.value.activeColor))

// Dynamic last element
const showDynamicLast = computed(() => config.value.show_dynamic_last || false)
const dynamicLastLabel = ref<string>('')

// Resolve dynamic last element from collection
watch(
  () => [showDynamicLast.value, config.value.dynamic_last_collection_code, config.value.dynamic_last_field_code],
  async ([show, collectionCode, fieldCode]) => {
    if (!show || !collectionCode || !fieldCode || !api) {
      dynamicLastLabel.value = ''
      return
    }

    const entrySource = config.value.dynamic_last_entry_source || 'url'
    let entryId = ''

    if (entrySource === 'static') {
      entryId = config.value.dynamic_last_entry_id || ''
    } else if (entrySource === 'url') {
      if (typeof window === 'undefined') return
      const segment = config.value.dynamic_last_url_segment || 1
      const pathParts = window.location.pathname.split('/').filter(Boolean)
      entryId = pathParts[segment - 1] || ''
    }

    if (!entryId) {
      dynamicLastLabel.value = ''
      return
    }

    try {
      const response = await api.getCollectionEntry(collectionCode, entryId)
      const entry = response?.data
      if (entry) {
        const content = entry.content || entry
        const fieldValue = content[fieldCode]
        if (fieldValue && typeof fieldValue === 'object') {
          dynamicLastLabel.value = extractValue(fieldValue) as string || ''
        } else {
          dynamicLastLabel.value = fieldValue || ''
        }
      }
    } catch {
      dynamicLastLabel.value = ''
    }
  },
  { immediate: true }
)

// Breadcrumb items from page context (injected by API)
const breadcrumbItems = computed(() => {
  const items = (config.value.items || []).map((item: any) => ({
    ...item,
    // Resolve multilingual labels
    label: item.label_translation
      ? (extractValue(item.label_translation) as string || item.label)
      : item.label
  }))

  // If dynamic last is enabled and we have a label, add it
  if (showDynamicLast.value && dynamicLastLabel.value) {
    // Mark the previous last item as a link (if it wasn't already)
    if (items.length > 0) {
      const lastItem = items[items.length - 1]
      if (!lastItem.url && typeof window !== 'undefined') {
        lastItem.url = window.location.pathname.split('?')[0]
          .split('/')
          .slice(0, -(config.value.dynamic_last_url_segment || 1))
          .join('/') || '/'
      }
    }
    items.push({
      label: dynamicLastLabel.value,
      code: ''
    })
  }

  return items
})

const containerStyle = computed(() => {
  const style: Record<string, string> = {}
  const c = color.value
  if (c) style.color = c
  return style
})

const activeStyle = computed(() => {
  const style: Record<string, string> = {}
  const ac = activeColor.value
  if (ac) style.color = ac
  return style
})

const linkStyle = computed(() => {
  const style: Record<string, string> = {}
  const c = color.value
  if (c) style.color = c
  return style
})
</script>

<template>
  <nav
    class="lcms-breadcrumbs"
    :style="containerStyle"
    aria-label="Breadcrumb"
  >
    <ol class="lcms-breadcrumbs__list">
      <li
        v-if="showHome"
        class="lcms-breadcrumbs__item"
      >
        <a
          href="/"
          class="lcms-breadcrumbs__link"
          :style="linkStyle"
        >
          {{ homeLabel }}
        </a>
        <span
          v-if="breadcrumbItems.length > 0"
          class="lcms-breadcrumbs__separator"
        >
          {{ separator }}
        </span>
      </li>
      <li
        v-for="(item, index) in breadcrumbItems"
        :key="index"
        class="lcms-breadcrumbs__item"
      >
        <a
          v-if="index < breadcrumbItems.length - 1 && item.url"
          :href="item.url"
          class="lcms-breadcrumbs__link"
          :style="linkStyle"
        >
          {{ item.label }}
        </a>
        <span
          v-else
          class="lcms-breadcrumbs__current"
          :style="activeStyle"
        >
          {{ item.label }}
        </span>
        <span
          v-if="index < breadcrumbItems.length - 1"
          class="lcms-breadcrumbs__separator"
        >
          {{ separator }}
        </span>
      </li>
    </ol>
  </nav>
</template>
