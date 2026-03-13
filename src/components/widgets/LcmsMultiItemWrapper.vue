<script setup lang="ts">
import { computed } from 'vue'
import type { Component } from 'vue'
import { useLanguage } from '@/composables/useLanguage'
import { resolveColor } from '@/utils/resolveColor'

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

const { extractValue } = useLanguage(props.language)

/**
 * Resolve multilingual values in item data.
 * Converts { "pl": "text" } → "text" based on current language.
 */
function resolveMultilingual(data: any): any {
  if (data === null || data === undefined) return data
  if (typeof data !== 'object') return data
  if (Array.isArray(data)) return data.map(resolveMultilingual)

  const result: Record<string, any> = {}
  for (const [key, value] of Object.entries(data)) {
    if (value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value)) {
      const keys = Object.keys(value as object)
      const isLangMap = keys.length > 0 && keys.length <= 10 && keys.every(k => /^[a-z]{2,3}$/.test(k))
      if (isLangMap) {
        result[key] = extractValue(value as Record<string, string>)
      } else {
        result[key] = value
      }
    } else {
      result[key] = value
    }
  }
  return result
}

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
    const resolved = resolveColor(itemSettings.backgroundColor)
    const bgOpacity = itemSettings.backgroundOpacity ?? 100
    if (bgOpacity < 100) {
      if (resolved.startsWith('#')) {
        style.backgroundColor = hexToRgba(resolved, bgOpacity)
      } else if (resolved.startsWith('var(')) {
        style.backgroundColor = `color-mix(in srgb, ${resolved} ${bgOpacity}%, transparent)`
      } else {
        style.backgroundColor = resolved
      }
    } else {
      style.backgroundColor = resolved
    }
  }

  // Gradient
  if (itemSettings.useGradient) {
    const type = itemSettings.gradientType || 'linear'
    const start = resolveColor(itemSettings.gradientColorStart) || '#667eea'
    const end = resolveColor(itemSettings.gradientColorEnd) || '#764ba2'
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
  if (itemSettings.boxShadow) style.boxShadow = itemSettings.boxShadow

  if (itemSettings.borderWidth && itemSettings.borderWidth > 0) {
    style.borderWidth = `${itemSettings.borderWidth}px`
    style.borderStyle = itemSettings.borderStyle || 'solid'
    if (itemSettings.borderColor) {
      style.borderColor = resolveColor(itemSettings.borderColor)
    }
  }

  return style
}

// Extract hover CSS variables from item widget data for the cell wrapper.
// Hover effects (lift, scale, shadow) must be on the cell (which has bg/padding/radius),
// not on the inner component, so shadows appear on the card edge.
const shadowMap: Record<string, string> = {
  sm: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
  md: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
  lg: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)'
}

const getCellHoverStyle = (item: MultiItemData): Record<string, string> => {
  const data = item.widget as Record<string, any> | undefined
  if (!data) return {}

  const style: Record<string, string> = {}
  const duration = data.transition_duration ?? 200
  style['--transition-duration'] = `${duration}ms`

  const lift = data.hover_lift || 0
  if (lift) style['--hover-lift'] = `-${lift}px`

  const scale = data.hover_scale
  if (scale && scale !== 1) style['--hover-scale'] = String(scale)

  const shadowVal = data.hover_shadow || 'none'
  if (shadowVal !== 'none' && shadowMap[shadowVal]) style['--hover-shadow'] = shadowMap[shadowVal]

  // All color-based hover effects - moved to cell so they trigger on cell hover, not inner component hover
  const hoverBg = data.hover_background_color ? resolveColor(data.hover_background_color) : null
  if (hoverBg) style['--hover-cell-bg'] = hoverBg

  const hoverTextColor = data.hover_text_color ? resolveColor(data.hover_text_color) : null
  if (hoverTextColor) style['--hover-text-color'] = hoverTextColor

  const hoverIconColor = data.hover_icon_color ? resolveColor(data.hover_icon_color) : null
  if (hoverIconColor) style['--hover-icon-color'] = hoverIconColor

  const hoverIconBg = data.hover_icon_background ? resolveColor(data.hover_icon_background) : null
  if (hoverIconBg) style['--hover-icon-bg'] = hoverIconBg

  const hoverLinkColor = data.hover_link_color ? resolveColor(data.hover_link_color) : null
  if (hoverLinkColor) style['--hover-link-color'] = hoverLinkColor

  const hoverBadgeColor = data.hover_badge_color ? resolveColor(data.hover_badge_color) : null
  if (hoverBadgeColor) style['--hover-badge-color'] = hoverBadgeColor

  const hoverBadgeBg = data.hover_badge_background ? resolveColor(data.hover_badge_background) : null
  if (hoverBadgeBg) style['--hover-badge-bg'] = hoverBadgeBg

  const hasHover = lift || (scale && scale !== 1) || (shadowVal !== 'none' && shadowMap[shadowVal]) || hoverBg || hoverTextColor || hoverIconColor || hoverIconBg || hoverLinkColor || hoverBadgeColor || hoverBadgeBg
  if (hasHover) style['--has-cell-hover'] = '1'

  return style
}

