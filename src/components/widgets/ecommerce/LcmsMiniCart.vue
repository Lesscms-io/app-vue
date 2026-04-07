<script setup lang="ts">
/**
 * Mini Cart Widget (E-commerce)
 *
 * Header cart icon with badge counter, optional dropdown preview.
 */

import { computed, ref, inject, onMounted, onUnmounted, type Ref } from 'vue'
import { useCart } from '../../../composables/useCart'
import { formatPrice } from '../../../utils/currency'

defineOptions({ inheritAttrs: false })

interface Props {
  data: Record<string, any>
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const cart = useCart()
const projectConfig = inject<Ref<any> | null>('lesscms-project-config', null)

const config = computed(() => props.data?.config || props.data || {})
const styleVariant = computed(() => config.value.style || 'icon-badge')
const showTotal = computed(() => config.value.show_total !== false)
const clickAction = computed(() => config.value.click_action || 'dropdown')

const isOpen = ref(false)
const containerEl = ref<HTMLDivElement | null>(null)

const currency = computed(() => projectConfig?.value?.commerce?.currency || 'PLN')
const cartUrl = computed(() => projectConfig?.value?.commerce?.routes?.cart || '/koszyk')
const checkoutUrl = computed(() => projectConfig?.value?.commerce?.routes?.checkout || '/zamowienie')
const productUrl = (slug: string) => {
  const route = projectConfig?.value?.commerce?.routes?.product || '/produkt/:slug'
  return route.replace(':slug', slug)
}

const t = (key: string) => {
  const lang = props.language || 'pl'
  const dict: Record<string, Record<string, string>> = {
    pl: { cart: 'Koszyk', empty: 'Twój koszyk jest pusty', total: 'Razem', viewCart: 'Zobacz koszyk', checkout: 'Do kasy' },
    en: { cart: 'Cart', empty: 'Your cart is empty', total: 'Total', viewCart: 'View cart', checkout: 'Checkout' },
  }
  return dict[lang]?.[key] || dict.pl[key] || key
}

function handleClick(e: MouseEvent) {
  if (clickAction.value === 'navigate') {
    window.location.href = cartUrl.value
    return
  }
  e.stopPropagation()
  isOpen.value = !isOpen.value
}

function handleClickOutside(e: MouseEvent) {
  if (containerEl.value && !containerEl.value.contains(e.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => {
  if (typeof document !== 'undefined') {
    document.addEventListener('click', handleClickOutside)
  }
})

onUnmounted(() => {
  if (typeof document !== 'undefined') {
    document.removeEventListener('click', handleClickOutside)
  }
})
</script>

<template>
  <div ref="containerEl" class="lcms-mini-cart" :class="`lcms-mini-cart--${styleVariant}`">
    <button
      type="button"
      class="lcms-mini-cart__trigger"
      :aria-label="t('cart')"
      @click="handleClick"
    >
      <svg class="lcms-mini-cart__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>

      <span v-if="cart.itemsCount.value > 0" class="lcms-mini-cart__badge">{{ cart.itemsCount.value }}</span>

      <span v-if="styleVariant === 'icon-text'" class="lcms-mini-cart__label">{{ t('cart') }}</span>

      <span v-if="showTotal && styleVariant !== 'icon-only' && cart.itemsCount.value > 0" class="lcms-mini-cart__total">
        {{ formatPrice(cart.total.value, currency) }}
      </span>
    </button>

    <div v-if="isOpen && clickAction === 'dropdown'" class="lcms-mini-cart__dropdown" @click.stop>
      <div v-if="cart.isEmpty.value" class="lcms-mini-cart__empty">
        {{ t('empty') }}
      </div>

      <div v-else>
        <div class="lcms-mini-cart__items">
          <a
            v-for="item in (cart.cart.value?.items || []).slice(0, 5)"
            :key="item.uuid"
            :href="productUrl(item.product.slug)"
            class="lcms-mini-cart__item"
          >
            <img v-if="item.product.image" :src="item.product.image" :alt="item.product.name" />
            <div class="lcms-mini-cart__item-info">
              <div class="lcms-mini-cart__item-name">{{ item.product.name }}</div>
              <div class="lcms-mini-cart__item-meta">
                {{ item.quantity }} × {{ formatPrice(item.unit_price, currency) }}
              </div>
            </div>
          </a>
        </div>

        <div class="lcms-mini-cart__total-row">
          <span>{{ t('total') }}</span>
          <strong>{{ formatPrice(cart.total.value, currency) }}</strong>
        </div>

        <div class="lcms-mini-cart__actions">
          <a :href="cartUrl" class="lcms-mini-cart__btn lcms-mini-cart__btn--secondary">
            {{ t('viewCart') }}
          </a>
          <a :href="checkoutUrl" class="lcms-mini-cart__btn lcms-mini-cart__btn--primary">
            {{ t('checkout') }}
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lcms-mini-cart {
  position: relative;
  display: inline-block;
  font-family: var(--lcms-font-body, system-ui, sans-serif);
}

.lcms-mini-cart__trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--lcms-color-text, #1f2937);
  font-family: inherit;
  font-size: 0.875rem;
  position: relative;
}

.lcms-mini-cart__trigger:hover {
  color: var(--lcms-color-primary, #3b82f6);
}

.lcms-mini-cart__icon {
  width: 1.5rem;
  height: 1.5rem;
}

.lcms-mini-cart__badge {
  position: absolute;
  top: 0;
  left: 1.25rem;
  min-width: 1.125rem;
  height: 1.125rem;
  padding: 0 0.25rem;
  background: var(--lcms-color-primary, #3b82f6);
  color: var(--lcms-color-white, #fff);
  font-size: 0.6875rem;
  font-weight: 700;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.lcms-mini-cart__label {
  font-weight: 500;
}

.lcms-mini-cart__total {
  font-weight: 600;
  color: var(--lcms-color-text, #1f2937);
}

/* Dropdown */
.lcms-mini-cart__dropdown {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  width: 22rem;
  background: var(--lcms-color-background, #ffffff);
  border: 1px solid var(--lcms-color-border, #e5e7eb);
  border-radius: var(--lcms-border-radius, 0.5rem);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  overflow: hidden;
}

.lcms-mini-cart__empty {
  padding: 2rem 1rem;
  text-align: center;
  color: var(--lcms-color-muted, #6b7280);
  font-size: 0.875rem;
}

.lcms-mini-cart__items {
  max-height: 320px;
  overflow-y: auto;
}

.lcms-mini-cart__item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  text-decoration: none;
  color: inherit;
  border-bottom: 1px solid var(--lcms-color-border, #f3f4f6);
}

.lcms-mini-cart__item:hover {
  background: var(--lcms-color-background-alt, #f9fafb);
}

.lcms-mini-cart__item img {
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: 0.25rem;
  flex-shrink: 0;
}

.lcms-mini-cart__item-info {
  flex: 1;
  min-width: 0;
}

.lcms-mini-cart__item-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--lcms-color-text, #1f2937);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lcms-mini-cart__item-meta {
  font-size: 0.75rem;
  color: var(--lcms-color-muted, #6b7280);
  margin-top: 0.125rem;
}

.lcms-mini-cart__total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.875rem 1rem;
  background: var(--lcms-color-background-alt, #f9fafb);
  border-top: 1px solid var(--lcms-color-border, #e5e7eb);
  font-size: 0.9375rem;
}

.lcms-mini-cart__actions {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
}

.lcms-mini-cart__btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.625rem 0.875rem;
  border-radius: var(--lcms-btn-border-radius, 0.375rem);
  font-size: 0.8125rem;
  font-weight: 600;
  text-decoration: none;
  border: 1px solid transparent;
  transition: opacity 0.15s, background 0.15s;
}

.lcms-mini-cart__btn--primary {
  background: var(--lcms-color-primary, #3b82f6);
  color: var(--lcms-color-white, #fff);
}

.lcms-mini-cart__btn--primary:hover {
  opacity: 0.9;
}

.lcms-mini-cart__btn--secondary {
  background: var(--lcms-color-background, white);
  color: var(--lcms-color-text, #1f2937);
  border-color: var(--lcms-color-border, #d1d5db);
}

.lcms-mini-cart__btn--secondary:hover {
  background: var(--lcms-color-background-alt, #f3f4f6);
}
</style>
