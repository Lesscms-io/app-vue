<script setup lang="ts">
/**
 * Product Price Widget (E-commerce)
 *
 * Displays product price with optional compare-at price and discount badge.
 */

import { computed, inject, type Ref } from 'vue'
import { getProductField } from '../../../utils/productField'
import { formatPrice, calculateDiscount } from '../../../utils/currency'
import { resolveColor } from '../../../utils/resolveColor'

defineOptions({ inheritAttrs: false })

interface Props {
  data: Record<string, any>
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const product = inject<Ref<any> | null>('lcms-product', null)
const projectConfig = inject<Ref<any> | null>('lesscms-project-config', null)

const config = computed(() => props.data?.config || props.data || {})
const fieldPrice = computed(() => config.value.field_price || 'price')
const fieldComparePrice = computed(() => config.value.field_compare_price || 'compare_at_price')

const currency = computed(() => projectConfig?.value?.commerce?.currency || 'PLN')

const price = computed(() => {
  const val = getProductField(product?.value, fieldPrice.value)
  return val != null ? Number(val) : null
})

const comparePrice = computed(() => {
  const val = getProductField(product?.value, fieldComparePrice.value)
  return val != null ? Number(val) : null
})

const hasDiscount = computed(() =>
  comparePrice.value != null && comparePrice.value > (price.value || 0)
)

const discountPercent = computed(() => {
  if (!hasDiscount.value || !comparePrice.value || !price.value) return 0
  return calculateDiscount(comparePrice.value, price.value)
})

// Element-group styles
const priceGroup = computed(() => props.data?.price || {})
const compareGroup = computed(() => props.data?.compare || {})
const badgeGroup = computed(() => props.data?.badge || {})
const showBadge = computed(() => badgeGroup.value.show !== false)

const priceStyle = computed(() => {
  const s: Record<string, string> = {}
  if (priceGroup.value.color) s.color = resolveColor(priceGroup.value.color)
  if (priceGroup.value.font_size) s.fontSize = `${priceGroup.value.font_size}px`
  if (priceGroup.value.font_weight) s.fontWeight = priceGroup.value.font_weight
  return s
})

const compareStyle = computed(() => {
  const s: Record<string, string> = {}
  if (compareGroup.value.color) s.color = resolveColor(compareGroup.value.color)
  if (compareGroup.value.font_size) s.fontSize = `${compareGroup.value.font_size}px`
  return s
})

const badgeStyle = computed(() => {
  const s: Record<string, string> = {}
  if (badgeGroup.value.background) s.background = resolveColor(badgeGroup.value.background)
  if (badgeGroup.value.color) s.color = resolveColor(badgeGroup.value.color)
  return s
})
</script>

<template>
  <div v-if="price != null" class="lcms-product-price">
    <span v-if="hasDiscount" class="lcms-product-price__original" :style="compareStyle">
      {{ formatPrice(comparePrice!, currency) }}
    </span>
    <span class="lcms-product-price__current" :style="priceStyle">
      {{ formatPrice(price, currency) }}
    </span>
    <span v-if="hasDiscount && showBadge" class="lcms-product-price__discount" :style="badgeStyle">
      -{{ discountPercent }}%
    </span>
  </div>
</template>

<style scoped>
.lcms-product-price {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  font-family: var(--lcms-font-body, system-ui, sans-serif);
}

.lcms-product-price__current {
  font-size: 2rem;
  font-weight: 800;
  color: var(--lcms-color-primary, #3b82f6);
  line-height: 1;
}

.lcms-product-price__original {
  font-size: 1.125rem;
  color: var(--lcms-color-muted, #9ca3af);
  text-decoration: line-through;
}

.lcms-product-price__discount {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--lcms-color-white, #fff);
  background: var(--lcms-color-danger, #ef4444);
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
}
</style>
