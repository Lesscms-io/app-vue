<script setup lang="ts">
/**
 * Timeline Widget
 *
 * Renders a chronological timeline with date, title and content.
 */

import { computed } from 'vue'
import { useLanguage } from '@/composables/useLanguage'
import type { TimelineWidgetData } from '@/types/widgets'

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

defineOptions({
  inheritAttrs: false
})

interface Props {
  data: TimelineWidgetData
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const { extractValue } = useLanguage(props.language)

const items = computed(() => {
  const raw = props.data.items
  if (!Array.isArray(raw)) return []
  return raw.map(item => ({
    date: extractValue(item.date),
    title: extractValue(item.title),
    content: extractValue(item.content)
  }))
})

const layout = computed(() => props.data.layout || 'left')
const lineColor = computed(() => resolveColor(props.data.line_color) || '#e0e0e0')
const dotColor = computed(() => resolveColor(props.data.dot_color) || '#50a5f1')

function itemSide(index: number): string {
  if (layout.value === 'alternate') return index % 2 === 0 ? 'left' : 'right'
  return layout.value
}

const timelineContainerStyle = computed(() => {
  const styles: Record<string, string> = {}
  const hoverLine = resolveColor(props.data.hover_line_color)
  if (hoverLine) styles['--hover-line-color'] = hoverLine
  const hoverDot = resolveColor(props.data.hover_dot_color)
  if (hoverDot) styles['--hover-dot-color'] = hoverDot
  styles['--transition-duration'] = `${props.data.transition_duration ?? 200}ms`
  return styles
})
</script>

<template>
  <div class="lcms-timeline" :class="[`lcms-timeline--${layout}`, { 'has-hover': !!(data.hover_line_color || data.hover_dot_color) }]" :style="timelineContainerStyle">
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

.lcms-timeline__line {
  transition: background-color var(--transition-duration, 200ms) ease;
}

.lcms-timeline__dot {
  transition: background-color var(--transition-duration, 200ms) ease;
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
