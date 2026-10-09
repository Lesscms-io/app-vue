<template>
  <div
    v-if="slots.length"
    :class="rootClasses"
    :style="rootStyle"
  >
    <div class="lcms-marquee__viewport">
      <div class="lcms-marquee__track">
        <div class="lcms-marquee__group">
          <template
            v-for="slot in slots"
            :key="`a-${slot.key}`"
          >
            <component
              :is="tagName"
              v-if="!isLogos"
              class="lcms-marquee__item"
              :class="{ 'is-outline': slot.outline, 'is-dup': slot.dup }"
            >
              <span class="lcms-marquee__text">{{ slot.label }}</span><span
                v-if="separator"
                class="lcms-marquee__sep"
                aria-hidden="true"
              >{{ separator }}</span>
            </component>
            <component
              :is="tagName"
              v-else
              class="lcms-marquee__item is-logo"
              :class="{ 'is-dup': slot.dup }"
            >
              <a
                v-if="slot.link"
                :href="slot.link"
                class="lcms-marquee__link"
              >
                <img
                  class="lcms-marquee__logo"
                  :src="slot.image"
                  :alt="slot.alt"
                  loading="lazy"
                  draggable="false"
                >
              </a>
              <img
                v-else
                class="lcms-marquee__logo"
                :src="slot.image"
                :alt="slot.alt"
                loading="lazy"
                draggable="false"
              >
            </component>
          </template>
        </div>

        <div
          class="lcms-marquee__group lcms-marquee__group--clone"
          aria-hidden="true"
        >
          <template
            v-for="slot in slots"
            :key="`b-${slot.key}`"
          >
            <component
              :is="tagName"
              v-if="!isLogos"
              class="lcms-marquee__item"
              :class="{ 'is-outline': slot.outline, 'is-dup': slot.dup }"
            >
              <span class="lcms-marquee__text">{{ slot.label }}</span><span
                v-if="separator"
                class="lcms-marquee__sep"
              >{{ separator }}</span>
            </component>
            <component
              :is="tagName"
              v-else
              class="lcms-marquee__item is-logo"
              :class="{ 'is-dup': slot.dup }"
            >
              <img
                class="lcms-marquee__logo"
                :src="slot.image"
                alt=""
                loading="lazy"
                draggable="false"
              >
            </component>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useLanguage } from '@/composables/useLanguage'

const props = defineProps<{
  data: {
    widget_type: string
    widget?: Record<string, any>
    config?: Record<string, any>
    settings?: Record<string, unknown>
  }
  language?: string
}>()

const { extractValue } = useLanguage(props.language)

// Minimum slots per copy of the list, so one copy always covers a wide screen
const MIN_SLOTS = 12

const widget = computed<Record<string, any>>(() => props.data.widget || props.data || {})
const configGroup = computed<Record<string, any>>(() => widget.value.config || {})
const textGroup = computed<Record<string, any>>(() => widget.value.text || {})
const logoGroup = computed<Record<string, any>>(() => widget.value.logo || {})
const borderGroup = computed<Record<string, any>>(() => widget.value.border || {})
const items = computed<Record<string, any>[]>(() => (Array.isArray(widget.value.items) ? widget.value.items : []))

const isLogos = computed(() => configGroup.value.mode === 'logos')

function resolveColor(val: string | null | undefined): string | null {
  if (!val) return null
  if (val.startsWith('var:')) {
    const parts = val.split(':')
    const code = parts[1]
    const opacity = parts.length >= 3 ? parseInt(parts[2]) : 100
    if (opacity < 100) return `color-mix(in srgb, var(--lcms-color-${code}) ${opacity}%, transparent)`
    return `var(--lcms-color-${code})`
  }
  return val
}

const visibleItems = computed(() => items.value
  .filter(item => (isLogos.value ? !!item?.image : true))
  .map(item => ({
    label: extractValue(item.text) || '',
    image: item.image || '',
    alt: extractValue(item.alt) || '',
    link: item.link || ''
  })))

const tagName = computed(() => {
  const t = textGroup.value.tag || 'span'
  return ['span', 'p', 'div', 'h2', 'h3', 'h4'].includes(t) ? t : 'span'
})

const separator = computed(() => textGroup.value.separator ?? '')

const slots = computed(() => {
  const list = visibleItems.value.filter(i => (isLogos.value ? true : !!i.label))
  if (!list.length) return []
  const repeat = Math.max(1, Math.ceil(MIN_SLOTS / list.length))
  let count = repeat * list.length
  if (count % 2) count += 1
  const outlineAlt = textGroup.value.outline_alternate !== false
  const out: Array<Record<string, any>> = []
  for (let k = 0; k < count; k++) {
    const src = list[k % list.length]
    out.push({
      key: k,
      ...src,
      dup: k >= list.length,
      outline: !isLogos.value && outlineAlt && k % 2 === 1
    })
  }
  return out
})

const textStyleClass = computed(() => {
  const code = textGroup.value.text_style || ''
  return /^[a-z0-9-]+$/.test(code) ? `lcms-ts-${code}` : ''
})

const monoClass = computed(() => {
  const m = logoGroup.value.mono
  return m === 'light' || m === 'dark' ? `lcms-marquee--mono-${m}` : ''
})

