<script setup lang="ts">
/**
 * Mini Cart Widget (E-commerce)
 *
 * Displays a compact shopping cart icon with item count.
 * Stub implementation - LessCommerce integration pending.
 */

import { computed } from 'vue'

defineOptions({
  inheritAttrs: false
})

interface Props {
  data: Record<string, any>
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const config = computed(() => props.data || {})
const showTotal = computed(() => config.value.show_total !== false)
</script>

<template>
  <div class="lcms-mini-cart">
    <span class="lcms-mini-cart__icon">&#128722;</span>
    <span class="lcms-mini-cart__count">0</span>
    <span v-if="showTotal" class="lcms-mini-cart__total">0.00</span>
  </div>
</template>
