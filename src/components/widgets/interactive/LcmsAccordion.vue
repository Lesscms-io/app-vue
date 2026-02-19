<script setup lang="ts">
/**
 * Accordion Widget
 *
 * Renders expandable/collapsible items with title and content.
 */

import { ref, computed } from 'vue'
import { useLanguage } from '@/composables/useLanguage'
import type { AccordionWidgetData } from '@/types/widgets'

defineOptions({
  inheritAttrs: false
})

interface Props {
  data: AccordionWidgetData
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const { extractValue } = useLanguage(props.language)

const items = computed(() => {
  const raw = props.data.items
  if (!Array.isArray(raw)) return []
  return raw.map(item => ({
    title: extractValue(item.title),
    content: extractValue(item.content)
  }))
})

const iconColor = computed(() => props.data.icon_color || null)
const borderColor = computed(() => props.data.border_color || null)
const allowMultiple = computed(() => props.data.allow_multiple || false)
const firstOpen = computed(() => props.data.first_open || false)

const openItems = ref<Set<number>>(new Set(firstOpen.value && items.value.length > 0 ? [0] : []))

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
</script>

<template>
  <div class="lcms-accordion">
    <div
      v-for="(item, index) in items"
      :key="index"
      class="lcms-accordion__item"
      :class="{ 'lcms-accordion__item--open': isOpen(index) }"
      :style="borderColor ? { borderColor } : {}"
    >
      <button
        class="lcms-accordion__header"
        @click="toggle(index)"
      >
        <span class="lcms-accordion__title">{{ item.title }}</span>
        <i
          class="fa-solid fa-chevron-down lcms-accordion__icon"
          :class="{ 'lcms-accordion__icon--open': isOpen(index) }"
          :style="iconColor ? { color: iconColor } : {}"
        />
      </button>
      <div
        v-if="isOpen(index)"
        class="lcms-accordion__content"
        v-html="item.content"
      />
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
}

.lcms-accordion__title {
  font-weight: 600;
}

.lcms-accordion__icon {
  transition: transform 0.2s ease;
  flex-shrink: 0;
  margin-left: 12px;
}

.lcms-accordion__icon--open {
  transform: rotate(180deg);
}

.lcms-accordion__content {
  padding: 0 16px 12px;
}
</style>
