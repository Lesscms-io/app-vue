<script setup lang="ts">
/**
 * Customer Account Widget (E-commerce)
 *
 * Dashboard with profile, orders, addresses tabs.
 * Renders LcmsLoginForm if not authenticated.
 */

import { computed, ref, onMounted, watch, inject, type Ref } from 'vue'
import { useLanguage } from '../../../composables/useLanguage'
import { useCustomer } from '../../../composables/useCustomer'
import { useStorefront } from '../../../composables/useStorefront'
import { useToast } from '../../../composables/useToast'
import { formatPrice } from '../../../utils/currency'
import LcmsLoginForm from './LcmsLoginForm.vue'
import LcmsRegisterForm from './LcmsRegisterForm.vue'
import type { StorefrontOrder } from '../../../api/storefront'
import { defineAsyncComponent } from 'vue'
import { useSlotEntries } from '../../../composables/usePluginExtensions'

defineOptions({ inheritAttrs: false })

interface Props {
  data: Record<string, any>
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const { extractValue } = useLanguage(props.language)
const customer = useCustomer()
const { client } = useStorefront()
const toast = useToast()
const projectConfig = inject<Ref<any> | null>('lesscms-project-config', null)

const config = computed(() => props.data?.config || props.data || {})
const headingText = computed(() =>
  extractValue(props.data?.heading?.text) || (props.language === 'en' ? 'My account' : 'Moje konto')
)

const showOrders = computed(() => config.value.show_orders !== false)
const showAddresses = computed(() => config.value.show_addresses !== false)
const showProfile = computed(() => config.value.show_profile !== false)
const showLogout = computed(() => config.value.show_logout !== false)

const currency = computed(() => projectConfig?.value?.commerce?.currency || 'PLN')

// True when the page was reached with a `?return=` / `?return_to=` query
// param — i.e. the user is here to authenticate and bounce back to where
// they came from (e.g. configurator CTA).
const hasReturnTarget = ref(false)
// True only when `isAuthenticated` flipped from false → true on THIS page
// load with a return target present. After that flip LcmsLoginForm fires
// `window.location.href = destination` immediately, but Vue's reactivity
// flips this component's branch first — without the guard the account view
// would render for one frame, producing the "login form → flash of Moje
// konto → destination page" experience. A user who lands on /konto?return=…
// already authed (browser back, manual nav) keeps this flag false and sees
// the regular account view.
const justAuthedForRedirect = ref(false)
onMounted(() => {
  if (typeof window === 'undefined') return
  const params = new URLSearchParams(window.location.search)
  hasReturnTarget.value = !!(params.get('return') || params.get('return_to'))
})
watch(() => customer.isAuthenticated.value, (next, prev) => {
  // Skip the init-time flip: when a stored token hydrates the customer at
  // page load, isAuthenticated goes false → true *before* isInitialized
  // flips to true. A real user login happens after init() has already
  // completed, so checking isInitialized cleanly separates the two cases.
  if (!customer.isInitialized.value) return
  if (!prev && next && hasReturnTarget.value) {
    justAuthedForRedirect.value = true
  }
})

// activeTab is a string so plugin-contributed tabs (e.g. "albumy") fit too.
// Built-in tabs use 'profile' | 'orders' | 'addresses'; plugin tabs use the
// `key` declared in their manifest's `slots["account.tabs"]` entries.
const activeTab = ref<string>('profile')
const orders = ref<StorefrontOrder[]>([])
const isLoadingOrders = ref(false)

// Per-order expansion state — lazy-loaded order details (items, addresses, etc.)
const expandedOrderUuid = ref<string | null>(null)
const orderDetails = ref<Record<string, StorefrontOrder>>({})
const loadingOrderUuid = ref<string | null>(null)

async function toggleOrderExpand(order: StorefrontOrder) {
  if (expandedOrderUuid.value === order.uuid) {
    expandedOrderUuid.value = null
    return
  }
  expandedOrderUuid.value = order.uuid
  if (!orderDetails.value[order.uuid] && client.value) {
    loadingOrderUuid.value = order.uuid
    try {
      const response = await client.value.getOrder(order.uuid)
      orderDetails.value[order.uuid] = response.data
    } catch {
      // Keep list item as-is on error; user can retry by clicking again
      delete orderDetails.value[order.uuid]
    } finally {
      loadingOrderUuid.value = null
    }
  }
}

function formatAddress(addr: any): string {
  if (!addr) return ''
  const parts = [
    [addr.first_name, addr.last_name].filter(Boolean).join(' '),
    addr.company,
    [addr.street, addr.building].filter(Boolean).join(' ') + (addr.apartment ? `/${addr.apartment}` : ''),
    [addr.postal_code, addr.city].filter(Boolean).join(' '),
    addr.country,
  ].filter(Boolean)
  return parts.join(', ')
}

// Plugin-contributed account tabs (e.g. "Albumy" from photo-albums).
// Resolved at render time from the host app's plugin-extensions registry.
const pluginTabs = computed(() =>
  useSlotEntries('account.tabs').map((entry) => ({
    ...entry,
    component: defineAsyncComponent(entry.loader),
  })),
)
const activePluginTab = computed(() =>
  pluginTabs.value.find((t) => t.key === activeTab.value) || null,
)

const profileForm = ref({
  name: '',
  email: '',
  phone: '',
  company: '',
  tax_id: '',
})

const t = (key: string) => {
  const lang = props.language || 'pl'
  const dict: Record<string, Record<string, string>> = {
    pl: {
      profile: 'Profil',
      orders: 'Zamówienia',
      addresses: 'Adresy',
      logout: 'Wyloguj',
      name: 'Imię i nazwisko',
      email: 'Email',
      phone: 'Telefon',
      company: 'Firma',
      taxId: 'NIP',
      save: 'Zapisz',
      saving: 'Zapisywanie...',
      saved: 'Zapisano',
      saveError: 'Nie udało się zapisać',
      noOrders: 'Brak zamówień',
      orderNumber: 'Numer',
      orderDate: 'Data',
      orderStatus: 'Status',
      orderTotal: 'Razem',
      orderItems: 'Produkty',
      shippingAddress: 'Adres dostawy',
      billingAddress: 'Adres rozliczeniowy',
      paymentMethod: 'Sposób płatności',
      paymentStatus: 'Płatność',
      shippingMethod: 'Dostawa',
      trackingNumber: 'Numer śledzenia',
      subtotal: 'Suma produktów',
      shippingCost: 'Dostawa',
      discount: 'Rabat',
      orderNotes: 'Uwagi',
      loadingDetails: 'Ładowanie szczegółów...',
      noAddresses: 'Brak adresów',
      defaultAddress: 'Domyślny',
    },
    en: {
      profile: 'Profile',
      orders: 'Orders',
      addresses: 'Addresses',
      logout: 'Sign out',
      name: 'Full name',
      email: 'Email',
      phone: 'Phone',
      company: 'Company',
      taxId: 'Tax ID',
      save: 'Save',
      saving: 'Saving...',
      saved: 'Saved',
      saveError: 'Failed to save',
      noOrders: 'No orders yet',
      orderNumber: 'Number',
      orderDate: 'Date',
      orderStatus: 'Status',
      orderTotal: 'Total',
      orderItems: 'Items',
      shippingAddress: 'Shipping address',
      billingAddress: 'Billing address',
      paymentMethod: 'Payment method',
      paymentStatus: 'Payment',
      shippingMethod: 'Shipping',
      trackingNumber: 'Tracking number',
      subtotal: 'Subtotal',
      shippingCost: 'Shipping',
      discount: 'Discount',
      orderNotes: 'Notes',
      loadingDetails: 'Loading details...',
      noAddresses: 'No addresses',
      defaultAddress: 'Default',
    },
  }
  return dict[lang]?.[key] || dict.pl[key] || key
}

watch(() => customer.customer.value, (cust) => {
  if (cust) {
    profileForm.value = {
      name: cust.name || '',
      email: cust.email || '',
      phone: cust.phone || '',
      company: cust.company || '',
      tax_id: cust.tax_id || '',
    }
  }
}, { immediate: true })

async function fetchOrders() {
  if (!client.value) return
  isLoadingOrders.value = true
  try {
    const response = await client.value.getMyOrders({ per_page: 20 })
    orders.value = response.data || []
  } catch {
    orders.value = []
  } finally {
    isLoadingOrders.value = false
  }
}

watch(activeTab, (tab) => {
  if (tab === 'orders' && orders.value.length === 0) {
    fetchOrders()
  }
})

onMounted(() => {
  if (showOrders.value && customer.isAuthenticated.value) {
    fetchOrders()
  }
})

async function handleSaveProfile() {
  try {
    await customer.updateProfile(profileForm.value)
    toast.success(t('saved'))
  } catch {
    toast.error(t('saveError'))
  }
}

async function handleLogout() {
  await customer.logout()
  // No reload — Vue reactivity flips this component from the account view
  // straight to LcmsLoginForm via the `!isAuthenticated` branch. A reload
  // forced the whole page through SSR + hydration, which double-flashed
  // the login form (visible immediately on logout via the reactive flip,
  // then again after the SSR spinner + client init).
  activeTab.value = 'profile'
}

function formatDate(date: string) {
  try {
    return new Date(date).toLocaleDateString(props.language === 'en' ? 'en-US' : 'pl-PL')
  } catch {
    return date
  }
}
</script>

<template>
  <div class="lcms-customer-account">
    <div v-if="!customer.isInitialized.value" class="lcms-customer-account__loading">
      <div class="lcms-customer-account__spinner" aria-hidden="true" />
    </div>

