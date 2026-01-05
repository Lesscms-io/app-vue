<template>
  <div class="lcms-icon-box" :class="positionClass">
    <div class="lcms-icon-box__icon" :style="iconStyles">
      <i :class="iconClass"></i>
    </div>
    <div class="lcms-icon-box__content" v-html="content"></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  data: {
    widget_type: string
    config: {
      icon?: string
      content?: string
      icon_position?: string
      icon_vertical_align?: string
      icon_size?: string | number
      icon_color?: string
      icon_background?: string
    }
    settings?: Record<string, unknown>
  }
}>()

const config = computed(() => props.data.config || {})

const iconClass = computed(() => config.value.icon || 'fas fa-star')

const content = computed(() => config.value.content || '')

const iconPosition = computed(() => config.value.icon_position || 'left')

const positionClass = computed(() => `lcms-icon-box--${iconPosition.value}`)

const iconStyles = computed(() => {
  const styles: Record<string, string> = {}

  if (config.value.icon_size) {
    styles.fontSize = `${config.value.icon_size}px`
  }
  if (config.value.icon_color) {
    styles.color = config.value.icon_color
  }
  if (config.value.icon_background) {
    styles.backgroundColor = config.value.icon_background
  }

  return styles
})
</script>

<style scoped>
.lcms-icon-box {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.lcms-icon-box--top {
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.lcms-icon-box--bottom {
  flex-direction: column-reverse;
  align-items: center;
  text-align: center;
}

.lcms-icon-box--left {
  flex-direction: row;
}

.lcms-icon-box--right {
  flex-direction: row-reverse;
}

.lcms-icon-box__icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  padding: 0.5rem;
  border-radius: 0.25rem;
}

.lcms-icon-box__content {
  flex: 1;
}
</style>
