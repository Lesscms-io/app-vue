<script setup lang="ts">
/**
 * Checkout Widget (E-commerce)
 *
 * Full checkout form: contact, shipping address, billing, shipping method,
 * payment method, notes, summary, submit.
 */

import { computed, ref, reactive, onMounted, onBeforeUnmount, nextTick, watch, inject, type Ref } from 'vue'
import { useLanguage } from '../../../composables/useLanguage'
import { useStorefront } from '../../../composables/useStorefront'
import { useCart } from '../../../composables/useCart'
import { useCustomer } from '../../../composables/useCustomer'
import { useToast } from '../../../composables/useToast'
import { formatPrice } from '../../../utils/currency'
import type { StorefrontShippingMethod, StorefrontPickupPoint, StorefrontAddress } from '../../../api/storefront'
import { countriesFor } from '../../../data/countries'
import LcmsCountrySelect from '../../common/LcmsCountrySelect.vue'
import LcmsAddressBookModal from './LcmsAddressBookModal.vue'

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
      formIncomplete: 'Uzupełnij zaznaczone pola, aby złożyć zamówienie',
      orderError: 'Nie udało się złożyć zamówienia',
      orderSuccess: 'Zamówienie zostało złożone',
      paymentP24: 'Przelewy24',
      paymentBlik: 'BLIK',
      paymentStripe: 'Karta płatnicza',
      paymentCod: 'Płatność za pobraniem',
      paymentBankTransfer: 'Przelew bankowy',
      blikCode: 'Kod BLIK',
      blikCodeHint: 'Wpisz 6-cyfrowy kod z aplikacji bankowej',
      blikCodeInvalid: 'Kod BLIK musi mieć 6 cyfr',
      blikWaiting: 'Sprawdź aplikację bankową i potwierdź płatność',
      blikWaitingHint: 'Czekamy na potwierdzenie z banku...',
      blikTimedOut: 'Kod BLIK wygasł. Wygeneruj nowy w aplikacji i spróbuj ponownie.',
      blikFailed: 'Płatność BLIK nie powiodła się',
      blikRetry: 'Spróbuj ponownie',
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
      formIncomplete: 'Fill in the highlighted fields to place your order',
      orderError: 'Failed to place order',
      orderSuccess: 'Order placed successfully',
      paymentP24: 'Przelewy24',
      paymentBlik: 'BLIK',
      paymentStripe: 'Credit/Debit Card',
      paymentCod: 'Cash on Delivery',
      paymentBankTransfer: 'Bank Transfer',
      blikCode: 'BLIK code',
      blikCodeHint: 'Enter the 6-digit code from your banking app',
      blikCodeInvalid: 'BLIK code must be 6 digits',
      blikWaiting: 'Open your banking app and confirm the payment',
      blikWaitingHint: 'Waiting for confirmation from the bank...',
      blikTimedOut: 'BLIK code expired. Generate a new one and try again.',
      blikFailed: 'BLIK payment failed',
      blikRetry: 'Try again',
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
  wants_invoice: false,
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
  blik_code: '',
  notes: '',
})

const errors = reactive<Record<string, string>>({})
const isSubmitting = ref(false)
const shippingMethods = ref<StorefrontShippingMethod[]>([])
const isLoadingShipping = ref(false)

// BLIK direct flow — once initPayment fires, the customer has ~60s to confirm
// the push in their banking app. We poll status until it flips or we time out.
const blikWaiting = ref(false)
const blikTimedOut = ref(false)
const blikPaymentUuid = ref<string | null>(null)
const blikOrderNumber = ref<string | null>(null)

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
const selectedInvoiceAddressUuid = ref<string | null>(null)

// Address-book modal — separate instances for shipping vs invoice so they
// remember selection independently and don't reuse each other's view state.
const isShippingBookOpen = ref(false)
const isInvoiceBookOpen = ref(false)

function onShippingAddressPicked(addr: StorefrontAddress) {
  applySavedAddress(addr)
}

function onInvoiceAddressPicked(addr: StorefrontAddress) {
  applyInvoiceAddress(addr)
}

// Pickup-point state. InPost-style paczkomat selection lives alongside
// the shipping method radio list: once the user picks a `requires_pickup_point`
// method we fetch points for their postal code and let them pick one.
const pickupPoints = ref<StorefrontPickupPoint[]>([])
const isLoadingPickupPoints = ref(false)
const selectedPickupPoint = ref<StorefrontPickupPoint | null>(null)
const pickupPointsVisible = ref(20)
const pickupSearchTerm = ref('')

const filteredPickupPoints = computed(() => {
  const term = pickupSearchTerm.value.trim().toLowerCase()
  if (!term) return pickupPoints.value
  return pickupPoints.value.filter(p => {
    const haystack = `${p.name} ${p.address ?? ''} ${p.city ?? ''} ${p.postal_code ?? ''} ${p.description ?? ''}`.toLowerCase()
    return haystack.includes(term)
  })
})

const visiblePickupPoints = computed(() =>
  filteredPickupPoints.value.slice(0, pickupPointsVisible.value)
)

