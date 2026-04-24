<script setup lang="ts">
/**
 * Order Failure Widget (E-commerce)
 *
 * Rendered when a payment fails or is cancelled. Reads ?order=<number> from URL,
 * fetches the order to display what was attempted, and offers a retry / contact CTA.
 */

import { computed, ref, onMounted, inject, type Ref } from 'vue'
import { useLanguage } from '../../../composables/useLanguage'
import { useStorefront } from '../../../composables/useStorefront'
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
const showFailureReason = computed(() => config.value.show_failure_reason !== false)
const showRetryButton = computed(() => config.value.show_retry_button !== false)
const showContactInfo = computed(() => config.value.show_contact_info !== false)
const retryRoute = computed(() => {
  return (
    config.value.retry_route ||
    projectConfig?.value?.commerce?.routes?.checkout ||
    '/zamowienie'
  )
})

const t = (key: string) => {
  const lang = props.language || 'pl'
  const dict: Record<string, Record<string, string>> = {
    pl: {
      heading: 'Płatność nieudana',
      failureMessage: 'Niestety Twoja płatność nie została zakończona powodzeniem. Możesz spróbować ponownie.',
      retryButton: 'Ponów płatność',
      contactInfo: 'Jeśli potrzebujesz pomocy, skontaktuj się z nami.',
      orderNumber: 'Numer zamówienia',
      failureReason: 'Powód',
      loading: 'Ładowanie zamówienia…',
      missingOrder: 'Nie znaleziono numeru zamówienia w adresie URL.',
      orderNotFound: 'Nie znaleziono zamówienia o numerze {order}.',
      fetchError: 'Nie udało się pobrać danych zamówienia.',
      statusFailed: 'Płatność została odrzucona',
      statusCancelled: 'Płatność anulowana',
      statusExpired: 'Płatność wygasła',
      statusPending: 'Płatność nie została jeszcze potwierdzona',
      statusUnknown: 'Nieznany powód',
    },
    en: {
      heading: 'Payment failed',
      failureMessage: "Unfortunately your payment was not completed. You can try again.",
      retryButton: 'Retry payment',
      contactInfo: "If you need help, please contact us.",
      orderNumber: 'Order number',
      failureReason: 'Reason',
      loading: 'Loading order…',
      missingOrder: 'Order number missing from URL.',
      orderNotFound: 'Order {order} was not found.',
      fetchError: 'Failed to fetch order data.',
      statusFailed: 'Payment was rejected',
      statusCancelled: 'Payment cancelled',
      statusExpired: 'Payment expired',
      statusPending: 'Payment not yet confirmed',
      statusUnknown: 'Unknown reason',
    },
  }
  return dict[lang]?.[key] || dict.pl[key] || key
}

const headingText = computed(() => extractValue(props.data?.heading?.text) || t('heading'))
const failureMessageText = computed(
  () => extractValue(props.data?.failure_message?.text) || t('failureMessage')
)
const retryButtonText = computed(
  () => extractValue(props.data?.retry_button?.text) || t('retryButton')
)
const contactInfoText = computed(
  () => extractValue(props.data?.contact_info?.text) || t('contactInfo')
)

const order = ref<StorefrontOrder | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

const orderNumber = computed(() => {
  if (typeof window === 'undefined') return null
  return new URL(window.location.href).searchParams.get('order')
})

const failureReasonLabel = computed(() => {
  if (!order.value) return t('statusUnknown')
  const map: Record<string, string> = {
    failed: 'statusFailed',
    cancelled: 'statusCancelled',
    expired: 'statusExpired',
    pending: 'statusPending',
  }
  return t(map[order.value.payment_status] || 'statusUnknown')
})

async function fetchOrder() {
  if (!orderNumber.value) {
    error.value = t('missingOrder')
    loading.value = false
    return
  }
  if (!isAvailable.value || !client.value) {
    loading.value = false
    return
  }

  try {
    const { data } = await client.value.getOrderByNumber(orderNumber.value)
    order.value = data
  } catch (e: any) {
    const status = e?.status ?? e?.response?.status
    const raw = String(e?.message || '')
    if (status === 404 || /not\s*found/i.test(raw)) {
      error.value = t('orderNotFound').replace('{order}', orderNumber.value || '')
    } else {
      error.value = t('fetchError')
    }
  } finally {
    loading.value = false
  }
}

onMounted(fetchOrder)
</script>

<template>
  <div class="lcms-order-failure">
    <h2 class="lcms-order-failure__heading">{{ headingText }}</h2>

    <p class="lcms-order-failure__message">{{ failureMessageText }}</p>

    <div v-if="loading" class="lcms-order-failure__loading">
      <p>{{ t('loading') }}</p>
    </div>

    <div v-else class="lcms-order-failure__details">
      <p v-if="error" class="lcms-order-failure__error">{{ error }}</p>
      <dl v-else-if="order" class="lcms-order-failure__meta">
        <template v-if="showOrderNumber">
          <dt>{{ t('orderNumber') }}</dt>
          <dd>{{ order.order_number }}</dd>
        </template>
        <template v-if="showFailureReason">
          <dt>{{ t('failureReason') }}</dt>
          <dd>{{ failureReasonLabel }}</dd>
        </template>
      </dl>
    </div>

    <div class="lcms-order-failure__actions">
      <a v-if="showRetryButton" :href="retryRoute" class="lcms-order-failure__btn">
        {{ retryButtonText }}
      </a>
    </div>

    <p v-if="showContactInfo" class="lcms-order-failure__contact">{{ contactInfoText }}</p>
  </div>
</template>

<style scoped>
.lcms-order-failure {
  max-width: 640px;
  margin: 0 auto;
  text-align: center;
}

.lcms-order-failure__heading {
  color: var(--lcms-color-danger, #e74c3c);
  margin-bottom: 1rem;
}

.lcms-order-failure__message {
  opacity: 0.85;
  margin-bottom: 2rem;
}

.lcms-order-failure__meta {
  display: inline-grid;
  grid-template-columns: max-content 1fr;
  gap: 0.5rem 1.5rem;
  margin: 1.5rem 0;
  text-align: left;
}

.lcms-order-failure__meta dt {
  font-weight: 600;
}

.lcms-order-failure__meta dd {
  margin: 0;
}

.lcms-order-failure__actions {
  margin-top: 1.5rem;
}

.lcms-order-failure__btn {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  background: var(--lcms-color-primary, #3d2b1f);
  color: var(--lcms-color-white, #fff);
  text-decoration: none;
  border-radius: 4px;
}

.lcms-order-failure__contact {
  margin-top: 2rem;
  opacity: 0.75;
  font-size: 0.95rem;
}

.lcms-order-failure__loading {
  padding: 1rem 0;
  opacity: 0.75;
}

.lcms-order-failure__error {
  color: var(--lcms-color-danger, #e74c3c);
  opacity: 0.85;
  margin: 0;
}
</style>
