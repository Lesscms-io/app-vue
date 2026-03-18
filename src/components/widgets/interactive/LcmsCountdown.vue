<script setup lang="ts">
/**
 * Countdown Widget
 *
 * Renders a countdown timer to a target date.
 * Uses element-group structure: config, value, label, item.
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { CountdownWidgetData } from '@/types/widgets'

defineOptions({
  inheritAttrs: false
})

interface Props {
  data: CountdownWidgetData
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const configGroup = computed(() => props.data.config || {})
const valueGroup = computed(() => props.data.value || {})
const labelGroup = computed(() => props.data.label || {})
const itemGroup = computed(() => props.data.item || {})

const targetDate = computed(() => new Date(configGroup.value.target_date || Date.now()))
const showDays = computed(() => configGroup.value.show_days !== false)
const showHours = computed(() => configGroup.value.show_hours !== false)
const showMinutes = computed(() => configGroup.value.show_minutes !== false)
const showSeconds = computed(() => configGroup.value.show_seconds !== false)
const separator = computed(() => configGroup.value.separator || ':')

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

const countdownStyle = computed(() => {
  const style: Record<string, string> = {}
  const vc = resolveColorValue(valueGroup.value.color)
  if (vc) style['--countdown-value-color'] = vc
  const vcHover = resolveColorValue(valueGroup.value['color:hover'])
  if (vcHover) style['--countdown-value-hover-color'] = vcHover
  const lc = resolveColorValue(labelGroup.value.color)
  if (lc) style['--countdown-label-color'] = lc
  const lcHover = resolveColorValue(labelGroup.value['color:hover'])
  if (lcHover) style['--countdown-label-hover-color'] = lcHover
  const bg = resolveColorValue(itemGroup.value.background)
  if (bg) style['--countdown-item-bg'] = bg
  const bgHover = resolveColorValue(itemGroup.value['background:hover'])
  if (bgHover) style['--countdown-item-hover-bg'] = bgHover
  return style
})

const days = ref(0)
const hours = ref(0)
const minutes = ref(0)
const seconds = ref(0)
const isExpired = ref(false)

let timer: ReturnType<typeof setInterval> | null = null

function updateCountdown() {
  const now = new Date().getTime()
  const target = targetDate.value.getTime()
  const diff = target - now

  if (diff <= 0) {
    isExpired.value = true
    days.value = 0
    hours.value = 0
    minutes.value = 0
    seconds.value = 0
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    return
  }

  isExpired.value = false
  days.value = Math.floor(diff / (1000 * 60 * 60 * 24))
  hours.value = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  minutes.value = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  seconds.value = Math.floor((diff % (1000 * 60)) / 1000)
}

function padNumber(num: number): string {
  return num.toString().padStart(2, '0')
}

onMounted(() => {
  updateCountdown()
  timer = setInterval(updateCountdown, 1000)
})

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
  }
})
</script>

<template>
  <div
    class="lcms-countdown"
    :class="{ 'lcms-countdown--expired': isExpired }"
    :style="countdownStyle"
  >
    <div
      v-if="showDays"
      class="lcms-countdown__unit"
    >
      <span class="lcms-countdown__value">{{ padNumber(days) }}</span>
      <span class="lcms-countdown__label">days</span>
    </div>
    <span v-if="showDays && (showHours || showMinutes || showSeconds)" class="lcms-countdown__separator">{{ separator }}</span>
    <div
      v-if="showHours"
      class="lcms-countdown__unit"
    >
      <span class="lcms-countdown__value">{{ padNumber(hours) }}</span>
      <span class="lcms-countdown__label">hours</span>
    </div>
    <span v-if="showHours && (showMinutes || showSeconds)" class="lcms-countdown__separator">{{ separator }}</span>
    <div
      v-if="showMinutes"
      class="lcms-countdown__unit"
    >
      <span class="lcms-countdown__value">{{ padNumber(minutes) }}</span>
      <span class="lcms-countdown__label">minutes</span>
    </div>
    <span v-if="showMinutes && showSeconds" class="lcms-countdown__separator">{{ separator }}</span>
    <div
      v-if="showSeconds"
      class="lcms-countdown__unit"
    >
      <span class="lcms-countdown__value">{{ padNumber(seconds) }}</span>
      <span class="lcms-countdown__label">seconds</span>
    </div>
  </div>
</template>

<style scoped>
.lcms-countdown__unit {
  background-color: var(--countdown-item-bg);
  transition: background-color 200ms ease;
}

.lcms-countdown__unit:hover {
  background-color: var(--countdown-item-hover-bg, var(--countdown-item-bg));
}

.lcms-countdown__value {
  color: var(--countdown-value-color);
  transition: color 200ms ease;
}

.lcms-countdown__unit:hover .lcms-countdown__value {
  color: var(--countdown-value-hover-color, var(--countdown-value-color));
}

.lcms-countdown__label {
  color: var(--countdown-label-color);
  transition: color 200ms ease;
}

.lcms-countdown__unit:hover .lcms-countdown__label {
  color: var(--countdown-label-hover-color, var(--countdown-label-color));
}
</style>
