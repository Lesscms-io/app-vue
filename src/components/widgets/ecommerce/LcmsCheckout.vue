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
import type { StorefrontShippingMethod, StorefrontPickupPoint, StorefrontAddress } from '../../../api/storefront'

defineOptions({ inheritAttrs: false })

interface Props {
  data: Record<string, any>
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const { extractValue } = useLanguage(props.language)
const { client } = useStorefront()
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
const successRoute = computed(() => config.value.success_route || '/zamowienie/sukces')

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
      accountStepTitle: 'Jak chcesz kontynuować?',
      accountLogin: 'Mam już konto',
      accountRegister: 'Załóż nowe konto',
      accountGuest: 'Kupuję jako gość',
      accountLoginTitle: 'Zaloguj się',
      accountRegisterTitle: 'Utwórz konto',
      accountBack: '← Wróć',
      accountPassword: 'Hasło',
      accountRequiredFields: 'Wypełnij wymagane pola',
      accountLoginButton: 'Zaloguj',
      accountRegisterButton: 'Zarejestruj i kontynuuj',
      loginFailed: 'Logowanie nie powiodło się',
      registerFailed: 'Rejestracja nie powiodła się',
      savedAddressesTitle: 'Zapisane adresy',
      savedAddressNew: 'Nowy adres',
      loggedInAs: 'Zalogowano jako',
      logout: 'Wyloguj',
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
      accountStepTitle: 'How would you like to continue?',
      accountLogin: 'I have an account',
      accountRegister: 'Create a new account',
      accountGuest: 'Continue as guest',
      accountLoginTitle: 'Sign in',
      accountRegisterTitle: 'Create an account',
      accountBack: '← Back',
      accountPassword: 'Password',
      accountRequiredFields: 'Please fill in the required fields',
      accountLoginButton: 'Sign in',
      accountRegisterButton: 'Register and continue',
      loginFailed: 'Login failed',
      registerFailed: 'Registration failed',
      savedAddressesTitle: 'Saved addresses',
      savedAddressNew: 'New address',
      loggedInAs: 'Signed in as',
      logout: 'Sign out',
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
  payment_method: '',
  notes: '',
})

const errors = reactive<Record<string, string>>({})
const isSubmitting = ref(false)
const shippingMethods = ref<StorefrontShippingMethod[]>([])
const isLoadingShipping = ref(false)

// Account flow — the customer needs to decide up front how they want to pay:
// as an existing customer (login), a new account (register), or as a guest.
// Logged-in customers skip straight to the form.
type AccountStep = 'choice' | 'login' | 'register' | 'guest' | 'done'
const accountStep = ref<AccountStep>('choice')
const loginForm = reactive({ email: '', password: '' })
const registerForm = reactive({ name: '', email: '', password: '', phone: '' })
const accountError = ref<string | null>(null)
const isAuthSubmitting = ref(false)

// Saved addresses (only loaded for authenticated customers)
const savedAddresses = ref<StorefrontAddress[]>([])
const selectedSavedAddressUuid = ref<string | null>(null)

// Pickup-point state. InPost-style paczkomat selection lives alongside
// the shipping method radio list: once the user picks a `requires_pickup_point`
// method we fetch points for their postal code and let them pick one.
const pickupPoints = ref<StorefrontPickupPoint[]>([])
const isLoadingPickupPoints = ref(false)
const selectedPickupPoint = ref<StorefrontPickupPoint | null>(null)

// Payment methods come from the shop's admin settings (via storefront API)
// — no hardcoded client-side catalog. Localized labels override the server
// name when available so the UI stays translated.
interface PaymentMethod { code: string; name: string }
const remotePaymentMethods = ref<PaymentMethod[]>([])
const isLoadingPaymentMethods = ref(false)

const paymentLabelFor = (code: string, fallback: string) => {
  const key = ({
    cod: 'paymentCod',
    cash: 'paymentCod',
    bank_transfer: 'paymentBankTransfer',
    p24: 'paymentP24',
    przelewy24: 'paymentP24',
    stripe: 'paymentStripe',
  } as Record<string, string>)[code]
  return key ? t(key) : fallback
}

