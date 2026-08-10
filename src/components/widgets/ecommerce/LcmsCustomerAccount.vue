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
import { useCart } from '../../../composables/useCart'
import { useToast } from '../../../composables/useToast'
import { formatPrice } from '../../../utils/currency'
import LcmsLoginForm from './LcmsLoginForm.vue'
import LcmsRegisterForm from './LcmsRegisterForm.vue'
import type { StorefrontOrder, StorefrontAddress } from '../../../api/storefront'
import { countriesFor } from '../../../data/countries'
import LcmsCountrySelect from '../../common/LcmsCountrySelect.vue'
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
const showReorder = computed(() => config.value.show_reorder !== false)

const cart = useCart()
const reorderingOrderUuid = ref<string | null>(null)

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

async function handleReorder(orderUuid: string) {
  if (reorderingOrderUuid.value || !client.value) return
  reorderingOrderUuid.value = orderUuid
  try {
    const response = await client.value.reorderOrder(orderUuid)
    const added = response.data.added ?? []
    const skipped = response.data.skipped ?? []

    await cart.loadCart()

    if (added.length > 0) {
      toast.success(t('reorderSuccess').replace('{added}', String(added.length)))
    }
    if (skipped.length > 0) {
      const names = skipped
        .map((s) => `${s.product_name || s.sku || '?'} (${t('reason_' + s.reason) || s.reason})`)
        .join(', ')
      toast.warning(t('reorderSkipped').replace('{names}', names), 6000)
    }
    if (added.length === 0 && skipped.length === 0) {
      toast.warning(t('reorderEmpty'))
    }
  } catch (err: any) {
    toast.error(err?.message || t('reorderFailed'))
  } finally {
    reorderingOrderUuid.value = null
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

// --- Address book ---
type AddressFormState = {
  uuid: string | null
  name: string
  street: string
  city: string
  postal_code: string
  country: string
  phone: string
  is_default: boolean
}

const countryOptions = computed(() => countriesFor(props.language))

// --- Localised labels for status / method codes coming from BE ---
// Values land in the API as machine codes (pending, inpost_courier, …);
// the customer-facing screen should show them in the page language.
const ORDER_STATUS_LABELS: Record<string, Record<string, string>> = {
  pl: {
    pending: 'Oczekuje',
    processing: 'W realizacji',
    shipped: 'Wysłane',
    delivered: 'Dostarczone',
    cancelled: 'Anulowane',
  },
  en: {
    pending: 'Pending',
    processing: 'Processing',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  },
}

const PAYMENT_STATUS_LABELS: Record<string, Record<string, string>> = {
  pl: {
    pending: 'Oczekuje na płatność',
    paid: 'Opłacone',
    failed: 'Płatność nieudana',
    refunded: 'Zwrot',
  },
  en: {
    pending: 'Awaiting payment',
    paid: 'Paid',
    failed: 'Failed',
    refunded: 'Refunded',
  },
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  p24: 'Przelewy24',
  przelewy24: 'Przelewy24',
  blik: 'BLIK',
  stripe: 'Karta płatnicza',
  cod: 'Płatność za pobraniem',
  cash: 'Płatność za pobraniem',
  bank_transfer: 'Przelew bankowy',
}

// Shipping codes get prettified — most carriers use `inpost_locker_s` style
// machine codes. The label is the customer-facing name.
const SHIPPING_METHOD_LABELS: Record<string, string> = {
  inpost_locker: 'Paczkomat InPost',
  inpost_locker_s: 'Paczkomat InPost (S)',
  inpost_locker_m: 'Paczkomat InPost (M)',
  inpost_locker_l: 'Paczkomat InPost (L)',
  inpost_courier: 'Kurier InPost',
  dpd_classic: 'Kurier DPD',
  dpd_pickup: 'DPD Pickup',
}

function orderStatusLabel(status: string | null | undefined): string {
  if (!status) return ''
  const lang = props.language === 'en' ? 'en' : 'pl'
  return ORDER_STATUS_LABELS[lang]?.[status] || status
}

function paymentStatusLabel(status: string | null | undefined): string {
  if (!status) return ''
  const lang = props.language === 'en' ? 'en' : 'pl'
  return PAYMENT_STATUS_LABELS[lang]?.[status] || status
}

function paymentMethodLabel(code: string | null | undefined): string {
  if (!code) return ''
  return PAYMENT_METHOD_LABELS[code] || code
}

function shippingMethodLabel(code: string | null | undefined): string {
  if (!code) return ''
  return SHIPPING_METHOD_LABELS[code] || code
}

const emptyAddressForm = (): AddressFormState => ({
  uuid: null,
  name: '',
  street: '',
  city: '',
  postal_code: '',
  country: 'PL',
  phone: '',
  is_default: false,
})

const isAddressModalOpen = ref(false)
const addressForm = ref<AddressFormState>(emptyAddressForm())
const addressErrors = ref<Record<string, string>>({})
const isSavingAddress = ref(false)
const deletingAddressUuid = ref<string | null>(null)

function openAddAddress() {
  addressForm.value = emptyAddressForm()
  addressErrors.value = {}
  isAddressModalOpen.value = true
}

function openEditAddress(addr: StorefrontAddress) {
  const isDefault = !!(customer.customer.value?.default_address
    && (customer.customer.value.default_address.uuid === addr.uuid
      || (!addr.uuid && customer.customer.value.default_address.street === addr.street)))
  addressForm.value = {
    uuid: addr.uuid ?? null,
    name: addr.name ?? '',
    street: addr.street ?? '',
    city: addr.city ?? '',
    postal_code: addr.postal_code ?? '',
    country: addr.country ?? 'PL',
    phone: addr.phone ?? '',
    is_default: isDefault,
  }
  addressErrors.value = {}
  isAddressModalOpen.value = true
}

function closeAddressModal() {
  isAddressModalOpen.value = false
}

function validateAddressForm(): boolean {
  const errs: Record<string, string> = {}
  if (!addressForm.value.street.trim()) errs.street = t('requiredField')
  if (!addressForm.value.city.trim()) errs.city = t('requiredField')
  if (!addressForm.value.postal_code.trim()) errs.postal_code = t('requiredField')
  else if (addressForm.value.country === 'PL' && !/^\d{2}-\d{3}$/.test(addressForm.value.postal_code)) {
    errs.postal_code = t('invalidPostalCode')
  }
  addressErrors.value = errs
  return Object.keys(errs).length === 0
}

async function saveAddress() {
  if (!client.value) return
  if (!validateAddressForm()) return
  const { uuid, ...payload } = addressForm.value
  isSavingAddress.value = true
  try {
    if (uuid) {
      await client.value.updateAddress(uuid, payload as unknown as StorefrontAddress)
    } else {
      await client.value.addAddress(payload as unknown as StorefrontAddress)
    }
    await customer.refreshProfile()
    toast.success(t('saved'))
    isAddressModalOpen.value = false
  } catch (err: any) {
    toast.error(err?.message || t('saveError'))
  } finally {
    isSavingAddress.value = false
  }
}

async function deleteAddress(addr: StorefrontAddress) {
  if (!client.value || !addr.uuid) return
  // eslint-disable-next-line no-alert
  if (typeof window !== 'undefined' && !window.confirm(t('confirmDelete'))) return
  deletingAddressUuid.value = addr.uuid
  try {
    await client.value.deleteAddress(addr.uuid)
    await customer.refreshProfile()
    toast.success(t('saved'))
  } catch (err: any) {
    toast.error(err?.message || t('saveError'))
  } finally {
    deletingAddressUuid.value = null
  }
}

async function setDefaultAddress(addr: StorefrontAddress) {
  if (!client.value || !addr.uuid) return
  try {
    await client.value.updateAddress(addr.uuid, { is_default: true } as unknown as Partial<StorefrontAddress>)
    await customer.refreshProfile()
    toast.success(t('saved'))
  } catch (err: any) {
    toast.error(err?.message || t('saveError'))
  }
}

function isDefaultAddress(addr: StorefrontAddress): boolean {
  const def = customer.customer.value?.default_address
  if (!def) return false
  if (addr.uuid && def.uuid) return addr.uuid === def.uuid
  return def.street === addr.street && def.postal_code === addr.postal_code && def.city === addr.city
}

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
      addAddress: 'Dodaj adres',
      editAddress: 'Edytuj',
      deleteAddress: 'Usuń',
      setAsDefault: 'Ustaw jako domyślny',
      addressLabel: 'Etykieta (np. „Dom", „Biuro")',
      street: 'Ulica i numer',
      postalCode: 'Kod pocztowy',
      city: 'Miasto',
      country: 'Kraj',
      isDefault: 'Ustaw jako domyślny',
      cancel: 'Anuluj',
      confirmDelete: 'Usunąć ten adres?',
      requiredField: 'To pole jest wymagane',
      invalidPostalCode: 'Nieprawidłowy kod pocztowy (00-000)',
      reorder: 'Zamów ponownie',
      reordering: 'Dodaję do koszyka...',
      reorderSuccess: 'Dodano {added} pozycji do koszyka',
      reorderSkipped: 'Pominięto: {names}',
      reorderEmpty: 'Brak pozycji do dodania',
      reorderFailed: 'Nie udało się zamówić ponownie',
      reason_product_deleted: 'produkt niedostępny',
      reason_out_of_stock: 'brak w magazynie',
      reason_invalid: 'nieprawidłowa pozycja',
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
      addAddress: 'Add address',
      editAddress: 'Edit',
      deleteAddress: 'Delete',
      setAsDefault: 'Set as default',
      addressLabel: 'Label (e.g. "Home", "Office")',
      street: 'Street and number',
      postalCode: 'Postal code',
      city: 'City',
      country: 'Country',
      isDefault: 'Set as default',
      cancel: 'Cancel',
      confirmDelete: 'Delete this address?',
      requiredField: 'This field is required',
      invalidPostalCode: 'Invalid postal code',
      reorder: 'Reorder',
      reordering: 'Adding to cart...',
      reorderSuccess: 'Added {added} items to cart',
      reorderSkipped: 'Skipped: {names}',
      reorderEmpty: 'No items to add',
      reorderFailed: 'Reorder failed',
      reason_product_deleted: 'product unavailable',
      reason_out_of_stock: 'out of stock',
      reason_invalid: 'invalid item',
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
  openTabFromUrl()
})

