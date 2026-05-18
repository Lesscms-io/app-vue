<template>
  <div class="lcms-numbered-box" :class="[positionClass, { 'has-hover': hasHover, 'has-hover-number-color': !!hoverNumberColor, 'has-hover-number-bg': !!hoverNumberBg, 'has-hover-title-color': !!hoverTitleColor, 'has-hover-text-color': !!hoverTextColor }]" :style="cardStyle">
    <div
      class="lcms-numbered-box__number"
      :style="numberStyles"
    >
      <span v-if="customNumberHtml" v-html="customNumberHtml" />
      <template v-else>{{ displayNumber }}</template>
    </div>
    <div class="lcms-numbered-box__content" :style="contentStyle">
      <DynamicHtml
        v-if="title"
        :tag="titleTag"
        :html="stripBlockWrappers(title)"
        class="lcms-numbered-box__title"
      />
      <div v-if="bodyHtml" v-html="bodyHtml" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DynamicHtml from '../DynamicHtml.vue'
import { useLanguage } from '@/composables/useLanguage'

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
  language?: string
}>()

const { extractValue } = useLanguage(props.language)

const config = computed(() => props.data.widget || props.data || {})

// Element groups
const numberGroup = computed(() => config.value.number || {})
const headingGroup = computed(() => config.value.heading || {})
const textGroup = computed(() => config.value.text || {})

const displayNumber = computed(() => {
  const idx = props.itemIndex ?? 0
  return String(idx + 1).padStart(2, '0')
})

const customNumberHtml = computed(() => {
  const raw = extractValue(numberGroup.value.html) || ''
  if (!raw) return ''
  // Treat empty TipTap content (e.g. <p></p>) as no override → auto-counter
  const textContent = raw.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, '').trim()
  if (!textContent) return ''
  return stripBlockWrappers(raw)
})

// Strip block-level wrappers (p, div, h1-h6) from heading HTML to avoid invalid
// nesting in SSR — DynamicHtml re-wraps with titleTag (e.g. h3), so a saved
// `<h3>...</h3>` from TipTap becomes `<h3><h3>...</h3></h3>` which the parser
// auto-collapses, leaving the title's class on an empty element.
function stripBlockWrappers(html: string): string {
  if (!html) return ''
  return html.replace(/^<(p|div|h[1-6])[^>]*>(.*)<\/\1>$/s, '$2').trim()
}

// Heading
const title = computed(() => extractValue(headingGroup.value.html || headingGroup.value.content) || '')
const titleTag = computed(() => headingGroup.value.tag || 'h3')
const titleColor = computed(() => resolveColor(headingGroup.value.color) || '')

// Content
const bodyHtml = computed(() => extractValue(textGroup.value.html || textGroup.value.content) || '')
const textColor = computed(() => resolveColor(textGroup.value.color) || '')

// Number properties
const numberPosition = computed(() => numberGroup.value.position || 'left')
const numberVerticalAlign = computed(() => numberGroup.value.vertical_align || 'top')

const positionClass = computed(() => {
  const classes = [`lcms-numbered-box--${numberPosition.value}`]
  classes.push(`lcms-numbered-box--align-${numberVerticalAlign.value}`)
  return classes
})

// Hover color effects
const hoverNumberColor = computed(() => resolveColor(numberGroup.value['color:hover']) || '')
const hoverNumberBg = computed(() => resolveColor(numberGroup.value['background:hover']) || '')
const hoverTitleColor = computed(() => resolveColor(headingGroup.value['color:hover']) || '')
const hoverTextColor = computed(() => resolveColor(textGroup.value['color:hover']) || '')

const hasHover = computed(() => !!(hoverNumberColor.value || hoverNumberBg.value || hoverTitleColor.value || hoverTextColor.value))

const contentStyle = computed(() => {
  const styles: Record<string, string> = {}
  if (titleColor.value) styles['--title-color'] = titleColor.value
  if (textColor.value) styles['--text-color'] = textColor.value
  return styles
})