    <template v-else-if="!customer.isAuthenticated.value">
      <LcmsLoginForm
        :data="{ heading: { text: headingText } }"
        :language="language"
      />
      <LcmsRegisterForm
        :data="{ heading: { text: headingText } }"
        :language="language"
      />
    </template>

    <div v-else-if="justAuthedForRedirect" class="lcms-customer-account__loading">
      <div class="lcms-customer-account__spinner" aria-hidden="true" />
    </div>

    <div v-else class="lcms-customer-account__content">
      <div class="lcms-customer-account__header">
        <h2 class="lcms-customer-account__heading">{{ headingText }}</h2>
        <button
          v-if="showLogout"
          type="button"
          class="lcms-customer-account__logout-icon"
          :title="t('logout')"
          :aria-label="t('logout')"
          @click="handleLogout"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span class="lcms-customer-account__logout-icon-label">{{ t('logout') }}</span>
        </button>
      </div>

      <!-- Tabs -->
      <div class="lcms-customer-account__tabs">
        <button
          v-if="showProfile"
          type="button"
          class="lcms-customer-account__tab"
          :class="{ 'lcms-customer-account__tab--active': activeTab === 'profile' }"
          @click="activeTab = 'profile'"
        >
          {{ t('profile') }}
        </button>
        <button
          v-if="showOrders"
          type="button"
          class="lcms-customer-account__tab"
          :class="{ 'lcms-customer-account__tab--active': activeTab === 'orders' }"
          @click="activeTab = 'orders'"
        >
          {{ t('orders') }}
        </button>
        <button
          v-if="showAddresses"
          type="button"
          class="lcms-customer-account__tab"
          :class="{ 'lcms-customer-account__tab--active': activeTab === 'addresses' }"
          @click="activeTab = 'addresses'"
        >
          {{ t('addresses') }}
        </button>
        <button
          v-for="pTab in pluginTabs"
          :key="`${pTab.pluginId}:${pTab.key}`"
          type="button"
          class="lcms-customer-account__tab"
          :class="{ 'lcms-customer-account__tab--active': activeTab === pTab.key }"
          @click="activeTab = pTab.key"
        >
          {{ pTab.label || pTab.key }}
        </button>
      </div>

