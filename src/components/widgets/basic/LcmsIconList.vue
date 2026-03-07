<template>
  <div class="lcms-icon-list-item" :class="{ 'has-hover': hasItemHover }" :style="itemStyle">
    <div class="lcms-icon-list-item__icon" :style="iconStyles">
      <i :class="iconClass" />
    </div>
    <span class="lcms-icon-list-item__text" :style="textStyles">{{ text }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

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

const props = defineProps<{
  data: {
    widget_type: string
    config: {
      icon?: string
      icon_color?: string
      text_size?: string
      item_bg_color?: string
      icon_size?: string
      hover_icon_color?: string
      hover_item_bg_color?: string
      transition_duration?: number
    }
    content?: {
      text?: string
    }
    settings?: Record<string, unknown>
  }
}>()

const config = computed(() => props.data.widget || props.data || {})
const text = computed(() => props.data.content?.text || '')
const iconClass = computed(() => config.value.icon || 'fa-solid fa-circle')

const iconSizeMap: Record<string, string> = { sm: '16px', md: '24px', lg: '32px' }
const textSizeMap: Record<string, string> = { sm: '0.875rem', md: '1rem', lg: '1.125rem' }

const transitionDuration = computed(() => `${config.value.transition_duration ?? 200}ms`)

const iconStyles = computed(() => {
  const styles: Record<string, string> = {}
  const color = resolveColor(config.value.icon_color)
  if (color) styles.color = color
  const sz = iconSizeMap[config.value.icon_size || 'md']
  if (sz) styles.fontSize = sz
  const hoverColor = resolveColor(config.value.hover_icon_color)
  if (hoverColor) styles['--hover-icon-color'] = hoverColor
  styles['--transition-duration'] = transitionDuration.value
  return styles
})

const textStyles = computed(() => {
  const styles: Record<string, string> = {}
  const sz = textSizeMap[config.value.text_size || 'md']
  if (sz) styles.fontSize = sz
  return styles
})

const hasItemHover = computed(() => !!(config.value.hover_icon_color || config.value.hover_item_bg_color))

const itemStyle = computed(() => {
  const styles: Record<string, string> = {}
  const bg = resolveColor(config.value.item_bg_color)
  if (bg) {
    styles.backgroundColor = bg
    styles.padding = '10px 14px'
    styles.borderRadius = '6px'
  }
  const hoverBg = resolveColor(config.value.hover_item_bg_color)
  if (hoverBg) styles['--hover-item-bg'] = hoverBg
  styles['--transition-duration'] = transitionDuration.value
  return styles
})
</script>

<style scoped>
.lcms-icon-list-item {
  display: flex;
  align-items: center;
  gap: 12px;
  transition: background-color var(--transition-duration, 200ms) ease;
}

.lcms-icon-list-item.has-hover:hover {
  background-color: var(--hover-item-bg) !important;
}

.lcms-icon-list-item__icon {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: color var(--transition-duration, 200ms) ease;
}

.lcms-icon-list-item.has-hover:hover .lcms-icon-list-item__icon {
  color: var(--hover-icon-color) !important;
}

.lcms-icon-list-item__text {
  flex: 1;
}
</style>
