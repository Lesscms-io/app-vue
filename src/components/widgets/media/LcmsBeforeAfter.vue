<script setup lang="ts">
/**
 * Before / After Widget (premium)
 *
 * Two modes:
 * - standard: two images under a draggable (or hover-following) divider.
 * - thermal:  one photo, cold (left) / hot (right) thermal-vision layers split
 *             by the divider, optional colour scale below.
 * Both modes: auto demo (one sweep of the divider on scroll-in, once),
 * keyboard accessible (arrow keys on the handle), reduced-motion aware.
 * Legacy data (flat label texts in before/after.label, handle.color as fill,
 * config.start) is normalised on read.
 */

import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { useLanguage } from '@/composables/useLanguage'
import { resolveColor } from '@/utils/resolveColor'
import type { BeforeAfterWidgetData } from '@/types/widgets'

defineOptions({ inheritAttrs: false })

interface Props {
  data: BeforeAfterWidgetData
  settings?: Record<string, any>
  language?: string
}
const props = defineProps<Props>()
const { extractValue } = useLanguage(props.language)

const config = computed<any>(() => (props.data as any).widget || props.data || {})
const beforeGroup = computed<any>(() => config.value.before || {})
const afterGroup = computed<any>(() => config.value.after || {})
const configGroup = computed<any>(() => config.value.config || {})
const handleGroup = computed<any>(() => config.value.handle || {})
const labelsGroup = computed<any>(() => ({ ...(config.value.label || {}), ...(config.value.labels || {}) }))
const thermalGroup = computed<any>(() => config.value.thermal || {})

const thermal = computed(() => configGroup.value.mode === 'thermal')
const beforeImage = computed(() => (thermal.value ? '' : beforeGroup.value.image || ''))
const afterImage = computed(() => afterGroup.value.image || '')
const beforeLabel = computed(() => extractValue(labelsGroup.value.before) || extractValue(beforeGroup.value.label) || '')
const afterLabel = computed(() => extractValue(labelsGroup.value.after) || extractValue(afterGroup.value.label) || '')
const beforeAlt = computed(() => extractValue(beforeGroup.value.alt) || beforeLabel.value)
const afterAlt = computed(() => extractValue(afterGroup.value.alt) || afterLabel.value)
const isEn = computed(() => (props.language || 'pl') === 'en')
const minLabel = computed(() => extractValue(thermalGroup.value.min_label) || (isEn.value ? 'cold' : 'zimno'))
const maxLabel = computed(() => extractValue(thermalGroup.value.max_label) || (isEn.value ? 'hot' : 'ciepło'))
const showScale = computed(() => thermal.value && configGroup.value.show_scale !== false)
const intensity = computed(() => Math.min(100, Math.max(0, Number(thermalGroup.value.intensity ?? 100))) / 100)
const showLabels = computed(() => configGroup.value.labels !== false && (beforeLabel.value || afterLabel.value))

const vertical = computed(() => configGroup.value.orientation === 'vertical')
const startPos = () => Number(configGroup.value.start_position ?? configGroup.value.start ?? 50)
const pos = ref(startPos())

const frame = ref<HTMLElement | null>(null)
const root = ref<HTMLElement | null>(null)
const dragging = ref(false)
function setFromEvent(e: PointerEvent) {
  const r = frame.value?.getBoundingClientRect()
  if (!r) return
  const p = vertical.value ? (e.clientY - r.top) / r.height : (e.clientX - r.left) / r.width
  pos.value = Math.min(100, Math.max(0, p * 100))
}
const onDown = (e: PointerEvent) => { stopDemo(); dragging.value = true; setFromEvent(e); e.preventDefault() }
const onMove = (e: PointerEvent) => { if (dragging.value || configGroup.value.hover_move) setFromEvent(e) }
const onUp = () => { dragging.value = false }
const onKey = (e: KeyboardEvent) => {
  stopDemo()
  const dec = vertical.value ? 'ArrowUp' : 'ArrowLeft'
  const inc = vertical.value ? 'ArrowDown' : 'ArrowRight'
  if (e.key === dec) { pos.value = Math.max(0, pos.value - 2); e.preventDefault() }
  if (e.key === inc) { pos.value = Math.min(100, pos.value + 2); e.preventDefault() }
}

// Auto demo: one sweep of the divider when the widget enters the viewport.
let demoRaf: number | null = null
let demoIo: IntersectionObserver | null = null
let demoDone = false
function stopDemo() { if (demoRaf !== null) cancelAnimationFrame(demoRaf); demoRaf = null }
function runDemo() {
  if (demoDone || configGroup.value.auto_demo !== true) return
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  demoDone = true
  const base = startPos()
  const t0 = performance.now()
  const step = (t: number) => {
    const k = (t - t0) / 2200
    if (k >= 1) { pos.value = base; demoRaf = null; return }
    pos.value = Math.min(100, Math.max(0, base + Math.sin(k * Math.PI * 2) * 32))
    demoRaf = requestAnimationFrame(step)
  }
  demoRaf = requestAnimationFrame(step)
}

