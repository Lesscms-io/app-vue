<template>
  <div class="lcms-icon-box" :class="[positionClass, { 'has-hover': hasHover, 'has-hover-icon-color': !!hoverIconColor, 'has-hover-icon-bg': !!hoverIconBg, 'has-hover-title-color': !!hoverTitleColor, 'has-hover-text-color': !!hoverTextColor }]" :data-source="contentSource" :style="cardStyle">
    <div class="lcms-icon-box__icon" :style="iconStyles">
      <span v-if="isSvgIcon" class="lcms-icon-box__svg" v-html="svgContent"></span>
      <i v-else :class="iconClass"></i>
    </div>
    <div class="lcms-icon-box__content" :style="contentStyle" v-html="content"></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

function resolveColor(val: string | null | undefined): string | null {
  if (!val) return null
  if (val === 'transparent') return 'transparent'
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
      content?: string
      icon_position?: string
      icon_vertical_align?: string
      icon_size?: string | number
      icon_color?: string
      icon_background?: string
      icon_border_radius?: string | number
    }
    settings?: Record<string, unknown>
  }
}>()

const config = computed(() => props.data.widget || props.data || {})

const isSvgIcon = computed(() => (config.value.icon || '').startsWith('svg:'))
const svgContent = computed(() => isSvgIcon.value ? (config.value.icon || '').slice(4) : '')
const iconClass = computed(() => isSvgIcon.value ? '' : (config.value.icon || 'fas fa-star'))

const content = computed(() => config.value.html || config.value.content || '')

// Dynamic content source settings (for future dynamic mode)
const contentSource = computed(() => config.value.content_source || 'static')
const collectionCode = computed(() => config.value.collection_code || '')
const fieldCode = computed(() => config.value.field_code || '')
const entryId = computed(() => config.value.entry_id || '')
const entrySource = computed(() => config.value.entry_source || '')
const entryUrlSegment = computed(() => config.value.entry_url_segment || '')

const iconPadding = computed(() => config.value.icon_padding || '')
const iconVerticalAlign = computed(() => config.value.icon_vertical_align || 'top')

const iconPosition = computed(() => config.value.icon_position || 'left')

const positionClass = computed(() => {
  const classes = [`lcms-icon-box--${iconPosition.value}`]
  if (iconPosition.value === 'left' || iconPosition.value === 'right') {
    classes.push(`lcms-icon-box--align-${iconVerticalAlign.value}`)
  }
  return classes
})

// Title/text style
const titleFontSize = computed(() => config.value.title_font_size || '')
const titleFontWeight = computed(() => config.value.title_font_weight || '')
const titleColor = computed(() => resolveColor(config.value.title_color) || '')
const textFontSize = computed(() => config.value.text_font_size || '')
const textFontWeight = computed(() => config.value.text_font_weight || '')
const textColor = computed(() => resolveColor(config.value.text_color) || '')

// Hover color effects
const hoverIconColor = computed(() => resolveColor(config.value.hover_icon_color) || '')
const hoverIconBg = computed(() => resolveColor(config.value.hover_icon_background) || '')
const hoverTitleColor = computed(() => resolveColor(config.value.hover_title_color) || '')
const hoverTextColor = computed(() => resolveColor(config.value.hover_text_color) || '')

const hasHover = computed(() => !!(config.value.hover_lift || (config.value.hover_scale !== undefined && config.value.hover_scale !== 1) || (config.value.hover_shadow && config.value.hover_shadow !== 'none') || hoverIconColor.value || hoverIconBg.value || hoverTitleColor.value || hoverTextColor.value))

const contentStyle = computed(() => {
  const styles: Record<string, string> = {}
  if (titleFontSize.value) styles['--title-font-size'] = titleFontSize.value
  if (titleFontWeight.value) styles['--title-font-weight'] = titleFontWeight.value
  if (titleColor.value) styles['--title-color'] = titleColor.value
  if (textFontSize.value) styles['--text-font-size'] = textFontSize.value
  if (textFontWeight.value) styles['--text-font-weight'] = textFontWeight.value
  if (textColor.value) styles['--text-color'] = textColor.value
  return styles
})

const cardStyle = computed(() => {
  const styles: Record<string, string> = {}

  // Card styling
  const cardBg = resolveColor(config.value.card_background)
  if (cardBg) styles.backgroundColor = cardBg
  if (config.value.card_padding) styles.padding = `${config.value.card_padding}px`
  const cardBr = parseInt(String(config.value.card_border_radius))
  if (!isNaN(cardBr) && cardBr > 0) styles.borderRadius = `${cardBr}px`
  const cardBorderColor = resolveColor(config.value.card_border_color)
  if (cardBorderColor) styles.border = `1px solid ${cardBorderColor}`

  styles['--transition-duration'] = `${config.value.transition_duration ?? 200}ms`

  // Hover color CSS variables
  if (hoverIconColor.value) styles['--hover-icon-color'] = hoverIconColor.value
  if (hoverIconBg.value) styles['--hover-icon-bg'] = hoverIconBg.value
  if (hoverTitleColor.value) styles['--hover-title-color'] = hoverTitleColor.value
  if (hoverTextColor.value) styles['--hover-text-color'] = hoverTextColor.value
  const hoverCardBg = resolveColor(config.value.hover_card_background)
  if (hoverCardBg) styles['--hover-card-bg'] = hoverCardBg
  const hoverCardBorder = resolveColor(config.value.hover_card_border_color)
  if (hoverCardBorder) styles['--hover-card-border-color'] = hoverCardBorder

  // Hover transform effects
  const lift = config.value.hover_lift || 0
  if (lift) styles['--hover-lift'] = `-${lift}px`
  const scale = config.value.hover_scale
  if (scale && scale !== 1) styles['--hover-scale'] = String(scale)
  const shadowMap: Record<string, string> = { sm: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)', md: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)', lg: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)' }
  const shadowVal = config.value.hover_shadow || 'none'
  if (shadowVal !== 'none' && shadowMap[shadowVal]) styles['--hover-shadow'] = shadowMap[shadowVal]

  return styles
})

