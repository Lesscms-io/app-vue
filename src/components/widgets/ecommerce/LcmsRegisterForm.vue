<script setup lang="ts">
/**
 * Register Form Widget (E-commerce)
 *
 * Displays a customer registration form.
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
const headingText = computed(() => extractValue(config.value.heading?.text) || 'Register')
const showLoginLink = computed(() => config.value.show_login_link !== false)
const requirePhone = computed(() => config.value.require_phone === true)
</script>

<template>
  <div class="lcms-register-form">
    <h3 v-if="headingText" class="lcms-register-form__heading">{{ headingText }}</h3>
    <form class="lcms-register-form__form" @submit.prevent>
      <div class="lcms-register-form__field">
        <label>Name</label>
        <input type="text" disabled placeholder="Full name">
      </div>
      <div class="lcms-register-form__field">
        <label>Email</label>
        <input type="email" disabled placeholder="email@example.com">
      </div>
      <div v-if="requirePhone" class="lcms-register-form__field">
        <label>Phone</label>
        <input type="tel" disabled placeholder="+48 000 000 000">
      </div>
      <div class="lcms-register-form__field">
        <label>Password</label>
        <input type="password" disabled placeholder="********">
      </div>
      <div class="lcms-register-form__field">
        <label>Confirm Password</label>
        <input type="password" disabled placeholder="********">
      </div>
      <button type="submit" disabled>Register</button>
      <div v-if="showLoginLink" class="lcms-register-form__login">Already have an account? Login</div>
    </form>
  </div>
</template>
