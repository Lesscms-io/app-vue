<template>
  <div class="lcms-icon-box" :class="positionClass" :data-source="contentSource">
    <div class="lcms-icon-box__icon" :style="iconStyles">
      <span v-if="isSvgIcon" class="lcms-icon-box__svg" v-html="svgContent"></span>
      <i v-else :class="iconClass"></i>
    </div>
    <div class="lcms-icon-box__content" v-html="content"></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

function resolveColor(val: string | null | undefined): string | null {
  if (!val) return null
  if (val === 'transparent') return 'transparent'
  if (val.startsWith('var:')) {
    const parts = val.split(':')
    const code = parts[1]
    const opacity = parts.length >= 3 ? parseInt(parts[2]) : 100
    if (opacity < 100) {
      return `color-mix(in srgb, var(--lcms-color-${code}) ${opacity}%, transparent)`
    }
    return `var(--lcms-color-${code})`
  }
  return val
}

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
      icon_border_radius?: string | number
    }
    settings?: Record<string, unknown>
  }
}>()

const config = computed(() => props.data.config || props.data || {})

const isSvgIcon = computed(() => (config.value.icon || '').startsWith('svg:'))
const svgContent = computed(() => isSvgIcon.value ? (config.value.icon || '').slice(4) : '')
const iconClass = computed(() => isSvgIcon.value ? '' : (config.value.icon || 'fas fa-star'))

const content = computed(() => config.value.html || config.value.content || '')

// Dynamic content source settings (for future dynamic mode)
const contentSource = computed(() => config.value.content_source || 'static')
const collectionCode = computed(() => config.value.collection_code || '')
const fieldCode = computed(() => config.value.field_code || '')
const entryId = computed(() => config.value.entry_id || '')
const entrySource = computed(() => config.value.entry_source || '')
const entryUrlSegment = computed(() => config.value.entry_url_segment || '')

const iconPadding = computed(() => config.value.icon_padding || '')
const iconVerticalAlign = computed(() => config.value.icon_vertical_align || 'top')

const iconPosition = computed(() => config.value.icon_position || 'left')

const positionClass = computed(() => {
  const classes = [`lcms-icon-box--${iconPosition.value}`]
  if (iconPosition.value === 'left' || iconPosition.value === 'right') {
    classes.push(`lcms-icon-box--align-${iconVerticalAlign.value}`)
  }
  return classes
})

const iconStyles = computed(() => {
  const styles: Record<string, string> = {}

  if (config.value.icon_size) {
    styles.fontSize = `${config.value.icon_size}px`
  }
  const color = resolveColor(config.value.icon_color)
  if (color) {
    styles.color = color
  }
  const bg = resolveColor(config.value.icon_background)
  if (bg) {
    styles.backgroundColor = bg
  }
  if (iconPadding.value) {
    styles.padding = `${iconPadding.value}px`
  }
  const br = parseInt(String(config.value.icon_border_radius))
  if (!isNaN(br) && br > 0) {
    styles.borderRadius = `${br}px`
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

.lcms-icon-box--align-top {
  align-items: flex-start;
}

.lcms-icon-box--align-center {
  align-items: center;
}

.lcms-icon-box--align-bottom {
  align-items: flex-end;
}

.lcms-icon-box__icon {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  padding: 0;
  line-height: 1;
  box-sizing: content-box;
}

.lcms-icon-box__content {
  flex: 1;
}

.lcms-icon-box__svg {
  display: inline-flex;
  width: 1em;
  height: 1em;
}

.lcms-icon-box__svg :deep(svg) {
  width: 100%;
  height: 100%;
}

.lcms-icon-box__svg :deep(svg[fill="none"]) {
  fill: none;
}

.lcms-icon-box__svg :deep(svg:not([fill])) {
  fill: currentColor;
}
</style>
