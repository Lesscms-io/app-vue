<script setup lang="ts">
/**
 * Table of Contents Widget
 *
 * Renders a navigation list of anchor links that scroll to page sections.
 * Supports auto-generation from richtext field headings or manual items.
 * Uses IntersectionObserver to highlight the currently visible section.
 * Element-group structure: title, text, highlight, config.
 *
 * Source modes:
 * 1. Entry template: field_code + injected entry → parse HTML content
 * 2. Page with source_widget_uuid: scan headings inside specific widget element
 * 3. Page without source: scan all headings on page (DOM fallback)
 * 4. Manual items: user-defined list of anchors
 */

import { computed, ref, onMounted, onBeforeUnmount, watch, nextTick, inject } from 'vue'
import { useLanguage } from '@/composables/useLanguage'
import { resolveColor } from '@/utils/resolveColor'

defineOptions({
  inheritAttrs: false
})

interface Props {
  data: Record<string, any>
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const { extractValue, language: currentLanguage } = useLanguage(props.language)

// Element groups
const titleGroup = computed(() => props.data.title || {})
const textGroup = computed(() => props.data.text || {})
const highlightGroup = computed(() => props.data.highlight || {})
const configGroup = computed(() => props.data.config || {})

// Title group
const title = computed(() => {
  const t = titleGroup.value.content
  if (t && typeof t === 'object') return extractValue(t) as string
  return t || ''
})
const titleColor = computed(() => resolveColor(titleGroup.value.color) || undefined)
const titleHoverColor = computed(() => resolveColor(titleGroup.value['color:hover']) || null)
const titleFontSize = computed(() => {
  const v = titleGroup.value.font_size
  if (v == null) return undefined
  if (typeof v === 'number') return `${v}px`
  return String(v).match(/[a-z]/) ? v : `${v}px`
})

// Text group
const textColor = computed(() => resolveColor(textGroup.value.color) || '#495057')
const textHoverColor = computed(() => resolveColor(textGroup.value['color:hover']) || null)
const fontSize = computed(() => {
  const v = textGroup.value.font_size
  if (v == null) return undefined
  if (typeof v === 'number') return `${v}px`
  return String(v).match(/[a-z]/) ? v : `${v}px`
})
const itemsGap = computed(() => {
  const v = textGroup.value.items_gap
  return v != null ? `${v}px` : '8px'
})

// Highlight group
const highlightColor = computed(() => resolveColor(highlightGroup.value.color) || '#50a5f1')
const highlightHoverColor = computed(() => resolveColor(highlightGroup.value['color:hover']) || null)

// Config group
const fieldCode = computed(() => configGroup.value.field_code || '')
const headingLevel = computed(() => configGroup.value.heading_level || 'h2')
const sourceWidgetUuid = computed(() => configGroup.value.source_widget_uuid || '')
const showBorder = computed(() => configGroup.value.show_border !== false)

// Get entry from context (injected by parent template renderer)
const entry = inject<Record<string, any> | null>('lcms-collection-entry', null)

// Slugify heading text into anchor ID
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

// Auto-generated items from richtext content (entry template mode)
const autoItems = computed(() => {
  if (!fieldCode.value || !entry || !entry.content) return []

  const value = entry.content[fieldCode.value]
  if (!value) return []

  let html = ''
  if (typeof value === 'string') {
    html = value
  } else if (typeof value === 'object' && !Array.isArray(value)) {
    html = (value as Record<string, string>)[currentLanguage.value] ||
           (value as Record<string, string>).pl ||
           Object.values(value)[0] as string || ''
  }

  if (!html) return []

  const tag = headingLevel.value || 'h2'
  const regex = new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, 'gi')
  const result: Array<{ label: string; anchor: string }> = []
  let match

  while ((match = regex.exec(html)) !== null) {
    const text = match[1].replace(/<[^>]+>/g, '').trim()
    if (text) {
      result.push({
        label: text,
        anchor: slugify(text)
      })
    }
  }

  return result
})

// DOM-based heading scanning (page context)
const domItems = ref<Array<{ label: string; anchor: string }>>([])
let domObserver: MutationObserver | null = null

function getSourceElement(): Element | null {
  if (sourceWidgetUuid.value) {
    // Try to find the source widget by its ID (lcms-widget-{uuid})
    return document.getElementById(`lcms-widget-${sourceWidgetUuid.value}`) ||
           document.querySelector(`[data-widget-id="${sourceWidgetUuid.value}"]`)
  }
  return null
}

