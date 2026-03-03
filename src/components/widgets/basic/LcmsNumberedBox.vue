<template>
  <div class="lcms-numbered-box" :class="positionClass">
    <div class="lcms-numbered-box__number" :style="numberStyles">
      {{ displayNumber }}
    </div>
    <div class="lcms-numbered-box__content" v-html="content"></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  data: {
    widget_type: string
    config: {
      number_position?: string
      number_vertical_align?: string
      number_size?: string | number
      number_color?: string
      number_font_weight?: string | number
      number_background?: string
      number_padding?: string | number
      number_border_radius?: string | number
    }
    settings?: Record<string, unknown>
  }
  itemIndex?: number
}>()

const config = computed(() => props.data.config || props.data || {})

const displayNumber = computed(() => {
  const idx = props.itemIndex ?? 0
  return String(idx + 1).padStart(2, '0')
})

const content = computed(() => config.value.content || '')

const numberPosition = computed(() => config.value.number_position || 'left')
const numberVerticalAlign = computed(() => config.value.number_vertical_align || 'top')

const positionClass = computed(() => {
  const classes = [`lcms-numbered-box--${numberPosition.value}`]
  if (numberPosition.value === 'left' || numberPosition.value === 'right') {
    classes.push(`lcms-numbered-box--align-${numberVerticalAlign.value}`)
  }
  return classes
})

const numberStyles = computed(() => {
  const styles: Record<string, string> = {}

  if (config.value.number_size) {
    styles.fontSize = `${config.value.number_size}px`
  }
  if (config.value.number_color) {
    styles.color = config.value.number_color
  }
  if (config.value.number_font_weight) {
    styles.fontWeight = String(config.value.number_font_weight)
  }
  if (config.value.number_background && config.value.number_background !== 'transparent') {
    styles.backgroundColor = config.value.number_background
  }
  const padding = parseInt(String(config.value.number_padding))
  if (!isNaN(padding) && padding > 0) {
    styles.padding = `${padding}px`
  }
  const br = parseInt(String(config.value.number_border_radius))
  if (!isNaN(br) && br > 0) {
    styles.borderRadius = `${br}px`
  }

  return styles
})
</script>

<style scoped>
.lcms-numbered-box {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.lcms-numbered-box--top {
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.lcms-numbered-box--bottom {
  flex-direction: column-reverse;
  align-items: center;
  text-align: center;
}

.lcms-numbered-box--left {
  flex-direction: row;
}

.lcms-numbered-box--right {
  flex-direction: row-reverse;
}

.lcms-numbered-box--align-top {
  align-items: flex-start;
}

.lcms-numbered-box--align-center {
  align-items: center;
}

.lcms-numbered-box--align-bottom {
  align-items: flex-end;
}

.lcms-numbered-box__number {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  font-weight: 700;
  line-height: 1;
  box-sizing: content-box;
  font-variant-numeric: tabular-nums;
}

.lcms-numbered-box__content {
  flex: 1;
}
</style>
