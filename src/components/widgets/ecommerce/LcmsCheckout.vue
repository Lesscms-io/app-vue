<script setup lang="ts">
/**
 * Checkout Widget (E-commerce)
 *
 * Full checkout flow. Stub implementation — LessCommerce API integration pending.
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
const headingText = computed(() => extractValue(config.value.heading?.text) || 'Checkout')
const submitButtonText = computed(() => extractValue(config.value.submit_button?.text) || 'Place order')
</script>

<template>
  <div class="lcms-checkout">
    <h2 class="lcms-checkout__heading">{{ headingText }}</h2>
    <div class="lcms-checkout__placeholder">
      Checkout flow placeholder
    </div>
    <button class="lcms-checkout__submit" type="button">{{ submitButtonText }}</button>
  </div>
</template>
