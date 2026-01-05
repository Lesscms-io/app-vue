<script setup lang="ts">
/**
 * Hero Widget
 *
 * Renders a hero section with background, title, subtitle, and CTA button.
 */

import { computed } from 'vue'
import { useLanguage } from '@/composables/useLanguage'
import type { HeroWidgetData } from '@/types/widgets'

defineOptions({
  inheritAttrs: false
})

interface Props {
  data: HeroWidgetData
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const { extractValue } = useLanguage(props.language)

const title = computed(() => extractValue(props.data.title))
const subtitle = computed(() => props.data.subtitle ? extractValue(props.data.subtitle) : '')
const backgroundImage = computed(() => props.data.background || '')
const buttonText = computed(() => props.data.button_text ? extractValue(props.data.button_text) : '')
const buttonLink = computed(() => props.data.button_link || '#')
const buttonStyle = computed(() => props.data.button_style || 'primary')
const buttonSize = computed(() => props.data.button_size || 'lg')

const heroStyle = computed(() => {
  if (!backgroundImage.value) return {}
  return {
    backgroundImage: `url(${backgroundImage.value})`,
  }
})
</script>

<template>
  <section
    class="lcms-hero"
    :class="{ 'lcms-hero--has-bg': backgroundImage }"
    :style="heroStyle"
  >
    <div class="lcms-hero__overlay" />
    <div class="lcms-hero__content">
      <h1
        v-if="title"
        class="lcms-hero__title"
      >
        {{ title }}
      </h1>
      <p
        v-if="subtitle"
        class="lcms-hero__subtitle"
      >
        {{ subtitle }}
      </p>
      <a
        v-if="buttonText"
        :href="buttonLink"
        class="lcms-hero__button"
        :class="[
          `lcms-hero__button--${buttonStyle}`,
          `lcms-hero__button--size-${buttonSize}`
        ]"
      >
        {{ buttonText }}
      </a>
    </div>
  </section>
</template>
