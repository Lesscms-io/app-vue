<script setup lang="ts">
/**
 * Order Success Widget (E-commerce)
 *
 * Rendered on the post-payment success page. Reads ?order=<number> from the URL,
 * fetches the order via storefront API, and renders a confirmation. If the payment
 * status turns out to be failed/cancelled, redirects to the failure page. Polls
 * while the status is still pending (payment gateway hasn't called the webhook yet).
 */

import { computed, ref, onMounted, onBeforeUnmount, inject, type Ref } from 'vue'
import { useLanguage } from '../../../composables/useLanguage'
import { useStorefront } from '../../../composables/useStorefront'
import { formatPrice } from '../../../utils/currency'
import type { StorefrontOrder } from '../../../api/storefront'

defineOptions({ inheritAttrs: false })

interface Props {
  data: Record<string, any>
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const { extractValue } = useLanguage(props.language)
const { client, isAvailable } = useStorefront()
const projectConfig = inject<Ref<any> | null>('lesscms-project-config', null)

const config = computed(() => props.data?.config || {})
const showOrderNumber = computed(() => config.value.show_order_number !== false)
const showItems = computed(() => config.value.show_items !== false)
const showTotals = computed(() => config.value.show_totals !== false)
const showShippingAddress = computed(() => config.value.show_shipping_address !== false)
const showPaymentStatus = computed(() => config.value.show_payment_status !== false)
const pendingPollSeconds = computed(() => Number(config.value.pending_poll_seconds) || 30)
const failureRoute = computed(() => {
  return (
    config.value.failure_route ||
    projectConfig?.value?.commerce?.routes?.orderFailure ||
    '/zamowienie/niepowodzenie'
  )
})

const currency = computed(() => projectConfig?.value?.commerce?.currency || 'PLN')

const t = (key: string) => {
  const lang = props.language || 'pl'
  const dict: Record<string, Record<string, string>> = {
    pl: {
      heading: 'Dziękujemy za zamówienie!',
      thankYouMessage: 'Twoje zamówienie zostało przyjęte. Potwierdzenie wyślemy na Twój adres e-mail.',
      orderNumber: 'Numer zamówienia',
      paymentStatus: 'Status płatności',
      orderItems: 'Zamówione produkty',
      shippingAddress: 'Adres dostawy',
      subtotal: 'Suma częściowa',
      shipping: 'Wysyłka',
      discount: 'Rabat',
      total: 'Razem',
      continueShopping: 'Kontynuuj zakupy',
      loading: 'Ładowanie zamówienia…',
      processing: 'Przetwarzamy Twoją płatność, chwilę…',
      missingOrder: 'Nie znaleziono numeru zamówienia w adresie URL.',
      orderNotFound: 'Nie znaleziono zamówienia o numerze {order}.',
      fetchError: 'Nie udało się pobrać danych zamówienia.',
      statusPaid: 'Opłacone',
      statusPending: 'Oczekuje',
      statusFailed: 'Nieudana',
      statusCancelled: 'Anulowana',
      statusRefunded: 'Zwrócona',
      qty: 'szt.',
    },
    en: {
      heading: 'Thank you for your order!',
      thankYouMessage: 'Your order has been received. A confirmation will be sent to your email.',
      orderNumber: 'Order number',
      paymentStatus: 'Payment status',
      orderItems: 'Ordered items',
      shippingAddress: 'Shipping address',
      subtotal: 'Subtotal',
      shipping: 'Shipping',
      discount: 'Discount',
      total: 'Total',
      continueShopping: 'Continue shopping',
      loading: 'Loading order…',
      processing: 'Processing your payment, please wait…',
      missingOrder: 'Order number missing from URL.',
      orderNotFound: 'Order {order} was not found.',
      fetchError: 'Failed to fetch order data.',
      statusPaid: 'Paid',
      statusPending: 'Pending',
      statusFailed: 'Failed',
      statusCancelled: 'Cancelled',
      statusRefunded: 'Refunded',
      qty: 'pcs',
    },
  }
  return dict[lang]?.[key] || dict.pl[key] || key
}

const headingText = computed(() => extractValue(props.data?.heading?.text) || t('heading'))
const thankYouMessageText = computed(
  () => extractValue(props.data?.thank_you_message?.text) || t('thankYouMessage')
)
const continueShoppingText = computed(
  () => extractValue(props.data?.continue_shopping_button?.text) || t('continueShopping')
)
const continueShoppingHref = computed(() => props.data?.continue_shopping_button?.href || '/')

const order = ref<StorefrontOrder | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const isPolling = ref(false)
let pollTimer: ReturnType<typeof setTimeout> | null = null
let pollDeadline = 0

const orderNumber = computed(() => {
  if (typeof window === 'undefined') return null
  return new URL(window.location.href).searchParams.get('order')
})

const paymentStatusLabel = computed(() => {
  if (!order.value) return ''
  const s = order.value.payment_status
  const map: Record<string, string> = {
    paid: 'statusPaid',
    pending: 'statusPending',
    failed: 'statusFailed',
    cancelled: 'statusCancelled',
    refunded: 'statusRefunded',
  }
  return t(map[s] || s)
})

function stopPolling() {
  if (pollTimer) {
    clearTimeout(pollTimer)
    pollTimer = null
  }
  isPolling.value = false
}

async function fetchOrder() {
  if (!orderNumber.value) {
    error.value = t('missingOrder')
    loading.value = false
    return
  }
  if (!isAvailable.value || !client.value) {
    error.value = t('fetchError')
    loading.value = false
    return
  }

  try {
    const { data } = await client.value.getOrderByNumber(orderNumber.value)
    order.value = data
    loading.value = false

    const status = data.payment_status
    if (status === 'failed' || status === 'cancelled' || status === 'expired') {
      stopPolling()
      if (typeof window !== 'undefined') {
        window.location.replace(`${failureRoute.value}?order=${orderNumber.value}`)
      }
      return
    }

    if (status === 'pending' && Date.now() < pollDeadline) {
      isPolling.value = true
      pollTimer = setTimeout(fetchOrder, 3000)
    } else {
      stopPolling()
    }
  } catch (e: any) {
    const status = e?.status ?? e?.response?.status
    const raw = String(e?.message || '')
    if (status === 404 || /not\s*found/i.test(raw)) {
      error.value = t('orderNotFound').replace('{order}', orderNumber.value || '')
    } else {
      error.value = t('fetchError')
    }
    loading.value = false
    stopPolling()
  }
}

onMounted(() => {
  pollDeadline = Date.now() + pendingPollSeconds.value * 1000
  fetchOrder()
})

onBeforeUnmount(() => {
  stopPolling()
})

function formatOrderPrice(value: number | null | undefined): string {
  if (value === null || value === undefined) return ''
  return formatPrice(value, currency.value)
}
</script>

<template>
  <div class="lcms-order-success">
    <h2 class="lcms-order-success__heading">{{ headingText }}</h2>

