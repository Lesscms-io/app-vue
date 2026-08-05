<script setup lang="ts">
/**
 * Product Field Widget (E-commerce)
 *
 * Displays a single product field/attribute with configurable formatting.
 * Auto-hides when the field is empty (handles different product templates).
 */

import { computed, inject, type Ref } from 'vue'
import { useLanguage } from '../../../composables/useLanguage'
import { getProductField, getProductFieldRaw, formatAttributeValue } from '../../../utils/productField'
import { formatPrice, hasDisplayablePrice } from '../../../utils/currency'
import { resolveColor } from '../../../utils/resolveColor'

defineOptions({ inheritAttrs: false })

interface Props {
  data: Record<string, any>
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()
const { extractValue } = useLanguage(props.language)

const product = inject<Ref<any> | null>('lcms-product', null)
const projectConfig = inject<Ref<any> | null>('lesscms-project-config', null)

const config = computed(() => props.data?.config || props.data || {})
const fieldPath = computed(() => config.value.field_path || '')
const displayAs = computed(() => config.value.display_as || 'text')
const hideWhenEmpty = computed(() => config.value.hide_when_empty !== false)

const labelGroup = computed(() => props.data?.label || {})
const textGroup = computed(() => props.data?.text || {})
const showLabel = computed(() => labelGroup.value.show !== false && !!labelGroup.value.text)
const labelText = computed(() => extractValue(labelGroup.value.text) || '')

const labelStyle = computed(() => {
  const s: Record<string, string> = {}
  if (labelGroup.value.color) s.color = resolveColor(labelGroup.value.color)
  return s
})

const textStyle = computed(() => {
  const s: Record<string, string> = {}
  if (textGroup.value.color) s.color = resolveColor(textGroup.value.color)
  if (textGroup.value.font_size) s.fontSize = `${textGroup.value.font_size}px`
  if (textGroup.value.font_weight) s.fontWeight = textGroup.value.font_weight
  return s
})

const currency = computed(() => projectConfig?.value?.commerce?.currency || 'PLN')

const rawValue = computed(() => {
  if (!product?.value || !fieldPath.value) return null
  return getProductFieldRaw(product.value, fieldPath.value)
})

const displayValue = computed(() => {
  if (!product?.value || !fieldPath.value) return null
  return getProductField(product.value, fieldPath.value)
})

const formattedValue = computed(() => {
  const val = rawValue.value
  if (val == null) return ''
  if (displayAs.value === 'price') return formatPrice(Number(val), currency.value)
  return formatAttributeValue(val, displayAs.value, props.language || 'pl')
})

const isVisible = computed(() => {
  // A price of 0 = product priced by the configurator; "0,00 zł" would read as
  // "free", so the field (label included) stays hidden.
  if (displayAs.value === 'price' && !hasDisplayablePrice(rawValue.value as any)) return false
  if (!hideWhenEmpty.value) return true
  return rawValue.value != null && rawValue.value !== '' && rawValue.value !== false
})

const tag = computed(() => {
  const map: Record<string, string> = {
    'heading': 'h2', 'h1': 'h1', 'h2': 'h2', 'h3': 'h3', 'h4': 'h4', 'h5': 'h5', 'h6': 'h6',
    'text': 'p', 'badge': 'span', 'price': 'span',
  }
  return map[displayAs.value] || 'p'
})

// When rendering as a heading, piggyback on the .lcms-heading__text[data-level]
// styles from widgets.css so product-field inherits the project's h1-h6 design
// tokens (--lcms-hN-font-size, -font-weight, -color, -line-height) without
// duplicating the CSS.
const headingLevel = computed<number | null>(() => {
  const match = tag.value.match(/^h([1-6])$/)
  return match ? Number(match[1]) : null
})

const textClass = computed(() => {
  return headingLevel.value
    ? ['lcms-product-field__text', 'lcms-heading__text']
    : ['lcms-product-field__text']
})
</script>

<template>
  <div v-if="isVisible" class="lcms-product-field">
    <!-- Label -->
    <span v-if="showLabel" class="lcms-product-field__label" :style="labelStyle">{{ labelText }}</span>

    <!-- Image display -->
    <img
      v-if="displayAs === 'image' && displayValue"
      :src="String(displayValue)"
      class="lcms-product-field__image"
      loading="lazy"
    />

    <!-- Gallery display -->
    <div v-else-if="displayAs === 'gallery' && Array.isArray(rawValue)" class="lcms-product-field__gallery">
      <img
        v-for="(img, i) in rawValue"
        :key="i"
        :src="String(img)"
        class="lcms-product-field__gallery-img"
        loading="lazy"
      />
    </div>

    <!-- HTML display -->
    <div
      v-else-if="displayAs === 'html'"
      class="lcms-product-field__html"
      v-html="formattedValue"
    />

    <!-- Price display -->
    <span v-else-if="displayAs === 'price'" class="lcms-product-field__price" :style="textStyle">
      {{ formattedValue }}
    </span>

    <!-- Badge display -->
    <span v-else-if="displayAs === 'badge'" class="lcms-product-field__badge" :style="textStyle">
      {{ formattedValue }}
    </span>

    <!-- Default: text/heading -->
    <component
      v-else
      :is="tag"
      :class="textClass"
      :data-level="headingLevel ?? undefined"
      :style="textStyle"
    >
      {{ formattedValue }}
    </component>
  </div>
</template>

<style scoped>
.lcms-product-field {
  font-family: var(--lcms-font-body, system-ui, sans-serif);
  color: var(--lcms-color-text, #1f2937);
}

.lcms-product-field__label {
  display: block;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--lcms-color-muted, #6b7280);
  margin-bottom: 0.25rem;
}

.lcms-product-field__text {
  margin: 0;
}

.lcms-product-field__price {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--lcms-color-primary, #3b82f6);
}

.lcms-product-field__badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background: var(--lcms-color-background-alt, #f3f4f6);
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 500;
}

.lcms-product-field__image {
  max-width: 100%;
  border-radius: var(--lcms-border-radius, 0.5rem);
}

.lcms-product-field__gallery {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.lcms-product-field__gallery-img {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 0.375rem;
  border: 1px solid var(--lcms-color-border, #e5e7eb);
}

.lcms-product-field__html {
  line-height: 1.7;
}

.lcms-product-field__html :deep(p) {
  margin: 0 0 1rem;
}
</style>