      <!-- Profile -->
      <div v-if="activeTab === 'profile' && showProfile" class="lcms-customer-account__panel">
        <form @submit.prevent="handleSaveProfile" class="lcms-customer-account__form">
          <div class="lcms-customer-account__field">
            <label class="lcms-customer-account__label">{{ t('name') }}</label>
            <input v-model="profileForm.name" type="text" class="lcms-customer-account__input" />
          </div>

          <div class="lcms-customer-account__field">
            <label class="lcms-customer-account__label">{{ t('email') }}</label>
            <input v-model="profileForm.email" type="email" class="lcms-customer-account__input" disabled />
          </div>

          <div class="lcms-customer-account__field">
            <label class="lcms-customer-account__label">{{ t('phone') }}</label>
            <input v-model="profileForm.phone" type="tel" class="lcms-customer-account__input" />
          </div>

          <div class="lcms-customer-account__field">
            <label class="lcms-customer-account__label">{{ t('company') }}</label>
            <input v-model="profileForm.company" type="text" class="lcms-customer-account__input" />
          </div>

          <div class="lcms-customer-account__field">
            <label class="lcms-customer-account__label">{{ t('taxId') }}</label>
            <input v-model="profileForm.tax_id" type="text" class="lcms-customer-account__input" />
          </div>

