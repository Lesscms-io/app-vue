<script setup lang="ts">
/**
 * Table of Contents Widget
 *
 * Renders a navigation list of anchor links that scroll to page sections.
 * Supports auto-generation from richtext field headings or manual items.
 * Uses IntersectionObserver to highlight the currently visible section.
 */

import { computed, ref, onMounted, onBeforeUnmount, watch, nextTick, inject } from 'vue'
import { useLanguage } from '@/composables/useLanguage'

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

const config = computed(() => props.data.config || props.data || {})
const content = computed(() => props.data.content || props.data || {})

const title = computed(() => {
  const t = content.value.toc_title || content.value.tocTitle
  if (t && typeof t === 'object') return extractValue(t) as string
  return t || ''
})

const textColor = computed(() => config.value.text_color || config.value.textColor || '#495057')
const highlightColor = computed(() => config.value.highlight_color || config.value.highlightColor || '#50a5f1')
const showBorder = computed(() => {
  if (config.value.show_border !== undefined) return config.value.show_border
  if (config.value.showBorder !== undefined) return config.value.showBorder
  return true
})

// Auto mode: field_code is set
const fieldCode = computed(() => config.value.field_code || config.value.fieldCode || '')
const headingLevel = computed(() => config.value.heading_level || config.value.headingLevel || 'h2')

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

// Auto-generated items from richtext content
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

// Manual items from content
const manualItems = computed(() => {
  const raw = content.value.items || []
  return raw.map((item: any) => ({
    label: item.label && typeof item.label === 'object'
      ? extractValue(item.label) as string
      : (item.label || ''),
    anchor: item.anchor || ''
  })).filter((item: any) => item.anchor)
})

// Use auto items if field_code is set, otherwise manual
const items = computed(() => {
  if (fieldCode.value) return autoItems.value
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
  if (!fieldCode.value || items.value.length === 0) return

  const tag = headingLevel.value || 'h2'
  const headings = document.querySelectorAll(tag)

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

onMounted(async () => {
  await nextTick()
  addHeadingIds()
  await nextTick()
  setupObserver()
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
})
</script>

<template>
  <nav class="lcms-toc">
    <div
      v-if="title"
      class="lcms-toc__title"
    >
      {{ title }}
    </div>
    <ul class="lcms-toc__list">
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
            borderLeftColor: showBorder && activeAnchor === item.anchor ? highlightColor : undefined
          }"
          @click.prevent="scrollTo(item.anchor)"
        >
          {{ item.label }}
        </a>
      </li>
    </ul>
  </nav>
</template>
