<script setup lang="ts">
/**
 * Form Widget
 *
 * Renders a contact form.
 * New mode: fetches form definition by form_code from the API.
 * Backward compat: inline fields in widget config.
 */

import { computed, ref, reactive, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useLanguage } from '@/composables/useLanguage'
import { useApi } from '@/composables/useApi'

defineOptions({
  inheritAttrs: false
})

interface FormField {
  code: string
  type: 'text' | 'email' | 'textarea' | 'select' | 'checkbox'
  label: string
  placeholder?: string
  required?: boolean
  options?: { value: string; label: string }[]
}

interface FormConsent {
  code: string
  content: Record<string, string>
  required: boolean
}

interface Props {
  data: Record<string, any>
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const { extractValue } = useLanguage(props.language)
const api = useApi()

const config = computed(() => props.data.config || props.data || {})

// Remote form data (fetched by form_code)
const remoteForm = ref<Record<string, any> | null>(null)
const loadingForm = ref(false)

const isFormCodeMode = computed(() => !!config.value.form_code)

// Fetch form definition from API when using form_code mode
async function fetchForm() {
  const formCode = config.value.form_code
  if (!formCode) return

  loadingForm.value = true
  try {
    const response = await api.get(`/forms/${formCode}`)
    remoteForm.value = response.data?.data || response.data || null
  } catch {
    remoteForm.value = null
  } finally {
    loadingForm.value = false
  }
}

onMounted(() => {
  if (isFormCodeMode.value) {
    fetchForm()
  }
})

watch(() => config.value.form_code, (newCode) => {
  if (newCode) fetchForm()
})

const fields = computed<FormField[]>(() => {
  // New mode: fields from remote form
  if (isFormCodeMode.value && remoteForm.value) {
    const raw = remoteForm.value.fields || []
    return raw.map((f: any) => ({
      code: f.code || f.name || '',
      type: f.type || 'text',
      label: typeof f.label === 'object' ? (extractValue(f.label) as string) : (f.label || ''),
      placeholder: typeof f.placeholder === 'object' ? (extractValue(f.placeholder) as string) : (f.placeholder || ''),
      required: f.required ?? false,
      options: f.options || []
    }))
  }

  // Backward compat: inline fields
  const raw = config.value.fields || []
  return raw.map((f: any) => ({
    code: f.code || f.name || '',
    type: f.type || 'text',
    label: typeof f.label === 'object' ? (extractValue(f.label) as string) : (f.label || ''),
    placeholder: typeof f.placeholder === 'object' ? (extractValue(f.placeholder) as string) : (f.placeholder || ''),
    required: f.required ?? false,
    options: f.options || []
  }))
})

const consents = computed<FormConsent[]>(() => {
  if (isFormCodeMode.value && remoteForm.value) {
    return remoteForm.value.consents || []
  }
  return config.value.consents || []
})

const submitText = computed(() => {
  // Widget-level override
  const widgetText = config.value.submit_text
  if (widgetText) {
    if (typeof widgetText === 'object') return extractValue(widgetText) as string
    return widgetText
  }
  // Remote form settings
  if (remoteForm.value?.settings?.submit_text) {
    const val = remoteForm.value.settings.submit_text
    if (typeof val === 'object') return extractValue(val) as string
    return val
  }
  // Legacy fallback
  const legacy = config.value.submitText
  if (legacy) return legacy
  return 'Submit'
})

const successMessage = computed(() => {
  if (remoteForm.value?.settings?.success_message) {
    const val = remoteForm.value.settings.success_message
    if (typeof val === 'object') return extractValue(val) as string
    return val
  }
  const val = config.value.success_message || config.value.successMessage
  if (val && typeof val === 'object') return extractValue(val) as string
  return val || 'Thank you! Your message has been sent.'
})

const errorMessage = computed(() => {
  if (remoteForm.value?.settings?.error_message) {
    const val = remoteForm.value.settings.error_message
    if (typeof val === 'object') return extractValue(val) as string
    return val
  }
  const val = config.value.error_message || config.value.errorMessage
  if (val && typeof val === 'object') return extractValue(val) as string
  return val || 'Something went wrong. Please try again.'
})

const formUuid = computed(() => {
  if (remoteForm.value?.uuid) return remoteForm.value.uuid
  return config.value.form_uuid || props.data.uuid || ''
})

// Layout settings (new mode)
const buttonAlign = computed(() => config.value.button_align || 'left')
const labelPosition = computed(() => config.value.label_position || 'top')
const formColumns = computed(() => config.value.columns || '1')

// Button style
const buttonColor = computed(() => config.value.button_color || config.value.buttonColor || '')
const buttonStyle = computed(() => config.value.button_style || '')
const buttonSize = computed(() => config.value.button_size || 'md')

// Input style
const inputSize = computed(() => config.value.input_size || 'md')
const inputBorderRadius = computed(() => config.value.input_border_radius || 'md')
const inputPadding = computed(() => config.value.input_padding || '')
const inputBackgroundColor = computed(() => config.value.input_background_color || '')
const inputTextColor = computed(() => config.value.input_text_color || '')
const inputBorderColor = computed(() => config.value.input_border_color || '')
const inputBorderWidth = computed(() => config.value.input_border_width || '')
const inputBorderStyle = computed(() => config.value.input_border_style || '')
const inputFocusBorderColor = computed(() => config.value.input_focus_border_color || '')
const inputPlaceholderColor = computed(() => config.value.input_placeholder_color || '')

// Form state
const formData = reactive<Record<string, any>>({})
const consentData = reactive<Record<string, boolean>>({})
const isSubmitting = ref(false)
const submitStatus = ref<'idle' | 'success' | 'error'>('idle')
const validationErrors = ref<Record<string, string>>({})

// Anti-spam: honeypot and timestamp
const honeypot = ref('')
const loadTimestamp = ref(0)

// Cloudflare Turnstile CAPTCHA
const captchaSiteKey = computed(() => remoteForm.value?.captcha_site_key || '')
const captchaToken = ref('')
const turnstileContainer = ref<HTMLElement | null>(null)
let turnstileWidgetId: string | null = null

function loadTurnstileSDK(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).turnstile) {
      resolve()
      return
    }
    const existing = document.querySelector('script[src*="challenges.cloudflare.com/turnstile"]')
    if (existing) {
      existing.addEventListener('load', () => resolve())
      return
    }
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Turnstile SDK'))
    document.head.appendChild(script)
  })
}

