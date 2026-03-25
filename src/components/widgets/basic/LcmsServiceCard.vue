<template>
  <div class="lcms-service-card" :class="cardClasses" :style="cardStyles">
    <!-- Badge -->
    <div v-if="showBadge && badge" class="lcms-service-card__badge" :style="badgeStyles">
      {{ badge }}
    </div>

    <!-- Icon -->
    <div v-if="iconValue" class="lcms-service-card__icon" :style="iconStyles">
      <span v-if="isSvgIcon" class="lcms-service-card__svg" v-html="svgContent"></span>
      <i v-else :class="iconValue"></i>
    </div>

    <!-- Title -->
    <h3 v-if="title" class="lcms-service-card__title">
      {{ title }}
    </h3>

    <!-- Description -->
    <p v-if="description" class="lcms-service-card__description" :style="descriptionStyles">
      {{ description }}
    </p>

    <!-- Link -->
    <a
      v-if="showLink && linkText && resolvedLinkUrl"
      :href="resolvedLinkUrl"
      class="lcms-service-card__link"
      :style="linkStyles"
      :target="linkTargetBlank ? '_blank' : undefined"
      :rel="linkTargetBlank ? 'noopener noreferrer' : undefined"
    >
      {{ linkText }} <span class="lcms-service-card__arrow">&rarr;</span>
    </a>
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue'
import { useLanguage } from '@/composables/useLanguage'

const props = defineProps<{
  data: {
    widget_type: string
    config?: Record<string, any>
    settings?: Record<string, unknown>
  }
  language?: string
}>()

const { extractValue } = useLanguage(props.language)

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

const resolvePageUrl = inject<(code: string | null, uuid: string | null) => string>('lesscms-resolve-page-url', () => '#')
const resolveCollectionUrl = inject<(collectionCode: string, entryId: string) => string>('lesscms-resolve-collection-url', () => '#')

const config = computed(() => props.data.widget || props.data || {})

// Element groups
const headingGroup = computed(() => config.value.heading || {})
const descriptionGroup = computed(() => config.value.description || {})
const iconGroup = computed(() => config.value.icon || {})
const linkGroup = computed(() => config.value.link || {})
const badgeGroup = computed(() => config.value.badge || {})
const styleGroup = computed(() => config.value.style || {})

// Content values
const badge = computed(() => extractValue(badgeGroup.value.html || badgeGroup.value.content) || '')
const iconValue = computed(() => {
  const val = iconGroup.value.icon
  if (!val) return ''
  if (typeof val === 'object') return ''
  return val
})
const isSvgIcon = computed(() => (iconValue.value || '').startsWith('svg:'))
const svgContent = computed(() => isSvgIcon.value ? iconValue.value.slice(4) : '')
const title = computed(() => extractValue(headingGroup.value.html || headingGroup.value.content) || '')
const description = computed(() => extractValue(descriptionGroup.value.html || descriptionGroup.value.content) || '')
const linkText = computed(() => extractValue(linkGroup.value.html || linkGroup.value.content) || '')
const linkTargetBlank = computed(() => linkGroup.value.target_blank || false)
const showBadge = computed(() => badgeGroup.value.show === true)
const showLink = computed(() => linkGroup.value.show !== false)

// Resolve link URL based on link_type
const resolvedLinkUrl = computed(() => {
  const linkType = linkGroup.value.link_type || 'custom'
  const serverUrl = linkGroup.value.url

  if (linkType === 'page') {
    if (serverUrl && serverUrl !== '#') return serverUrl
    if (linkGroup.value.page_id) {
      const clientResolved = resolvePageUrl(null, linkGroup.value.page_id)
      if (clientResolved && clientResolved !== '#') return clientResolved
    }
    return serverUrl || ''
  }
  if (linkType === 'route' && linkGroup.value.route_uuid) {
    return resolvePageUrl(null, linkGroup.value.route_uuid)
  }
  if (linkType === 'entry') {
    if (serverUrl && serverUrl !== '#') return serverUrl
    if (linkGroup.value.collection_code && linkGroup.value.entry_id) {
      const clientResolved = resolveCollectionUrl(linkGroup.value.collection_code, linkGroup.value.entry_id)
      if (clientResolved && clientResolved !== '#') return clientResolved
    }
    return serverUrl || ''
  }
  return serverUrl || ''
})

// In multi-item mode, ALL hover effects are handled by the cell wrapper
const isMultiItem = computed(() => !!config.value.item_settings)

const hasHoverTextColor = computed(() => !isMultiItem.value && !!headingGroup.value['color:hover'])
const hasHoverDescColor = computed(() => !isMultiItem.value && !!descriptionGroup.value['color:hover'])
const hasHoverBgColor = computed(() => !isMultiItem.value && !!styleGroup.value['background_color:hover'])
const hasHoverIconColor = computed(() => !isMultiItem.value && !!iconGroup.value['color:hover'])
const hasHoverIconBg = computed(() => !isMultiItem.value && !!iconGroup.value['background:hover'])
const hasHoverLinkColor = computed(() => !isMultiItem.value && !!linkGroup.value['color:hover'])
const hasHoverBadgeColor = computed(() => !isMultiItem.value && !!badgeGroup.value['color:hover'])
const hasHoverBadgeBg = computed(() => !isMultiItem.value && !!badgeGroup.value['background:hover'])

