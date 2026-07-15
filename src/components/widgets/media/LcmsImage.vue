<script setup lang="ts">
/**
 * Image Widget
 *
 * Renders a single image, optionally clickable into a fullscreen lightbox.
 */

import { computed, ref, onUnmounted, watch, Teleport } from 'vue'
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
  const base = imageStylePresets[style] || {}
  return lightboxEnabled.value ? { ...base, cursor: 'zoom-in' } : base
})

// Lightbox — same behavior as the gallery widget, single image
const lightboxEnabled = computed(() =>
  config.value.enable_lightbox === true || config.value.enableLightbox === true
)
const lightboxOpen = ref(false)

function openLightbox() {
  if (!lightboxEnabled.value) return
  lightboxOpen.value = true
}

function closeLightbox() {
  lightboxOpen.value = false
}

function onLightboxKeydown(e: KeyboardEvent) {
  if (lightboxOpen.value && e.key === 'Escape') closeLightbox()
}

watch(lightboxOpen, (open) => {
  if (typeof document === 'undefined') return
  document.body.style.overflow = open ? 'hidden' : ''
  if (open) document.addEventListener('keydown', onLightboxKeydown)
  else document.removeEventListener('keydown', onLightboxKeydown)
})

onUnmounted(() => {
  if (typeof document === 'undefined') return
  document.removeEventListener('keydown', onLightboxKeydown)
  document.body.style.overflow = ''
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
      @click="openLightbox"
    >
    <div
      v-else
      class="lcms-image__placeholder"
    >
      <i class="fa-solid fa-image" />
    </div>

    <!-- Lightbox Overlay -->
    <Teleport to="body">
      <Transition name="lcms-lightbox">
        <div
          v-if="lightboxOpen && imageUrl"
          class="lcms-lightbox__backdrop"
          @click.self="closeLightbox"
        >
          <button
            class="lcms-lightbox__close"
            type="button"
            @click="closeLightbox"
          >
            <i class="fa-solid fa-xmark" />
          </button>
          <div class="lcms-lightbox__image-wrapper">
            <img
              :src="imageUrl"
              :alt="altText"
              class="lcms-lightbox__image"
              decoding="async"
            >
            <div
              v-if="altText"
              class="lcms-lightbox__caption"
            >
              {{ altText }}
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
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

/* Lightbox — mirrors LcmsGallery */
.lcms-lightbox__backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,0.9);
  z-index: 9999; display: flex; align-items: center; justify-content: center;
}
.lcms-lightbox__image-wrapper { max-width: 90vw; max-height: 85vh; }
.lcms-lightbox__image { max-width: 100%; max-height: 85vh; object-fit: contain; border-radius: 4px; }
.lcms-lightbox__close {
  position: absolute; top: 16px; right: 16px; background: none; border: none;
  color: #fff; font-size: 24px; cursor: pointer; z-index: 10;
}
.lcms-lightbox__caption {
  margin-top: 12px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  text-align: center;
  max-width: 80vw;
}
.lcms-lightbox-enter-active, .lcms-lightbox-leave-active { transition: opacity 200ms; }
.lcms-lightbox-enter-from, .lcms-lightbox-leave-to { opacity: 0; }
</style>