onMounted(() => {
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  if (root.value && typeof IntersectionObserver !== 'undefined') {
    demoIo = new IntersectionObserver((es) => {
      if (es[0]?.isIntersecting) { demoIo?.disconnect(); runDemo() }
    }, { threshold: 0.5 })
    demoIo.observe(root.value)
  }
})
onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onMove)
  window.removeEventListener('pointerup', onUp)
  demoIo?.disconnect()
  stopDemo()
})

const ratioStyle = computed(() => {
  const r = configGroup.value.ratio || '16:9'
  if (r === 'auto') return {}
  const [w, h] = r.split(':').map(Number)
  return { aspectRatio: `${w} / ${h}` }
})
// Handle fill = background (new) or color (legacy); arrow = color only once background is set
const handleFill = computed(() => resolveColor(handleGroup.value.background ?? handleGroup.value.color) || '#ffffff')
const handleArrow = computed(() => (handleGroup.value.background != null ? resolveColor(handleGroup.value.color) : '') || '#111827')
const rootStyle = computed(() => ({
  '--ba-pos': `${pos.value}%`,
  '--ba-radius': `${configGroup.value.radius ?? 12}px`,
  '--ba-th-opacity': String(intensity.value),
  '--ba-handle-color': handleFill.value,
  '--ba-handle-color-hover': resolveColor(handleGroup.value['color:hover']) || handleFill.value,
  '--ba-handle-arrow': handleArrow.value,
  '--ba-handle-width': `${handleGroup.value.width ?? 3}px`,
  '--ba-handle-size': `${handleGroup.value.size ?? 44}px`,
  '--ba-label-bg': resolveColor(labelsGroup.value.background) || 'rgba(0,0,0,0.6)',
  '--ba-label-color': resolveColor(labelsGroup.value.color) || '#ffffff'
}))
const rootClasses = computed(() => [
  'lcms-before-after',
  vertical.value ? 'ba--vertical' : 'ba--horizontal',
  thermal.value ? 'ba--thermal' : 'ba--standard',
  `ba--handle-${handleGroup.value.style || 'circle'}`,
  `ba--labels-${labelsGroup.value.position || (thermal.value ? 'top' : 'bottom')}`,
  { 'ba--dragging': dragging.value }
])
</script>

<template>
  <div
    ref="root"
    :class="rootClasses"
    :style="rootStyle"
  >
    <div
      ref="frame"
      class="ba-frame"
      :style="ratioStyle"
      @pointerdown="onDown"
    >
      <template v-if="thermal && afterImage">
        <div class="ba-th ba-th--cold">
          <img
            :src="afterImage"
            :alt="afterAlt"
            draggable="false"
            loading="lazy"
          >
        </div>
        <div class="ba-th ba-th--hot">
          <img
            :src="afterImage"
            :alt="afterAlt"
            draggable="false"
            loading="lazy"
          >
        </div>
      </template>
      <template v-else>
        <img
          v-if="afterImage"
          class="ba-img ba-img--after"
          :src="afterImage"
          :alt="afterAlt"
          draggable="false"
          loading="lazy"
        >
        <div class="ba-clip">
          <img
            v-if="beforeImage"
            class="ba-img ba-img--before"
            :src="beforeImage"
            :alt="beforeAlt"
            draggable="false"
            loading="lazy"
          >
        </div>
      </template>
      <template v-if="showLabels">
        <span
          v-if="beforeLabel"
          class="ba-label ba-label--before"
        >{{ beforeLabel }}</span>
        <span
          v-if="afterLabel"
          class="ba-label ba-label--after"
        >{{ afterLabel }}</span>
      </template>
      <div
        class="ba-divider"
        role="slider"
        tabindex="0"
        :aria-orientation="vertical ? 'vertical' : 'horizontal'"
        :aria-valuenow="Math.round(pos)"
        aria-valuemin="0"
        aria-valuemax="100"
        @keydown="onKey"
      >
        <span class="ba-handle">
          <svg
            viewBox="0 0 24 24"
            width="1em"
            height="1em"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            :style="vertical ? 'transform: rotate(90deg)' : ''"
          >
            <path d="M9 6l-6 6 6 6M15 6l6 6-6 6" />
          </svg>
        </span>
      </div>
    </div>
    <div
      v-if="showScale"
      class="ba-scale"
    >
      <span>{{ minLabel }}</span>
      <i />
      <span>{{ maxLabel }}</span>
    </div>
  </div>
</template>
