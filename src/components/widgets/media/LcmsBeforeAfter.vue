<script setup lang="ts">
/**
 * Before / After Widget (premium)
 *
 * Two images under a draggable (or hover-following) divider, horizontal
 * or vertical. Keyboard accessible (arrow keys on the handle).
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

const config = computed(() => (props.data as any).widget || props.data || {})
const beforeGroup = computed(() => config.value.before || {})
const afterGroup = computed(() => config.value.after || {})
const configGroup = computed(() => config.value.config || {})
const handleGroup = computed(() => config.value.handle || {})
const labelGroup = computed(() => config.value.label || {})

const beforeImage = computed(() => beforeGroup.value.image || '')
const afterImage = computed(() => afterGroup.value.image || '')
const beforeLabel = computed(() => extractValue(beforeGroup.value.label) || '')
const afterLabel = computed(() => extractValue(afterGroup.value.label) || '')
const beforeAlt = computed(() => extractValue(beforeGroup.value.alt) || beforeLabel.value)
const afterAlt = computed(() => extractValue(afterGroup.value.alt) || afterLabel.value)
const showLabels = computed(() => configGroup.value.labels !== false && (beforeLabel.value || afterLabel.value))

const vertical = computed(() => configGroup.value.orientation === 'vertical')
const pos = ref(Number(configGroup.value.start ?? 50))

const frame = ref<HTMLElement | null>(null)
const dragging = ref(false)
function setFromEvent(e: PointerEvent) {
  const r = frame.value?.getBoundingClientRect()
  if (!r) return
  const p = vertical.value ? (e.clientY - r.top) / r.height : (e.clientX - r.left) / r.width
  pos.value = Math.min(100, Math.max(0, p * 100))
}
const onDown = (e: PointerEvent) => { dragging.value = true; setFromEvent(e); e.preventDefault() }
const onMove = (e: PointerEvent) => { if (dragging.value || configGroup.value.hover_move) setFromEvent(e) }
const onUp = () => { dragging.value = false }
const onKey = (e: KeyboardEvent) => {
  const dec = vertical.value ? 'ArrowUp' : 'ArrowLeft'
  const inc = vertical.value ? 'ArrowDown' : 'ArrowRight'
  if (e.key === dec) { pos.value = Math.max(0, pos.value - 2); e.preventDefault() }
  if (e.key === inc) { pos.value = Math.min(100, pos.value + 2); e.preventDefault() }
}
onMounted(() => { window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp) })
onBeforeUnmount(() => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp) })

const ratioStyle = computed(() => {
  const r = configGroup.value.ratio || '16:9'
  if (r === 'auto') return {}
  const [w, h] = r.split(':').map(Number)
  return { aspectRatio: `${w} / ${h}` }
})
const rootStyle = computed(() => ({
  '--ba-pos': `${pos.value}%`,
  '--ba-radius': `${configGroup.value.radius ?? 12}px`,
  '--ba-handle-color': resolveColor(handleGroup.value.color) || '#ffffff',
  '--ba-handle-color-hover': resolveColor(handleGroup.value['color:hover']) || resolveColor(handleGroup.value.color) || '#ffffff',
  '--ba-handle-width': `${handleGroup.value.width ?? 3}px`,
  '--ba-handle-size': `${handleGroup.value.size ?? 44}px`,
  '--ba-label-bg': resolveColor(labelGroup.value.background) || 'rgba(0,0,0,0.6)',
  '--ba-label-color': resolveColor(labelGroup.value.color) || '#ffffff'
}))
const rootClasses = computed(() => [
  'lcms-before-after',
  vertical.value ? 'ba--vertical' : 'ba--horizontal',
  `ba--handle-${handleGroup.value.style || 'circle'}`,
  `ba--labels-${labelGroup.value.position || 'bottom'}`,
  { 'ba--dragging': dragging.value }
])
</script>

<template>
  <div
    :class="rootClasses"
    :style="rootStyle"
  >
    <div
      ref="frame"
      class="ba-frame"
      :style="ratioStyle"
      @pointerdown="onDown"
    >
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
  </div>
</template>
