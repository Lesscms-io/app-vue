<script setup lang="ts">
/**
 * Ecommerce Icons Widget
 *
 * Group of icon triggers for header/toolbar:
 *   - cart: icon with item-count badge, toggles built-in dropdown preview
 *   - search: icon that toggles inline popover with search input + autocomplete
 *   - account: icon linking to customer account route
 *   - custom: icon + user-provided URL
 */

import { computed, ref, watch, inject, onMounted, onUnmounted, type Ref } from 'vue'
import { useCart } from '../../../composables/useCart'
import { useLanguage } from '../../../composables/useLanguage'
import { useStorefront } from '../../../composables/useStorefront'
import { formatPrice } from '../../../utils/currency'
import type { StorefrontProduct } from '../../../api/storefront'

defineOptions({ inheritAttrs: false })

interface Props {
  data: Record<string, any>
  language?: string
  settings?: Record<string, any>
}

interface Item {
  type: 'cart' | 'search' | 'account' | 'custom'
  icon?: string
  url?: string
  label?: string | Record<string, string>
  target_blank?: boolean
  highlighted?: boolean
}

const props = defineProps<Props>()

const cart = useCart()
const { extractValue } = useLanguage(props.language)
const { client } = useStorefront()
const projectConfig = inject<Ref<any> | null>('lesscms-project-config', null)

const config = computed(() => props.data?.config || {})
const iconGroup = computed(() => props.data?.icon || {})
const badgeGroup = computed(() => props.data?.badge || {})
const searchGroup = computed(() => props.data?.search || {})
const highlightGroup = computed(() => props.data?.highlight || {})

const items = computed<Item[]>(() => {
  const raw = props.data?.items
  return Array.isArray(raw) ? raw : []
})

const size = computed(() => Number(config.value.size) || 20)
const gap = computed(() => Number(config.value.gap) || 16)
// Docked mode: on mobile the whole icon group becomes a fixed bar glued to
// the bottom of the viewport (app-like tab bar) instead of wrapping under
// the logo inside the header.
const mobileDock = computed(() => config.value.mobile_dock === true)

const currency = computed(() => projectConfig?.value?.commerce?.currency || 'PLN')
const cartUrl = computed(() => projectConfig?.value?.commerce?.routes?.cart || '/koszyk')
const checkoutUrl = computed(() => projectConfig?.value?.commerce?.routes?.checkout || '/zamowienie')
const accountUrl = computed(() => projectConfig?.value?.commerce?.routes?.account || '/konto')
const searchPageUrl = computed(() =>
  projectConfig?.value?.commerce?.routes?.search || searchGroup.value.navigate_url || '/search'
)

const productUrl = (slug: string) => {
  const route = projectConfig?.value?.commerce?.routes?.product || '/produkt/:slug'
  return route.replace(':slug', slug)
}

const searchPlaceholder = computed(() =>
  extractValue(searchGroup.value.placeholder) ||
  (props.language === 'en' ? 'Search products...' : 'Szukaj produktów...')
)