          <button type="submit" class="lcms-customer-account__btn" :disabled="customer.isLoading.value">
            {{ customer.isLoading.value ? t('saving') : t('save') }}
          </button>
        </form>
      </div>

      <!-- Orders -->
      <div v-if="activeTab === 'orders' && showOrders" class="lcms-customer-account__panel">
        <div v-if="isLoadingOrders" class="lcms-customer-account__loading">
          {{ props.language === 'en' ? 'Loading...' : 'Ładowanie...' }}
        </div>

        <div v-else-if="orders.length === 0" class="lcms-customer-account__empty">
          {{ t('noOrders') }}
        </div>

        <div v-else class="lcms-customer-account__orders">
          <div
            v-for="order in orders"
            :key="order.uuid"
            class="lcms-customer-account__order"
            :class="{ 'lcms-customer-account__order--expanded': expandedOrderUuid === order.uuid }"
          >
            <button
              type="button"
              class="lcms-customer-account__order-summary"
              :aria-expanded="expandedOrderUuid === order.uuid"
              @click="toggleOrderExpand(order)"
            >
              <div class="lcms-customer-account__order-header">
                <div class="lcms-customer-account__order-header-main">
                  <div class="lcms-customer-account__order-number">{{ order.order_number }}</div>
                  <div class="lcms-customer-account__order-date">{{ formatDate(order.created_at) }}</div>
                </div>
                <span class="lcms-customer-account__order-status" :class="`lcms-customer-account__order-status--${order.status}`">
                  {{ order.status }}
                </span>
                <div class="lcms-customer-account__order-total">
                  {{ formatPrice(order.total, currency) }}
                </div>
                <svg
                  class="lcms-customer-account__order-chevron"
                  :class="{ 'lcms-customer-account__order-chevron--open': expandedOrderUuid === order.uuid }"
                  viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"
                >
                  <path d="M6 8l4 4 4-4" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </div>
            </button>

            <div v-if="expandedOrderUuid === order.uuid" class="lcms-customer-account__order-details">
              <div v-if="loadingOrderUuid === order.uuid" class="lcms-customer-account__order-loading">
                {{ t('loadingDetails') }}
              </div>