async function renderTurnstile() {
  if (!captchaSiteKey.value || !turnstileContainer.value) return
  try {
    await loadTurnstileSDK()
    const turnstile = (window as any).turnstile
    if (!turnstile) return
    if (turnstileWidgetId !== null) {
      turnstile.remove(turnstileWidgetId)
    }
    turnstileWidgetId = turnstile.render(turnstileContainer.value, {
      sitekey: captchaSiteKey.value,
      callback: (token: string) => { captchaToken.value = token },
      'expired-callback': () => { captchaToken.value = '' },
      'error-callback': () => { captchaToken.value = '' },
    })
  } catch {
    // Turnstile failed to load — form will still work if server has no secret key configured
  }
}

watch(captchaSiteKey, async (key) => {
  if (key) {
    await nextTick()
    renderTurnstile()
  }
})

onMounted(() => {
  loadTimestamp.value = Date.now()
  if (captchaSiteKey.value) {
    nextTick(() => renderTurnstile())
  }
})

onBeforeUnmount(() => {
  if (turnstileWidgetId !== null && (window as any).turnstile) {
    (window as any).turnstile.remove(turnstileWidgetId)
    turnstileWidgetId = null
  }
})

// Initialize form data for each field
function initFormData() {
  for (const field of fields.value) {
    if (field.type === 'checkbox') {
      formData[field.code] = false
    } else {
      formData[field.code] = ''
    }
  }
  for (const consent of consents.value) {
    consentData[consent.code] = false
  }
}

watch([fields, consents], () => {
  initFormData()
}, { immediate: true })

// Client-side validation
function validate(): boolean {
  validationErrors.value = {}
  let valid = true

  for (const field of fields.value) {
    const value = formData[field.code]

    if (field.required) {
      if (field.type === 'checkbox' && !value) {
        validationErrors.value[field.code] = 'Required'
        valid = false
      } else if (field.type !== 'checkbox' && (!value || !String(value).trim())) {
        validationErrors.value[field.code] = 'Required'
        valid = false
      }
    }

    if (field.type === 'email' && value && String(value).trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(String(value))) {
        validationErrors.value[field.code] = 'Invalid email'
        valid = false
      }
    }
  }

  for (const consent of consents.value) {
    if (consent.required && !consentData[consent.code]) {
      validationErrors.value[consent.code] = 'Required'
      valid = false
    }
  }

  return valid
}