function resolveColorValue(val: string | null | undefined): string | null {
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

const highlightPadding = computed(() => Number(highlightGroup.value.padding) || 12)
const highlightShape = computed(() => highlightGroup.value.shape || 'circle')

const cssVars = computed(() => {
  const vars: Record<string, string> = {
    '--lcms-ei-size': `${size.value}px`,
    '--lcms-ei-gap': `${gap.value}px`,
    '--lcms-ei-hl-padding': `${highlightPadding.value}px`,
    '--lcms-ei-hl-radius': highlightShape.value === 'square' ? '6px' : '9999px'
  }
  const c = resolveColorValue(iconGroup.value.color)
  const ch = resolveColorValue(iconGroup.value['color:hover'])
  const bb = resolveColorValue(badgeGroup.value.background)
  const bc = resolveColorValue(badgeGroup.value.color)
  const hb = resolveColorValue(highlightGroup.value.background)
  const hc = resolveColorValue(highlightGroup.value.color)
  if (c) vars['--lcms-ei-color'] = c
  if (ch) vars['--lcms-ei-color-hover'] = ch
  if (bb) vars['--lcms-ei-badge-bg'] = bb
  if (bc) vars['--lcms-ei-badge-color'] = bc
  if (hb) vars['--lcms-ei-hl-bg'] = hb
  if (hc) vars['--lcms-ei-hl-color'] = hc
  return vars
})

// Per-item open state (cart dropdown + search popover)
const openIndex = ref<number | null>(null)
const containerEl = ref<HTMLDivElement | null>(null)
const triggerEls = ref<HTMLButtonElement[]>([])
const dropdownPos = ref<{ top?: number; bottom?: number; right: number } | null>(null)

const dropdownStyle = computed<Record<string, string>>(() => {
  const pos = dropdownPos.value
  if (!pos) return {}
  const style: Record<string, string> = { position: 'fixed' }
  if (pos.bottom != null) {
    // Docked mode: panels open ABOVE the bottom bar and span the full
    // viewport width (anchoring to the icon clipped them off-screen).
    style.bottom = pos.bottom + 'px'
    style.top = 'auto'
    style.left = '8px'
    style.right = '8px'
    style.width = 'auto'
  } else {
    style.top = (pos.top ?? 0) + 'px'
    style.right = pos.right + 'px'
  }
  return style
})

function computeDropdownPos(index: number) {
  const btn = triggerEls.value[index]
  if (!btn) return null
  const r = btn.getBoundingClientRect()
  // Docked bar sits at the viewport bottom — panels open UPWARD from it.
  if (mobileDock.value && typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches) {
    return { bottom: window.innerHeight - r.top + 8, right: Math.max(8, window.innerWidth - r.right) }
  }
  return { top: r.bottom + 8, right: window.innerWidth - r.right }
}

// Search state (kept at widget level — only one search popover at a time)
const query = ref('')
const results = ref<StorefrontProduct[]>([])
const isLoading = ref(false)
const searchInputEl = ref<HTMLInputElement | null>(null)
let debounceTimer: ReturnType<typeof setTimeout> | null = null

watch(query, (newQuery) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  if (newQuery.length < 2) {
    results.value = []
    return
  }
  debounceTimer = setTimeout(async () => {
    if (!client.value) return
    isLoading.value = true
    try {
      const response = await client.value.searchProducts(newQuery, { per_page: 5 })
      results.value = response.data || []
    } catch {
      results.value = []
    } finally {
      isLoading.value = false
    }
  }, 300)
})

function getLabel(item: Item): string {
  return extractValue(item.label) || item.type
}

function handleItemClick(item: Item, index: number, e: MouseEvent) {
  if (item.type === 'cart') {
    e.stopPropagation()
    if (openIndex.value === index) {
      openIndex.value = null
      dropdownPos.value = null
    } else {
      openIndex.value = index
      dropdownPos.value = computeDropdownPos(index)
    }
    return
  }
  if (item.type === 'search') {
    e.stopPropagation()
    if (openIndex.value === index) {
      openIndex.value = null
      dropdownPos.value = null
    } else {
      openIndex.value = index
      dropdownPos.value = computeDropdownPos(index)
      requestAnimationFrame(() => searchInputEl.value?.focus())
    }
    return
  }
  if (item.type === 'account') {
    window.location.href = item.url || accountUrl.value
    return
  }
  // custom
  if (item.url) {
    if (item.target_blank) {
      window.open(item.url, '_blank', 'noopener')
    } else {
      window.location.href = item.url
    }
  }
}

function handleSearchSubmit(e: Event) {
  e.preventDefault()
  if (!query.value.trim()) return
  window.location.href = `${searchPageUrl.value}?q=${encodeURIComponent(query.value)}`
}

function handleClickOutside(e: MouseEvent) {
  if (containerEl.value && !containerEl.value.contains(e.target as Node)) {
    openIndex.value = null
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
  if (debounceTimer) clearTimeout(debounceTimer)
})
</script>

