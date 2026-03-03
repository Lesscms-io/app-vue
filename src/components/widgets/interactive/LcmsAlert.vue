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

const showTitle = computed(() => props.data.show_title !== false)
const title = computed(() => props.data.title ? extractValue(props.data.title) : '')
const content = computed(() => extractValue(props.data.message) || extractValue(props.data.content))
const alertType = computed(() => props.data.type || 'info')
const dismissible = computed(() => props.data.dismissible || false)
const customIcon = computed(() => props.data.icon || null)
const customBgColor = computed(() => props.data.background_color || null)
const customBorderColor = computed(() => props.data.border_color || null)
const customTextColor = computed(() => props.data.text_color || null)

const isDismissed = ref(false)

const iconClass = computed(() => {
  if (customIcon.value) return customIcon.value
  const icons: Record<string, string> = {
    info: 'fa-solid fa-circle-info',
    success: 'fa-solid fa-circle-check',
    warning: 'fa-solid fa-triangle-exclamation',
    danger: 'fa-solid fa-circle-xmark',
  }
  return icons[alertType.value] || icons.info
})

const customStyles = computed(() => {
  const styles: Record<string, string> = {}
  if (customBgColor.value) styles.backgroundColor = customBgColor.value
  if (customBorderColor.value) styles.borderColor = customBorderColor.value
  if (customTextColor.value) styles.color = customTextColor.value
  return styles
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
    :style="customStyles"
    role="alert"
  >
    <div class="lcms-alert__icon">
      <i :class="iconClass" />
    </div>

    <div class="lcms-alert__content">
      <strong
        v-if="showTitle && title"
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