async function handleSubmit() {
  if (!validate()) return

  // Client-side honeypot check
  if (honeypot.value) {
    submitStatus.value = 'success'
    return
  }

  isSubmitting.value = true
  submitStatus.value = 'idle'

  try {
    const payload: Record<string, any> = {
      data: { ...formData },
      consents: { ...consentData },
      _hp_field: honeypot.value,
      _ts: loadTimestamp.value,
    }
    if (captchaToken.value) {
      payload._captcha_token = captchaToken.value
    }
    await api.post(`/forms/${formUuid.value}/submit`, payload)
    submitStatus.value = 'success'
    initFormData()
  } catch {
    submitStatus.value = 'error'
  } finally {
    isSubmitting.value = false
    // Reset Turnstile for fresh token
    if (turnstileWidgetId !== null && (window as any).turnstile) {
      (window as any).turnstile.reset(turnstileWidgetId)
      captchaToken.value = ''
    }
  }
}

const buttonPadding = computed(() => config.value.button_padding || '')
const buttonBorderRadius = computed(() => config.value.button_border_radius || 'md')
const buttonIcon = computed(() => config.value.button_icon || '')
const buttonIconPosition = computed(() => config.value.button_icon_position || 'left')

const RADIUS_MAP: Record<string, string> = { none: '0', sm: '4px', md: '8px', lg: '12px', pill: '50px' }

const computedButtonStyle = computed(() => {
  const styles: Record<string, string> = {}

  // Border radius
  if (buttonBorderRadius.value) {
    styles.borderRadius = RADIUS_MAP[buttonBorderRadius.value] || '8px'
  }

  // Padding
  if (buttonPadding.value) {
    styles.padding = `${buttonPadding.value}px`
  }

  // New mode: button_style is a bootstrap variant name
  if (buttonStyle.value) return styles
  // Legacy: direct color
  if (!buttonColor.value) return styles
  return {
    ...styles,
    backgroundColor: buttonColor.value,
    borderColor: buttonColor.value,
    color: '#ffffff'
  }
})

const computedInputStyle = computed(() => {
  const styles: Record<string, string> = {}
  if (inputBorderRadius.value) {
    styles.borderRadius = RADIUS_MAP[inputBorderRadius.value] || '8px'
  }
  if (inputPadding.value) {
    styles.padding = `${inputPadding.value}px`
  }
  if (inputBackgroundColor.value) {
    styles.backgroundColor = inputBackgroundColor.value
  }
  if (inputTextColor.value) {
    styles.color = inputTextColor.value
  }
  if (inputBorderColor.value || inputBorderWidth.value || inputBorderStyle.value) {
    const w = inputBorderWidth.value ? `${inputBorderWidth.value}px` : '1px'
    const s = inputBorderStyle.value || 'solid'
    const c = inputBorderColor.value || '#d1d5db'
    styles.border = `${w} ${s} ${c}`
  }
  return styles
})

const inputCssVars = computed(() => {
  const vars: Record<string, string> = {}
  if (inputFocusBorderColor.value) {
    vars['--input-focus-color'] = inputFocusBorderColor.value
  }
  if (inputPlaceholderColor.value) {
    vars['--input-placeholder-color'] = inputPlaceholderColor.value
  }
  return vars
})

const inputSizeClass = computed(() => {
  if (inputSize.value === 'sm') return 'lcms-form__input--sm'
  if (inputSize.value === 'lg') return 'lcms-form__input--lg'
  return ''
})

const buttonClasses = computed(() => {
  const classes = ['lcms-form__submit']
  if (buttonStyle.value) {
    classes.push(`btn-${buttonStyle.value}`)
  }
  if (buttonSize.value === 'sm') classes.push('lcms-form__submit--sm')
  if (buttonSize.value === 'lg') classes.push('lcms-form__submit--lg')
  return classes
})
</script>

