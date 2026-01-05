<script setup lang="ts">
/**
 * Divider Widget
 *
 * Renders a horizontal divider line.
 */

import { computed } from 'vue'
import type { DividerWidgetData } from '@/types/widgets'

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
const dividerColor = computed(() => props.data.color || '#e9ecef')
const dividerWidth = computed(() => props.data.width || '1')

const lineStyle = computed(() => ({
  borderTopStyle: dividerStyle.value,
  borderTopColor: dividerColor.value,
  borderTopWidth: `${dividerWidth.value}px`,
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
