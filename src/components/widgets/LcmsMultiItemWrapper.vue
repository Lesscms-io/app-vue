<script setup lang="ts">
import { computed } from 'vue'
import type { Component } from 'vue'

interface MultiItemData {
  widget_type: string
  config?: Record<string, unknown>
  content?: Record<string, unknown>
  data?: Record<string, unknown>
}

interface Props {
  items: MultiItemData[]
  columns: number
  gap?: number
  innerComponent: Component
  language?: string
  settings?: Record<string, unknown>
}

const props = withDefaults(defineProps<Props>(), {
  columns: 1,
  gap: 16,
  language: 'pl',
  settings: () => ({})
})

const gridStyle = computed(() => ({
  display: 'grid',
  gridTemplateColumns: `repeat(${props.columns}, 1fr)`,
  gap: `${props.gap}px`,
  width: '100%'
}))
</script>

<template>
  <div
    class="lcms-multi-item-wrapper"
    :style="gridStyle"
  >
    <div
      v-for="(item, idx) in items"
      :key="idx"
      class="lcms-multi-item-cell"
    >
      <component
        :is="innerComponent"
        :data="item"
        :language="language"
        :settings="settings"
      />
    </div>
  </div>
</template>