const getCellClass = (item: MultiItemData): Record<string, boolean> => {
  const data = item.widget as Record<string, any> | undefined
  if (!data) return {}
  const lift = data.hover_lift || 0
  const scale = data.hover_scale
  const shadowVal = data.hover_shadow || 'none'
  const hoverBg = !!data.hover_background_color
  const hoverTextColor = !!data.hover_text_color
  const hoverIconColor = !!data.hover_icon_color
  const hoverIconBg = !!data.hover_icon_background
  const hoverLinkColor = !!data.hover_link_color
  const hoverBadgeColor = !!data.hover_badge_color
  const hoverBadgeBg = !!data.hover_badge_background
  return {
    'lcms-multi-item-cell--has-hover': !!(lift || (scale && scale !== 1) || (shadowVal !== 'none' && shadowMap[shadowVal]) || hoverBg || hoverTextColor || hoverIconColor || hoverIconBg || hoverLinkColor || hoverBadgeColor || hoverBadgeBg),
    'lcms-multi-item-cell--has-hover-bg': hoverBg,
    'lcms-multi-item-cell--has-hover-text': hoverTextColor,
    'lcms-multi-item-cell--has-hover-icon-color': hoverIconColor,
    'lcms-multi-item-cell--has-hover-icon-bg': hoverIconBg,
    'lcms-multi-item-cell--has-hover-link-color': hoverLinkColor,
    'lcms-multi-item-cell--has-hover-badge-color': hoverBadgeColor,
    'lcms-multi-item-cell--has-hover-badge-bg': hoverBadgeBg
  }
}

// Compute flat data object for each item, preferring new `widget` key
// Also resolves multilingual values to current language
const getItemData = (item: MultiItemData) => {
  let raw: Record<string, unknown>
  if (item.widget) {
    raw = { widget_type: item.widget_type, ...item.widget, item_settings: item.item_settings }
  } else {
    // API format: merge config + content + data into flat object
    raw = {
      widget_type: item.widget_type,
      ...(item.config as Record<string, unknown> || {}),
      ...(item.content as Record<string, unknown> || {}),
      ...(item.data as Record<string, unknown> || {}),
      item_settings: item.item_settings
    }
  }
  return resolveMultilingual(raw)
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
      :class="getCellClass(item)"
      :style="{ ...getItemStyle(item), ...getCellHoverStyle(item) }"
    >
      <component
        :is="innerComponent"
        :data="getItemData(item)"
        :item-index="idx"
        :language="language"
        :settings="settings"
      />
    </div>
  </div>
</template>

<style scoped>
.lcms-multi-item-cell {
  box-sizing: border-box;
}

.lcms-multi-item-cell--has-hover {
  transition: transform var(--transition-duration, 200ms) ease, box-shadow var(--transition-duration, 200ms) ease, background-color var(--transition-duration, 200ms) ease, color var(--transition-duration, 200ms) ease;
}

.lcms-multi-item-cell--has-hover:hover {
  transform: translateY(var(--hover-lift, 0)) scale(var(--hover-scale, 1));
  box-shadow: var(--hover-shadow, none);
}

.lcms-multi-item-cell--has-hover.lcms-multi-item-cell--has-hover-bg:hover {
  background-color: var(--hover-cell-bg) !important;
}

/* Color-based hover effects on cell hover - targets inner service-card elements via :deep() */
.lcms-multi-item-cell--has-hover.lcms-multi-item-cell--has-hover-text:hover :deep(.lcms-service-card) {
  color: var(--hover-text-color) !important;
}

.lcms-multi-item-cell--has-hover.lcms-multi-item-cell--has-hover-icon-color:hover :deep(.lcms-service-card__icon) {
  color: var(--hover-icon-color) !important;
}

.lcms-multi-item-cell--has-hover.lcms-multi-item-cell--has-hover-icon-bg:hover :deep(.lcms-service-card__icon) {
  background-color: var(--hover-icon-bg) !important;
}

.lcms-multi-item-cell--has-hover.lcms-multi-item-cell--has-hover-link-color:hover :deep(.lcms-service-card__link) {
  color: var(--hover-link-color) !important;
}

.lcms-multi-item-cell--has-hover.lcms-multi-item-cell--has-hover-badge-color:hover :deep(.lcms-service-card__badge) {
  color: var(--hover-badge-color) !important;
}

.lcms-multi-item-cell--has-hover.lcms-multi-item-cell--has-hover-badge-bg:hover :deep(.lcms-service-card__badge) {
  background-color: var(--hover-badge-bg) !important;
}
</style>
