<script setup lang="ts">
/**
 * Progress Bar Widget
 *
 * Renders a progress bar with optional percentage display.
 */

import { computed } from 'vue'
import { useLanguage } from '@/composables/useLanguage'
import type { ProgressBarWidgetData } from '@/types/widgets'

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
const barColor = computed(() => props.data.color || '#50a5f1')
const showPercentage = computed(() => props.data.show_percentage !== false)
</script>

<template>
  <div class="lcms-progress-bar">
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
