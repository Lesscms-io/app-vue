<template>
  <div class="lcms-icon" :class="hoverClasses" :style="rootStyle">
    <span class="lcms-icon__icon" :style="iconStyles">
      <span v-if="isSvgIcon" class="lcms-icon__svg" v-html="svgContent"></span>
      <i v-else :class="iconClass"></i>
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  data: {
    widget_type: string
    config?: Record<string, any>
    settings?: Record<string, unknown>
    widget?: Record<string, any>
    icon?: Record<string, any>
    style?: Record<string, any>
  }
  language?: string
}>()

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

const config = computed(() => props.data.widget || props.data || {})
const iconGroup = computed(() => config.value.icon || {})

const iconValue = computed(() => {
  const val = iconGroup.value.icon
  if (!val || typeof val === 'object') return ''
  return val
})
const isSvgIcon = computed(() => (iconValue.value || '').startsWith('svg:'))
const svgContent = computed(() => isSvgIcon.value ? iconValue.value.slice(4) : '')
const iconClass = computed(() => isSvgIcon.value ? '' : (iconValue.value || 'fas fa-star'))

const hasHoverIconColor = computed(() => !!iconGroup.value['color:hover'])
const hasHoverIconBg = computed(() => !!iconGroup.value['background:hover'])
const hasHover = computed(() => hasHoverIconColor.value || hasHoverIconBg.value)

const hoverClasses = computed(() => ({
  'has-hover': hasHover.value,
  'has-hover-icon-color': hasHoverIconColor.value,
  'has-hover-icon-bg': hasHoverIconBg.value
}))

const rootStyle = computed(() => {
  const styles: Record<string, string> = {}
  styles['--transition-duration'] = '200ms'
  const hoverIconColor = resolveColor(iconGroup.value['color:hover'])
  if (hoverIconColor) styles['--hover-icon-color'] = hoverIconColor
  const hoverIconBg = resolveColor(iconGroup.value['background:hover'])
  if (hoverIconBg) styles['--hover-icon-bg'] = hoverIconBg
  return styles
})

const iconStyles = computed(() => {
  const styles: Record<string, string> = {}

  const size = iconGroup.value.size
  const padding = iconGroup.value.padding || 0
  const borderRadius = iconGroup.value.border_radius

  if (size !== undefined && size !== null) {
    styles.fontSize = `${Number(size)}px`
    styles.width = `${Number(size) + Number(padding) * 2}px`
    styles.height = `${Number(size) + Number(padding) * 2}px`
  }

  const color = resolveColor(iconGroup.value.color)
  if (color) styles.color = color

  const bg = resolveColor(iconGroup.value.background)
  if (bg) styles.backgroundColor = bg

  if (padding) styles.padding = `${padding}px`

  const br = parseInt(String(borderRadius))
  if (!isNaN(br) && br > 0) styles.borderRadius = `${br}px`

  return styles
})
</script>

<style scoped>
.lcms-icon {
  display: flex;
}

.lcms-icon__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  box-sizing: border-box;
  transition: color var(--transition-duration, 200ms) ease,
    background-color var(--transition-duration, 200ms) ease;
}

.lcms-icon__svg {
  display: inline-flex;
  width: 1em;
  height: 1em;
}

.lcms-icon__svg :deep(svg) {
  width: 100%;
  height: 100%;
  fill: currentColor;
}

.lcms-icon.has-hover-icon-color:hover .lcms-icon__icon {
  color: var(--hover-icon-color) !important;
}

.lcms-icon.has-hover-icon-bg:hover .lcms-icon__icon {
  background-color: var(--hover-icon-bg) !important;
}
</style>
