<script setup lang="ts">
/**
 * Widget Renderer
 *
 * Dynamically renders a widget based on its type.
 * Applies all widget settings: padding, margin, background, border, etc.
 * Supports responsive settings for tablet/mobile breakpoints.
 * Supports hover effects via dynamic CSS generation.
 */

import { computed, ref } from 'vue'
import { getWidgetComponent, isWidgetSupported } from './widgets'
import LcmsMultiItemWrapper from './widgets/LcmsMultiItemWrapper.vue'
import { useResponsiveSettings } from '@/composables/useResponsiveSettings'
import { useScrollAnimation } from '@/composables/useScrollAnimation'
import { resolveColor } from '@/utils/resolveColor'
import { useLanguage } from '@/composables/useLanguage'
import type { Widget, WidgetSettings } from '@/api/types'

interface HoverSettings {
  backgroundColor?: string
  backgroundOpacity?: number
  borderColor?: string
  borderWidth?: number | null
  boxShadow?: string
  transitionDuration?: number
  hoverTranslateY?: number
  hoverScale?: number
  hoverRotate?: number
}

interface Props {
  widget: Widget
  language?: string
  itemIndex?: number
}

const props = defineProps<Props>()

const { getMergedSettings, isHidden, currentBreakpoint } = useResponsiveSettings()
const { extractValue, isMultilingual } = useLanguage(props.language)

/**
 * Recursively resolve multilingual values in widget data.
 * Converts { "pl": "text", "en": "text" } → "text" based on current language.
 * Only resolves shallow object values that look like language maps (2-3 char keys).
 */
function resolveMultilingual(data: any): any {
  if (data === null || data === undefined) return data
  if (typeof data !== 'object') return data
  if (Array.isArray(data)) return data.map(resolveMultilingual)

  const result: Record<string, any> = {}
  for (const [key, value] of Object.entries(data)) {
    if (value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value)) {
      // Check if this looks like a multilingual object (keys are 2-3 char language codes)
      const keys = Object.keys(value as object)
      const isLangMap = keys.length > 0 && keys.length <= 10 && keys.every(k => /^[a-z]{2,3}$/.test(k))
      if (isLangMap) {
        result[key] = extractValue(value as Record<string, string>)
      } else {
        // Recurse into nested objects
        result[key] = resolveMultilingual(value)
      }
    } else {
      result[key] = value
    }
  }
  return result
}

const widgetType = computed(() => props.widget.type || props.widget.widget_type || '')
const rawWidgetData = computed(() => props.widget.data || props.widget.widget || {})
const widgetData = computed(() => resolveMultilingual(rawWidgetData.value))
const settings = computed(() => getMergedSettings(props.widget.settings as WidgetSettings))

// Generate unique ID for widget (used for hover CSS selectors)
const widgetId = computed(() => {
  const id = props.widget.uuid || props.widget.id || Math.random().toString(36).substring(2, 11)
  return `lcms-widget-${id}`
})

// Generate hover CSS if hover settings are defined
const hoverCss = computed(() => {
  const hover = settings.value.hover as HoverSettings | undefined
  if (!hover) return ''

  const hasTransform = hover.hoverTranslateY || (hover.hoverScale !== undefined && hover.hoverScale !== 1) || hover.hoverRotate
  const hasHoverStyles = hover.backgroundColor || hover.borderColor || hover.boxShadow || hasTransform
  if (!hasHoverStyles) return ''

  const transitionDuration = hover.transitionDuration ?? 300

  let css = `#${widgetId.value} { transition: all ${transitionDuration}ms ease; }`
  css += `#${widgetId.value}:hover {`

  if (hover.backgroundColor) {
    const resolved = resolveColor(hover.backgroundColor)
    const opacity = hover.backgroundOpacity ?? 100
    if (opacity < 100 && resolved.startsWith('#')) {
      css += `background-color: ${hexToRgba(resolved, opacity / 100)};`
    } else {
      css += `background-color: ${resolved};`
    }
  }

  if (hover.borderColor) {
    css += `border-color: ${resolveColor(hover.borderColor)};`
  }

  if (hover.borderWidth !== undefined && hover.borderWidth !== null) {
    css += `border-width: ${hover.borderWidth}px;`
  }

  if (hover.boxShadow) {
    css += `box-shadow: ${hover.boxShadow};`
  }

  if (hasTransform) {
    const parts: string[] = []
    if (hover.hoverTranslateY) parts.push(`translateY(${hover.hoverTranslateY}px)`)
    if (hover.hoverScale !== undefined && hover.hoverScale !== 1) parts.push(`scale(${hover.hoverScale})`)
    if (hover.hoverRotate) parts.push(`rotate(${hover.hoverRotate}deg)`)
    css += `transform: ${parts.join(' ')};`
  }

  css += '}'

  return css
})

