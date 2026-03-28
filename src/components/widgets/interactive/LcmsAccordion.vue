<script setup lang="ts">
/**
 * Accordion Widget
 *
 * Renders expandable/collapsible items with title and content.
 * Uses element-group pattern with header, content, icon, border, separator, config groups.
 */

import { ref, computed, watch } from 'vue'
import { useLanguage } from '@/composables/useLanguage'

function resolveColor(val: string | null | undefined): string | null {
  if (!val) return null
  if (val === 'transparent') return 'transparent'
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

defineOptions({
  inheritAttrs: false
})

const props = defineProps<{
  data: {
    widget_type: string
    widget?: Record<string, any>
    [key: string]: any
  }
  language?: string
  settings?: Record<string, any>
}>()

const { extractValue } = useLanguage(props.language)

const config = computed(() => props.data.widget || props.data || {})

// Element groups
const headerGroup = computed(() => config.value.header || {})
const contentGroup = computed(() => config.value.content || {})
const iconGroup = computed(() => config.value.icon || {})
const borderGroup = computed(() => config.value.border || {})
const separatorGroup = computed(() => config.value.separator || {})
const configGroup = computed(() => config.value.config || {})
const itemsGroup = computed(() => {
  const raw = config.value.items
  if (!Array.isArray(raw)) return []
  return raw
})

// Config values
const allowMultiple = computed(() => configGroup.value.allow_multiple || false)
const firstOpen = computed(() => configGroup.value.first_open ?? true)

// Items with extracted multilang values
const renderedItems = computed(() => {
  return itemsGroup.value.map((item: any) => ({
    title: extractValue(item.title_html || item.title),
    content: extractValue(item.html || item.content)
  }))
})

// Header styles
const headerTag = computed(() => headerGroup.value.tag || 'h3')
const headerColor = computed(() => resolveColor(headerGroup.value.color))
const headerBg = computed(() => resolveColor(headerGroup.value.background))
const headerHoverColor = computed(() => resolveColor(headerGroup.value['color:hover']))
const headerHoverBg = computed(() => resolveColor(headerGroup.value['background:hover']))

// Content styles
const contentTag = computed(() => contentGroup.value.tag || 'div')
const contentColor = computed(() => resolveColor(contentGroup.value.color))
const contentHoverColor = computed(() => resolveColor(contentGroup.value['color:hover']))
const contentBorderColor = computed(() => resolveColor(contentGroup.value.border_color))
const contentBorderHoverColor = computed(() => resolveColor(contentGroup.value['border_color:hover']))

// Icon values
const iconColor = computed(() => resolveColor(iconGroup.value.color))
const iconHoverColor = computed(() => resolveColor(iconGroup.value['color:hover']))
const iconOpen = computed(() => iconGroup.value.open || 'fa-solid fa-minus')
const iconClosed = computed(() => iconGroup.value.closed || 'fa-solid fa-plus')

// Border values
const borderColor = computed(() => resolveColor(borderGroup.value.color))
const borderHoverColor = computed(() => resolveColor(borderGroup.value['color:hover']))

// Separator values
const separatorColor = computed(() => resolveColor(separatorGroup.value.color))
const separatorHoverColor = computed(() => resolveColor(separatorGroup.value['color:hover']))

// Hover detection
const hasHover = computed(() => !!(
  headerHoverColor.value || headerHoverBg.value ||
  contentHoverColor.value || contentBorderHoverColor.value ||
  iconHoverColor.value || borderHoverColor.value || separatorHoverColor.value
))

// State — initialize empty, then watch for data + config
const openItems = ref<Set<number>>(new Set())

// Watch items and first_open to set initial open state
watch(
  [renderedItems, firstOpen],
  ([items, fo]) => {
    if (fo && items.length > 0 && openItems.value.size === 0) {
      openItems.value = new Set([0])
    }
  },
  { immediate: true }
)

function toggle(index: number) {
  const newSet = new Set(openItems.value)
  if (newSet.has(index)) {
    newSet.delete(index)
  } else {
    if (!allowMultiple.value) {
      newSet.clear()
    }
    newSet.add(index)
  }
  openItems.value = newSet
}

function isOpen(index: number): boolean {
  return openItems.value.has(index)
}

// Computed styles
const accordionStyle = computed(() => {
  const styles: Record<string, string> = {}
  if (headerHoverColor.value) styles['--hover-header-color'] = headerHoverColor.value
  if (headerHoverBg.value) styles['--hover-header-bg'] = headerHoverBg.value
  if (contentHoverColor.value) styles['--hover-content-color'] = contentHoverColor.value
  if (contentBorderHoverColor.value) styles['--hover-content-border-color'] = contentBorderHoverColor.value
  if (iconHoverColor.value) styles['--hover-icon-color'] = iconHoverColor.value
  if (borderHoverColor.value) styles['--hover-border-color'] = borderHoverColor.value
  if (separatorHoverColor.value) styles['--hover-separator-color'] = separatorHoverColor.value
  return styles
})

function itemStyle(index: number) {
  const styles: Record<string, string> = {}
  if (borderColor.value) styles.borderColor = borderColor.value
  if (index > 0 && separatorColor.value) styles.borderTopColor = separatorColor.value
  return styles
}

function headerStyle() {
  const styles: Record<string, string> = {}
  if (headerColor.value) styles.color = headerColor.value
  if (headerBg.value) styles.backgroundColor = headerBg.value
  return styles
}

function contentStyle() {
  const styles: Record<string, string> = {}
  if (contentColor.value) styles.color = contentColor.value
  if (contentBorderColor.value) styles.borderTopColor = contentBorderColor.value
  return styles
}
</script>

<template>
  <div class="lcms-accordion" :class="{ 'has-hover': hasHover }" :style="accordionStyle">
    <div
      v-for="(item, index) in renderedItems"
      :key="index"
      class="lcms-accordion__item"
      :class="{ 'lcms-accordion__item--open': isOpen(index) }"
      :style="itemStyle(index)"
    >
      <button
        class="lcms-accordion__header"
        :style="headerStyle()"
        @click="toggle(index)"
      >
        <component :is="headerTag" class="lcms-accordion__title">{{ item.title }}</component>
        <i
          :class="[isOpen(index) ? iconOpen : iconClosed, 'lcms-accordion__icon']"
          :style="iconColor ? { color: iconColor } : {}"
        />
      </button>
      <div
        v-show="isOpen(index)"
        class="lcms-accordion__content"
        :style="contentStyle()"
      >
        <div v-html="item.content"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lcms-accordion__item {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  margin-bottom: 4px;
  overflow: hidden;
}

.lcms-accordion__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 12px 16px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: inherit;
  font-family: inherit;
  text-align: left;
  transition: color 200ms ease, background-color 200ms ease;
}

.lcms-accordion__title {
  font-weight: 600;
  margin: 0;
}

.lcms-accordion__icon {
  transition: transform 0.2s ease, color 200ms ease;
  flex-shrink: 0;
  margin-left: 12px;
}

.lcms-accordion__content {
  padding: 0 16px 12px;
  transition: color 200ms ease, border-color 200ms ease;
}

.lcms-accordion__content :deep(p) {
  margin: 0;
}

/* Hover styles */
.lcms-accordion.has-hover .lcms-accordion__item:hover .lcms-accordion__header {
  color: var(--hover-header-color, inherit);
  background-color: var(--hover-header-bg, inherit);
}

.lcms-accordion.has-hover .lcms-accordion__item:hover .lcms-accordion__icon {
  color: var(--hover-icon-color, inherit);
}

.lcms-accordion.has-hover .lcms-accordion__item:hover .lcms-accordion__content {
  color: var(--hover-content-color, inherit);
  border-top-color: var(--hover-content-border-color, inherit);
}

.lcms-accordion.has-hover .lcms-accordion__item:hover {
  border-color: var(--hover-border-color, inherit);
}
</style>
