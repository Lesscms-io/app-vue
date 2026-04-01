<script setup lang="ts">
/**
 * Account Icon Widget (E-commerce)
 *
 * Displays a user account icon with optional name.
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
const showName = computed(() => config.value.show_name === true)
</script>

<template>
  <div class="lcms-account-icon">
    <span class="lcms-account-icon__icon">&#128100;</span>
    <span v-if="showName" class="lcms-account-icon__name">Account</span>
  </div>
</template>
