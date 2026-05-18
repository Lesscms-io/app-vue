<script setup lang="ts">
/**
 * Image Widget
 *
 * Renders a single image.
 */

import { computed } from 'vue'
import { useLanguage } from '@/composables/useLanguage'
import { contentImage } from '@/composables/useImageOptimization'
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

const config = computed(() => props.data.widget || props.data || {})

const imageSource = computed(() => config.value.image_source || 'static')
const imageUrl = computed(() => config.value.image || props.data.url || '')
const altText = computed(() => props.data.alt ? extractValue(props.data.alt) : '')

const optimized = computed(() => contentImage(imageUrl.value))

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
  const style = config.value.image_style || 'none'
  return imageStylePresets[style] || {}
})
</script>

<template>
  <figure class="lcms-image">
    <img
      v-if="imageUrl"
      :src="optimized.src"
      :srcset="optimized.srcset"
      :sizes="optimized.sizes"
      :alt="altText"
      loading="lazy"
      decoding="async"
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

<style scoped>
/* Bez `margin: 1em 40px` (browser default na <figure>) — w editorze (ImageWidget.vue)
 * obrazek wypełnia kolumnę 100%, a tu w prod miał browserowy margin i wyglądał
 * mniejszy + odsunięty od krawędzi. Dopasowane do .image-widget / .widget-image
 * z editora. */
.lcms-image {
  margin: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.lcms-image__img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.lcms-image__placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: var(--lcms-color-background-alt, #f8f9fa);
  color: var(--lcms-color-muted, #adb5bd);
  font-size: 32px;
}
</style>
