<script setup lang="ts">
/**
 * Login Form Widget (E-commerce)
 *
 * Customer login form with optional forgot-password and register links.
 */

import { computed, ref, reactive, inject, onMounted, onUnmounted, type Ref } from 'vue'
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
  extractValue(props.data?.heading?.text) || (props.language === 'en' ? 'Sign in' : 'Zaloguj się')
)
const showRegisterLink = computed(() => config.value.show_register_link !== false)
const showForgotPassword = computed(() => config.value.show_forgot_password !== false)
const redirectAfterLogin = computed(() => config.value.redirect_after_login || projectConfig?.value?.commerce?.routes?.account || '/konto')

const t = (key: string) => {
  const lang = props.language || 'pl'
  const dict: Record<string, Record<string, string>> = {
    pl: {
      email: 'Email',
      password: 'Hasło',
      submit: 'Zaloguj się',
      processing: 'Logowanie...',
      forgot: 'Zapomniałeś hasła?',
      noAccount: 'Nie masz konta?',
      register: 'Zarejestruj się',
      forgotTitle: 'Resetuj hasło',
      forgotInfo: 'Wpisz swój email, aby otrzymać link do zresetowania hasła.',
      sendLink: 'Wyślij link',
      cancel: 'Anuluj',
      forgotSuccess: 'Sprawdź swój email',
      loginError: 'Błędny email lub hasło',
      requiredField: 'To pole jest wymagane',
    },
    en: {
      email: 'Email',
      password: 'Password',
      submit: 'Sign in',
      processing: 'Signing in...',
      forgot: 'Forgot password?',
      noAccount: "Don't have an account?",
      register: 'Sign up',
      forgotTitle: 'Reset password',
      forgotInfo: 'Enter your email to receive a password reset link.',
      sendLink: 'Send link',
      cancel: 'Cancel',
      forgotSuccess: 'Check your email',
      loginError: 'Invalid email or password',
      requiredField: 'Required',
    },
  }
  return dict[lang]?.[key] || dict.pl[key] || key
}

const form = reactive({ email: '', password: '' })
const errors = reactive<Record<string, string>>({})
const showForgot = ref(false)
const forgotEmail = ref('')

// Hash-based visibility: when URL hash is #register, this form hides
// so the RegisterForm widget (if present on the page) takes over.
const currentHash = ref('')
function updateHash() {
  if (typeof window !== 'undefined') currentHash.value = window.location.hash
}
const isVisible = computed(() => currentHash.value !== '#register')

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

async function handleLogin() {
  Object.keys(errors).forEach(k => delete errors[k])

  if (!form.email) errors.email = t('requiredField')
  if (!form.password) errors.password = t('requiredField')
  if (Object.keys(errors).length > 0) return

  try {
    await customer.login(form.email, form.password)
    toast.success(t('email') === 'Email' ? 'Zalogowano' : 'Logged in')
    // Only navigate away if we're not already on the target page.
    // A same-page reload causes a flicker: SSR (no localStorage) renders
    // LoginForm until the client init() fetches getMe() and flips state.
    if (typeof window !== 'undefined') {
      // Prefer ?return_to=<path> (set by AuthGate when gating a protected page)
      // over the widget's default redirect. Only accept same-origin paths.
      const params = new URLSearchParams(window.location.search)
      const rawReturnTo = params.get('return_to')
      const returnTo = rawReturnTo && rawReturnTo.startsWith('/') && !rawReturnTo.startsWith('//')
        ? rawReturnTo
        : null
      const destination = returnTo || redirectAfterLogin.value
      const target = new URL(destination, window.location.origin)
      if (window.location.pathname !== target.pathname || window.location.search !== target.search) {
        setTimeout(() => { window.location.href = destination }, 500)
      }
    }
  } catch (err: any) {
    toast.error(err.message || t('loginError'))
  }
}

async function handleForgot() {
  if (!forgotEmail.value) return
  try {
    await customer.forgotPassword(forgotEmail.value)
    toast.success(t('forgotSuccess'))
    showForgot.value = false
    forgotEmail.value = ''
  } catch (err: any) {
    toast.error(err.message || 'Error')
  }
}
</script>