              <template v-else-if="orderDetails[order.uuid]">
                <!-- Items -->
                <div
                  v-if="orderDetails[order.uuid].items && orderDetails[order.uuid].items.length"
                  class="lcms-customer-account__order-section"
                >
                  <h5 class="lcms-customer-account__order-section-title">{{ t('orderItems') }}</h5>
                  <div class="lcms-customer-account__order-items">
                    <div
                      v-for="item in orderDetails[order.uuid].items"
                      :key="item.uuid"
                      class="lcms-customer-account__order-item"
                    >
                      <div class="lcms-customer-account__order-item-main">
                        <div class="lcms-customer-account__order-item-name">{{ item.name }}</div>
                        <div class="lcms-customer-account__order-item-meta">
                          <span v-if="item.sku">SKU: {{ item.sku }}</span>
                          <span>{{ item.quantity }} × {{ formatPrice(item.unit_price, currency) }}</span>
                        </div>
                      </div>
                      <div class="lcms-customer-account__order-item-subtotal">
                        {{ formatPrice(item.subtotal, currency) }}
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Totals breakdown -->
                <div class="lcms-customer-account__order-section lcms-customer-account__order-totals">
                  <div v-if="orderDetails[order.uuid].subtotal" class="lcms-customer-account__order-total-row">
                    <span>{{ t('subtotal') }}</span>
                    <span>{{ formatPrice(orderDetails[order.uuid].subtotal, currency) }}</span>
                  </div>
                  <div v-if="orderDetails[order.uuid].discount" class="lcms-customer-account__order-total-row">
                    <span>{{ t('discount') }}</span>
                    <span>-{{ formatPrice(orderDetails[order.uuid].discount, currency) }}</span>
                  </div>
                  <div v-if="orderDetails[order.uuid].shipping_cost" class="lcms-customer-account__order-total-row">
                    <span>{{ t('shippingCost') }}</span>
                    <span>{{ formatPrice(orderDetails[order.uuid].shipping_cost, currency) }}</span>
                  </div>
                  <div class="lcms-customer-account__order-total-row lcms-customer-account__order-total-row--grand">
                    <span>{{ t('orderTotal') }}</span>
                    <span>{{ formatPrice(orderDetails[order.uuid].total, currency) }}</span>
                  </div>
                </div>

                <!-- Shipping + payment methods -->
                <div
                  v-if="orderDetails[order.uuid].shipping_method || orderDetails[order.uuid].payment_method || orderDetails[order.uuid].tracking_number"
                  class="lcms-customer-account__order-section lcms-customer-account__order-meta-grid"
                >
                  <div v-if="orderDetails[order.uuid].shipping_method">
                    <div class="lcms-customer-account__order-meta-label">{{ t('shippingMethod') }}</div>
                    <div class="lcms-customer-account__order-meta-value">{{ orderDetails[order.uuid].shipping_method }}</div>
                  </div>
                  <div v-if="orderDetails[order.uuid].payment_method">
                    <div class="lcms-customer-account__order-meta-label">{{ t('paymentMethod') }}</div>
                    <div class="lcms-customer-account__order-meta-value">
                      {{ orderDetails[order.uuid].payment_method }}
                      <span
                        v-if="orderDetails[order.uuid].payment_status"
                        class="lcms-customer-account__order-payment-status"
                      >
                        ({{ orderDetails[order.uuid].payment_status }})
                      </span>
                    </div>
                  </div>
                  <div v-if="orderDetails[order.uuid].tracking_number">
                    <div class="lcms-customer-account__order-meta-label">{{ t('trackingNumber') }}</div>
                    <div class="lcms-customer-account__order-meta-value">{{ orderDetails[order.uuid].tracking_number }}</div>
                  </div>
                </div>

