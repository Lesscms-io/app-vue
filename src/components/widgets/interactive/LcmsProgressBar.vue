<script setup lang="ts">
/**
 * Progress Bar Widget
 *
 * Renders a progress bar with optional percentage display.
 * Uses element-group pattern: bar (color, percentage), title (text).
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

// Element-group computed refs
const barGroup = computed(() => props.data.bar || {})
const titleGroup = computed(() => props.data.title || {})

const title = computed(() => titleGroup.value.content ? extractValue(titleGroup.value.content) : '')
const percentage = computed(() => Math.min(Math.max(barGroup.value.percentage || 0, 0), 100))
const barColor = computed(() => resolveColor(barGroup.value.color) || '#50a5f1')
const showPercentage = computed(() => barGroup.value.show_percentage !== false)
const hoverColor = computed(() => resolveColor(barGroup.value['color:hover']))

const progressContainerStyle = computed(() => {
  const style: Record<string, string> = {}
  if (hoverColor.value) style['--hover-color'] = hoverColor.value
  return style
})

const hasHover = computed(() => !!hoverColor.value)
</script>

<template>
  <div
    class="lcms-progress-bar"
    :class="{ 'has-hover': hasHover }"
    :style="progressContainerStyle"
  >
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
  transition: background-color 200ms ease;
}

.lcms-progress-bar.has-hover:hover .lcms-progress-bar__fill {
  background-color: var(--hover-color);
}
</style>
