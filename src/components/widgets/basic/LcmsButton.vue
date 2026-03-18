<script setup lang="ts">
/**
 * Button Widget
 *
 * Renders a styled button/link element.
 * Element-group structure: text + config + link
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

// Element groups
const textGroup = computed(() => props.data.text || {})
const configGroup = computed(() => props.data.config || {})
const linkGroup = computed(() => props.data.link || {})

// Text group
const buttonText = computed(() => extractValue(textGroup.value.content))

// Config group
const buttonStyle = computed(() => configGroup.value.style || 'primary')
const buttonSize = computed(() => configGroup.value.size || 'md')
const borderRadius = computed(() => configGroup.value.border_radius || '')
const buttonPadding = computed(() => configGroup.value.padding || '')
const buttonIcon = computed(() => configGroup.value.icon || '')
const iconPosition = computed(() => configGroup.value.icon_position || 'left')
const isSvgIcon = computed(() => buttonIcon.value.startsWith('svg:'))
const svgContent = computed(() => isSvgIcon.value ? buttonIcon.value.slice(4) : '')

// Link group
const buttonUrl = computed(() => linkGroup.value.url || '#')
const linkType = computed(() => linkGroup.value.link_type || 'custom')
const targetBlank = computed(() => linkGroup.value.target_blank || false)
const pageUuid = computed(() => linkGroup.value.page_id || '')
const pageCode = computed(() => (linkGroup.value as any).page_code || '')
const routeUuid = computed(() => linkGroup.value.route_uuid || '')
const entryUuid = computed(() => linkGroup.value.entry_id || '')
const entryCode = computed(() => (linkGroup.value as any).entry_code || '')
const collectionCode = computed(() => linkGroup.value.collection_code || '')

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
</script>

<template>
  <div class="lcms-button">
    <a
      :href="resolvedUrl"
      class="lcms-button__link"
      :class="[
        `lcms-button__link--${buttonStyle}`,
        `lcms-button__link--size-${buttonSize}`
      ]"
      :style="buttonInlineStyle"
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
  transition: filter 200ms ease, transform 200ms ease, box-shadow 200ms ease;
}

.lcms-button__link:hover {
  filter: brightness(0.9);
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
