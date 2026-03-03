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

// Dynamic content source settings
const imageSource = computed(() => props.data.image_source || 'static')
const collectionCode = computed(() => props.data.collection_code || null)
const fieldCode = computed(() => props.data.field_code || null)
const entryId = computed(() => props.data.entry_id || null)
const imageUrlFromApi = computed(() => props.data.url || null)

const imageUrl = computed(() => props.data.image || imageUrlFromApi.value || '')
const altText = computed(() => props.data.alt ? extractValue(props.data.alt) : '')

const imageStylePresets: Record<string, Record<string, string>> = {
  'none': {},
  'rounded': { borderRadius: '12px' },
  'rounded-lg': { borderRadius: '24px' },
  'circle': { borderRadius: '50%' },
  'shadow-sm': { boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
  'shadow-lg': { boxShadow: '0 8px 24px rgba(0,0,0,0.2)' },
  'rounded-shadow': { borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' },
  'border': { border: '2px solid #e0e0e0' },
  'border-rounded': { border: '2px solid #e0e0e0', borderRadius: '12px' }
}

const imageStyle = computed(() => {
  const style = props.data.image_style || 'none'
  return imageStylePresets[style] || {}
})
</script>

<template>
  <figure class="lcms-image">
    <img
      v-if="imageUrl"
      :src="imageUrl"
      :alt="altText"
      class="lcms-image__img"
      :style="imageStyle"
    >
    <div
      v-else
      class="lcms-image__placeholder"
    >
      <i class="fa-solid fa-image" />
    </div>
  </figure>
</template>
