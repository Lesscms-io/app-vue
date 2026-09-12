<script setup lang="ts">
/**
 * Hero Slider Widget (premium)
 *
 * Multi-slide hero with layered entrance animations. SSR renders the first
 * slide fully (LCP-friendly); autoplay, arrows, dots, keyboard and swipe
 * attach on mount. Animations are pure CSS keyframes driven by classes, so
 * a slide change just re-keys the content layer to replay them.
 *
 * Element groups: slides[], layout, label, heading, subheading, buttons,
 * overlay, animation, navigation.
 */

import { computed, h, inject, onBeforeUnmount, onMounted, ref, type FunctionalComponent } from 'vue'
import { useLanguage } from '@/composables/useLanguage'
import type { HeroSliderWidgetData, HeroSliderSlide, HeroSliderButton } from '@/types/widgets'

defineOptions({
  inheritAttrs: false
})

interface Props {
  data: HeroSliderWidgetData
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const { extractValue } = useLanguage(props.language)

const resolvePageUrl = inject<(code: string | null, uuid: string | null) => string>('lesscms-resolve-page-url', () => '#')
const resolveCollectionUrl = inject<(collectionCode: string, entryId: string) => string>('lesscms-resolve-collection-url', () => '#')

function resolveColor(val: string | null | undefined, fallback: string): string {
  if (!val) return fallback
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

const config = computed(() => (props.data as any).widget || props.data || {})

// ── Element groups ───────────────────────────────────────────────────
const slides = computed<HeroSliderSlide[]>(() => Array.isArray(config.value.items) ? config.value.items : [])
const layoutGroup = computed(() => config.value.layout || {})
const labelGroup = computed(() => config.value.label || {})
const headingGroup = computed(() => config.value.heading || {})
const subheadingGroup = computed(() => config.value.subheading || {})
const buttonsGroup = computed(() => config.value.buttons || {})
const overlayGroup = computed(() => config.value.overlay || {})
const animationGroup = computed(() => config.value.animation || {})
const navigationGroup = computed(() => config.value.navigation || {})

// ── Animation tables (mirror of fe/heroSliderShared.js) ──────────────
const LAYERS = ['label', 'title', 'subtitle', 'buttons'] as const
type Layer = typeof LAYERS[number]

const PRESETS: Record<string, Record<Layer, string>> = {
  none: { label: 'none', title: 'none', subtitle: 'none', buttons: 'none' },
  fade: { label: 'fade', title: 'fade', subtitle: 'fade', buttons: 'fade' },
  'stagger-up': { label: 'fade-down', title: 'fade-up', subtitle: 'fade-up', buttons: 'fade-up' },
  'stagger-left': { label: 'fade-left', title: 'fade-left', subtitle: 'fade-left', buttons: 'fade-left' },
  zoom: { label: 'fade', title: 'zoom-in', subtitle: 'fade-up', buttons: 'zoom-in' },
  reveal: { label: 'fade', title: 'reveal', subtitle: 'fade-up', buttons: 'fade-up' }
}

// A slide may override the preset and pin single layers; timing stays global.
function slideAnimation(item: HeroSliderSlide | undefined) {
  const out: Record<string, any> = { ...animationGroup.value }
  const own = (item ? item.animation : undefined) || {}
  out.preset = own.preset && own.preset !== 'inherit' ? own.preset : animationGroup.value.preset
  for (const layer of LAYERS) {
    const v = own[layer]
    if (v && v !== 'auto' && v !== 'inherit') out[layer] = v
  }
  return out
}

function resolveLayerAnimation(item: HeroSliderSlide | undefined, layer: Layer): string {
  const anim = slideAnimation(item)
  const preset = PRESETS[anim.preset] || PRESETS['stagger-up']
  const own = {
    label: anim.label ?? animationGroup.value.label,
    title: anim.title ?? animationGroup.value.title,
    subtitle: anim.subtitle ?? animationGroup.value.subtitle,
    buttons: anim.buttons ?? animationGroup.value.buttons
  }[layer]
  return own && own !== 'auto' ? own : preset[layer]
}

const layerClass = (item: HeroSliderSlide | undefined, layer: Layer) => {
  const type = resolveLayerAnimation(item, layer)
  return type && type !== 'none' ? `hs-anim hs-anim-${type}` : ''
}

// Slide layout = global layout + the slide's non-'inherit' keys. Height is
// widget-level only. Applied per slide as classes on .hs-slide.
const LAYOUT_KEYS = ['position', 'image_fill', 'content_width', 'text_align', 'vertical_align'] as const
const LAYOUT_DEFAULTS: Record<string, string> = { position: 'center', image_fill: 'split', content_width: 'standard', text_align: 'center', vertical_align: 'center' }
const LAYOUT_VALUES: Record<string, string[]> = {
  position: ['left', 'center', 'right', 'image-left', 'image-right'], image_fill: ['split', 'full'],
  content_width: ['full', 'wide', 'standard', 'narrow', 'container', 'custom'], text_align: ['left', 'center', 'right'], vertical_align: ['top', 'center', 'bottom']
}
function slideLayout(item: HeroSliderSlide | undefined) {
  const out: Record<string, string> = {
    position: layoutGroup.value.position || 'center',
    image_fill: layoutGroup.value.image_fill || 'split',
    content_width: layoutGroup.value.content_width || 'standard',
    text_align: layoutGroup.value.text_align || 'center',
    vertical_align: layoutGroup.value.vertical_align || 'center'
  }
  const own = ((item ? item.layout : undefined) || {}) as Record<string, string | undefined>
  for (const key of LAYOUT_KEYS) {
    const v = own[key]
    if (v && v !== 'inherit') out[key] = v
    // Unknown values (a stray 'inherit' at widget level) → defaults, so the
    // classes always match a CSS rule.
    if (key === 'content_width' && out[key] === 'normal') out[key] = 'standard' // legacy value
    if (!LAYOUT_VALUES[key].includes(out[key])) out[key] = LAYOUT_DEFAULTS[key]
  }
  return out
}
const slideLayoutClasses = (item: HeroSliderSlide) => {
  const l = slideLayout(item)
  return [`hs--pos-${l.position}`, `hs--fill-${l.image_fill}`, `hs--align-${l.text_align}`, `hs--valign-${l.vertical_align}`, `hs--width-${l.content_width}`]
}
const layerStyle = (layer: Layer) => ({ '--hs-anim-order': String(LAYERS.indexOf(layer)) })

// ── State ────────────────────────────────────────────────────────────
const activeIndex = ref(0)
const previousIndex = ref<number | null>(null)
const direction = ref<1 | -1>(1)
// Bumped on every slide change so the content layer re-mounts and the
// entrance keyframes replay (when `replay_on_slide` is on).
const animKey = ref(0)
// After the first slide change with replay off, layers no longer animate
// in — a slide shown for the first time would otherwise stagger in while
// the slide transition is meant to move it as one piece.
const noReplay = ref(false)
const mounted = ref(false)

const count = computed(() => slides.value.length)
const hasMany = computed(() => count.value > 1)
const loop = computed(() => navigationGroup.value.loop !== false)

const transition = computed(() => navigationGroup.value.transition || 'fade')
const transitionMs = computed(() => Number(navigationGroup.value.transition_duration ?? 700))

const goTo = (index: number, dir: 1 | -1 = 1) => {
  if (!hasMany.value) return
  let next = index
  if (next < 0) next = loop.value ? count.value - 1 : 0
  if (next >= count.value) next = loop.value ? 0 : count.value - 1
  if (next === activeIndex.value) return
  direction.value = dir
  previousIndex.value = activeIndex.value
  activeIndex.value = next
  if (animationGroup.value.replay_on_slide !== false) animKey.value++
  else noReplay.value = true
  restartAutoplay()
  // The outgoing slide stays mounted for the transition only.
  window.setTimeout(() => {
    if (previousIndex.value !== next) previousIndex.value = null
  }, transitionMs.value + 50)
}
const next = () => goTo(activeIndex.value + 1, 1)
const prev = () => goTo(activeIndex.value - 1, -1)

// Autoplay
let timer: number | null = null
const autoplay = computed(() => navigationGroup.value.autoplay !== false)
const interval = computed(() => Math.max(1000, Number(navigationGroup.value.interval ?? 6000)))
const paused = ref(false)

const stopAutoplay = () => {
  if (timer !== null) {
    window.clearInterval(timer)
    timer = null
  }
}
const startAutoplay = () => {
  stopAutoplay()
  if (!autoplay.value || !hasMany.value || paused.value) return
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  timer = window.setInterval(() => {
    if (!loop.value && activeIndex.value >= count.value - 1) {
      stopAutoplay()
      return
    }
    next()
  }, interval.value)
}
const restartAutoplay = () => {
  if (timer !== null) startAutoplay()
}

const onMouseEnter = () => {
  if (navigationGroup.value.pause_on_hover === false) return
  paused.value = true
  stopAutoplay()
}
const onMouseLeave = () => {
  paused.value = false
  startAutoplay()
}

// Keyboard
const root = ref<HTMLElement | null>(null)
const onKeydown = (e: KeyboardEvent) => {
  if (navigationGroup.value.keyboard === false) return
  if (e.key === 'ArrowRight') { next(); e.preventDefault() }
  else if (e.key === 'ArrowLeft') { prev(); e.preventDefault() }
}

// Swipe
let touchStartX = 0
let touchStartY = 0
const onTouchStart = (e: TouchEvent) => {
  const t = e.touches[0]
  touchStartX = t.clientX
  touchStartY = t.clientY
}
const onTouchEnd = (e: TouchEvent) => {
  if (navigationGroup.value.swipe === false) return
  const t = e.changedTouches[0]
  const dx = t.clientX - touchStartX
  const dy = t.clientY - touchStartY
  if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) {
    dx < 0 ? next() : prev()
  }
}

// Parallax (only when the effect is chosen — one rAF-throttled listener)
const parallaxY = ref(0)
let parallaxRaf: number | null = null
const onScroll = () => {
  if (parallaxRaf !== null) return
  parallaxRaf = window.requestAnimationFrame(() => {
    parallaxRaf = null
    const el = root.value
    if (!el) return
    const rect = el.getBoundingClientRect()
    const vh = window.innerHeight || 1
    // -1..1 across the viewport → up to ±60px of drift
    const progress = (rect.top + rect.height / 2 - vh / 2) / vh
    parallaxY.value = Math.round(progress * -60)
  })
}

onMounted(() => {
  mounted.value = true
  startAutoplay()
  if (animationGroup.value.background_effect === 'parallax') {
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
  }
})

onBeforeUnmount(() => {
  stopAutoplay()
  window.removeEventListener('scroll', onScroll)
  if (parallaxRaf !== null) window.cancelAnimationFrame(parallaxRaf)
})

// ── Look ─────────────────────────────────────────────────────────────
const HEIGHTS: Record<string, string> = { sm: '320px', md: '440px', lg: '560px', full: '100vh' }

const rootStyle = computed(() => ({
  '--hs-height': HEIGHTS[layoutGroup.value.height] || HEIGHTS.lg,
  '--hs-label-font': labelGroup.value.font_family ? `'${labelGroup.value.font_family}', sans-serif` : 'var(--lcms-font-body)',
  '--hs-title-font': headingGroup.value.font_family ? `'${headingGroup.value.font_family}', sans-serif` : 'var(--lcms-font-heading)',
  '--hs-subtitle-font': subheadingGroup.value.font_family ? `'${subheadingGroup.value.font_family}', sans-serif` : 'var(--lcms-font-body)',
  '--hs-label-color': resolveColor(labelGroup.value.color, '#ffffff'),
  '--hs-label-color-hover': resolveColor(labelGroup.value['color:hover'], resolveColor(labelGroup.value.color, '#ffffff')),
  '--hs-label-bg': resolveColor(labelGroup.value.background, 'var(--lcms-color-primary)'),
  '--hs-label-bg-hover': resolveColor(labelGroup.value['background:hover'], resolveColor(labelGroup.value.background, 'var(--lcms-color-primary)')),
  '--hs-title-color': resolveColor(headingGroup.value.color, '#ffffff'),
  '--hs-title-color-hover': resolveColor(headingGroup.value['color:hover'], resolveColor(headingGroup.value.color, '#ffffff')),
  '--hs-subtitle-color': resolveColor(subheadingGroup.value.color, 'rgba(255,255,255,0.85)'),
  '--hs-subtitle-color-hover': resolveColor(subheadingGroup.value['color:hover'], resolveColor(subheadingGroup.value.color, 'rgba(255,255,255,0.85)')),
  '--hs-custom-width': `${Number(layoutGroup.value.custom_width) || 1200}px`,
  '--hs-buttons-gap': `${buttonsGroup.value.gap ?? 12}px`,
  '--hs-anim-duration': `${animationGroup.value.duration ?? 700}ms`,
  '--hs-anim-stagger': `${animationGroup.value.stagger ?? 140}ms`,
  '--hs-anim-easing': animationGroup.value.easing || 'ease-out',
  '--hs-overlay-hover': resolveColor(overlayGroup.value['color:hover'], resolveColor(overlayGroup.value.color, '#000000')),
  '--hs-transition': `${transitionMs.value}ms`,
  '--hs-parallax': `${parallaxY.value}px`
}))

const rootClasses = computed(() => [
  `hs--bg-${animationGroup.value.background_effect || 'none'}`,
  `hs--transition-${transition.value}`,
  { 'hs--mounted': mounted.value, 'hs--no-replay': noReplay.value }
])

const overlayStyle = computed(() => {
  const color = resolveColor(overlayGroup.value.color, '#000000')
  const opacity = overlayGroup.value.opacity ?? 0.45
  const dir: Record<string, string> = { bottom: 'to top', top: 'to bottom', left: 'to right', right: 'to left' }
  const g = dir[overlayGroup.value.gradient]
  if (g) {
    return { background: `linear-gradient(${g}, ${color} 0%, transparent 70%)`, opacity: Math.min(1, opacity + 0.25) }
  }
  return { backgroundColor: color, opacity }
})

// `.hs-bg` clips; the image sits on an inner layer so Ken Burns scaling
// can't bleed past the half-width panel of the image layouts.
const backgroundStyle = (item: HeroSliderSlide) => {
  const bg = item.background || {}
  return { backgroundColor: resolveColor(bg.color, '#1f2937'), '--hs-bg-color': resolveColor(bg.color, '#1f2937') } as Record<string, string>
}
const backgroundMediaStyle = (item: HeroSliderSlide): Record<string, string> | null => {
  const bg = item.background || {}
  const img = bg.image_optimized || bg.image
  if ((bg.type || 'image') === 'image' && img) {
    return { backgroundImage: `url(${img})`, backgroundPosition: bg.focal || 'center' }
  }
  return null
}
const isVideo = (item: HeroSliderSlide) => item.background?.type === 'video' && !!item.background?.video

const headingTag = computed(() => headingGroup.value.tag || 'h1')
// Native tag picked at runtime — `h(tag)` skips component resolution, which
// `<component :is>` would attempt for the string and warn about under SSR.
const HsTitle: FunctionalComponent<{ tag: string }> = (p, { slots, attrs }) => h(p.tag, attrs, slots.default?.())
HsTitle.props = ['tag']
HsTitle.inheritAttrs = false
const titleSizeClass = computed(() => `hs-title--${headingGroup.value.size || 'xl'}`)
const subtitleSizeClass = computed(() => `hs-subtitle--${subheadingGroup.value.size || 'md'}`)
const labelStyleClass = (item: HeroSliderSlide) => {
  const own = item.label_style
  return `hs-label--${own && own !== 'inherit' ? own : (labelGroup.value.style || 'pill')}`
}

const text = (v: any) => extractValue(v) || ''

// Buttons reuse the shared button skin (.lcms-button__link--*). Per-slide
// overrides ('inherit' / '' = the widget `buttons` group) cover style,
// size, radius, padding and icon — the Button widget's config set.
const borderRadiusMap: Record<string, string> = { none: '0', sm: '4px', md: '8px', lg: '16px', pill: '9999px', full: '9999px' }
const pick = (v: string | undefined, fallback: string) => (v && v !== 'inherit' ? v : fallback)
const buttonDefaults = computed(() => ({
  primary_style: buttonsGroup.value.primary_style || 'primary',
  secondary_style: buttonsGroup.value.secondary_style || 'outline-light',
  size: buttonsGroup.value.size || 'lg',
  border_radius: buttonsGroup.value.border_radius || 'md'
}))
const buttonConfig = (kind: 'primary' | 'secondary', btn?: HeroSliderButton) => {
  const g = buttonDefaults.value
  return {
    style: pick(btn?.style, kind === 'primary' ? g.primary_style : g.secondary_style),
    size: pick(btn?.size, g.size),
    border_radius: pick(btn?.border_radius, g.border_radius),
    padding: btn?.padding || '',
    icon: btn?.icon || '',
    icon_position: btn?.icon_position || 'left'
  }
}
const buttonClasses = (kind: 'primary' | 'secondary', btn?: HeroSliderButton) => {
  const c = buttonConfig(kind, btn)
  return [`lcms-button__link--${c.style}`, c.size === 'md' ? '' : `lcms-button__link--size-${c.size}`]
}
const buttonInlineStyle = (kind: 'primary' | 'secondary', btn?: HeroSliderButton) => {
  const c = buttonConfig(kind, btn)
  const style: Record<string, string> = { borderRadius: borderRadiusMap[c.border_radius] || '8px' }
  if (c.padding) style.padding = `${c.padding}px`
  return style
}

const resolveButtonUrl = (btn: HeroSliderButton | undefined): string => {
  if (!btn) return '#'
  const lt = btn.link_type || 'custom'
  const serverUrl = btn.url || '#'
  if (lt === 'page') {
    if (serverUrl && serverUrl !== '#') return serverUrl
    if (btn.page_id) {
      const r = resolvePageUrl(null, btn.page_id)
      if (r && r !== '#') return r
    }
    return serverUrl
  }
  if (lt === 'route' && btn.route_uuid) return resolvePageUrl(null, btn.route_uuid)
  if (lt === 'entry') {
    if (serverUrl && serverUrl !== '#') return serverUrl
    if (btn.collection_code && btn.entry_id) {
      const r = resolveCollectionUrl(btn.collection_code, btn.entry_id)
      if (r && r !== '#') return r
    }
    return serverUrl
  }
  return serverUrl
}

const visibleButtons = (item: HeroSliderSlide) => {
  const out: Array<{ kind: 'primary' | 'secondary'; btn: HeroSliderButton; label: string }> = []
  const p = item.button_primary
  const s = item.button_secondary
  if (p && p.show !== false && text(p.text)) out.push({ kind: 'primary', btn: p, label: text(p.text) })
  if (s && s.show === true && text(s.text)) out.push({ kind: 'secondary', btn: s, label: text(s.text) })
  return out
}

// Which slides are in the DOM: SSR + first paint = active only; during a
// transition the outgoing one too.
const renderedIndexes = computed(() => {
  const set = new Set<number>([activeIndex.value])
  if (previousIndex.value !== null) set.add(previousIndex.value)
  return set
})

const slideStateClass = (i: number) => ({
  'hs-slide--active': i === activeIndex.value,
  'hs-slide--leaving': i === previousIndex.value,
  'hs-slide--fwd': direction.value === 1,
  'hs-slide--back': direction.value === -1
})

const showArrows = computed(() => hasMany.value && navigationGroup.value.arrows !== false)
const showDots = computed(() => hasMany.value && navigationGroup.value.dots !== false)
</script>

<template>
  <section
    v-if="slides.length"
    ref="root"
    class="lcms-hero-slider"
    :class="rootClasses"
    :style="rootStyle"
    tabindex="0"
    role="region"
    aria-roledescription="carousel"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
    @keydown="onKeydown"
    @touchstart.passive="onTouchStart"
    @touchend.passive="onTouchEnd"
  >
    <template v-for="(item, i) in slides" :key="item.uuid || i">
      <div
        v-if="renderedIndexes.has(i)"
        class="hs-slide"
        :class="[slideStateClass(i), slideLayoutClasses(item)]"
        :style="{ '--hs-bg-color': resolveColor(item.background?.color, '#1f2937') }"
        role="group"
        :aria-roledescription="'slide'"
        :aria-label="`${i + 1} / ${slides.length}`"
        :aria-hidden="i !== activeIndex"
      >
        <div class="hs-bg" :style="backgroundStyle(item)">
          <div
            v-if="backgroundMediaStyle(item)"
            class="hs-bg__media"
            :style="backgroundMediaStyle(item)!"
          />
          <video
            v-if="isVideo(item)"
            class="hs-bg__video"
            :src="item.background?.video"
            :poster="item.background?.image || undefined"
            autoplay
            muted
            loop
            playsinline
            preload="metadata"
          />
        </div>
        <div class="hs-overlay" :style="overlayStyle" />

