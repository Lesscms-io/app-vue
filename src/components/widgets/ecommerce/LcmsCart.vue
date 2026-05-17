<script setup lang="ts">
/**
 * Cart Widget (E-commerce)
 *
 * Full cart page with items, quantity controls, totals, checkout button.
 */

import { computed, inject, reactive, type Ref } from 'vue'
import { useLanguage } from '../../../composables/useLanguage'
import { useCart } from '../../../composables/useCart'
import { useToast } from '../../../composables/useToast'
import { formatPrice } from '../../../utils/currency'

defineOptions({ inheritAttrs: false })

interface Props {
  data: Record<string, any>
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const { extractValue } = useLanguage(props.language)
const cart = useCart()
const toast = useToast()
const projectConfig = inject<Ref<any> | null>('lesscms-project-config', null)

const headingText = computed(() =>
  extractValue(props.data?.heading?.text) || (props.language === 'en' ? 'Your cart' : 'Twój koszyk')
)
const emptyMessage = computed(() =>
  extractValue(props.data?.empty_message?.text) || (props.language === 'en' ? 'Your cart is empty' : 'Twój koszyk jest pusty')
)
const checkoutButtonText = computed(() =>
  extractValue(props.data?.checkout_button?.text) || (props.language === 'en' ? 'Proceed to checkout' : 'Przejdź do kasy')
)
const continueShoppingText = computed(() =>
  extractValue(props.data?.continue_shopping?.text) || (props.language === 'en' ? 'Continue shopping' : 'Kontynuuj zakupy')
)

const currency = computed(() => projectConfig?.value?.commerce?.currency || 'PLN')

const productUrl = (slug: string) => {
  const route = projectConfig?.value?.commerce?.routes?.product || '/produkt/:slug'
  return route.replace(':slug', slug)
}

const checkoutUrl = computed(() => projectConfig?.value?.commerce?.routes?.checkout || '/zamowienie')
const continueUrl = computed(() => props.data?.config?.empty_redirect || '/')

const t = (key: string) => {
  const lang = props.language || 'pl'
  const dict: Record<string, Record<string, string>> = {
    pl: {
      summary: 'Podsumowanie',
      subtotal: 'Suma częściowa',
      shipping: 'Wysyłka',
      shippingCalc: 'Obliczana w kasie',
      discount: 'Rabat',
      total: 'Razem',
      itemsCount: 'produktów',
      remove: 'Usuń',
      updateError: 'Nie udało się zaktualizować',
      removeError: 'Nie udało się usunąć',
      removed: 'Usunięto z koszyka',
      editAlbum: 'Edytuj projekt albumu',
      showOptions: 'Pokaż opcje',
      hideOptions: 'Ukryj opcje',
    },
    en: {
      summary: 'Summary',
      subtotal: 'Subtotal',
      shipping: 'Shipping',
      shippingCalc: 'Calculated at checkout',
      discount: 'Discount',
      total: 'Total',
      itemsCount: 'items',
      remove: 'Remove',
      updateError: 'Failed to update',
      removeError: 'Failed to remove',
      removed: 'Removed from cart',
      editAlbum: 'Edit album',
      showOptions: 'Show options',
      hideOptions: 'Hide options',
    },
  }
  return dict[lang]?.[key] || dict.pl[key] || key
}

// Normalize configured options into a uniform [{label, value}] list so the
// row template doesn't branch on producer.
//
// LcmsProductConfigurator.handleAddToCart writes an array of
//   { group_name, option_name, value, type, price_delta, ... }
// AlbumReturn (photo-albums plugin) writes a Record<group_code, option_label>.
// Both should render the same way in the cart row.
interface ConfiguredRow { label: string; value: string }
function normalizedConfiguredOptions(metadata: any): ConfiguredRow[] {
  const raw = metadata?.configured_options
  if (!raw) return []
  if (Array.isArray(raw)) {
    return raw
      .map((opt: any): ConfiguredRow | null => {
        const label = String(opt?.group_name ?? opt?.group_uuid ?? '').trim()
        let value: string
        if (opt?.type === 'option') value = String(opt?.option_name ?? opt?.option_uuid ?? '')
        else if (opt?.type === 'checkbox') value = String(opt?.checkbox_label ?? 'TAK')
        else if (opt?.type === 'numeric') value = String(opt?.value ?? '')
        else if (opt?.type === 'file') {
          const files = Array.isArray(opt?.files_meta) ? opt.files_meta : []
          value = files.map((f: any) => f?.name).filter(Boolean).join(', ') || `${files.length} plik(i)`
        } else value = String(opt?.value ?? '')
        if (!label || !value) return null
        return { label, value }
      })
      .filter((x): x is ConfiguredRow => x !== null)
  }
  if (typeof raw === 'object') {
    return Object.entries(raw)
      .map(([k, v]): ConfiguredRow => ({ label: String(k), value: String(v) }))
      .filter((row) => row.label && row.value)
  }
  return []
}

// Per-item expanded state for the configured-options list. Collapsed by
// default so the cart row stays short — the customer rarely needs the
// full options dump and a 15-line album spec was pushing the image and
// qty controls into the middle of the row.
const expandedOptions = reactive<Record<string, boolean>>({})
function toggleOptions(itemUuid: string) {
  expandedOptions[itemUuid] = !expandedOptions[itemUuid]
}

// Photo-albums plugin tags its cart items with album_id; the cart row
// surfaces an "Edytuj projekt albumu" link back to AlbumReturn so the
// customer can jump to the designer without retracing the configurator
// flow.
function albumEditUrl(metadata: any): string | null {
  if (!metadata) return null
  if (metadata.plugin_id !== 'photo-albums') return null
  const id = metadata.album_id
  if (!id || typeof id !== 'string') return null
  return `/konto/albumy/${encodeURIComponent(id)}/return`
}

async function handleUpdate(itemUuid: string, qty: number) {
  try {
    await cart.updateItem(itemUuid, qty)
  } catch {
    toast.error(t('updateError'))
  }
}

async function handleRemove(itemUuid: string) {
  try {
    await cart.removeItem(itemUuid)
    toast.success(t('removed'))
  } catch {
    toast.error(t('removeError'))
  }
}

function handleCheckout() {
  window.location.href = checkoutUrl.value
}
</script>

<template>
  <div class="lcms-cart">
    <h2 class="lcms-cart__heading">{{ headingText }}</h2>