function formatDistance(meters?: number | null): string | null {
  if (meters == null || !Number.isFinite(meters)) return null
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(1).replace(/\.0$/, '')} km`
}

function formatOpeningHours(hours: StorefrontPickupPoint['opening_hours']): string | null {
  if (!hours) return null
  if (typeof hours === 'string') return hours
  if (typeof hours === 'object') {
    const today = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()]
    const todayKey = Object.keys(hours).find(k => k.toLowerCase().startsWith(today))
    if (todayKey) return hours[todayKey]
    const first = Object.values(hours)[0]
    return typeof first === 'string' ? first : null
  }
  return null
}

function loadMorePickupPoints() {
  pickupPointsVisible.value += 20
}

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
    blik: 'paymentBlik',
    stripe: 'paymentStripe',
  } as Record<string, string>)[code]
  return key ? t(key) : fallback
}

const paymentMethods = computed(() =>
  remotePaymentMethods.value.map(m => ({
    code: m.code,
    label: paymentLabelFor(m.code, m.name),
    logo_url: m.logo_url || null,
  }))
)

// Fallback boxicons class when a method has no admin-uploaded logo.
// Match by code first (more specific), then by carrier (shipping only).
function shippingIconClass(method: StorefrontShippingMethod): string {
  const code = (method.code || '').toLowerCase()
  const carrier = (method.carrier || '').toLowerCase()
  if (method.requires_pickup_point) return 'bx-store'
  if (code.includes('paczkomat') || carrier.includes('inpost')) return 'bx-package'
  if (carrier.includes('dpd') || carrier.includes('dhl') || carrier.includes('ups') || code.includes('kurier') || code.includes('courier')) return 'bx-car'
  if (code.includes('pickup') || code.includes('odbior')) return 'bx-store'
  return 'bx-package'
}

function paymentIconClass(code: string): string {
  const c = code.toLowerCase()
  if (c.includes('cod') || c.includes('pobranie')) return 'bx-money'
  if (c.includes('bank') || c.includes('transfer') || c.includes('przelew')) return 'bx-buildings'
  if (c.includes('blik')) return 'bx-mobile-alt'
  return 'bx-credit-card'
}

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

const countryOptions = computed(() => countriesFor(props.language))

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

// --- NIP lookup (Biała Lista VAT, Ministerstwo Finansów) ---
// Public, no auth, CORS allow-all. Triggered via explicit button — auto-lookup
// is heavy on the registry and surprises users mid-typing.
const isLookingUpNip = ref(false)
const nipLookupError = ref<string | null>(null)
const nipLookupSuccess = ref(false)

const canLookupNip = computed(() => {
  const digits = (form.tax_id || '').replace(/[^0-9]/g, '')
  return digits.length === 10 && !isLookingUpNip.value
})

watch(() => form.tax_id, () => {
  nipLookupError.value = null
  nipLookupSuccess.value = false
})

async function triggerNipLookup() {
  const digits = (form.tax_id || '').replace(/[^0-9]/g, '')
  if (digits.length !== 10) {
    nipLookupError.value = props.language === 'en'
      ? 'NIP must be 10 digits'
      : 'NIP musi mieć 10 cyfr'
    return
  }
  await lookupNip(digits)
}

async function lookupNip(nip: string) {
  if (typeof fetch === 'undefined') return
  isLookingUpNip.value = true
  nipLookupError.value = null
  try {
    const today = new Date().toISOString().slice(0, 10)
    const res = await fetch(`https://wl-api.mf.gov.pl/api/search/nip/${nip}?date=${today}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    const subject = json?.result?.subject
    if (!subject) {
      nipLookupError.value = props.language === 'en'
        ? 'Company not found in VAT registry'
        : 'Nie znaleziono firmy w rejestrze VAT'
      return
    }
    if (subject.name) form.company = subject.name
    // Subject has workingAddress (operational) and residenceAddress (registered).
    // Prefer working; fall back to residence. Both are flat strings like
    // "ul. Marszałkowska 1, 00-001 Warszawa".
    const addressStr = (subject.workingAddress || subject.residenceAddress || '').trim()
    if (addressStr) {
      const parsed = parsePolishAddress(addressStr)
      if (parsed.street) form.billing_street = parsed.street
      if (parsed.postal_code) form.billing_postal_code = parsed.postal_code
      if (parsed.city) form.billing_city = parsed.city
      form.billing_country = 'PL'
      // Auto-uncheck "same as shipping" so the user sees what was prefilled.
      form.billing_same = false
    }
    nipLookupSuccess.value = true
  } catch (err: any) {
    nipLookupError.value = props.language === 'en'
      ? 'Could not reach VAT registry — fill manually'
      : 'Nie udało się pobrać danych z rejestru VAT — wpisz ręcznie'
  } finally {
    isLookingUpNip.value = false
  }
}

// Whitelist returns address as "ul. Marszałkowska 1, 00-001 Warszawa".
// Cheap parser — fails over to the raw string when the format doesn't match.
function parsePolishAddress(raw: string): { street: string; postal_code: string; city: string } {
  const out = { street: '', postal_code: '', city: '' }
  const parts = raw.split(',').map(s => s.trim())
  if (parts.length >= 2) {
    out.street = parts[0]
    const tail = parts.slice(1).join(', ')
    const m = tail.match(/(\d{2}-\d{3})\s+(.+)/)
    if (m) {
      out.postal_code = m[1]
      out.city = m[2].trim()
    } else {
      out.city = tail
    }
  } else {
    out.street = raw
  }
  return out
}

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

