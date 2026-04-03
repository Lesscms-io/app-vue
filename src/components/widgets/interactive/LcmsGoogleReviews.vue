<script setup lang="ts">
/**
 * Google Reviews Widget
 *
 * Renders Google reviews with grid, carousel, or list layout.
 * Uses element-group governance — each visual element is a nested object.
 */

import { ref, computed } from 'vue'
import { useLanguage } from '@/composables/useLanguage'

defineOptions({
  inheritAttrs: false
})

interface Props {
  data: Record<string, any>
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const { extractValue } = useLanguage(props.language)

function resolveColor(val: string | null | undefined): string | null {
  if (!val) return null
  if (val === 'transparent') return 'transparent'
  if (val.startsWith('var:')) {
    const parts = val.split(':')
    const code = parts[1]
    const opacity = parts.length >= 3 ? parseInt(parts[2]) : 100
    if (opacity < 100) {
      return `color-mix(in srgb, var(--lcms-color-${code}) ${opacity}%, transparent)`
    }
    return `var(--lcms-color-${code})`
  }
  return val
}

const config = computed(() => props.data.widget || props.data || {})

// Element groups
const configGroup = computed(() => config.value.config || {})
const placeGroup = computed(() => config.value.place || {})
const summaryGroup = computed(() => config.value.summary || {})
const cardGroup = computed(() => config.value.card || {})
const authorGroup = computed(() => config.value.author || {})
const ratingGroup = computed(() => config.value.rating || {})
const reviewGroup = computed(() => config.value.review || {})

// Config values
const layout = computed(() => configGroup.value.layout || 'grid')
const columns = computed(() => configGroup.value.columns || 3)
const showSummary = computed(() => configGroup.value.show_rating_summary !== false)
const maxReviews = computed(() => configGroup.value.max_reviews || 5)
const minRating = computed(() => configGroup.value.min_rating || 0)
const maxChars = computed(() => reviewGroup.value.max_chars || 200)

// Place info
const placeName = computed(() => placeGroup.value.name || '')
const overallRating = computed(() => placeGroup.value.overall_rating || 0)
const totalReviews = computed(() => placeGroup.value.total_reviews || 0)
const lastFetchedAt = computed(() => config.value.last_fetched_at || null)

// Reviews (filtered)
const reviews = computed(() => {
  let list = config.value.reviews || []
  if (minRating.value > 0) {
    list = list.filter((r: any) => (r.rating || 0) >= minRating.value)
  }
  return list.slice(0, maxReviews.value)
})

// Colors
const summaryColor = computed(() => resolveColor(summaryGroup.value.color))
const summaryBg = computed(() => resolveColor(summaryGroup.value.background))
const cardBg = computed(() => resolveColor(cardGroup.value.background))
const cardBorderColor = computed(() => resolveColor(cardGroup.value.border_color))
const cardBorderRadius = computed(() => (cardGroup.value.border_radius ?? 8) + 'px')
const authorColor = computed(() => resolveColor(authorGroup.value.color))
const ratingColor = computed(() => resolveColor(ratingGroup.value.color))
const reviewColor = computed(() => resolveColor(reviewGroup.value.color))

// Hover
const hoverCardBg = computed(() => resolveColor(cardGroup.value['background:hover']))
const hoverCardBorderColor = computed(() => resolveColor(cardGroup.value['border_color:hover']))
const hoverAuthorColor = computed(() => resolveColor(authorGroup.value['color:hover']))
const hoverRatingColor = computed(() => resolveColor(ratingGroup.value['color:hover']))
const hoverReviewColor = computed(() => resolveColor(reviewGroup.value['color:hover']))
const hoverSummaryColor = computed(() => resolveColor(summaryGroup.value['color:hover']))
const hoverSummaryBg = computed(() => resolveColor(summaryGroup.value['background:hover']))

const hasHover = computed(() => !!(
  hoverCardBg.value || hoverCardBorderColor.value ||
  hoverAuthorColor.value || hoverRatingColor.value || hoverReviewColor.value
))

const widgetStyle = computed(() => {
  const style: Record<string, string> = {}
  if (cardBg.value) style['--gr-card-bg'] = cardBg.value
  if (cardBorderColor.value) style['--gr-card-border'] = cardBorderColor.value
  style['--gr-card-radius'] = cardBorderRadius.value
  if (authorColor.value) style['--gr-author-color'] = authorColor.value
  if (ratingColor.value) style['--gr-rating-color'] = ratingColor.value
  if (reviewColor.value) style['--gr-review-color'] = reviewColor.value
  if (summaryColor.value) style['--gr-summary-color'] = summaryColor.value
  if (summaryBg.value) style['--gr-summary-bg'] = summaryBg.value
  if (hoverCardBg.value) style['--gr-hover-card-bg'] = hoverCardBg.value
  if (hoverCardBorderColor.value) style['--gr-hover-card-border'] = hoverCardBorderColor.value
  if (hoverAuthorColor.value) style['--gr-hover-author'] = hoverAuthorColor.value
  if (hoverRatingColor.value) style['--gr-hover-rating'] = hoverRatingColor.value
  if (hoverReviewColor.value) style['--gr-hover-review'] = hoverReviewColor.value
  if (hoverSummaryColor.value) style['--gr-hover-summary-color'] = hoverSummaryColor.value
  if (hoverSummaryBg.value) style['--gr-hover-summary-bg'] = hoverSummaryBg.value
  if (layout.value === 'grid') {
    style['--gr-columns'] = String(columns.value)
  }
  return style
})

// Carousel state
const carouselRef = ref<HTMLElement | null>(null)

function scrollCarousel(dir: number) {
  if (!carouselRef.value) return
  const card = carouselRef.value.querySelector('.lcms-gr__card') as HTMLElement
  if (!card) return
  const scrollAmount = (card.offsetWidth + 16) * dir
  carouselRef.value.scrollBy({ left: scrollAmount, behavior: 'smooth' })
}

// Text truncation
const expandedReviews = ref<Set<number>>(new Set())

function isExpanded(index: number) {
  return expandedReviews.value.has(index)
}

function toggleExpand(index: number) {
  const newSet = new Set(expandedReviews.value)
  if (newSet.has(index)) {
    newSet.delete(index)
  } else {
    newSet.add(index)
  }
  expandedReviews.value = newSet
}

function getReviewText(review: any, index: number) {
  const text = review.text || ''
  if (text.length <= maxChars.value || isExpanded(index)) return text
  return text.substring(0, maxChars.value) + '...'
}

function needsTruncation(review: any) {
  return (review.text || '').length > maxChars.value
}
</script>

<template>
  <div
    class="lcms-gr"
    :class="[`lcms-gr--${layout}`, { 'lcms-gr--hover': hasHover }]"
    :style="widgetStyle"
    :data-fetched="lastFetchedAt"
  >
    <!-- Rating Summary -->
    <div v-if="showSummary && placeName" class="lcms-gr__summary">
      <div class="lcms-gr__place-name">{{ placeName }}</div>
      <div class="lcms-gr__overall">
        <span class="lcms-gr__score">{{ overallRating.toFixed(1) }}</span>
        <div class="lcms-gr__stars lcms-gr__stars--summary">
          <i
            v-for="i in 5"
            :key="i"
            class="fa-star"
            :class="i <= Math.round(overallRating) ? 'fa-solid' : 'fa-regular'"
          />
        </div>
        <span class="lcms-gr__total">{{ totalReviews }} opinii</span>
      </div>
    </div>

