<script setup lang="ts">
/**
 * Product Carousel Widget (E-commerce)
 *
 * Displays products in a horizontal carousel.
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
const headingText = computed(() => extractValue(config.value.heading?.text) || '')
const visibleItems = computed(() => config.value.visible_items || 4)
const showPrice = computed(() => config.value.show_price !== false)
</script>

<template>
  <div class="lcms-product-carousel">
    <h3 v-if="headingText" class="lcms-product-carousel__heading">{{ headingText }}</h3>
    <div class="lcms-product-carousel__track">
      <div class="lcms-product-carousel__placeholder">
        No products loaded
      </div>
    </div>
  </div>
</template>
