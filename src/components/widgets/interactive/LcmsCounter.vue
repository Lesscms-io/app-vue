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
      `lcms-counter--size-${numberSize}`
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
