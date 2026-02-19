<script setup lang="ts">
/**
 * CTA Box Widget
 *
 * Renders a call-to-action box with title, subtitle and button.
 */

import { computed } from 'vue'
import { useLanguage } from '@/composables/useLanguage'
import type { CtaBoxWidgetData } from '@/types/widgets'

defineOptions({
  inheritAttrs: false
})

interface Props {
  data: CtaBoxWidgetData
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const { extractValue } = useLanguage(props.language)

const title = computed(() => extractValue(props.data.title))
const subtitle = computed(() => props.data.subtitle ? extractValue(props.data.subtitle) : '')
const buttonText = computed(() => props.data.button_text ? extractValue(props.data.button_text) : '')
const buttonUrl = computed(() => props.data.button_url || '')
const backgroundColor = computed(() => props.data.background_color || null)
const buttonColor = computed(() => props.data.button_color || null)
const textColor = computed(() => props.data.text_color || 'light')
const alignment = computed(() => props.data.alignment || 'center')
</script>

<template>
  <div
    class="lcms-cta-box"
    :class="`lcms-cta-box--${alignment}`"
    :style="{
      backgroundColor: backgroundColor || undefined,
      color: textColor === 'light' ? '#fff' : '#212529'
    }"
  >
    <h3 v-if="title" class="lcms-cta-box__title">{{ title }}</h3>
    <p v-if="subtitle" class="lcms-cta-box__subtitle">{{ subtitle }}</p>
    <a
      v-if="buttonText && buttonUrl"
      :href="buttonUrl"
      class="lcms-cta-box__button"
      :style="buttonColor ? { backgroundColor: buttonColor } : {}"
    >
      {{ buttonText }}
    </a>
  </div>
</template>

<style scoped>
.lcms-cta-box {
  padding: 32px;
  border-radius: 8px;
  background-color: #50a5f1;
  color: #fff;
}

.lcms-cta-box--center {
  text-align: center;
}

.lcms-cta-box--right {
  text-align: right;
}

.lcms-cta-box__title {
  margin: 0 0 8px;
  font-size: 1.5em;
}

.lcms-cta-box__subtitle {
  margin: 0 0 16px;
  opacity: 0.9;
}

.lcms-cta-box__button {
  display: inline-block;
  padding: 10px 24px;
  background-color: #fff;
  color: #212529;
  border-radius: 4px;
  text-decoration: none;
  font-weight: 600;
  transition: opacity 0.2s;
}

.lcms-cta-box__button:hover {
  opacity: 0.9;
}
</style>
