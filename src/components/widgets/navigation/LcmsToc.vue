<script setup lang="ts">
/**
 * Table of Contents Widget
 *
 * Renders a navigation list of anchor links that scroll to page sections.
 * Uses IntersectionObserver to highlight the currently visible section.
 */

import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
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

const { extractValue } = useLanguage(props.language)

const config = computed(() => props.data.config || props.data || {})
const content = computed(() => props.data.content || props.data || {})

const title = computed(() => {
  const t = content.value.toc_title || content.value.tocTitle
  if (t && typeof t === 'object') return extractValue(t) as string
  return t || ''
})

const items = computed(() => {
  const raw = content.value.items || []
  return raw.map((item: any) => ({
    label: item.label && typeof item.label === 'object'
      ? extractValue(item.label) as string
      : (item.label || ''),
    anchor: item.anchor || ''
  })).filter((item: any) => item.anchor)
})

const highlightColor = computed(() => config.value.highlight_color || config.value.highlightColor || '#50a5f1')
const showBorder = computed(() => {
  if (config.value.show_border !== undefined) return config.value.show_border
  if (config.value.showBorder !== undefined) return config.value.showBorder
  return true
})

const activeAnchor = ref<string>('')
let observer: IntersectionObserver | null = null

function scrollTo(anchor: string) {
  const el = document.getElementById(anchor)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' })
  }
}

onMounted(() => {
  // Set up IntersectionObserver to track which section is visible
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

  // Observe all target elements
  for (const item of items.value) {
    const el = document.getElementById(item.anchor)
    if (el) observer.observe(el)
  }
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
            color: activeAnchor === item.anchor ? highlightColor : undefined,
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