const rootClasses = computed(() => [
  'lcms-marquee',
  textStyleClass.value,
  monoClass.value,
  {
    'lcms-marquee--logos': isLogos.value,
    'lcms-marquee--right': configGroup.value.direction === 'right',
    'lcms-marquee--pause': configGroup.value.pause_on_hover !== false,
    'lcms-marquee--fade': configGroup.value.fade_edges !== false,
    'lcms-marquee--has-hover-text': !!textGroup.value['color:hover'],
    'lcms-marquee--border-top': borderGroup.value.top !== false,
    'lcms-marquee--border-bottom': borderGroup.value.bottom !== false
  }
])

const rootStyle = computed(() => {
  const s: Record<string, string> = {}
  const set = (k: string, v: string | null) => { if (v) s[k] = v }
  set('--mq-text-color', resolveColor(textGroup.value.color))
  set('--mq-text-hover', resolveColor(textGroup.value['color:hover']))
  set('--mq-outline-color', resolveColor(textGroup.value.outline_color))
  set('--mq-sep-color', resolveColor(textGroup.value.separator_color))
  set('--mq-border-color', resolveColor(borderGroup.value.color))
  const speed = Number(configGroup.value.speed) > 0 ? Number(configGroup.value.speed) : 28
  s['--mq-speed'] = `${speed}s`
  s['--mq-gap'] = `${configGroup.value.gap ?? 60}px`
  s['--mq-logo-h'] = `${logoGroup.value.height ?? 54}px`
  s['--mq-logo-opacity'] = String(Math.min(100, Math.max(0, logoGroup.value.opacity ?? 60)) / 100)
  s['--mq-logo-opacity-hover'] = String(Math.min(100, Math.max(0, logoGroup.value['opacity:hover'] ?? 100)) / 100)
  return s
})
</script>

<style scoped>
.lcms-marquee {
  position: relative;
  box-sizing: border-box;
  width: 100%;
  overflow: hidden;
  border-top: 1px solid transparent;
  border-bottom: 1px solid transparent;
  font-family: var(--lcms-font-body, inherit);
}
.lcms-marquee--border-top { border-top-color: var(--mq-border-color, color-mix(in srgb, currentColor 15%, transparent)); }
.lcms-marquee--border-bottom { border-bottom-color: var(--mq-border-color, color-mix(in srgb, currentColor 15%, transparent)); }

.lcms-marquee__viewport { overflow: hidden; }
.lcms-marquee--fade .lcms-marquee__viewport {
  -webkit-mask-image: linear-gradient(90deg, transparent, black 10%, black 90%, transparent);
  mask-image: linear-gradient(90deg, transparent, black 10%, black 90%, transparent);
}

.lcms-marquee__track {
  display: flex;
  width: max-content;
  animation: lcms-marquee-scroll var(--mq-speed, 28s) linear infinite;
}
.lcms-marquee--right .lcms-marquee__track { animation-direction: reverse; }
.lcms-marquee--pause:hover .lcms-marquee__track { animation-play-state: paused; }

.lcms-marquee__group {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: var(--mq-gap, 60px);
  padding-right: var(--mq-gap, 60px);
}

.lcms-marquee__item {
  display: inline-flex;
  align-items: center;
  margin: 0;
  white-space: nowrap;
  line-height: 1;
  font-family: var(--lcms-font-heading, inherit);
  font-size: var(--mq-font-size, clamp(40px, 6vw, 96px));
  font-weight: 900;
  font-stretch: 125%;
  text-transform: uppercase;
  color: var(--mq-text-color, inherit);
  transition: color 0.2s ease;
}
.lcms-marquee__item.is-outline {
  color: transparent;
  -webkit-text-stroke: 1.5px var(--mq-outline-color, var(--mq-text-color, CanvasText));
}
.lcms-marquee--has-hover-text:hover .lcms-marquee__item:not(.is-outline) { color: var(--mq-text-hover, inherit); }

.lcms-marquee__sep {
  margin-left: 0.3em;
  color: var(--mq-sep-color, var(--lcms-color-primary, currentColor));
  -webkit-text-stroke: 0;
  font-style: normal;
}

.lcms-marquee__item.is-logo { font-size: inherit; text-transform: none; font-weight: 400; }
.lcms-marquee__link { display: block; line-height: 0; }
.lcms-marquee__logo {
  display: block;
  height: var(--mq-logo-h, 54px);
  width: auto;
  max-width: none;
  opacity: var(--mq-logo-opacity, 0.6);
  transition: opacity 0.4s ease, filter 0.4s ease;
  user-select: none;
}
.lcms-marquee__item.is-logo:hover .lcms-marquee__logo { opacity: var(--mq-logo-opacity-hover, 1); }
.lcms-marquee--mono-light .lcms-marquee__logo { filter: grayscale(1) brightness(0) invert(1); }
.lcms-marquee--mono-dark .lcms-marquee__logo { filter: grayscale(1) brightness(0); }

@keyframes lcms-marquee-scroll {
  to { transform: translateX(-50%); }
}

@media (max-width: 768px) {
  .lcms-marquee__logo { height: calc(var(--mq-logo-h, 54px) * 0.67); }
  .lcms-marquee__group { gap: calc(var(--mq-gap, 60px) * 0.8); padding-right: calc(var(--mq-gap, 60px) * 0.8); }
}

@media (prefers-reduced-motion: reduce) {
  .lcms-marquee__track { animation: none; width: 100%; flex-wrap: wrap; justify-content: center; }
  .lcms-marquee__group { width: 100%; flex-wrap: wrap; justify-content: center; padding-right: 0; }
  .lcms-marquee__group--clone,
  .lcms-marquee__item.is-dup { display: none; }
}
</style>
