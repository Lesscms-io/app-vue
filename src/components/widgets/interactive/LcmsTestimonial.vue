<script setup lang="ts">
/**
 * Testimonial Widget
 *
 * Renders a testimonial quote with author details, avatar and rating.
 * Uses element-group governance — each visual element is a nested object.
 */

import { computed } from 'vue'
import { useLanguage } from '@/composables/useLanguage'
import { smallImage } from '@/composables/useImageOptimization'

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
const quoteGroup = computed(() => config.value.quote || {})
const authorGroup = computed(() => config.value.author || {})
const positionGroup = computed(() => config.value.position || {})
const avatarGroup = computed(() => config.value.avatar || {})
const ratingGroup = computed(() => config.value.rating || {})
const configGroup = computed(() => config.value.config || {})

// Content values
const quoteText = computed(() => extractValue(quoteGroup.value.html || quoteGroup.value.content) || '')
const authorText = computed(() => extractValue(authorGroup.value.html || authorGroup.value.content) || '')
const positionText = computed(() => extractValue(positionGroup.value.html || positionGroup.value.content) || '')
const avatarImage = computed(() => avatarGroup.value.image || '')
const avatarOptimized = computed(() => smallImage(avatarImage.value))
const ratingValue = computed(() => ratingGroup.value.value || 0)
const alignment = computed(() => configGroup.value.alignment || 'center')

// Colors
const quoteColor = computed(() => resolveColor(quoteGroup.value.color))
const authorColor = computed(() => resolveColor(authorGroup.value.color))
const positionColor = computed(() => resolveColor(positionGroup.value.color))
const ratingColor = computed(() => resolveColor(ratingGroup.value.color))

// Hover colors
const hoverQuoteColor = computed(() => resolveColor(quoteGroup.value['color:hover']))
const hoverAuthorColor = computed(() => resolveColor(authorGroup.value['color:hover']))
const hoverPositionColor = computed(() => resolveColor(positionGroup.value['color:hover']))
const hoverRatingColor = computed(() => resolveColor(ratingGroup.value['color:hover']))

const hasHover = computed(() => !!(hoverQuoteColor.value || hoverAuthorColor.value || hoverPositionColor.value || hoverRatingColor.value))

const stars = computed(() => {
  const result = []
  for (let i = 1; i <= 5; i++) {
    result.push(i <= ratingValue.value ? 'full' : 'empty')
  }
  return result
})

const testimonialStyle = computed(() => {
  const styles: Record<string, string> = {}
  if (hoverQuoteColor.value) styles['--hover-quote-color'] = hoverQuoteColor.value
  if (hoverAuthorColor.value) styles['--hover-author-color'] = hoverAuthorColor.value
  if (hoverPositionColor.value) styles['--hover-position-color'] = hoverPositionColor.value
  if (hoverRatingColor.value) styles['--hover-rating-color'] = hoverRatingColor.value
  return styles
})
</script>

<template>
  <div
    class="lcms-testimonial"
    :class="{
      'has-hover': hasHover,
      'has-hover-quote': !!hoverQuoteColor,
      'has-hover-author': !!hoverAuthorColor,
      'has-hover-position': !!hoverPositionColor,
      'has-hover-rating': !!hoverRatingColor
    }"
    :style="testimonialStyle"
  >
    <div
      v-if="ratingValue > 0"
      class="lcms-testimonial__rating"
      :style="{ justifyContent: alignment === 'left' ? 'flex-start' : alignment === 'right' ? 'flex-end' : 'center' }"
    >
      <span
        v-for="(star, index) in stars"
        :key="index"
        class="lcms-testimonial__star"
        :class="`lcms-testimonial__star--${star}`"
      >
        <i
          :class="star === 'full' ? 'fa-solid fa-star' : 'fa-regular fa-star'"
          :style="{ color: ratingColor || undefined }"
        />
      </span>
    </div>

    <blockquote
      class="lcms-testimonial__quote"
      :style="{ color: quoteColor || undefined, textAlign: alignment }"
    >
      {{ quoteText }}
    </blockquote>

    <div
      class="lcms-testimonial__author"
      :style="{ justifyContent: alignment === 'left' ? 'flex-start' : alignment === 'right' ? 'flex-end' : 'center' }"
    >
      <img
        v-if="avatarImage"
        :src="avatarOptimized.src"
        :srcset="avatarOptimized.srcset"
        :sizes="avatarOptimized.sizes"
        :alt="authorText"
        loading="lazy"
        decoding="async"
        class="lcms-testimonial__avatar"
      >
      <div class="lcms-testimonial__info">
        <span
          v-if="authorText"
          class="lcms-testimonial__name"
          :style="{ color: authorColor || undefined }"
        >{{ authorText }}</span>
        <span
          v-if="positionText"
          class="lcms-testimonial__position"
          :style="{ color: positionColor || undefined }"
        >{{ positionText }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lcms-testimonial {
  text-align: center;
  transition: all 200ms ease;
}

.lcms-testimonial__rating {
  margin-bottom: 16px;
  display: flex;
  gap: 2px;
}

.lcms-testimonial__star {
  color: #ffc107;
  font-size: 18px;
  transition: color 200ms ease;
}

.lcms-testimonial__quote {
  font-size: 18px;
  font-style: italic;
  color: #333;
  line-height: 1.6;
  margin: 0 0 24px;
  padding: 0;
  border: none;
  transition: color 200ms ease;
}

.lcms-testimonial__author {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.lcms-testimonial__avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  object-fit: cover;
}

.lcms-testimonial__info {
  text-align: left;
}

.lcms-testimonial__name {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  transition: color 200ms ease;
}

.lcms-testimonial__position {
  display: block;
  font-size: 14px;
  color: #666;
  transition: color 200ms ease;
}

/* Hover states */
.lcms-testimonial.has-hover.has-hover-quote:hover .lcms-testimonial__quote {
  color: var(--hover-quote-color) !important;
}

.lcms-testimonial.has-hover.has-hover-author:hover .lcms-testimonial__name {
  color: var(--hover-author-color) !important;
}

.lcms-testimonial.has-hover.has-hover-position:hover .lcms-testimonial__position {
  color: var(--hover-position-color) !important;
}

.lcms-testimonial.has-hover.has-hover-rating:hover .lcms-testimonial__star {
  color: var(--hover-rating-color) !important;
}
</style>
