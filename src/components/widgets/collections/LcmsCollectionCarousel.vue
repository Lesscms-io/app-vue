<script setup lang="ts">
/**
 * Collection Carousel Widget
 *
 * Renders collection entries in a coverflow-style carousel.
 * Center slide is larger, side slides are smaller with perspective effect.
 */

import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useCollection } from '@/composables/useCollection'
import { useLanguage } from '@/composables/useLanguage'
import type { CollectionCarouselWidgetData } from '@/types/widgets'
import type { CollectionEntry } from '@/api/types'

defineOptions({
  inheritAttrs: false
})

interface Props {
  data: CollectionCarouselWidgetData
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const { language: currentLanguage } = useLanguage(props.language)

const collectionCode = computed(() => props.data.collection_code || '')
const postsCount = computed(() => props.data.posts_count || 10)
const autoplay = computed(() => props.data.autoplay !== false)
const autoplayInterval = computed(() => props.data.autoplay_interval || 5000)
const showArrows = computed(() => props.data.show_arrows !== false)
const showDots = computed(() => props.data.show_dots !== false)

// Field mappings
const imageField = computed(() => props.data.image_field || '')

const { entries, loading, error } = useCollection(collectionCode, {
  pageSize: postsCount.value,
})

// Carousel state - currentSlide is the CENTER slide index
const currentSlide = ref(0)
let autoplayTimer: ReturnType<typeof setInterval> | null = null

const totalSlides = computed(() => entries.value.length)

function nextSlide() {
  if (totalSlides.value <= 1) return
  currentSlide.value = (currentSlide.value + 1) % totalSlides.value
}

function prevSlide() {
  if (totalSlides.value <= 1) return
  currentSlide.value = (currentSlide.value - 1 + totalSlides.value) % totalSlides.value
}

function goToSlide(index: number) {
  currentSlide.value = index
}

// Get offset from center for coverflow effect
function getSlideOffset(index: number): number {
  const diff = index - currentSlide.value
  const total = totalSlides.value
  // Handle wrap-around for infinite carousel feel
  if (diff > total / 2) return diff - total
  if (diff < -total / 2) return diff + total
  return diff
}

function startAutoplay() {
  stopAutoplay()
  if (autoplay.value && totalSlides.value > 1) {
    autoplayTimer = setInterval(nextSlide, autoplayInterval.value)
  }
}

function stopAutoplay() {
  if (autoplayTimer) {
    clearInterval(autoplayTimer)
    autoplayTimer = null
  }
}

// Helper functions
function getFieldValue(entry: CollectionEntry, fieldCode: string): any {
  if (!fieldCode || !entry.content) return null
  const value = entry.content[fieldCode]
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value[currentLanguage.value] || value.pl || Object.values(value)[0]
  }
  return value
}

function getImage(entry: CollectionEntry): string {
  const image = getFieldValue(entry, imageField.value)
  if (!image) return ''
  if (typeof image === 'object' && image.url) return image.url
  return image
}

function getUrl(entry: CollectionEntry): string {
  return entry.metadata?.url || '#'
}

onMounted(() => {
  startAutoplay()
})

onUnmounted(() => {
  stopAutoplay()
})
</script>

<template>
  <div
    class="lcms-collection-carousel"
    @mouseenter="stopAutoplay"
    @mouseleave="startAutoplay"
  >
    <div
      v-if="loading"
      class="lcms-collection-carousel__loading"
    >
      <i class="fa-solid fa-spinner fa-spin" />
    </div>

    <div
      v-else-if="error"
      class="lcms-collection-carousel__error"
    >
      Failed to load collection
    </div>

    <template v-else-if="entries.length > 0">
      <div class="lcms-collection-carousel__viewport">
        <div class="lcms-collection-carousel__track">
          <a
            v-for="(entry, index) in entries"
            :key="entry.metadata?.code || index"
            :href="getUrl(entry)"
            class="lcms-collection-carousel__slide"
            :class="{
              'lcms-collection-carousel__slide--active': getSlideOffset(index) === 0,
              'lcms-collection-carousel__slide--prev': getSlideOffset(index) === -1,
              'lcms-collection-carousel__slide--prev-2': getSlideOffset(index) === -2,
              'lcms-collection-carousel__slide--next': getSlideOffset(index) === 1,
              'lcms-collection-carousel__slide--next-2': getSlideOffset(index) === 2,
              'lcms-collection-carousel__slide--hidden': Math.abs(getSlideOffset(index)) > 2
            }"
            :style="{
              '--slide-offset': getSlideOffset(index),
              zIndex: 10 - Math.abs(getSlideOffset(index))
            }"
            @click.prevent="goToSlide(index)"
          >
            <img
              v-if="imageField && getImage(entry)"
              :src="getImage(entry)"
              :alt="entry.metadata?.code || ''"
              class="lcms-collection-carousel__image"
            >
          </a>
        </div>
      </div>

      <!-- Arrows on the slides -->
      <button
        v-if="showArrows && totalSlides > 1"
        class="lcms-collection-carousel__arrow lcms-collection-carousel__arrow--prev"
        @click="prevSlide"
        type="button"
      >
        <i class="fa-solid fa-chevron-left" />
      </button>

      <button
        v-if="showArrows && totalSlides > 1"
        class="lcms-collection-carousel__arrow lcms-collection-carousel__arrow--next"
        @click="nextSlide"
        type="button"
      >
        <i class="fa-solid fa-chevron-right" />
      </button>

      <!-- Dots -->
      <div
        v-if="showDots && totalSlides > 1"
        class="lcms-collection-carousel__dots"
      >
        <button
          v-for="index in totalSlides"
          :key="index"
          class="lcms-collection-carousel__dot"
          :class="{ 'lcms-collection-carousel__dot--active': index - 1 === currentSlide }"
          @click="goToSlide(index - 1)"
          type="button"
        />
      </div>
    </template>
  </div>
</template>