<template>
  <div v-if="isVisible" class="lcms-login-form">
    <h3 v-if="headingText" class="lcms-login-form__heading">{{ headingText }}</h3>

    <form v-if="!showForgot" class="lcms-login-form__form" @submit.prevent="handleLogin">
      <div class="lcms-login-form__field">
        <label class="lcms-login-form__label">{{ t('email') }}</label>
        <input
          v-model="form.email"
          type="email"
          autocomplete="email"
          class="lcms-login-form__input"
          :class="{ 'lcms-login-form__input--error': errors.email }"
        />
        <span v-if="errors.email" class="lcms-login-form__error">{{ errors.email }}</span>
      </div>

      <div class="lcms-login-form__field">
        <label class="lcms-login-form__label">{{ t('password') }}</label>
        <input
          v-model="form.password"
          type="password"
          autocomplete="current-password"
          class="lcms-login-form__input"
          :class="{ 'lcms-login-form__input--error': errors.password }"
        />
        <span v-if="errors.password" class="lcms-login-form__error">{{ errors.password }}</span>
      </div>

      <button
        type="submit"
        class="lcms-login-form__btn"
        :disabled="customer.isLoading.value"
      >
        {{ customer.isLoading.value ? t('processing') : t('submit') }}
      </button>

      <button
        v-if="showForgotPassword"
        type="button"
        class="lcms-login-form__link"
        @click="showForgot = true"
      >
        {{ t('forgot') }}
      </button>

      <div v-if="showRegisterLink" class="lcms-login-form__register">
        {{ t('noAccount') }}
        <a href="#register">{{ t('register') }}</a>
      </div>
    </form>

    <form v-else class="lcms-login-form__form" @submit.prevent="handleForgot">
      <h4 class="lcms-login-form__forgot-title">{{ t('forgotTitle') }}</h4>
      <p class="lcms-login-form__forgot-info">{{ t('forgotInfo') }}</p>
      <div class="lcms-login-form__field">
        <label class="lcms-login-form__label">{{ t('email') }}</label>
        <input v-model="forgotEmail" type="email" required class="lcms-login-form__input" />
      </div>
      <div class="lcms-login-form__forgot-actions">
        <button type="button" class="lcms-login-form__btn lcms-login-form__btn--secondary" @click="showForgot = false">
          {{ t('cancel') }}
        </button>
        <button type="submit" class="lcms-login-form__btn">{{ t('sendLink') }}</button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.lcms-login-form {
  max-width: 24rem;
  margin: 0 auto;
  font-family: var(--lcms-font-body, system-ui, sans-serif);
  color: var(--lcms-color-text, #1f2937);
}

.lcms-login-form__heading {
  font-family: var(--lcms-font-heading, var(--lcms-font-body));
  font-size: var(--lcms-h3-font-size, 1.5rem);
  font-weight: var(--lcms-h3-font-weight, 700);
  text-align: center;
  margin: 0 0 1.5rem;
}

.lcms-login-form__form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.lcms-login-form__field {
  display: flex;
  flex-direction: column;
}

.lcms-login-form__label {
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 0.375rem;
}

.lcms-login-form__input {
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

.lcms-login-form__input:focus {
  border-color: var(--lcms-input-focus-border-color, var(--lcms-color-primary, #3b82f6));
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.lcms-login-form__input--error {
  border-color: var(--lcms-color-danger, #ef4444);
}

.lcms-login-form__error {
  font-size: 0.8125rem;
  color: var(--lcms-color-danger, #ef4444);
  margin-top: 0.375rem;
}

.lcms-login-form__btn {
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
  transition: opacity 0.2s;
  margin-top: 0.5rem;
}

.lcms-login-form__btn:hover:not(:disabled) {
  opacity: 0.9;
}

.lcms-login-form__btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.lcms-login-form__btn--secondary {
  background: var(--lcms-color-background, white);
  color: var(--lcms-color-text, #1f2937);
  border: 1px solid var(--lcms-color-border, #d1d5db);
}

.lcms-login-form__link {
  background: none;
  border: none;
  color: var(--lcms-color-link, var(--lcms-color-primary));
  cursor: pointer;
  text-align: center;
  font-size: 0.875rem;
  text-decoration: none;
  font-family: inherit;
  margin-top: 0.5rem;
}

.lcms-login-form__link:hover {
  text-decoration: underline;
}

.lcms-login-form__register {
  text-align: center;
  font-size: 0.875rem;
  color: var(--lcms-color-muted, #6b7280);
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--lcms-color-border, #e5e7eb);
}

.lcms-login-form__register a {
  color: var(--lcms-color-link, var(--lcms-color-primary));
  text-decoration: none;
  font-weight: 500;
  margin-left: 0.25rem;
}

.lcms-login-form__register a:hover {
  text-decoration: underline;
}

.lcms-login-form__forgot-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 0.5rem;
}

.lcms-login-form__forgot-info {
  font-size: 0.875rem;
  color: var(--lcms-color-muted, #6b7280);
  margin: 0 0 1rem;
}

.lcms-login-form__forgot-actions {
  display: flex;
  gap: 0.5rem;
}

.lcms-login-form__forgot-actions .lcms-login-form__btn {
  flex: 1;
  margin-top: 0;
}
</style>
