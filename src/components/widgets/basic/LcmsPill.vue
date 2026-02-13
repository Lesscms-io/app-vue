<script setup lang="ts">
/**
 * Pill Widget
 *
 * Renders a pill/badge/label element with configurable style.
 */

import { computed } from 'vue'
import { useLanguage } from '@/composables/useLanguage'
import type { PillWidgetData } from '@/types/widgets'

defineOptions({
  inheritAttrs: false
})

interface Props {
  data: PillWidgetData
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const { extractValue } = useLanguage(props.language)

const text = computed(() => props.data.text ? extractValue(props.data.text) : '')
const variant = computed(() => props.data.variant || 'filled')
const size = computed(() => props.data.size || 'md')
const isUppercase = computed(() => props.data.uppercase !== false)
const bgColorRaw = computed(() => props.data.background_color || '')
const txtColorRaw = computed(() => props.data.text_color || '')

function resolveColorValue(val: string | null): string | null {
  if (!val) return null
  if (val.startsWith('var:')) {
    const parts = val.split(':')
    const code = parts[1]
    const opacity = parts.length >= 3 ? parseInt(parts[2]) : 100
    if (opacity < 100) {
      return `color-mix(in srgb, var(--lcms-color-${code}) ${opacity}%, transparent)`
    }
    return `var(--lcms-color-${code})`
  }
  if (val.startsWith('#') && val.includes(':')) {
    const parts = val.split(':')
    const hex = parts[0]
    const opacity = parseInt(parts[1])
    if (opacity < 100) {
      return `color-mix(in srgb, ${hex} ${opacity}%, transparent)`
    }
    return hex
  }
  return val
}

const pillStyle = computed(() => {
  const bg = resolveColorValue(bgColorRaw.value)
  const txt = resolveColorValue(txtColorRaw.value)
  const style: Record<string, string> = {}

  if (variant.value === 'outline') {
    style.backgroundColor = 'transparent'
    if (bg) {
      style.borderColor = bg
      style.color = bg
    }
  } else {
    if (bg) style.backgroundColor = bg
    if (txt) style.color = txt
  }

  return style
})

const pillClasses = computed(() => [
  'lcms-pill',
  `lcms-pill--${variant.value}`,
  `lcms-pill--${size.value}`,
  { 'lcms-pill--uppercase': isUppercase.value }
])
</script>

<template>
  <span
    v-if="text"
    :class="pillClasses"
    :style="pillStyle"
  >{{ text }}</span>
</template>
