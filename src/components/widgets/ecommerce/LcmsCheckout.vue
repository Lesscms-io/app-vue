<script setup lang="ts">
/**
 * Checkout Widget (E-commerce)
 *
 * Full checkout form: contact, shipping address, billing, shipping method,
 * payment method, notes, summary, submit.
 */

import { computed, ref, reactive, onMounted, watch, inject, type Ref } from 'vue'
import { useLanguage } from '../../../composables/useLanguage'
import { useStorefront } from '../../../composables/useStorefront'
import { useCart } from '../../../composables/useCart'
import { useCustomer } from '../../../composables/useCustomer'
import { useToast } from '../../../composables/useToast'
import { formatPrice } from '../../../utils/currency'
import type { StorefrontShippingMethod } from '../../../api/storefront'

defineOptions({ inheritAttrs: false })

interface Props {
  data: Record<string, any>
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const { extractValue } = useLanguage(props.language)
const { client, isAvailable } = useStorefront()
const cart = useCart()
const customer = useCustomer()
const toast = useToast()
const projectConfig = inject<Ref<any> | null>('lesscms-project-config', null)

const config = computed(() => props.data?.config || props.data || {})
const headingText = computed(() =>
  extractValue(props.data?.heading?.text) || (props.language === 'en' ? 'Checkout' : 'Zamówienie')
)
const submitButtonText = computed(() =>
  extractValue(props.data?.submit_button?.text) || (props.language === 'en' ? 'Place order' : 'Złóż zamówienie')
)
const requireLogin = computed(() => config.value.require_login === true)
const thankYouRoute = computed(() => config.value.thank_you_route || '/')

const currency = computed(() => projectConfig?.value?.commerce?.currency || 'PLN')
const cartUrl = computed(() => projectConfig?.value?.commerce?.routes?.cart || '/koszyk')
const loginUrl = computed(() => projectConfig?.value?.commerce?.routes?.account || '/konto')

const t = (key: string) => {
  const lang = props.language || 'pl'
  const dict: Record<string, Record<string, string>> = {
    pl: {
      contactInfo: 'Dane kontaktowe',
      shippingAddress: 'Adres dostawy',
      billingAddress: 'Adres rozliczeniowy',
      sameAsShipping: 'Taki sam jak adres dostawy',
      shippingMethod: 'Metoda dostawy',
      paymentMethod: 'Metoda płatności',
      notes: 'Uwagi do zamówienia',
      summary: 'Podsumowanie zamówienia',
      subtotal: 'Suma częściowa',
      shippingCost: 'Wysyłka',
      total: 'Razem',
      name: 'Imię i nazwisko',
      email: 'Email',
      phone: 'Telefon',
      company: 'Firma (opcjonalnie)',
      taxId: 'NIP (opcjonalnie)',
      street: 'Ulica i nr',
      city: 'Miasto',
      postalCode: 'Kod pocztowy',
      country: 'Kraj',
      notesPlaceholder: 'Dodatkowe informacje do zamówienia...',
      placeOrder: 'Złóż zamówienie',
      processing: 'Przetwarzanie...',
      emptyCart: 'Twój koszyk jest pusty',
      goToCart: 'Wróć do koszyka',
      loginRequired: 'Aby kontynuować zaloguj się',
      goToLogin: 'Przejdź do logowania',
      requiredField: 'To pole jest wymagane',
      invalidEmail: 'Nieprawidłowy email',
      invalidPostalCode: 'Format: XX-XXX',
      orderError: 'Nie udało się złożyć zamówienia',
      orderSuccess: 'Zamówienie zostało złożone',
      paymentP24: 'Przelewy24',
      paymentStripe: 'Karta płatnicza',
      paymentCod: 'Płatność za pobraniem',
      paymentBankTransfer: 'Przelew bankowy',
    },
    en: {
      contactInfo: 'Contact information',
      shippingAddress: 'Shipping address',
      billingAddress: 'Billing address',
      sameAsShipping: 'Same as shipping address',
      shippingMethod: 'Shipping method',
      paymentMethod: 'Payment method',
      notes: 'Order notes',
      summary: 'Order summary',
      subtotal: 'Subtotal',
      shippingCost: 'Shipping',
      total: 'Total',
      name: 'Full name',
      email: 'Email',
      phone: 'Phone',
      company: 'Company (optional)',
      taxId: 'Tax ID (optional)',
      street: 'Street and number',
      city: 'City',
      postalCode: 'Postal code',
      country: 'Country',
      notesPlaceholder: 'Additional order information...',
      placeOrder: 'Place order',
      processing: 'Processing...',
      emptyCart: 'Your cart is empty',
      goToCart: 'Back to cart',
      loginRequired: 'Please log in to continue',
      goToLogin: 'Go to login',
      requiredField: 'This field is required',
      invalidEmail: 'Invalid email',
      invalidPostalCode: 'Format: XX-XXX',
      orderError: 'Failed to place order',
      orderSuccess: 'Order placed successfully',
      paymentP24: 'Przelewy24',
      paymentStripe: 'Credit/Debit Card',
      paymentCod: 'Cash on Delivery',
      paymentBankTransfer: 'Bank Transfer',
    },
  }
  return dict[lang]?.[key] || dict.pl[key] || key
}

// Form state
const form = reactive({
  customer_name: '',
  customer_email: '',
  customer_phone: '',
  company: '',
  tax_id: '',
  shipping_street: '',
  shipping_city: '',
  shipping_postal_code: '',
  shipping_country: 'PL',
  billing_same: true,
  billing_street: '',
  billing_city: '',
  billing_postal_code: '',
  billing_country: 'PL',
  shipping_method: '',
  payment_method: 'cod',
  notes: '',
})

const errors = reactive<Record<string, string>>({})
const isSubmitting = ref(false)
const shippingMethods = ref<StorefrontShippingMethod[]>([])
const isLoadingShipping = ref(false)

const paymentMethods = computed(() => [
  { code: 'cod', label: t('paymentCod') },
  { code: 'bank_transfer', label: t('paymentBankTransfer') },
  { code: 'p24', label: t('paymentP24') },
  { code: 'stripe', label: t('paymentStripe') },
])

const selectedShipping = computed(() =>
  shippingMethods.value.find(m => m.code === form.shipping_method) || null
)

const shippingCost = computed(() => selectedShipping.value?.cost || 0)
const subtotal = computed(() => cart.cart.value?.totals.subtotal || 0)
const total = computed(() => subtotal.value + shippingCost.value)

// Pre-fill from logged-in customer
watch(() => customer.customer.value, (cust) => {
  if (cust) {
    form.customer_name = cust.name || form.customer_name
    form.customer_email = cust.email || form.customer_email
    form.customer_phone = cust.phone || form.customer_phone
    form.company = cust.company || ''
    form.tax_id = cust.tax_id || ''
    if (cust.default_address) {
      form.shipping_street = cust.default_address.street || ''
      form.shipping_city = cust.default_address.city || ''
      form.shipping_postal_code = cust.default_address.postal_code || ''
      form.shipping_country = cust.default_address.country || 'PL'
    }
  }
}, { immediate: true })

// Auto-recalculate shipping when address changes
watch(
  () => [form.shipping_postal_code, form.shipping_country],
  async () => {
    if (!client.value || !form.shipping_postal_code || form.shipping_postal_code.length < 5) return
    isLoadingShipping.value = true
    try {
      const response = await client.value.calculateShipping({
        postal_code: form.shipping_postal_code,
        country: form.shipping_country,
        items_count: cart.itemsCount.value,
        cart_uuid: cart.cartUuid.value || undefined,
      })
      shippingMethods.value = response.data.methods || []
      if (shippingMethods.value.length > 0 && !form.shipping_method) {
        form.shipping_method = shippingMethods.value[0].code
      }
    } catch {
      shippingMethods.value = []
    } finally {
      isLoadingShipping.value = false
    }
  }
)

function validate(): boolean {
  Object.keys(errors).forEach(k => delete errors[k])

  if (!form.customer_name.trim()) errors.customer_name = t('requiredField')
  if (!form.customer_email.trim()) errors.customer_email = t('requiredField')
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customer_email)) errors.customer_email = t('invalidEmail')

  if (!form.shipping_street.trim()) errors.shipping_street = t('requiredField')
  if (!form.shipping_city.trim()) errors.shipping_city = t('requiredField')
  if (!form.shipping_postal_code.trim()) errors.shipping_postal_code = t('requiredField')
  else if (form.shipping_country === 'PL' && !/^\d{2}-\d{3}$/.test(form.shipping_postal_code)) {
    errors.shipping_postal_code = t('invalidPostalCode')
  }

  if (!form.shipping_method) errors.shipping_method = t('requiredField')
  if (!form.payment_method) errors.payment_method = t('requiredField')

  return Object.keys(errors).length === 0
}

