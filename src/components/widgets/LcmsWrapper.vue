<script setup lang="ts">
import { computed } from 'vue'
import { resolveColor } from '@/utils/resolveColor'

interface WrapperItem {
  id: string
  type: string
  data: Record<string, any>
  settings?: Record<string, any>
}

const props = defineProps<{
  data: {
    columns?: number
    columns_tablet?: number
    columns_mobile?: number
    gap?: number
    layout?: string
    style?: Record<string, any>
  }
  items?: WrapperItem[]
  language?: string
}>()

const columns = computed(() => props.data.columns || 1)
const columnsTablet = computed(() => props.data.columns_tablet)
const columnsMobile = computed(() => props.data.columns_mobile)
const gap = computed(() => props.data.gap || 16)
const layout = computed(() => props.data.layout || 'grid')

const wrapperId = `lcms-wrap-${Math.random().toString(36).substring(2, 9)}`

const gridStyle = computed(() => {
  if (layout.value === 'inline') {
    return { display: 'flex', flexWrap: 'wrap' as const, gap: `${gap.value}px`, width: '100%' }
  }
  return { display: 'grid', gridTemplateColumns: `repeat(${columns.value}, 1fr)`, gap: `${gap.value}px`, width: '100%' }
})

// Responsive CSS for tablet/mobile column overrides
const responsiveCss = computed(() => {
  if (layout.value === 'inline') return ''
  let css = ''
  if (columnsTablet.value) {
    css += `@media (max-width: 991px) { #${wrapperId} .lcms-wrapper__grid { grid-template-columns: repeat(${columnsTablet.value}, 1fr) !important; } }`
  }
  if (columnsMobile.value) {
    css += `@media (max-width: 767px) { #${wrapperId} .lcms-wrapper__grid { grid-template-columns: repeat(${columnsMobile.value}, 1fr) !important; } }`
  } else if (!columnsMobile.value && columns.value > 1) {
    // Default: stack on mobile
    css += `@media (max-width: 767px) { #${wrapperId} .lcms-wrapper__grid { grid-template-columns: 1fr !important; } }`
  }
  return css
})

const containerStyle = computed(() => {
  const s = props.data.style || {}
  const style: Record<string, string> = {}
  if (s.background_color) style.backgroundColor = resolveColor(s.background_color)
  if (s.padding_top !== undefined) style.paddingTop = `${s.padding_top}px`
  if (s.padding_right !== undefined) style.paddingRight = `${s.padding_right}px`
  if (s.padding_bottom !== undefined) style.paddingBottom = `${s.padding_bottom}px`
  if (s.padding_left !== undefined) style.paddingLeft = `${s.padding_left}px`
  if (s.margin_top !== undefined) style.marginTop = `${s.margin_top}px`
  if (s.margin_right !== undefined) style.marginRight = `${s.margin_right}px`
  if (s.margin_bottom !== undefined) style.marginBottom = `${s.margin_bottom}px`
  if (s.margin_left !== undefined) style.marginLeft = `${s.margin_left}px`
  if (s.border_radius) style.borderRadius = `${s.border_radius}px`
  if (s.border_width && s.border_width > 0) {
    style.borderWidth = `${s.border_width}px`
    style.borderStyle = s.border_style || 'solid'
    if (s.border_color) style.borderColor = resolveColor(s.border_color)
  }
  if (s.box_shadow) style.boxShadow = s.box_shadow

  // Width + alignment
  if (s.auto_width) {
    style.width = 'fit-content'
    const hAlign = s.horizontal_align || 'stretch'
    if (hAlign === 'center') {
      style.marginLeft = 'auto'
      style.marginRight = 'auto'
    } else if (hAlign === 'right') {
      style.marginLeft = 'auto'
    }
  }

  return style
})

// Per-cell style from widget's style group
const getCellStyle = (item: WrapperItem): Record<string, string> => {
  const s = item.data?.style
  if (!s) return {}
  const style: Record<string, string> = {}
  if (s.background_color) style.backgroundColor = resolveColor(s.background_color)
  if (s.padding_top !== undefined) style.paddingTop = `${s.padding_top}px`
  if (s.padding_right !== undefined) style.paddingRight = `${s.padding_right}px`
  if (s.padding_bottom !== undefined) style.paddingBottom = `${s.padding_bottom}px`
  if (s.padding_left !== undefined) style.paddingLeft = `${s.padding_left}px`
  if (s.border_radius) style.borderRadius = `${s.border_radius}px`
  if (s.border_width && s.border_width > 0) {
    style.borderWidth = `${s.border_width}px`
    style.borderStyle = s.border_style || 'solid'
    if (s.border_color) style.borderColor = resolveColor(s.border_color)
  }
  if (s.box_shadow) style.boxShadow = s.box_shadow
  return style
}