/**
 * Open the tab named in `?tab=` (e.g. `/konto?tab=albumy`).
 *
 * Without this the account always lands on the profile, so anything linking
 * back "to my account" — a plugin page, an e-mail — can only drop the customer
 * one click short of what they were looking at. Plugin tabs are resolved from
 * the registry, so an unknown or not-installed key simply leaves the default
 * alone instead of showing an empty panel.
 */
function openTabFromUrl() {
  if (typeof window === 'undefined') return

  const requested = new URLSearchParams(window.location.search).get('tab')
  if (!requested) return

  const builtIn = ['profile']
  if (showOrders.value) builtIn.push('orders')
  if (showAddresses.value) builtIn.push('addresses')

  const known = builtIn.includes(requested)
    || pluginTabs.value.some((tab) => tab.key === requested)

  if (known) activeTab.value = requested
}

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
                  {{ orderStatusLabel(order.status) }}
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

                <!-- Reorder action -->
                <div v-if="showReorder" class="lcms-customer-account__order-actions">
                  <button
                    type="button"
                    class="lcms-customer-account__reorder-btn"
                    :disabled="reorderingOrderUuid === order.uuid"
                    @click.stop="handleReorder(order.uuid)"
                  >
                    {{ reorderingOrderUuid === order.uuid ? t('reordering') : t('reorder') }}
                  </button>
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
                    <div class="lcms-customer-account__order-meta-value">{{ shippingMethodLabel(orderDetails[order.uuid].shipping_method) }}</div>
                  </div>
                  <div v-if="orderDetails[order.uuid].payment_method">
                    <div class="lcms-customer-account__order-meta-label">{{ t('paymentMethod') }}</div>
                    <div class="lcms-customer-account__order-meta-value">
                      {{ paymentMethodLabel(orderDetails[order.uuid].payment_method) }}
                      <span
                        v-if="orderDetails[order.uuid].payment_status"
                        class="lcms-customer-account__order-payment-status"
                      >
                        ({{ paymentStatusLabel(orderDetails[order.uuid].payment_status) }})
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
        <div class="lcms-customer-account__addresses-header">
          <button
            type="button"
            class="lcms-customer-account__btn lcms-customer-account__btn--primary"
            @click="openAddAddress"
          >
            + {{ t('addAddress') }}
          </button>
        </div>

        <div v-if="!customer.customer.value?.addresses?.length" class="lcms-customer-account__empty">
          {{ t('noAddresses') }}
        </div>

        <div v-else class="lcms-customer-account__addresses">
          <div
            v-for="(address, idx) in customer.customer.value.addresses"
            :key="address.uuid || idx"
            class="lcms-customer-account__address"
          >
            <div class="lcms-customer-account__address-body">
              <div v-if="address.name" class="lcms-customer-account__address-name">{{ address.name }}</div>
              <div>{{ address.street }}</div>
              <div>{{ address.postal_code }} {{ address.city }}</div>
              <div>{{ address.country }}</div>
              <div v-if="address.phone" class="lcms-customer-account__address-phone">{{ address.phone }}</div>
              <span
                v-if="isDefaultAddress(address)"
                class="lcms-customer-account__default-badge"
              >
                {{ t('defaultAddress') }}
              </span>
            </div>
            <div class="lcms-customer-account__address-actions">
              <button
                v-if="!isDefaultAddress(address) && address.uuid"
                type="button"
                class="lcms-customer-account__btn lcms-customer-account__btn--ghost"
                @click="setDefaultAddress(address)"
              >
                {{ t('setAsDefault') }}
              </button>
              <button
                type="button"
                class="lcms-customer-account__btn lcms-customer-account__btn--ghost"
                @click="openEditAddress(address)"
              >
                {{ t('editAddress') }}
              </button>
              <button
                type="button"
                class="lcms-customer-account__btn lcms-customer-account__btn--danger"
                :disabled="deletingAddressUuid === address.uuid"
                @click="deleteAddress(address)"
              >
                {{ t('deleteAddress') }}
              </button>
            </div>
          </div>
        </div>

        <!-- Add / edit modal -->
        <div
          v-if="isAddressModalOpen"
          class="lcms-customer-account__modal-backdrop"
          @click.self="closeAddressModal"
        >
          <div class="lcms-customer-account__modal">
            <h3 class="lcms-customer-account__modal-title">
              {{ addressForm.uuid ? t('editAddress') : t('addAddress') }}
            </h3>

            <div class="lcms-customer-account__field">
              <label class="lcms-customer-account__label">{{ t('addressLabel') }}</label>
              <input v-model="addressForm.name" type="text" class="lcms-customer-account__input" />
            </div>

            <div class="lcms-customer-account__field">
              <label class="lcms-customer-account__label">{{ t('street') }} *</label>
              <input
                v-model="addressForm.street"
                type="text"
                class="lcms-customer-account__input"
                :class="{ 'lcms-customer-account__input--error': addressErrors.street }"
              />
              <span v-if="addressErrors.street" class="lcms-customer-account__error">{{ addressErrors.street }}</span>
            </div>

            <div class="lcms-customer-account__row">
              <div class="lcms-customer-account__field">
                <label class="lcms-customer-account__label">{{ t('postalCode') }} *</label>
                <input
                  v-model="addressForm.postal_code"
                  type="text"
                  placeholder="00-000"
                  class="lcms-customer-account__input"
                  :class="{ 'lcms-customer-account__input--error': addressErrors.postal_code }"
                />
                <span v-if="addressErrors.postal_code" class="lcms-customer-account__error">{{ addressErrors.postal_code }}</span>
              </div>
              <div class="lcms-customer-account__field">
                <label class="lcms-customer-account__label">{{ t('city') }} *</label>
                <input
                  v-model="addressForm.city"
                  type="text"
                  class="lcms-customer-account__input"
                  :class="{ 'lcms-customer-account__input--error': addressErrors.city }"
                />
                <span v-if="addressErrors.city" class="lcms-customer-account__error">{{ addressErrors.city }}</span>
              </div>
            </div>

            <div class="lcms-customer-account__field">
              <label class="lcms-customer-account__label">{{ t('country') }} *</label>
              <LcmsCountrySelect
                v-model="addressForm.country"
                :language="props.language"
              />
            </div>

            <div class="lcms-customer-account__field">
              <label class="lcms-customer-account__label">{{ t('phone') }}</label>
              <input v-model="addressForm.phone" type="tel" class="lcms-customer-account__input" />
            </div>

            <label class="lcms-customer-account__checkbox">
              <input v-model="addressForm.is_default" type="checkbox" />
              <span>{{ t('isDefault') }}</span>
            </label>

            <div class="lcms-customer-account__modal-actions">
              <button
                type="button"
                class="lcms-customer-account__btn lcms-customer-account__btn--ghost"
                :disabled="isSavingAddress"
                @click="closeAddressModal"
              >
                {{ t('cancel') }}
              </button>
              <button
                type="button"
                class="lcms-customer-account__btn lcms-customer-account__btn--primary"
                :disabled="isSavingAddress"
                @click="saveAddress"
              >
                {{ isSavingAddress ? t('saving') : t('save') }}
              </button>
            </div>
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

