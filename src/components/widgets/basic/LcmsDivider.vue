<script setup lang="ts">
/**
 * Divider Widget
 *
 * Renders a horizontal divider line.
 */

import { computed } from 'vue'
import type { DividerWidgetData } from '@/types/widgets'

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
  data: DividerWidgetData
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const dividerStyle = computed(() => props.data.style || 'solid')
const dividerWidth = computed(() => props.data.width || '1')
const dividerThickness = computed(() => props.data.thickness || dividerWidth.value)

const lineStyle = computed(() => ({
  borderTopStyle: dividerStyle.value,
  borderTopColor: resolveColor(props.data.color) || '#e9ecef',
  borderTopWidth: `${dividerThickness.value}px`,
}))
</script>

<template>
  <div class="lcms-divider">
    <hr
      class="lcms-divider__line"
      :style="lineStyle"
    >
  </div>
</template>