        <!-- The outgoing slide keeps its layers (frozen, see CSS) so the
             text fades/slides out together with its background. -->
        <div
          v-if="i === activeIndex || i === previousIndex"
          :key="`content-${i === activeIndex ? animKey : 'leaving'}`"
          class="hs-content"
        >
          <span
            v-if="item.label_show !== false && text(item.label)"
            class="hs-label"
            :class="[labelStyleClass(item), layerClass(item, 'label')]"
            :style="layerStyle('label')"
          >{{ text(item.label) }}</span>

          <HsTitle
            v-if="text(item.title)"
            :tag="headingTag"
            class="hs-title"
            :class="[titleSizeClass, layerClass(item, 'title')]"
            :style="layerStyle('title')"
          >
            {{ text(item.title) }}
          </HsTitle>

          <p
            v-if="text(item.subtitle)"
            class="hs-subtitle"
            :class="[subtitleSizeClass, layerClass(item, 'subtitle')]"
            :style="layerStyle('subtitle')"
          >
            {{ text(item.subtitle) }}
          </p>

          <div
            v-if="visibleButtons(item).length"
            class="hs-buttons"
            :class="layerClass(item, 'buttons')"
            :style="layerStyle('buttons')"
          >
            <a
              v-for="b in visibleButtons(item)"
              :key="b.kind"
              class="lcms-button__link hs-cta"
              :class="buttonClasses(b.kind, b.btn)"
              :style="buttonInlineStyle(b.kind, b.btn)"
              :href="resolveButtonUrl(b.btn)"
              :target="b.btn.target_blank ? '_blank' : undefined"
              :rel="b.btn.target_blank ? 'noopener noreferrer' : undefined"
            ><i
              v-if="buttonConfig(b.kind, b.btn).icon && buttonConfig(b.kind, b.btn).icon_position !== 'right'"
              :class="buttonConfig(b.kind, b.btn).icon"
              class="hs-cta__icon hs-cta__icon--left"
            />{{ b.label }}<i
              v-if="buttonConfig(b.kind, b.btn).icon && buttonConfig(b.kind, b.btn).icon_position === 'right'"
              :class="buttonConfig(b.kind, b.btn).icon"
              class="hs-cta__icon hs-cta__icon--right"
            /></a>
          </div>
        </div>
      </div>
    </template>

    <button
      v-if="showArrows"
      type="button"
      class="hs-arrow hs-arrow--prev"
      aria-label="Previous slide"
      @click="prev"
    >
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
    </button>
    <button
      v-if="showArrows"
      type="button"
      class="hs-arrow hs-arrow--next"
      aria-label="Next slide"
      @click="next"
    >
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6" /></svg>
    </button>

    <div v-if="showDots" class="hs-dots" role="tablist">
      <button
        v-for="(_, i) in slides"
        :key="i"
        type="button"
        class="hs-dot"
        :class="{ 'hs-dot--active': i === activeIndex }"
        role="tab"
        :aria-selected="i === activeIndex"
        :aria-label="`Slide ${i + 1}`"
        @click="goTo(i, i > activeIndex ? 1 : -1)"
      />
    </div>
  </section>
</template>
