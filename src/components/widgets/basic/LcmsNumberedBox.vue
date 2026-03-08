<template>
  <div class="lcms-numbered-box" :class="[positionClass, { 'has-hover': !!(config.hover_card_background || config.hover_card_border_color || config.hover_lift || (config.hover_scale !== undefined && config.hover_scale !== 1) || (config.hover_shadow && config.hover_shadow !== 'none')) }]" :style="cardStyle">
    <div class="lcms-numbered-box__number" :style="numberStyles">
      {{ displayNumber }}
    </div>
    <div class="lcms-numbered-box__content" v-html="content"></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

function resolveColor(val: string | null | undefined): string | null {
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
  return val
}

const props = defineProps<{
  data: Record<string, any>
  itemIndex?: number
}>()

const config = computed(() => props.data.widget || props.data || {})

const displayNumber = computed(() => {
  const idx = props.itemIndex ?? 0
  return String(idx + 1).padStart(2, '0')
})

const content = computed(() => config.value.html || config.value.content || '')

const numberPosition = computed(() => config.value.number_position || 'left')
const numberVerticalAlign = computed(() => config.value.number_vertical_align || 'top')

const positionClass = computed(() => {
  const classes = [`lcms-numbered-box--${numberPosition.value}`]
  if (numberPosition.value === 'left' || numberPosition.value === 'right') {
    classes.push(`lcms-numbered-box--align-${numberVerticalAlign.value}`)
  }
  return classes
})

const cardStyle = computed(() => {
  const styles: Record<string, string> = {}
  const bg = resolveColor(config.value.card_background)
  if (bg && config.value.card_background !== 'transparent') {
    styles.backgroundColor = bg
  }
  if (config.value.card_padding) {
    const padVal = String(config.value.card_padding)
    styles.padding = /^\d+$/.test(padVal) ? `${padVal}px` : padVal
  }
  const br = parseInt(String(config.value.card_border_radius))
  if (!isNaN(br) && br > 0) {
    styles.borderRadius = `${br}px`
  }
  const borderColor = resolveColor(config.value.card_border_color)
  if (borderColor) {
    styles.border = `1px solid ${borderColor}`
  }

  // When card has its own background and is inside a multi-item cell with padding,
  // expand to fill the entire cell by using negative margin + matching padding
  if (bg && config.value.card_background !== 'transparent') {
    const is = config.value.item_settings as Record<string, any> | undefined
    if (is) {
      const pt = parseInt(is.paddingTop) || 0
      const pr = parseInt(is.paddingRight) || 0
      const pb = parseInt(is.paddingBottom) || 0
      const pl = parseInt(is.paddingLeft) || 0
      if (pt || pr || pb || pl) {
        styles.margin = `-${pt}px -${pr}px -${pb}px -${pl}px`
        styles.padding = `${pt}px ${pr}px ${pb}px ${pl}px`
        const cellBr = parseInt(is.borderRadius) || 0
        if (cellBr > 0) {
          styles.borderRadius = `${cellBr}px`
        }
      }
    }
  }

  // hover CSS custom properties
  const hoverBg = resolveColor(config.value.hover_card_background)
  if (hoverBg) styles['--hover-bg'] = hoverBg
  const hoverBorder = resolveColor(config.value.hover_card_border_color)
  if (hoverBorder) styles['--hover-border-color'] = hoverBorder
  styles['--transition-duration'] = `${config.value.transition_duration ?? 200}ms`

  // Hover transform effects
  const lift = config.value.hover_lift || 0
  if (lift) styles['--hover-lift'] = `-${lift}px`
  const scale = config.value.hover_scale
  if (scale && scale !== 1) styles['--hover-scale'] = String(scale)
  const shadowMap: Record<string, string> = { sm: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)', md: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)', lg: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)' }
  const shadowVal = config.value.hover_shadow || 'none'
  if (shadowVal !== 'none' && shadowMap[shadowVal]) styles['--hover-shadow'] = shadowMap[shadowVal]

  return styles
})

const numberStyles = computed(() => {
  const styles: Record<string, string> = {}

  if (config.value.number_size) {
    styles.fontSize = `${config.value.number_size}px`
  }
  const color = resolveColor(config.value.number_color)
  if (color) {
    styles.color = color
  }
  if (config.value.number_font_weight) {
    styles.fontWeight = String(config.value.number_font_weight)
  }
  const bg = resolveColor(config.value.number_background)
  if (bg && config.value.number_background !== 'transparent') {
    styles.backgroundColor = bg
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
  transition: background-color var(--transition-duration, 200ms) ease, border-color var(--transition-duration, 200ms) ease, transform var(--transition-duration, 200ms) ease, box-shadow var(--transition-duration, 200ms) ease;
}

.lcms-numbered-box.has-hover:hover {
  background-color: var(--hover-bg);
  border-color: var(--hover-border-color);
  transform: translateY(var(--hover-lift, 0)) scale(var(--hover-scale, 1));
  box-shadow: var(--hover-shadow, none);
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
