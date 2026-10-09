<script setup lang="ts">
/**
 * Counter Widget
 *
 * Animated number (count-up from `from` to `number`) with prefix/suffix.
 * Element-group architecture: number, label, config groups.
 * Legacy flat / pre-migration data is normalized on read (counterUtils.ts).
 *
 * Appearance: `number.style` = fill | outline. Outline draws the digits with
 * -webkit-text-stroke and fills them on hover of the whole widget.
 */

import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useLanguage } from '@/composables/useLanguage'
import type { CounterWidgetData } from '@/types/widgets'
import { normalizeCounterData, formatCounterValue, separatorChar } from './counterUtils'

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

const norm = computed(() => normalizeCounterData(props.data))

const numberGroup = computed(() => norm.value.number)
const labelGroup = computed(() => norm.value.label)
const configGroup = computed(() => norm.value.config)

const target = computed(() => parseFloat(String(numberGroup.value.number)) || 0)
const decimals = computed(() => {
  const explicit = numberGroup.value.decimals
  if (explicit !== null && explicit !== '' && !isNaN(Number(explicit))) {
    return Math.max(0, Math.min(6, Math.round(Number(explicit))))
  }
  const str = String(numberGroup.value.number ?? '')
  const dot = str.indexOf('.')
  return dot >= 0 ? str.length - dot - 1 : 0
})
const startValue = computed(() => {
  const from = numberGroup.value.from
  if (from !== null && from !== '' && !isNaN(Number(from))) return Number(from)
  return target.value > 1000 ? target.value - 20 : 0
})
const duration = computed(() => Math.max(0, parseInt(String(numberGroup.value.duration)) || 0))
const sepChar = computed(() => separatorChar(numberGroup.value.separator))

const numberSize = computed(() => numberGroup.value.size || 'xl')
const numberStyleMode = computed(() => (numberGroup.value.style === 'outline' ? 'outline' : 'fill'))
const prefix = computed(() => (numberGroup.value.prefix ? extractValue(numberGroup.value.prefix) : ''))
const suffix = computed(() => (numberGroup.value.suffix ? extractValue(numberGroup.value.suffix) : ''))
const numberTag = computed(() => numberGroup.value.tag || 'p')
const textStyleClass = computed(() => {
  const code = numberGroup.value.text_style
  return code && /^[a-z0-9_-]+$/i.test(code) ? `lcms-ts-${code}` : ''
})

const labelText = computed(() => {
  const t = labelGroup.value.text
  return t ? extractValue(t) : ''
})
const labelTag = computed(() => labelGroup.value.tag || 'p')

const alignment = computed(() => configGroup.value.alignment || 'center')
const gap = computed(() => {
  const val = configGroup.value.gap
  return val !== undefined && val !== null ? `${val}px` : '10px'
})

const hasColor = computed(() => !!numberGroup.value.color)
const hasHover = computed(() => !!numberGroup.value['color:hover'])

const counterStyle = computed(() => {
  const style: Record<string, string> = {}
  const nc = resolveColorValue(numberGroup.value.color)
  if (nc) style['--counter-color'] = nc
  const hc = resolveColorValue(numberGroup.value['color:hover'])
  if (hc) style['--counter-hover-color'] = hc
  const pc = resolveColorValue(numberGroup.value.prefix_color)
  if (pc) style['--counter-prefix-color'] = pc
  const tc = resolveColorValue(labelGroup.value.color)
  if (tc) style['--counter-label-color'] = tc
  const th = resolveColorValue(labelGroup.value['color:hover'])
  if (th) style['--counter-label-hover-color'] = th
  const ow = Number(numberGroup.value.outline_width)
  if (!isNaN(ow) && ow > 0) style['--counter-stroke-width'] = `${ow}px`
  return style
})

const numberInlineStyle = computed(() => {
  const fs = numberGroup.value.font_stretch
  if (fs === null || fs === undefined || fs === '' || isNaN(Number(fs))) return undefined
  return { fontStretch: `${Number(fs)}%` }
})

// SSR renders the real target so crawlers see e.g. "2010+" not "0+".
// The count-up runs only once the counter scrolls into view.
const displayNumber = ref(target.value)
const displayText = computed(() => formatCounterValue(displayNumber.value, decimals.value, sepChar.value))
let animationFrame: number | null = null
let observer: IntersectionObserver | null = null
let hasAnimated = false
const rootEl = ref<HTMLElement | null>(null)

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

function cancelFrame() {
  if (animationFrame !== null) {
    cancelAnimationFrame(animationFrame)
    animationFrame = null
  }
}

function animateCounter() {
  if (typeof window === 'undefined') return
  cancelFrame()
  const from = startValue.value
  const to = target.value
  const dur = duration.value
  if (prefersReducedMotion() || dur === 0) {
    displayNumber.value = to
    return
  }
  hasAnimated = true
  displayNumber.value = from
  const startTime = performance.now()

  // Ease-out quart, same curve as the design mock-up.
  function update(now: number) {
    const k = Math.min(1, (now - startTime) / dur)
    const eased = 1 - Math.pow(1 - k, 4)
    displayNumber.value = k >= 1 ? to : from + (to - from) * eased
    animationFrame = k < 1 ? requestAnimationFrame(update) : null
  }
  animationFrame = requestAnimationFrame(update)
}

onMounted(() => {
  if (typeof window === 'undefined') return
  if (!configGroup.value.animate_on_scroll || prefersReducedMotion()) return

  // No IntersectionObserver (old runtimes): animate immediately.
  if (typeof IntersectionObserver === 'undefined' || !rootEl.value) {
    animateCounter()
    return
  }

  observer = new IntersectionObserver(
    (entries) => {
      const visible = entries.some((e) => e.isIntersecting)
      if (visible) {
        animateCounter()
        if (configGroup.value.once) observer?.disconnect()
      } else if (!configGroup.value.once) {
        // Re-arm: next entry counts up again from the start value.
        cancelFrame()
        displayNumber.value = startValue.value
      }
    },
    { threshold: 0.6 },
  )
  observer.observe(rootEl.value)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
  cancelFrame()
})

// Live edits (preview/editor): replay the count-up only if it already ran,
// otherwise keep the static target so off-screen counters stay correct.
watch([target, startValue, duration], () => {
  if (typeof window === 'undefined') return
  if (hasAnimated && configGroup.value.animate_on_scroll) {
    animateCounter()
  } else {
    cancelFrame()
    displayNumber.value = target.value
  }
})
</script>

<template>
  <div
    ref="rootEl"
    class="lcms-counter"
    :class="[
      `lcms-counter--align-${alignment}`,
      `lcms-counter--size-${numberSize}`,
      `lcms-counter--${numberStyleMode}`,
      {
        'lcms-counter--has-color': hasColor,
        'lcms-counter--has-hover': hasHover
      }
    ]"
    :style="counterStyle"
  >
    <component
      :is="numberTag"
      class="lcms-counter__number"
      :class="textStyleClass"
      :style="numberInlineStyle"
    >
      <span
        v-if="prefix"
        class="lcms-counter__prefix"
      >{{ prefix }}</span>
      <span class="lcms-counter__value">{{ displayText }}</span>
      <span
        v-if="suffix"
        class="lcms-counter__suffix"
      >{{ suffix }}</span>
    </component>
    <component
      :is="labelTag"
      v-if="labelText"
      class="lcms-counter__label"
      :style="{ marginTop: gap }"
    >
      {{ labelText }}
    </component>
  </div>
</template>
