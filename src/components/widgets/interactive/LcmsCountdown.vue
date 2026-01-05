<script setup lang="ts">
/**
 * Countdown Widget
 *
 * Renders a countdown timer to a target date.
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

const targetDate = computed(() => new Date(props.data.target_date || Date.now()))
const showDays = computed(() => props.data.show_days !== false)
const showHours = computed(() => props.data.show_hours !== false)
const showMinutes = computed(() => props.data.show_minutes !== false)
const showSeconds = computed(() => props.data.show_seconds !== false)

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
  >
    <div
      v-if="showDays"
      class="lcms-countdown__unit"
    >
      <span class="lcms-countdown__value">{{ padNumber(days) }}</span>
      <span class="lcms-countdown__label">days</span>
    </div>
    <div
      v-if="showHours"
      class="lcms-countdown__unit"
    >
      <span class="lcms-countdown__value">{{ padNumber(hours) }}</span>
      <span class="lcms-countdown__label">hours</span>
    </div>
    <div
      v-if="showMinutes"
      class="lcms-countdown__unit"
    >
      <span class="lcms-countdown__value">{{ padNumber(minutes) }}</span>
      <span class="lcms-countdown__label">minutes</span>
    </div>
    <div
      v-if="showSeconds"
      class="lcms-countdown__unit"
    >
      <span class="lcms-countdown__value">{{ padNumber(seconds) }}</span>
      <span class="lcms-countdown__label">seconds</span>
    </div>
  </div>
</template>
