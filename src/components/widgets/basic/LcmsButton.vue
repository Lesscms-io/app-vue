<script setup lang="ts">
/**
 * Button Widget
 *
 * Renders a styled button/link element.
 */

import { computed, inject } from 'vue'
import { useLanguage } from '@/composables/useLanguage'
import type { ButtonWidgetData } from '@/types/widgets'

defineOptions({
  inheritAttrs: false
})

interface Props {
  data: ButtonWidgetData
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const { extractValue } = useLanguage(props.language)

const resolvePageUrl = inject<(code: string | null, uuid: string | null) => string>('lesscms-resolve-page-url', () => '#')
const resolveCollectionUrl = inject<(collectionCode: string, entryId: string) => string>('lesscms-resolve-collection-url', () => '#')

const buttonText = computed(() => extractValue(props.data.text))
const buttonUrl = computed(() => props.data.url || '#')
const buttonStyle = computed(() => props.data.style || 'primary')
const buttonSize = computed(() => props.data.size || 'md')
const targetBlank = computed(() => props.data.target_blank || false)
const linkType = computed(() => props.data.link_type || 'url')
const borderRadius = computed(() => props.data.border_radius || '')
const buttonPadding = computed(() => props.data.padding || '')
const buttonIcon = computed(() => props.data.icon || '')
const iconPosition = computed(() => props.data.icon_position || 'left')
const isSvgIcon = computed(() => buttonIcon.value.startsWith('svg:'))
const svgContent = computed(() => isSvgIcon.value ? buttonIcon.value.slice(4) : '')
const pageUuid = computed(() => props.data.page_uuid || props.data.page_id || '')
const pageCode = computed(() => props.data.page_code || '')
const routeUuid = computed(() => props.data.route_uuid || '')
const entryUuid = computed(() => props.data.entry_uuid || props.data.entry_id || '')
const entryCode = computed(() => props.data.entry_code || '')
const collectionCode = computed(() => props.data.collection_code || '')

const resolvedUrl = computed(() => {
  const lt = linkType.value

  // For page/entry links, prefer server-resolved URL (in buttonUrl), then try client-side resolution
  if (lt === 'page') {
    if (buttonUrl.value && buttonUrl.value !== '#') return buttonUrl.value
    if (pageUuid.value || pageCode.value) {
      const clientResolved = resolvePageUrl(pageCode.value || null, pageUuid.value || null)
      if (clientResolved && clientResolved !== '#') return clientResolved
    }
    return buttonUrl.value
  }
  if (lt === 'route' && routeUuid.value) return resolvePageUrl(null, routeUuid.value)
  if (lt === 'entry') {
    if (buttonUrl.value && buttonUrl.value !== '#') return buttonUrl.value
    if (collectionCode.value && (entryUuid.value || entryCode.value)) {
      const clientResolved = resolveCollectionUrl(collectionCode.value, entryUuid.value || entryCode.value)
      if (clientResolved && clientResolved !== '#') return clientResolved
    }
    return buttonUrl.value
  }
  return buttonUrl.value
})

const RADIUS_MAP: Record<string, string> = {
  none: '0', sm: '4px', md: '8px', lg: '12px', pill: '50px'
}

const buttonInlineStyle = computed(() => {
  const styles: Record<string, string> = {}
  if (borderRadius.value) {
    styles.borderRadius = RADIUS_MAP[borderRadius.value] || `${borderRadius.value}px`
  }
  if (buttonPadding.value) styles.padding = `${buttonPadding.value}px`
  return styles
})

const hasEffects = computed(() => !!(
  props.data.hover_lift || (props.data.hover_scale && props.data.hover_scale !== 1) ||
  (props.data.hover_shadow && props.data.hover_shadow !== 'none')
))

const hoverStyles = computed(() => {
  const style: Record<string, string> = {}
  style['--transition-duration'] = `${props.data.transition_duration ?? 200}ms`
  const lift = props.data.hover_lift || 0
  if (lift) style['--hover-lift'] = `-${lift}px`
  const scale = props.data.hover_scale
  if (scale && scale !== 1) style['--hover-scale'] = String(scale)
  const shadowMap: Record<string, string> = { sm: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)', md: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)', lg: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)' }
  const shadowVal = props.data.hover_shadow || 'none'
  if (shadowVal !== 'none' && shadowMap[shadowVal]) style['--hover-shadow'] = shadowMap[shadowVal]
  return style
})
</script>

<template>
  <div class="lcms-button">
    <a
      :href="resolvedUrl"
      class="lcms-button__link"
      :class="[
        `lcms-button__link--${buttonStyle}`,
        `lcms-button__link--size-${buttonSize}`,
        { 'has-effects': hasEffects }
      ]"
      :style="{ ...buttonInlineStyle, ...hoverStyles }"
      :target="targetBlank ? '_blank' : undefined"
      :rel="targetBlank ? 'noopener noreferrer' : undefined"
    >
      <span v-if="isSvgIcon && iconPosition === 'left'" class="lcms-button__svg lcms-button__svg--left" v-html="svgContent" />
      <i v-else-if="buttonIcon && iconPosition === 'left'" :class="buttonIcon" style="margin-right: 6px;" />
      {{ buttonText }}
      <span v-if="isSvgIcon && iconPosition === 'right'" class="lcms-button__svg lcms-button__svg--right" v-html="svgContent" />
      <i v-else-if="buttonIcon && iconPosition === 'right'" :class="buttonIcon" style="margin-left: 6px;" />
    </a>
  </div>
</template>

<style scoped>
.lcms-button__link {
  transition: filter var(--transition-duration, 200ms) ease, transform var(--transition-duration, 200ms) ease, box-shadow var(--transition-duration, 200ms) ease;
}

.lcms-button__link:hover {
  filter: brightness(0.9);
}

.lcms-button__link.has-effects:hover {
  transform: translateY(var(--hover-lift, 0)) scale(var(--hover-scale, 1));
  box-shadow: var(--hover-shadow, none);
}

.lcms-button__svg {
  display: inline-flex;
  align-items: center;
}

.lcms-button__svg--left {
  margin-right: 6px;
}

.lcms-button__svg--right {
  margin-left: 6px;
}

.lcms-button__svg :deep(svg) {
  width: 1em;
  height: 1em;
  fill: currentColor;
}
</style>
