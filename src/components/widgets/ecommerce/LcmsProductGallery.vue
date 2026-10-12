<script setup lang="ts">
/**
 * Product Gallery Widget (E-commerce)
 *
 * Displays product images with main view + thumbnails.
 * Auto-detects image source from template's main_image_attribute_code.
 * Clicking the main image opens a fullscreen lightbox (unless disabled).
 */

import { computed, ref, inject, type Ref } from 'vue'
import { getProductFieldRaw } from '../../../utils/productField'
import { openLightbox as showLightbox, type LightboxItem } from '../../../composables/useLightbox'

defineOptions({ inheritAttrs: false })

interface Props {
  data: Record<string, any>
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const product = inject<Ref<any> | null>('lcms-product', null)
const config = computed(() => props.data?.config || props.data || {})

const selectedIdx = ref(0)

const allImages = computed(() => {
  const p = product?.value
  if (!p) return []

  // Try field mapping first
  const fieldImage = config.value.field_image
  const fieldImages = config.value.field_images

  if (fieldImages) {
    const val = getProductFieldRaw(p, fieldImages)
    if (Array.isArray(val) && val.length > 0) return val
  }

  if (fieldImage) {
    const val = getProductFieldRaw(p, fieldImage)
    if (Array.isArray(val)) return val
    if (typeof val === 'string') return [val]
  }

  // Auto-detect from template
  const imgCode = p.template?.main_image_attribute_code
  if (imgCode && p.attributes?.[imgCode]) {
    const attrVal = p.attributes[imgCode]
    if (Array.isArray(attrVal)) return attrVal
    if (typeof attrVal === 'string') return [attrVal]
  }

  // Fallback to core fields
  const imgs = [...(p.images || [])]
  if (p.image && !imgs.includes(p.image)) imgs.unshift(p.image)
  return imgs
})

const mainImage = computed(() => allImages.value[selectedIdx.value] || null)
const hasMultiple = computed(() => allImages.value.length > 1)

const productName = computed(() => product?.value?.name || '')

// --- Zoom / lightbox setting (default on, snake_case + camelCase) ---
const enableZoom = computed(() => {
  const c = config.value
  const val = c.enable_zoom ?? c.enableZoom ?? props.data?.enable_zoom
  return val === undefined || val === null ? true : !!val
})

const galleryStyle = computed(() => {
  const radius = config.value.border_radius
  const thumb = config.value.thumb_size
  const style: Record<string, string> = {}
  if (radius !== undefined && radius !== null && radius !== '') {
    style['--lcms-pg-radius'] = `${radius}px`
  }
  if (thumb !== undefined && thumb !== null && thumb !== '') {
    style['--lcms-pg-thumb'] = `${thumb}px`
  }
  return style
})

// --- Lightbox: shared global viewer (components/LcmsLightbox.vue) ---
function openLightbox(index: number) {
  if (!enableZoom.value || !allImages.value[index]) return
  const items: LightboxItem[] = allImages.value.map((img: any) => ({
    src: typeof img === 'string' ? img : (img?.url || ''),
    alt: productName.value
  }))
  showLightbox(items, index, { zoom: true })
  selectedIdx.value = index
}
</script>

<template>
  <div
    v-if="allImages.length > 0"
    class="lcms-product-gallery"
    :style="galleryStyle"
  >
    <div
      class="lcms-product-gallery__main"
      :class="{ 'lcms-product-gallery__main--zoomable': enableZoom }"
      @click="openLightbox(selectedIdx)"
    >
      <img
        v-if="mainImage"
        :src="mainImage"
        :alt="productName"
        class="lcms-product-gallery__main-img"
      >
      <button
        v-if="enableZoom && mainImage"
        type="button"
        class="lcms-product-gallery__zoom"
        :aria-label="'Zoom'"
        @click.stop="openLightbox(selectedIdx)"
      >
        <i class="fa-solid fa-magnifying-glass-plus" />
      </button>
    </div>
    <div
      v-if="hasMultiple"
      class="lcms-product-gallery__thumbs"
    >
      <button
        v-for="(img, idx) in allImages"
        :key="img"
        type="button"
        class="lcms-product-gallery__thumb"
        :class="{ 'lcms-product-gallery__thumb--active': idx === selectedIdx }"
        @click="selectedIdx = idx"
      >
        <img
          :src="img"
          :alt="`Image ${idx + 1}`"
        >
      </button>
    </div>

  </div>
</template>

<style scoped>
.lcms-product-gallery__main {
  position: relative;
  aspect-ratio: 1 / 1;
  border-radius: var(--lcms-pg-radius, var(--lcms-border-radius, 0.5rem));
  overflow: hidden;
}

.lcms-product-gallery__main--zoomable {
  cursor: zoom-in;
}

.lcms-product-gallery__main-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.lcms-product-gallery__zoom {
  position: absolute;
  right: 12px;
  bottom: 12px;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
  font-size: 16px;
  cursor: zoom-in;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.15s, background 0.15s;
}

.lcms-product-gallery__main:hover .lcms-product-gallery__zoom {
  opacity: 1;
}

.lcms-product-gallery__zoom:hover {
  background: rgba(0, 0, 0, 0.7);
}

@media (hover: none) {
  .lcms-product-gallery__zoom {
    opacity: 1;
  }
}

.lcms-product-gallery__thumbs {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(var(--lcms-pg-thumb, 70px), 1fr));
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.lcms-product-gallery__thumb {
  aspect-ratio: 1 / 1;
  border: 2px solid var(--lcms-color-border, #e5e7eb);
  border-radius: 0.375rem;
  overflow: hidden;
  cursor: pointer;
  padding: 0;
  transition: border-color 0.15s;
}

.lcms-product-gallery__thumb:hover,
.lcms-product-gallery__thumb--active {
  border-color: var(--lcms-color-primary, #3b82f6);
}

.lcms-product-gallery__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
