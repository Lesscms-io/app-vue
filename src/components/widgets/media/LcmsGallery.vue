<script setup lang="ts">
/**
 * Gallery Widget
 *
 * Renders an image gallery in grid or carousel mode.
 * Supports multiple carousel styles: default, coverflow, fade.
 * Optional lightbox overlay for fullscreen image viewing.
 */

import { computed, ref, onMounted, onUnmounted, Teleport, watch } from 'vue'
import type { GalleryWidgetData, GalleryImage } from '@/types/widgets'

defineOptions({
  inheritAttrs: false
})

interface Props {
  data: GalleryWidgetData
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

// API returns widget data in data.widget (snake_case from API)
const config = computed(() => props.data.widget || props.data || {})

const images = computed(() => {
  const imgs = config.value.images || props.data.images || []
  return imgs.map((img: any) => {
    if (typeof img === 'string') {
      return { url: img, alt: '' }
    }
    return img as GalleryImage
  })
})

// Gallery settings - handle both snake_case (API) and camelCase
const galleryType = computed(() => config.value.type || props.data.type || 'grid')
const columns = computed(() => config.value.columns || props.data.columns || 3)
const gap = computed(() => {
  const v = config.value.gap ?? props.data.gap
  if (v === 0 || v === '0') return 0
  return parseInt(String(v)) || 8
})
const aspect = computed(() => config.value.aspect || props.data.aspect || 'square')
const carouselStyle = computed(() => config.value.carousel_style || config.value.carouselStyle || 'default')

// Carousel settings - support both snake_case and camelCase
const autoplay = computed(() => {
  if (config.value.autoplay !== undefined) return config.value.autoplay
  if (props.data.autoplay !== undefined) return props.data.autoplay
  return true
})
const interval = computed(() => config.value.interval || props.data.interval || 3000)
const showArrows = computed(() => {
  // API sends show_arrows (snake_case)
  if (config.value.show_arrows !== undefined) return config.value.show_arrows
  if (config.value.showArrows !== undefined) return config.value.showArrows
  if (props.data.showArrows !== undefined) return props.data.showArrows
  return true
})
const showDots = computed(() => {
  // API sends show_dots (snake_case)
  if (config.value.show_dots !== undefined) return config.value.show_dots
  if (config.value.showDots !== undefined) return config.value.showDots
  if (props.data.showDots !== undefined) return props.data.showDots
  return true
})

// Lightbox setting - support both snake_case and camelCase
const enableLightbox = computed(() =>
  config.value.enable_lightbox || config.value.enableLightbox || props.data.enable_lightbox
)

// Dynamic content source settings (for future dynamic mode)
const contentSource = computed(() => config.value.content_source || 'static')
const collectionCode = computed(() => config.value.collection_code || null)
const fieldCode = computed(() => config.value.field_code || null)
const entryId = computed(() => config.value.entry_id || null)

// Mosaic settings
const mosaicVariant = computed(() => config.value.mosaic_variant || config.value.mosaicVariant || 'featured')
const loopCarousel = computed(() => config.value.loop !== false)

// Carousel state
const currentSlide = ref(0)

// Grid styles
const gridStyle = computed(() => ({
  display: 'grid',
  gridTemplateColumns: `repeat(${columns.value}, 1fr)`,
  gap: `${gap.value}px`,
}))

// Aspect ratio class
const aspectClass = computed(() => `lcms-gallery__item--${aspect.value}`)

// Carousel navigation
function nextSlide() {
  currentSlide.value = (currentSlide.value + 1) % images.value.length
}

function prevSlide() {
  currentSlide.value = (currentSlide.value - 1 + images.value.length) % images.value.length
}

function goToSlide(index: number) {
  currentSlide.value = index
}

// Coverflow: get slide offset for 3D effect
function getSlideOffset(index: number): number {
  const diff = index - currentSlide.value
  const total = images.value.length
  // Handle wrap-around
  if (diff > total / 2) return diff - total
  if (diff < -total / 2) return diff + total
  return diff
}

// Auto-advance carousel
let autoplayTimer: ReturnType<typeof setInterval> | null = null

function startAutoplay() {
  stopAutoplay()
  if (autoplay.value && galleryType.value === 'carousel' && images.value.length > 1) {
    autoplayTimer = setInterval(nextSlide, interval.value)
  }
}

function stopAutoplay() {
  if (autoplayTimer) {
    clearInterval(autoplayTimer)
    autoplayTimer = null
  }
}

// --- Lightbox ---
const lightboxOpen = ref(false)
const lightboxIndex = ref(0)

function openLightbox(index: number) {
  if (!enableLightbox.value) return
  lightboxIndex.value = index
  lightboxOpen.value = true
}

function closeLightbox() {
  lightboxOpen.value = false
}

function lightboxNext() {
  lightboxIndex.value = (lightboxIndex.value + 1) % images.value.length
}

function lightboxPrev() {
  lightboxIndex.value = (lightboxIndex.value - 1 + images.value.length) % images.value.length
}

function onLightboxKeydown(e: KeyboardEvent) {
  if (!lightboxOpen.value) return
  if (e.key === 'Escape') {
    closeLightbox()
  } else if (e.key === 'ArrowRight') {
    lightboxNext()
  } else if (e.key === 'ArrowLeft') {
    lightboxPrev()
  }
}

// Touch swipe support
let touchStartX = 0
let touchEndX = 0
const SWIPE_THRESHOLD = 50

function onTouchStart(e: TouchEvent) {
  touchStartX = e.changedTouches[0].screenX
}

function onTouchEnd(e: TouchEvent) {
  touchEndX = e.changedTouches[0].screenX
  const diff = touchStartX - touchEndX
  if (Math.abs(diff) >= SWIPE_THRESHOLD) {
    if (diff > 0) {
      lightboxNext()
    } else {
      lightboxPrev()
    }
  }
}

function onBackdropClick(e: MouseEvent) {
  // Only close if clicking the backdrop itself, not the image or controls
  if ((e.target as HTMLElement).classList.contains('lcms-lightbox__backdrop')) {
    closeLightbox()
  }
}

// Lock body scroll when lightbox is open
watch(lightboxOpen, (open) => {
  if (open) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})

onMounted(() => {
  startAutoplay()
  document.addEventListener('keydown', onLightboxKeydown)
})

onUnmounted(() => {
  stopAutoplay()
  document.removeEventListener('keydown', onLightboxKeydown)
  // Ensure body scroll is restored
  document.body.style.overflow = ''
})

const lightboxImage = computed(() => images.value[lightboxIndex.value])
</script>

<template>
  <div
    class="lcms-gallery"
    :class="[
      `lcms-gallery--${galleryType}`,
      galleryType === 'carousel' ? `lcms-gallery--${carouselStyle}` : '',
      galleryType === 'mosaic' ? `lcms-gallery--mosaic-${mosaicVariant}` : ''
    ]"
  >
    <!-- Grid Mode -->
    <div
      v-if="galleryType === 'grid'"
      class="lcms-gallery__grid"
      :style="gridStyle"
    >
      <div
        v-for="(image, index) in images"
        :key="index"
        class="lcms-gallery__item"
        :class="aspectClass"
        :style="enableLightbox ? { cursor: 'pointer' } : undefined"
        @click="openLightbox(index)"
      >
        <img
          :src="image.url"
          :alt="image.alt || ''"
          class="lcms-gallery__img"
        >
      </div>
    </div>

    <!-- Mosaic Mode - Featured (first image spans 2 rows) -->
    <div
      v-else-if="galleryType === 'mosaic' && mosaicVariant === 'featured'"
      class="lcms-gallery__mosaic lcms-gallery__mosaic--featured"
      :style="{ gap: `${gap}px` }"
    >
      <div
        v-for="(image, index) in images"
        :key="index"
        class="lcms-gallery__mosaic-item"
        :class="{ 'lcms-gallery__mosaic-item--large': index === 0 }"
        :style="enableLightbox ? { cursor: 'pointer' } : undefined"
        @click="openLightbox(index)"
      >
        <img :src="image.url" :alt="image.alt || ''" class="lcms-gallery__img">
      </div>
    </div>

    <!-- Mosaic Mode - Alternating (every 3rd item spans 2 columns) -->
    <div
      v-else-if="galleryType === 'mosaic' && mosaicVariant === 'alternating'"
      class="lcms-gallery__mosaic lcms-gallery__mosaic--alternating"
      :style="{ gap: `${gap}px` }"
    >
      <div
        v-for="(image, index) in images"
        :key="index"
        class="lcms-gallery__mosaic-item"
        :class="{ 'lcms-gallery__mosaic-item--wide': index % 3 === 0 }"
        :style="enableLightbox ? { cursor: 'pointer' } : undefined"
        @click="openLightbox(index)"
      >
        <img :src="image.url" :alt="image.alt || ''" class="lcms-gallery__img">
      </div>
    </div>

    <!-- Mosaic Mode - Masonry (CSS columns) -->
    <div
      v-else-if="galleryType === 'mosaic' && mosaicVariant === 'masonry'"
      class="lcms-gallery__mosaic lcms-gallery__mosaic--masonry"
      :style="{ columnCount: columns, columnGap: `${gap}px` }"
    >
      <div
        v-for="(image, index) in images"
        :key="index"
        class="lcms-gallery__masonry-item"
        :style="{ marginBottom: `${gap}px`, cursor: enableLightbox ? 'pointer' : undefined }"
        @click="openLightbox(index)"
      >
        <img :src="image.url" :alt="image.alt || ''" class="lcms-gallery__img">
      </div>
    </div>

    <!-- Mosaic Mode - Collage (overlapping cards) -->
    <div
      v-else-if="galleryType === 'mosaic' && mosaicVariant === 'collage'"
      class="lcms-gallery__mosaic lcms-gallery__mosaic--collage"
    >
      <div
        v-if="images.length > 0"
        class="lcms-gallery__collage-main"
        :style="enableLightbox ? { cursor: 'pointer' } : undefined"
        @click="openLightbox(0)"
      >
        <img :src="images[0].url" :alt="images[0].alt || ''" class="lcms-gallery__img">
      </div>
      <div
        v-for="(image, index) in images.slice(1, 5)"
        :key="index + 1"
        class="lcms-gallery__collage-overlay"
        :class="`lcms-gallery__collage-overlay--pos-${index}`"
        :style="enableLightbox ? { cursor: 'pointer' } : undefined"
        @click="openLightbox(index + 1)"
      >
        <img :src="image.url" :alt="image.alt || ''" class="lcms-gallery__img">
      </div>
    </div>

    <!-- Carousel Mode - Default/Fade -->
    <div
      v-else-if="galleryType === 'carousel' && carouselStyle !== 'coverflow'"
      class="lcms-gallery__carousel"
      @mouseenter="stopAutoplay"
      @mouseleave="startAutoplay"
    >
      <div class="lcms-gallery__track">
        <div
          v-for="(image, index) in images"
          :key="index"
          class="lcms-gallery__slide"
          :class="{ 'lcms-gallery__slide--active': index === currentSlide }"
          :style="enableLightbox ? { cursor: 'pointer' } : undefined"
          @click="openLightbox(index)"
        >
          <img
            :src="image.url"
            :alt="image.alt || ''"
            class="lcms-gallery__img"
          >
        </div>
      </div>

      <button
        v-if="showArrows && images.length > 1"
        class="lcms-gallery__arrow lcms-gallery__arrow--prev"
        @click="prevSlide"
        type="button"
      >
        <i class="fa-solid fa-chevron-left" />
      </button>

      <button
        v-if="showArrows && images.length > 1"
        class="lcms-gallery__arrow lcms-gallery__arrow--next"
        @click="nextSlide"
        type="button"
      >
        <i class="fa-solid fa-chevron-right" />
      </button>

      <div
        v-if="showDots && images.length > 1"
        class="lcms-gallery__dots"
      >
        <button
          v-for="(_, index) in images"
          :key="index"
          class="lcms-gallery__dot"
          :class="{ 'lcms-gallery__dot--active': index === currentSlide }"
          @click="goToSlide(index)"
          type="button"
        />
      </div>
    </div>

    <!-- Carousel Mode - Coverflow -->
    <div
      v-else-if="galleryType === 'carousel'"
      class="lcms-gallery__coverflow"
      @mouseenter="stopAutoplay"
      @mouseleave="startAutoplay"
    >
      <div class="lcms-gallery__coverflow-track">
        <div
          v-for="(image, index) in images"
          :key="index"
          class="lcms-gallery__coverflow-slide"
          :class="{
            'lcms-gallery__coverflow-slide--active': getSlideOffset(index) === 0,
            'lcms-gallery__coverflow-slide--prev': getSlideOffset(index) === -1,
            'lcms-gallery__coverflow-slide--prev-2': getSlideOffset(index) === -2,
            'lcms-gallery__coverflow-slide--next': getSlideOffset(index) === 1,
            'lcms-gallery__coverflow-slide--next-2': getSlideOffset(index) === 2,
            'lcms-gallery__coverflow-slide--hidden': Math.abs(getSlideOffset(index)) > 2
          }"
          :style="{
            zIndex: 10 - Math.abs(getSlideOffset(index))
          }"
          @click="enableLightbox && getSlideOffset(index) === 0 ? openLightbox(index) : goToSlide(index)"
        >
          <img
            :src="image.url"
            :alt="image.alt || ''"
            class="lcms-gallery__img"
          >
        </div>
      </div>

      <button
        v-if="showArrows && images.length > 1"
        class="lcms-gallery__arrow lcms-gallery__arrow--prev"
        @click="prevSlide"
        type="button"
      >
        <i class="fa-solid fa-chevron-left" />
      </button>

      <button
        v-if="showArrows && images.length > 1"
        class="lcms-gallery__arrow lcms-gallery__arrow--next"
        @click="nextSlide"
        type="button"
      >
        <i class="fa-solid fa-chevron-right" />
      </button>

      <div
        v-if="showDots && images.length > 1"
        class="lcms-gallery__dots"
      >
        <button
          v-for="(_, index) in images"
          :key="index"
          class="lcms-gallery__dot"
          :class="{ 'lcms-gallery__dot--active': index === currentSlide }"
          @click="goToSlide(index)"
          type="button"
        />
      </div>
    </div>

    <!-- Lightbox Overlay -->
    <Teleport to="body">
      <Transition name="lcms-lightbox">
        <div
          v-if="lightboxOpen && lightboxImage"
          class="lcms-lightbox__backdrop"
          @click="onBackdropClick"
          @touchstart="onTouchStart"
          @touchend="onTouchEnd"
        >
          <!-- Close button -->
          <button
            class="lcms-lightbox__close"
            type="button"
            @click="closeLightbox"
          >
            <i class="fa-solid fa-xmark" />
          </button>

          <!-- Image counter -->
          <div class="lcms-lightbox__counter">
            {{ lightboxIndex + 1 }} / {{ images.length }}
          </div>

          <!-- Previous arrow -->
          <button
            v-if="images.length > 1"
            class="lcms-lightbox__arrow lcms-lightbox__arrow--prev"
            type="button"
            @click.stop="lightboxPrev"
          >
            <i class="fa-solid fa-chevron-left" />
          </button>

          <!-- Current image -->
          <div class="lcms-lightbox__image-wrapper">
            <img
              :src="lightboxImage.url"
              :alt="lightboxImage.alt || ''"
              class="lcms-lightbox__image"
              @click.stop
            >
          </div>

          <!-- Next arrow -->
          <button
            v-if="images.length > 1"
            class="lcms-lightbox__arrow lcms-lightbox__arrow--next"
            type="button"
            @click.stop="lightboxNext"
          >
            <i class="fa-solid fa-chevron-right" />
          </button>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style>
