<script setup lang="ts">
/**
 * Timeline Widget (renderer)
 *
 * Element-groups from transformer: line, marker, title, content, config, items.
 * Layout: vertical (left | right | alternate) or horizontal (N columns with a line
 * through the marker centers; mobile falls back to a vertical list).
 * Animation (config.animate_line): line draws in, steps light up in sequence on
 * entering the viewport. Disabled for prefers-reduced-motion.
 */

import { computed, onMounted, ref } from 'vue'
import { useLanguage } from '@/composables/useLanguage'
import { resolveColor } from '@/utils/resolveColor'
import {
  formatDateLabel,
  humanizeRelative,
  humanizeDuration,
  durationLabel
} from '@/utils/dateDuration'

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

const ALLOWED_TAGS = ['h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'div']

// Accepts both the wrapped ({ widget }) and the flat transformer output
const w = computed<Record<string, any>>(() => props.data?.widget || props.data || {})

const lineGroup = computed(() => w.value.line || {})
const markerGroup = computed(() => w.value.marker || {})
const titleGroup = computed(() => w.value.title || {})
const contentGroup = computed(() => w.value.content || {})
const configGroup = computed(() => w.value.config || {})
const itemsGroup = computed(() => w.value.items || [])

const lang = computed(() => props.language || 'pl')
const layout = computed<'vertical' | 'horizontal'>(() =>
  configGroup.value.layout === 'horizontal' ? 'horizontal' : 'vertical'
)
const side = computed<string>(() => configGroup.value.side || 'left')
// Legacy (bez grupy marker) = wariant 'cards' (stary wygląd); normalizowane w transformerze
const variant = computed(() => configGroup.value.variant === 'cards' ? 'cards' : 'steps')
const showRelative = computed(() => !!configGroup.value.show_relative)
const showDuration = computed(() => !!configGroup.value.show_duration)
const durationPrefix = computed(() => durationLabel(lang.value))

const markerStyle = computed(() => markerGroup.value.style === 'filled' ? 'filled' : 'outline')
const markerContent = computed(() => markerGroup.value.content || 'number')
const titleTag = computed(() => {
  const t = titleGroup.value.tag
  return ALLOWED_TAGS.includes(t) ? t : 'h4'
})
// Named project text style (Projekt → Style → Style tekstu) for step titles.
const titleTextClass = computed(() => {
  const code = titleGroup.value.text_style
  return code && /^[a-z0-9_-]+$/i.test(code) ? `lcms-ts-${code}` : ''
})

const items = computed(() => {
  const raw = itemsGroup.value
  if (!Array.isArray(raw)) return []
  return raw.map((item, index) => {
    const dateFrom = item.date_from || ''
    const dateTo = item.date_to || ''
    // `date` (a.k.a. date_html) is an optional custom label; when empty we
    // auto-format the header from the structured date(s).
    const customLabel = extractValue(item.date_html || item.date)
    let itemSide = 'h'
    if (layout.value === 'vertical') {
      itemSide = side.value === 'alternate' ? (index % 2 === 0 ? 'left' : 'right') : side.value
    }
    const hasIcon = markerContent.value === 'icon' && !!item.icon
    return {
      side: itemSide,
      icon: hasIcon ? item.icon : '',
      date: customLabel || formatDateLabel(dateFrom, dateTo, lang.value),
      title: extractValue(item.title_html || item.title),
      content: extractValue(item.html || item.content),
      relative: showRelative.value ? humanizeRelative(dateFrom, lang.value) : '',
      duration: showDuration.value ? humanizeDuration(dateFrom, dateTo, lang.value) : ''
    }
  })
})

// ---------- Colors & sizes (CSS vars, same names as the page-builder preview) ----------
const timelineStyle = computed(() => {
  const s: Record<string, string> = {}
  const set = (k: string, v: string) => { if (v) s[k] = v }
  const m = markerGroup.value
  const size = Number(m.size) || 56
  const lineColor = resolveColor(lineGroup.value.color)
  const activeColor = resolveColor(lineGroup.value.active_color) || resolveColor('var:primary')
  const markerColor = resolveColor(m.color) || resolveColor('var:primary')
  const markerBg = resolveColor(m.background)
  const numberColor = resolveColor(m.number_color)
  set('--tl-line-color', lineColor)
  set('--tl-active-color', activeColor)
  set('--tl-line-width', `${Number(lineGroup.value.width) || 2}px`)
  s['--tl-marker-size'] = `${size}px`
  s['--tl-marker-font'] = `${Math.round(size * 0.32)}px`
  set('--tl-marker-color', markerColor)
  if (markerStyle.value === 'filled') {
    set('--tl-marker-bg', markerColor)
    s['--tl-number-color'] = numberColor || '#fff'
  } else {
    s['--tl-marker-bg'] = markerBg || 'var(--lcms-color-background, #fff)'
    set('--tl-number-color', numberColor || markerColor)
  }
  set('--tl-hover-line', resolveColor(lineGroup.value['color:hover']))
  set('--tl-hover-marker', resolveColor(m['color:hover']))
  set('--tl-title-color', resolveColor(titleGroup.value.color))
  set('--tl-content-color', resolveColor(contentGroup.value.color))
  s['--tl-cols'] = String(Math.max(items.value.length, 1))
  return s
})

const hasHover = computed(() => !!(timelineStyle.value['--tl-hover-line'] || timelineStyle.value['--tl-hover-marker']))

// ---------- Animation ----------
const rootEl = ref<HTMLElement | null>(null)
const animated = ref(false)
const inView = ref(false)

onMounted(() => {
  if (!configGroup.value.animate_line) return
  if (typeof window === 'undefined') return
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  animated.value = true
  if (!('IntersectionObserver' in window) || !rootEl.value) {
    inView.value = true
    return
  }
  const io = new IntersectionObserver((entries) => {
    if (entries.some(e => e.isIntersecting)) {
      inView.value = true
      io.disconnect()
    }
  }, { threshold: 0.15 })
  io.observe(rootEl.value)
})
</script>

<template>
  <div
    ref="rootEl"
    class="lcms-timeline"
    :class="[
      `lcms-timeline--${layout}`,
      layout === 'vertical' ? `lcms-timeline--${side}` : '',
      `lcms-timeline--marker-${markerStyle}`,
      { 'lcms-timeline--cards': variant === 'cards' },
      {
        'has-hover': hasHover,
        'is-anim': animated,
        'is-in': inView
      }
    ]"
    :style="timelineStyle"
  >
    <div
      v-if="items.length"
      class="lcms-timeline__track"
    >
      <span class="lcms-timeline__fill" />
    </div>
    <ol class="lcms-timeline__list">
      <li
        v-for="(item, index) in items"
        :key="index"
        class="lcms-timeline__item"
        :class="`lcms-timeline__item--${item.side}`"
        :style="{ '--tl-i': index }"
      >
        <div
          class="lcms-timeline__marker"
          :class="{ 'lcms-timeline__marker--dot': markerContent === 'dot' }"
          aria-hidden="true"
        >
          <i
            v-if="item.icon"
            :class="item.icon"
          />
          <template v-else-if="markerContent !== 'dot'">
            {{ index + 1 }}
          </template>
        </div>

        <div class="lcms-timeline__body">
          <div
            v-if="item.date"
            class="lcms-timeline__date"
            v-html="item.date"
          />
          <!-- v-html on <component :is> is dropped in SSR — inner span carries it -->
          <component
            :is="titleTag"
            v-if="item.title"
            class="lcms-timeline__title"
            :class="titleTextClass"
          >
            <span v-html="item.title" />
          </component>
          <div
            v-if="item.content"
            class="lcms-timeline__content"
            v-html="item.content"
          />
          <div
            v-if="item.relative || item.duration"
            class="lcms-timeline__meta"
          >
            <span
              v-if="item.relative"
              class="lcms-timeline__relative"
            >{{ item.relative }}</span>
            <span
              v-if="item.duration"
              class="lcms-timeline__duration"
            >{{ durationPrefix }}: {{ item.duration }}</span>
          </div>
        </div>
      </li>
    </ol>
  </div>