const cardClasses = computed(() => ({
  'has-hover': !!(hasHoverTextColor.value || hasHoverDescColor.value || hasHoverBgColor.value || hasHoverIconColor.value || hasHoverIconBg.value || hasHoverLinkColor.value || hasHoverBadgeColor.value || hasHoverBadgeBg.value || (!isMultiItem.value && (styleGroup.value['lift:hover'] || (styleGroup.value['scale:hover'] !== undefined && styleGroup.value['scale:hover'] !== 1) || (styleGroup.value['shadow_preset:hover'] && styleGroup.value['shadow_preset:hover'] !== 'none')))),
  'has-hover-text-color': hasHoverTextColor.value,
  'has-hover-desc-color': hasHoverDescColor.value,
  'has-hover-bg': hasHoverBgColor.value,
  'has-hover-icon-color': hasHoverIconColor.value,
  'has-hover-icon-bg': hasHoverIconBg.value,
  'has-hover-link-color': hasHoverLinkColor.value,
  'has-hover-badge-color': hasHoverBadgeColor.value,
  'has-hover-badge-bg': hasHoverBadgeBg.value
}))

const cardStyles = computed(() => {
  // Container-level styles (bg, padding, border, shadow, hover) are handled by WidgetRenderer.
  // LcmsServiceCard only sets element-level colors (text, icon, link, badge).
  const styles: Record<string, string> = {}

  const txt = resolveColor(headingGroup.value.color)
  if (txt) styles.color = txt

  styles['--transition-duration'] = `${styleGroup.value.transition_duration ?? 200}ms`

  // In multi-item mode, ALL hover effects are on the cell wrapper
  if (!isMultiItem.value) {
    const hoverTxt = resolveColor(headingGroup.value['color:hover'])
    if (hoverTxt) styles['--hover-color'] = hoverTxt
    const hoverDesc = resolveColor(descriptionGroup.value['color:hover'])
    if (hoverDesc) styles['--hover-desc-color'] = hoverDesc
    const hoverBg = resolveColor(styleGroup.value['background_color:hover'])
    if (hoverBg) styles['--hover-bg'] = hoverBg
    const hoverIconColor = resolveColor(iconGroup.value['color:hover'])
    if (hoverIconColor) styles['--hover-icon-color'] = hoverIconColor
    const hoverIconBg = resolveColor(iconGroup.value['background:hover'])
    if (hoverIconBg) styles['--hover-icon-bg'] = hoverIconBg
    const hoverLinkColor = resolveColor(linkGroup.value['color:hover'])
    if (hoverLinkColor) styles['--hover-link-color'] = hoverLinkColor
    const hoverBadgeColor = resolveColor(badgeGroup.value['color:hover'])
    if (hoverBadgeColor) styles['--hover-badge-color'] = hoverBadgeColor
    const hoverBadgeBg = resolveColor(badgeGroup.value['background:hover'])
    if (hoverBadgeBg) styles['--hover-badge-bg'] = hoverBadgeBg

    // Lift/scale/shadow hover
    const lift = styleGroup.value['lift:hover'] || 0
    if (lift) styles['--hover-lift'] = `-${lift}px`
    const scale = styleGroup.value['scale:hover']
    if (scale && scale !== 1) styles['--hover-scale'] = String(scale)
    const shadowMap: Record<string, string> = { sm: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)', md: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)', lg: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)' }
    const shadowVal = styleGroup.value['shadow_preset:hover'] || 'none'
    if (shadowVal !== 'none' && shadowMap[shadowVal]) styles['--hover-shadow'] = shadowMap[shadowVal]
  }

  return styles
})

const iconStyles = computed(() => {
  const styles: Record<string, string> = {}
  const color = resolveColor(iconGroup.value.color)
  if (color) styles.color = color
  const bg = resolveColor(iconGroup.value.background)
  if (bg) styles.backgroundColor = bg
  const size = iconGroup.value.size
  const padding = iconGroup.value.padding || 0
  if (size !== undefined && size !== null) {
    styles.width = `${Number(size) + Number(padding) * 2}px`
    styles.height = `${Number(size) + Number(padding) * 2}px`
    styles.fontSize = `${Number(size)}px`
  }
  if (padding) {
    styles.padding = `${padding}px`
  }
  return styles
})

const descriptionStyles = computed(() => {
  const styles: Record<string, string> = {}
  const color = resolveColor(descriptionGroup.value.color)
  if (color) styles.color = color
  return styles
})

const linkStyles = computed(() => {
  const styles: Record<string, string> = {}
  const color = resolveColor(linkGroup.value.color)
  if (color) styles.color = color
  return styles
})

