<script setup lang="ts">
/**
 * Customer Account Widget (E-commerce)
 *
 * Customer dashboard. Stub implementation — LessCommerce API integration pending.
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
const headingText = computed(() => extractValue(config.value.heading?.text) || 'My Account')
</script>

<template>
  <div class="lcms-customer-account">
    <h2 class="lcms-customer-account__heading">{{ headingText }}</h2>
    <div class="lcms-customer-account__placeholder">
      Customer account dashboard placeholder
    </div>
  </div>
</template>
