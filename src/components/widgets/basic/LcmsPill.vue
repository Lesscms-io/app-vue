<script setup lang="ts">
/**
 * Pill Widget
 *
 * Renders a pill/badge/label element with configurable style.
 * Uses element-group structure: text + config groups.
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

// Element-group computed refs
const textGroup = computed(() => props.data.text || {})
const configGroup = computed(() => props.data.config || {})

function resolveColorValue(val: string | null | undefined): string | null {
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

// Read from nested element-groups with legacy flat fallback
const text = computed(() => {
  const textVal = textGroup.value.content || (props.data as any).text
  return textVal ? extractValue(textVal) : ''
})
const variant = computed(() => configGroup.value.variant || (props.data as any).variant || 'filled')
const size = computed(() => configGroup.value.size || (props.data as any).size || 'md')
const isUppercase = computed(() => {
  const val = configGroup.value.uppercase
  if (val !== undefined) return val
  return (props.data as any).uppercase !== false
})
const txtColor = computed(() => resolveColorValue(textGroup.value.color || (props.data as any).text_color))
const hoverTxtColor = computed(() => resolveColorValue(textGroup.value['color:hover'] || (props.data as any).hover_text_color))

const pillStyle = computed(() => {
  const style: Record<string, string> = {}

  if (variant.value === 'outline') {
    style.backgroundColor = 'transparent'
  }
  if (txtColor.value) style.color = txtColor.value

  // hover CSS custom properties
  if (hoverTxtColor.value) style['--hover-color'] = hoverTxtColor.value

  return style
})

const pillClasses = computed(() => [
  'lcms-pill',
  `lcms-pill--${variant.value}`,
  `lcms-pill--${size.value}`,
  { 'lcms-pill--uppercase': isUppercase.value },
  { 'has-hover': !!hoverTxtColor.value }
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
  display: inline-block;
  border-radius: 9999px;
  padding: 0.35em 1em;
  font-weight: 600;
  line-height: 1.4;
  transition: color 200ms ease;
}

.lcms-pill--sm {
  font-size: 0.75rem;
  padding: 0.25em 0.75em;
}

.lcms-pill--md {
  font-size: 0.8125rem;
}

.lcms-pill--lg {
  font-size: 0.9375rem;
  padding: 0.4em 1.25em;
}

.lcms-pill--uppercase {
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.lcms-pill.has-hover:hover {
  color: var(--hover-color);
}
</style>