    <!-- Carousel arrows -->
    <div v-if="layout === 'carousel' && reviews.length > 1" class="lcms-gr__carousel-wrapper">
      <button class="lcms-gr__arrow lcms-gr__arrow--prev" aria-label="Previous" @click="scrollCarousel(-1)">
        <i class="fa-solid fa-chevron-left" />
      </button>

      <div ref="carouselRef" class="lcms-gr__carousel">
        <div
          v-for="(review, index) in reviews"
          :key="index"
          class="lcms-gr__card"
        >
          <div class="lcms-gr__card-header">
            <img
              v-if="review.author_photo_url"
              :src="review.author_photo_url"
              :alt="review.author_name"
              class="lcms-gr__avatar"
              loading="lazy"
              referrerpolicy="no-referrer"
            >
            <div v-else class="lcms-gr__avatar-placeholder">
              <i class="fa-solid fa-user" />
            </div>
            <div class="lcms-gr__author-info">
              <span class="lcms-gr__author">{{ review.author_name }}</span>
              <span class="lcms-gr__time">{{ review.relative_time }}</span>
            </div>
          </div>
          <div class="lcms-gr__stars">
            <i
              v-for="i in 5"
              :key="i"
              class="fa-star"
              :class="i <= review.rating ? 'fa-solid' : 'fa-regular'"
            />
          </div>
          <p class="lcms-gr__text">
            {{ getReviewText(review, index) }}
            <button
              v-if="needsTruncation(review)"
              class="lcms-gr__read-more"
              @click="toggleExpand(index)"
            >
              {{ isExpanded(index) ? 'Zwiń' : 'Czytaj więcej' }}
            </button>
          </p>
        </div>
      </div>

      <button class="lcms-gr__arrow lcms-gr__arrow--next" aria-label="Next" @click="scrollCarousel(1)">
        <i class="fa-solid fa-chevron-right" />
      </button>
    </div>

    <!-- Grid / List -->
    <div v-else :class="`lcms-gr__${layout}`">
      <div
        v-for="(review, index) in reviews"
        :key="index"
        class="lcms-gr__card"
      >
        <div class="lcms-gr__card-header">
          <img
            v-if="review.author_photo_url"
            :src="review.author_photo_url"
            :alt="review.author_name"
            class="lcms-gr__avatar"
            loading="lazy"
            referrerpolicy="no-referrer"
          >
          <div v-else class="lcms-gr__avatar-placeholder">
            <i class="fa-solid fa-user" />
          </div>
          <div class="lcms-gr__author-info">
            <span class="lcms-gr__author">{{ review.author_name }}</span>
            <span class="lcms-gr__time">{{ review.relative_time }}</span>
          </div>
        </div>
        <div class="lcms-gr__stars">
          <i
            v-for="i in 5"
            :key="i"
            class="fa-star"
            :class="i <= review.rating ? 'fa-solid' : 'fa-regular'"
          />
        </div>
        <p class="lcms-gr__text">
          {{ getReviewText(review, index) }}
          <button
            v-if="needsTruncation(review)"
            class="lcms-gr__read-more"
            @click="toggleExpand(index)"
          >
            {{ isExpanded(index) ? 'Zwiń' : 'Czytaj więcej' }}
          </button>
        </p>
      </div>
    </div>

