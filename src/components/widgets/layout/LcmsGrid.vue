<script setup lang="ts">
/**
 * Grid Widget
 *
 * Renders a nested grid with columns containing widgets.
 */

import { computed } from 'vue'
import { useLanguage } from '@/composables/useLanguage'

defineOptions({
  inheritAttrs: false
})

interface Props {
  data: any
  settings?: any
  language?: string
}

const props = defineProps<Props>()

const { extractValue } = useLanguage(props.language)

// API returns config with columns array
const config = computed(() => props.data.config || props.data || {})
const columns = computed(() => config.value.columns || [])
const gap = computed(() => config.value.gap || 16)
const stackOnMobile = computed(() => config.value.stack_on_mobile !== false)

const gridStyle = computed(() => {
  const cols = columns.value
  if (!cols.length) return {}

  const templateColumns = cols.map((col: any) => `${col.span || 1}fr`).join(' ')

  return {
    display: 'grid',
    gridTemplateColumns: templateColumns,
    gap: `${gap.value}px`
  }
})

// Render content for a column (it contains widgets with type and data)
function renderColumnContent(content: any[]) {
  if (!content || !content.length) return []

  return content.map((item: any, index: number) => {
    // Each item has: type, data (with content), settings
    const html = extractValue(item.data?.content) || ''
    return { html, index }
  })
}
</script>

<template>
  <div
    class="lcms-grid"
    :class="{ 'lcms-grid--stack-mobile': stackOnMobile }"
    :style="gridStyle"
  >
    <div
      v-for="(column, colIndex) in columns"
      :key="colIndex"
      class="lcms-grid__column"
    >
      <!-- Render each content item as HTML -->
      <div
        v-for="item in renderColumnContent(column.content)"
        :key="item.index"
        class="lcms-grid__content"
        v-html="item.html"
      />
    </div>
  </div>
</template>

<style>
.lcms-grid {
  width: 100%;
}

.lcms-grid__column {
  display: flex;
  flex-direction: column;
  /* Reset any inherited or inline styles - user requested no border/padding */
  border: none !important;
  border-radius: 0 !important;
  padding: 0 !important;
}

@media (max-width: 768px) {
  .lcms-grid--stack-mobile {
    grid-template-columns: 1fr !important;
  }
}
</style>
