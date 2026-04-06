<script setup lang="ts">
/**
 * Category Header Widget (E-commerce)
 *
 * Category page header. Stub implementation — LessCommerce API integration pending.
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
const showBreadcrumbs = computed(() => config.value.show_breadcrumbs !== false)
</script>

<template>
  <div class="lcms-category-header">
    <nav v-if="showBreadcrumbs" class="lcms-category-header__breadcrumbs">
      Home / Categories
    </nav>
    <h1 class="lcms-category-header__name">Category Name</h1>
  </div>
</template>
