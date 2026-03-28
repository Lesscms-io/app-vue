<template>
  <div class="lcms-icon-box" :class="[positionClass, hoverClasses]" :style="cardStyle">
    <div class="lcms-icon-box__icon" :style="iconStyles">
      <span v-if="isSvgIcon" class="lcms-icon-box__svg" v-html="svgContent"></span>
      <i v-else :class="iconClass"></i>
    </div>
    <div class="lcms-icon-box__content" :style="contentStyles">
      <DynamicHtml v-if="contentText" :tag="contentTag" :html="stripBlockWrappers(contentText)" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DynamicHtml from '../DynamicHtml.vue'
import { useLanguage } from '@/composables/useLanguage'

const props = defineProps<{
  data: {
    widget_type: string
    config?: Record<string, any>
    settings?: Record<string, unknown>
    widget?: Record<string, any>
    icon?: Record<string, any>
    text?: Record<string, any>
    style?: Record<string, any>
  }
  language?: string
}>()

const { extractValue } = useLanguage(props.language)

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

const config = computed(() => props.data.widget || props.data || {})

// Element groups
const iconGroup = computed(() => config.value.icon || {})
const contentGroup = computed(() => config.value.text || {})

// Icon values
const iconValue = computed(() => {
  const val = iconGroup.value.icon
  if (!val || typeof val === 'object') return ''
  return val
})
const isSvgIcon = computed(() => (iconValue.value || '').startsWith('svg:'))
const svgContent = computed(() => isSvgIcon.value ? iconValue.value.slice(4) : '')
const iconClass = computed(() => isSvgIcon.value ? '' : (iconValue.value || 'fas fa-star'))

// Strip block-level wrappers (p, div) from HTML to avoid invalid nesting in SSR
function stripBlockWrappers(html: string): string {
  if (!html) return ''
  return html.replace(/^<(p|div)[^>]*>(.*)<\/\1>$/s, '$2').trim()
}

// Content values
const contentText = computed(() => {
  const text = contentGroup.value.html || contentGroup.value.content
  if (!text) return ''
  return extractValue(text) || ''
})
const contentTag = computed(() => contentGroup.value.tag || 'div')

// Icon position & vertical align
const iconPosition = computed(() => iconGroup.value.position || 'top')
const iconVerticalAlign = computed(() => iconGroup.value.vertical_align || 'top')

const positionClass = computed(() => {
  const classes = [`lcms-icon-box--${iconPosition.value}`]
  classes.push(`lcms-icon-box--align-${iconVerticalAlign.value}`)
  return classes
})

// Hover states
const hasHoverIconColor = computed(() => !!iconGroup.value['color:hover'])
const hasHoverIconBg = computed(() => !!iconGroup.value['background:hover'])
const hasHoverContentColor = computed(() => !!contentGroup.value['color:hover'])

const hasHover = computed(() => !!(hasHoverIconColor.value || hasHoverIconBg.value || hasHoverContentColor.value))

const hoverClasses = computed(() => ({
  'has-hover': hasHover.value,
  'has-hover-icon-color': hasHoverIconColor.value,
  'has-hover-icon-bg': hasHoverIconBg.value,
  'has-hover-content-color': hasHoverContentColor.value
}))

// Card style
const cardStyle = computed(() => {
  const styles: Record<string, string> = {}

  styles['--transition-duration'] = '200ms'

  // Hover icon CSS variables
  const hoverIconColor = resolveColor(iconGroup.value['color:hover'])
  if (hoverIconColor) styles['--hover-icon-color'] = hoverIconColor
  const hoverIconBg = resolveColor(iconGroup.value['background:hover'])
  if (hoverIconBg) styles['--hover-icon-bg'] = hoverIconBg

  // Hover content color
  const hoverContentColor = resolveColor(contentGroup.value['color:hover'])
  if (hoverContentColor) styles['--hover-content-color'] = hoverContentColor

  return styles
})

// Icon styles
const iconStyles = computed(() => {
  const styles: Record<string, string> = {}

  const size = iconGroup.value.size
  const padding = iconGroup.value.padding || 0
  const borderRadius = iconGroup.value.border_radius

  if (size !== undefined && size !== null) {
    styles.fontSize = `${Number(size)}px`
    styles.width = `${Number(size) + Number(padding) * 2}px`
    styles.height = `${Number(size) + Number(padding) * 2}px`
  }

  const color = resolveColor(iconGroup.value.color)
  if (color) styles.color = color

  const bg = resolveColor(iconGroup.value.background)
  if (bg) styles.backgroundColor = bg

  if (padding) styles.padding = `${padding}px`

  const br = parseInt(String(borderRadius))
  if (!isNaN(br) && br > 0) styles.borderRadius = `${br}px`

  return styles
})

// Content styles
const contentStyles = computed(() => {
  const styles: Record<string, string> = {}
  const color = resolveColor(contentGroup.value.color)
  if (color) styles.color = color
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

.lcms-icon-box--top {
  flex-direction: column;
}

.lcms-icon-box--bottom {
  flex-direction: column-reverse;
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
  text-align: center;
}

.lcms-icon-box--align-bottom {
  align-items: flex-end;
  text-align: right;
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
  transition: color var(--transition-duration, 200ms) ease;
}

.lcms-icon-box__content :deep(p) {
  margin: 0;
}

.lcms-icon-box.has-hover.has-hover-content-color:hover .lcms-icon-box__content {
  color: var(--hover-content-color) !important;
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