const paymentMethods = computed(() =>
  remotePaymentMethods.value.map(m => ({
    code: m.code,
    label: paymentLabelFor(m.code, m.name),
  }))
)

const selectedShipping = computed(() =>
  shippingMethods.value.find(m => m.code === form.shipping_method) || null
)

// Storefront now returns `price` in minor units (grosze / cents) via the
// shipping-service microservice; `cost` is kept for legacy mock payloads.
function methodAmount(method: StorefrontShippingMethod | null): number {
  if (!method) return 0
  if (typeof method.price === 'number') return method.price / 100
  if (typeof method.cost === 'number') return method.cost
  return 0
}

const shippingCost = computed(() => methodAmount(selectedShipping.value))
const subtotal = computed(() => cart.cart.value?.totals.subtotal || 0)
const total = computed(() => subtotal.value + shippingCost.value)

const pickupPointRequired = computed(() =>
  Boolean(selectedShipping.value?.requires_pickup_point)
)

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

// Skip the account-choice step when the customer is already authenticated
// (e.g. arrived from the account page or refreshed the tab).
watch(() => customer.isAuthenticated.value, (isAuth) => {
  if (isAuth) {
    accountStep.value = 'done'
    fetchSavedAddresses()
  } else if (accountStep.value === 'done') {
    // logged out mid-checkout — restart the account flow
    accountStep.value = 'choice'
    savedAddresses.value = []
    selectedSavedAddressUuid.value = null
  }
}, { immediate: true })

async function fetchSavedAddresses() {
  if (!client.value) return
  try {
    const response = await client.value.getAddresses()
    savedAddresses.value = response.data.addresses || []
    const def = response.data.default_address
    if (def?.uuid) {
      selectedSavedAddressUuid.value = def.uuid
      applySavedAddress(def)
    }
  } catch {
    savedAddresses.value = []
  }
}

function applySavedAddress(addr: StorefrontAddress) {
  if (!addr) return
  selectedSavedAddressUuid.value = addr.uuid ?? null
  form.shipping_street = addr.street || ''
  form.shipping_city = addr.city || ''
  form.shipping_postal_code = addr.postal_code || ''
  form.shipping_country = addr.country || 'PL'
  if (addr.name) form.customer_name = addr.name
  if (addr.phone) form.customer_phone = addr.phone
}

async function handleLogin() {
  accountError.value = null
  if (!loginForm.email || !loginForm.password) {
    accountError.value = t('accountRequiredFields')
    return
  }
  isAuthSubmitting.value = true
  try {
    await customer.login(loginForm.email, loginForm.password)
    // watch() above flips accountStep to 'done' and pulls addresses.
  } catch (err: any) {
    accountError.value = err?.message || t('loginFailed')
  } finally {
    isAuthSubmitting.value = false
  }
}

async function handleRegister() {
  accountError.value = null
  if (!registerForm.email || !registerForm.password || !registerForm.name) {
    accountError.value = t('accountRequiredFields')
    return
  }
  isAuthSubmitting.value = true
  try {
    await customer.register({
      name: registerForm.name,
      email: registerForm.email,
      password: registerForm.password,
      phone: registerForm.phone || undefined,
    })
  } catch (err: any) {
    accountError.value = err?.message || t('registerFailed')
  } finally {
    isAuthSubmitting.value = false
  }
}

function continueAsGuest() {
  accountStep.value = 'guest'
  accountError.value = null
}

function switchAccountStep(step: AccountStep) {
  accountStep.value = step
  accountError.value = null
}

// Load payment methods from the shop's admin settings on mount
async function loadPaymentMethods() {
  if (!client.value) return
  isLoadingPaymentMethods.value = true
  try {
    const response = await client.value.getPaymentMethods()
    remotePaymentMethods.value = response.data || []
    if (remotePaymentMethods.value.length > 0 && !form.payment_method) {
      form.payment_method = remotePaymentMethods.value[0].code
    }
  } catch {
    remotePaymentMethods.value = []
  } finally {
    isLoadingPaymentMethods.value = false
  }
}

