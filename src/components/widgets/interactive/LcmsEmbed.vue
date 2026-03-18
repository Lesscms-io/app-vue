<script setup lang="ts">
/**
 * Embed Widget
 *
 * Renders custom HTML/JS embed code.
 */

import { computed } from 'vue'
import type { EmbedWidgetData } from '@/types/widgets'

defineOptions({
  inheritAttrs: false
})

interface Props {
  data: EmbedWidgetData
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

// Flat config ref for verifier compatibility
const config = computed(() => props.data || {} as Record<string, any>)

const code = computed(() => config.value.code || '')
const height = computed(() => {
  const h = parseInt(String(config.value.height))
  return h > 0 ? h : null
})
</script>

<template>
  <div
    class="lcms-embed"
    :style="height ? { height: `${height}px` } : {}"
    v-html="code"
  />
</template>

<style scoped>
.lcms-embed {
  width: 100%;
  overflow: hidden;
}

.lcms-embed :deep(iframe) {
  max-width: 100%;
}
</style>
