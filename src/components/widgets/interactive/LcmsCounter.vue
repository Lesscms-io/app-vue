<script setup lang="ts">
/**
 * Counter Widget
 *
 * Renders an animated counting number with prefix/suffix inline.
 * Element-group architecture: number, title, config groups.
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

// Element-group computed refs
const numberGroup = computed(() => props.data.number || {})
const titleGroup = computed(() => props.data.title || {})
const configGroup = computed(() => props.data.config || {})

// Element-group reads
const targetNumber = computed(() => parseFloat(numberGroup.value.number) || 0)
const decimals = computed(() => {
  const str = String(numberGroup.value.number || '')
  const dot = str.indexOf('.')
  return dot >= 0 ? str.length - dot - 1 : 0
})
const duration = computed(() => numberGroup.value.duration || 2000)
const numberSize = computed(() => numberGroup.value.size || 'xl')
const prefix = computed(() => numberGroup.value.prefix ? extractValue(numberGroup.value.prefix) : '')
const suffix = computed(() => numberGroup.value.suffix ? extractValue(numberGroup.value.suffix) : '')
const numberColor = computed(() => numberGroup.value.color || null)
const numberHoverColor = computed(() => numberGroup.value['color:hover'] || null)
const prefixColor = computed(() => numberGroup.value.prefix_color || null)

const titleText = computed(() => (titleGroup.value.html || titleGroup.value.content) ? extractValue(titleGroup.value.html || titleGroup.value.content) : '')
const titleColor = computed(() => titleGroup.value.color || null)
const titleHoverColor = computed(() => titleGroup.value['color:hover'] || null)

const numberTag = computed(() => numberGroup.value.tag || 'p')
const titleTag = computed(() => titleGroup.value.tag || 'p')
const alignment = computed(() => configGroup.value.alignment || 'center')
const gap = computed(() => {
  const val = configGroup.value.gap
  return val !== undefined && val !== null ? `${val}px` : '10px'
})

const hasHover = computed(() => !!(
  numberHoverColor.value ||
  titleHoverColor.value
))

const counterStyle = computed(() => {
  const style: Record<string, string> = {}
  const nc = resolveColorValue(numberColor.value)
  if (nc) style['--counter-number-color'] = nc
  const tc = resolveColorValue(titleColor.value)
  if (tc) style['--counter-title-color'] = tc
  const pc = resolveColorValue(prefixColor.value)
  if (pc) style['--counter-prefix-color'] = pc

  // hover CSS custom properties
  const hoverNumber = resolveColorValue(numberHoverColor.value)
  if (hoverNumber) style['--hover-number-color'] = hoverNumber
  const hoverTitle = resolveColorValue(titleHoverColor.value)
  if (hoverTitle) style['--hover-title-color'] = hoverTitle

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
    const raw = start + (end - start) * easeOut
    displayNumber.value = decimals.value > 0 ? parseFloat(raw.toFixed(decimals.value)) : Math.round(raw)

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
      { 'has-hover': hasHover }
    ]"
    :style="counterStyle"
  >
    <component :is="numberTag" class="lcms-counter__number">
      <span
        v-if="prefix"
        class="lcms-counter__prefix"
      >{{ prefix }}</span>
      <span class="lcms-counter__value">{{ displayNumber.toLocaleString() }}</span>
      <span
        v-if="suffix"
        class="lcms-counter__suffix"
      >{{ suffix }}</span>
    </component>
    <component
      :is="titleTag"
      v-if="titleText"
      class="lcms-counter__title"
      :style="{ marginTop: gap }"
    >
      {{ titleText }}
    </component>
  </div>
</template>

<style scoped>
.lcms-counter {
  transition: transform 200ms ease, box-shadow 200ms ease;
}

.lcms-counter.has-hover:hover .lcms-counter__value {
  color: var(--hover-number-color);
}

.lcms-counter.has-hover:hover .lcms-counter__title {
  color: var(--hover-title-color);
}

.lcms-counter__value,
.lcms-counter__prefix,
.lcms-counter__suffix {
  transition: color 200ms ease;
}

.lcms-counter__title {
  transition: color 200ms ease;
}
</style>