/* Grid */
.lcms-gallery__item { overflow: hidden; border-radius: 8px; }
.lcms-gallery__item--square { aspect-ratio: 1; }
.lcms-gallery__item--landscape { aspect-ratio: 16/9; }
.lcms-gallery__item--portrait { aspect-ratio: 3/4; }
.lcms-gallery__item--auto { }
.lcms-gallery__img { width: 100%; height: 100%; object-fit: cover; display: block; }

/* Mosaic - Featured */
.lcms-gallery__mosaic--featured {
  display: grid;
  grid-template-columns: 2fr 1fr;
  grid-auto-rows: 1fr;
}
.lcms-gallery__mosaic-item { overflow: hidden; border-radius: 8px; }
.lcms-gallery__mosaic-item--large { grid-row: span 2; }
.lcms-gallery__mosaic-item img { width: 100%; height: 100%; object-fit: cover; }

/* Mosaic - Collage */
.lcms-gallery__mosaic--collage {
  position: relative;
  padding: 40px 60px 60px 40px;
}
.lcms-gallery__collage-main {
  width: 80%;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
}
.lcms-gallery__collage-main img { width: 100%; display: block; object-fit: cover; }
.lcms-gallery__collage-overlay {
  position: absolute;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 30px rgba(0,0,0,0.15);
  border: 3px solid #fff;
}
.lcms-gallery__collage-overlay img { width: 100%; height: 100%; object-fit: cover; display: block; }
.lcms-gallery__collage-overlay--pos-0 { width: 30%; bottom: 10px; right: 10px; }
.lcms-gallery__collage-overlay--pos-1 { width: 25%; top: 0; right: 0; }
.lcms-gallery__collage-overlay--pos-2 { width: 25%; bottom: 10px; left: 0; }
.lcms-gallery__collage-overlay--pos-3 { width: 22%; top: 0; left: 10%; }

