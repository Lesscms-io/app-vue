<script setup lang="ts">
/**
 * Alert Widget
 *
 * Renders an alert box with optional dismiss functionality.
 * Uses element-group structure: icon, content, config.
 */

import { ref, computed } from 'vue'
import { useLanguage } from '@/composables/useLanguage'
import { resolveColor } from '@/utils/resolveColor'

defineOptions({
  inheritAttrs: false
})

interface Props {
  data: Record<string, any>
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const { extractValue } = useLanguage(props.language)

// Element groups with legacy fallbacks
const iconGroup = computed(() => props.data.icon || {})
const titleGroup = computed(() => props.data.title || {})
const textGroup = computed(() => props.data.text || {})
const configGroup = computed(() => props.data.config || {})

const showTitle = computed(() => configGroup.value.show_title !== undefined ? configGroup.value.show_title : (props.data.show_title !== false))
const title = computed(() => {
  const t = titleGroup.value.content || props.data.title
  return t ? extractValue(t) : ''
})
const content = computed(() => {
  const t = textGroup.value.content || props.data.message || props.data.content
  return t ? extractValue(t) : ''
})
const alertType = computed(() => configGroup.value.type || props.data.type || 'info')
const dismissible = computed(() => configGroup.value.dismissible || props.data.dismissible || false)
const customIcon = computed(() => iconGroup.value.icon || (typeof props.data.icon === 'string' ? props.data.icon : null))
const textColor = computed(() => resolveColor(textGroup.value.color) || null)
const textHoverColor = computed(() => resolveColor(textGroup.value['color:hover']) || null)

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

const alertStyles = computed(() => {
  const styles: Record<string, string> = {}
  if (textColor.value) styles.color = textColor.value
  if (textHoverColor.value) styles['--hover-text-color'] = textHoverColor.value
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
    :style="alertStyles"
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
