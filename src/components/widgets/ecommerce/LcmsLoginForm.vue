<script setup lang="ts">
/**
 * Login Form Widget (E-commerce)
 *
 * Displays a customer login form.
 * Stub implementation - LessCommerce integration pending.
 */

import { computed } from 'vue'
import { useLanguage } from '@/composables/useLanguage'

defineOptions({
  inheritAttrs: false
})

interface Props {
  data: Record<string, any>
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const { extractValue } = useLanguage(props.language)

const config = computed(() => props.data || {})
const headingText = computed(() => extractValue(config.value.heading?.text) || 'Login')
const showRegisterLink = computed(() => config.value.show_register_link !== false)
const showForgotPassword = computed(() => config.value.show_forgot_password !== false)
</script>

<template>
  <div class="lcms-login-form">
    <h3 v-if="headingText" class="lcms-login-form__heading">{{ headingText }}</h3>
    <form class="lcms-login-form__form" @submit.prevent>
      <div class="lcms-login-form__field">
        <label>Email</label>
        <input type="email" disabled placeholder="email@example.com">
      </div>
      <div class="lcms-login-form__field">
        <label>Password</label>
        <input type="password" disabled placeholder="********">
      </div>
      <button type="submit" disabled>Login</button>
      <div v-if="showForgotPassword" class="lcms-login-form__forgot">Forgot password?</div>
      <div v-if="showRegisterLink" class="lcms-login-form__register">Don't have an account? Register</div>
    </form>
  </div>
</template>