// Shadow presets
const shadowMap: Record<string, string> = {
  sm: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
  md: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
  lg: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)'
}

// Stable cell IDs
const instanceId = Math.random().toString(36).substring(2, 9)
const cellIds = computed(() => (props.items || []).map((_, idx) => `lcms-wcell-${instanceId}-${idx}`))

// Dynamic hover CSS for cells
const hoverCss = computed(() => {
  let css = ''
  const items = props.items || []

  items.forEach((item, idx) => {
    if (!item?.data) return
    const id = cellIds.value[idx]
    const data = item.data
    const s = data.style || {}

    const duration = s.transition_duration ?? 200
    const lift = s['lift:hover'] || 0
    const scale = s['scale:hover']
    const shadowVal = s['shadow_preset:hover'] || 'none'
    const hoverBg = s['background_color:hover'] ? resolveColor(s['background_color:hover']) : null
    const hoverBorderColor = s['border_color:hover'] ? resolveColor(s['border_color:hover']) : null
    const hoverBorderWidth = s['border_width:hover'] || 0

    // Element hover colors
    const hoverTextColor = data.heading?.['color:hover'] ? resolveColor(data.heading['color:hover']) : null
    const hoverIconColor = data.icon?.['color:hover'] ? resolveColor(data.icon['color:hover']) : null
    const hoverIconBg = data.icon?.['background:hover'] ? resolveColor(data.icon['background:hover']) : null
    const hoverLinkColor = data.link?.['color:hover'] ? resolveColor(data.link['color:hover']) : null
    const hoverBadgeColor = data.badge?.['color:hover'] ? resolveColor(data.badge['color:hover']) : null
    const hoverBadgeBg = data.badge?.['background:hover'] ? resolveColor(data.badge['background:hover']) : null

    const hasAny = lift || (scale && scale !== 1) || (shadowVal !== 'none') || hoverBg || hoverBorderColor || hoverBorderWidth || hoverTextColor || hoverIconColor || hoverIconBg || hoverLinkColor || hoverBadgeColor || hoverBadgeBg
    if (!hasAny) return

    css += `#${id} { transition: transform ${duration}ms ease, box-shadow ${duration}ms ease, background-color ${duration}ms ease, border-color ${duration}ms ease; }`

    // Inner element transitions
    const innerSelectors = ['.lcms-service-card', '.lcms-service-card__icon', '.lcms-service-card__link', '.lcms-service-card__badge']
    const selectorList = innerSelectors.map(s => `#${id} ${s}`).join(', ')
    css += `${selectorList} { transition: color ${duration}ms ease, background-color ${duration}ms ease; }`

    // Cell hover
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
    if (hoverBorderColor) cellHover += `border-color: ${hoverBorderColor} !important;`
    if (hoverBorderWidth > 0) cellHover += `border-width: ${hoverBorderWidth}px !important; border-style: solid;`
    if (cellHover) css += `#${id}:hover { ${cellHover} }`

    // Inner elements hover
    if (hoverTextColor) css += `#${id}:hover .lcms-service-card { color: ${hoverTextColor} !important; }`
    if (hoverIconColor) css += `#${id}:hover .lcms-service-card__icon { color: ${hoverIconColor} !important; }`
    if (hoverIconBg) css += `#${id}:hover .lcms-service-card__icon { background-color: ${hoverIconBg} !important; }`
    if (hoverLinkColor) css += `#${id}:hover .lcms-service-card__link { color: ${hoverLinkColor} !important; }`
    if (hoverBadgeColor) css += `#${id}:hover .lcms-service-card__badge { color: ${hoverBadgeColor} !important; }`
    if (hoverBadgeBg) css += `#${id}:hover .lcms-service-card__badge { background-color: ${hoverBadgeBg} !important; }`
  })

  return css
})
</script>

<template>
  <!-- Dynamic hover + responsive CSS -->
  <component :is="'style'" v-if="hoverCss || responsiveCss">{{ hoverCss }}{{ responsiveCss }}</component>

  <div :id="wrapperId" class="lcms-wrapper" :style="containerStyle">
    <div class="lcms-wrapper__grid" :style="gridStyle">
      <div
        v-for="(item, idx) in items"
        :id="cellIds[idx]"
        :key="item.id"
        class="lcms-wrapper__cell"
        :style="getCellStyle(item)"
      >
        <slot name="item" :item="item" :index="idx" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.lcms-wrapper {
  width: 100%;
  box-sizing: border-box;
}

.lcms-wrapper__grid {
  width: 100%;
}

.lcms-wrapper__cell {
  min-width: 0;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}
</style>