// Scroll animation
const animationConfig = computed(() => {
  const s = settings.value
  const type = s.animation_type || 'none'
  if (type === 'none') return null
  return {
    type,
    duration: s.animation_duration ?? 600,
    delay: s.animation_delay ?? 0,
    once: s.animation_once ?? true
  }
})

const widgetRef = ref<HTMLElement | null>(null)
const { isVisible, hasAnimated } = useScrollAnimation(widgetRef, animationConfig)

const component = computed(() => {
  if (!widgetType.value) return null
  return getWidgetComponent(widgetType.value)
})

const isSupported = computed(() => isWidgetSupported(widgetType.value))

// Multi-item detection from API response
const isMultiItem = computed(() => {
  const w = props.widget as Record<string, unknown>
  return w.multi_item === true && Array.isArray(w.items)
})

const multiItemColumns = computed(() => {
  const w = props.widget as Record<string, unknown>
  return (w.multi_columns as number) || 1
})

const multiItemGap = computed(() => {
  const w = props.widget as Record<string, unknown>
  const g = parseInt(String(w.multi_gap))
  return isNaN(g) ? 16 : g
})

const multiItemLayout = computed(() => {
  const w = props.widget as Record<string, unknown>
  return (w.multi_layout as string) || 'grid'
})

const multiItemItems = computed(() => {
  const w = props.widget as Record<string, unknown>
  return (w.items as Array<Record<string, unknown>>) || []
})

// Extract container_* fields from multi-item widget
const multiItemContainerFields = computed(() => {
  if (!isMultiItem.value) return {}
  const w = props.widget as Record<string, unknown>

  const fields: Record<string, unknown> = {}
  for (const key of Object.keys(w)) {
    if (key.startsWith('container_')) {
      fields[key] = w[key]
    }
  }
  return fields
})

// Widgets that apply background on their own inner element (not the container)
// because their visual shape differs from the rectangular container (e.g., pill has border-radius: 9999px)
const SELF_BG_WIDGETS = new Set(['pill', 'button'])

