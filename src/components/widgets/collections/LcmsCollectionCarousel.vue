<script setup lang="ts">
/**
 * Collection Carousel Widget
 *
 * Renders collection entries in a carousel layout.
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
const postsCount = computed(() => props.data.posts_count || 6)
const slidesPerView = computed(() => Number(props.data.slides_per_view) || 3)
const autoplay = computed(() => props.data.autoplay !== false)
const autoplayInterval = computed(() => props.data.autoplay_interval || 5000)
const showArrows = computed(() => props.data.show_arrows !== false)
const showDots = computed(() => props.data.show_dots !== false)

// Field mappings
const titleField = computed(() => props.data.title_field || 'title')
const excerptField = computed(() => props.data.excerpt_field || '')
const imageField = computed(() => props.data.image_field || '')

// Display toggles
const showTitle = computed(() => props.data.show_title !== false)
const showExcerpt = computed(() => props.data.show_excerpt !== false)

const { entries, loading, error } = useCollection(collectionCode, {
  pageSize: postsCount.value,
})

// Carousel state
const currentSlide = ref(0)
let autoplayTimer: ReturnType<typeof setInterval> | null = null

const totalSlides = computed(() => {
  if (entries.value.length === 0) return 0
  return Math.ceil(entries.value.length / slidesPerView.value)
})

const visibleEntries = computed(() => {
  const start = currentSlide.value * slidesPerView.value
  return entries.value.slice(start, start + slidesPerView.value)
})

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

function getTitle(entry: CollectionEntry): string {
  return getFieldValue(entry, titleField.value) || ''
}

function getExcerpt(entry: CollectionEntry): string {
  const text = getFieldValue(entry, excerptField.value) || ''
  return text.replace(/<[^>]*>/g, '').substring(0, 150) + '...'
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

    <template v-else>
      <div class="lcms-collection-carousel__viewport">
        <div
          class="lcms-collection-carousel__track"
          :style="{ gridTemplateColumns: `repeat(${slidesPerView}, 1fr)` }"
        >
          <article
            v-for="entry in visibleEntries"
            :key="entry.metadata?.code"
            class="lcms-collection-carousel__slide"
          >
            <a
              v-if="imageField && getImage(entry)"
              :href="getUrl(entry)"
              class="lcms-collection-carousel__image-link"
            >
              <img
                :src="getImage(entry)"
                :alt="getTitle(entry)"
                class="lcms-collection-carousel__image"
              >
            </a>

            <div class="lcms-collection-carousel__content">
              <h3
                v-if="showTitle"
                class="lcms-collection-carousel__title"
              >
                <a :href="getUrl(entry)">{{ getTitle(entry) }}</a>
              </h3>

              <p
                v-if="showExcerpt && excerptField"
                class="lcms-collection-carousel__excerpt"
              >
                {{ getExcerpt(entry) }}
              </p>
            </div>
          </article>
        </div>
      </div>

      <button
        v-if="showArrows && totalSlides > 1"
        class="lcms-collection-carousel__arrow lcms-collection-carousel__arrow--prev"
        @click="prevSlide"
      >
        <i class="fa-solid fa-chevron-left" />
      </button>

      <button
        v-if="showArrows && totalSlides > 1"
        class="lcms-collection-carousel__arrow lcms-collection-carousel__arrow--next"
        @click="nextSlide"
      >
        <i class="fa-solid fa-chevron-right" />
      </button>

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
        />
      </div>
    </template>
  </div>
</template>