    <!-- Initial fetch — avoid flashing "cart is empty" before the real state arrives. -->
    <div v-if="!cart.hasInitialized.value || cart.isLoading.value" class="lcms-cart__loading">
      <div class="lcms-cart__spinner" aria-hidden="true" />
    </div>

    <div v-else-if="cart.isEmpty.value" class="lcms-cart__empty">
      <svg class="lcms-cart__empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
      <p class="lcms-cart__empty-text">{{ emptyMessage }}</p>
      <a :href="continueUrl" class="lcms-cart__btn lcms-cart__btn--primary">
        {{ continueShoppingText }}
      </a>
    </div>

    <div v-else class="lcms-cart__layout">
      <!-- Items list -->
      <div class="lcms-cart__items">
        <div
          v-for="item in cart.cart.value?.items || []"
          :key="item.uuid"
          class="lcms-cart__item"
          :class="{ 'lcms-cart__item--expanded': expandedOptions[item.uuid] }"
        >
          <a :href="productUrl(item.product.slug)" class="lcms-cart__item-image-link">
            <img
              v-if="item.product.image"
              :src="item.product.image"
              :alt="item.product.name"
              class="lcms-cart__item-image"
            />
            <div v-else class="lcms-cart__item-image-placeholder">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
            </div>
          </a>

