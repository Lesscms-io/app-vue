<script setup lang="ts">
/**
 * Link Widget
 *
 * Renders a styled link with optional icon and hover animation.
 */

import { computed } from 'vue'
import { useLanguage } from '@/composables/useLanguage'
import type { LinkWidgetData } from '@/types/widgets'

defineOptions({
  inheritAttrs: false
})

interface Props {
  data: LinkWidgetData
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const { extractValue } = useLanguage(props.language)

const linkText = computed(() => extractValue(props.data.text))
const linkUrl = computed(() => props.data.url || '#')
const icon = computed(() => props.data.icon || 'fa-solid fa-arrow-right')
const iconPosition = computed(() => props.data.icon_position || 'right')
const animation = computed(() => props.data.animation || 'none')
const color = computed(() => props.data.color || null)
const targetBlank = computed(() => props.data.target_blank || false)

const linkStyles = computed(() => {
  const styles: Record<string, string> = {}
  if (color.value) {
    styles.color = color.value
  }
  return styles
})

const linkClasses = computed(() => [
  'lcms-link__anchor',
  `lcms-link__anchor--animation-${animation.value}`,
  { 'lcms-link__anchor--icon-left': iconPosition.value === 'left' }
])
</script>

<template>
  <div class="lcms-link">
    <a
      :href="linkUrl"
      :class="linkClasses"
      :style="linkStyles"
      :target="targetBlank ? '_blank' : undefined"
      :rel="targetBlank ? 'noopener noreferrer' : undefined"
    >
      <i
        v-if="iconPosition === 'left'"
        :class="icon"
        class="lcms-link__icon lcms-link__icon--left"
      />
      <span class="lcms-link__text">{{ linkText }}</span>
      <i
        v-if="iconPosition === 'right'"
        :class="icon"
        class="lcms-link__icon lcms-link__icon--right"
      />
    </a>
  </div>
</template>