<template>
  <div ref="containerEl" class="lcms-ei" :class="{ 'lcms-ei--dock': mobileDock }" :style="cssVars">
    <div
      v-for="(item, index) in items"
      :key="index"
      class="lcms-ei__item"
    >
      <button
        :ref="(el) => { if (el) triggerEls[index] = el as HTMLButtonElement }"
        type="button"
        class="lcms-ei__trigger"
        :class="{ 'lcms-ei__trigger--highlighted': item.highlighted }"
        :aria-label="getLabel(item)"
        @click="(e) => handleItemClick(item, index, e)"
      >
        <i :class="item.icon || 'fa-solid fa-circle'" class="lcms-ei__icon" />
        <span
          v-if="item.type === 'cart' && cart.itemsCount.value > 0"
          class="lcms-ei__badge"
        >{{ cart.itemsCount.value }}</span>
      </button>

      <!-- Cart dropdown -->
      <Teleport to="body">
      <div
        v-if="item.type === 'cart' && openIndex === index && dropdownPos"
        class="lcms-ei__dropdown lcms-ei__dropdown--cart"
        :style="dropdownStyle"
        @click.stop
      >
        <div v-if="cart.isEmpty.value" class="lcms-ei__empty">
          {{ props.language === 'en' ? 'Your cart is empty' : 'Twój koszyk jest pusty' }}
        </div>
        <div v-else>
          <div class="lcms-ei__cart-items">
            <a
              v-for="ci in (cart.cart.value?.items || []).slice(0, 5)"
              :key="ci.uuid"
              :href="productUrl(ci.product.slug)"
              class="lcms-ei__cart-item"
            >
              <img v-if="ci.product.image" :src="ci.product.image" :alt="ci.product.name">
              <div class="lcms-ei__cart-info">
                <div class="lcms-ei__cart-name">{{ ci.product.name }}</div>
                <div class="lcms-ei__cart-meta">
                  {{ ci.quantity }} × {{ formatPrice(ci.unit_price, currency) }}
                </div>
              </div>
            </a>
          </div>
          <div class="lcms-ei__cart-total">
            <span>{{ props.language === 'en' ? 'Total' : 'Razem' }}</span>
            <strong>{{ formatPrice(cart.total.value, currency) }}</strong>
          </div>
          <div class="lcms-ei__cart-actions">
            <a :href="cartUrl" class="lcms-ei__btn lcms-ei__btn--secondary">
              {{ props.language === 'en' ? 'View cart' : 'Zobacz koszyk' }}
            </a>
            <a :href="checkoutUrl" class="lcms-ei__btn lcms-ei__btn--primary">
              {{ props.language === 'en' ? 'Checkout' : 'Do kasy' }}
            </a>
          </div>
        </div>
      </div>
      </Teleport>

      <!-- Search popover -->
      <Teleport to="body">
      <div
        v-if="item.type === 'search' && openIndex === index && dropdownPos"
        class="lcms-ei__dropdown lcms-ei__dropdown--search"
        :style="dropdownStyle"
        @click.stop
      >
        <form class="lcms-ei__search-form" @submit="handleSearchSubmit">
          <input
            ref="searchInputEl"
            v-model="query"
            type="search"
            class="lcms-ei__search-input"
            :placeholder="searchPlaceholder"
          >
          <button type="submit" class="lcms-ei__search-submit" :aria-label="searchPlaceholder">
            <i :class="item.icon || 'fa-solid fa-magnifying-glass'" />
          </button>
        </form>

        <div v-if="isLoading" class="lcms-ei__state">...</div>

        <div v-else-if="results.length > 0" class="lcms-ei__search-results">
          <a
            v-for="product in results"
            :key="product.uuid"
            :href="productUrl(product.slug || product.sku || product.uuid)"
            class="lcms-ei__search-result"
          >
            <img v-if="product.image" :src="product.image" :alt="product.name">
            <div class="lcms-ei__search-info">
              <div class="lcms-ei__search-name">{{ product.name }}</div>
              <div class="lcms-ei__search-price">{{ formatPrice(product.price, currency) }}</div>
            </div>
          </a>
        </div>
      </div>
      </Teleport>
    </div>
  </div>
</template>

<style scoped>
.lcms-ei {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--lcms-ei-gap, 16px);
  font-family: var(--lcms-font-body, system-ui, sans-serif);
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