                <!-- Addresses -->
                <div
                  v-if="orderDetails[order.uuid].shipping_address || orderDetails[order.uuid].billing_address"
                  class="lcms-customer-account__order-section lcms-customer-account__order-addresses"
                >
                  <div v-if="orderDetails[order.uuid].shipping_address">
                    <div class="lcms-customer-account__order-meta-label">{{ t('shippingAddress') }}</div>
                    <div class="lcms-customer-account__order-meta-value">
                      {{ formatAddress(orderDetails[order.uuid].shipping_address) }}
                    </div>
                  </div>
                  <div v-if="orderDetails[order.uuid].billing_address">
                    <div class="lcms-customer-account__order-meta-label">{{ t('billingAddress') }}</div>
                    <div class="lcms-customer-account__order-meta-value">
                      {{ formatAddress(orderDetails[order.uuid].billing_address) }}
                    </div>
                  </div>
                </div>

                <!-- Notes -->
                <div
                  v-if="orderDetails[order.uuid].notes"
                  class="lcms-customer-account__order-section"
                >
                  <div class="lcms-customer-account__order-meta-label">{{ t('orderNotes') }}</div>
                  <div class="lcms-customer-account__order-meta-value">{{ orderDetails[order.uuid].notes }}</div>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- Plugin tab panel — rendered when the active tab belongs to a plugin -->
      <div v-if="activePluginTab" class="lcms-customer-account__panel">
        <component :is="activePluginTab.component" :customer="customer.customer.value" />
      </div>

      <!-- Addresses -->
      <div v-if="activeTab === 'addresses' && showAddresses" class="lcms-customer-account__panel">
        <div v-if="!customer.customer.value?.addresses?.length" class="lcms-customer-account__empty">
          {{ t('noAddresses') }}
        </div>