.lcms-customer-account__order-actions {
  display: flex;
  justify-content: flex-end;
  margin: 0.75rem 0;
}

.lcms-customer-account__reorder-btn {
  padding: 0.5rem 1.1rem;
  border-radius: var(--lcms-btn-border-radius, 0.375rem);
  background: var(--lcms-color-primary, #3b82f6);
  color: var(--lcms-color-white, #fff);
  font-weight: var(--lcms-btn-font-weight, 600);
  font-size: 0.9rem;
  border: none;
  cursor: pointer;
  font-family: var(--lcms-font-button, var(--lcms-font-body));
  transition: opacity 0.15s ease;
}

.lcms-customer-account__reorder-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.lcms-customer-account__reorder-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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

.lcms-customer-account__addresses-header {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 1rem;
}

.lcms-customer-account__address-body {
  position: relative;
}

.lcms-customer-account__address-name {
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.lcms-customer-account__address-phone {
  color: var(--lcms-color-muted, #6b7280);
  font-size: 0.8125rem;
  margin-top: 0.25rem;
}

.lcms-customer-account__address-actions {
  display: flex;
  gap: 0.375rem;
  margin-top: 0.75rem;
  flex-wrap: wrap;
}

.lcms-customer-account__btn {
  font: inherit;
  cursor: pointer;
  border: 1px solid transparent;
  padding: 0.4375rem 0.875rem;
  border-radius: var(--lcms-border-radius, 0.375rem);
  font-size: 0.8125rem;
  font-weight: 500;
  background: transparent;
  color: var(--lcms-color-text, #1f2937);
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.lcms-customer-account__btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.lcms-customer-account__btn--primary {
  background: var(--lcms-color-primary, #3b82f6);
  color: var(--lcms-color-white, #fff);
}

.lcms-customer-account__btn--primary:hover:not(:disabled) {
  filter: brightness(1.05);
}

.lcms-customer-account__btn--ghost {
  border-color: var(--lcms-color-border, #e5e7eb);
}

.lcms-customer-account__btn--ghost:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.03);
}

.lcms-customer-account__btn--danger {
  border-color: rgba(220, 38, 38, 0.4);
  color: rgb(220, 38, 38);
}

.lcms-customer-account__btn--danger:hover:not(:disabled) {
  background: rgba(220, 38, 38, 0.06);
}

/* Modal */
.lcms-customer-account__modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1050;
  padding: 1rem;
}

.lcms-customer-account__modal {
  background: var(--lcms-color-background, #fff);
  border-radius: 0.75rem;
  padding: 1.5rem;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.lcms-customer-account__modal-title {
  margin: 0 0 0.5rem;
  font-size: 1.125rem;
  font-weight: 600;
}

.lcms-customer-account__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.lcms-customer-account__field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.lcms-customer-account__label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--lcms-color-muted, #6b7280);
}

.lcms-customer-account__input {
  font: inherit;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--lcms-color-border, #d1d5db);
  border-radius: var(--lcms-border-radius, 0.375rem);
  background: var(--lcms-color-background, #fff);
  color: inherit;
}

.lcms-customer-account__input:focus {
  outline: none;
  border-color: var(--lcms-color-primary, #3b82f6);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--lcms-color-primary, #3b82f6) 18%, transparent);
}

.lcms-customer-account__input--error {
  border-color: rgb(220, 38, 38);
}

.lcms-customer-account__error {
  color: rgb(220, 38, 38);
  font-size: 0.75rem;
}

.lcms-customer-account__checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.lcms-customer-account__checkbox input[type='checkbox'] {
  width: 1rem;
  height: 1rem;
  accent-color: var(--lcms-color-primary, #3b82f6);
}

.lcms-customer-account__modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

</style>
