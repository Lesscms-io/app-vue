<script setup lang="ts">
/**
 * Product Detail Widget (E-commerce)
 *
 * Full product page. Stub implementation — LessCommerce API integration pending.
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
const addToCartText = computed(() => extractValue(config.value.add_to_cart_button?.text) || 'Add to cart')
</script>

<template>
  <div class="lcms-product-detail">
    <div class="lcms-product-detail__placeholder">
      Product detail placeholder — button: "{{ addToCartText }}"
    </div>
  </div>
</template>