          <div class="lcms-cart__item-info">
            <a :href="productUrl(item.product.slug)" class="lcms-cart__item-name">
              {{ item.product.name }}
            </a>
            <div class="lcms-cart__item-sku">{{ item.product.sku }}</div>
            <button
              v-if="normalizedConfiguredOptions(item.metadata).length > 0"
              type="button"
              class="lcms-cart__item-options-toggle"
              :aria-expanded="!!expandedOptions[item.uuid]"
              @click="toggleOptions(item.uuid)"
            >
              {{ expandedOptions[item.uuid] ? t('hideOptions') : t('showOptions') }}
              <span class="lcms-cart__item-options-count">
                ({{ normalizedConfiguredOptions(item.metadata).length }})
              </span>
            </button>
            <ul
              v-if="expandedOptions[item.uuid] && normalizedConfiguredOptions(item.metadata).length > 0"
              class="lcms-cart__item-options"
            >
              <li
                v-for="(opt, idx) in normalizedConfiguredOptions(item.metadata)"
                :key="idx"
              >
                <span class="lcms-cart__item-option-label">{{ opt.label }}:</span>
                <span class="lcms-cart__item-option-value">{{ opt.value }}</span>
              </li>
            </ul>
            <a
              v-if="albumEditUrl(item.metadata)"
              :href="albumEditUrl(item.metadata)!"
              class="lcms-cart__item-album-link"
            >
              {{ t('editAlbum') }}
            </a>
            <div class="lcms-cart__item-price">{{ formatPrice(item.unit_price, currency) }}</div>
          </div>

          <div class="lcms-cart__item-actions">
            <div class="lcms-cart__qty-control">
              <button
                type="button"
                class="lcms-cart__qty-btn"
                :disabled="item.quantity <= 1"
                @click="handleUpdate(item.uuid, item.quantity - 1)"
              >−</button>
              <span class="lcms-cart__qty-value">{{ item.quantity }}</span>
              <button
                type="button"
                class="lcms-cart__qty-btn"
                @click="handleUpdate(item.uuid, item.quantity + 1)"
              >+</button>
            </div>

            <div class="lcms-cart__item-subtotal">
              {{ formatPrice(item.subtotal, currency) }}
            </div>

            <button
              type="button"
              class="lcms-cart__item-remove"
              :title="t('remove')"
              :aria-label="t('remove')"
              @click="handleRemove(item.uuid)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Summary -->
      <aside class="lcms-cart__summary">
        <h3 class="lcms-cart__summary-title">{{ t('summary') }}</h3>

        <div class="lcms-cart__summary-row">
          <span>{{ t('subtotal') }} ({{ cart.cart.value?.totals.items_count || 0 }} {{ t('itemsCount') }})</span>
          <span>{{ formatPrice(cart.cart.value?.totals.subtotal || 0, currency) }}</span>
        </div>

        <div v-if="cart.cart.value && cart.cart.value.totals.discount > 0" class="lcms-cart__summary-row lcms-cart__summary-row--discount">
          <span>{{ t('discount') }}</span>
          <span>−{{ formatPrice(cart.cart.value.totals.discount, currency) }}</span>
        </div>

        <div class="lcms-cart__summary-row">
          <span>{{ t('shipping') }}</span>
          <span v-if="cart.cart.value && cart.cart.value.totals.shipping_cost > 0">
            {{ formatPrice(cart.cart.value.totals.shipping_cost, currency) }}
          </span>
          <span v-else class="lcms-cart__shipping-info">{{ t('shippingCalc') }}</span>
        </div>

        <div class="lcms-cart__summary-divider" />

        <div class="lcms-cart__summary-row lcms-cart__summary-row--total">
          <span>{{ t('total') }}</span>
          <span>{{ formatPrice(cart.cart.value?.totals.total || 0, currency) }}</span>
        </div>

        <button
          type="button"
          class="lcms-cart__btn lcms-cart__btn--primary lcms-cart__checkout-btn"
          :disabled="cart.isLoading.value"
          @click="handleCheckout"
        >
          {{ checkoutButtonText }}
        </button>

