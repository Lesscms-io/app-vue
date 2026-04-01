<script setup lang="ts">
/**
 * Product Grid Widget (E-commerce)
 *
 * Displays products in a responsive grid layout.
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
const columns = computed(() => config.value.columns || 3)
const showPrice = computed(() => config.value.show_price !== false)
const showCategory = computed(() => config.value.show_category !== false)

const gridStyle = computed(() => ({
  display: 'grid',
  gridTemplateColumns: `repeat(${columns.value}, 1fr)`,
  gap: '1rem',
}))
</script>

<template>
  <div class="lcms-product-grid">
    <h3 v-if="headingText" class="lcms-product-grid__heading">{{ headingText }}</h3>
    <div class="lcms-product-grid__grid" :style="gridStyle">
      <div class="lcms-product-grid__placeholder">
        No products loaded
      </div>
    </div>
  </div>
</template>
