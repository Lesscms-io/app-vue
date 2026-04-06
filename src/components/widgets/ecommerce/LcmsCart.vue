<script setup lang="ts">
/**
 * Cart Widget (E-commerce)
 *
 * Full cart page. Stub implementation — LessCommerce API integration pending.
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
const headingText = computed(() => extractValue(config.value.heading?.text) || 'Cart')
const emptyMessage = computed(() => extractValue(config.value.empty_message?.text) || 'Your cart is empty')
const checkoutButtonText = computed(() => extractValue(config.value.checkout_button?.text) || 'Checkout')
const continueShoppingText = computed(() => extractValue(config.value.continue_shopping?.text) || 'Continue shopping')
</script>

<template>
  <div class="lcms-cart">
    <h2 class="lcms-cart__heading">{{ headingText }}</h2>
    <div class="lcms-cart__empty">
      {{ emptyMessage }}
    </div>
    <div class="lcms-cart__actions">
      <button class="lcms-cart__checkout" type="button">{{ checkoutButtonText }}</button>
      <a class="lcms-cart__continue" href="/">{{ continueShoppingText }}</a>
    </div>
  </div>
</template>
