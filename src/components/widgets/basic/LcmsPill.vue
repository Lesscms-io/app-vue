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

  // hover CSS custom properties
  const hoverBg = resolveColorValue(props.data.hover_background_color || '')
  if (hoverBg) style['--hover-bg'] = hoverBg
  const hoverTxt = resolveColorValue(props.data.hover_text_color || '')
  if (hoverTxt) style['--hover-color'] = hoverTxt
  style['--transition-duration'] = `${props.data.transition_duration ?? 200}ms`

  // Hover transform effects
  const lift = props.data.hover_lift || 0
  if (lift) style['--hover-lift'] = `-${lift}px`
  const scale = props.data.hover_scale
  if (scale && scale !== 1) style['--hover-scale'] = String(scale)
  const shadowMap: Record<string, string> = { sm: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)', md: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)', lg: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)' }
  const shadowVal = props.data.hover_shadow || 'none'
  if (shadowVal !== 'none' && shadowMap[shadowVal]) style['--hover-shadow'] = shadowMap[shadowVal]

  return style
})

const pillClasses = computed(() => [
  'lcms-pill',
  `lcms-pill--${variant.value}`,
  `lcms-pill--${size.value}`,
  { 'lcms-pill--uppercase': isUppercase.value },
  { 'has-hover': !!(props.data.hover_background_color || props.data.hover_text_color || props.data.hover_lift || (props.data.hover_scale !== undefined && props.data.hover_scale !== 1) || (props.data.hover_shadow && props.data.hover_shadow !== 'none')) }
])
</script>

<template>
  <span
    v-if="text"
    :class="pillClasses"
    :style="pillStyle"
  >{{ text }}</span>
</template>

<style scoped>
.lcms-pill {
  transition: background-color var(--transition-duration, 200ms) ease, color var(--transition-duration, 200ms) ease, transform var(--transition-duration, 200ms) ease, box-shadow var(--transition-duration, 200ms) ease;
}

.lcms-pill.has-hover:hover {
  background-color: var(--hover-bg);
  color: var(--hover-color);
  transform: translateY(var(--hover-lift, 0)) scale(var(--hover-scale, 1));
  box-shadow: var(--hover-shadow, none);
}
</style>