function applyInvoiceAddress(addr: StorefrontAddress) {
  if (!addr) return
  selectedInvoiceAddressUuid.value = addr.uuid ?? null
  form.billing_street = addr.street || ''
  form.billing_city = addr.city || ''
  form.billing_postal_code = addr.postal_code || ''
  form.billing_country = addr.country || 'PL'
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

// Load shipping methods up-front so the picker is visible before postal code is entered.
// Postal-code watcher later refines the list via /shipping/calculate (country filter, future per-weight quotes).
async function loadShippingMethods() {
  if (!client.value) return
  isLoadingShipping.value = true
  try {
    const response = await client.value.getShippingMethods()
    shippingMethods.value = response.data || []
    if (shippingMethods.value.length > 0 && !form.shipping_method) {
      form.shipping_method = shippingMethods.value[0].code
    }
  } catch {
    shippingMethods.value = []
  } finally {
    isLoadingShipping.value = false
  }
}

onMounted(() => {
  loadPaymentMethods()
  loadShippingMethods()
  // Pick up addresses added in /konto since the last time this view mounted —
  // the isAuthenticated watcher only fires on a flip, not on revisits.
  if (customer.isAuthenticated.value) {
    fetchSavedAddresses()
  }
})

// --- InPost Geowidget (https://geowidget.easypack24.net) ---
// Loads InPost's official paczkomat picker as a Web Component. Token comes
// from widget settings (props.settings.inpost_geowidget_token) and is
// optional — without it the widget runs in public/guest mode.
const inpostWidgetRef = ref<HTMLElement | null>(null)
const inpostGeowidgetToken = computed<string>(() =>
  selectedShipping.value?.geowidget_config?.token
  || (props.settings?.inpost_geowidget_token as string)
  || (props.data?.inpost_geowidget_token as string)
  || ''
)
const inpostGeowidgetEnvironment = computed<'sandbox' | 'production'>(() =>
  selectedShipping.value?.geowidget_config?.environment || 'production'
)
const isInpostPickup = computed(() => {
  const code = (selectedShipping.value?.code || '').toLowerCase()
  const carrier = (selectedShipping.value?.carrier || '').toLowerCase()
  return Boolean(selectedShipping.value?.requires_pickup_point)
    && (carrier.includes('inpost') || code.includes('paczkomat') || code.includes('inpost'))
})
let inpostAssetsLoadedFor: string | null = null
function ensureInpostAssets(environment: 'sandbox' | 'production') {
  if (typeof document === 'undefined') return
  if (inpostAssetsLoadedFor === environment) return
  // InPost host changed in 2025: prod is now geowidget.inpost.pl (was easypack24.net),
  // sandbox PL is sandbox-easy-geowidget-sdk.easypack24.net.
  const baseUrl = environment === 'sandbox'
    ? 'https://sandbox-easy-geowidget-sdk.easypack24.net'
    : 'https://geowidget.inpost.pl'
  // If a different environment was loaded earlier in this session, swap the
  // tags out — InPost's customElements registration is idempotent but the
  // script targets a specific env via its bundled API base.
  document.querySelectorAll('link[data-inpost-geowidget-css],script[data-inpost-geowidget-js]')
    .forEach(el => el.remove())
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = `${baseUrl}/inpost-geowidget.css`
  link.setAttribute('data-inpost-geowidget-css', '')
  document.head.appendChild(link)
  const script = document.createElement('script')
  script.src = `${baseUrl}/inpost-geowidget.js`
  script.defer = true
  script.setAttribute('data-inpost-geowidget-js', '')
  document.head.appendChild(script)
  inpostAssetsLoadedFor = environment
}
function onInpostPointSelected(event: Event) {
  const detail = (event as CustomEvent).detail as any
  // Geowidget v5 fires the point payload under `detail.point` (v4 used `detail`).
  const p = detail?.point || detail
  if (!p?.name) return
  selectPickupPoint({
    id: p.name,
    name: p.address?.line1 || p.name,
    address: [p.address?.line1, p.address?.line2].filter(Boolean).join(', ') || '',
    city: p.address_details?.city || undefined,
    postal_code: p.address_details?.post_code || undefined,
    latitude: p.location?.latitude ?? null,
    longitude: p.location?.longitude ?? null,
    description: p.location_description || undefined,
    opening_hours: p.location?.opening_hours,
  } as StorefrontPickupPoint)
}

watch([isInpostPickup, inpostWidgetRef], async ([active, el]) => {
  if (!active || !el) return
  ensureInpostAssets(inpostGeowidgetEnvironment.value)
  await nextTick()
  el.addEventListener('onpoint', onInpostPointSelected as EventListener)
}, { flush: 'post' })

onBeforeUnmount(() => {
  inpostWidgetRef.value?.removeEventListener('onpoint', onInpostPointSelected as EventListener)
})

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
  pickupPointsVisible.value = 20
  pickupSearchTerm.value = ''
  try {
    const response = await client.value.getPickupPoints({
      postal_code: form.shipping_postal_code,
      carrier: selectedShipping.value.carrier,
      radius: 10,
    })
    pickupPoints.value = response.data.points || []

    // If the previously-selected point is no longer in the results (e.g.
    // postcode changed), drop it so checkout doesn't submit a stale id.
    if (selectedPickupPoint.value) {
      const stillThere = pickupPoints.value.some(p => p.id === selectedPickupPoint.value!.id)
      if (!stillThere) selectedPickupPoint.value = null
    }
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
  if (form.payment_method === 'blik' && !/^\d{6}$/.test(form.blik_code || '')) {
    errors.blik_code = t('blikCodeInvalid')
  }

  if (pickupPointRequired.value && !selectedPickupPoint.value) {
    errors.pickup_point = t('requiredField')
  }

  if (form.wants_invoice) {
    if (!form.company.trim()) errors.company = t('requiredField')
    if (!form.tax_id.trim()) errors.tax_id = t('requiredField')
    if (!form.billing_same) {
      if (!form.billing_street.trim()) errors.billing_street = t('requiredField')
      if (!form.billing_city.trim()) errors.billing_city = t('requiredField')
      if (!form.billing_postal_code.trim()) errors.billing_postal_code = t('requiredField')
      else if (form.billing_country === 'PL' && !/^\d{2}-\d{3}$/.test(form.billing_postal_code)) {
        errors.billing_postal_code = t('invalidPostalCode')
      }
    }
  }

  return Object.keys(errors).length === 0
}

async function handleSubmit() {
  if (!validate()) {
    toast.error(t('formIncomplete'))
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
        pickup_point: selectedPickupPoint.value
          ? {
              ...selectedPickupPoint.value,
              // Tag the chosen point with its carrier so the backend doesn't
              // have to re-derive it from the shipping_method when carriers
              // share point types (e.g. dpd_pickup vs inpost_locker).
              carrier: selectedPickupPoint.value.carrier ?? selectedShipping.value?.carrier ?? undefined,
            }
          : undefined,
      },
    }

    if (form.wants_invoice) {
      checkoutData.wants_invoice = true
      checkoutData.invoice = {
        company: form.company || undefined,
        tax_id: form.tax_id || undefined,
      }
      if (!form.billing_same) {
        checkoutData.billing_address = {
          street: form.billing_street,
          city: form.billing_city,
          postal_code: form.billing_postal_code,
          country: form.billing_country,
        }
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
          `${window.location.origin}${successRoute.value}?order=${order.order_number}`,
          form.payment_method === 'blik' ? form.blik_code : undefined,
        )

        // BLIK direct: stay on this page and poll until the customer confirms
        // the push in their banking app (or it times out).
        if (form.payment_method === 'blik' && paymentResponse.data.payment_uuid) {
          blikPaymentUuid.value = paymentResponse.data.payment_uuid
          blikOrderNumber.value = order.order_number
          await pollBlikStatus(paymentResponse.data.payment_uuid, order.order_number)
          return
        }

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

/**
 * Poll the storefront payment-status endpoint every 3s. P24 BLIK gives the
 * customer ~60s in their banking app; we wait up to 90s, then surface a retry.
 */
async function pollBlikStatus(paymentUuid: string, orderNumber: string) {
  if (!client.value) return
  blikWaiting.value = true
  blikTimedOut.value = false
  const start = Date.now()
  const timeoutMs = 90_000
  const intervalMs = 3_000

  while (Date.now() - start < timeoutMs) {
    await new Promise((r) => setTimeout(r, intervalMs))
    try {
      const s = await client.value.getPaymentStatus(paymentUuid)
      const status = s.data.status
      if (status === 'completed') {
        blikWaiting.value = false
        window.location.href = `${successRoute.value}?order=${orderNumber}`
        return
      }
      if (status === 'failed' || status === 'cancelled') {
        blikWaiting.value = false
        toast.error(t('blikFailed'))
        return
      }
    } catch (err) {
      // Transient — keep polling.
    }
  }

  blikWaiting.value = false
  blikTimedOut.value = true
}

async function retryBlik() {
  if (!blikPaymentUuid.value || !client.value) return
  if (!/^\d{6}$/.test(form.blik_code || '')) {
    errors.blik_code = t('blikCodeInvalid')
    return
  }
  errors.blik_code = ''
  try {
    await client.value.chargeBlik(blikPaymentUuid.value, form.blik_code)
    if (blikOrderNumber.value) {
      await pollBlikStatus(blikPaymentUuid.value, blikOrderNumber.value)
    }
  } catch (err: any) {
    toast.error(err.message || t('blikFailed'))
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
            <div class="lcms-checkout__section-head">
              <h3 class="lcms-checkout__section-title">{{ t('shippingAddress') }}</h3>
              <button
                v-if="customer.isAuthenticated.value"
                type="button"
                class="lcms-checkout__addressbook-btn"
                @click="isShippingBookOpen = true"
              >
                <i class="bx bx-book-content" aria-hidden="true" />
                <span>{{ props.language === 'en' ? 'Address book' : 'Książka adresowa' }}</span>
              </button>
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
              <LcmsCountrySelect
                v-model="form.shipping_country"
                :language="props.language"
              />
            </div>
          </section>

          <!-- Faktura VAT (opcjonalna) -->
          <section class="lcms-checkout__section">
            <label class="lcms-checkout__invoice-toggle">
              <input v-model="form.wants_invoice" type="checkbox" />
              <span>{{ props.language === 'en' ? 'I want a VAT invoice' : 'Chcę otrzymać fakturę VAT' }}</span>
            </label>

            <div v-if="form.wants_invoice" class="lcms-checkout__invoice-body">
              <div class="lcms-checkout__field">
                <label class="lcms-checkout__label">{{ props.language === 'en' ? 'Company name' : 'Nazwa firmy' }} *</label>
                <input
                  v-model="form.company"
                  type="text"
                  class="lcms-checkout__input"
                  :class="{ 'lcms-checkout__input--error': errors.company }"
                />
                <span v-if="errors.company" class="lcms-checkout__error">{{ errors.company }}</span>
              </div>

              <div class="lcms-checkout__field">
                <label class="lcms-checkout__label">NIP *</label>
                <div class="lcms-checkout__nip-row">
                  <input
                    v-model="form.tax_id"
                    type="text"
                    placeholder="5521578980"
                    class="lcms-checkout__input"
                    :class="{ 'lcms-checkout__input--error': errors.tax_id }"
                  />
                  <button
                    type="button"
                    class="lcms-checkout__btn lcms-checkout__btn--ghost lcms-checkout__nip-btn"
                    :disabled="!canLookupNip"
                    @click="triggerNipLookup"
                  >
                    {{ isLookingUpNip
                      ? (props.language === 'en' ? 'Loading…' : 'Pobieram…')
                      : (props.language === 'en' ? 'Fetch invoice data' : 'Pobierz dane do faktury') }}
                  </button>
                </div>
                <span v-if="nipLookupSuccess" class="lcms-checkout__hint lcms-checkout__hint--ok">
                  {{ props.language === 'en' ? 'Company data filled from VAT registry' : 'Dane firmy uzupełnione z Białej Listy VAT' }}
                </span>
                <span v-else-if="nipLookupError" class="lcms-checkout__hint lcms-checkout__hint--warn">{{ nipLookupError }}</span>
                <span v-else-if="errors.tax_id" class="lcms-checkout__error">{{ errors.tax_id }}</span>
              </div>

              <label class="lcms-checkout__invoice-toggle lcms-checkout__invoice-toggle--inner">
                <input v-model="form.billing_same" type="checkbox" />
                <span>{{ props.language === 'en' ? 'Invoice address same as shipping' : 'Adres faktury taki sam jak dostawa' }}</span>
              </label>

              <template v-if="!form.billing_same">
                <!-- Saved addresses picker — same UX as shipping section -->
                <div v-if="customer.isAuthenticated.value" class="lcms-checkout__invoice-addressbook">
                  <button
                    type="button"
                    class="lcms-checkout__addressbook-btn"
                    @click="isInvoiceBookOpen = true"
                  >
                    <i class="bx bx-book-content" aria-hidden="true" />
                    <span>{{ props.language === 'en' ? 'Address book' : 'Książka adresowa' }}</span>
                  </button>
                </div>

                <div class="lcms-checkout__field">
                  <label class="lcms-checkout__label">{{ t('street') }} *</label>
                  <input
                    v-model="form.billing_street"
                    type="text"
                    class="lcms-checkout__input"
                    :class="{ 'lcms-checkout__input--error': errors.billing_street }"
                  />
                  <span v-if="errors.billing_street" class="lcms-checkout__error">{{ errors.billing_street }}</span>
                </div>
                <div class="lcms-checkout__row">
                  <div class="lcms-checkout__field">
                    <label class="lcms-checkout__label">{{ t('postalCode') }} *</label>
                    <input
                      v-model="form.billing_postal_code"
                      type="text"
                      placeholder="00-000"
                      class="lcms-checkout__input"
                      :class="{ 'lcms-checkout__input--error': errors.billing_postal_code }"
                    />
                    <span v-if="errors.billing_postal_code" class="lcms-checkout__error">{{ errors.billing_postal_code }}</span>
                  </div>
                  <div class="lcms-checkout__field">
                    <label class="lcms-checkout__label">{{ t('city') }} *</label>
                    <input
                      v-model="form.billing_city"
                      type="text"
                      class="lcms-checkout__input"
                      :class="{ 'lcms-checkout__input--error': errors.billing_city }"
                    />
                    <span v-if="errors.billing_city" class="lcms-checkout__error">{{ errors.billing_city }}</span>
                  </div>
                </div>
                <div class="lcms-checkout__field">
                  <label class="lcms-checkout__label">{{ t('country') }} *</label>
                  <LcmsCountrySelect
                    v-model="form.billing_country"
                    :language="props.language"
                  />
                </div>
              </template>
            </div>
          </section>

          <!-- Shipping method -->
          <section class="lcms-checkout__section">
            <h3 class="lcms-checkout__section-title">{{ t('shippingMethod') }}</h3>

            <div v-if="isLoadingShipping && shippingMethods.length === 0" class="lcms-checkout__loading-text">
              {{ props.language === 'en' ? 'Loading...' : 'Ładowanie...' }}
            </div>

            <div v-else-if="shippingMethods.length === 0" class="lcms-checkout__loading-text">
              {{ props.language === 'en' ? 'No shipping methods configured' : 'Brak skonfigurowanych metod dostawy' }}
            </div>

            <div v-else class="lcms-checkout__tile-grid">
              <label
                v-for="method in shippingMethods"
                :key="method.code"
                class="lcms-checkout__tile"
                :class="{ 'lcms-checkout__tile--selected': form.shipping_method === method.code }"
              >
                <input
                  v-model="form.shipping_method"
                  type="radio"
                  :value="method.code"
                  name="shipping_method"
                  class="lcms-checkout__tile-input"
                />
                <div class="lcms-checkout__tile-icon">
                  <img v-if="method.logo_url" :src="method.logo_url" :alt="method.name" />
                  <i v-else class="bx" :class="shippingIconClass(method)" />
                </div>
                <div class="lcms-checkout__tile-body">
                  <div class="lcms-checkout__tile-name">{{ method.name }}</div>
                  <div v-if="method.estimated_days" class="lcms-checkout__tile-desc">
                    {{ props.language === 'en' ? 'Delivery' : 'Dostawa' }}: {{ method.estimated_days }}
                  </div>
                </div>
                <div class="lcms-checkout__tile-price">{{ formatPrice(methodAmount(method), currency) }}</div>
              </label>
            </div>
            <span v-if="errors.shipping_method" class="lcms-checkout__error">{{ errors.shipping_method }}</span>

            <!-- Pickup point selector — only for methods that require one (InPost paczkomaty, DPD Pickup, etc.) -->
            <div v-if="pickupPointRequired" class="lcms-checkout__pickup">
              <h4 class="lcms-checkout__subsection-title">
                {{ props.language === 'en' ? 'Pickup point' : 'Wybierz punkt odbioru' }}
              </h4>

              <p v-if="!isLoadingPickupPoints && pickupPoints.length > 0" class="lcms-checkout__pickup-hint">
                {{ props.language === 'en'
                  ? `Found ${pickupPoints.length} pickup point${pickupPoints.length === 1 ? '' : 's'} near ${form.shipping_postal_code}`
                  : `Znaleziono ${pickupPoints.length} ${pickupPoints.length === 1 ? 'punkt' : 'punktów'} blisko ${form.shipping_postal_code}` }}
              </p>

              <div v-if="isInpostPickup && inpostGeowidgetToken" class="lcms-checkout__pickup-map">
                <inpost-geowidget
                  ref="inpostWidgetRef"
                  :token="inpostGeowidgetToken"
                  :sandbox="inpostGeowidgetEnvironment === 'sandbox' ? 'true' : undefined"
                  language="pl"
                  config="parcelcollect"
                  onpoint="onpointselect"
                />
              </div>
              <div v-else-if="isInpostPickup" class="lcms-checkout__loading-text">
                {{ props.language === 'en' ? 'Pickup point picker unavailable — InPost token missing in shop config' : 'Wybór punktu niedostępny — brak tokenu InPost w konfiguracji sklepu' }}
              </div>

              <div v-if="pickupPoints.length > 5" class="lcms-checkout__field">
                <input
                  v-model="pickupSearchTerm"
                  type="search"
                  class="lcms-checkout__input"
                  :placeholder="props.language === 'en' ? 'Search by name, street or city' : 'Szukaj po nazwie, ulicy lub mieście'"
                />
              </div>

              <div v-if="isLoadingPickupPoints" class="lcms-checkout__loading-text">
                {{ props.language === 'en' ? 'Loading points...' : 'Ładowanie punktów...' }}
              </div>
              <div
                v-else-if="pickupPoints.length === 0"
                class="lcms-checkout__loading-text"
              >
                {{ props.language === 'en' ? 'No pickup points nearby — try a different postal code' : 'Brak punktów w pobliżu — sprawdź kod pocztowy' }}
              </div>
              <div
                v-else-if="filteredPickupPoints.length === 0"
                class="lcms-checkout__loading-text"
              >
                {{ props.language === 'en' ? 'No matches for that search' : 'Brak wyników wyszukiwania' }}
              </div>
              <ul v-else class="lcms-checkout__pickup-list">
                <li
                  v-for="point in visiblePickupPoints"
                  :key="point.id"
                  :class="{
                    'lcms-checkout__pickup-item': true,
                    'lcms-checkout__pickup-item--selected': selectedPickupPoint?.id === point.id,
                  }"
                  @click="selectPickupPoint(point)"
                >
                  <div class="lcms-checkout__pickup-row">
                    <div class="lcms-checkout__pickup-name">{{ point.name }}</div>
                    <div v-if="formatDistance(point.distance)" class="lcms-checkout__pickup-distance">
                      {{ formatDistance(point.distance) }}
                    </div>
                  </div>
                  <div class="lcms-checkout__pickup-address">
                    {{ point.address }}<template v-if="point.postal_code || point.city">,
                      {{ [point.postal_code, point.city].filter(Boolean).join(' ') }}
                    </template>
                  </div>
                  <div v-if="point.description" class="lcms-checkout__pickup-meta">
                    {{ point.description }}
                  </div>
                  <div v-if="formatOpeningHours(point.opening_hours)" class="lcms-checkout__pickup-meta">
                    {{ props.language === 'en' ? 'Today' : 'Dziś' }}: {{ formatOpeningHours(point.opening_hours) }}
                  </div>
                </li>
              </ul>

              <button
                v-if="filteredPickupPoints.length > visiblePickupPoints.length"
                type="button"
                class="lcms-checkout__btn lcms-checkout__btn--ghost lcms-checkout__pickup-more"
                @click="loadMorePickupPoints"
              >
                {{ props.language === 'en'
                  ? `Show more (${filteredPickupPoints.length - visiblePickupPoints.length} left)`
                  : `Pokaż więcej (${filteredPickupPoints.length - visiblePickupPoints.length} pozostało)` }}
              </button>

              <div v-if="selectedPickupPoint" class="lcms-checkout__pickup-selected">
                <div class="lcms-checkout__pickup-selected-label">
                  {{ props.language === 'en' ? 'Selected pickup point' : 'Wybrany punkt' }}
                </div>
                <strong>{{ selectedPickupPoint.name }}</strong>
                <span>
                  {{ selectedPickupPoint.address }}<template v-if="selectedPickupPoint.postal_code || selectedPickupPoint.city">,
                    {{ [selectedPickupPoint.postal_code, selectedPickupPoint.city].filter(Boolean).join(' ') }}
                  </template>
                </span>
              </div>
              <span v-if="errors.pickup_point" class="lcms-checkout__error">{{ errors.pickup_point }}</span>
            </div>
          </section>

          <!-- Payment -->
          <section class="lcms-checkout__section">
            <h3 class="lcms-checkout__section-title">{{ t('paymentMethod') }}</h3>

            <div class="lcms-checkout__tile-grid">
              <label
                v-for="method in paymentMethods"
                :key="method.code"
                class="lcms-checkout__tile"
                :class="{ 'lcms-checkout__tile--selected': form.payment_method === method.code }"
              >
                <input
                  v-model="form.payment_method"
                  type="radio"
                  :value="method.code"
                  name="payment_method"
                  class="lcms-checkout__tile-input"
                />
                <div class="lcms-checkout__tile-icon">
                  <img v-if="method.logo_url" :src="method.logo_url" :alt="method.label" />
                  <i v-else class="bx" :class="paymentIconClass(method.code)" />
                </div>
                <div class="lcms-checkout__tile-body">
                  <div class="lcms-checkout__tile-name">{{ method.label }}</div>
                </div>
              </label>
            </div>

            <!-- BLIK 6-digit code — direct flow without redirect -->
            <div v-if="form.payment_method === 'blik'" class="lcms-checkout__blik-input">
              <label class="lcms-checkout__label" for="lcms-blik-code">{{ t('blikCode') }}</label>
              <input
                id="lcms-blik-code"
                v-model="form.blik_code"
                name="blik_code"
                class="lcms-checkout__input lcms-checkout__input--blik"
                inputmode="numeric"
                pattern="\d{6}"
                maxlength="6"
                autocomplete="off"
                :placeholder="'••••••'"
              />
              <span class="lcms-checkout__hint">{{ t('blikCodeHint') }}</span>
              <span v-if="errors.blik_code" class="lcms-checkout__error">{{ errors.blik_code }}</span>
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

    <LcmsAddressBookModal
      v-model:is-open="isShippingBookOpen"
      :language="props.language"
      :selected-uuid="selectedSavedAddressUuid"
      mode="pick"
      @select="onShippingAddressPicked"
    />

    <LcmsAddressBookModal
      v-model:is-open="isInvoiceBookOpen"
      :language="props.language"
      :selected-uuid="selectedInvoiceAddressUuid"
      mode="pick"
      @select="onInvoiceAddressPicked"
    />

    <!-- BLIK confirmation overlay: blocks the page while we wait for the
         banking-app push. Falls back to a retry input when the code expires. -->
    <div v-if="blikWaiting || blikTimedOut" class="lcms-checkout__blik-overlay">
      <div class="lcms-checkout__blik-modal">
        <template v-if="blikWaiting">
          <div class="lcms-checkout__spinner" aria-hidden="true" />
          <h3>{{ t('blikWaiting') }}</h3>
          <p class="lcms-checkout__hint">{{ t('blikWaitingHint') }}</p>
        </template>
        <template v-else>
          <h3>{{ t('blikTimedOut') }}</h3>
          <input
            v-model="form.blik_code"
            class="lcms-checkout__input lcms-checkout__input--blik"
            inputmode="numeric"
            pattern="\d{6}"
            maxlength="6"
            :placeholder="'••••••'"
          />
          <span v-if="errors.blik_code" class="lcms-checkout__error">{{ errors.blik_code }}</span>
          <button type="button" class="lcms-checkout__btn lcms-checkout__btn--primary" @click="retryBlik">
            {{ t('blikRetry') }}
          </button>
        </template>
      </div>
    </div>
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

.lcms-checkout__input--blik {
  letter-spacing: 0.4em;
  font-family: var(--lcms-font-monospace, monospace);
  font-size: 1.4rem;
  text-align: center;
  max-width: 240px;
}

.lcms-checkout__blik-input {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.lcms-checkout__blik-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.lcms-checkout__blik-modal {
  background: var(--lcms-color-background, #fff);
  border-radius: var(--lcms-card-border-radius, 0.5rem);
  padding: 2rem;
  text-align: center;
  max-width: 380px;
  width: calc(100% - 2rem);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
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

/* Tile grid for shipping / payment method pickers — styled to match the
 * product-configurator radio pills (LcmsProductConfigurator.vue) but laid
 * out in a 3-column responsive grid. */
.lcms-checkout__tile-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

@media (max-width: 640px) {
  .lcms-checkout__tile-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 380px) {
  .lcms-checkout__tile-grid {
    grid-template-columns: 1fr;
  }
}

.lcms-checkout__tile {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.875rem 1rem;
  border: 1px solid var(--lcms-color-border, #d1d5db);
  background: transparent;
  color: var(--lcms-color-text, #1f2937);
  border-radius: 0.75rem;
  cursor: pointer;
  transition: background-color 0.15s, border-color 0.15s, color 0.15s, box-shadow 0.15s;
}

.lcms-checkout__tile:hover {
  background: rgba(0, 0, 0, 0.02);
  border-color: var(--lcms-color-primary, #3b82f6);
}

.lcms-checkout__tile--selected {
  background: color-mix(in srgb, var(--lcms-color-primary, #3b82f6) 8%, transparent);
  border-color: var(--lcms-color-primary, #3b82f6);
  font-weight: 600;
}

.lcms-checkout__tile:focus-within {
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--lcms-color-primary, #3b82f6) 22%, transparent);
}

/* Visually hide the native radio but keep it focusable for keyboard / a11y. */
.lcms-checkout__tile-input {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: 0;
  padding: 0;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  overflow: hidden;
  white-space: nowrap;
}

.lcms-checkout__tile-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  flex-shrink: 0;
  font-size: 1.25rem;
  color: var(--lcms-color-primary, #3b82f6);
}

.lcms-checkout__tile-icon img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.lcms-checkout__tile-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.lcms-checkout__tile-name {
  font-size: 0.9375rem;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lcms-checkout__tile-desc {
  font-size: 0.75rem;
  color: var(--lcms-color-muted, #6b7280);
  font-weight: 400;
}

.lcms-checkout__tile-price {
  font-weight: 600;
  font-size: 0.9375rem;
  margin-left: auto;
  flex-shrink: 0;
}

.lcms-checkout__loading-text {
  text-align: center;
  padding: 1rem;
  color: var(--lcms-color-muted, #6b7280);
  font-size: 0.875rem;
}

/* Invoice toggle + collapsed form — custom-styled checkbox so it inherits
 * the project palette instead of falling back to the browser default. */
.lcms-checkout__invoice-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.625rem;
  cursor: pointer;
  font-size: 0.9375rem;
  font-weight: 500;
  user-select: none;
}

.lcms-checkout__invoice-toggle input[type='checkbox'] {
  position: absolute;
  opacity: 0;
  width: 1px;
  height: 1px;
  pointer-events: none;
}

/* Visual box drawn next to the hidden native input. ::before is the box,
 * ::after is the checkmark (shown only when :checked). */
.lcms-checkout__invoice-toggle > span {
  position: relative;
  padding-left: 1.75rem;
  display: inline-flex;
  align-items: center;
  min-height: 1.25rem;
}

.lcms-checkout__invoice-toggle > span::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 1.25rem;
  height: 1.25rem;
  border: 1.5px solid var(--lcms-color-border, #d1d5db);
  border-radius: 0.3125rem;
  background: var(--lcms-color-background, #fff);
  transition: background 0.15s, border-color 0.15s;
}

.lcms-checkout__invoice-toggle:hover > span::before {
  border-color: var(--lcms-color-primary, #3b82f6);
}

.lcms-checkout__invoice-toggle > span::after {
  content: '';
  position: absolute;
  left: 0.4375rem;
  top: 50%;
  width: 0.4375rem;
  height: 0.75rem;
  border: solid #fff;
  border-width: 0 2px 2px 0;
  transform: translateY(-65%) rotate(45deg);
  opacity: 0;
  transition: opacity 0.15s;
}

.lcms-checkout__invoice-toggle input[type='checkbox']:checked + span::before {
  background: var(--lcms-color-primary, #3b82f6);
  border-color: var(--lcms-color-primary, #3b82f6);
}

.lcms-checkout__invoice-toggle input[type='checkbox']:checked + span::after {
  opacity: 1;
}

.lcms-checkout__invoice-toggle input[type='checkbox']:focus-visible + span::before {
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--lcms-color-primary, #3b82f6) 22%, transparent);
}

.lcms-checkout__invoice-toggle--inner {
  margin-top: 0.5rem;
  font-weight: 400;
  font-size: 0.875rem;
  color: var(--lcms-color-text, #1f2937);
}

.lcms-checkout__invoice-body {
  margin-top: 0.875rem;
  padding: 1rem;
  border: 1px solid var(--lcms-color-border, #e5e7eb);
  border-radius: 0.75rem;
  background: rgba(0, 0, 0, 0.015);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.lcms-checkout__hint {
  font-size: 0.75rem;
  color: var(--lcms-color-muted, #6b7280);
}

.lcms-checkout__section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.875rem;
}

.lcms-checkout__section-head .lcms-checkout__section-title {
  margin: 0;
}

.lcms-checkout__addressbook-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4375rem;
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 500;
  padding: 0.4375rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid var(--lcms-color-border, #d1d5db);
  background: transparent;
  color: var(--lcms-color-text, #1f2937);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.lcms-checkout__addressbook-btn:hover {
  background: color-mix(in srgb, var(--lcms-color-primary, #3b82f6) 6%, transparent);
  border-color: var(--lcms-color-primary, #3b82f6);
  color: var(--lcms-color-primary, #3b82f6);
}

.lcms-checkout__addressbook-btn .bx {
  font-size: 1.125rem;
  line-height: 1;
}

.lcms-checkout__invoice-addressbook {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 0.25rem;
}

.lcms-checkout__hint--warn {
  color: #b45309;
}

.lcms-checkout__hint--ok {
  color: #15803d;
}

.lcms-checkout__nip-row {
  display: flex;
  gap: 0.5rem;
  align-items: stretch;
}

.lcms-checkout__nip-row > .lcms-checkout__input {
  flex: 1;
  min-width: 0;
}

.lcms-checkout__nip-btn {
  white-space: nowrap;
  flex-shrink: 0;
}

@media (max-width: 540px) {
  .lcms-checkout__nip-row {
    flex-direction: column;
  }
}

.lcms-checkout__btn {
  font: inherit;
  cursor: pointer;
  border: 1px solid transparent;
  padding: 0.5rem 0.875rem;
  border-radius: var(--lcms-border-radius, 0.5rem);
  font-size: 0.875rem;
  font-weight: 500;
  background: transparent;
  color: var(--lcms-color-text, #1f2937);
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.lcms-checkout__btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.lcms-checkout__btn--ghost {
  border-color: var(--lcms-color-border, #d1d5db);
}

.lcms-checkout__btn--ghost:hover:not(:disabled) {
  background: color-mix(in srgb, var(--lcms-color-primary, #3b82f6) 8%, transparent);
  border-color: var(--lcms-color-primary, #3b82f6);
  color: var(--lcms-color-primary, #3b82f6);
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

.lcms-checkout__pickup-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
}

.lcms-checkout__pickup-name {
  font-weight: 600;
  font-size: 0.9375rem;
}

.lcms-checkout__pickup-distance {
  font-size: 0.75rem;
  color: var(--lcms-color-muted, #6b7280);
  flex-shrink: 0;
}

.lcms-checkout__pickup-address {
  font-size: 0.875rem;
  color: var(--lcms-color-muted, #6b7280);
}

.lcms-checkout__pickup-meta {
  font-size: 0.75rem;
  color: var(--lcms-color-muted, #6b7280);
  margin-top: 0.125rem;
}

.lcms-checkout__pickup-hint {
  font-size: 0.8125rem;
  color: var(--lcms-color-muted, #6b7280);
  margin: 0 0 0.5rem;
}

.lcms-checkout__pickup-map {
  width: 100%;
  height: 460px;
  border-radius: 0.75rem;
  border: 1px solid var(--lcms-color-border, #e5e7eb);
  overflow: hidden;
  margin: 0.5rem 0 0.75rem;
  background: #f3f4f6;
}

.lcms-checkout__pickup-map inpost-geowidget {
  display: block;
  width: 100%;
  height: 100%;
}

.lcms-checkout__pickup-more {
  margin-top: 0.5rem;
  width: 100%;
  padding: 0.625rem 1rem;
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

.lcms-checkout__pickup-selected-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--lcms-color-muted, #6b7280);
}
</style>
