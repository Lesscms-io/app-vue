<script setup lang="ts">
/**
 * Search Bar Widget (E-commerce)
 *
 * Displays a product search input.
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
const placeholder = computed(() => extractValue(config.value.placeholder) || 'Search products...')
</script>

<template>
  <div class="lcms-search-bar">
    <input
      type="text"
      class="lcms-search-bar__input"
      :placeholder="placeholder"
      disabled
    >
  </div>
</template>
