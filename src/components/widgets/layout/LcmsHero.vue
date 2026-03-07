<script setup lang="ts">
/**
 * Hero Widget
 *
 * Renders a hero section with background, title, subtitle, and CTA button.
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

const title = computed(() => extractValue(props.data.title))
const subtitle = computed(() => props.data.subtitle ? extractValue(props.data.subtitle) : '')
const backgroundImage = computed(() => props.data.background || props.data.background_url || '')
const buttonText = computed(() => props.data.button_text ? extractValue(props.data.button_text) : '')
const buttonUrl = computed(() => props.data.button_url || '#')
const buttonStyle = computed(() => props.data.button_style || 'primary')
const buttonSize = computed(() => props.data.button_size || 'lg')
const showTitle = computed(() => props.data.show_title !== false)
const showSubtitle = computed(() => props.data.show_subtitle !== false)

// Dynamic content source settings (for future dynamic mode)
const contentSource = computed(() => props.data.content_source || 'static')
const collectionCode = computed(() => props.data.collection_code || null)
const entrySource = computed(() => props.data.entry_source || 'static')
const entryId = computed(() => props.data.entry_id || null)
const entryUrlSegment = computed(() => props.data.entry_url_segment || 1)

// Field mappings for dynamic mode
const imageField = computed(() => props.data.image_field || '')
const titleField = computed(() => props.data.title_field || '')
const subtitleField = computed(() => props.data.subtitle_field || '')

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

// Overlay settings
const overlayOpacity = computed(() => props.data.overlay_opacity ?? 50)
const overlayColor = computed(() => resolveColor(props.data.overlay_color) || '#000000')

// Text settings
const textAlign = computed(() => props.data.text_align || 'center')
const textPosition = computed(() => props.data.text_position || 'center')
const textColor = computed(() => resolveColor(props.data.text_color) || '#ffffff')

// Button link settings
const buttonBorderRadius = computed(() => props.data.button_border_radius || null)
const buttonPadding = computed(() => props.data.button_padding || null)
const buttonIcon = computed(() => props.data.button_icon || '')
const buttonIconPosition = computed(() => props.data.button_icon_position || 'left')
const buttonLinkType = computed(() => props.data.button_link_type || 'url')
const buttonTargetBlank = computed(() => props.data.button_target_blank || false)
const buttonPageId = computed(() => props.data.button_page_id || null)
const buttonRouteUuid = computed(() => props.data.button_route_uuid || null)
const buttonEntryId = computed(() => props.data.button_entry_id || null)
const buttonCollectionCode = computed(() => props.data.button_collection_code || null)

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
  if (backgroundImage.value) {
    style.backgroundImage = `url(${backgroundImage.value})`
  }
  // hover CSS custom properties
  const hoverOverlay = resolveColor(props.data.hover_overlay_color)
  if (hoverOverlay) style['--hover-overlay-color'] = hoverOverlay
  const hoverTxt = resolveColor(props.data.hover_text_color)
  if (hoverTxt) style['--hover-color'] = hoverTxt
  style['--transition-duration'] = `${props.data.transition_duration ?? 200}ms`
  return style
})

const overlayStyle = computed(() => ({
  backgroundColor: overlayColor.value,
  opacity: overlayOpacity.value / 100,
}))

const contentStyle = computed(() => ({
  textAlign: textAlign.value,
  color: textColor.value,
}))
</script>

<template>
  <section
    class="lcms-hero"
    :class="{ 'lcms-hero--has-bg': backgroundImage, 'has-hover': !!(data.hover_overlay_color || data.hover_text_color) }"
    :style="heroStyle"
  >
    <div class="lcms-hero__overlay" :style="overlayStyle" />
    <div class="lcms-hero__content" :class="`lcms-hero__content--${textPosition}`" :style="contentStyle">
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
          `lcms-hero__button--size-${buttonSize}`
        ]"
        :target="buttonTargetBlank ? '_blank' : undefined"
        :rel="buttonTargetBlank ? 'noopener noreferrer' : undefined"
        :style="{
          borderRadius: buttonBorderRadius ? `${buttonBorderRadius}px` : undefined,
          padding: buttonPadding ? `${buttonPadding}px` : undefined,
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
  transition: color var(--transition-duration, 200ms) ease;
}

.lcms-hero__overlay {
  transition: background-color var(--transition-duration, 200ms) ease;
}

.lcms-hero.has-hover:hover {
  color: var(--hover-color);
}

.lcms-hero.has-hover:hover .lcms-hero__overlay {
  background-color: var(--hover-overlay-color);
}
</style>
