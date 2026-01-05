<script setup lang="ts">
/**
 * Spacer Widget
 *
 * Renders vertical spacing.
 */

import { computed } from 'vue'
import type { SpacerWidgetData } from '@/types/widgets'

defineOptions({
  inheritAttrs: false
})

interface Props {
  data: SpacerWidgetData
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const spacerHeight = computed(() => props.data.height || 50)

const spacerStyle = computed(() => ({
  height: `${spacerHeight.value}px`,
}))
</script>

<template>
  <div
    class="lcms-spacer"
    :style="spacerStyle"
  />
</template>
