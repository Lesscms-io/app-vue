<template>
  <div class="lcms-service-card" :class="cardClasses" :style="cardStyles">
    <!-- Badge -->
    <div v-if="showBadge && badge" class="lcms-service-card__badge" :style="badgeStyles">
      {{ badge }}
    </div>

    <!-- Icon -->
    <div v-if="icon" class="lcms-service-card__icon" :style="iconStyles">
      <span v-if="isSvgIcon" class="lcms-service-card__svg" v-html="svgContent"></span>
      <i v-else :class="icon"></i>
    </div>

    <!-- Title -->
    <h3 v-if="title" class="lcms-service-card__title">
      {{ title }}
    </h3>

    <!-- Description -->
    <p v-if="description" class="lcms-service-card__description">
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
    config: Record<string, any>
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

const badge = computed(() => extractValue(config.value.badge) || '')
const icon = computed(() => {
  const val = config.value.icon
  if (!val) return ''
  if (typeof val === 'object') return ''
  return val
})
const isSvgIcon = computed(() => (icon.value || '').startsWith('svg:'))
const svgContent = computed(() => isSvgIcon.value ? icon.value.slice(4) : '')
const title = computed(() => extractValue(config.value.title) || '')
const description = computed(() => extractValue(config.value.description) || '')
const linkText = computed(() => extractValue(config.value.link_text) || '')
const linkTargetBlank = computed(() => config.value.link_target_blank || false)
const showBadge = computed(() => config.value.show_badge === true)
const showLink = computed(() => config.value.show_link !== false)

// Resolve link URL based on link_type (prefer server-resolved URL)
const resolvedLinkUrl = computed(() => {
  const linkType = config.value.link_link_type || config.value.link_type || 'url'
  const serverUrl = config.value.link_url

  if (linkType === 'page') {
    if (serverUrl && serverUrl !== '#') return serverUrl
    if (config.value.link_page_id) {
      const clientResolved = resolvePageUrl(null, config.value.link_page_id)
      if (clientResolved && clientResolved !== '#') return clientResolved
    }
    return serverUrl || ''
  }
  if (linkType === 'route' && config.value.link_route_uuid) {
    return resolvePageUrl(null, config.value.link_route_uuid)
  }
  if (linkType === 'entry') {
    if (serverUrl && serverUrl !== '#') return serverUrl
    if (config.value.link_collection_code && config.value.link_entry_id) {
      const clientResolved = resolveCollectionUrl(config.value.link_collection_code, config.value.link_entry_id)
      if (clientResolved && clientResolved !== '#') return clientResolved
    }
    return serverUrl || ''
  }
  return serverUrl || ''
})

// Highlighted state from item_settings or config
const isHighlighted = computed(() => {
  return config.value.item_settings?.highlight || config.value.highlighted || false
})

// In multi-item mode, hover transform/shadow is handled by the cell wrapper (LcmsMultiItemWrapper).
// Only color-based hover effects stay on the inner component.
const isMultiItem = computed(() => !!config.value.item_settings)

const cardClasses = computed(() => ({
  'lcms-service-card--highlighted': isHighlighted.value,
  'has-hover': !!(config.value.hover_text_color || config.value.hover_icon_color || config.value.hover_icon_background || (!isMultiItem.value && (config.value.hover_lift || (config.value.hover_scale !== undefined && config.value.hover_scale !== 1) || (config.value.hover_shadow && config.value.hover_shadow !== 'none'))))
}))

const cardStyles = computed(() => {
  const styles: Record<string, string> = {}

  // In multi-item mode, background and border-radius are on the cell wrapper
  if (!isMultiItem.value) {
    const bg = resolveColor(config.value.background_color)
    if (bg) styles.backgroundColor = bg
    const br = config.value.border_radius
    if (br !== undefined && br !== null) styles.borderRadius = `${br}px`
  }

  const txt = resolveColor(config.value.text_color)
  if (txt) styles.color = txt

  const hoverTxt = resolveColor(config.value.hover_text_color)
  if (hoverTxt) styles['--hover-color'] = hoverTxt
  const hoverBg = resolveColor(config.value.hover_background_color)
  if (hoverBg) styles['--hover-bg'] = hoverBg
  const hoverIconColor = resolveColor(config.value.hover_icon_color)
  if (hoverIconColor) styles['--hover-icon-color'] = hoverIconColor
  const hoverIconBg = resolveColor(config.value.hover_icon_background)
  if (hoverIconBg) styles['--hover-icon-bg'] = hoverIconBg
  styles['--transition-duration'] = `${config.value.transition_duration ?? 200}ms`

  // In multi-item mode, lift/scale/shadow hover is on the cell wrapper, not here
  if (!isMultiItem.value) {
    const lift = config.value.hover_lift || 0
    if (lift) styles['--hover-lift'] = `-${lift}px`
    const scale = config.value.hover_scale
    if (scale && scale !== 1) styles['--hover-scale'] = String(scale)
    const shadowMap: Record<string, string> = { sm: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)', md: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)', lg: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)' }
    const shadowVal = config.value.hover_shadow || 'none'
    if (shadowVal !== 'none' && shadowMap[shadowVal]) styles['--hover-shadow'] = shadowMap[shadowVal]
  }

  return styles
})

const iconStyles = computed(() => {
  const styles: Record<string, string> = {}
  const color = resolveColor(config.value.icon_color)
  if (color) styles.color = color
  const bg = resolveColor(config.value.icon_background)
  if (bg) styles.backgroundColor = bg
  const size = config.value.icon_size
  if (size !== undefined && size !== null) {
    styles.width = `${size}px`
    styles.height = `${size}px`
    styles.fontSize = `${Math.round(size * 0.5)}px`
  }
  return styles
})

const linkStyles = computed(() => {
  const styles: Record<string, string> = {}
  const color = resolveColor(config.value.link_color)
  if (color) styles.color = color
  return styles
})

const badgeStyles = computed(() => {
  const styles: Record<string, string> = {}
  const color = resolveColor(config.value.badge_color)
  if (color) styles.color = color
  const bg = resolveColor(config.value.badge_background)
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
}

.lcms-service-card.has-hover:hover {
  color: var(--hover-color);
  transform: translateY(var(--hover-lift, 0)) scale(var(--hover-scale, 1));
  box-shadow: var(--hover-shadow, none);
  background-color: var(--hover-bg);
}

.lcms-service-card.has-hover:hover .lcms-service-card__icon {
  color: var(--hover-icon-color);
  background-color: var(--hover-icon-bg);
}

.lcms-service-card--highlighted {
  border: 2px solid var(--lcms-color-primary, #50a5f1);
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
  width: 60%;
  height: 60%;
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
  transition: gap 0.2s ease;
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