// Calculate widget styles from settings
const widgetStyle = computed(() => {
  const s = settings.value
  const style: Record<string, string> = {}
  const skipBg = SELF_BG_WIDGETS.has(widgetType.value)

  // Background color with opacity
  if (s.background_color && !skipBg) {
    const resolved = resolveColor(s.background_color)
    const opacity = s.background_opacity ?? 100
    if (opacity < 100 && resolved.startsWith('#')) {
      style.backgroundColor = hexToRgba(resolved, opacity / 100)
    } else if (opacity < 100 && resolved.startsWith('var(')) {
      style.backgroundColor = `color-mix(in srgb, ${resolved} ${opacity}%, transparent)`
    } else {
      style.backgroundColor = resolved
    }
  }

  // Background image + gradient (gradient overlays image)
  {
    let gradientValue = ''
    if (s.gradient && s.gradient.colorStart && s.gradient.colorEnd) {
      const type = s.gradient.type || 'linear'
      const angle = s.gradient.angle ?? 180
      const start = resolveColor(s.gradient.colorStart)
      const end = resolveColor(s.gradient.colorEnd)
      gradientValue = type === 'linear'
        ? `linear-gradient(${angle}deg, ${start}, ${end})`
        : `radial-gradient(circle, ${start}, ${end})`
    }
    else if (s.use_gradient && s.gradient_color_start && s.gradient_color_end) {
      const type = s.gradient_type || 'linear'
      const angle = s.gradient_angle ?? 180
      const start = resolveColor(s.gradient_color_start)
      const end = resolveColor(s.gradient_color_end)
      gradientValue = type === 'linear'
        ? `linear-gradient(${angle}deg, ${start}, ${end})`
        : `radial-gradient(circle, ${start}, ${end})`
    }

    if (s.background_image) {
      const rawUrl = s.background_image_optimized || s.background_image
      let encodedUrl
      try { encodedUrl = encodeURI(decodeURI(rawUrl)) } catch { encodedUrl = rawUrl }
      const imgSize = s.background_size || 'cover'
      const imgPos = s.background_position || 'center center'
      const imgOpacity = s.background_image_opacity ?? 100
      if (imgOpacity < 100) {
        // Use CSS custom properties for pseudo-element opacity approach
        style['--bg-image'] = `url("${encodedUrl}")`
        style['--bg-image-opacity'] = String(imgOpacity / 100)
        style['--bg-size'] = imgSize
        style['--bg-position'] = imgPos
      } else if (gradientValue) {
        style.backgroundImage = `${gradientValue}, url("${encodedUrl}")`
        style.backgroundSize = `auto, ${imgSize}`
        style.backgroundPosition = `0 0, ${imgPos}`
      } else {
        style.backgroundImage = `url("${encodedUrl}")`
        style.backgroundSize = imgSize
        style.backgroundPosition = imgPos
      }
      style.backgroundRepeat = 'no-repeat'
    } else if (gradientValue) {
      style.backgroundImage = gradientValue
    }
  }

  // Padding (also expose as CSS variables so child widgets can expand into it for hover)
  if (s.padding_top) { style.paddingTop = `${s.padding_top}px`; style['--wr-pt'] = `${s.padding_top}px` }
  if (s.padding_right) { style.paddingRight = `${s.padding_right}px`; style['--wr-pr'] = `${s.padding_right}px` }
  if (s.padding_bottom) { style.paddingBottom = `${s.padding_bottom}px`; style['--wr-pb'] = `${s.padding_bottom}px` }
  if (s.padding_left) { style.paddingLeft = `${s.padding_left}px`; style['--wr-pl'] = `${s.padding_left}px` }

  // Margin
  if (s.margin_top) style.marginTop = `${s.margin_top}px`
  if (s.margin_right) style.marginRight = `${s.margin_right}px`
  if (s.margin_bottom) style.marginBottom = `${s.margin_bottom}px`
  if (s.margin_left) style.marginLeft = `${s.margin_left}px`

  // Border
  if (s.border_radius) style.borderRadius = `${s.border_radius}px`
  if (s.border_width) {
    style.borderWidth = `${s.border_width}px`
    style.borderStyle = s.border_style || 'solid'
    style.borderColor = resolveColor(s.border_color) || '#000000'
  }

  // Shadow
  if (s.box_shadow) style.boxShadow = s.box_shadow

  // Width + horizontal alignment
  // auto_width = widget shrinks to fit content, alignment positions it within parent
  const hAlign = s.horizontal_align || 'stretch'
  // Text alignment follows horizontal alignment
  if (hAlign === 'center') style.textAlign = 'center'
  else if (hAlign === 'right') style.textAlign = 'right'
  else if (hAlign === 'left') style.textAlign = 'left'
  if (s.auto_width || (hAlign !== 'stretch' && !s.width)) {
    style.width = 'fit-content'
    // Use auto margins for alignment since fit-content + justify-content is conflicting
    if (hAlign === 'center') {
      style.marginLeft = style.marginLeft || 'auto'
      style.marginRight = style.marginRight || 'auto'
    } else if (hAlign === 'right') {
      style.marginLeft = style.marginLeft || 'auto'
    }
    // left = default block flow, no extra margin needed
  } else if (s.width && s.width > 0) {
    style.width = `${s.width}px`
    if (hAlign === 'center') {
      style.marginLeft = style.marginLeft || 'auto'
      style.marginRight = style.marginRight || 'auto'
    } else if (hAlign === 'right') {
      style.marginLeft = style.marginLeft || 'auto'
    }
  }
  if (s.max_width && s.max_width > 0) {
    style.maxWidth = `${s.max_width}px`
  }

  // Height
  if (s.full_height || s.height_mode === 'full') {
    style.height = '100%'
  } else if (s.height && s.height > 0) {
    style.height = `${s.height}px`
  }

  if (s.min_height && s.min_height > 0) {
    style.minHeight = `${s.min_height}px`
  }

  // Vertical alignment (flex column)
  if (s.vertical_align && s.vertical_align !== 'top') {
    style.display = 'flex'
    style.flexDirection = 'column'
    style.justifyContent = mapVerticalAlign(s.vertical_align)
  }

  // Transition
  const transitionDuration = s.transition_duration ?? 200
  if (transitionDuration > 0) {
    style.transition = `all ${transitionDuration}ms ease`
  }

  // Hover CSS variables (consumed by :hover rules)
  const hoverBg = s['background_color:hover']
  const hoverBorderColor = s['border_color:hover']
  const hoverBorderWidth = s['border_width:hover']
  const hoverBoxShadow = s['box_shadow:hover']
  const hoverLift = s['lift:hover']
  const hoverScale = s['scale:hover']
  const hoverShadowPreset = s['shadow_preset:hover']

  if (hoverBg) style['--wcsh-bg'] = resolveColor(hoverBg)
  if (hoverBorderColor) style['--wcsh-border-color'] = resolveColor(hoverBorderColor)
  if (hoverBorderWidth) style['--wcsh-border-width'] = `${hoverBorderWidth}px`
  if (hoverBoxShadow) style['--wcsh-box-shadow'] = hoverBoxShadow
  if (hoverLift) style['--wcsh-lift'] = `-${hoverLift}px`
  if (hoverScale && hoverScale !== 1) style['--wcsh-scale'] = String(hoverScale)

  const shadowMap: Record<string, string> = {
    sm: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
    md: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
    lg: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)'
  }
  if (hoverShadowPreset && hoverShadowPreset !== 'none' && shadowMap[hoverShadowPreset]) {
    style['--wcsh-shadow-preset'] = shadowMap[hoverShadowPreset]
  }

  return style
})