const cardStyle = computed(() => {
  const styles: Record<string, string> = {}

  styles['--transition-duration'] = '200ms'

  // Hover color CSS variables
  if (hoverNumberColor.value) styles['--hover-number-color'] = hoverNumberColor.value
  if (hoverNumberBg.value) styles['--hover-number-bg'] = hoverNumberBg.value
  if (hoverTitleColor.value) styles['--hover-title-color'] = hoverTitleColor.value
  if (hoverTextColor.value) styles['--hover-text-color'] = hoverTextColor.value

  return styles
})

const numberStyles = computed(() => {
  const styles: Record<string, string> = {}

  const size = numberGroup.value.size
  if (size) styles.fontSize = `${size}px`

  const color = resolveColor(numberGroup.value.color)
  if (color) styles.color = color

  const fw = numberGroup.value.font_weight
  if (fw) styles.fontWeight = String(fw)

  const bg = resolveColor(numberGroup.value.background)
  if (bg && numberGroup.value.background !== 'transparent') styles.backgroundColor = bg

  const padding = parseInt(String(numberGroup.value.padding))
  if (!isNaN(padding) && padding > 0) styles.padding = `${padding}px`

  const br = parseInt(String(numberGroup.value.border_radius))
  if (!isNaN(br) && br > 0) styles.borderRadius = `${br}px`

  return styles
})
</script>

<style scoped>
.lcms-numbered-box {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  transition: transform var(--transition-duration, 200ms) ease, box-shadow var(--transition-duration, 200ms) ease, background-color var(--transition-duration, 200ms) ease, border-color var(--transition-duration, 200ms) ease;
}

.lcms-numbered-box.has-hover:hover {
  transform: translateY(var(--hover-lift, 0)) scale(var(--hover-scale, 1));
  box-shadow: var(--hover-shadow, none);
  background-color: var(--hover-card-bg);
  border-color: var(--hover-card-border-color);
}

.lcms-numbered-box--top {
  flex-direction: column;
}

.lcms-numbered-box--bottom {
  flex-direction: column-reverse;
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
  text-align: center;
}

.lcms-numbered-box--align-bottom {
  align-items: flex-end;
  text-align: right;
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
  transition: color var(--transition-duration, 200ms) ease, background-color var(--transition-duration, 200ms) ease;
}

.lcms-numbered-box__number :deep(p),
.lcms-numbered-box__number :deep(h1),
.lcms-numbered-box__number :deep(h2),
.lcms-numbered-box__number :deep(h3),
.lcms-numbered-box__number :deep(h4),
.lcms-numbered-box__number :deep(h5),
.lcms-numbered-box__number :deep(h6) {
  margin: 0;
  font-size: inherit;
  font-weight: inherit;
  line-height: inherit;
  color: inherit;
  display: inline;
}

.lcms-numbered-box.has-hover.has-hover-number-color:hover .lcms-numbered-box__number {
  color: var(--hover-number-color) !important;
}

.lcms-numbered-box.has-hover.has-hover-number-bg:hover .lcms-numbered-box__number {
  background-color: var(--hover-number-bg) !important;
}

.lcms-numbered-box__content {
  flex: 1;
}

/* Title (separate field) - rendered via dynamic tag (h2, h3, etc.) */
.lcms-numbered-box__title {
  font-weight: 700;
  color: var(--title-color, inherit);
  margin: 0 0 0.3em 0;
  transition: color var(--transition-duration, 200ms) ease;
}
.lcms-numbered-box__title:is(h1) { font-size: var(--lcms-h1-font-size, 2.5rem); font-weight: var(--lcms-h1-font-weight, 700); color: var(--title-color, var(--lcms-h1-color, inherit)); }
.lcms-numbered-box__title:is(h2) { font-size: var(--lcms-h2-font-size, 2rem); font-weight: var(--lcms-h2-font-weight, 700); color: var(--title-color, var(--lcms-h2-color, inherit)); }
.lcms-numbered-box__title:is(h3) { font-size: var(--lcms-h3-font-size, 1.75rem); font-weight: var(--lcms-h3-font-weight, 700); color: var(--title-color, var(--lcms-h3-color, inherit)); }
.lcms-numbered-box__title:is(h4) { font-size: var(--lcms-h4-font-size, 1.5rem); font-weight: var(--lcms-h4-font-weight, 700); color: var(--title-color, var(--lcms-h4-color, inherit)); }
.lcms-numbered-box__title:is(h5) { font-size: var(--lcms-h5-font-size, 1.25rem); font-weight: var(--lcms-h5-font-weight, 700); color: var(--title-color, var(--lcms-h5-color, inherit)); }
.lcms-numbered-box__title:is(h6) { font-size: var(--lcms-h6-font-size, 1rem); font-weight: var(--lcms-h6-font-weight, 700); color: var(--title-color, var(--lcms-h6-color, inherit)); }

