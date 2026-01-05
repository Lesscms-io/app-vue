<script setup lang="ts">
/**
 * Button Widget
 *
 * Renders a styled button/link element.
 */

import { computed } from 'vue'
import { useLanguage } from '@/composables/useLanguage'
import type { ButtonWidgetData } from '@/types/widgets'

defineOptions({
  inheritAttrs: false
})

interface Props {
  data: ButtonWidgetData
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const { extractValue } = useLanguage(props.language)

const buttonText = computed(() => extractValue(props.data.text))
const buttonUrl = computed(() => props.data.url || '#')
const buttonStyle = computed(() => props.data.style || 'primary')
const buttonSize = computed(() => props.data.size || 'md')
const targetBlank = computed(() => props.data.target_blank || false)
</script>

<template>
  <div class="lcms-button">
    <a
      :href="buttonUrl"
      class="lcms-button__link"
      :class="[
        `lcms-button__link--${buttonStyle}`,
        `lcms-button__link--size-${buttonSize}`
      ]"
      :target="targetBlank ? '_blank' : undefined"
      :rel="targetBlank ? 'noopener noreferrer' : undefined"
    >
      {{ buttonText }}
    </a>
  </div>
</template>