        <div v-else class="lcms-customer-account__addresses">
          <div
            v-for="(address, idx) in customer.customer.value.addresses"
            :key="idx"
            class="lcms-customer-account__address"
          >
            <div>{{ address.street }}</div>
            <div>{{ address.postal_code }} {{ address.city }}</div>
            <div>{{ address.country }}</div>
            <span
              v-if="customer.customer.value.default_address?.street === address.street"
              class="lcms-customer-account__default-badge"
            >
              {{ t('defaultAddress') }}
            </span>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.lcms-customer-account {
  font-family: var(--lcms-font-body, system-ui, sans-serif);
  color: var(--lcms-color-text, #1f2937);
}

.lcms-customer-account__loading {
  display: flex;
  justify-content: center;
  padding: 3rem 0;
}

.lcms-customer-account__spinner {
  width: 2rem;
  height: 2rem;
  border: 3px solid var(--lcms-color-border, #e5e7eb);
  border-top-color: var(--lcms-color-primary, #2563eb);
  border-radius: 50%;
  animation: lcms-customer-account-spin 0.8s linear infinite;
}

@keyframes lcms-customer-account-spin {
  to { transform: rotate(360deg); }
}

.lcms-customer-account__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.lcms-customer-account__heading {
  font-family: var(--lcms-font-heading, var(--lcms-font-body));
  font-size: var(--lcms-h2-font-size, 1.875rem);
  font-weight: var(--lcms-h2-font-weight, 700);
  margin: 0;
}

.lcms-customer-account__logout-icon {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--lcms-border-radius, 0.375rem);
  color: var(--lcms-color-muted, #6b7280);
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.lcms-customer-account__logout-icon svg {
  width: 1.125rem;
  height: 1.125rem;
  flex-shrink: 0;
}

.lcms-customer-account__logout-icon:hover {
  color: var(--lcms-color-danger, #ef4444);
  border-color: var(--lcms-color-danger, #ef4444);
  background: rgba(239, 68, 68, 0.05);
}

.lcms-customer-account__logout-icon-label {
  white-space: nowrap;
}

@media (max-width: 480px) {
  .lcms-customer-account__logout-icon-label {
    display: none;
  }
  .lcms-customer-account__logout-icon {
    padding: 0.5rem;
  }
}

.lcms-customer-account__tabs {
  display: flex;
  gap: 0.5rem;
  border-bottom: 1px solid var(--lcms-color-border, #e5e7eb);
  margin-bottom: 1.5rem;
}

.lcms-customer-account__tab {
  background: none;
  border: none;
  padding: 0.75rem 1rem;
  font-size: 0.9375rem;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  color: var(--lcms-color-muted, #6b7280);
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: all 0.15s;
}

.lcms-customer-account__tab:hover {
  color: var(--lcms-color-text);
}

.lcms-customer-account__tab--active {
  color: var(--lcms-color-primary, #3b82f6);
  border-bottom-color: var(--lcms-color-primary, #3b82f6);
}

.lcms-customer-account__panel {
  background: var(--lcms-color-background, #ffffff);
  border: 1px solid var(--lcms-color-border, #e5e7eb);
  border-radius: var(--lcms-border-radius, 0.5rem);
  padding: 1.5rem;
}

.lcms-customer-account__form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 32rem;
}

.lcms-customer-account__field {
  display: flex;
  flex-direction: column;
}

.lcms-customer-account__label {
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 0.375rem;
}

.lcms-customer-account__input {
  padding: 0.625rem 0.875rem;
  background: var(--lcms-input-bg-color, var(--lcms-color-background, #fff));
  color: var(--lcms-input-text-color, var(--lcms-color-text));
  border: 1px solid var(--lcms-input-border-color, var(--lcms-color-border, #d1d5db));
  border-radius: var(--lcms-border-radius, 0.375rem);
  font-size: 0.9375rem;
  font-family: inherit;
  outline: none;
}

.lcms-customer-account__input:focus {
  border-color: var(--lcms-color-primary, #3b82f6);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.lcms-customer-account__input:disabled {
  background: var(--lcms-color-background-alt, #f9fafb);
  color: var(--lcms-color-muted, #6b7280);
}

.lcms-customer-account__btn {
  align-self: flex-start;
  padding: var(--lcms-btn-padding, 0.75rem 1.5rem);
  border-radius: var(--lcms-btn-border-radius, 0.375rem);
  background: var(--lcms-color-primary, #3b82f6);
  color: var(--lcms-color-white, #fff);
  font-weight: var(--lcms-btn-font-weight, 600);
  border: none;
  cursor: pointer;
  font-family: var(--lcms-font-button, var(--lcms-font-body));
}

.lcms-customer-account__btn:hover:not(:disabled) {
  opacity: 0.9;
}

.lcms-customer-account__btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.lcms-customer-account__loading,
.lcms-customer-account__empty {
  text-align: center;
  padding: 2rem 1rem;
  color: var(--lcms-color-muted, #6b7280);
}

.lcms-customer-account__orders {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.lcms-customer-account__order {
  border: 1px solid var(--lcms-color-border, #e5e7eb);
  border-radius: var(--lcms-border-radius, 0.375rem);
  overflow: hidden;
  transition: border-color 0.15s;
}

.lcms-customer-account__order--expanded {
  border-color: var(--lcms-color-text, #1f2937);
}

.lcms-customer-account__order-summary {
  width: 100%;
  background: transparent;
  border: 0;
  padding: 1rem;
  cursor: pointer;
  font: inherit;
  color: inherit;
  text-align: left;
  transition: background 0.15s;
}

.lcms-customer-account__order-summary:hover {
  background: var(--lcms-color-background-alt, #f9fafb);
}

.lcms-customer-account__order-header {
  display: grid;
  grid-template-columns: 1fr auto auto auto;
  align-items: center;
  gap: 1rem;
}

.lcms-customer-account__order-header-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.lcms-customer-account__order-chevron {
  width: 20px;
  height: 20px;
  color: var(--lcms-color-muted, #9ca3af);
  transition: transform 0.2s;
}

.lcms-customer-account__order-chevron--open {
  transform: rotate(180deg);
  color: var(--lcms-color-text, #1f2937);
}

.lcms-customer-account__order-details {
  padding: 1rem 1.25rem 1.25rem;
  border-top: 1px solid var(--lcms-color-border, #e5e7eb);
  background: var(--lcms-color-background-alt, #fafafa);
}

.lcms-customer-account__order-loading {
  padding: 1rem;
  color: var(--lcms-color-muted, #6b7280);
  font-size: 0.875rem;
  text-align: center;
}

.lcms-customer-account__order-section {
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--lcms-color-border, #e5e7eb);
}

.lcms-customer-account__order-section:last-child {
  border-bottom: 0;
}

.lcms-customer-account__order-section-title {
  font-size: 0.8125rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--lcms-color-muted, #6b7280);
  margin: 0 0 0.5rem 0;
}

.lcms-customer-account__order-items {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.lcms-customer-account__order-item {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.5rem 0;
  background: #fff;
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
}

.lcms-customer-account__order-item-main {
  flex: 1;
  min-width: 0;
}

.lcms-customer-account__order-item-name {
  font-weight: 500;
  color: var(--lcms-color-text, #1f2937);
}

.lcms-customer-account__order-item-meta {
  display: flex;
  gap: 0.75rem;
  font-size: 0.8125rem;
  color: var(--lcms-color-muted, #6b7280);
  margin-top: 2px;
}

.lcms-customer-account__order-item-subtotal {
  font-weight: 600;
  white-space: nowrap;
}

.lcms-customer-account__order-totals {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.lcms-customer-account__order-total-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
  color: var(--lcms-color-text, #1f2937);
}

.lcms-customer-account__order-total-row--grand {
  font-weight: 700;
  font-size: 1rem;
  padding-top: 6px;
  border-top: 1px solid var(--lcms-color-border, #e5e7eb);
  margin-top: 4px;
}

.lcms-customer-account__order-meta-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.lcms-customer-account__order-addresses {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1rem;
}

.lcms-customer-account__order-meta-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--lcms-color-muted, #6b7280);
  margin-bottom: 2px;
}

.lcms-customer-account__order-meta-value {
  font-size: 0.9375rem;
  color: var(--lcms-color-text, #1f2937);
}

.lcms-customer-account__order-payment-status {
  font-size: 0.8125rem;
  color: var(--lcms-color-muted, #6b7280);
}

.lcms-customer-account__order-number {
  font-weight: 600;
}

.lcms-customer-account__order-date {
  font-size: 0.8125rem;
  color: var(--lcms-color-muted, #6b7280);
}

.lcms-customer-account__order-status {
  display: inline-block;
  padding: 0.25rem 0.625rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  background: var(--lcms-color-background-alt, #f3f4f6);
  color: var(--lcms-color-text);
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.lcms-customer-account__order-status--paid,
.lcms-customer-account__order-status--delivered {
  background: rgba(16, 185, 129, 0.1);
  color: var(--lcms-color-success, #10b981);
}

.lcms-customer-account__order-status--pending {
  background: rgba(245, 158, 11, 0.1);
  color: var(--lcms-color-warning, #f59e0b);
}

.lcms-customer-account__order-status--cancelled {
  background: rgba(239, 68, 68, 0.1);
  color: var(--lcms-color-danger, #ef4444);
}

.lcms-customer-account__order-total {
  font-weight: 700;
  font-size: 1.0625rem;
}

.lcms-customer-account__addresses {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1rem;
}

.lcms-customer-account__address {
  position: relative;
  padding: 1rem;
  border: 1px solid var(--lcms-color-border, #e5e7eb);
  border-radius: var(--lcms-border-radius, 0.375rem);
  font-size: 0.875rem;
  line-height: 1.5;
}

.lcms-customer-account__default-badge {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  font-size: 0.6875rem;
  background: var(--lcms-color-primary, #3b82f6);
  color: var(--lcms-color-white, #fff);
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-weight: 600;
  text-transform: uppercase;
}

</style>