</template>

<style scoped>
/* Keep layout in sync with fe/src/components/content-builder/widgets/TimelineWidget.vue */
.lcms-timeline {
  --tl-gap: 24px;
  --tl-ease: cubic-bezier(.77, 0, .18, 1);
  position: relative;
}

.lcms-timeline__list {
  position: relative;
  list-style: none;
  margin: 0;
  padding: 0;
}

.lcms-timeline__track {
  position: absolute;
  background: var(--tl-line-color, var(--lcms-color-border, #dee2e6));
  transition: background-color 200ms ease;
}

.lcms-timeline__fill {
  position: absolute;
  inset: 0;
  background: var(--tl-active-color, var(--lcms-color-primary, #50a5f1));
}

.lcms-timeline.has-hover:hover .lcms-timeline__track {
  background: var(--tl-hover-line, var(--tl-line-color, var(--lcms-color-border, #dee2e6)));
}

.lcms-timeline__item {
  position: relative;
  margin: 0 0 24px;
  list-style: none;
}

.lcms-timeline__marker {
  position: absolute;
  top: 0;
  box-sizing: border-box;
  width: var(--tl-marker-size, 56px);
  height: var(--tl-marker-size, 56px);
  border-radius: 50%;
  border: 2px solid var(--tl-marker-color, var(--lcms-color-primary, #50a5f1));
  background: var(--tl-marker-bg, #fff);
  color: var(--tl-number-color, var(--tl-marker-color, inherit));
  display: grid;
  place-items: center;
  font-weight: 900;
  font-size: var(--tl-marker-font, 18px);
  line-height: 1;
  z-index: 1;
  transition: background-color 200ms ease, border-color 200ms ease, color 200ms ease;
}

.lcms-timeline__marker--dot {
  font-size: 0;
}

.lcms-timeline.has-hover:hover .lcms-timeline__marker {
  border-color: var(--tl-hover-marker, var(--tl-marker-color, currentColor));
}

.lcms-timeline--marker-filled.has-hover:hover .lcms-timeline__marker {
  background: var(--tl-hover-marker, var(--tl-marker-color, currentColor));
}

.lcms-timeline__body {
  min-width: 0;
}

.lcms-timeline__date {
  font-size: 0.85em;
  color: var(--lcms-color-muted, #6c757d);
}

.lcms-timeline__title {
  margin: 0 0 6px;
  color: var(--tl-title-color, inherit);
}

.lcms-timeline__content {
  margin: 0;
  color: var(--tl-content-color, inherit);
  line-height: 1.55;
}

.lcms-timeline__meta {
  margin-top: 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 2px 12px;
  font-size: 0.8em;
  color: var(--lcms-color-muted, #6c757d);
}

.lcms-timeline__relative,
.lcms-timeline__duration {
  display: inline-flex;
  align-items: center;
}

.lcms-timeline__duration {
  font-style: italic;
}

/* ---------- VERTICAL ---------- */
.lcms-timeline--vertical .lcms-timeline__track {
  top: calc(var(--tl-marker-size) / 2);
  bottom: calc(var(--tl-marker-size) / 2);
  width: var(--tl-line-width, 2px);
  left: calc(var(--tl-marker-size) / 2 - var(--tl-line-width, 2px) / 2);
}

.lcms-timeline--vertical .lcms-timeline__item {
  padding-bottom: 8px;
  min-height: var(--tl-marker-size);
}

.lcms-timeline--vertical.lcms-timeline--left .lcms-timeline__marker { left: 0; }
.lcms-timeline--vertical.lcms-timeline--left .lcms-timeline__item { padding-left: calc(var(--tl-marker-size) + var(--tl-gap)); }

.lcms-timeline--vertical.lcms-timeline--right .lcms-timeline__track {
  left: auto;
  right: calc(var(--tl-marker-size) / 2 - var(--tl-line-width, 2px) / 2);
}
.lcms-timeline--vertical.lcms-timeline--right .lcms-timeline__marker { left: auto; right: 0; }
.lcms-timeline--vertical.lcms-timeline--right .lcms-timeline__item {
  padding-right: calc(var(--tl-marker-size) + var(--tl-gap));
  text-align: right;
}

.lcms-timeline--vertical.lcms-timeline--alternate .lcms-timeline__track {
  left: 50%;
  transform: translateX(-50%);
}
.lcms-timeline--vertical.lcms-timeline--alternate .lcms-timeline__item { width: 50%; }
.lcms-timeline--vertical.lcms-timeline--alternate .lcms-timeline__item--left {
  padding-right: calc(var(--tl-marker-size) / 2 + var(--tl-gap));
  text-align: right;
}
.lcms-timeline--vertical.lcms-timeline--alternate .lcms-timeline__item--left .lcms-timeline__marker {
  left: auto;
  right: calc(var(--tl-marker-size) / -2);
}
.lcms-timeline--vertical.lcms-timeline--alternate .lcms-timeline__item--right {
  margin-left: 50%;
  padding-left: calc(var(--tl-marker-size) / 2 + var(--tl-gap));
}
.lcms-timeline--vertical.lcms-timeline--alternate .lcms-timeline__item--right .lcms-timeline__marker {
  left: calc(var(--tl-marker-size) / -2);
  right: auto;
}

/* ---------- HORIZONTAL ---------- */
.lcms-timeline--horizontal .lcms-timeline__list {
  display: grid;
  grid-template-columns: repeat(var(--tl-cols, 5), minmax(0, 1fr));
  gap: var(--tl-gap);
}

.lcms-timeline--horizontal .lcms-timeline__track {
  top: calc(var(--tl-marker-size) / 2 - var(--tl-line-width, 2px) / 2);
  height: var(--tl-line-width, 2px);
  left: calc(100% / (var(--tl-cols, 5) * 2));
  right: calc(100% / (var(--tl-cols, 5) * 2));
}

.lcms-timeline--horizontal .lcms-timeline__item {
  margin-bottom: 0;
  padding-top: calc(var(--tl-marker-size) + 22px);
  text-align: center;
}

.lcms-timeline--horizontal .lcms-timeline__marker {
  left: 50%;
  transform: translateX(-50%);
}

/* Tablet: 2 columns, no line */
@media (max-width: 1100px) {
  .lcms-timeline--horizontal .lcms-timeline__list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    row-gap: 40px;
  }
  .lcms-timeline--horizontal .lcms-timeline__track { display: none; }
}

/* Mobile: horizontal and alternate become a single vertical list, line on the left */
@media (max-width: 768px) {
  .lcms-timeline--horizontal .lcms-timeline__list { display: block; }
  .lcms-timeline--horizontal .lcms-timeline__track {
    display: block;
    top: calc(var(--tl-marker-size) / 2);
    bottom: calc(var(--tl-marker-size) / 2);
    left: calc(var(--tl-marker-size) / 2 - var(--tl-line-width, 2px) / 2);
    right: auto;
    width: var(--tl-line-width, 2px);
    height: auto;
  }
  .lcms-timeline--horizontal .lcms-timeline__item {
    padding: 0 0 0 calc(var(--tl-marker-size) + var(--tl-gap));
    margin-bottom: 24px;
    text-align: left;
    min-height: var(--tl-marker-size);
  }
  .lcms-timeline--horizontal .lcms-timeline__marker { left: 0; transform: none; }

  .lcms-timeline--vertical.lcms-timeline--alternate .lcms-timeline__track {
    left: calc(var(--tl-marker-size) / 2 - var(--tl-line-width, 2px) / 2);
    transform: none;
  }
  .lcms-timeline--vertical.lcms-timeline--alternate .lcms-timeline__item,
  .lcms-timeline--vertical.lcms-timeline--alternate .lcms-timeline__item--left,
  .lcms-timeline--vertical.lcms-timeline--alternate .lcms-timeline__item--right {
    width: 100%;
    margin-left: 0;
    padding: 0 0 0 calc(var(--tl-marker-size) + var(--tl-gap));
    text-align: left;
  }
  .lcms-timeline--vertical.lcms-timeline--alternate .lcms-timeline__marker,
  .lcms-timeline--vertical.lcms-timeline--alternate .lcms-timeline__item--left .lcms-timeline__marker,
  .lcms-timeline--vertical.lcms-timeline--alternate .lcms-timeline__item--right .lcms-timeline__marker {
    left: 0;
    right: auto;
  }
}

/* ---------- CARDS VARIANT (legacy look: small dot, line through the edge, cards with background) ---------- */
.lcms-timeline--cards {
  --tl-gap: 20px;
}

.lcms-timeline--cards .lcms-timeline__body {
  background: var(--tl-card-bg, #fff);
  border: 1px solid var(--tl-card-border, #e0e0e0);
  border-radius: 6px;
  padding: 12px 16px;
}

.lcms-timeline--cards .lcms-timeline__marker {
  top: 4px;
}

.lcms-timeline--cards.lcms-timeline--vertical .lcms-timeline__track {
  top: 0;
  bottom: 0;
}

.lcms-timeline--cards.lcms-timeline--vertical.lcms-timeline--left .lcms-timeline__track { left: 8px; }
.lcms-timeline--cards.lcms-timeline--vertical.lcms-timeline--left .lcms-timeline__marker { left: 3px; }
.lcms-timeline--cards.lcms-timeline--vertical.lcms-timeline--right .lcms-timeline__track { right: 8px; }
.lcms-timeline--cards.lcms-timeline--vertical.lcms-timeline--right .lcms-timeline__marker { right: 3px; }

.lcms-timeline--cards.lcms-timeline--vertical.lcms-timeline--alternate .lcms-timeline__item--left {
  padding-right: 32px;
}
.lcms-timeline--cards.lcms-timeline--vertical.lcms-timeline--alternate .lcms-timeline__item--right {
  padding-left: 32px;
}

/* ---------- ANIMATION (line draws in, steps light up in sequence) ---------- */
.lcms-timeline.is-anim .lcms-timeline__fill {
  transform: scaleY(0);
  transform-origin: top;
}

.lcms-timeline--horizontal.is-anim .lcms-timeline__fill {
  transform: scaleX(0);
  transform-origin: left;
}

@media (max-width: 768px) {
  .lcms-timeline--horizontal.is-anim .lcms-timeline__fill {
    transform: scaleY(0);
    transform-origin: top;
  }
}

.lcms-timeline.is-anim.is-in .lcms-timeline__fill {
  transform: none;
  transition: transform 2.2s var(--tl-ease);
}

.lcms-timeline.is-anim .lcms-timeline__item {
  opacity: 0.25;
  transition: opacity 0.6s ease;
}

.lcms-timeline.is-anim.is-in .lcms-timeline__item {
  opacity: 1;
  transition-delay: calc(var(--tl-i, 0) * 0.4s);
}

@media (prefers-reduced-motion: reduce) {
  .lcms-timeline .lcms-timeline__fill,
  .lcms-timeline .lcms-timeline__item,
  .lcms-timeline .lcms-timeline__track {
    transition: none !important;
    transform: none !important;
    opacity: 1 !important;
  }
}
</style>
