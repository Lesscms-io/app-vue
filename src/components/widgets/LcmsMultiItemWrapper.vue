<script setup lang="ts">
import { computed } from 'vue'
import type { Component } from 'vue'
import { useLanguage } from '@/composables/useLanguage'
import { resolveColor } from '@/utils/resolveColor'
import { buildGradientCss } from '@/utils/gradient'

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
  containerFields?: Record<string, unknown>
}

const props = withDefaults(defineProps<Props>(), {
  columns: 1,
  gap: 16,
  layout: 'grid',
  language: 'pl',
  settings: () => ({}),
  containerFields: () => ({})
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
    const start = resolveColor(itemSettings.gradientColorStart) || '#667eea'
    const end = resolveColor(itemSettings.gradientColorEnd) || '#764ba2'
    style.background = buildGradientCss(
      itemSettings.gradientType || 'linear',
      itemSettings.gradientAngle ?? 180,
      itemSettings.gradientPosition || 'center',
      itemSettings.gradientIntensity ?? 0,
      start,
      end
    )
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

// Shadow presets for hover effects
const shadowMap: Record<string, string> = {
  sm: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
  md: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
  lg: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)'
}

// Generate stable unique ID prefix for this wrapper instance
const instanceId = Math.random().toString(36).substring(2, 9)

// Cell IDs are stable per instance - based on instance ID + index
const cellIds = computed(() => props.items.map((_, idx) => `lcms-cell-${instanceId}-${idx}`))

// Generate dynamic hover CSS for all cells.
// This is global (unscoped) CSS injected via <style> tag, so it bypasses
// scoped CSS limitations and can target child component elements directly.
const hoverCss = computed(() => {
  let css = ''

  props.items.forEach((item, idx) => {
    const data = item.widget as Record<string, any> | undefined
    if (!data) return

    const itemSettings = item.item_settings as Record<string, any> | undefined

    const id = cellIds.value[idx]

    const duration = data.transition_duration ?? 200

    const lift = data.hover_lift || 0
    const scale = data.hover_scale
    const shadowVal = data.hover_shadow || 'none'

    // Background hover
    const hoverBg = data.hover_background_color ? resolveColor(data.hover_background_color) : null

    // Element hover colors
    const hoverTextColor = data.hover_text_color ? resolveColor(data.hover_text_color) : null
    const hoverIconColor = data.hover_icon_color ? resolveColor(data.hover_icon_color) : null
    const hoverIconBg = data.hover_icon_background ? resolveColor(data.hover_icon_background) : null
    const hoverLinkColor = data.hover_link_color ? resolveColor(data.hover_link_color) : null
    const hoverBadgeColor = data.hover_badge_color ? resolveColor(data.hover_badge_color) : null
    const hoverBadgeBg = data.hover_badge_background ? resolveColor(data.hover_badge_background) : null

    // Border hover
    const hoverBorderColor = itemSettings?.hover?.borderColor ? resolveColor(itemSettings.hover.borderColor) : null
    const hoverBorderWidth = (itemSettings?.hover as Record<string, any> | undefined)?.borderWidth || 0
    const itemHoverBg = itemSettings?.hover?.backgroundColor ? resolveColor(itemSettings.hover.backgroundColor) : null

    const hasAnyHover = lift || (scale && scale !== 1) || (shadowVal !== 'none') || hoverBg || itemHoverBg || hoverTextColor || hoverIconColor || hoverIconBg || hoverLinkColor || hoverBadgeColor || hoverBadgeBg || hoverBorderColor || hoverBorderWidth
    if (!hasAnyHover) return

    // Base transition on the cell
    css += `#${id} { transition: transform ${duration}ms ease, box-shadow ${duration}ms ease, background-color ${duration}ms ease, border-color ${duration}ms ease, border-width ${duration}ms ease; }`

    // Cell hover: transform + shadow + bg + border
    let cellHover = ''
    if (lift && scale && scale !== 1) {
      cellHover += `transform: translateY(-${lift}px) scale(${scale});`
    } else if (lift) {
      cellHover += `transform: translateY(-${lift}px);`
    } else if (scale && scale !== 1) {
      cellHover += `transform: scale(${scale});`
    }
    if (shadowVal !== 'none' && shadowMap[shadowVal]) cellHover += `box-shadow: ${shadowMap[shadowVal]};`
    if (hoverBg) cellHover += `background-color: ${hoverBg} !important;`
    if (itemHoverBg) cellHover += `background-color: ${itemHoverBg} !important;`
    if (hoverBorderColor) cellHover += `border-color: ${hoverBorderColor} !important;`
    if (hoverBorderWidth > 0) cellHover += `border-width: ${hoverBorderWidth}px !important; border-style: solid;`
    if (cellHover) css += `#${id}:hover { ${cellHover} }`

    // Inner service-card text color
    if (hoverTextColor) {
      css += `#${id}:hover .lcms-service-card { color: ${hoverTextColor} !important; }`
    }

    // Icon color + bg
    if (hoverIconColor) {
      css += `#${id}:hover .lcms-service-card__icon { color: ${hoverIconColor} !important; }`
    }
    if (hoverIconBg) {
      css += `#${id}:hover .lcms-service-card__icon { background-color: ${hoverIconBg} !important; }`
    }

    // Link color
    if (hoverLinkColor) {
      css += `#${id}:hover .lcms-service-card__link { color: ${hoverLinkColor} !important; }`
    }

    // Badge color + bg
    if (hoverBadgeColor) {
      css += `#${id}:hover .lcms-service-card__badge { color: ${hoverBadgeColor} !important; }`
    }
    if (hoverBadgeBg) {
      css += `#${id}:hover .lcms-service-card__badge { background-color: ${hoverBadgeBg} !important; }`
    }
  })

  return css
})

// Inline styles for cell (only item_settings, no hover - hover is in dynamic CSS)
const getCellStyle = (item: MultiItemData): Record<string, string> => {
  return getItemStyle(item)
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

// Container style from container_* fields
const containerStyle = computed(() => {
  const d = props.containerFields
  if (!d || Object.keys(d).length === 0) return {}
  const style: Record<string, string> = {}

  // Padding
  if (d.container_padding_top !== undefined) style.paddingTop = `${d.container_padding_top}px`
  if (d.container_padding_right !== undefined) style.paddingRight = `${d.container_padding_right}px`
  if (d.container_padding_bottom !== undefined) style.paddingBottom = `${d.container_padding_bottom}px`
  if (d.container_padding_left !== undefined) style.paddingLeft = `${d.container_padding_left}px`

  // Margin
  if (d.container_margin_top !== undefined) style.marginTop = `${d.container_margin_top}px`
  if (d.container_margin_right !== undefined) style.marginRight = `${d.container_margin_right}px`
  if (d.container_margin_bottom !== undefined) style.marginBottom = `${d.container_margin_bottom}px`
  if (d.container_margin_left !== undefined) style.marginLeft = `${d.container_margin_left}px`

  // Background color
  if (d.container_background_color) {
    style.backgroundColor = resolveColor(String(d.container_background_color))
  }

  // Border radius
  if (d.container_border_radius) {
    style.borderRadius = `${d.container_border_radius}px`
  }

  // Border
  if (d.container_border_width && Number(d.container_border_width) > 0) {
    style.borderWidth = `${d.container_border_width}px`
    style.borderStyle = String(d.container_border_style || 'solid')
    if (d.container_border_color) {
      style.borderColor = resolveColor(String(d.container_border_color))
    }
  }

  // Shadow
  const shadow = d.container_shadow as string
  if (shadow && shadow !== 'none' && shadowMap[shadow]) {
    style.boxShadow = shadowMap[shadow]
  }

  return style
})

const hasContainerStyle = computed(() => Object.keys(containerStyle.value).length > 0)

const containerId = computed(() => `lcms-container-${instanceId}`)

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
  <!-- Dynamic hover CSS (global, unscoped) - targets inner child component elements -->
  <component :is="'style'" v-if="hoverCss">{{ hoverCss }}</component>

  <div
    :id="hasContainerStyle ? containerId : undefined"
    :class="{ 'lcms-multi-item-container': hasContainerStyle }"
    :style="containerStyle"
  >
    <div
      class="lcms-multi-item-wrapper"
      :style="gridStyle"
    >
      <div
        v-for="(item, idx) in items"
        :key="idx"
        :id="cellIds[idx]"
        class="lcms-multi-item-cell"
        :style="getCellStyle(item)"
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
  </div>
</template>

<style scoped>
.lcms-multi-item-container {
  box-sizing: border-box;
}

.lcms-multi-item-cell {
  box-sizing: border-box;
}
</style>
