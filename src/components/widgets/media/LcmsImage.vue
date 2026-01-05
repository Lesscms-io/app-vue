<script setup lang="ts">
/**
 * Image Widget
 *
 * Renders a single image.
 */

import { computed } from 'vue'
import { useLanguage } from '@/composables/useLanguage'
import type { ImageWidgetData } from '@/types/widgets'

defineOptions({
  inheritAttrs: false
})

interface Props {
  data: ImageWidgetData
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const { extractValue } = useLanguage(props.language)

const imageUrl = computed(() => props.data.image || '')
const altText = computed(() => props.data.alt ? extractValue(props.data.alt) : '')
</script>

<template>
  <figure class="lcms-image">
    <img
      v-if="imageUrl"
      :src="imageUrl"
      :alt="altText"
      class="lcms-image__img"
    >
    <div
      v-else
      class="lcms-image__placeholder"
    >
      <i class="fa-solid fa-image" />
    </div>
  </figure>
</template>
