<script setup lang="ts">
/**
 * Pricing Table Widget
 *
 * Renders a pricing card with title, price, features and CTA button.
 */

import { computed, inject } from 'vue'
import { useLanguage } from '@/composables/useLanguage'

defineOptions({
  inheritAttrs: false
})

interface Props {
  data: Record<string, any>
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const { extractValue } = useLanguage(props.language)

const resolvePageUrl = inject<(code: string | null, uuid: string | null) => string>('lesscms-resolve-page-url', () => '#')
const resolveCollectionUrl = inject<(collectionCode: string, entryId: string) => string>('lesscms-resolve-collection-url', () => '#')

const config = computed(() => props.data?.config || props.data || {})
const content = computed(() => props.data?.content || {})

const title = computed(() => extractValue(content.value.title || config.value.title))
const subtitle = computed(() => extractValue(content.value.subtitle || config.value.subtitle))
const price = computed(() => extractValue(content.value.price || config.value.price))
const period = computed(() => extractValue(content.value.period || config.value.period))
const buttonText = computed(() => extractValue(content.value.button_text || config.value.button_text))
const badge = computed(() => extractValue(content.value.badge || config.value.badge))
const buttonUrl = computed(() => config.value.button_url || '#')
const highlighted = computed(() => config.value.highlighted || false)
const features = computed(() => config.value.features || [])

// Button link settings
const btnStyle = computed(() => config.value.button_style || 'primary')
const btnSize = computed(() => config.value.button_size || 'md')
const btnBorderRadius = computed(() => config.value.button_border_radius || null)
const btnPadding = computed(() => config.value.button_padding || null)
const btnIcon = computed(() => config.value.button_icon || '')
const btnIconPosition = computed(() => config.value.button_icon_position || 'left')
const btnLinkType = computed(() => config.value.button_link_type || 'url')
const btnTargetBlank = computed(() => config.value.button_target_blank || false)
const btnPageId = computed(() => config.value.button_page_id || null)
const btnRouteUuid = computed(() => config.value.button_route_uuid || null)
const btnEntryId = computed(() => config.value.button_entry_id || null)
const btnCollectionCode = computed(() => config.value.button_collection_code || null)

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

const highlightColor = computed(() => resolveColor(config.value.highlight_color))

const buttonColor = computed(() => resolveColor(config.value.button_color))

const cardStyle = computed(() => {
  const style: Record<string, string> = {}
  if (highlighted.value && highlightColor.value) {
    style.borderColor = highlightColor.value
  }
  return style
})

const resolvedButtonUrl = computed(() => {
  const lt = btnLinkType.value
  if (lt === 'page' && btnPageId.value) return resolvePageUrl(null, btnPageId.value)
  if (lt === 'route' && btnRouteUuid.value) return resolvePageUrl(null, btnRouteUuid.value)
  if (lt === 'entry' && btnCollectionCode.value && btnEntryId.value) return resolveCollectionUrl(btnCollectionCode.value, btnEntryId.value)
  return buttonUrl.value
})

const buttonInlineStyle = computed(() => {
  const style: Record<string, string> = {}
  if (buttonColor.value) {
    style.backgroundColor = buttonColor.value
    style.borderColor = buttonColor.value
  }
  if (btnBorderRadius.value) style.borderRadius = `${btnBorderRadius.value}px`
  if (btnPadding.value) style.padding = `${btnPadding.value}px`
  return style
})
</script>

<template>
  <div
    class="lcms-pricing"
    :class="{ 'lcms-pricing--highlighted': highlighted }"
    :style="cardStyle"
  >
    <div v-if="badge" class="lcms-pricing__badge" :style="highlightColor ? { backgroundColor: highlightColor } : {}">
      {{ badge }}
    </div>
    <div class="lcms-pricing__header">
      <h3 v-if="title" class="lcms-pricing__title">{{ title }}</h3>
      <p v-if="subtitle" class="lcms-pricing__subtitle">{{ subtitle }}</p>
      <div class="lcms-pricing__price-wrap">
        <span v-if="price" class="lcms-pricing__price">{{ price }}</span>
        <span v-if="period" class="lcms-pricing__period">/ {{ period }}</span>
      </div>
    </div>
    <ul v-if="features.length" class="lcms-pricing__features">
      <li
        v-for="(feature, idx) in features"
        :key="idx"
        class="lcms-pricing__feature"
        :class="{ 'lcms-pricing__feature--excluded': feature.included === false }"
      >
        <i :class="feature.included !== false ? 'fas fa-check' : 'fas fa-times'" />
        <span>{{ extractValue(feature.text) || feature.text }}</span>
      </li>
    </ul>
    <a
      v-if="buttonText"
      :href="resolvedButtonUrl"
      class="lcms-pricing__button"
      :class="[
        btnStyle ? `lcms-pricing__button--${btnStyle}` : '',
        btnSize !== 'md' ? `lcms-pricing__button--${btnSize}` : ''
      ]"
      :style="buttonInlineStyle"
      :target="btnTargetBlank ? '_blank' : undefined"
      :rel="btnTargetBlank ? 'noopener noreferrer' : undefined"
    >
      <i v-if="btnIcon && btnIconPosition === 'left'" :class="btnIcon" style="margin-right: 6px;" />
      {{ buttonText }}
      <i v-if="btnIcon && btnIconPosition === 'right'" :class="btnIcon" style="margin-left: 6px;" />
    </a>
  </div>
</template>

<style scoped>
.lcms-pricing {
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 2px solid #e9ecef;
  border-radius: 1rem;
  padding: 2rem;
  position: relative;
  text-align: center;
}

.lcms-pricing--highlighted {
  border-color: #50a5f1;
  box-shadow: 0 4px 20px rgba(80, 165, 241, 0.15);
}

.lcms-pricing__badge {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  padding: 0.25rem 1rem;
  background: #50a5f1;
  color: #fff;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  border-radius: 9999px;
  white-space: nowrap;
}

.lcms-pricing__header {
  margin-bottom: 1.5rem;
}

.lcms-pricing__title {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0 0 0.25rem 0;
}

.lcms-pricing__subtitle {
  font-size: 0.875rem;
  color: #6c757d;
  margin: 0 0 1rem 0;
}

.lcms-pricing__price-wrap {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 0.25rem;
}

.lcms-pricing__price {
  font-size: 2.5rem;
  font-weight: 800;
}

.lcms-pricing__period {
  font-size: 0.875rem;
  color: #6c757d;
}

.lcms-pricing__features {
  list-style: none;
  padding: 0;
  margin: 0 0 1.5rem 0;
  flex: 1;
}

.lcms-pricing__feature {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0;
  font-size: 0.9375rem;
  text-align: left;
}

.lcms-pricing__feature i {
  color: #28a745;
  width: 1rem;
  flex-shrink: 0;
}

.lcms-pricing__feature--excluded {
  color: #adb5bd;
}

.lcms-pricing__feature--excluded i {
  color: #dc3545;
}

.lcms-pricing__button {
  display: block;
  padding: 0.75rem 1.5rem;
  background: #50a5f1;
  color: #fff;
  font-weight: 600;
  text-decoration: none;
  border-radius: 0.5rem;
  transition: opacity 0.2s;
}

.lcms-pricing__button:hover {
  opacity: 0.9;
}
</style>