function scanDomHeadings() {
  const tag = headingLevel.value || 'h2'
  const sourceEl = getSourceElement()
  const searchRoot = sourceEl || document.body
  const headings = searchRoot.querySelectorAll(tag)
  const result: Array<{ label: string; anchor: string }> = []

  headings.forEach((el) => {
    const text = (el.textContent || '').trim()
    if (text) {
      const slug = slugify(text)
      if (!el.id) {
        el.id = slug
      }
      result.push({
        label: text,
        anchor: el.id || slug
      })
    }
  })

  domItems.value = result
}

// Manual items from content
const manualItems = computed(() => {
  const raw = props.data.items || []
  return raw.map((item: any) => ({
    label: item.label && typeof item.label === 'object'
      ? extractValue(item.label) as string
      : (item.label || ''),
    anchor: item.anchor || ''
  })).filter((item: any) => item.anchor)
})

// Determine items source
const items = computed(() => {
  // Entry template mode: field_code + entry content
  if (fieldCode.value && autoItems.value.length > 0) return autoItems.value
  // Page mode with source widget or DOM fallback
  if (domItems.value.length > 0) return domItems.value
  // Manual items
  return manualItems.value
})

const activeAnchor = ref<string>('')
let observer: IntersectionObserver | null = null

function scrollTo(anchor: string) {
  const el = document.getElementById(anchor)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' })
  }
}

// Add IDs to headings in the page that match our TOC items
function addHeadingIds() {
  if (items.value.length === 0) return

  const tag = headingLevel.value || 'h2'
  const sourceEl = getSourceElement()
  const searchRoot = sourceEl || document.body
  const headings = searchRoot.querySelectorAll(tag)

  headings.forEach((heading) => {
    const text = (heading.textContent || '').trim()
    const slug = slugify(text)
    const matchingItem = items.value.find(item => item.anchor === slug)
    if (matchingItem && !heading.id) {
      heading.id = slug
    }
  })
}

function setupObserver() {
  if (observer) {
    observer.disconnect()
  }

  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          activeAnchor.value = entry.target.id
        }
      }
    },
    {
      rootMargin: '-80px 0px -60% 0px',
      threshold: 0
    }
  )

  for (const item of items.value) {
    const el = document.getElementById(item.anchor)
    if (el) observer.observe(el)
  }
}

// Whether we need DOM scanning (page context or source widget specified)
const needsDomScan = computed(() => {
  // Source widget always needs DOM scan
  if (sourceWidgetUuid.value) return true
  // field_code set but no entry (page context)
  if (fieldCode.value && (!entry || !entry.content)) return true
  return false
})

onMounted(async () => {
  await nextTick()

  if (needsDomScan.value) {
    // Scan DOM for headings after sibling widgets render
    setTimeout(() => {
      scanDomHeadings()
      nextTick(() => setupObserver())

      // Observe DOM changes to re-scan (widgets load content async)
      const observeTarget = getSourceElement() || document.body
      domObserver = new MutationObserver(() => {
        scanDomHeadings()
        nextTick(() => setupObserver())
      })
      domObserver.observe(observeTarget, { childList: true, subtree: true, characterData: true })
    }, 200)
  } else {
    addHeadingIds()
    await nextTick()
    setupObserver()
  }
})

// Re-setup when items change (e.g. entry loaded async)
watch(items, async () => {
  await nextTick()
  addHeadingIds()
  await nextTick()
  setupObserver()
})

onBeforeUnmount(() => {
  if (observer) {
    observer.disconnect()
    observer = null
  }
  if (domObserver) {
    domObserver.disconnect()
    domObserver = null
  }
})
</script>

<template>
  <nav class="lcms-toc">
    <div
      v-if="title"
      class="lcms-toc__title"
      :style="{ fontSize: titleFontSize, color: titleColor }"
    >
      {{ title }}
    </div>
    <ul class="lcms-toc__list" :style="{ gap: itemsGap }">
      <li
        v-for="(item, index) in items"
        :key="index"
        class="lcms-toc__item"
        :class="{ 'lcms-toc__item--active': activeAnchor === item.anchor }"
      >
        <a
          :href="`#${item.anchor}`"
          class="lcms-toc__link"
          :style="{
            color: activeAnchor === item.anchor ? highlightColor : textColor,
            borderLeftColor: showBorder && activeAnchor === item.anchor ? highlightColor : undefined,
            fontSize: fontSize
          }"
          @click.prevent="scrollTo(item.anchor)"
        >
          {{ item.label }}
        </a>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.lcms-toc__title {
  font-weight: 600;
  margin-bottom: 12px;
}

.lcms-toc__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.lcms-toc__link {
  text-decoration: none;
  transition: color 0.2s;
}

.lcms-toc__link:hover {
  opacity: 0.8;
}
</style>