// Check if widget is hidden for current breakpoint
const isWidgetHidden = computed(() => isHidden(props.widget.settings))

// Check if widget has any container-level hover
const hasWidgetHover = computed(() => {
  const s = settings.value
  return !!(
    s['background_color:hover'] ||
    s['border_color:hover'] ||
    s['border_width:hover'] ||
    s['box_shadow:hover'] ||
    s['lift:hover'] ||
    (s['scale:hover'] && s['scale:hover'] !== 1) ||
    (s['shadow_preset:hover'] && s['shadow_preset:hover'] !== 'none')
  )
})

// CSS class for widget
const widgetClass = computed(() => {
  const classes = ['lcms-widget', `lcms-widget--${widgetType.value}`]

  const s = settings.value
  if (s.css_class) {
    classes.push(s.css_class)
  }
  if (isWidgetHidden.value) {
    classes.push('lcms-hidden')
  }
  if (hasWidgetHover.value) {
    classes.push('wcsh-hover')
  }

  // Background image with opacity
  const bgImg = settings.value.background_image
  const bgImgOpacity = settings.value.background_image_opacity ?? 100
  if (bgImg && bgImgOpacity < 100) {
    classes.push('has-bg-image-opacity')
  }

  // Add breakpoint class for CSS targeting
  classes.push(`lcms-widget--${currentBreakpoint.value}`)

  // Scroll animation classes
  if (animationConfig.value) {
    classes.push(`lcms-anim-${animationConfig.value.type}`)
    if (isVisible.value || hasAnimated.value) {
      classes.push('lcms-anim--visible')
    }
  }

  return classes.join(' ')
})

// Scroll animation inline style (for custom duration/delay)
const animationStyle = computed(() => {
  if (!animationConfig.value) return {}
  return {
    '--lcms-anim-duration': `${animationConfig.value.duration}ms`,
    '--lcms-anim-delay': `${animationConfig.value.delay}ms`
  }
})

