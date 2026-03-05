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
      v-if="linkText && resolvedLinkUrl"
      :href="resolvedLinkUrl"
      class="lcms-service-card__link"
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

// Resolve color variable references (var:primary → var(--lcms-color-primary))
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
const showBadge = computed(() => config.value.show_badge !== false)

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

const cardClasses = computed(() => ({
  'lcms-service-card--highlighted': isHighlighted.value,
  'lcms-service-card--has-bg': !!config.value.background_color
}))

const cardStyles = computed(() => {
  const styles: Record<string, string> = {}
  const bg = resolveColor(config.value.background_color)
  if (bg) styles.backgroundColor = bg
  const txt = resolveColor(config.value.text_color)
  if (txt) styles.color = txt
  return styles
})

const iconStyles = computed(() => {
  const styles: Record<string, string> = {}
  const color = resolveColor(config.value.icon_color)
  if (color) styles.color = color
  const bg = resolveColor(config.value.icon_background)
  if (bg) styles.backgroundColor = bg
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
  padding: 2rem;
  background: var(--lcms-color-white, #fff);
  border-radius: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  position: relative;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
  height: 100%;
  box-sizing: border-box;
}

.lcms-service-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.lcms-service-card--highlighted {
  border: 2px solid var(--lcms-color-primary, #50a5f1);
}

.lcms-service-card--has-bg .lcms-service-card__icon {
  background: rgba(255, 255, 255, 0.15);
  color: inherit;
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
}

.lcms-service-card__svg {
  display: inline-flex;
  width: 1.5rem;
  height: 1.5rem;
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