const iconStyles = computed(() => {
  const styles: Record<string, string> = {}

  if (config.value.icon_size) {
    styles.fontSize = `${config.value.icon_size}px`
  }
  const color = resolveColor(config.value.icon_color)
  if (color) {
    styles.color = color
  }
  const bg = resolveColor(config.value.icon_background)
  if (bg) {
    styles.backgroundColor = bg
  }
  if (iconPadding.value) {
    styles.padding = `${iconPadding.value}px`
  }
  const br = parseInt(String(config.value.icon_border_radius))
  if (!isNaN(br) && br > 0) {
    styles.borderRadius = `${br}px`
  }

  return styles
})
</script>

<style scoped>
.lcms-icon-box {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  transition: transform var(--transition-duration, 200ms) ease, box-shadow var(--transition-duration, 200ms) ease, background-color var(--transition-duration, 200ms) ease, border-color var(--transition-duration, 200ms) ease;
}

.lcms-icon-box.has-hover:hover {
  transform: translateY(var(--hover-lift, 0)) scale(var(--hover-scale, 1));
  box-shadow: var(--hover-shadow, none);
  background-color: var(--hover-card-bg);
  border-color: var(--hover-card-border-color);
}

.lcms-icon-box--top {
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.lcms-icon-box--bottom {
  flex-direction: column-reverse;
  align-items: center;
  text-align: center;
}

.lcms-icon-box--left {
  flex-direction: row;
}

.lcms-icon-box--right {
  flex-direction: row-reverse;
}

.lcms-icon-box--align-top {
  align-items: flex-start;
}

.lcms-icon-box--align-center {
  align-items: center;
}

.lcms-icon-box--align-bottom {
  align-items: flex-end;
}

.lcms-icon-box__icon {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  padding: 0;
  line-height: 1;
  box-sizing: content-box;
  transition: color var(--transition-duration, 200ms) ease, background-color var(--transition-duration, 200ms) ease;
}

.lcms-icon-box.has-hover.has-hover-icon-color:hover .lcms-icon-box__icon {
  color: var(--hover-icon-color) !important;
}

.lcms-icon-box.has-hover.has-hover-icon-bg:hover .lcms-icon-box__icon {
  background-color: var(--hover-icon-bg) !important;
}

.lcms-icon-box__content {
  flex: 1;
}

.lcms-icon-box__content :deep(p) {
  margin: 0;
}

/* Title style: apply to headings */
.lcms-icon-box__content :deep(h1),
.lcms-icon-box__content :deep(h2),
.lcms-icon-box__content :deep(h3),
.lcms-icon-box__content :deep(h4),
.lcms-icon-box__content :deep(h5),
.lcms-icon-box__content :deep(h6) {
  font-size: var(--title-font-size, inherit);
  font-weight: var(--title-font-weight, inherit);
  color: var(--title-color, inherit);
  transition: color var(--transition-duration, 200ms) ease;
}

/* Text style: apply to paragraphs */
.lcms-icon-box__content :deep(p) {
  font-size: var(--text-font-size, inherit);
  font-weight: var(--text-font-weight, inherit);
  color: var(--text-color, inherit);
  transition: color var(--transition-duration, 200ms) ease;
}

/* Hover title color */
.lcms-icon-box.has-hover.has-hover-title-color:hover .lcms-icon-box__content :deep(h1),
.lcms-icon-box.has-hover.has-hover-title-color:hover .lcms-icon-box__content :deep(h2),
.lcms-icon-box.has-hover.has-hover-title-color:hover .lcms-icon-box__content :deep(h3),
.lcms-icon-box.has-hover.has-hover-title-color:hover .lcms-icon-box__content :deep(h4),
.lcms-icon-box.has-hover.has-hover-title-color:hover .lcms-icon-box__content :deep(h5),
.lcms-icon-box.has-hover.has-hover-title-color:hover .lcms-icon-box__content :deep(h6) {
  color: var(--hover-title-color) !important;
}

/* Hover text color */
.lcms-icon-box.has-hover.has-hover-text-color:hover .lcms-icon-box__content :deep(p) {
  color: var(--hover-text-color) !important;
}

.lcms-icon-box__svg {
  display: inline-flex;
  width: 1em;
  height: 1em;
}

.lcms-icon-box__svg :deep(svg) {
  width: 100%;
  height: 100%;
}

.lcms-icon-box__svg :deep(svg[fill="none"]) {
  fill: none;
}

.lcms-icon-box__svg :deep(svg:not([fill])) {
  fill: currentColor;
}
</style>
