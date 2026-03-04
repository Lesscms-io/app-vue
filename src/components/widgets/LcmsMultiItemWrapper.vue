<script setup lang="ts">
import { computed } from 'vue'
import type { Component } from 'vue'

interface MultiItemData {
  widget_type: string
  widget?: Record<string, unknown>
  config?: Record<string, unknown>
  content?: Record<string, unknown>
  data?: Record<string, unknown>
  item_settings?: Record<string, unknown>
}

interface Props {
  items: MultiItemData[]
  columns: number
  gap?: number
  layout?: string
  innerComponent: Component
  language?: string
  settings?: Record<string, unknown>
}

const props = withDefaults(defineProps<Props>(), {
  columns: 1,
  gap: 16,
  layout: 'grid',
  language: 'pl',
  settings: () => ({})
})

// Helper to convert hex color to rgba with opacity
const hexToRgba = (hex: string, opacity: number): string => {
  if (!hex) return ''
  const cleanHex = hex.replace('#', '')
  const r = parseInt(cleanHex.substring(0, 2), 16)
  const g = parseInt(cleanHex.substring(2, 4), 16)
  const b = parseInt(cleanHex.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${opacity / 100})`
}

// Generate per-item style from item.item_settings (API output)
const getItemStyle = (item: MultiItemData): Record<string, string> => {
  const itemSettings = item.item_settings as Record<string, any> | undefined
  if (!itemSettings) return {}

  const style: Record<string, string> = {}

  // Background color
  if (itemSettings.backgroundColor) {
    const bgOpacity = itemSettings.backgroundOpacity ?? 100
    if (bgOpacity < 100) {
      style.backgroundColor = hexToRgba(itemSettings.backgroundColor, bgOpacity)
    } else {
      style.backgroundColor = itemSettings.backgroundColor
    }
  }

  // Gradient
  if (itemSettings.useGradient) {
    const type = itemSettings.gradientType || 'linear'
    const start = itemSettings.gradientColorStart || '#667eea'
    const end = itemSettings.gradientColorEnd || '#764ba2'
    const angle = itemSettings.gradientAngle ?? 180
    if (type === 'radial') {
      style.background = `radial-gradient(circle, ${start} 0%, ${end} 100%)`
    } else {
      style.background = `linear-gradient(${angle}deg, ${start} 0%, ${end} 100%)`
    }
  }

  // Padding
  if (itemSettings.paddingTop) style.paddingTop = `${itemSettings.paddingTop}px`
  if (itemSettings.paddingRight) style.paddingRight = `${itemSettings.paddingRight}px`
  if (itemSettings.paddingBottom) style.paddingBottom = `${itemSettings.paddingBottom}px`
  if (itemSettings.paddingLeft) style.paddingLeft = `${itemSettings.paddingLeft}px`

  // Border
  if (itemSettings.borderRadius) style.borderRadius = `${itemSettings.borderRadius}px`
  if (itemSettings.borderWidth && itemSettings.borderWidth > 0) {
    style.borderWidth = `${itemSettings.borderWidth}px`
    style.borderStyle = itemSettings.borderStyle || 'solid'
    if (itemSettings.borderColor) {
      style.borderColor = itemSettings.borderColor
    }
  }

  // Box shadow
  if (itemSettings.boxShadow) {
    style.boxShadow = itemSettings.boxShadow
  }

  return style
}

// Compute flat data object for each item, preferring new `widget` key
const getItemData = (item: MultiItemData) => {
  if (item.widget) {
    return { widget_type: item.widget_type, ...item.widget, item_settings: item.item_settings }
  }
  // API format: merge config + content + data into flat object
  return {
    widget_type: item.widget_type,
    ...(item.config as Record<string, unknown> || {}),
    ...(item.content as Record<string, unknown> || {}),
    ...(item.data as Record<string, unknown> || {}),
    item_settings: item.item_settings
  }
}

const gridStyle = computed(() => {
  if (props.layout === 'inline') {
    return {
      display: 'flex',
      flexWrap: 'wrap' as const,
      gap: `${props.gap}px`,
      width: '100%'
    }
  }
  return {
    display: 'grid',
    gridTemplateColumns: `repeat(${props.columns}, 1fr)`,
    gap: `${props.gap}px`,
    width: '100%'
  }
})
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
      :style="getItemStyle(item)"
    >
      <component
        :is="innerComponent"
        :data="getItemData(item)"
        :language="language"
        :settings="settings"
      />
    </div>
  </div>
</template>