    <!-- Loading -->
    <div v-if="loading" class="lcms-order-success__loading">
      <p>{{ t('loading') }}</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="lcms-order-success__error">
      <p>{{ error }}</p>
    </div>

    <!-- Pending polling -->
    <div v-else-if="isPolling" class="lcms-order-success__pending">
      <p>{{ t('processing') }}</p>
    </div>

    <!-- Order content -->
    <div v-else-if="order" class="lcms-order-success__content">
      <p class="lcms-order-success__message">{{ thankYouMessageText }}</p>

      <dl class="lcms-order-success__meta">
        <template v-if="showOrderNumber">
          <dt>{{ t('orderNumber') }}</dt>
          <dd>{{ order.order_number }}</dd>
        </template>
        <template v-if="showPaymentStatus">
          <dt>{{ t('paymentStatus') }}</dt>
          <dd>{{ paymentStatusLabel }}</dd>
        </template>
      </dl>

      <section v-if="showItems && order.items?.length" class="lcms-order-success__items">
        <h3>{{ t('orderItems') }}</h3>
        <ul>
          <li v-for="item in order.items" :key="item.uuid">
            <span class="lcms-order-success__item-name">{{ item.name }}</span>
            <span class="lcms-order-success__item-qty">{{ item.quantity }} {{ t('qty') }}</span>
            <span class="lcms-order-success__item-price">{{ formatOrderPrice(item.subtotal) }}</span>
          </li>
        </ul>
      </section>

      <section v-if="showTotals" class="lcms-order-success__totals">
        <div><span>{{ t('subtotal') }}</span><span>{{ formatOrderPrice(order.subtotal) }}</span></div>
        <div v-if="order.shipping_cost"><span>{{ t('shipping') }}</span><span>{{ formatOrderPrice(order.shipping_cost) }}</span></div>
        <div v-if="order.discount"><span>{{ t('discount') }}</span><span>−{{ formatOrderPrice(order.discount) }}</span></div>
        <div class="lcms-order-success__total"><span>{{ t('total') }}</span><span>{{ formatOrderPrice(order.total) }}</span></div>
      </section>

      <section
        v-if="showShippingAddress && order.shipping_address"
        class="lcms-order-success__address"
      >
        <h3>{{ t('shippingAddress') }}</h3>
        <p>
          {{ order.customer_name }}<br>
          {{ order.shipping_address.street }}<br>
          {{ order.shipping_address.postal_code }} {{ order.shipping_address.city }}<br>
          {{ order.shipping_address.country }}
        </p>
      </section>

      <a :href="continueShoppingHref" class="lcms-order-success__btn">
        {{ continueShoppingText }}
      </a>
    </div>
  </div>
</template>

<style scoped>
.lcms-order-success {
  max-width: 720px;
  margin: 0 auto;
}

.lcms-order-success__heading {
  text-align: center;
  margin-bottom: 1rem;
}

.lcms-order-success__message {
  text-align: center;
  opacity: 0.85;
  margin-bottom: 2rem;
}

.lcms-order-success__meta {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 0.5rem 1.5rem;
  margin: 1.5rem 0;
}

.lcms-order-success__meta dt {
  font-weight: 600;
}

.lcms-order-success__meta dd {
  margin: 0;
}

.lcms-order-success__items ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.lcms-order-success__items li {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 1rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--lcms-color-border, #eee);
}

.lcms-order-success__totals {
  margin: 1.5rem 0;
}

.lcms-order-success__totals > div {
  display: flex;
  justify-content: space-between;
  padding: 0.25rem 0;
}

.lcms-order-success__total {
  font-weight: 700;
  font-size: 1.15rem;
  border-top: 1px solid var(--lcms-color-border, #eee);
  padding-top: 0.75rem !important;
  margin-top: 0.5rem;
}

.lcms-order-success__btn {
  display: inline-block;
  margin-top: 2rem;
  padding: 0.75rem 1.5rem;
  background: var(--lcms-color-primary, #3d2b1f);
  color: var(--lcms-color-white, #fff);
  text-decoration: none;
  border-radius: 4px;
}

.lcms-order-success__loading,
.lcms-order-success__pending,
.lcms-order-success__error {
  text-align: center;
  padding: 2rem 0;
}

.lcms-order-success__error {
  color: var(--lcms-color-danger, #e74c3c);
}
</style>