async function handleSubmit() {
  if (!validate()) {
    const firstError = Object.keys(errors)[0]
    if (firstError) {
      const el = document.querySelector(`[name="${firstError}"]`) as HTMLElement
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    return
  }

  if (!cart.cartUuid.value) return

  isSubmitting.value = true
  try {
    const checkoutData: any = {
      customer_name: form.customer_name,
      customer_email: form.customer_email,
      customer_phone: form.customer_phone || undefined,
      shipping_address: {
        street: form.shipping_street,
        city: form.shipping_city,
        postal_code: form.shipping_postal_code,
        country: form.shipping_country,
      },
      payment_method: form.payment_method,
      shipping_method: form.shipping_method,
      shipping_cost: shippingCost.value,
      notes: form.notes || undefined,
    }

    if (!form.billing_same) {
      checkoutData.billing_address = {
        street: form.billing_street,
        city: form.billing_city,
        postal_code: form.billing_postal_code,
        country: form.billing_country,
      }
    }

    if (customer.customer.value?.uuid) {
      checkoutData.customer_uuid = customer.customer.value.uuid
    }

    const order = await cart.checkout(checkoutData)
    toast.success(t('orderSuccess'))

    // Init payment if not COD
    if (form.payment_method !== 'cod' && client.value) {
      try {
        const paymentResponse = await client.value.initPayment(
          order.uuid,
          form.payment_method,
          `${window.location.origin}${thankYouRoute.value}?order=${order.order_number}`
        )
        if (paymentResponse.data.payment_url) {
          window.location.href = paymentResponse.data.payment_url
          return
        }
      } catch (err: any) {
        console.error('Payment init failed:', err)
      }
    }

    // Default: redirect to thank-you page
    window.location.href = `${thankYouRoute.value}?order=${order.order_number}`
  } catch (err: any) {
    toast.error(err.message || t('orderError'))
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="lcms-checkout">
    <h2 class="lcms-checkout__heading">{{ headingText }}</h2>

    <!-- Empty cart -->
    <div v-if="cart.isEmpty.value" class="lcms-checkout__empty">
      <p>{{ t('emptyCart') }}</p>
      <a :href="cartUrl" class="lcms-checkout__btn lcms-checkout__btn--secondary">
        {{ t('goToCart') }}
      </a>
    </div>

    <!-- Login required -->
    <div v-else-if="requireLogin && !customer.isAuthenticated.value" class="lcms-checkout__login-required">
      <p>{{ t('loginRequired') }}</p>
      <a :href="loginUrl" class="lcms-checkout__btn lcms-checkout__btn--primary">
        {{ t('goToLogin') }}
      </a>
    </div>

    <!-- Form -->
    <form v-else class="lcms-checkout__form" @submit.prevent="handleSubmit">
      <div class="lcms-checkout__layout">
        <div class="lcms-checkout__main">
          <!-- Contact -->
          <section class="lcms-checkout__section">
            <h3 class="lcms-checkout__section-title">{{ t('contactInfo') }}</h3>

            <div class="lcms-checkout__field">
              <label class="lcms-checkout__label">{{ t('email') }} *</label>
              <input
                v-model="form.customer_email"
                type="email"
                name="customer_email"
                class="lcms-checkout__input"
                :class="{ 'lcms-checkout__input--error': errors.customer_email }"
              />
              <span v-if="errors.customer_email" class="lcms-checkout__error">{{ errors.customer_email }}</span>
            </div>

            <div class="lcms-checkout__field">
              <label class="lcms-checkout__label">{{ t('name') }} *</label>
              <input
                v-model="form.customer_name"
                type="text"
                name="customer_name"
                class="lcms-checkout__input"
                :class="{ 'lcms-checkout__input--error': errors.customer_name }"
              />
              <span v-if="errors.customer_name" class="lcms-checkout__error">{{ errors.customer_name }}</span>
            </div>

            <div class="lcms-checkout__field">
              <label class="lcms-checkout__label">{{ t('phone') }}</label>
              <input v-model="form.customer_phone" type="tel" class="lcms-checkout__input" />
            </div>
          </section>

          <!-- Shipping -->
          <section class="lcms-checkout__section">
            <h3 class="lcms-checkout__section-title">{{ t('shippingAddress') }}</h3>

            <div class="lcms-checkout__field">
              <label class="lcms-checkout__label">{{ t('street') }} *</label>
              <input
                v-model="form.shipping_street"
                type="text"
                name="shipping_street"
                class="lcms-checkout__input"
                :class="{ 'lcms-checkout__input--error': errors.shipping_street }"
              />
              <span v-if="errors.shipping_street" class="lcms-checkout__error">{{ errors.shipping_street }}</span>
            </div>

            <div class="lcms-checkout__row">
              <div class="lcms-checkout__field">
                <label class="lcms-checkout__label">{{ t('postalCode') }} *</label>
                <input
                  v-model="form.shipping_postal_code"
                  type="text"
                  name="shipping_postal_code"
                  placeholder="00-000"
                  class="lcms-checkout__input"
                  :class="{ 'lcms-checkout__input--error': errors.shipping_postal_code }"
                />
                <span v-if="errors.shipping_postal_code" class="lcms-checkout__error">{{ errors.shipping_postal_code }}</span>
              </div>

              <div class="lcms-checkout__field">
                <label class="lcms-checkout__label">{{ t('city') }} *</label>
                <input
                  v-model="form.shipping_city"
                  type="text"
                  name="shipping_city"
                  class="lcms-checkout__input"
                  :class="{ 'lcms-checkout__input--error': errors.shipping_city }"
                />
                <span v-if="errors.shipping_city" class="lcms-checkout__error">{{ errors.shipping_city }}</span>
              </div>
            </div>

            <div class="lcms-checkout__field">
              <label class="lcms-checkout__label">{{ t('country') }} *</label>
              <select v-model="form.shipping_country" class="lcms-checkout__input">
                <option value="PL">Polska</option>
                <option value="DE">Deutschland</option>
                <option value="GB">United Kingdom</option>
                <option value="US">United States</option>
              </select>
            </div>
          </section>

          <!-- Shipping method -->
          <section class="lcms-checkout__section">
            <h3 class="lcms-checkout__section-title">{{ t('shippingMethod') }}</h3>

            <div v-if="isLoadingShipping" class="lcms-checkout__loading-text">
              {{ props.language === 'en' ? 'Loading...' : 'Ładowanie...' }}
            </div>

            <div v-else-if="shippingMethods.length === 0" class="lcms-checkout__loading-text">
              {{ props.language === 'en' ? 'Enter postal code first' : 'Wpisz najpierw kod pocztowy' }}
            </div>

            <div v-else class="lcms-checkout__radio-list">
              <label
                v-for="method in shippingMethods"
                :key="method.code"
                class="lcms-checkout__radio"
                :class="{ 'lcms-checkout__radio--selected': form.shipping_method === method.code }"
              >
                <input
                  v-model="form.shipping_method"
                  type="radio"
                  :value="method.code"
                  name="shipping_method"
                />
                <div class="lcms-checkout__radio-content">
                  <div class="lcms-checkout__radio-name">{{ method.name }}</div>
                  <div class="lcms-checkout__radio-desc">{{ method.description }}</div>
                </div>
                <div class="lcms-checkout__radio-price">{{ formatPrice(method.cost, currency) }}</div>
              </label>
            </div>
            <span v-if="errors.shipping_method" class="lcms-checkout__error">{{ errors.shipping_method }}</span>
          </section>

          <!-- Payment -->
          <section class="lcms-checkout__section">
            <h3 class="lcms-checkout__section-title">{{ t('paymentMethod') }}</h3>

            <div class="lcms-checkout__radio-list">
              <label
                v-for="method in paymentMethods"
                :key="method.code"
                class="lcms-checkout__radio"
                :class="{ 'lcms-checkout__radio--selected': form.payment_method === method.code }"
              >
                <input
                  v-model="form.payment_method"
                  type="radio"
                  :value="method.code"
                  name="payment_method"
                />
                <div class="lcms-checkout__radio-content">
                  <div class="lcms-checkout__radio-name">{{ method.label }}</div>
                </div>
              </label>
            </div>
          </section>

          <!-- Notes -->
          <section class="lcms-checkout__section">
            <h3 class="lcms-checkout__section-title">{{ t('notes') }}</h3>
            <textarea
              v-model="form.notes"
              class="lcms-checkout__input lcms-checkout__textarea"
              rows="3"
              :placeholder="t('notesPlaceholder')"
            />
          </section>
        </div>

        <!-- Summary sidebar -->
        <aside class="lcms-checkout__summary">
          <h3 class="lcms-checkout__summary-title">{{ t('summary') }}</h3>

          <div class="lcms-checkout__summary-items">
            <div
              v-for="item in (cart.cart.value?.items || [])"
              :key="item.uuid"
              class="lcms-checkout__summary-item"
            >
              <span class="lcms-checkout__summary-item-name">
                {{ item.product.name }} × {{ item.quantity }}
              </span>
              <span class="lcms-checkout__summary-item-price">
                {{ formatPrice(item.subtotal, currency) }}
              </span>
            </div>
          </div>

          <div class="lcms-checkout__summary-divider" />

          <div class="lcms-checkout__summary-row">
            <span>{{ t('subtotal') }}</span>
            <span>{{ formatPrice(subtotal, currency) }}</span>
          </div>

          <div class="lcms-checkout__summary-row">
            <span>{{ t('shippingCost') }}</span>
            <span>{{ formatPrice(shippingCost, currency) }}</span>
          </div>

          <div class="lcms-checkout__summary-divider" />

          <div class="lcms-checkout__summary-row lcms-checkout__summary-row--total">
            <span>{{ t('total') }}</span>
            <span>{{ formatPrice(total, currency) }}</span>
          </div>

          <button
            type="submit"
            class="lcms-checkout__btn lcms-checkout__btn--primary lcms-checkout__submit-btn"
            :disabled="isSubmitting"
          >
            <span v-if="isSubmitting" class="lcms-checkout__spinner" />
            {{ isSubmitting ? t('processing') : submitButtonText }}
          </button>
        </aside>
      </div>
    </form>
  </div>
</template>

<style scoped>
.lcms-checkout {
  font-family: var(--lcms-font-body, system-ui, sans-serif);
  color: var(--lcms-color-text, #1f2937);
}

.lcms-checkout__heading {
  font-family: var(--lcms-font-heading, var(--lcms-font-body));
  font-size: var(--lcms-h1-font-size, 2.25rem);
  font-weight: var(--lcms-h1-font-weight, 700);
  color: var(--lcms-h1-color, var(--lcms-color-text));
  margin: 0 0 var(--lcms-section-gap, 2rem);
}

.lcms-checkout__empty,
.lcms-checkout__login-required {
  text-align: center;
  padding: 4rem 1rem;
}

.lcms-checkout__empty p,
.lcms-checkout__login-required p {
  color: var(--lcms-color-muted, #6b7280);
  font-size: 1.125rem;
  margin: 0 0 1.5rem;
}

.lcms-checkout__layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
}

@media (min-width: 1024px) {
  .lcms-checkout__layout {
    grid-template-columns: 1fr 380px;
  }
}

.lcms-checkout__section {
  background: var(--lcms-color-background, #ffffff);
  border: 1px solid var(--lcms-color-border, #e5e7eb);
  border-radius: var(--lcms-border-radius, 0.5rem);
  padding: 1.5rem;
  margin-bottom: 1.25rem;
}

.lcms-checkout__section-title {
  font-family: var(--lcms-font-heading, var(--lcms-font-body));
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 1rem;
  color: var(--lcms-color-text, #1f2937);
}

.lcms-checkout__field {
  margin-bottom: 1rem;
}

.lcms-checkout__field:last-child {
  margin-bottom: 0;
}

.lcms-checkout__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.lcms-checkout__label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 0.375rem;
  color: var(--lcms-color-text, #374151);
}

.lcms-checkout__input,
.lcms-checkout__textarea {
  width: 100%;
  padding: 0.625rem 0.875rem;
  background: var(--lcms-input-bg-color, var(--lcms-color-background, #fff));
  color: var(--lcms-input-text-color, var(--lcms-color-text, #1f2937));
  border: var(--lcms-input-border-width, 1px) var(--lcms-input-border-style, solid) var(--lcms-input-border-color, #d1d5db);
  border-radius: var(--lcms-border-radius, 0.375rem);
  font-size: 0.9375rem;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.lcms-checkout__input:focus {
  border-color: var(--lcms-input-focus-border-color, var(--lcms-color-primary, #3b82f6));
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.lcms-checkout__input::placeholder {
  color: var(--lcms-input-placeholder-color, var(--lcms-color-muted, #9ca3af));
}

.lcms-checkout__input--error {
  border-color: var(--lcms-color-danger, #ef4444);
}

.lcms-checkout__textarea {
  resize: vertical;
  font-family: inherit;
}

.lcms-checkout__error {
  display: block;
  color: var(--lcms-color-danger, #ef4444);
  font-size: 0.8125rem;
  margin-top: 0.375rem;
}

/* Radio buttons */
.lcms-checkout__radio-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.lcms-checkout__radio {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  border: 1px solid var(--lcms-color-border, #e5e7eb);
  border-radius: var(--lcms-border-radius, 0.375rem);
  cursor: pointer;
  transition: all 0.15s;
}

.lcms-checkout__radio:hover {
  border-color: var(--lcms-color-primary, #3b82f6);
}

.lcms-checkout__radio--selected {
  border-color: var(--lcms-color-primary, #3b82f6);
  background: rgba(59, 130, 246, 0.04);
}

.lcms-checkout__radio input[type="radio"] {
  width: 1.125rem;
  height: 1.125rem;
  accent-color: var(--lcms-color-primary, #3b82f6);
}

.lcms-checkout__radio-content {
  flex: 1;
}

.lcms-checkout__radio-name {
  font-weight: 500;
  font-size: 0.9375rem;
}

.lcms-checkout__radio-desc {
  font-size: 0.75rem;
  color: var(--lcms-color-muted, #6b7280);
  margin-top: 0.125rem;
}

.lcms-checkout__radio-price {
  font-weight: 600;
  color: var(--lcms-color-primary, #3b82f6);
}

.lcms-checkout__loading-text {
  text-align: center;
  padding: 1rem;
  color: var(--lcms-color-muted, #6b7280);
  font-size: 0.875rem;
}

/* Summary sidebar */
.lcms-checkout__summary {
  background: var(--lcms-color-background, #ffffff);
  border: 1px solid var(--lcms-color-border, #e5e7eb);
  border-radius: var(--lcms-border-radius, 0.5rem);
  padding: 1.5rem;
  position: sticky;
  top: 1rem;
  align-self: start;
}

.lcms-checkout__summary-title {
  font-family: var(--lcms-font-heading, var(--lcms-font-body));
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 1rem;
}

.lcms-checkout__summary-items {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.lcms-checkout__summary-item {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.lcms-checkout__summary-item-name {
  flex: 1;
  color: var(--lcms-color-text, #4b5563);
}

.lcms-checkout__summary-item-price {
  font-weight: 500;
}

.lcms-checkout__summary-divider {
  height: 1px;
  background: var(--lcms-color-border, #e5e7eb);
  margin: 0.875rem 0;
}

.lcms-checkout__summary-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.9375rem;
  padding: 0.25rem 0;
}

.lcms-checkout__summary-row--total {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--lcms-color-text, #111827);
}

.lcms-checkout__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.875rem 1.5rem;
  border-radius: var(--lcms-btn-border-radius, var(--lcms-border-radius, 0.5rem));
  font-size: var(--lcms-btn-font-size, 1rem);
  font-weight: var(--lcms-btn-font-weight, 600);
  font-family: var(--lcms-font-button, var(--lcms-font-body));
  text-decoration: none;
  border: 1px solid transparent;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.1s;
}

.lcms-checkout__btn--primary {
  background: var(--lcms-color-primary, #3b82f6);
  color: var(--lcms-color-white, #fff);
}

.lcms-checkout__btn--primary:hover:not(:disabled) {
  opacity: 0.9;
}

.lcms-checkout__btn--primary:active:not(:disabled) {
  transform: scale(0.98);
}

.lcms-checkout__btn--primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.lcms-checkout__btn--secondary {
  background: var(--lcms-color-background, white);
  color: var(--lcms-color-text, #1f2937);
  border-color: var(--lcms-color-border, #d1d5db);
}

.lcms-checkout__submit-btn {
  width: 100%;
  margin-top: 1.25rem;
  padding: 1rem;
  font-size: 1.0625rem;
}

.lcms-checkout__spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: lcms-spin 0.8s linear infinite;
}

@keyframes lcms-spin {
  to { transform: rotate(360deg); }
}
</style>
