<script setup lang="ts">
/**
 * Group Application Widget (E-commerce)
 *
 * "Strefa Fotografa" and the like: a logged-in customer applies to join a
 * customer group that has its own prices. Staff approve it in the panel;
 * from then on the group's price rules apply in the cart.
 *
 * Which group: config.group_slug, or the first group open for applications.
 */

import { computed, inject, onMounted, reactive, ref, watch, type Ref } from 'vue'
import { useLanguage } from '../../../composables/useLanguage'
import { useCustomer } from '../../../composables/useCustomer'
import { useStorefront } from '../../../composables/useStorefront'
import type { StorefrontGroupApplicationsState, StorefrontOpenCustomerGroup } from '../../../api/storefront'

defineOptions({ inheritAttrs: false })

interface Props {
  data: Record<string, any>
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const { extractValue } = useLanguage(props.language)
const customer = useCustomer()
const { client, isAvailable } = useStorefront()
const projectConfig = inject<Ref<any> | null>('lesscms-project-config', null)

const config = computed(() => props.data?.config || {})
const fieldOn = (name: string) => config.value[`show_${name}`] !== false

const t = (key: string) => {
  const lang = props.language || 'pl'
  const dict: Record<string, Record<string, string>> = {
    pl: {
      heading: 'Dołącz do grupy',
      company: 'Nazwa firmy / studia',
      tax_id: 'NIP',
      phone: 'Telefon',
      website: 'Strona www lub portfolio',
      message: 'Kilka słów o sobie',
      consent: 'Potwierdzam, że dane są prawdziwe i zgadzam się na ich weryfikację.',
      submit: 'Wyślij wniosek',
      sending: 'Wysyłanie...',
      loginNeeded: 'Aby wysłać wniosek, zaloguj się lub załóż konto.',
      login: 'Zaloguj się',
      pending: 'Twój wniosek czeka na rozpatrzenie. Damy znać mailem.',
      member: 'Należysz do grupy „{group}”. Ceny dla grupy naliczają się w koszyku po zalogowaniu.',
      rejected: 'Poprzedni wniosek nie został przyjęty. Możesz wysłać go ponownie.',
      sent: 'Dziękujemy! Wniosek trafił do nas — odezwiemy się mailem.',
      requiredField: 'To pole jest wymagane',
      error: 'Nie udało się wysłać wniosku. Spróbuj ponownie.',
    },
    en: {
      heading: 'Join the group',
      company: 'Company / studio name',
      tax_id: 'Tax ID',
      phone: 'Phone',
      website: 'Website or portfolio',
      message: 'A few words about you',
      consent: 'I confirm the details are true and agree to their verification.',
      submit: 'Send application',
      sending: 'Sending...',
      loginNeeded: 'Sign in or create an account to apply.',
      login: 'Sign in',
      pending: 'Your application is waiting for review. We will email you.',
      member: 'You are in the “{group}” group. Group prices apply in the cart while signed in.',
      rejected: 'Your previous application was not accepted. You can apply again.',
      sent: 'Thank you! We received your application and will email you.',
      requiredField: 'Required',
      error: 'Could not send the application. Please try again.',
    },
  }
  return dict[lang]?.[key] || dict.pl[key] || key
}

const headingText = computed(() => extractValue(props.data?.heading?.text) || t('heading'))
const submitText = computed(() => extractValue(props.data?.submit_button?.text) || t('submit'))
const successText = computed(() => extractValue(props.data?.success_message?.text) || t('sent'))

const group = ref<StorefrontOpenCustomerGroup | null>(null)
const state = ref<StorefrontGroupApplicationsState | null>(null)
const loading = ref(true)
const sending = ref(false)
const sent = ref(false)
const failed = ref(false)

const introText = computed(() =>
  extractValue(props.data?.intro?.text) || group.value?.application_intro || group.value?.description || ''
)

const loginHref = computed(() => {
  const account = projectConfig?.value?.commerce?.routes?.account || '/konto'
  const here = typeof window !== 'undefined' ? window.location.pathname : ''
  return here ? `${account}?return=${encodeURIComponent(here)}` : account
})

const isMember = computed(() => !!group.value && state.value?.customer_group_uuid === group.value.uuid)
const latest = computed(() =>
  state.value?.applications.find(a => a.group?.uuid === group.value?.uuid) || null
)
const isPending = computed(() => latest.value?.status === 'pending')
const wasRejected = computed(() => latest.value?.status === 'rejected')

const form = reactive({ company: '', tax_id: '', phone: '', website: '', message: '', consent: false })
const errors = reactive<Record<string, string>>({})

async function loadGroup() {
  if (!client.value) return
  const { data } = await client.value.getOpenCustomerGroups()
  const slug = (config.value.group_slug || '').trim()
  group.value = (slug ? data.find(g => g.slug === slug) : data[0]) || null
}

async function loadState() {
  if (!client.value || !customer.isAuthenticated.value) {
    state.value = null
    return
  }
  const { data } = await client.value.getGroupApplications()
  state.value = data
}

onMounted(async () => {
  if (!isAvailable.value) {
    loading.value = false
    return
  }
  try {
    await customer.init()
    await Promise.all([loadGroup(), loadState()])
  } catch {
    // Widget stays hidden without a group; a failed state load shows the form.
  } finally {
    loading.value = false
  }
})

watch(() => customer.isAuthenticated.value, () => { loadState().catch(() => {}) })

function validate(): boolean {
  Object.keys(errors).forEach(k => delete errors[k])
  if (fieldOn('company') && !form.company.trim()) errors.company = t('requiredField')
  if (config.value.require_tax_id && fieldOn('tax_id') && !form.tax_id.trim()) errors.tax_id = t('requiredField')
  if (!form.consent) errors.consent = t('requiredField')
  return Object.keys(errors).length === 0
}

async function submit() {
  if (!client.value || !group.value || !validate()) return
  sending.value = true
  failed.value = false
  try {
    const data: Record<string, string> = {}
    for (const field of ['company', 'tax_id', 'phone', 'website', 'message'] as const) {
      if (fieldOn(field) && form[field].trim()) data[field] = form[field].trim()
    }
    await client.value.applyToCustomerGroup({ customer_group_uuid: group.value.uuid, data })
    sent.value = true
    await loadState().catch(() => {})
  } catch {
    failed.value = true
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <div v-if="loading || group" class="lcms-group-application">
    <h3 class="lcms-group-application__heading">{{ headingText }}</h3>
    <p v-if="introText" class="lcms-group-application__intro">{{ introText }}</p>

    <template v-if="!loading">
      <div v-if="!customer.isAuthenticated.value" class="lcms-group-application__notice">
        {{ t('loginNeeded') }}
        <a :href="loginHref" class="lcms-group-application__link">{{ t('login') }}</a>
      </div>

      <div v-else-if="isMember" class="lcms-group-application__notice lcms-group-application__notice--ok">
        {{ t('member').replace('{group}', group?.name || '') }}
      </div>

      <div v-else-if="sent" class="lcms-group-application__notice lcms-group-application__notice--ok">
        {{ successText }}
      </div>

      <div v-else-if="isPending" class="lcms-group-application__notice">
        {{ t('pending') }}
      </div>

      <form v-else class="lcms-group-application__form" @submit.prevent="submit">
        <div v-if="wasRejected" class="lcms-group-application__notice">{{ t('rejected') }}</div>

        <div v-if="fieldOn('company')" class="lcms-group-application__field">
          <label class="lcms-group-application__label">{{ t('company') }} *</label>
          <input
            v-model="form.company"
            type="text"
            autocomplete="organization"
            class="lcms-group-application__input"
            :class="{ 'lcms-group-application__input--error': errors.company }"
          />
          <span v-if="errors.company" class="lcms-group-application__error">{{ errors.company }}</span>
        </div>

        <div v-if="fieldOn('tax_id')" class="lcms-group-application__field">
          <label class="lcms-group-application__label">{{ t('tax_id') }}<template v-if="config.require_tax_id"> *</template></label>
          <input
            v-model="form.tax_id"
            type="text"
            class="lcms-group-application__input"
            :class="{ 'lcms-group-application__input--error': errors.tax_id }"
          />
          <span v-if="errors.tax_id" class="lcms-group-application__error">{{ errors.tax_id }}</span>
        </div>

        <div v-if="fieldOn('phone')" class="lcms-group-application__field">
          <label class="lcms-group-application__label">{{ t('phone') }}</label>
          <input v-model="form.phone" type="tel" autocomplete="tel" class="lcms-group-application__input" />
        </div>

        <div v-if="fieldOn('website')" class="lcms-group-application__field">
          <label class="lcms-group-application__label">{{ t('website') }}</label>
          <input v-model="form.website" type="url" class="lcms-group-application__input" placeholder="https://" />
        </div>

        <div v-if="fieldOn('message')" class="lcms-group-application__field">
          <label class="lcms-group-application__label">{{ t('message') }}</label>
          <textarea v-model="form.message" rows="4" class="lcms-group-application__input" />
        </div>

        <label class="lcms-group-application__consent">
          <input v-model="form.consent" type="checkbox" />
          <span>{{ t('consent') }}</span>
        </label>
        <span v-if="errors.consent" class="lcms-group-application__error">{{ errors.consent }}</span>

        <div v-if="failed" class="lcms-group-application__error">{{ t('error') }}</div>

        <button type="submit" class="lcms-group-application__btn" :disabled="sending">
          {{ sending ? t('sending') : submitText }}
        </button>
      </form>
    </template>
  </div>
</template>

<style scoped>
.lcms-group-application {
  max-width: 36rem;
  margin: 0 auto;
  font-family: var(--lcms-font-body, system-ui, sans-serif);
  color: var(--lcms-color-text, #1f2937);
}

.lcms-group-application__heading {
  font-family: var(--lcms-font-heading, var(--lcms-font-body));
  font-size: var(--lcms-h3-font-size, 1.5rem);
  font-weight: var(--lcms-h3-font-weight, 700);
  margin: 0 0 0.75rem;
}

.lcms-group-application__intro {
  color: var(--lcms-color-muted, #6b7280);
  margin: 0 0 1.5rem;
  white-space: pre-line;
}

.lcms-group-application__notice {
  padding: 0.875rem 1rem;
  border: 1px solid var(--lcms-color-border, #e5e7eb);
  border-radius: var(--lcms-border-radius, 0.375rem);
  margin-bottom: 1rem;
}

.lcms-group-application__notice--ok {
  border-color: var(--lcms-color-success, #10b981);
  color: var(--lcms-color-success, #10b981);
}

.lcms-group-application__link {
  color: var(--lcms-color-link, var(--lcms-color-primary));
  font-weight: 500;
  margin-left: 0.25rem;
}

.lcms-group-application__form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.lcms-group-application__field {
  display: flex;
  flex-direction: column;
}

.lcms-group-application__label {
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 0.375rem;
}

.lcms-group-application__input {
  padding: var(--lcms-input-padding, 0.625rem 0.875rem);
  background: var(--lcms-input-bg-color, var(--lcms-color-background, #fff));
  color: var(--lcms-input-text-color, var(--lcms-color-text));
  border: var(--lcms-input-border-width, 1px) var(--lcms-input-border-style, solid) var(--lcms-input-border-color, var(--lcms-color-border, #d1d5db));
  border-radius: var(--lcms-border-radius, 0.375rem);
  font-size: 0.9375rem;
  font-family: inherit;
  outline: none;
}

.lcms-group-application__input:focus {
  border-color: var(--lcms-input-focus-border-color, var(--lcms-color-primary, #3b82f6));
}

.lcms-group-application__input--error {
  border-color: var(--lcms-color-danger, #ef4444);
}

.lcms-group-application__error {
  font-size: 0.8125rem;
  color: var(--lcms-color-danger, #ef4444);
}

.lcms-group-application__consent {
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
  font-size: 0.875rem;
}

.lcms-group-application__btn {
  align-self: flex-start;
  padding: var(--lcms-btn-padding, 0.75rem 1.5rem);
  border-radius: var(--lcms-btn-border-radius, var(--lcms-border-radius, 0.375rem));
  background: var(--lcms-color-primary, #3b82f6);
  color: var(--lcms-color-white, #fff);
  font-size: var(--lcms-btn-font-size, 1rem);
  font-weight: var(--lcms-btn-font-weight, 600);
  font-family: var(--lcms-font-button, var(--lcms-font-body));
  border: none;
  cursor: pointer;
}

.lcms-group-application__btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
