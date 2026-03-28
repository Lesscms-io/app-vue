<script setup lang="ts">
/**
 * Hero Widget
 *
 * Renders a hero section with background, title, subtitle, and CTA button.
 * Uses element-group structure: heading, button, config, text, overlay.
 */

import { computed, inject } from 'vue'
import { useLanguage } from '@/composables/useLanguage'
import type { HeroWidgetData } from '@/types/widgets'

defineOptions({
  inheritAttrs: false
})

interface Props {
  data: HeroWidgetData
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const { extractValue } = useLanguage(props.language)

const resolvePageUrl = inject<(code: string | null, uuid: string | null) => string>('lesscms-resolve-page-url', () => '#')
const resolveCollectionUrl = inject<(collectionCode: string, entryId: string) => string>('lesscms-resolve-collection-url', () => '#')

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

const config = computed(() => props.data.widget || props.data || {})

// Element groups
const headingGroup = computed(() => config.value.heading || {})
const buttonGroup = computed(() => config.value.button || {})
const configGroup = computed(() => config.value.config || {})
const textGroup = computed(() => config.value.text || {})
const overlayGroup = computed(() => config.value.overlay || {})

// Heading
const title = computed(() => extractValue(headingGroup.value.title_html || headingGroup.value.title) || '')
const subtitle = computed(() => extractValue(headingGroup.value.subtitle_html || headingGroup.value.subtitle) || '')

// Button
const buttonText = computed(() => extractValue(buttonGroup.value.html || buttonGroup.value.content) || '')
const buttonUrl = computed(() => buttonGroup.value.url || '#')
const buttonStyle = computed(() => buttonGroup.value.style || 'primary')
const buttonSize = computed(() => buttonGroup.value.size || 'md')
const buttonBorderRadius = computed(() => buttonGroup.value.border_radius || 'md')
const buttonPadding = computed(() => buttonGroup.value.padding || '')
const buttonIcon = computed(() => buttonGroup.value.icon || '')
const buttonIconPosition = computed(() => buttonGroup.value.icon_position || 'left')
const buttonColor = computed(() => resolveColor(buttonGroup.value.color))
const buttonLinkType = computed(() => buttonGroup.value.link_type || 'custom')
const buttonPageId = computed(() => buttonGroup.value.page_id || null)
const buttonEntryId = computed(() => buttonGroup.value.entry_id || null)
const buttonCollectionCode = computed(() => buttonGroup.value.collection_code || null)
const buttonRouteUuid = computed(() => buttonGroup.value.route_uuid || null)
const buttonTargetBlank = computed(() => buttonGroup.value.target_blank || false)

// Config
const contentSource = computed(() => configGroup.value.content_source || 'static')
const textAlign = computed(() => configGroup.value.text_align || 'center')
const textPosition = computed(() => configGroup.value.text_position || 'center')
const collectionCode = computed(() => configGroup.value.collection_code || '')
const entrySource = computed(() => configGroup.value.entry_source || 'static')
const entryId = computed(() => configGroup.value.entry_id || '')
const entryUrlSegment = computed(() => configGroup.value.entry_url_segment || 1)
const fieldCodeTitle = computed(() => configGroup.value.field_code_title || '')
const fieldCodeSubtitle = computed(() => configGroup.value.field_code_subtitle || '')
const fieldCodeImage = computed(() => configGroup.value.field_code_image || '')
const showTitle = computed(() => configGroup.value.show_title !== false)
const showSubtitle = computed(() => configGroup.value.show_subtitle !== false)
const backgroundUrl = computed(() => configGroup.value.background_optimized || configGroup.value.background || null)

// Text
const textColor = computed(() => resolveColor(textGroup.value.color) || '#ffffff')
const hoverTextColor = computed(() => resolveColor(textGroup.value['color:hover']))

// Overlay
const overlayColor = computed(() => resolveColor(overlayGroup.value.color) || '#000000')
const overlayOpacity = computed(() => overlayGroup.value.opacity ?? 0.4)
const hoverOverlayColor = computed(() => resolveColor(overlayGroup.value['color:hover']))

// Resolve button URL based on link type
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

const heroStyle = computed(() => {
  const style: Record<string, string> = {}
  if (backgroundUrl.value) {
    style.backgroundImage = `url(${backgroundUrl.value})`
  }
  if (hoverOverlayColor.value) style['--hover-overlay-color'] = hoverOverlayColor.value
  if (hoverTextColor.value) style['--hover-color'] = hoverTextColor.value
  return style
})

const overlayStyle = computed(() => ({
  backgroundColor: overlayColor.value,
  opacity: overlayOpacity.value,
}))

const contentStyle = computed(() => ({
  textAlign: textAlign.value,
  color: textColor.value,
}))

const borderRadiusMap: Record<string, string> = {
  none: '0',
  sm: '4px',
  md: '8px',
  lg: '16px',
  full: '9999px'
}

const sizeClassMap: Record<string, string> = {
  sm: 'lcms-hero__button--size-sm',
  md: 'lcms-hero__button--size-md',
  lg: 'lcms-hero__button--size-lg'
}
</script>

<template>
  <section
    class="lcms-hero"
    :class="{
      'lcms-hero--has-bg': backgroundUrl,
      'has-hover': !!(hoverOverlayColor || hoverTextColor),
      [`lcms-hero__content--${textPosition}`]: true
    }"
    :style="heroStyle"
  >
    <div class="lcms-hero__overlay" :style="overlayStyle" />
    <div class="lcms-hero__content" :style="contentStyle">
      <h1
        v-if="showTitle && title"
        class="lcms-hero__title"
      >
        {{ title }}
      </h1>
      <p
        v-if="showSubtitle && subtitle"
        class="lcms-hero__subtitle"
      >
        {{ subtitle }}
      </p>
      <a
        v-if="buttonText"
        :href="resolvedButtonUrl"
        class="lcms-hero__button"
        :class="[
          `lcms-hero__button--${buttonStyle}`,
          sizeClassMap[buttonSize] || 'lcms-hero__button--size-md'
        ]"
        :target="buttonTargetBlank ? '_blank' : undefined"
        :rel="buttonTargetBlank ? 'noopener noreferrer' : undefined"
        :style="{
          borderRadius: borderRadiusMap[buttonBorderRadius] || undefined,
          padding: buttonPadding || undefined,
          color: buttonColor || undefined,
        }"
      >
        <i v-if="buttonIcon && buttonIconPosition === 'left'" :class="buttonIcon" class="lcms-hero__button-icon lcms-hero__button-icon--left" />
        {{ buttonText }}
        <i v-if="buttonIcon && buttonIconPosition === 'right'" :class="buttonIcon" class="lcms-hero__button-icon lcms-hero__button-icon--right" />
      </a>
    </div>
  </section>
</template>

<style scoped>
.lcms-hero {
  transition: color 200ms ease, transform 200ms ease, box-shadow 200ms ease;
}

.lcms-hero__overlay {
  transition: background-color 200ms ease;
}

.lcms-hero.has-hover:hover {
  color: var(--hover-color);
}

.lcms-hero.has-hover:hover .lcms-hero__overlay {
  background-color: var(--hover-overlay-color);
}
</style>
