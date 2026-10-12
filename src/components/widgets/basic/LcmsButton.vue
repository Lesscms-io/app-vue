<script setup lang="ts">
/**
 * Button Widget
 *
 * Renders a styled button/link element.
 * Element-group structure: text + config + link
 */

import { computed, inject, ref } from 'vue'
import { useLanguage } from '@/composables/useLanguage'
import { resolveColor as resolveCssColor } from '@/utils/resolveColor'
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
const buttonText = computed(() => extractValue(textGroup.value.html || textGroup.value.content))

// Config group
const buttonStyle = computed(() => configGroup.value.style || 'primary')
const buttonSize = computed(() => configGroup.value.size || 'md')
const borderRadius = computed(() => configGroup.value.border_radius || '')
const buttonPadding = computed(() => configGroup.value.padding || '')
const buttonIcon = computed(() => configGroup.value.icon || '')
const iconPosition = computed(() => configGroup.value.icon_position || 'left')
const iconHoverOnly = computed(() => !!configGroup.value.icon_hover_only && !!buttonIcon.value)
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
  none: '0', sm: '4px', md: '8px', lg: '12px', pill: '50px', circle: '50%'
}

const isCircle = computed(() => borderRadius.value === 'circle')
const hoverFill = computed(() => configGroup.value.hover_effect === 'fill-up')

const buttonInlineStyle = computed(() => {
  const styles: Record<string, string> = {}
  if (borderRadius.value) {
    styles.borderRadius = RADIUS_MAP[borderRadius.value] || `${borderRadius.value}px`
  }
  if (buttonPadding.value) styles.padding = `${buttonPadding.value}px`
  if (hoverFill.value) {
    const fill = resolveCssColor(configGroup.value.fill_color)
    const fillText = resolveCssColor(configGroup.value.fill_text_color)
    if (fill) styles['--lcms-btn-fill'] = fill
    if (fillText) styles['--lcms-btn-fill-text'] = fillText
  }
  if (isCircle.value) {
    styles['--lcms-btn-circle-d'] = `${configGroup.value.circle_size || 210}px`
    if (configGroup.value.circle_size_mobile) {
      styles['--lcms-btn-circle-d-m'] = `${configGroup.value.circle_size_mobile}px`
    }
  }
  return styles
})

// Magnetic effect — link follows the cursor inside itself (pointer:fine, no reduced-motion)
const linkEl = ref<HTMLAnchorElement | null>(null)
const magnetic = computed(() => !!configGroup.value.magnetic)
const magneticStrength = computed(() => {
  const v = Number(configGroup.value.magnetic_strength)
  return Number.isFinite(v) ? Math.min(0.6, Math.max(0.1, v)) : 0.3
})

function magneticAllowed(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(pointer: fine)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function onMagneticMove(e: MouseEvent) {
  if (!magnetic.value || !linkEl.value || !magneticAllowed()) return
  const r = linkEl.value.getBoundingClientRect()
  const dx = (e.clientX - (r.left + r.width / 2)) * magneticStrength.value
  const dy = (e.clientY - (r.top + r.height / 2)) * magneticStrength.value
  linkEl.value.style.transform = `translate(${dx}px, ${dy}px)`
}

function onMagneticLeave() {
  if (linkEl.value) linkEl.value.style.transform = ''
}
</script>

<template>
  <div class="lcms-button">
    <a
      ref="linkEl"
      :href="resolvedUrl"
      class="lcms-button__link"
      :class="[
        `lcms-button__link--${buttonStyle}`,
        `lcms-button__link--size-${buttonSize}`,
        {
          'lcms-button__link--icon-hover': iconHoverOnly,
          [`lcms-button__link--icon-${iconPosition}`]: iconHoverOnly,
          'lcms-button__link--circle': isCircle,
          'lcms-button__link--fill-up': hoverFill,
          'lcms-button__link--magnetic': magnetic
        }
      ]"
      :style="buttonInlineStyle"
      :target="targetBlank ? '_blank' : undefined"
      :rel="targetBlank ? 'noopener noreferrer' : undefined"
      @mousemove="onMagneticMove"
      @mouseleave="onMagneticLeave"
    >
      <span v-if="isSvgIcon && iconPosition === 'left'" class="lcms-button__svg lcms-button__svg--left" v-html="svgContent" />
      <i v-else-if="buttonIcon && iconPosition === 'left'" :class="[buttonIcon, 'lcms-button__icon', 'lcms-button__icon--left']" />
      {{ buttonText }}
      <span v-if="isSvgIcon && iconPosition === 'right'" class="lcms-button__svg lcms-button__svg--right" v-html="svgContent" />
      <i v-else-if="buttonIcon && iconPosition === 'right'" :class="[buttonIcon, 'lcms-button__icon', 'lcms-button__icon--right']" />
    </a>
  </div>
</template>

<style scoped>
.lcms-button__link {
  transition: filter 200ms ease, transform 200ms ease, box-shadow 200ms ease, padding 200ms ease;
}

/* icon spacing as classes (not inline) so project CSS can restyle the icon */
.lcms-button__icon--left { margin-right: 6px; }
.lcms-button__icon--right { margin-left: 6px; }

/* icon_hover_only: icon takes no space and is invisible; on hover it slides in
   while the padding on that side grows so the label doesn't jump */
.lcms-button__link--icon-hover .lcms-button__icon,
.lcms-button__link--icon-hover .lcms-button__svg {
  opacity: 0;
  width: 0;
  overflow: hidden;
  margin: 0 !important;
  transform: translateX(-6px);
  transition: opacity 200ms ease, transform 200ms ease, width 200ms ease, margin 200ms ease;
}
.lcms-button__link--icon-hover.lcms-button__link--icon-left .lcms-button__icon,
.lcms-button__link--icon-hover.lcms-button__link--icon-left .lcms-button__svg {
  transform: translateX(6px);
}
.lcms-button__link--icon-hover:hover .lcms-button__icon,
.lcms-button__link--icon-hover:hover .lcms-button__svg {
  opacity: 1;
  width: 1em;
  transform: translateX(0);
}
.lcms-button__link--icon-hover.lcms-button__link--icon-right:hover .lcms-button__icon,
.lcms-button__link--icon-hover.lcms-button__link--icon-right:hover .lcms-button__svg { margin-left: 6px !important; }
.lcms-button__link--icon-hover.lcms-button__link--icon-left:hover .lcms-button__icon,
.lcms-button__link--icon-hover.lcms-button__link--icon-left:hover .lcms-button__svg { margin-right: 6px !important; }

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
