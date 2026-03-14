<template>
  <div class="lcms-numbered-box" :class="[positionClass, { 'has-hover': hasHover, 'has-hover-number-color': !!hoverNumberColor, 'has-hover-number-bg': !!hoverNumberBg, 'has-hover-title-color': !!hoverTitleColor, 'has-hover-text-color': !!hoverTextColor }]" :style="cardStyle">
    <div class="lcms-numbered-box__number" :style="numberStyles">
      {{ displayNumber }}
    </div>
    <div class="lcms-numbered-box__content" :style="contentStyle">
      <component
        :is="titleTag"
        v-if="title"
        class="lcms-numbered-box__title"
      >
        {{ title }}
      </component>
      <div v-if="content" v-html="content" />
    </div>
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
  data: Record<string, any>
  itemIndex?: number
}>()

const config = computed(() => props.data.widget || props.data || {})

const displayNumber = computed(() => {
  const idx = props.itemIndex ?? 0
  return String(idx + 1).padStart(2, '0')
})

const title = computed(() => config.value.title || '')
const content = computed(() => config.value.html || config.value.content || '')

const numberPosition = computed(() => config.value.number_position || 'left')
const numberVerticalAlign = computed(() => config.value.number_vertical_align || 'top')

const positionClass = computed(() => {
  const classes = [`lcms-numbered-box--${numberPosition.value}`]
  if (numberPosition.value === 'left' || numberPosition.value === 'right') {
    classes.push(`lcms-numbered-box--align-${numberVerticalAlign.value}`)
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
const hoverNumberColor = computed(() => resolveColor(config.value.hover_number_color) || '')
const hoverNumberBg = computed(() => resolveColor(config.value.hover_number_background) || '')
const hoverTitleColor = computed(() => resolveColor(config.value.hover_title_color) || '')
const hoverTextColor = computed(() => resolveColor(config.value.hover_text_color) || '')

const hasHover = computed(() => !!(config.value.hover_lift || (config.value.hover_scale !== undefined && config.value.hover_scale !== 1) || (config.value.hover_shadow && config.value.hover_shadow !== 'none') || hoverNumberColor.value || hoverNumberBg.value || hoverTitleColor.value || hoverTextColor.value))

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

const titleTag = computed(() => config.value.title_tag || 'h3')

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
  if (hoverNumberColor.value) styles['--hover-number-color'] = hoverNumberColor.value
  if (hoverNumberBg.value) styles['--hover-number-bg'] = hoverNumberBg.value
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

const numberStyles = computed(() => {
  const styles: Record<string, string> = {}

  if (config.value.number_size) {
    styles.fontSize = `${config.value.number_size}px`
  }
  const color = resolveColor(config.value.number_color)
  if (color) {
    styles.color = color
  }
  if (config.value.number_font_weight) {
    styles.fontWeight = String(config.value.number_font_weight)
  }
  const bg = resolveColor(config.value.number_background)
  if (bg && config.value.number_background !== 'transparent') {
    styles.backgroundColor = bg
  }
  const padding = parseInt(String(config.value.number_padding))
  if (!isNaN(padding) && padding > 0) {
    styles.padding = `${padding}px`
  }
  const br = parseInt(String(config.value.number_border_radius))
  if (!isNaN(br) && br > 0) {
    styles.borderRadius = `${br}px`
  }

  return styles
})
</script>

<style scoped>
.lcms-numbered-box {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  transition: transform var(--transition-duration, 200ms) ease, box-shadow var(--transition-duration, 200ms) ease, background-color var(--transition-duration, 200ms) ease, border-color var(--transition-duration, 200ms) ease;
}

.lcms-numbered-box.has-hover:hover {
  transform: translateY(var(--hover-lift, 0)) scale(var(--hover-scale, 1));
  box-shadow: var(--hover-shadow, none);
  background-color: var(--hover-card-bg);
  border-color: var(--hover-card-border-color);
}

.lcms-numbered-box--top {
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.lcms-numbered-box--bottom {
  flex-direction: column-reverse;
  align-items: center;
  text-align: center;
}

.lcms-numbered-box--left {
  flex-direction: row;
}

.lcms-numbered-box--right {
  flex-direction: row-reverse;
}

.lcms-numbered-box--align-top {
  align-items: flex-start;
}

.lcms-numbered-box--align-center {
  align-items: center;
}

.lcms-numbered-box--align-bottom {
  align-items: flex-end;
}

.lcms-numbered-box__number {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  font-weight: 700;
  line-height: 1;
  box-sizing: content-box;
  font-variant-numeric: tabular-nums;
  transition: color var(--transition-duration, 200ms) ease, background-color var(--transition-duration, 200ms) ease;
}

.lcms-numbered-box.has-hover.has-hover-number-color:hover .lcms-numbered-box__number {
  color: var(--hover-number-color) !important;
}

.lcms-numbered-box.has-hover.has-hover-number-bg:hover .lcms-numbered-box__number {
  background-color: var(--hover-number-bg) !important;
}

.lcms-numbered-box__content {
  flex: 1;
}

/* Title (separate field) - rendered via dynamic tag (h2, h3, etc.) */
.lcms-numbered-box__title {
  font-weight: var(--title-font-weight, 700);
  color: var(--title-color, inherit);
  margin: 0 0 0.3em 0;
  transition: color var(--transition-duration, 200ms) ease;
}
.lcms-numbered-box__title:is(h1) { font-size: var(--title-font-size, var(--lcms-h1-font-size, 2.5rem)); font-weight: var(--title-font-weight, var(--lcms-h1-font-weight, 700)); color: var(--title-color, var(--lcms-h1-color, inherit)); }
.lcms-numbered-box__title:is(h2) { font-size: var(--title-font-size, var(--lcms-h2-font-size, 2rem)); font-weight: var(--title-font-weight, var(--lcms-h2-font-weight, 700)); color: var(--title-color, var(--lcms-h2-color, inherit)); }
.lcms-numbered-box__title:is(h3) { font-size: var(--title-font-size, var(--lcms-h3-font-size, 1.75rem)); font-weight: var(--title-font-weight, var(--lcms-h3-font-weight, 700)); color: var(--title-color, var(--lcms-h3-color, inherit)); }
.lcms-numbered-box__title:is(h4) { font-size: var(--title-font-size, var(--lcms-h4-font-size, 1.5rem)); font-weight: var(--title-font-weight, var(--lcms-h4-font-weight, 700)); color: var(--title-color, var(--lcms-h4-color, inherit)); }
.lcms-numbered-box__title:is(h5) { font-size: var(--title-font-size, var(--lcms-h5-font-size, 1.25rem)); font-weight: var(--title-font-weight, var(--lcms-h5-font-weight, 700)); color: var(--title-color, var(--lcms-h5-color, inherit)); }
.lcms-numbered-box__title:is(h6) { font-size: var(--title-font-size, var(--lcms-h6-font-size, 1rem)); font-weight: var(--title-font-weight, var(--lcms-h6-font-weight, 700)); color: var(--title-color, var(--lcms-h6-color, inherit)); }

/* Title style: apply to headings inside rich text (legacy) */
.lcms-numbered-box__content :deep(h1) { font-size: var(--title-font-size, var(--lcms-h1-font-size, 2.5rem)); font-weight: var(--title-font-weight, var(--lcms-h1-font-weight, inherit)); color: var(--title-color, var(--lcms-h1-color, inherit)); transition: color var(--transition-duration, 200ms) ease; }
.lcms-numbered-box__content :deep(h2) { font-size: var(--title-font-size, var(--lcms-h2-font-size, 2rem)); font-weight: var(--title-font-weight, var(--lcms-h2-font-weight, inherit)); color: var(--title-color, var(--lcms-h2-color, inherit)); transition: color var(--transition-duration, 200ms) ease; }
.lcms-numbered-box__content :deep(h3) { font-size: var(--title-font-size, var(--lcms-h3-font-size, 1.75rem)); font-weight: var(--title-font-weight, var(--lcms-h3-font-weight, inherit)); color: var(--title-color, var(--lcms-h3-color, inherit)); transition: color var(--transition-duration, 200ms) ease; }
.lcms-numbered-box__content :deep(h4) { font-size: var(--title-font-size, var(--lcms-h4-font-size, 1.5rem)); font-weight: var(--title-font-weight, var(--lcms-h4-font-weight, inherit)); color: var(--title-color, var(--lcms-h4-color, inherit)); transition: color var(--transition-duration, 200ms) ease; }
.lcms-numbered-box__content :deep(h5) { font-size: var(--title-font-size, var(--lcms-h5-font-size, 1.25rem)); font-weight: var(--title-font-weight, var(--lcms-h5-font-weight, inherit)); color: var(--title-color, var(--lcms-h5-color, inherit)); transition: color var(--transition-duration, 200ms) ease; }
.lcms-numbered-box__content :deep(h6) { font-size: var(--title-font-size, var(--lcms-h6-font-size, 1rem)); font-weight: var(--title-font-weight, var(--lcms-h6-font-weight, inherit)); color: var(--title-color, var(--lcms-h6-color, inherit)); transition: color var(--transition-duration, 200ms) ease; }

/* Text style: apply to paragraphs */
.lcms-numbered-box__content :deep(p) {
  font-size: var(--text-font-size, inherit);
  font-weight: var(--text-font-weight, inherit);
  color: var(--text-color, inherit);
  transition: color var(--transition-duration, 200ms) ease;
}

/* Hover title color */
.lcms-numbered-box.has-hover.has-hover-title-color:hover .lcms-numbered-box__title,
.lcms-numbered-box.has-hover.has-hover-title-color:hover .lcms-numbered-box__content :deep(h1),
.lcms-numbered-box.has-hover.has-hover-title-color:hover .lcms-numbered-box__content :deep(h2),
.lcms-numbered-box.has-hover.has-hover-title-color:hover .lcms-numbered-box__content :deep(h3),
.lcms-numbered-box.has-hover.has-hover-title-color:hover .lcms-numbered-box__content :deep(h4),
.lcms-numbered-box.has-hover.has-hover-title-color:hover .lcms-numbered-box__content :deep(h5),
.lcms-numbered-box.has-hover.has-hover-title-color:hover .lcms-numbered-box__content :deep(h6) {
  color: var(--hover-title-color) !important;
}

/* Hover text color */
.lcms-numbered-box.has-hover.has-hover-text-color:hover .lcms-numbered-box__content :deep(p) {
  color: var(--hover-text-color) !important;
}
</style>
