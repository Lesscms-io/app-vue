<script setup lang="ts">
/**
 * Testimonial Widget
 *
 * Renders a testimonial quote with author details.
 */

import { computed } from 'vue'
import { useLanguage } from '@/composables/useLanguage'
import type { TestimonialWidgetData } from '@/types/widgets'

defineOptions({
  inheritAttrs: false
})

interface Props {
  data: TestimonialWidgetData
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const { extractValue } = useLanguage(props.language)

const quote = computed(() => extractValue(props.data.quote))
const author = computed(() => extractValue(props.data.author))
const position = computed(() => props.data.position ? extractValue(props.data.position) : '')
const image = computed(() => props.data.image || '')
const rating = computed(() => props.data.rating || 0)

const stars = computed(() => {
  const result = []
  for (let i = 1; i <= 5; i++) {
    result.push(i <= rating.value ? 'full' : 'empty')
  }
  return result
})
</script>

<template>
  <div class="lcms-testimonial">
    <div
      v-if="rating > 0"
      class="lcms-testimonial__rating"
    >
      <span
        v-for="(star, index) in stars"
        :key="index"
        class="lcms-testimonial__star"
        :class="`lcms-testimonial__star--${star}`"
      >
        <i :class="star === 'full' ? 'fa-solid fa-star' : 'fa-regular fa-star'" />
      </span>
    </div>

    <blockquote class="lcms-testimonial__quote">
      {{ quote }}
    </blockquote>

    <div class="lcms-testimonial__author">
      <img
        v-if="image"
        :src="image"
        :alt="author"
        class="lcms-testimonial__avatar"
      >
      <div class="lcms-testimonial__info">
        <span class="lcms-testimonial__name">{{ author }}</span>
        <span
          v-if="position"
          class="lcms-testimonial__position"
        >{{ position }}</span>
      </div>
    </div>
  </div>
</template>
