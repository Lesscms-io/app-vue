<script setup lang="ts">
/**
 * Product Cart Widget (E-commerce)
 *
 * Add-to-cart button with quantity selector.
 */

import { computed, ref, inject, type Ref } from 'vue'
import { useLanguage } from '../../../composables/useLanguage'
import { useCart } from '../../../composables/useCart'
import { useToast } from '../../../composables/useToast'

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
const cart = useCart()
const toast = useToast()

const btn = computed(() => props.data?.button || {})
const config = computed(() => props.data?.config || {})
const showQuantity = computed(() => config.value.show_quantity !== false)

const buttonText = computed(() =>
  extractValue(btn.value.text) || (props.language === 'en' ? 'Add to cart' : 'Dodaj do koszyka')
)

const btnStyleClass = computed(() => btn.value.style || 'primary')
const btnSizeClass = computed(() => btn.value.size || 'lg')
const btnPadding = computed(() => btn.value.padding || '')
const btnIcon = computed(() => btn.value.icon || '')
const btnIconPosition = computed(() => btn.value.icon_position || 'left')
const btnIsSvgIcon = computed(() => btnIcon.value.startsWith('svg:'))
const btnSvgContent = computed(() => btnIsSvgIcon.value ? btnIcon.value.slice(4) : '')

const RADIUS_MAP: Record<string, string> = { none: '0', sm: '4px', md: '8px', lg: '12px', pill: '50px', full: '9999px' }
const btnInlineStyle = computed(() => {
  const s: Record<string, string> = {}
  const r = btn.value.border_radius
  if (r) s.borderRadius = RADIUS_MAP[r] || `${r}px`
  if (btnPadding.value) s.padding = `${btnPadding.value}px`
  return s
})

const quantity = ref(1)
const isAdding = ref(false)

const inStock = computed(() => {
  const p = product?.value
  if (!p) return false
  // Prefer the backend-computed `is_available` flag — it already honors the
  // shop's inventory_enabled setting and per-product track_stock. Falls back to
  // the legacy check for older payloads that don't yet expose this field.
  if (typeof p.is_available === 'boolean') return p.is_available
  if (!p.track_stock) return true
  return p.stock > 0
})

const stockUnlimited = computed(() => {
  const p = product?.value
  if (!p) return false
  if (typeof p.stock_unlimited === 'boolean') return p.stock_unlimited
  return !p.track_stock
})

function increaseQty() {
  const p = product?.value
  if (!p) return
  if (!stockUnlimited.value && quantity.value >= p.stock) return
  quantity.value++
}

function decreaseQty() {
  if (quantity.value > 1) quantity.value--
}

async function handleAddToCart() {
  const p = product?.value
  if (!p || !inStock.value) return

  isAdding.value = true
  try {
    await cart.addItem(p.uuid, quantity.value)
    toast.success(props.language === 'en' ? 'Added to cart' : 'Dodano do koszyka', {
      action: {
        label: props.language === 'en' ? 'View cart' : 'Zobacz koszyk',
        href: projectConfig?.value?.commerce?.routes?.cart || '/koszyk',
      },
    })
  } catch (err: any) {
    toast.error(err.message || (props.language === 'en' ? 'Failed to add to cart' : 'Nie udało się dodać'))
  } finally {
    isAdding.value = false
  }
}
</script>

<template>
  <div v-if="product" class="lcms-product-cart">
    <div v-if="inStock" class="lcms-product-cart__actions">
      <div v-if="showQuantity" class="lcms-product-cart__qty">
        <button type="button" class="lcms-product-cart__qty-btn" @click="decreaseQty" :disabled="quantity <= 1">−</button>
        <span class="lcms-product-cart__qty-value">{{ quantity }}</span>
        <button type="button" class="lcms-product-cart__qty-btn" @click="increaseQty">+</button>
      </div>

      <button
        type="button"
        class="lcms-button__link lcms-product-cart__add-btn"
        :class="[`lcms-button__link--${btnStyleClass}`, `lcms-button__link--size-${btnSizeClass}`]"
        :style="btnInlineStyle"
        :disabled="isAdding"
        @click="handleAddToCart"
      >
        <span v-if="isAdding" class="lcms-product-cart__spinner" />
        <template v-else-if="btnIcon">
          <span v-if="btnIsSvgIcon && btnIconPosition === 'left'" class="lcms-button__svg lcms-button__svg--left" v-html="btnSvgContent" />
          <i v-else-if="btnIconPosition === 'left'" :class="btnIcon" style="margin-right: 6px;" />
        </template>
        <svg v-else-if="!isAdding" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="lcms-product-cart__icon">
          <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
        {{ buttonText }}
        <template v-if="!isAdding && btnIcon">
          <span v-if="btnIsSvgIcon && btnIconPosition === 'right'" class="lcms-button__svg lcms-button__svg--right" v-html="btnSvgContent" />
          <i v-else-if="btnIconPosition === 'right'" :class="btnIcon" style="margin-left: 6px;" />
        </template>
      </button>
    </div>

    <div v-else class="lcms-product-cart__out-of-stock">
      {{ language === 'en' ? 'Out of stock' : 'Brak w magazynie' }}
    </div>
  </div>
</template>

<style scoped>
.lcms-product-cart {
  font-family: var(--lcms-font-body, system-ui, sans-serif);
}

.lcms-product-cart__actions {
  display: flex;
  gap: 1rem;
  align-items: stretch;
}

.lcms-product-cart__qty {
  display: flex;
  align-items: center;
  border: 1px solid var(--lcms-color-border, #d1d5db);
  border-radius: var(--lcms-border-radius, 0.375rem);
  overflow: hidden;
}

.lcms-product-cart__qty-btn {
  width: 2.5rem;
  height: 2.75rem;
  background: var(--lcms-color-background, white);
  border: none;
  cursor: pointer;
  font-size: 1.25rem;
  color: var(--lcms-color-text, #374151);
  display: flex;
  align-items: center;
  justify-content: center;
}

.lcms-product-cart__qty-btn:hover:not(:disabled) {
  background: var(--lcms-color-background-alt, #f3f4f6);
}

.lcms-product-cart__qty-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.lcms-product-cart__qty-value {
  min-width: 3rem;
  text-align: center;
  font-weight: 600;
}

.lcms-product-cart__add-btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border: none;
  cursor: pointer;
}

.lcms-product-cart__add-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.lcms-product-cart__icon {
  width: 1.25rem;
  height: 1.25rem;
}

.lcms-product-cart__spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: var(--lcms-color-white, #fff);
  border-radius: 50%;
  animation: lcms-product-cart-spin 0.8s linear infinite;
}

@keyframes lcms-product-cart-spin {
  to { transform: rotate(360deg); }
}

.lcms-product-cart__out-of-stock {
  padding: 0.75rem 1rem;
  background: rgba(239, 68, 68, 0.1);
  color: var(--lcms-color-danger, #ef4444);
  border-radius: var(--lcms-border-radius, 0.375rem);
  font-weight: 500;
  text-align: center;
}
</style>