// Link settings
const linkSettings = computed(() => {
  const link = settings.value.link as { enabled?: boolean; url?: string; target_blank?: boolean } | undefined
  if (!link?.enabled || !link?.url) return null
  return {
    url: link.url,
    targetBlank: link.target_blank ?? false
  }
})

// Helper: hex to rgba
function hexToRgba(hex: string, alpha: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return hex
  const r = parseInt(result[1], 16)
  const g = parseInt(result[2], 16)
  const b = parseInt(result[3], 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// Helper: resolve color with opacity suffix (#hex:opacity → rgba)
function resolveColorOpacity(color: string): string {
  if (!color) return color
  if (color.startsWith('#') && color.includes(':')) {
    const [hex, opacityStr] = color.split(':')
    const opacity = parseInt(opacityStr) || 100
    if (opacity < 100) {
      return hexToRgba(hex, opacity / 100)
    }
    return hex
  }
  return color
}

// Map vertical align values
function mapVerticalAlign(value: string): string {
  const map: Record<string, string> = {
    'top': 'flex-start',
    'center': 'center',
    'bottom': 'flex-end',
    'flex-start': 'flex-start',
    'flex-end': 'flex-end'
  }
  return map[value] || value
}

function mapHorizontalAlign(value: string): string {
  const map: Record<string, string> = {
    'left': 'flex-start',
    'center': 'center',
    'right': 'flex-end',
    'flex-start': 'flex-start',
    'flex-end': 'flex-end'
  }
  return map[value] || value
}
</script>

<template>
  <!-- Dynamic hover styles -->
  <component
    :is="'style'"
    v-if="hoverCss"
  >{{ hoverCss }}</component>

  <!-- Wrap in link if link settings enabled -->
  <component
    :is="linkSettings ? 'a' : 'div'"
    ref="widgetRef"
    :id="settings.id || widgetId"
    :href="linkSettings?.url"
    :target="linkSettings?.targetBlank ? '_blank' : undefined"
    :rel="linkSettings?.targetBlank ? 'noopener noreferrer' : undefined"
    :class="[widgetClass, { 'lcms-widget-link': linkSettings }]"
    :data-widget-type="widgetType"
    :data-widget-id="widget.id"
    :style="{ ...widgetStyle, ...animationStyle }"
  >
    <!-- Multi-item widget rendering -->
    <LcmsMultiItemWrapper
      v-if="isMultiItem && component"
      :items="multiItemItems"
      :columns="multiItemColumns"
      :gap="multiItemGap"
      :layout="multiItemLayout"
      :inner-component="component"
      :language="language"
      :settings="settings"
      :container-fields="multiItemContainerFields"
    />

    <component
      :is="component"
      v-else-if="component"
      :data="widgetData"
      :language="language"
      :settings="settings"
      :item-index="itemIndex"
    />

    <div
      v-else-if="!isSupported"
      class="lcms-widget__unsupported"
    >
      <span>Unsupported widget: {{ widgetType }}</span>
    </div>
  </component>
</template>

<style>
/* Widget container hover — global rules consuming --wcsh-* CSS variables */
.wcsh-hover:hover {
  background-color: var(--wcsh-bg) !important;
  border-color: var(--wcsh-border-color) !important;
  border-width: var(--wcsh-border-width) !important;
  box-shadow: var(--wcsh-shadow-preset, var(--wcsh-box-shadow)) !important;
  transform: translateY(var(--wcsh-lift, 0)) scale(var(--wcsh-scale, 1));
}

/* Background image with opacity — pseudo-element approach */
.has-bg-image-opacity {
  position: relative;
}
.has-bg-image-opacity::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: var(--bg-image);
  background-size: var(--bg-size, cover);
  background-position: var(--bg-position, center center);
  background-repeat: no-repeat;
  opacity: var(--bg-image-opacity, 1);
  pointer-events: none;
  border-radius: inherit;
  z-index: 0;
}
.has-bg-image-opacity > * {
  position: relative;
  z-index: 1;
}
</style>