/* Title style: apply to headings inside rich text (legacy) */
.lcms-numbered-box__content :deep(h1) { font-size: var(--lcms-h1-font-size, 2.5rem); font-weight: var(--lcms-h1-font-weight, inherit); color: var(--title-color, var(--lcms-h1-color, inherit)); transition: color var(--transition-duration, 200ms) ease; }
.lcms-numbered-box__content :deep(h2) { font-size: var(--lcms-h2-font-size, 2rem); font-weight: var(--lcms-h2-font-weight, inherit); color: var(--title-color, var(--lcms-h2-color, inherit)); transition: color var(--transition-duration, 200ms) ease; }
.lcms-numbered-box__content :deep(h3) { font-size: var(--lcms-h3-font-size, 1.75rem); font-weight: var(--lcms-h3-font-weight, inherit); color: var(--title-color, var(--lcms-h3-color, inherit)); transition: color var(--transition-duration, 200ms) ease; }
.lcms-numbered-box__content :deep(h4) { font-size: var(--lcms-h4-font-size, 1.5rem); font-weight: var(--lcms-h4-font-weight, inherit); color: var(--title-color, var(--lcms-h4-color, inherit)); transition: color var(--transition-duration, 200ms) ease; }
.lcms-numbered-box__content :deep(h5) { font-size: var(--lcms-h5-font-size, 1.25rem); font-weight: var(--lcms-h5-font-weight, inherit); color: var(--title-color, var(--lcms-h5-color, inherit)); transition: color var(--transition-duration, 200ms) ease; }
.lcms-numbered-box__content :deep(h6) { font-size: var(--lcms-h6-font-size, 1rem); font-weight: var(--lcms-h6-font-weight, inherit); color: var(--title-color, var(--lcms-h6-color, inherit)); transition: color var(--transition-duration, 200ms) ease; }

/* Text style: apply to paragraphs */
.lcms-numbered-box__content :deep(p) {
  font-size: inherit;
  font-weight: inherit;
  color: var(--text-color, inherit);
  transition: color var(--transition-duration, 200ms) ease;
}

/* Hover title color */
.lcms-numbered-box.has-hover.has-hover-title-color:hover .lcms-numbered-box__title,
.lcms-numbered-box.has-hover.has-hover-title-color:hover .lcms-numbered-box__content :deep(h1),
.lcms-numbered-box.has-hover.has-hover-title-color:hover .lcms-numbered-box__content :deep(h2),
.lcms-numbered-box.has-hover.has-hover-title-color:hover .lcms-numbered-box__content :deep(h3),
.lcms-numbered-box.has-hover.has-hover-title-color:hover .lcms-numbered-box__content :deep(h4),
.lcms-numbered-box.has-hover.has-hover-title-color:hover .lcms-numbered-box__content :deep(h5),
.lcms-numbered-box.has-hover.has-hover-title-color:hover .lcms-numbered-box__content :deep(h6) {
  color: var(--hover-title-color) !important;
}

/* Hover text color */
.lcms-numbered-box.has-hover.has-hover-text-color:hover .lcms-numbered-box__content :deep(p) {
  color: var(--hover-text-color) !important;
}
</style>
