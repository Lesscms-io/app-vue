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
import type { StorefrontOrder } from '../../../api/storefront'

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

const activeTab = ref<'profile' | 'orders' | 'addresses'>('profile')
const orders = ref<StorefrontOrder[]>([])
const isLoadingOrders = ref(false)

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
  window.location.reload()
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
    <!-- Login form if not authenticated -->
    <LcmsLoginForm
      v-if="!customer.isAuthenticated.value"
      :data="{ heading: { text: headingText } }"
      :language="language"
    />

    <div v-else class="lcms-customer-account__content">
      <h2 class="lcms-customer-account__heading">{{ headingText }}</h2>

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
          <div v-for="order in orders" :key="order.uuid" class="lcms-customer-account__order">
            <div class="lcms-customer-account__order-header">
              <div>
                <div class="lcms-customer-account__order-number">{{ order.order_number }}</div>
                <div class="lcms-customer-account__order-date">{{ formatDate(order.created_at) }}</div>
              </div>
              <span class="lcms-customer-account__order-status" :class="`lcms-customer-account__order-status--${order.status}`">
                {{ order.status }}
              </span>
            </div>
            <div class="lcms-customer-account__order-total">
              {{ formatPrice(order.total, currency) }}
            </div>
          </div>
        </div>
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

      <!-- Logout -->
      <button v-if="showLogout" type="button" class="lcms-customer-account__logout" @click="handleLogout">
        {{ t('logout') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.lcms-customer-account {
  font-family: var(--lcms-font-body, system-ui, sans-serif);
  color: var(--lcms-color-text, #1f2937);
}

.lcms-customer-account__heading {
  font-family: var(--lcms-font-heading, var(--lcms-font-body));
  font-size: var(--lcms-h2-font-size, 1.875rem);
  font-weight: var(--lcms-h2-font-weight, 700);
  margin: 0 0 1.5rem;
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
  border: 1px solid var(--lcms-input-border-color, #d1d5db);
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border: 1px solid var(--lcms-color-border, #e5e7eb);
  border-radius: var(--lcms-border-radius, 0.375rem);
}

.lcms-customer-account__order-header {
  display: flex;
  align-items: center;
  gap: 1rem;
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
  color: #fff;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-weight: 600;
  text-transform: uppercase;
}

.lcms-customer-account__logout {
  margin-top: 1.5rem;
  padding: 0.625rem 1.25rem;
  background: transparent;
  color: var(--lcms-color-danger, #ef4444);
  border: 1px solid var(--lcms-color-danger, #ef4444);
  border-radius: var(--lcms-border-radius, 0.375rem);
  font-size: 0.875rem;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
}

.lcms-customer-account__logout:hover {
  background: rgba(239, 68, 68, 0.05);
}
</style>
