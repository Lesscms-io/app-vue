<script setup lang="ts">
/**
 * Widget Renderer
 *
 * Dynamically renders a widget based on its type.
 * Applies all widget settings: padding, margin, background, border, etc.
 * Supports responsive settings for tablet/mobile breakpoints.
 */

import { computed } from 'vue'
import { getWidgetComponent, isWidgetSupported } from './widgets'
import { useResponsiveSettings } from '@/composables/useResponsiveSettings'
import type { Widget, WidgetSettings } from '@/api/types'

interface Props {
  widget: Widget
  language?: string
}

const props = defineProps<Props>()

const { getMergedSettings, isHidden, currentBreakpoint } = useResponsiveSettings()

const widgetType = computed(() => props.widget.type || props.widget.widget_type || '')
const widgetData = computed(() => props.widget.data || props.widget.config || {})
const settings = computed(() => getMergedSettings(props.widget.settings as WidgetSettings))

const component = computed(() => {
  if (!widgetType.value) return null
  return getWidgetComponent(widgetType.value)
})

const isSupported = computed(() => isWidgetSupported(widgetType.value))

// Calculate widget styles from settings
const widgetStyle = computed(() => {
  const s = settings.value
  const style: Record<string, string> = {}

  // Background color with opacity
  if (s.backgroundColor) {
    const opacity = s.backgroundOpacity ?? 100
    if (opacity < 100) {
      style.backgroundColor = hexToRgba(s.backgroundColor, opacity / 100)
    } else {
      style.backgroundColor = s.backgroundColor
    }
  }

  // Background image
  if (s.backgroundImage) {
    // Encode URL to handle spaces and special characters
    const encodedUrl = encodeURI(s.backgroundImage)
    style.backgroundImage = `url("${encodedUrl}")`
    style.backgroundSize = s.backgroundSize || 'cover'
    style.backgroundPosition = s.backgroundPosition || 'center center'
    style.backgroundRepeat = 'no-repeat'
  }

  // Gradient (API returns { gradient: { type, colorStart, colorEnd, angle } })
  if (s.gradient && s.gradient.colorStart && s.gradient.colorEnd) {
    const type = s.gradient.type || 'linear'
    const angle = s.gradient.angle ?? 180
    if (type === 'linear') {
      style.background = `linear-gradient(${angle}deg, ${s.gradient.colorStart}, ${s.gradient.colorEnd})`
    } else {
      style.background = `radial-gradient(circle, ${s.gradient.colorStart}, ${s.gradient.colorEnd})`
    }
  }
  // Also support legacy format (useGradient)
  else if (s.useGradient && s.gradientColorStart && s.gradientColorEnd) {
    const type = s.gradientType || 'linear'
    const angle = s.gradientAngle ?? 180
    if (type === 'linear') {
      style.background = `linear-gradient(${angle}deg, ${s.gradientColorStart}, ${s.gradientColorEnd})`
    } else {
      style.background = `radial-gradient(circle, ${s.gradientColorStart}, ${s.gradientColorEnd})`
    }
  }

  // Padding
  if (s.paddingTop) style.paddingTop = `${s.paddingTop}px`
  if (s.paddingRight) style.paddingRight = `${s.paddingRight}px`
  if (s.paddingBottom) style.paddingBottom = `${s.paddingBottom}px`
  if (s.paddingLeft) style.paddingLeft = `${s.paddingLeft}px`

  // Margin
  if (s.marginTop) style.marginTop = `${s.marginTop}px`
  if (s.marginRight) style.marginRight = `${s.marginRight}px`
  if (s.marginBottom) style.marginBottom = `${s.marginBottom}px`
  if (s.marginLeft) style.marginLeft = `${s.marginLeft}px`

  // Border
  if (s.borderRadius) style.borderRadius = `${s.borderRadius}px`
  if (s.borderWidth) {
    style.borderWidth = `${s.borderWidth}px`
    style.borderStyle = s.borderStyle || 'solid'
    style.borderColor = s.borderColor || '#000000'
  }

  // Shadow
  if (s.boxShadow) style.boxShadow = s.boxShadow

  // Height
  if (s.fullHeight || s.heightMode === 'full') {
    style.height = '100%'
  } else if (s.height && s.height > 0) {
    style.height = `${s.height}px`
  }

  if (s.minHeight && s.minHeight > 0) {
    style.minHeight = `${s.minHeight}px`
  }

  // Alignment
  if (s.horizontalAlign && s.horizontalAlign !== 'stretch') {
    style.display = 'flex'
    style.justifyContent = s.horizontalAlign
  }

  if (s.verticalAlign) {
    if (!style.display) style.display = 'flex'
    style.alignItems = mapVerticalAlign(s.verticalAlign)
  }

  return style
})

// Check if widget is hidden for current breakpoint
const isWidgetHidden = computed(() => isHidden(props.widget.settings))

// CSS class for widget
const widgetClass = computed(() => {
  const classes = ['lcms-widget', `lcms-widget--${widgetType.value}`]

  const s = settings.value
  if (s.cssClass) {
    classes.push(s.cssClass)
  }
  if (isWidgetHidden.value) {
    classes.push('lcms-hidden')
  }

  // Add breakpoint class for CSS targeting
  classes.push(`lcms-widget--${currentBreakpoint.value}`)

  return classes.join(' ')
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
</script>

<template>
  <!-- Wrap in link if link settings enabled -->
  <component
    :is="linkSettings ? 'a' : 'div'"
    :href="linkSettings?.url"
    :target="linkSettings?.targetBlank ? '_blank' : undefined"
    :rel="linkSettings?.targetBlank ? 'noopener noreferrer' : undefined"
    :class="[widgetClass, { 'lcms-widget-link': linkSettings }]"
    :data-widget-type="widgetType"
    :data-widget-id="widget.id"
    :style="widgetStyle"
  >
    <component
      :is="component"
      v-if="component"
      :data="widgetData"
      :language="language"
      :settings="settings"
    />

    <div
      v-else-if="!isSupported"
      class="lcms-widget__unsupported"
    >
      <span>Unsupported widget: {{ widgetType }}</span>
    </div>
  </component>
</template>
