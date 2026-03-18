<script setup lang="ts">
/**
 * Timeline Widget
 *
 * Renders a chronological timeline with date, title and content.
 * Uses element-group structure: line, dot, config, items.
 */

import { computed } from 'vue'
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

const { extractValue } = useLanguage(props.language)

// Element groups
const lineGroup = computed(() => props.data.line || {})
const dotGroup = computed(() => props.data.dot || {})
const configGroup = computed(() => props.data.config || {})
const itemsGroup = computed(() => props.data.items || [])

const items = computed(() => {
  const raw = itemsGroup.value
  if (!Array.isArray(raw)) return []
  return raw.map(item => ({
    date: extractValue(item.date),
    title: extractValue(item.title),
    content: extractValue(item.content)
  }))
})

const layout = computed(() => configGroup.value.layout || 'left')
const lineColor = computed(() => resolveColor(lineGroup.value.color) || '#e0e0e0')
const dotColor = computed(() => resolveColor(dotGroup.value.color) || '#50a5f1')
const hoverLineColor = computed(() => resolveColor(lineGroup.value['color:hover']) || '')
const hoverDotColor = computed(() => resolveColor(dotGroup.value['color:hover']) || '')

const hasHover = computed(() => !!(hoverLineColor.value || hoverDotColor.value))

function itemSide(index: number): string {
  if (layout.value === 'alternate') return index % 2 === 0 ? 'left' : 'right'
  return layout.value
}

const timelineContainerStyle = computed(() => {
  const styles: Record<string, string> = {}
  if (hoverLineColor.value) styles['--hover-line-color'] = hoverLineColor.value
  if (hoverDotColor.value) styles['--hover-dot-color'] = hoverDotColor.value
  return styles
})
</script>

<template>
  <div
    class="lcms-timeline"
    :class="[`lcms-timeline--${layout}`, { 'has-hover': hasHover }]"
    :style="timelineContainerStyle"
  >
    <div
      class="lcms-timeline__line"
      :style="{ backgroundColor: lineColor }"
    />
    <div
      v-for="(item, index) in items"
      :key="index"
      class="lcms-timeline__item"
      :class="`lcms-timeline__item--${itemSide(index)}`"
    >
      <div
        class="lcms-timeline__dot"
        :style="{ backgroundColor: dotColor }"
      />
      <div class="lcms-timeline__card">
        <span v-if="item.date" class="lcms-timeline__date">{{ item.date }}</span>
        <h4 v-if="item.title" class="lcms-timeline__title">{{ item.title }}</h4>
        <p v-if="item.content" class="lcms-timeline__content">{{ item.content }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lcms-timeline {
  position: relative;
  padding: 16px 0;
}

.lcms-timeline.has-hover:hover .lcms-timeline__line {
  background-color: var(--hover-line-color);
}

.lcms-timeline.has-hover:hover .lcms-timeline__dot {
  background-color: var(--hover-dot-color);
}

.lcms-timeline__line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background-color: #e0e0e0;
  transition: background-color 200ms ease;
}

.lcms-timeline--left .lcms-timeline__line {
  left: 8px;
}

.lcms-timeline--right .lcms-timeline__line {
  right: 8px;
}

.lcms-timeline--alternate .lcms-timeline__line {
  left: 50%;
  transform: translateX(-50%);
}

.lcms-timeline__item {
  position: relative;
  margin-bottom: 24px;
}

.lcms-timeline--left .lcms-timeline__item {
  padding-left: 32px;
}

.lcms-timeline--right .lcms-timeline__item {
  padding-right: 32px;
  text-align: right;
}

.lcms-timeline--alternate .lcms-timeline__item {
  width: 50%;
}

.lcms-timeline--alternate .lcms-timeline__item--left {
  padding-right: 32px;
  text-align: right;
  margin-left: 0;
}

.lcms-timeline--alternate .lcms-timeline__item--right {
  padding-left: 32px;
  margin-left: 50%;
}

.lcms-timeline__dot {
  position: absolute;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: #50a5f1;
  top: 4px;
  transition: background-color 200ms ease;
}

.lcms-timeline--left .lcms-timeline__dot {
  left: 3px;
}

.lcms-timeline--right .lcms-timeline__dot {
  right: 3px;
}

.lcms-timeline--alternate .lcms-timeline__item--left .lcms-timeline__dot {
  right: -6px;
}

.lcms-timeline--alternate .lcms-timeline__item--right .lcms-timeline__dot {
  left: -6px;
}

.lcms-timeline__card {
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 12px 16px;
}

.lcms-timeline__date {
  font-size: 0.85em;
  color: #6c757d;
}

.lcms-timeline__title {
  margin: 4px 0;
  font-size: 1em;
}

.lcms-timeline__content {
  margin: 4px 0 0;
  font-size: 0.95em;
  color: #495057;
}
</style>
