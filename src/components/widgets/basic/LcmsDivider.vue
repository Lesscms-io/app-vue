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

// Element-group computed ref for "line"
const lineGroup = computed(() => props.data.line || {})

// Read from nested "line" element-group, with legacy flat fallback
const dividerLineStyle = computed(() => lineGroup.value.line_style || props.data.style || 'solid')
const dividerWidth = computed(() => lineGroup.value.width || props.data.width || '1')
const dividerColor = computed(() => resolveColor(lineGroup.value.color || props.data.color) || '#e9ecef')
const hoverColor = computed(() => resolveColor(lineGroup.value['color:hover']))

const lineStyle = computed(() => ({
  borderTopStyle: dividerLineStyle.value,
  borderTopColor: dividerColor.value,
  borderTopWidth: `${dividerWidth.value}px`,
}))

const wrapperStyle = computed(() => {
  const s: Record<string, string> = {}
  if (hoverColor.value) s['--hover-color'] = hoverColor.value
  return s
})

const hasHover = computed(() => !!hoverColor.value)
</script>

<template>
  <div
    class="lcms-divider"
    :class="{ 'lcms-divider--has-hover': hasHover }"
    :style="wrapperStyle"
  >
    <hr
      class="lcms-divider__line"
      :style="lineStyle"
    >
  </div>
</template>