<template>
  <div
    class="lcms-form"
    :style="inputCssVars"
  >
    <!-- Loading -->
    <div
      v-if="loadingForm"
      class="lcms-form__loading"
    >
      <span class="lcms-form__spinner" />
    </div>

    <!-- Success message -->
    <div
      v-else-if="submitStatus === 'success'"
      class="lcms-form__success"
    >
      {{ successMessage }}
    </div>

    <template v-else>
      <!-- Error message -->
      <div
        v-if="submitStatus === 'error'"
        class="lcms-form__error"
      >
        {{ errorMessage }}
      </div>

      <!-- Form -->
      <form
        class="lcms-form__form"
        @submit.prevent="handleSubmit"
      >
        <!-- Honeypot (hidden from real users) -->
        <input
          v-model="honeypot"
          type="text"
          name="_hp_field"
          style="position:absolute;left:-9999px;top:-9999px"
          tabindex="-1"
          autocomplete="off"
        >

        <div
          class="lcms-form__fields"
          :class="{
            'lcms-form__fields--2col': formColumns === '2'
          }"
        >
          <div
            v-for="field in fields"
            :key="field.code"
            class="lcms-form__field"
            :class="{
              'lcms-form__field--error': validationErrors[field.code],
              'lcms-form__field--side': labelPosition === 'side'
            }"
          >
            <label
              v-if="field.type !== 'checkbox'"
              class="lcms-form__label"
              :for="`form-${field.code}`"
            >
              {{ field.label }}
              <span v-if="field.required" class="lcms-form__required">*</span>
            </label>

            <!-- Text input -->
            <input
              v-if="field.type === 'text'"
              :id="`form-${field.code}`"
              v-model="formData[field.code]"
              type="text"
              class="lcms-form__input"
              :class="inputSizeClass"
              :style="computedInputStyle"
              :placeholder="field.placeholder"
              :required="field.required"
            >

            <!-- Email input -->
            <input
              v-else-if="field.type === 'email'"
              :id="`form-${field.code}`"
              v-model="formData[field.code]"
              type="email"
              class="lcms-form__input"
              :class="inputSizeClass"
              :style="computedInputStyle"
              :placeholder="field.placeholder"
              :required="field.required"
            >

            <!-- Textarea -->
            <textarea
              v-else-if="field.type === 'textarea'"
              :id="`form-${field.code}`"
              v-model="formData[field.code]"
              class="lcms-form__textarea"
              :class="inputSizeClass"
              :style="computedInputStyle"
              :placeholder="field.placeholder"
              :required="field.required"
              rows="4"
            />

            <!-- Select -->
            <select
              v-else-if="field.type === 'select'"
              :id="`form-${field.code}`"
              v-model="formData[field.code]"
              class="lcms-form__select"
              :class="inputSizeClass"
              :style="computedInputStyle"
              :required="field.required"
            >
              <option value="">{{ field.placeholder || '---' }}</option>
              <option
                v-for="opt in field.options"
                :key="opt.value"
                :value="opt.value"
              >
                {{ opt.label }}
              </option>
            </select>

            <!-- Checkbox -->
            <label
              v-else-if="field.type === 'checkbox'"
              class="lcms-form__checkbox-label"
              :for="`form-${field.code}`"
            >
              <input
                :id="`form-${field.code}`"
                v-model="formData[field.code]"
                type="checkbox"
                class="lcms-form__checkbox"
              >
              {{ field.label }}
              <span v-if="field.required" class="lcms-form__required">*</span>
            </label>

            <span
              v-if="validationErrors[field.code]"
              class="lcms-form__validation-error"
            >
              {{ validationErrors[field.code] }}
            </span>
          </div>
        </div>

        <!-- Consents -->
        <div
          v-if="consents.length > 0"
          class="lcms-form__consents"
        >
          <div
            v-for="consent in consents"
            :key="consent.code"
            class="lcms-form__consent"
            :class="{ 'lcms-form__consent--error': validationErrors[consent.code] }"
          >
            <label
              class="lcms-form__consent-label"
              :for="`consent-${consent.code}`"
            >
              <input
                :id="`consent-${consent.code}`"
                v-model="consentData[consent.code]"
                type="checkbox"
                class="lcms-form__checkbox"
              >
              <span
                class="lcms-form__consent-text"
                v-html="extractValue(consent.content) || consent.code"
              />
              <span v-if="consent.required" class="lcms-form__required">*</span>
            </label>
            <span
              v-if="validationErrors[consent.code]"
              class="lcms-form__validation-error"
            >
              {{ validationErrors[consent.code] }}
            </span>
          </div>
        </div>

        <!-- Cloudflare Turnstile CAPTCHA -->
        <div
          v-if="captchaSiteKey"
          ref="turnstileContainer"
          class="lcms-form__captcha"
        />

        <div
          class="lcms-form__submit-wrapper"
          :class="{
            'lcms-form__submit-wrapper--center': buttonAlign === 'center',
            'lcms-form__submit-wrapper--right': buttonAlign === 'right'
          }"
        >
          <button
            type="submit"
            :class="buttonClasses"
            :style="computedButtonStyle"
            :disabled="isSubmitting"
          >
            <span
              v-if="isSubmitting"
              class="lcms-form__spinner"
            />
            <i v-if="buttonIcon && buttonIconPosition === 'left'" :class="buttonIcon" style="margin-right: 6px;" />
            {{ submitText }}
            <i v-if="buttonIcon && buttonIconPosition === 'right'" :class="buttonIcon" style="margin-left: 6px;" />
          </button>
        </div>
      </form>
    </template>
  </div>
</template>