        <a :href="continueUrl" class="lcms-cart__continue-link">
          {{ continueShoppingText }}
        </a>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.lcms-cart {
  font-family: var(--lcms-font-body, system-ui, sans-serif);
  color: var(--lcms-color-text, #1f2937);
}

.lcms-cart__heading {
  font-family: var(--lcms-font-heading, var(--lcms-font-body));
  font-size: var(--lcms-h1-font-size, 2.25rem);
  font-weight: var(--lcms-h1-font-weight, 700);
  color: var(--lcms-h1-color, var(--lcms-color-text));
  margin: 0 0 var(--lcms-section-gap, 2rem);
}

/* Loading state — shown during the initial cart fetch so the customer does not
   see a momentary "cart is empty" flash before real data arrives. */
.lcms-cart__loading {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 6rem 1rem;
}

.lcms-cart__spinner {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 3px solid var(--lcms-color-border, #e5e7eb);
  border-top-color: var(--lcms-color-primary, #3d2b1f);
  animation: lcms-cart-spin 0.8s linear infinite;
}

@keyframes lcms-cart-spin {
  to { transform: rotate(360deg); }
}

/* Empty state */
.lcms-cart__empty {
  text-align: center;
  padding: 4rem 1rem;
}

.lcms-cart__empty-icon {
  width: 80px;
  height: 80px;
  color: var(--lcms-color-muted, #d1d5db);
  margin: 0 auto 1rem;
}

.lcms-cart__empty-text {
  font-size: 1.125rem;
  color: var(--lcms-color-muted, #6b7280);
  margin: 0 0 1.5rem;
}

/* Layout */
.lcms-cart__layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
}

@media (min-width: 1024px) {
  .lcms-cart__layout {
    grid-template-columns: 1fr 360px;
  }
}

/* Items */
.lcms-cart__items {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.lcms-cart__item {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 1rem;
  padding: 1rem;
  background: var(--lcms-color-background, #ffffff);
  border: 1px solid var(--lcms-color-border, #e5e7eb);
  border-radius: var(--lcms-border-radius, 0.5rem);
}

@media (min-width: 640px) {
  .lcms-cart__item {
    grid-template-columns: auto 1fr auto;
    align-items: center;
  }
  /* When the configured-options list is open the row gets tall; switching
   * to top alignment keeps image + qty pinned to the row's top instead of
   * floating in the middle of a long options dump. */
  .lcms-cart__item--expanded {
    align-items: flex-start;
  }
}

.lcms-cart__item-image-link {
  display: block;
  width: 96px;
  height: 96px;
  border-radius: 0.375rem;
  overflow: hidden;
  background: var(--lcms-color-background-alt, #f9fafb);
  flex-shrink: 0;
}

.lcms-cart__item-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.lcms-cart__item-image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--lcms-color-muted, #d1d5db);
}

.lcms-cart__item-image-placeholder svg {
  width: 32px;
  height: 32px;
}

.lcms-cart__item-info {
  min-width: 0;
}

.lcms-cart__item-name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--lcms-color-text, #1f2937);
  text-decoration: none;
  display: block;
  margin-bottom: 0.25rem;
}

.lcms-cart__item-name:hover {
  color: var(--lcms-color-primary, #3b82f6);
}

.lcms-cart__item-sku {
  font-size: 0.75rem;
  color: var(--lcms-color-muted, #6b7280);
  margin-bottom: 0.5rem;
}

.lcms-cart__item-options-toggle {
  /* block so the plugin-supplied "Edytuj projekt albumu" link (rendered right
     after this toggle in the cart line) lands on its own line — they used to
     run into each other on the same row. */
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background: transparent;
  border: none;
  padding: 0;
  margin: 0 0 0.5rem;
  font: inherit;
  font-size: 0.8125rem;
  color: var(--lcms-color-primary, #3b82f6);
  cursor: pointer;
  text-decoration: underline;
  width: fit-content;
}

.lcms-cart__item-options-toggle:hover {
  text-decoration: none;
}

.lcms-cart__item-options-count {
  color: var(--lcms-color-muted, #6b7280);
  text-decoration: none;
}

.lcms-cart__item-options {
  list-style: none;
  margin: 0 0 0.5rem;
  padding: 0;
  font-size: 0.8125rem;
  line-height: 1.45;
  color: var(--lcms-color-muted, #6b7280);
}

.lcms-cart__item-options li {
  margin: 0;
}

.lcms-cart__item-option-label {
  margin-right: 0.25rem;
}

.lcms-cart__item-option-value {
  color: var(--lcms-color-text, #4b5563);
}

.lcms-cart__item-album-link {
  display: block;
  width: fit-content;
  margin: 0.25rem 0 0.5rem;
  font-size: 0.8125rem;
  color: var(--lcms-color-primary, #3b82f6);
  text-decoration: underline;
}

.lcms-cart__item-album-link:hover {
  text-decoration: none;
}

.lcms-cart__item-price {
  font-size: 0.875rem;
  color: var(--lcms-color-text, #4b5563);
}

.lcms-cart__item-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  grid-column: 1 / -1;
}

@media (min-width: 640px) {
  .lcms-cart__item-actions {
    grid-column: auto;
  }
}

.lcms-cart__qty-control {
  display: flex;
  align-items: center;
  border: 1px solid var(--lcms-color-border, #d1d5db);
  border-radius: 0.375rem;
  overflow: hidden;
}

.lcms-cart__qty-btn {
  width: 2rem;
  height: 2.25rem;
  background: var(--lcms-color-background, white);
  border: none;
  cursor: pointer;
  font-size: 1.125rem;
  color: var(--lcms-color-text, #374151);
}

.lcms-cart__qty-btn:hover:not(:disabled) {
  background: var(--lcms-color-background-alt, #f3f4f6);
}

.lcms-cart__qty-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.lcms-cart__qty-value {
  min-width: 2.5rem;
  text-align: center;
  font-weight: 600;
  font-size: 0.875rem;
}

.lcms-cart__item-subtotal {
  font-weight: 700;
  font-size: 1rem;
  color: var(--lcms-color-text, #1f2937);
  min-width: 5rem;
  text-align: right;
}

.lcms-cart__item-remove {
  background: transparent;
  border: 1px solid var(--lcms-color-border, #e5e7eb);
  color: var(--lcms-color-muted, #6b7280);
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.375rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.lcms-cart__item-remove:hover {
  border-color: var(--lcms-color-danger, #ef4444);
  color: var(--lcms-color-danger, #ef4444);
  background: rgba(239, 68, 68, 0.05);
}

.lcms-cart__item-remove svg {
  width: 1rem;
  height: 1rem;
}

/* Summary */
.lcms-cart__summary {
  background: var(--lcms-color-background, #ffffff);
  border: 1px solid var(--lcms-color-border, #e5e7eb);
  border-radius: var(--lcms-border-radius, 0.5rem);
  padding: 1.5rem;
  position: sticky;
  top: 1rem;
  align-self: start;
}

.lcms-cart__summary-title {
  font-family: var(--lcms-font-heading, var(--lcms-font-body));
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 1rem;
}

.lcms-cart__summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  font-size: 0.875rem;
}

.lcms-cart__summary-row--discount {
  color: var(--lcms-color-success, #10b981);
}

.lcms-cart__shipping-info {
  font-style: italic;
  color: var(--lcms-color-muted, #6b7280);
  font-size: 0.8125rem;
}

.lcms-cart__summary-divider {
  height: 1px;
  background: var(--lcms-color-border, #e5e7eb);
  margin: 0.75rem 0;
}

.lcms-cart__summary-row--total {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--lcms-color-text, #111827);
  padding-top: 0.5rem;
}

.lcms-cart__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--lcms-btn-padding, 0.875rem 1.5rem);
  border-radius: var(--lcms-btn-border-radius, var(--lcms-border-radius, 0.5rem));
  font-size: var(--lcms-btn-font-size, 1rem);
  font-weight: var(--lcms-btn-font-weight, 600);
  font-family: var(--lcms-font-button, var(--lcms-font-body));
  text-decoration: none;
  border: none;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.1s;
}

.lcms-cart__btn--primary {
  background: var(--lcms-color-primary, #3b82f6);
  color: var(--lcms-color-white, #ffffff);
}

.lcms-cart__btn--primary:hover:not(:disabled) {
  opacity: 0.9;
}

.lcms-cart__btn--primary:active:not(:disabled) {
  transform: scale(0.98);
}

.lcms-cart__btn--primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.lcms-cart__checkout-btn {
  width: 100%;
  margin-top: 1rem;
}

.lcms-cart__continue-link {
  display: block;
  text-align: center;
  margin-top: 0.75rem;
  font-size: 0.875rem;
  color: var(--lcms-color-link, var(--lcms-color-primary, #3b82f6));
  text-decoration: none;
}

.lcms-cart__continue-link:hover {
  text-decoration: underline;
}
</style>
