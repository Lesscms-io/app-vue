<script setup lang="ts">
/**
 * Progress Bar Widget
 *
 * Renders a progress bar with optional percentage display.
 */

import { computed } from 'vue'
import { useLanguage } from '@/composables/useLanguage'
import type { ProgressBarWidgetData } from '@/types/widgets'

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
  data: ProgressBarWidgetData
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const { extractValue } = useLanguage(props.language)

const title = computed(() => props.data.title ? extractValue(props.data.title) : '')
const percentage = computed(() => Math.min(Math.max(props.data.percentage || 0, 0), 100))
const barColor = computed(() => resolveColor(props.data.color) || '#50a5f1')
const showPercentage = computed(() => props.data.show_percentage !== false)

const progressContainerStyle = computed(() => {
  const style: Record<string, string> = {}
  const hoverColor = resolveColor(props.data.hover_color)
  if (hoverColor) style['--hover-color'] = hoverColor
  style['--transition-duration'] = `${props.data.transition_duration ?? 200}ms`
  return style
})
</script>

<template>
  <div class="lcms-progress-bar" :class="{ 'has-hover': !!data.hover_color }" :style="progressContainerStyle">
    <div
      v-if="title || showPercentage"
      class="lcms-progress-bar__header"
    >
      <span
        v-if="title"
        class="lcms-progress-bar__title"
      >{{ title }}</span>
      <span
        v-if="showPercentage"
        class="lcms-progress-bar__percentage"
      >{{ percentage }}%</span>
    </div>
    <div class="lcms-progress-bar__track">
      <div
        class="lcms-progress-bar__fill"
        :style="{
          width: `${percentage}%`,
          backgroundColor: barColor
        }"
      />
    </div>
  </div>
</template>

<style scoped>
.lcms-progress-bar__fill {
  transition: background-color var(--transition-duration, 200ms) ease;
}

.lcms-progress-bar.has-hover:hover .lcms-progress-bar__fill {
  background-color: var(--hover-color);
}
</style>
