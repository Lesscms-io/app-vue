<script setup lang="ts">
/**
 * Counter Widget
 *
 * Renders an animated counting number with prefix/suffix inline.
 */

import { ref, computed, onMounted, watch } from 'vue'
import { useLanguage } from '@/composables/useLanguage'
import type { CounterWidgetData } from '@/types/widgets'

defineOptions({
  inheritAttrs: false
})

interface Props {
  data: CounterWidgetData
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const { extractValue } = useLanguage(props.language)

const targetNumber = computed(() => props.data.number || 0)
const prefix = computed(() => props.data.prefix ? extractValue(props.data.prefix) : '')
const suffix = computed(() => props.data.suffix ? extractValue(props.data.suffix) : '')
const title = computed(() => props.data.title ? extractValue(props.data.title) : '')
const duration = computed(() => props.data.duration || 2000)
const alignment = computed(() => props.data.alignment || 'center')
const numberSize = computed(() => props.data.number_size || 'xl')
const numberColor = computed(() => props.data.number_color || null)
const titleColor = computed(() => props.data.title_color || null)
const prefixColor = computed(() => props.data.prefix_color || null)

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
    const opacity = parseInt(parts[1]) || 100
    if (opacity < 100) {
      const r = parseInt(hex.slice(1, 3), 16)
      const g = parseInt(hex.slice(3, 5), 16)
      const b = parseInt(hex.slice(5, 7), 16)
      return `rgba(${r}, ${g}, ${b}, ${opacity / 100})`
    }
    return hex
  }
  return val
}

const counterStyle = computed(() => {
  const style: Record<string, string> = {}
  const nc = resolveColorValue(numberColor.value)
  if (nc) style['--counter-number-color'] = nc
  const tc = resolveColorValue(titleColor.value)
  if (tc) style['--counter-title-color'] = tc
  const pc = resolveColorValue(prefixColor.value)
  if (pc) style['--counter-prefix-color'] = pc

  // hover CSS custom properties
  const hoverNumber = resolveColorValue(props.data.hover_number_color || null)
  if (hoverNumber) style['--hover-number-color'] = hoverNumber
  const hoverTitle = resolveColorValue(props.data.hover_title_color || null)
  if (hoverTitle) style['--hover-title-color'] = hoverTitle
  const hoverPrefix = resolveColorValue(props.data.hover_prefix_color || null)
  if (hoverPrefix) style['--hover-prefix-color'] = hoverPrefix
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

const displayNumber = ref(0)
let animationFrame: number | null = null

function animateCounter() {
  const start = 0
  const end = targetNumber.value
  const startTime = performance.now()
  const dur = duration.value

  function update(currentTime: number) {
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / dur, 1)

    // Easing function (ease-out)
    const easeOut = 1 - Math.pow(1 - progress, 3)
    displayNumber.value = Math.round(start + (end - start) * easeOut)

    if (progress < 1) {
      animationFrame = requestAnimationFrame(update)
    }
  }

  if (animationFrame) {
    cancelAnimationFrame(animationFrame)
  }
  animationFrame = requestAnimationFrame(update)
}

onMounted(() => {
  animateCounter()
})

watch(targetNumber, () => {
  animateCounter()
})
</script>

<template>
  <div
    class="lcms-counter"
    :class="[
      `lcms-counter--align-${alignment}`,
      `lcms-counter--size-${numberSize}`,
      { 'has-hover': !!(data.hover_number_color || data.hover_title_color || data.hover_prefix_color || data.hover_lift || (data.hover_scale !== undefined && data.hover_scale !== 1) || (data.hover_shadow && data.hover_shadow !== 'none')) }
    ]"
    :style="counterStyle"
  >
    <div class="lcms-counter__number">
      <span
        v-if="prefix"
        class="lcms-counter__prefix"
      >{{ prefix }}</span>
      <span class="lcms-counter__value">{{ displayNumber.toLocaleString() }}</span>
      <span
        v-if="suffix"
        class="lcms-counter__suffix"
      >{{ suffix }}</span>
    </div>
    <div
      v-if="title"
      class="lcms-counter__title"
    >
      {{ title }}
    </div>
  </div>
</template>

<style scoped>
.lcms-counter {
  transition: transform var(--transition-duration, 200ms) ease, box-shadow var(--transition-duration, 200ms) ease;
}

.lcms-counter.has-hover:hover {
  transform: translateY(var(--hover-lift, 0)) scale(var(--hover-scale, 1));
  box-shadow: var(--hover-shadow, none);
}

.lcms-counter__value,
.lcms-counter__prefix,
.lcms-counter__suffix {
  transition: color var(--transition-duration, 200ms) ease;
}

.lcms-counter__title {
  transition: color var(--transition-duration, 200ms) ease;
}

.lcms-counter.has-hover:hover .lcms-counter__value {
  color: var(--hover-number-color);
}

.lcms-counter.has-hover:hover .lcms-counter__title {
  color: var(--hover-title-color);
}

.lcms-counter.has-hover:hover .lcms-counter__prefix,
.lcms-counter.has-hover:hover .lcms-counter__suffix {
  color: var(--hover-prefix-color);
}
</style>
