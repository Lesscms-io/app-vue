<script setup lang="ts">
/**
 * CTA Box Widget
 *
 * Renders a call-to-action box with title, subtitle and button.
 */

import { computed, inject } from 'vue'
import { useLanguage } from '@/composables/useLanguage'
import { resolveColor } from '@/utils/resolveColor'
import type { CtaBoxWidgetData } from '@/types/widgets'

defineOptions({
  inheritAttrs: false
})

interface Props {
  data: CtaBoxWidgetData
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const { extractValue } = useLanguage(props.language)

const resolvePageUrl = inject<(code: string | null, uuid: string | null) => string>('lesscms-resolve-page-url', () => '#')
const resolveCollectionUrl = inject<(collectionCode: string, entryId: string) => string>('lesscms-resolve-collection-url', () => '#')

// Border radius mapping (matches FE useButtonStyles)
const RADIUS_MAP: Record<string, string> = { none: '0', sm: '4px', md: '8px', lg: '12px', pill: '50px' }

const title = computed(() => {
  const v = props.data.title
  return typeof v === 'object' ? extractValue(v) : (v || '')
})
const subtitle = computed(() => {
  const v = props.data.subtitle
  if (!v) return ''
  return typeof v === 'object' ? extractValue(v) : v
})
const buttonText = computed(() => {
  const v = props.data.button_text
  if (!v) return ''
  return typeof v === 'object' ? extractValue(v) : v
})
const buttonUrl = computed(() => props.data.button_url || '')
const backgroundColor = computed(() => resolveColor(props.data.background_color) || undefined)
const textColor = computed(() => {
  const val = props.data.text_color || 'light'
  if (val === 'light') return '#ffffff'
  if (val === 'dark') return '#212529'
  return resolveColor(val) || val
})
const alignment = computed(() => props.data.alignment || 'center')
const paddingY = computed(() => props.data.padding_y ?? 48)
const paddingX = computed(() => props.data.padding_x ?? 32)
const borderRadius = computed(() => props.data.border_radius ?? 12)
const titleFontSize = computed(() => {
  const v = props.data.title_font_size
  if (v == null) return '28px'
  if (typeof v === 'number') return `${v}px`
  return String(v).match(/[a-z]/) ? v : `${v}px`
})
const subtitleFontSize = computed(() => {
  const v = props.data.subtitle_font_size
  if (v == null) return '16px'
  if (typeof v === 'number') return `${v}px`
  return String(v).match(/[a-z]/) ? v : `${v}px`
})

// Button settings
const buttonLinkType = computed(() => props.data.button_link_type || 'custom')
const buttonPageId = computed(() => props.data.button_page_id || '')
const buttonCollectionCode = computed(() => props.data.button_collection_code || '')
const buttonEntryId = computed(() => props.data.button_entry_id || '')
const buttonRouteUuid = computed(() => props.data.button_route_uuid || '')
const buttonTargetBlank = computed(() => props.data.button_target_blank || false)
const buttonStyleName = computed(() => props.data.button_style || 'primary')
const buttonSize = computed(() => props.data.button_size || 'md')
const buttonBorderRadius = computed(() => props.data.button_border_radius || 'md')
const buttonPaddingRaw = computed(() => props.data.button_padding || '')
const buttonIcon = computed(() => props.data.button_icon || '')
const buttonIconPosition = computed(() => props.data.button_icon_position || 'left')
const buttonColor = computed(() => props.data.button_color || null)

const resolvedButtonUrl = computed(() => {
  const lt = buttonLinkType.value
  const serverUrl = buttonUrl.value

  if (lt === 'page') {
    if (serverUrl && serverUrl !== '#') return serverUrl
    if (buttonPageId.value) {
      const clientResolved = resolvePageUrl(null, buttonPageId.value)
      if (clientResolved && clientResolved !== '#') return clientResolved
    }
    return serverUrl
  }
  if (lt === 'route' && buttonRouteUuid.value) return resolvePageUrl(null, buttonRouteUuid.value)
  if (lt === 'entry') {
    if (serverUrl && serverUrl !== '#') return serverUrl
    if (buttonCollectionCode.value && buttonEntryId.value) {
      const clientResolved = resolveCollectionUrl(buttonCollectionCode.value, buttonEntryId.value)
      if (clientResolved && clientResolved !== '#') return clientResolved
    }
    return serverUrl
  }
  return serverUrl
})

// Show button if there's text (even without URL — e.g. phone number CTA)
const showButton = computed(() => !!buttonText.value)

// Button href — use resolved URL if available, otherwise null (renders as non-link)
const buttonHref = computed(() => resolvedButtonUrl.value || null)

// Determine contrast text color for solid backgrounds
function getContrastColor(bgColor: string): string {
  // For var() references, default to white text
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

const boxStyle = computed(() => {
  const style: Record<string, string> = {
    padding: `${paddingY.value}px ${paddingX.value}px`,
    borderRadius: `${borderRadius.value}px`
  }
  if (backgroundColor.value) style.backgroundColor = backgroundColor.value
  if (textColor.value) style.color = textColor.value
  const hoverBg = resolveColor(props.data.hover_background_color)
  if (hoverBg) style['--hover-bg'] = hoverBg
  const hoverTxt = resolveColor(props.data.hover_text_color)
  if (hoverTxt) style['--hover-color'] = hoverTxt
  style['--transition-duration'] = `${props.data.transition_duration ?? 200}ms`
  return style
})
</script>

<template>
  <div
    class="lcms-cta-box"
    :class="[`lcms-cta-box--${alignment}`, { 'has-hover': !!(data.hover_background_color || data.hover_text_color) }]"
    :style="boxStyle"
  >
    <h3 v-if="title" class="lcms-cta-box__title" :style="{ fontSize: titleFontSize }">{{ title }}</h3>
    <p v-if="subtitle" class="lcms-cta-box__subtitle" :style="{ fontSize: subtitleFontSize }">{{ subtitle }}</p>
    <component
      :is="buttonHref ? 'a' : 'span'"
      v-if="showButton"
      :href="buttonHref || undefined"
      class="lcms-cta-box__button"
      :class="buttonSizeClass"
      :style="buttonInlineStyle"
      :target="buttonTargetBlank ? '_blank' : undefined"
      :rel="buttonTargetBlank ? 'noopener noreferrer' : undefined"
    >
      <i v-if="buttonIcon && buttonIconPosition === 'left'" :class="buttonIcon" style="margin-right: 6px;" />
      {{ buttonText }}
      <i v-if="buttonIcon && buttonIconPosition === 'right'" :class="buttonIcon" style="margin-left: 6px;" />
    </component>
  </div>
</template>

<style scoped>
.lcms-cta-box {
  background-color: #50a5f1;
  color: #fff;
  transition: background-color var(--transition-duration, 200ms) ease, color var(--transition-duration, 200ms) ease;
}

.lcms-cta-box.has-hover:hover {
  background-color: var(--hover-bg);
  color: var(--hover-color);
}

.lcms-cta-box--center {
  text-align: center;
}

.lcms-cta-box--right {
  text-align: right;
}

.lcms-cta-box__title {
  margin: 0 0 8px;
}

.lcms-cta-box__subtitle {
  margin: 0 0 16px;
  opacity: 0.9;
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
