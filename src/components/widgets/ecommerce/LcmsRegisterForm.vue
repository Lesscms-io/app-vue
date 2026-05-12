<script setup lang="ts">
/**
 * Register Form Widget (E-commerce)
 *
 * Customer registration form with validation.
 */

import { computed, reactive, ref, inject, onMounted, onUnmounted, type Ref } from 'vue'
import { useLanguage } from '../../../composables/useLanguage'
import { useCustomer } from '../../../composables/useCustomer'
import { useToast } from '../../../composables/useToast'

defineOptions({ inheritAttrs: false })

interface Props {
  data: Record<string, any>
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const { extractValue } = useLanguage(props.language)
const customer = useCustomer()
const toast = useToast()
const projectConfig = inject<Ref<any> | null>('lesscms-project-config', null)

const config = computed(() => props.data?.config || props.data || {})
const headingText = computed(() =>
  extractValue(props.data?.heading?.text) || (props.language === 'en' ? 'Create account' : 'Załóż konto')
)
const showLoginLink = computed(() => config.value.show_login_link !== false)
const requirePhone = computed(() => config.value.require_phone === true)
const redirectAfterRegister = computed(() => config.value.redirect_after_register || projectConfig?.value?.commerce?.routes?.account || '/konto')

const t = (key: string) => {
  const lang = props.language || 'pl'
  const dict: Record<string, Record<string, string>> = {
    pl: {
      name: 'Imię i nazwisko',
      email: 'Email',
      phone: 'Telefon',
      password: 'Hasło',
      passwordConfirm: 'Potwierdź hasło',
      submit: 'Zarejestruj się',
      processing: 'Rejestrowanie...',
      hasAccount: 'Masz już konto?',
      login: 'Zaloguj się',
      requiredField: 'To pole jest wymagane',
      invalidEmail: 'Nieprawidłowy email',
      passwordTooShort: 'Min. 8 znaków',
      passwordsMismatch: 'Hasła nie są zgodne',
      registerError: 'Nie udało się zarejestrować',
      registered: 'Konto utworzone',
    },
    en: {
      name: 'Full name',
      email: 'Email',
      phone: 'Phone',
      password: 'Password',
      passwordConfirm: 'Confirm password',
      submit: 'Sign up',
      processing: 'Creating...',
      hasAccount: 'Already have an account?',
      login: 'Sign in',
      requiredField: 'Required',
      invalidEmail: 'Invalid email',
      passwordTooShort: 'Min 8 characters',
      passwordsMismatch: 'Passwords do not match',
      registerError: 'Registration failed',
      registered: 'Account created',
    },
  }
  return dict[lang]?.[key] || dict.pl[key] || key
}

const form = reactive({
  name: '',
  email: '',
  phone: '',
  password: '',
  passwordConfirm: '',
})

const errors = reactive<Record<string, string>>({})

// Hash-based visibility: form renders only when URL hash is #register,
// mirroring LoginForm which hides in that state.
const currentHash = ref('')
function updateHash() {
  if (typeof window !== 'undefined') currentHash.value = window.location.hash
}
const isVisible = computed(() => currentHash.value === '#register')

onMounted(() => {
  updateHash()
  if (typeof window !== 'undefined') {
    window.addEventListener('hashchange', updateHash)
  }
})
onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('hashchange', updateHash)
  }
})

function validate(): boolean {
  Object.keys(errors).forEach(k => delete errors[k])

  if (!form.name) errors.name = t('requiredField')
  if (!form.email) errors.email = t('requiredField')
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = t('invalidEmail')
  if (requirePhone.value && !form.phone) errors.phone = t('requiredField')
  if (!form.password) errors.password = t('requiredField')
  else if (form.password.length < 8) errors.password = t('passwordTooShort')
  if (form.password !== form.passwordConfirm) errors.passwordConfirm = t('passwordsMismatch')

  return Object.keys(errors).length === 0
}

// Resolve a post-register return target from the URL. Mirrors LcmsLoginForm:
// accepts ?return=/path, ?return_to=/path, or ?return=<absolute> when same
// origin. Off-origin / unparseable falls back to null so the caller uses
// `redirectAfterRegister`.
function resolveReturnTarget(): string | null {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  const raw = params.get('return') || params.get('return_to')
  if (!raw) return null
  if (raw.startsWith('/') && !raw.startsWith('//')) return raw
  try {
    const u = new URL(raw, window.location.origin)
    if (u.origin === window.location.origin) {
      return u.pathname + u.search + u.hash
    }
  } catch {
    /* fall through */
  }
  return null
}

async function handleSubmit() {
  if (!validate()) return

  try {
    await customer.register({
      name: form.name,
      email: form.email,
      password: form.password,
      phone: form.phone || undefined,
    })
    toast.success(t('registered'))
    // Honor ?return=<path|same-origin URL> set by callers like
    // LcmsProductConfigurator gating a plugin behavior on auth. Without
    // this the user lands on the default /konto profile after register
    // and loses the configurator flow they came from.
    if (typeof window !== 'undefined') {
      const destination = resolveReturnTarget() || redirectAfterRegister.value
      const target = new URL(destination, window.location.origin)
      if (window.location.pathname !== target.pathname || window.location.search !== target.search) {
        // Navigate immediately — a setTimeout here lets Vue's reactivity flip
        // the parent (LcmsCustomerAccount) to the "Moje konto" branch first,
        // producing a half-second flash of the account view before the
        // browser actually leaves the page.
        window.location.href = destination
      } else {
        // On same page, clear `#register` hash so LoginForm/Panel take over cleanly
        if (window.location.hash === '#register') {
          history.replaceState(null, '', window.location.pathname + window.location.search)
          window.dispatchEvent(new HashChangeEvent('hashchange'))
        }
      }
    }
  } catch (err: any) {
    toast.error(err.message || t('registerError'))
  }
}
</script>