    <!-- Google Attribution -->
    <div class="lcms-gr__attribution">
      <i class="fa-brands fa-google" />
      Opinie z Google
    </div>
  </div>
</template>

<style scoped>
.lcms-gr {
  width: 100%;
}

/* Summary */
.lcms-gr__summary {
  text-align: center;
  margin-bottom: 24px;
  padding: 20px;
  border-radius: 12px;
  background: var(--gr-summary-bg, transparent);
  color: var(--gr-summary-color, inherit);
}

.lcms-gr--hover .lcms-gr__summary:hover {
  background: var(--gr-hover-summary-bg, var(--gr-summary-bg, transparent));
  color: var(--gr-hover-summary-color, var(--gr-summary-color, inherit));
}

.lcms-gr__place-name {
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 8px;
}

.lcms-gr__overall {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.lcms-gr__score {
  font-size: 2rem;
  font-weight: 700;
  line-height: 1;
}

.lcms-gr__stars i {
  color: var(--gr-rating-color, #ffc107);
  font-size: 16px;
  transition: color 200ms ease;
}

.lcms-gr__stars--summary i {
  font-size: 20px;
}

.lcms-gr__total {
  font-size: 0.9rem;
  opacity: 0.7;
}

/* Grid layout */
.lcms-gr__grid {
  display: grid;
  grid-template-columns: repeat(var(--gr-columns, 3), 1fr);
  gap: 16px;
}

/* List layout */
.lcms-gr__list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Carousel */
.lcms-gr__carousel-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
}

.lcms-gr__carousel {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  flex: 1;
  scrollbar-width: none;
}

.lcms-gr__carousel::-webkit-scrollbar {
  display: none;
}

.lcms-gr__carousel .lcms-gr__card {
  min-width: 300px;
  scroll-snap-align: start;
  flex-shrink: 0;
}

.lcms-gr__arrow {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid #dee2e6;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 200ms ease;
  color: #495057;
}

.lcms-gr__arrow:hover {
  background: #f8f9fa;
  border-color: #adb5bd;
}

/* Card */
.lcms-gr__card {
  padding: 20px;
  border-radius: var(--gr-card-radius, 8px);
  background: var(--gr-card-bg, #fff);
  border: 1px solid var(--gr-card-border, #e9ecef);
  transition: all 200ms ease;
}

.lcms-gr--hover .lcms-gr__card:hover {
  background: var(--gr-hover-card-bg, var(--gr-card-bg, #fff));
  border-color: var(--gr-hover-card-border, var(--gr-card-border, #e9ecef));
}

.lcms-gr__card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.lcms-gr__avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.lcms-gr__avatar-placeholder {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #e9ecef;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #adb5bd;
}

.lcms-gr__author-info {
  display: flex;
  flex-direction: column;
}

.lcms-gr__author {
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--gr-author-color, inherit);
  transition: color 200ms ease;
}

.lcms-gr--hover .lcms-gr__card:hover .lcms-gr__author {
  color: var(--gr-hover-author, var(--gr-author-color, inherit));
}

.lcms-gr__time {
  font-size: 0.8rem;
  color: #6c757d;
}

.lcms-gr__stars {
  margin-bottom: 10px;
}

.lcms-gr--hover .lcms-gr__card:hover .lcms-gr__stars i {
  color: var(--gr-hover-rating, var(--gr-rating-color, #ffc107));
}

.lcms-gr__text {
  font-size: 0.95rem;
  line-height: 1.6;
  color: var(--gr-review-color, #495057);
  margin: 0;
  transition: color 200ms ease;
}

.lcms-gr--hover .lcms-gr__card:hover .lcms-gr__text {
  color: var(--gr-hover-review, var(--gr-review-color, #495057));
}

.lcms-gr__read-more {
  background: none;
  border: none;
  color: #50a5f1;
  cursor: pointer;
  font-size: 0.85rem;
  padding: 0;
  margin-left: 4px;
}

.lcms-gr__read-more:hover {
  text-decoration: underline;
}

/* Attribution */
.lcms-gr__attribution {
  text-align: center;
  margin-top: 20px;
  font-size: 0.8rem;
  color: #adb5bd;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

/* Responsive */
@media (max-width: 768px) {
  .lcms-gr__grid {
    grid-template-columns: 1fr;
  }

  .lcms-gr__carousel .lcms-gr__card {
    min-width: 260px;
  }
}

@media (max-width: 1024px) and (min-width: 769px) {
  .lcms-gr__grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