/* Docked mode: fixed bottom tab-bar on mobile. Desktop is untouched. */
@media (max-width: 767px) {
  .lcms-ei--dock {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1200;
    display: flex;
    flex-wrap: nowrap;
    justify-content: space-around;
    padding: 10px 16px calc(10px + env(safe-area-inset-bottom, 0px));
    margin: 0;
    background: var(--lcms-color-background, #fff);
    border-top: 1px solid color-mix(in srgb, var(--lcms-color-text, #1f2937) 12%, transparent);
    box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.08);
  }
}

.lcms-ei *,
.lcms-ei *::before,
.lcms-ei *::after {
  box-sizing: border-box;
}

.lcms-ei__item {
  position: relative;
  display: inline-block;
}

.lcms-ei__trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.375rem;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--lcms-ei-color, var(--lcms-color-text, #1f2937));
  transition: color 0.15s;
  position: relative;
}

.lcms-ei__trigger:hover {
  color: var(--lcms-ei-color-hover, var(--lcms-color-primary, #3b82f6));
}

.lcms-ei__trigger--highlighted {
  background: var(--lcms-ei-hl-bg, var(--lcms-color-background-alt, #f1f3f5));
  padding: var(--lcms-ei-hl-padding, 12px);
  border-radius: var(--lcms-ei-hl-radius, 9999px);
  color: var(--lcms-ei-hl-color, var(--lcms-ei-color, var(--lcms-color-text, #1f2937)));
}

.lcms-ei__icon {
  font-size: var(--lcms-ei-size, 20px);
  line-height: 1;
}

.lcms-ei__badge {
  position: absolute;
  top: 0;
  right: 0;
  transform: translateY(-20%);
  min-width: 1.125rem;
  height: 1.125rem;
  padding: 0 0.25rem;
  background: var(--lcms-ei-badge-bg, var(--lcms-color-primary, #3b82f6));
  color: var(--lcms-ei-badge-color, var(--lcms-color-white, #fff));
  font-size: 0.6875rem;
  font-weight: 700;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

/* Dropdowns (cart + search) */
.lcms-ei__dropdown {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  max-width: calc(100vw - 16px);
  background: var(--lcms-color-background, #ffffff);
  border: 1px solid var(--lcms-color-border, #e5e7eb);
  border-radius: var(--lcms-border-radius, 0.5rem);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  overflow: hidden;
}

.lcms-ei__dropdown--cart { width: 22rem; }
.lcms-ei__dropdown--search { width: 22rem; }

.lcms-ei__empty {
  padding: 2rem 1rem;
  text-align: center;
  color: var(--lcms-color-muted, #6b7280);
  font-size: 0.875rem;
}

.lcms-ei__state {
  padding: 1rem;
  text-align: center;
  color: var(--lcms-color-muted, #6b7280);
  font-size: 0.875rem;
}

/* Cart items */
.lcms-ei__cart-items { max-height: 320px; overflow-y: auto; }

.lcms-ei__cart-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  text-decoration: none;
  color: inherit;
  border-bottom: 1px solid var(--lcms-color-border, #f3f4f6);
}

.lcms-ei__cart-item img {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 0.25rem;
}

.lcms-ei__cart-info { flex: 1; min-width: 0; }

.lcms-ei__cart-name {
  font-size: 0.875rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lcms-ei__cart-meta { font-size: 0.75rem; color: var(--lcms-color-muted, #6b7280); }

.lcms-ei__cart-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.875rem 1rem;
  background: var(--lcms-color-background-alt, #f9fafb);
  border-top: 1px solid var(--lcms-color-border, #e5e7eb);
  font-size: 0.9375rem;
}

.lcms-ei__cart-actions { display: flex; gap: 0.5rem; padding: 0.75rem 1rem; }

.lcms-ei__btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 0.75rem;
  border-radius: var(--lcms-btn-border-radius, 0.375rem);
  font-size: 0.8125rem;
  font-weight: 600;
  text-decoration: none;
  border: 1px solid transparent;
}

.lcms-ei__btn--primary {
  background: var(--lcms-color-primary, #3b82f6);
  color: var(--lcms-color-white, #fff);
}

.lcms-ei__btn--secondary {
  background: #fff;
  color: var(--lcms-color-text, #1f2937);
  border-color: var(--lcms-color-border, #d1d5db);
}

/* Search popover */
.lcms-ei__search-form {
  display: flex;
  align-items: center;
  padding: 0.5rem;
  border-bottom: 1px solid var(--lcms-color-border, #e5e7eb);
}

.lcms-ei__search-input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  padding: 0.5rem 0.75rem;
  font: inherit;
  color: var(--lcms-color-text, #1f2937);
  background: transparent;
}

.lcms-ei__search-submit {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  color: var(--lcms-color-muted, #6b7280);
}

.lcms-ei__search-results { max-height: 320px; overflow-y: auto; }

.lcms-ei__search-result {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 0.75rem;
  text-decoration: none;
  color: inherit;
  border-bottom: 1px solid var(--lcms-color-border, #f3f4f6);
}

.lcms-ei__search-result:hover { background: var(--lcms-color-background-alt, #f9fafb); }

.lcms-ei__search-result img {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 0.25rem;
}

.lcms-ei__search-info { flex: 1; min-width: 0; }
.lcms-ei__search-name { font-size: 0.875rem; }
.lcms-ei__search-price { font-size: 0.75rem; color: var(--lcms-color-muted, #6b7280); }
</style>