<template>
  <div v-if="isVisible" class="lcms-register-form">
    <h3 v-if="headingText" class="lcms-register-form__heading">{{ headingText }}</h3>

    <form class="lcms-register-form__form" @submit.prevent="handleSubmit">
      <div class="lcms-register-form__field">
        <label class="lcms-register-form__label">{{ t('name') }} *</label>
        <input
          v-model="form.name"
          type="text"
          autocomplete="name"
          class="lcms-register-form__input"
          :class="{ 'lcms-register-form__input--error': errors.name }"
        />
        <span v-if="errors.name" class="lcms-register-form__error">{{ errors.name }}</span>
      </div>

      <div class="lcms-register-form__field">
        <label class="lcms-register-form__label">{{ t('email') }} *</label>
        <input
          v-model="form.email"
          type="email"
          autocomplete="email"
          class="lcms-register-form__input"
          :class="{ 'lcms-register-form__input--error': errors.email }"
        />
        <span v-if="errors.email" class="lcms-register-form__error">{{ errors.email }}</span>
      </div>

      <div v-if="requirePhone" class="lcms-register-form__field">
        <label class="lcms-register-form__label">{{ t('phone') }} *</label>
        <input
          v-model="form.phone"
          type="tel"
          autocomplete="tel"
          class="lcms-register-form__input"
          :class="{ 'lcms-register-form__input--error': errors.phone }"
        />
        <span v-if="errors.phone" class="lcms-register-form__error">{{ errors.phone }}</span>
      </div>

      <div class="lcms-register-form__field">
        <label class="lcms-register-form__label">{{ t('password') }} *</label>
        <input
          v-model="form.password"
          type="password"
          autocomplete="new-password"
          class="lcms-register-form__input"
          :class="{ 'lcms-register-form__input--error': errors.password }"
        />
        <span v-if="errors.password" class="lcms-register-form__error">{{ errors.password }}</span>
      </div>

      <div class="lcms-register-form__field">
        <label class="lcms-register-form__label">{{ t('passwordConfirm') }} *</label>
        <input
          v-model="form.passwordConfirm"
          type="password"
          autocomplete="new-password"
          class="lcms-register-form__input"
          :class="{ 'lcms-register-form__input--error': errors.passwordConfirm }"
        />
        <span v-if="errors.passwordConfirm" class="lcms-register-form__error">{{ errors.passwordConfirm }}</span>
      </div>

      <button type="submit" class="lcms-register-form__btn" :disabled="customer.isLoading.value">
        {{ customer.isLoading.value ? t('processing') : t('submit') }}
      </button>

      <div v-if="showLoginLink" class="lcms-register-form__login">
        {{ t('hasAccount') }}
        <a href="#login">{{ t('login') }}</a>
      </div>
    </form>
  </div>
</template>

<style scoped>
.lcms-register-form {
  max-width: 24rem;
  margin: 0 auto;
  font-family: var(--lcms-font-body, system-ui, sans-serif);
  color: var(--lcms-color-text, #1f2937);
}

.lcms-register-form__heading {
  font-family: var(--lcms-font-heading, var(--lcms-font-body));
  font-size: var(--lcms-h3-font-size, 1.5rem);
  font-weight: var(--lcms-h3-font-weight, 700);
  text-align: center;
  margin: 0 0 1.5rem;
}

.lcms-register-form__form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.lcms-register-form__field {
  display: flex;
  flex-direction: column;
}

.lcms-register-form__label {
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 0.375rem;
}

.lcms-register-form__input {
  padding: 0.625rem 0.875rem;
  background: var(--lcms-input-bg-color, var(--lcms-color-background, #fff));
  color: var(--lcms-input-text-color, var(--lcms-color-text));
  border: var(--lcms-input-border-width, 1px) var(--lcms-input-border-style, solid) var(--lcms-input-border-color, var(--lcms-color-border, #d1d5db));
  border-radius: var(--lcms-border-radius, 0.375rem);
  font-size: 0.9375rem;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.lcms-register-form__input:focus {
  border-color: var(--lcms-input-focus-border-color, var(--lcms-color-primary, #3b82f6));
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.lcms-register-form__input--error {
  border-color: var(--lcms-color-danger, #ef4444);
}

.lcms-register-form__error {
  font-size: 0.8125rem;
  color: var(--lcms-color-danger, #ef4444);
  margin-top: 0.375rem;
}

.lcms-register-form__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--lcms-btn-padding, 0.75rem 1.5rem);
  border-radius: var(--lcms-btn-border-radius, var(--lcms-border-radius, 0.375rem));
  background: var(--lcms-color-primary, #3b82f6);
  color: var(--lcms-color-white, #fff);
  font-size: var(--lcms-btn-font-size, 1rem);
  font-weight: var(--lcms-btn-font-weight, 600);
  font-family: var(--lcms-font-button, var(--lcms-font-body));
  border: none;
  cursor: pointer;
  margin-top: 0.5rem;
  transition: opacity 0.2s;
}

.lcms-register-form__btn:hover:not(:disabled) {
  opacity: 0.9;
}

.lcms-register-form__btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.lcms-register-form__login {
  text-align: center;
  font-size: 0.875rem;
  color: var(--lcms-color-muted, #6b7280);
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--lcms-color-border, #e5e7eb);
}

.lcms-register-form__login a {
  color: var(--lcms-color-link, var(--lcms-color-primary));
  text-decoration: none;
  font-weight: 500;
  margin-left: 0.25rem;
}

.lcms-register-form__login a:hover {
  text-decoration: underline;
}
</style>