/* Mosaic - Alternating */
.lcms-gallery__mosaic--alternating {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-auto-rows: 200px;
}
.lcms-gallery__mosaic-item--wide { grid-column: span 2; }
.lcms-gallery__mosaic--alternating .lcms-gallery__mosaic-item { overflow: hidden; border-radius: 8px; }
.lcms-gallery__mosaic--alternating .lcms-gallery__mosaic-item img { width: 100%; height: 100%; object-fit: cover; }

/* Mosaic - Masonry */
.lcms-gallery__mosaic--masonry { }
.lcms-gallery__masonry-item { break-inside: avoid; overflow: hidden; border-radius: 8px; }
.lcms-gallery__masonry-item img { width: 100%; height: auto; display: block; }

/* Carousel */
.lcms-gallery__carousel { position: relative; overflow: hidden; }
.lcms-gallery__track { position: relative; width: 100%; }
.lcms-gallery__slide { display: none; }
.lcms-gallery__slide--active { display: block; }
.lcms-gallery__slide img { width: 100%; display: block; border-radius: 8px; }

/* Carousel Arrows */
.lcms-gallery__arrow {
  position: absolute; top: 50%; transform: translateY(-50%);
  background: rgba(255,255,255,0.9); border: none; border-radius: 50%;
  width: 40px; height: 40px; cursor: pointer; z-index: 2;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  transition: background 200ms;
}
.lcms-gallery__arrow:hover { background: #fff; }
.lcms-gallery__arrow--prev { left: 12px; }
.lcms-gallery__arrow--next { right: 12px; }

/* Carousel Dots */
.lcms-gallery__dots { display: flex; justify-content: center; gap: 8px; padding: 12px 0; }
.lcms-gallery__dot {
  width: 10px; height: 10px; border-radius: 50%; border: none;
  background: #ccc; cursor: pointer; transition: background 200ms;
}
.lcms-gallery__dot--active { background: #333; }

/* Coverflow */
.lcms-gallery__coverflow { position: relative; overflow: hidden; perspective: 1200px; padding: 40px 0; }
.lcms-gallery__coverflow-track { display: flex; align-items: center; justify-content: center; position: relative; min-height: 300px; }
.lcms-gallery__coverflow-slide {
  position: absolute; width: 60%; max-width: 500px;
  transition: all 500ms ease; border-radius: 12px; overflow: hidden;
  box-shadow: 0 8px 30px rgba(0,0,0,0.2);
}
.lcms-gallery__coverflow-slide img { width: 100%; display: block; }
.lcms-gallery__coverflow-slide--active { transform: translateX(0) scale(1); opacity: 1; z-index: 5; }
.lcms-gallery__coverflow-slide--prev { transform: translateX(-70%) scale(0.8) rotateY(15deg); opacity: 0.7; }
.lcms-gallery__coverflow-slide--next { transform: translateX(70%) scale(0.8) rotateY(-15deg); opacity: 0.7; }
.lcms-gallery__coverflow-slide--prev-2 { transform: translateX(-120%) scale(0.6) rotateY(25deg); opacity: 0.4; }
.lcms-gallery__coverflow-slide--next-2 { transform: translateX(120%) scale(0.6) rotateY(-25deg); opacity: 0.4; }
.lcms-gallery__coverflow-slide--hidden { opacity: 0; pointer-events: none; }

/* Lightbox */
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
.lcms-lightbox__counter {
  position: absolute; top: 16px; left: 50%; transform: translateX(-50%);
  color: #fff; font-size: 14px;
}
.lcms-lightbox__arrow {
  position: absolute; top: 50%; transform: translateY(-50%);
  background: rgba(255,255,255,0.15); border: none; border-radius: 50%;
  width: 48px; height: 48px; color: #fff; cursor: pointer; z-index: 10;
  display: flex; align-items: center; justify-content: center; font-size: 18px;
  transition: background 200ms;
}
.lcms-lightbox__arrow:hover { background: rgba(255,255,255,0.3); }
.lcms-lightbox__arrow--prev { left: 16px; }
.lcms-lightbox__arrow--next { right: 16px; }
.lcms-lightbox-enter-active, .lcms-lightbox-leave-active { transition: opacity 200ms; }
.lcms-lightbox-enter-from, .lcms-lightbox-leave-to { opacity: 0; }
</style>