const badgeStyles = computed(() => {
  const styles: Record<string, string> = {}
  const color = resolveColor(badgeGroup.value.color)
  if (color) styles.color = color
  const bg = resolveColor(badgeGroup.value.background)
  if (bg) styles.backgroundColor = bg
  return styles
})
</script>

<style scoped>
.lcms-service-card {
  display: flex;
  flex-direction: column;
  position: relative;
  height: 100%;
  box-sizing: border-box;
  transition: color var(--transition-duration, 200ms) ease, box-shadow var(--transition-duration, 200ms) ease, transform var(--transition-duration, 200ms) ease, background-color var(--transition-duration, 200ms) ease;
  /* Expand into parent's padding so hover triggers from the very edge */
  margin: calc(-1 * var(--wr-pt, 0px)) calc(-1 * var(--wr-pr, 0px)) calc(-1 * var(--wr-pb, 0px)) calc(-1 * var(--wr-pl, 0px));
  padding: var(--wr-pt, 0px) var(--wr-pr, 0px) var(--wr-pb, 0px) var(--wr-pl, 0px);
  /* Compensate height for negative margins so hover area covers full card */
  min-height: calc(100% + var(--wr-pt, 0px) + var(--wr-pb, 0px));
}

.lcms-service-card.has-hover:hover {
  transform: translateY(var(--hover-lift, 0)) scale(var(--hover-scale, 1));
  box-shadow: var(--hover-shadow, none);
}

.lcms-service-card.has-hover.has-hover-text-color:hover {
  color: var(--hover-color) !important;
}

.lcms-service-card.has-hover.has-hover-text-color:hover .lcms-service-card__title {
  color: var(--hover-color) !important;
}

.lcms-service-card.has-hover.has-hover-text-color:hover .lcms-service-card__description {
  color: var(--hover-color) !important;
}

.lcms-service-card.has-hover.has-hover-desc-color:hover .lcms-service-card__description {
  color: var(--hover-desc-color) !important;
}

.lcms-service-card.has-hover.has-hover-bg:hover {
  background-color: var(--hover-bg) !important;
}

.lcms-service-card.has-hover.has-hover-icon-color:hover .lcms-service-card__icon {
  color: var(--hover-icon-color) !important;
}

.lcms-service-card.has-hover.has-hover-icon-bg:hover .lcms-service-card__icon {
  background-color: var(--hover-icon-bg) !important;
}

.lcms-service-card.has-hover.has-hover-link-color:hover .lcms-service-card__link {
  color: var(--hover-link-color) !important;
}

.lcms-service-card.has-hover.has-hover-badge-color:hover .lcms-service-card__badge {
  color: var(--hover-badge-color) !important;
}

.lcms-service-card.has-hover.has-hover-badge-bg:hover .lcms-service-card__badge {
  background-color: var(--hover-badge-bg) !important;
}

.lcms-service-card__badge {
  position: absolute;
  top: -0.75rem;
  right: 1rem;
  padding: 0.375rem 0.75rem;
  background: var(--lcms-color-accent, #4ade80);
  color: #fff;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  border-radius: 9999px;
  letter-spacing: 0.05em;
  white-space: nowrap;
  transition: color var(--transition-duration, 200ms) ease, background-color var(--transition-duration, 200ms) ease;
}

.lcms-service-card__icon {
  width: 3.5rem;
  height: 3.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--lcms-color-gray-100, #e8f5e9);
  color: var(--lcms-color-primary, #2e7d32);
  border-radius: 0.75rem;
  font-size: 1.5rem;
  margin-bottom: 1.25rem;
  transition: color var(--transition-duration, 200ms) ease, background-color var(--transition-duration, 200ms) ease;
}

.lcms-service-card__svg {
  display: inline-flex;
  align-items: center;
  width: 100%;
  height: 100%;
}

.lcms-service-card__svg :deep(svg) {
  width: 100%;
  height: 100%;
}

.lcms-service-card__svg :deep(svg[fill="none"]) {
  fill: none;
}

.lcms-service-card__svg :deep(svg:not([fill])) {
  fill: currentColor;
}

.lcms-service-card__title {
  font-size: 1.25rem;
  font-weight: 700;
  color: inherit;
  margin: 0 0 0.75rem 0;
}

.lcms-service-card__description {
  font-size: 0.9375rem;
  line-height: 1.6;
  color: inherit;
  opacity: 0.75;
  margin: 0 0 1.5rem 0;
  flex: 1;
}

.lcms-service-card__link {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.9375rem;
  font-weight: 500;
  color: inherit;
  text-decoration: none;
  transition: gap 0.2s ease, color var(--transition-duration, 200ms) ease;
}

.lcms-service-card__link:hover {
  gap: 0.625rem;
}

.lcms-service-card__arrow {
  transition: transform 0.2s ease;
}

.lcms-service-card__link:hover .lcms-service-card__arrow {
  transform: translateX(2px);
}
</style>
