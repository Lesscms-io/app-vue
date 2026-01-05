<script setup lang="ts">
/**
 * Alert Widget
 *
 * Renders an alert box with optional dismiss functionality.
 */

import { ref, computed } from 'vue'
import { useLanguage } from '@/composables/useLanguage'
import type { AlertWidgetData } from '@/types/widgets'

defineOptions({
  inheritAttrs: false
})

interface Props {
  data: AlertWidgetData
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const { extractValue } = useLanguage(props.language)

const title = computed(() => props.data.title ? extractValue(props.data.title) : '')
const content = computed(() => extractValue(props.data.content))
const alertType = computed(() => props.data.type || 'info')
const dismissible = computed(() => props.data.dismissible || false)

const isDismissed = ref(false)

const iconClass = computed(() => {
  const icons: Record<string, string> = {
    info: 'fa-solid fa-circle-info',
    success: 'fa-solid fa-circle-check',
    warning: 'fa-solid fa-triangle-exclamation',
    danger: 'fa-solid fa-circle-xmark',
  }
  return icons[alertType.value] || icons.info
})

function dismiss() {
  isDismissed.value = true
}
</script>

<template>
  <div
    v-if="!isDismissed"
    class="lcms-alert"
    :class="`lcms-alert--${alertType}`"
    role="alert"
  >
    <div class="lcms-alert__icon">
      <i :class="iconClass" />
    </div>

    <div class="lcms-alert__content">
      <strong
        v-if="title"
        class="lcms-alert__title"
      >{{ title }}</strong>
      <span class="lcms-alert__message">{{ content }}</span>
    </div>

    <button
      v-if="dismissible"
      class="lcms-alert__dismiss"
      @click="dismiss"
    >
      <i class="fa-solid fa-xmark" />
    </button>
  </div>
</template>
