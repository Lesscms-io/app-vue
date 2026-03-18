<script setup lang="ts">
/**
 * CTA Box Widget
 *
 * Renders a call-to-action box with title, subtitle and button.
 * Element-group structure: heading + subtitle + button + config
 */

import { computed, inject } from 'vue'
import { useLanguage } from '@/composables/useLanguage'
import { resolveColor } from '@/utils/resolveColor'

defineOptions({
  inheritAttrs: false
})

interface Props {
  data: Record<string, any>
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const { extractValue } = useLanguage(props.language)

// Border radius mapping (matches FE useButtonStyles)
const RADIUS_MAP: Record<string, string> = { none: '0', sm: '4px', md: '8px', lg: '12px', pill: '50px' }

const config = computed(() => props.data.widget || props.data || {})

// Element groups
const headingGroup = computed(() => config.value.heading || {})
const subtitleGroup = computed(() => config.value.subtitle || {})
const buttonGroup = computed(() => config.value.button || {})
const configGroup = computed(() => config.value.config || {})

// Content values
const title = computed(() => extractValue(headingGroup.value.content) || '')
const subtitle = computed(() => extractValue(subtitleGroup.value.content) || '')
const buttonText = computed(() => extractValue(buttonGroup.value.content) || '')
const alignment = computed(() => configGroup.value.alignment || 'center')

// Heading color
const headingColor = computed(() => resolveColor(headingGroup.value.color) || null)
const headingHoverColor = computed(() => resolveColor(headingGroup.value['color:hover']) || null)

// Button settings
const buttonStyleName = computed(() => buttonGroup.value.style || 'white')
const buttonSize = computed(() => buttonGroup.value.size || 'md')
const buttonBorderRadius = computed(() => buttonGroup.value.border_radius || 'md')
const buttonPaddingRaw = computed(() => buttonGroup.value.padding || '')
const buttonIcon = computed(() => buttonGroup.value.icon || '')
const buttonIconPosition = computed(() => buttonGroup.value.icon_position || 'left')
const buttonColor = computed(() => buttonGroup.value.color || null)

// Show button if there's text
const showButton = computed(() => !!buttonText.value)

// Determine contrast text color for solid backgrounds
function getContrastColor(bgColor: string): string {
  if (bgColor.startsWith('var(') || bgColor.startsWith('color-mix(')) return '#212529'
  const hex = bgColor.replace('#', '')
  if (hex.length !== 6) return '#212529'
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? '#212529' : '#ffffff'
}

// Button inline styles (matches FE useButtonStyles logic)
const buttonInlineStyle = computed(() => {
  const styles: Record<string, string> = {}
  const style = buttonStyleName.value
  const isOutline = style.startsWith('outline-')
  const isSpecial = style === 'link' || style === 'gradient'
  const baseCode = isOutline ? style.replace('outline-', '') : style

  // Border radius from map
  styles.borderRadius = RADIUS_MAP[buttonBorderRadius.value] || RADIUS_MAP.md

  // Padding
  if (buttonPaddingRaw.value) {
    styles.padding = `${buttonPaddingRaw.value}px`
  }

  if (isSpecial) return styles

  // Resolve button color: explicit button_color or derive from style name
  const bg = buttonColor.value
    ? (resolveColor(buttonColor.value) || '#6c757d')
    : (resolveColor(`var:${baseCode}`) || '#6c757d')

  if (isOutline) {
    styles.backgroundColor = 'transparent'
    styles.border = `2px solid ${bg}`
    styles.color = bg
  } else {
    styles.backgroundColor = bg
    styles.border = `2px solid ${bg}`
    styles.color = getContrastColor(bg)
  }

  return styles
})

// Button size class
const buttonSizeClass = computed(() => {
  const map: Record<string, string> = { sm: 'lcms-cta-box__button--sm', lg: 'lcms-cta-box__button--lg' }
  return map[buttonSize.value] || ''
})

const hasHoverHeadingColor = computed(() => !!headingHoverColor.value)

const boxStyle = computed(() => {
  const style: Record<string, string> = {}

  if (headingColor.value) style.color = headingColor.value

  // Hover heading color
  if (headingHoverColor.value) style['--hover-color'] = headingHoverColor.value

  return style
})
</script>

<template>
  <div
    class="lcms-cta-box"
    :class="[`lcms-cta-box--${alignment}`, { 'has-hover': hasHoverHeadingColor, 'has-hover-text-color': hasHoverHeadingColor }]"
    :style="boxStyle"
  >
    <h3 v-if="title" class="lcms-cta-box__title">{{ title }}</h3>
    <p v-if="subtitle" class="lcms-cta-box__subtitle">{{ subtitle }}</p>
    <span
      v-if="showButton"
      class="lcms-cta-box__button"
      :class="buttonSizeClass"
      :style="buttonInlineStyle"
    >
      <i v-if="buttonIcon && buttonIconPosition === 'left'" :class="buttonIcon" style="margin-right: 6px;" />
      {{ buttonText }}
      <i v-if="buttonIcon && buttonIconPosition === 'right'" :class="buttonIcon" style="margin-left: 6px;" />
    </span>
  </div>
</template>

<style scoped>
.lcms-cta-box {
  transition: color 200ms ease;
}

.lcms-cta-box.has-hover.has-hover-text-color:hover .lcms-cta-box__title,
.lcms-cta-box.has-hover.has-hover-text-color:hover .lcms-cta-box__subtitle {
  color: var(--hover-color) !important;
}

.lcms-cta-box--center {
  text-align: center;
}

.lcms-cta-box--left {
  text-align: left;
}

.lcms-cta-box--right {
  text-align: right;
}

.lcms-cta-box__title {
  margin: 0 0 8px;
  transition: color 200ms ease;
}

.lcms-cta-box__subtitle {
  margin: 0 0 16px;
  opacity: 0.9;
  transition: color 200ms ease;
}

.lcms-cta-box__button {
  display: inline-block;
  padding: 10px 24px;
  background-color: #fff;
  color: #212529;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  transition: opacity 0.2s;
  cursor: pointer;
}

.lcms-cta-box__button:hover {
  opacity: 0.85;
}

.lcms-cta-box__button--sm {
  padding: 6px 16px;
  font-size: 0.875rem;
}

.lcms-cta-box__button--lg {
  padding: 14px 32px;
  font-size: 1.125rem;
}
</style>
