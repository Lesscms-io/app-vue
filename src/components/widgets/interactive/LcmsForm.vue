<script setup lang="ts">
/**
 * Form Widget
 *
 * Renders a contact form with dynamic fields.
 * Supports text, email, textarea, select, and checkbox field types.
 * Submits data to the public API forms endpoint.
 */

import { computed, ref, reactive, inject } from 'vue'
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

interface Props {
  data: Record<string, any>
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const { extractValue } = useLanguage(props.language)
const api = useApi()
const emailConfig = inject<{ provider: string; token: string; fromEmail: string; fromName?: string } | null>('lesscms-email-config', null)

const config = computed(() => props.data.config || props.data || {})

const fields = computed<FormField[]>(() => {
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

const submitText = computed(() => {
  const val = config.value.submit_text || config.value.submitText
  if (val && typeof val === 'object') return extractValue(val) as string
  return val || 'Submit'
})

const successMessage = computed(() => {
  const val = config.value.success_message || config.value.successMessage
  if (val && typeof val === 'object') return extractValue(val) as string
  return val || 'Thank you! Your message has been sent.'
})

const errorMessage = computed(() => {
  const val = config.value.error_message || config.value.errorMessage
  if (val && typeof val === 'object') return extractValue(val) as string
  return val || 'Something went wrong. Please try again.'
})

const buttonColor = computed(() => config.value.button_color || config.value.buttonColor || '')
const formUuid = computed(() => config.value.form_uuid || props.data.uuid || '')
const emailTo = computed(() => config.value.email_to || config.value.emailTo || '')

// Form state
const formData = reactive<Record<string, any>>({})
const isSubmitting = ref(false)
const submitStatus = ref<'idle' | 'success' | 'error'>('idle')
const validationErrors = ref<Record<string, string>>({})

// Initialize form data for each field
function initFormData() {
  for (const field of fields.value) {
    if (field.type === 'checkbox') {
      formData[field.code] = false
    } else {
      formData[field.code] = ''
    }
  }
}
initFormData()

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

  return valid
}

function formatFormDataAsHtml(): string {
  const rows = fields.value.map(field => {
    let value = formData[field.code]
    if (typeof value === 'boolean') {
      value = value ? 'Yes' : 'No'
    }
    const escapedLabel = String(field.label || field.code).replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const escapedValue = String(value ?? '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')
    return `<tr><td style="padding:8px 12px;border:1px solid #dee2e6;font-weight:600;background:#f8f9fa;white-space:nowrap">${escapedLabel}</td><td style="padding:8px 12px;border:1px solid #dee2e6">${escapedValue}</td></tr>`
  }).join('')

  return `<table style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif;font-size:14px">${rows}</table>`
}

async function sendEmail() {
  if (!emailConfig || !emailTo.value) return

  try {
    await fetch('https://send.api.mailtrap.io/api/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${emailConfig.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: {
          email: emailConfig.fromEmail,
          name: emailConfig.fromName || 'LessCMS'
        },
        to: [{ email: emailTo.value }],
        subject: 'New form submission',
        html: formatFormDataAsHtml()
      })
    })
  } catch (err) {
    console.error('Failed to send email notification:', err)
  }
}

async function handleSubmit() {
  if (!validate()) return

  isSubmitting.value = true
  submitStatus.value = 'idle'

  try {
    await api.post(`/forms/${formUuid.value}/submit`, {
      data: { ...formData }
    })
    submitStatus.value = 'success'
    // Fire-and-forget email notification
    sendEmail()
    // Reset form
    initFormData()
  } catch {
    submitStatus.value = 'error'
  } finally {
    isSubmitting.value = false
  }
}

const buttonStyle = computed(() => {
  if (!buttonColor.value) return {}
  return {
    backgroundColor: buttonColor.value,
    borderColor: buttonColor.value,
    color: '#ffffff'
  }
})
</script>

<template>
  <div class="lcms-form">
    <!-- Success message -->
    <div
      v-if="submitStatus === 'success'"
      class="lcms-form__success"
    >
      {{ successMessage }}
    </div>

    <!-- Error message -->
    <div
      v-if="submitStatus === 'error'"
      class="lcms-form__error"
    >
      {{ errorMessage }}
    </div>

    <!-- Form -->
    <form
      v-if="submitStatus !== 'success'"
      class="lcms-form__form"
      @submit.prevent="handleSubmit"
    >
      <div
        v-for="field in fields"
        :key="field.code"
        class="lcms-form__field"
        :class="{ 'lcms-form__field--error': validationErrors[field.code] }"
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
          :placeholder="field.placeholder"
          :required="field.required"
        >

        <!-- Textarea -->
        <textarea
          v-else-if="field.type === 'textarea'"
          :id="`form-${field.code}`"
          v-model="formData[field.code]"
          class="lcms-form__textarea"
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

      <button
        type="submit"
        class="lcms-form__submit"
        :style="buttonStyle"
        :disabled="isSubmitting"
      >
        <span
          v-if="isSubmitting"
          class="lcms-form__spinner"
        />
        {{ submitText }}
      </button>
    </form>
  </div>
</template>