onMounted(loadPaymentMethods)

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

async function loadPickupPoints() {
  if (!client.value || !selectedShipping.value) return
  if (!form.shipping_postal_code || form.shipping_postal_code.length < 5) return

  isLoadingPickupPoints.value = true
  try {
    const response = await client.value.getPickupPoints({
      postal_code: form.shipping_postal_code,
      carrier: selectedShipping.value.carrier,
      radius: 10,
    })
    pickupPoints.value = response.data.points || []
  } catch {
    pickupPoints.value = []
  } finally {
    isLoadingPickupPoints.value = false
  }
}

function selectPickupPoint(point: StorefrontPickupPoint) {
  selectedPickupPoint.value = point
}

watch(pickupPointRequired, async (required) => {
  if (!required) {
    pickupPoints.value = []
    selectedPickupPoint.value = null
    return
  }
  await loadPickupPoints()
})

watch(
  () => form.shipping_postal_code,
  async () => {
    if (pickupPointRequired.value) {
      await loadPickupPoints()
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

  if (pickupPointRequired.value && !selectedPickupPoint.value) {
    errors.pickup_point = t('requiredField')
  }

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
      metadata: {
        // The carrier-side service code (e.g. `inpost_locker_standard`)
        // that main BE forwards to shipping-service when generating a label.
        shipx_service: selectedShipping.value?.shipx_service || undefined,
        pickup_point: selectedPickupPoint.value || undefined,
      },
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
          `${window.location.origin}${successRoute.value}?order=${order.order_number}`
        )
        if (paymentResponse.data.payment_url) {
          window.location.href = paymentResponse.data.payment_url
          return
        }
      } catch (err: any) {
        console.error('Payment init failed:', err)
      }
    }

    // Default (COD/bank transfer): redirect straight to success page
    window.location.href = `${successRoute.value}?order=${order.order_number}`
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

    <!-- Initial fetch — don't flash "cart is empty" before the real state. -->
    <div v-if="!cart.hasInitialized.value || cart.isLoading.value" class="lcms-checkout__loading">
      <div class="lcms-checkout__spinner" aria-hidden="true" />
    </div>

    <!-- Empty cart -->
    <div v-else-if="cart.isEmpty.value" class="lcms-checkout__empty">
      <p>{{ t('emptyCart') }}</p>
      <a :href="cartUrl" class="lcms-checkout__btn lcms-checkout__btn--secondary">
        {{ t('goToCart') }}
      </a>
    </div>

    <!-- Login required (admin forced it — no guest path allowed) -->
    <div v-else-if="requireLogin && !customer.isAuthenticated.value" class="lcms-checkout__login-required">
      <p>{{ t('loginRequired') }}</p>
      <a :href="loginUrl" class="lcms-checkout__btn lcms-checkout__btn--primary">
        {{ t('goToLogin') }}
      </a>
    </div>

    <!-- Step 1: account choice (login / register / guest). Skipped for logged-in
         customers and bypassed by 'guest' / 'done' once a path is picked. -->
    <div v-else-if="accountStep === 'choice'" class="lcms-checkout__account">
      <h3 class="lcms-checkout__section-title">{{ t('accountStepTitle') }}</h3>
      <div class="lcms-checkout__account-choices">
        <button type="button" class="lcms-checkout__btn lcms-checkout__btn--primary" @click="switchAccountStep('login')">
          {{ t('accountLogin') }}
        </button>
        <button type="button" class="lcms-checkout__btn lcms-checkout__btn--secondary" @click="switchAccountStep('register')">
          {{ t('accountRegister') }}
        </button>
        <button type="button" class="lcms-checkout__btn lcms-checkout__btn--ghost" @click="continueAsGuest">
          {{ t('accountGuest') }}
        </button>
      </div>
    </div>

    <div v-else-if="accountStep === 'login'" class="lcms-checkout__account">
      <h3 class="lcms-checkout__section-title">{{ t('accountLoginTitle') }}</h3>
      <form class="lcms-checkout__account-form" @submit.prevent="handleLogin">
        <div class="lcms-checkout__field">
          <label class="lcms-checkout__label">{{ t('email') }} *</label>
          <input v-model="loginForm.email" type="email" required class="lcms-checkout__input" />
        </div>
        <div class="lcms-checkout__field">
          <label class="lcms-checkout__label">{{ t('accountPassword') }} *</label>
          <input v-model="loginForm.password" type="password" required class="lcms-checkout__input" />
        </div>
        <p v-if="accountError" class="lcms-checkout__error">{{ accountError }}</p>
        <div class="lcms-checkout__account-actions">
          <button type="button" class="lcms-checkout__btn lcms-checkout__btn--ghost" @click="switchAccountStep('choice')">
            {{ t('accountBack') }}
          </button>
          <button type="submit" class="lcms-checkout__btn lcms-checkout__btn--primary" :disabled="isAuthSubmitting">
            {{ isAuthSubmitting ? t('processing') : t('accountLoginButton') }}
          </button>
        </div>
      </form>
    </div>

    <div v-else-if="accountStep === 'register'" class="lcms-checkout__account">
      <h3 class="lcms-checkout__section-title">{{ t('accountRegisterTitle') }}</h3>
      <form class="lcms-checkout__account-form" @submit.prevent="handleRegister">
        <div class="lcms-checkout__field">
          <label class="lcms-checkout__label">{{ t('name') }} *</label>
          <input v-model="registerForm.name" type="text" required class="lcms-checkout__input" />
        </div>
        <div class="lcms-checkout__field">
          <label class="lcms-checkout__label">{{ t('email') }} *</label>
          <input v-model="registerForm.email" type="email" required class="lcms-checkout__input" />
        </div>
        <div class="lcms-checkout__field">
          <label class="lcms-checkout__label">{{ t('accountPassword') }} *</label>
          <input v-model="registerForm.password" type="password" required minlength="6" class="lcms-checkout__input" />
        </div>
        <div class="lcms-checkout__field">
          <label class="lcms-checkout__label">{{ t('phone') }}</label>
          <input v-model="registerForm.phone" type="tel" class="lcms-checkout__input" />
        </div>
        <p v-if="accountError" class="lcms-checkout__error">{{ accountError }}</p>
        <div class="lcms-checkout__account-actions">
          <button type="button" class="lcms-checkout__btn lcms-checkout__btn--ghost" @click="switchAccountStep('choice')">
            {{ t('accountBack') }}
          </button>
          <button type="submit" class="lcms-checkout__btn lcms-checkout__btn--primary" :disabled="isAuthSubmitting">
            {{ isAuthSubmitting ? t('processing') : t('accountRegisterButton') }}
          </button>
        </div>
      </form>
    </div>

    <!-- Step 2: checkout form (reached via guest / logged-in / done states) -->
    <form v-else class="lcms-checkout__form" @submit.prevent="handleSubmit">
      <!-- Logged-in banner + logout -->
      <div v-if="customer.isAuthenticated.value" class="lcms-checkout__logged-in">
        <span>{{ t('loggedInAs') }} <strong>{{ customer.customer.value?.email }}</strong></span>
        <button type="button" class="lcms-checkout__btn-link" @click="customer.logout">
          {{ t('logout') }}
        </button>
      </div>
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

            <!-- Saved addresses picker (logged-in customers only) -->
            <div v-if="savedAddresses.length > 0" class="lcms-checkout__saved-addresses">
              <label class="lcms-checkout__label">{{ t('savedAddressesTitle') }}</label>
              <div class="lcms-checkout__saved-addresses-list">
                <label
                  v-for="addr in savedAddresses"
                  :key="addr.uuid"
                  class="lcms-checkout__saved-address"
                  :class="{ 'lcms-checkout__saved-address--selected': selectedSavedAddressUuid === addr.uuid }"
                >
                  <input
                    type="radio"
                    :value="addr.uuid"
                    :checked="selectedSavedAddressUuid === addr.uuid"
                    @change="applySavedAddress(addr)"
                  />
                  <span class="lcms-checkout__saved-address-body">
                    <strong>{{ addr.name || addr.street }}</strong>
                    <span>{{ addr.street }}, {{ addr.postal_code }} {{ addr.city }}</span>
                  </span>
                </label>
                <label
                  class="lcms-checkout__saved-address"
                  :class="{ 'lcms-checkout__saved-address--selected': selectedSavedAddressUuid === null }"
                >
                  <input
                    type="radio"
                    :value="null"
                    :checked="selectedSavedAddressUuid === null"
                    @change="selectedSavedAddressUuid = null"
                  />
                  <span class="lcms-checkout__saved-address-body">
                    <strong>{{ t('savedAddressNew') }}</strong>
                  </span>
                </label>
              </div>
            </div>

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
                  <div v-if="method.estimated_days" class="lcms-checkout__radio-desc">
                    {{ props.language === 'en' ? 'Delivery' : 'Dostawa' }}: {{ method.estimated_days }}
                  </div>
                </div>
                <div class="lcms-checkout__radio-price">{{ formatPrice(methodAmount(method), currency) }}</div>
              </label>
            </div>
            <span v-if="errors.shipping_method" class="lcms-checkout__error">{{ errors.shipping_method }}</span>

            <!-- Pickup point selector — only for methods that require one (InPost paczkomaty, DPD Pickup, etc.) -->
            <div v-if="pickupPointRequired" class="lcms-checkout__pickup">
              <h4 class="lcms-checkout__subsection-title">
                {{ props.language === 'en' ? 'Pickup point' : 'Punkt odbioru' }}
              </h4>

              <div v-if="isLoadingPickupPoints" class="lcms-checkout__loading-text">
                {{ props.language === 'en' ? 'Loading points...' : 'Ładowanie punktów...' }}
              </div>
              <div
                v-else-if="pickupPoints.length === 0"
                class="lcms-checkout__loading-text"
              >
                {{ props.language === 'en' ? 'No pickup points nearby' : 'Brak punktów w pobliżu' }}
              </div>
              <ul v-else class="lcms-checkout__pickup-list">
                <li
                  v-for="point in pickupPoints.slice(0, 15)"
                  :key="point.id"
                  :class="{
                    'lcms-checkout__pickup-item': true,
                    'lcms-checkout__pickup-item--selected': selectedPickupPoint?.id === point.id,
                  }"
                  @click="selectPickupPoint(point)"
                >
                  <div class="lcms-checkout__pickup-name">{{ point.name }}</div>
                  <div class="lcms-checkout__pickup-address">
                    {{ point.address }}{{ point.city ? `, ${point.city}` : '' }}
                  </div>
                </li>
              </ul>

              <div v-if="selectedPickupPoint" class="lcms-checkout__pickup-selected">
                <strong>{{ selectedPickupPoint.name }}</strong>
                <span>{{ selectedPickupPoint.address }}</span>
              </div>
              <span v-if="errors.pickup_point" class="lcms-checkout__error">{{ errors.pickup_point }}</span>
            </div>
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

