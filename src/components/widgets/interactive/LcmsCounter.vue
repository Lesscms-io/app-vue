<script setup lang="ts">
/**
 * Counter Widget
 *
 * Renders an animated counting number.
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
  <div class="lcms-counter">
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