.lcms-checkout *,
.lcms-checkout *::before,
.lcms-checkout *::after {
  box-sizing: border-box;
}

.lcms-checkout__heading {
  font-family: var(--lcms-font-heading, var(--lcms-font-body));
  font-size: var(--lcms-h1-font-size, 2.25rem);
  font-weight: var(--lcms-h1-font-weight, 700);
  color: var(--lcms-h1-color, var(--lcms-color-text));
  margin: 0 0 var(--lcms-section-gap, 2rem);
}

.lcms-checkout__loading {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 6rem 1rem;
}

.lcms-checkout__spinner {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 3px solid var(--lcms-color-border, #e5e7eb);
  border-top-color: var(--lcms-color-primary, #3d2b1f);
  animation: lcms-checkout-spin 0.8s linear infinite;
}

@keyframes lcms-checkout-spin {
  to { transform: rotate(360deg); }
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

.lcms-checkout__account {
  max-width: 520px;
  margin: 0 auto;
  padding: 1rem 0 3rem;
}

.lcms-checkout__account-choices {
  display: grid;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.lcms-checkout__account-form {
  display: grid;
  gap: 1rem;
  margin-top: 1rem;
}

.lcms-checkout__account-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-top: 0.5rem;
}

.lcms-checkout__btn--ghost {
  background: transparent;
  color: var(--lcms-color-text, #111);
  border: 1px solid var(--lcms-color-border, #e5e7eb);
}

.lcms-checkout__btn--ghost:hover {
  background: var(--lcms-color-background-alt, #f5f5f5);
}

.lcms-checkout__logged-in {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  margin: 0 0 1.5rem;
  background: var(--lcms-color-background-alt, #f8f9fa);
  border-radius: 6px;
  font-size: 0.95rem;
}

.lcms-checkout__btn-link {
  background: none;
  border: none;
  padding: 0;
  color: var(--lcms-color-link, #832a0d);
  text-decoration: underline;
  cursor: pointer;
  font-size: inherit;
}

.lcms-checkout__saved-addresses {
  margin-bottom: 1.25rem;
}

.lcms-checkout__saved-addresses-list {
  display: grid;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.lcms-checkout__saved-address {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border: 1px solid var(--lcms-color-border, #e5e7eb);
  border-radius: 6px;
  cursor: pointer;
  transition: border-color 0.15s ease;
}

.lcms-checkout__saved-address:hover {
  border-color: var(--lcms-color-primary, #3d2b1f);
}

.lcms-checkout__saved-address--selected {
  border-color: var(--lcms-color-primary, #3d2b1f);
  background: var(--lcms-color-background-alt, #fff5f2);
}

.lcms-checkout__saved-address input[type="radio"] {
  margin-top: 0.25rem;
}

.lcms-checkout__saved-address-body {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  font-size: 0.9rem;
}

.lcms-checkout__saved-address-body strong {
  font-weight: 600;
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
  box-sizing: border-box;
  padding: 0.625rem 0.875rem;
  background: var(--lcms-input-bg-color, var(--lcms-color-background, #fff));
  color: var(--lcms-input-text-color, var(--lcms-color-text, #1f2937));
  border: var(--lcms-input-border-width, 1px) var(--lcms-input-border-style, solid) var(--lcms-input-border-color, var(--lcms-color-border, #d1d5db));
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
  border-top-color: var(--lcms-color-white, #fff);
  border-radius: 50%;
  animation: lcms-spin 0.8s linear infinite;
}

@keyframes lcms-spin {
  to { transform: rotate(360deg); }
}

.lcms-checkout__pickup {
  margin-top: 1.25rem;
  padding: 1rem;
  background: var(--lcms-color-surface, #f9fafb);
  border-radius: 0.5rem;
}

.lcms-checkout__subsection-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.75rem;
}

.lcms-checkout__pickup-list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 320px;
  overflow-y: auto;
  display: grid;
  gap: 0.5rem;
}

.lcms-checkout__pickup-item {
  padding: 0.75rem;
  border: 1px solid var(--lcms-color-border, #e5e7eb);
  border-radius: 0.375rem;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.lcms-checkout__pickup-item:hover {
  border-color: var(--lcms-color-primary, #3b82f6);
}

.lcms-checkout__pickup-item--selected {
  border-color: var(--lcms-color-primary, #3b82f6);
  background: rgba(59, 130, 246, 0.05);
}

.lcms-checkout__pickup-name {
  font-weight: 600;
  font-size: 0.9375rem;
}

.lcms-checkout__pickup-address {
  font-size: 0.875rem;
  color: var(--lcms-color-muted, #6b7280);
}

.lcms-checkout__pickup-selected {
  margin-top: 0.75rem;
  padding: 0.75rem;
  background: var(--lcms-color-white, #fff);
  border: 1px solid var(--lcms-color-primary, #3b82f6);
  border-radius: 0.375rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.9375rem;
}
</style>
