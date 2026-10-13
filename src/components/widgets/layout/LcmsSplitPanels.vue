<script setup lang="ts">
/**
 * Split Panels Widget (hero "tryptyk")
 *
 * 2-5 vertical panels at full height: photo + gradient, outlined number that
 * fills on hover, title, text (revealed on hover) and a "more" link whose
 * line grows on hover. Hovering a panel widens it and dims the others.
 * Optional round cursor that follows the mouse over the panels (desktop only).
 * Phone (<=768px): panels stack, ~72vh each, text always visible, no cursor.
 *
 * Element groups: items[], config, number, title, text, link, cursor.
 */

import { computed, inject, ref } from 'vue'
import { useLanguage } from '@/composables/useLanguage'
import { contentImage } from '@/composables/useImageOptimization'

defineOptions({
  inheritAttrs: false
})

interface Props {
  data: any
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const { extractValue } = useLanguage(props.language)

const resolvePageUrl = inject<(code: string | null, uuid: string | null) => string>('lesscms-resolve-page-url', () => '#')
const resolveCollectionUrl = inject<(collectionCode: string, entryId: string) => string>('lesscms-resolve-collection-url', () => '#')

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

const text = (v: any): string => extractValue(v) || ''

const config = computed<Record<string, any>>(() => props.data?.widget || props.data || {})
const items = computed<any[]>(() => (Array.isArray(config.value.items) ? config.value.items.slice(0, 5) : []))
const configGroup = computed<Record<string, any>>(() => config.value.config || {})
const numberGroup = computed<Record<string, any>>(() => config.value.number || {})
const titleGroup = computed<Record<string, any>>(() => config.value.title || {})
const textGroup = computed<Record<string, any>>(() => config.value.text || {})
const linkGroup = computed<Record<string, any>>(() => config.value.link || {})
const cursorGroup = computed<Record<string, any>>(() => config.value.cursor || {})

// ── Links ────────────────────────────────────────────────────────────
function itemUrl(item: any): string {
  const link = item.link || {}
  const linkType = link.link_type || 'custom'
  const serverUrl = link.url
  if (linkType === 'page') {
    if (serverUrl && serverUrl !== '#') return serverUrl
    if (link.page_id) {
      const resolved = resolvePageUrl(null, link.page_id)
      if (resolved && resolved !== '#') return resolved
    }
  }
  if (linkType === 'route' && link.route_uuid) return resolvePageUrl(null, link.route_uuid)
  if (linkType === 'entry') {
    if (serverUrl && serverUrl !== '#') return serverUrl
    if (link.collection_code && link.entry_id) {
      const resolved = resolveCollectionUrl(link.collection_code, link.entry_id)
      if (resolved && resolved !== '#') return resolved
    }
  }
  return serverUrl || '#'
}

// ── Root sizing and colours (all CSS vars, reactive to props) ────────
const rootStyle = computed<Record<string, string>>(() => {
  const out: Record<string, string> = {}
  const height = configGroup.value.height === 'custom'
    ? `${Number(configGroup.value.custom_height) || 80}${configGroup.value.custom_unit === 'px' ? 'px' : 'vh'}`
    : '100vh'
  out['--sp-height'] = height
  out['--sp-min-height'] = configGroup.value.height === 'custom' ? '0' : '640px'
  const strength = Math.min(100, Math.max(0, Number(configGroup.value.overlay_strength ?? 85)))
  out['--sp-ov'] = String(strength / 100)

  const set = (name: string, val: string | null) => { if (val) out[name] = val }
  set('--sp-num-color', resolveColor(numberGroup.value.color))
  set('--sp-num-fill', resolveColor(numberGroup.value['color:hover']))
  set('--sp-title-color', resolveColor(titleGroup.value.color))
  set('--sp-text-color', resolveColor(textGroup.value.color))
  set('--sp-link-color', resolveColor(linkGroup.value.color))
  set('--sp-link-hover', resolveColor(linkGroup.value['color:hover']))
  set('--sp-cursor-bg', resolveColor(cursorGroup.value.background))
  set('--sp-cursor-color', resolveColor(cursorGroup.value.color))
  return out
})

const textStyleClass = computed(() => {
  const code = numberGroup.value.text_style
  return code && /^[a-z0-9_-]+$/i.test(code) ? `lcms-ts-${code}` : ''
})

const titleTextClass = computed(() => {
  const code = titleGroup.value.text_style
  return code && /^[a-z0-9_-]+$/i.test(code) ? `lcms-ts-${code}` : ''
})

const rootClasses = computed(() => ({
  'sp--custom': configGroup.value.height === 'custom',
  'sp--expand': configGroup.value.expand_on_hover !== false,
  'sp--dim': configGroup.value.dim_others !== false,
  'sp--intro': configGroup.value.intro_animation !== false,
  'sp--cursor': configGroup.value.custom_cursor === true,
  'sp--fill': numberGroup.value.style === 'fill'
}))

const titleTag = computed(() => (titleGroup.value.tag === 'h3' ? 'h3' : 'h2'))
const cursorLabel = computed(() => text(configGroup.value.cursor_label) || 'Zobacz')

// ── Custom cursor (position set on the DOM node, no re-render per move) ──
const cursorEl = ref<HTMLElement | null>(null)
const cursorOn = ref(false)
const onRootMove = (e: MouseEvent) => {
  const el = cursorEl.value
  if (!el) return
  el.style.left = `${e.clientX}px`
  el.style.top = `${e.clientY}px`
}

const imageOf = (item: any) => (item.image ? contentImage(item.image) : null)
</script>

<template>
  <div
    v-if="items.length"
    class="sp"
    :class="[rootClasses, $attrs.class]"
    :style="[rootStyle]"
    @mousemove="configGroup.custom_cursor ? onRootMove($event) : undefined"
  >
    <a
      v-for="(item, index) in items"
      :key="item.uuid || index"
      class="sp-panel"
      :href="itemUrl(item)"
      :target="item.link?.target_blank ? '_blank' : undefined"
      :rel="item.link?.target_blank ? 'noopener noreferrer' : undefined"
      :style="{ '--sp-i': String(index) }"
      @mouseenter="cursorOn = true"
      @mouseleave="cursorOn = false"
    >
      <img
        v-if="imageOf(item)"
        :src="imageOf(item)!.src"
        :srcset="imageOf(item)!.srcset"
        :sizes="imageOf(item)!.sizes"
        :alt="text(item.alt)"
        :loading="index === 0 ? 'eager' : 'lazy'"
        :fetchpriority="index === 0 ? 'high' : undefined"
        :decoding="index === 0 ? 'sync' : 'async'"
        class="sp-panel__img"
      >
      <div
        class="sp-panel__shade"
        aria-hidden="true"
      />
      <div class="sp-content">
        <span
          class="sp-num"
          :class="textStyleClass"
        >{{ item.number || String(index + 1).padStart(2, '0') }}</span>
        <component
          :is="titleTag"
          class="sp-title"
          :class="titleTextClass"
        >
          {{ text(item.title) }}
        </component>
        <p
          v-if="text(item.text)"
          class="sp-text"
        >
          {{ text(item.text) }}
        </p>
        <span
          v-if="text(item.link_label)"
          class="sp-more"
        >
          <span
            class="sp-more__line"
            aria-hidden="true"
          />
          {{ text(item.link_label) }}
        </span>
      </div>
    </a>

    <div
      v-if="configGroup.custom_cursor"
      ref="cursorEl"
      class="sp-cursor"
      :class="{ 'sp-cursor--on': cursorOn }"
      aria-hidden="true"
    >
      {{ cursorLabel }}
    </div>
  </div>
</template>

<style scoped>
.sp {
  --sp-ease: cubic-bezier(0.2, 0.7, 0.2, 1);
  position: relative;
  display: flex;
  width: 100%;
  height: var(--sp-height, 100vh);
  min-height: var(--sp-min-height, 640px);
  background: #000;
  font-family: var(--lcms-font-body, inherit);
}

.sp-panel {
  position: relative;
  flex: 1 1 0;
  min-width: 0;
  overflow: hidden;
  display: flex;
  align-items: flex-end;
  color: #fff;
  text-decoration: none;
  cursor: pointer;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  transition: flex 1s var(--sp-ease);
}

.sp-panel:last-child { border-right: 0; }

.sp-panel__img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scale(1.06);
  transition: transform 1.6s var(--sp-ease), filter 1s;
}

.sp-panel__shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(0, 0, 0, calc(var(--sp-ov, 0.85) * 0.4)) 0%,
    rgba(0, 0, 0, calc(var(--sp-ov, 0.85) * 0.06)) 35%,
    rgba(0, 0, 0, var(--sp-ov, 0.85)) 100%
  );
  transition: background 0.8s;
}

.sp-content {
  position: absolute;
  left: 40px;
  right: 40px;
  bottom: 56px;
  z-index: 2;
}

.sp-num {
  display: block;
  margin-bottom: 22px;
  font-size: clamp(64px, 8vw, 132px);
  font-weight: 900;
  line-height: 0.8;
  color: transparent;
  -webkit-text-stroke: 1.5px var(--sp-num-color, #fff);
  transition: color 0.6s, -webkit-text-stroke 0.6s;
}

.sp--fill .sp-num { color: var(--sp-num-color, #fff); }

.sp-title {
  margin: 0;
  max-width: 440px;
  color: var(--sp-title-color, #fff);
  font-family: var(--lcms-font-heading, inherit);
  line-height: 1.12;
}

h2.sp-title {
  font-size: var(--lcms-h2-font-size, clamp(20px, 1.8vw, 30px));
  font-weight: var(--lcms-h2-font-weight, 700);
  line-height: var(--lcms-h2-line-height, 1.12);
}

h3.sp-title {
  font-size: var(--lcms-h3-font-size, clamp(18px, 1.6vw, 26px));
  font-weight: var(--lcms-h3-font-weight, 700);
  line-height: var(--lcms-h3-line-height, 1.12);
}

.sp-text {
  max-width: 440px;
  margin: 0;
  max-height: 0;
  overflow: hidden;
  opacity: 0;
  color: var(--sp-text-color, #d4d4d4);
  font-size: 15px;
  line-height: 1.6;
  transition: max-height 0.9s var(--sp-ease), opacity 0.6s, margin 0.6s;
}

.sp-more {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-top: 22px;
  color: var(--sp-link-color, #fff);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  transition: color 0.6s;
}

.sp-more__line {
  display: inline-block;
  width: 30px;
  height: 2px;
  background: currentColor;
  transition: width 0.5s var(--sp-ease);
}

.sp-cursor {
  position: fixed;
  left: 0;
  top: 0;
  z-index: 60;
  width: 96px;
  height: 96px;
  margin: -48px 0 0 -48px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--sp-cursor-bg, var(--lcms-color-primary, #ffb000));
  color: var(--sp-cursor-color, var(--lcms-color-dark, #111));
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  pointer-events: none;
  transform: scale(0);
  transition: transform 0.35s var(--sp-ease);
}

.sp-cursor--on { transform: scale(1); }

/* ── Desktop hover choreography ─────────────────────────── */
@media (min-width: 769px) {
  .sp--expand:hover .sp-panel { flex: 0.8; }
  .sp--expand .sp-panel:hover { flex: 1.9; }

  .sp--dim:hover .sp-panel__img { filter: grayscale(0.85) brightness(0.55); }
  .sp--dim .sp-panel:hover .sp-panel__img { filter: none; }

  .sp-panel:hover .sp-panel__img { transform: scale(1); }
  .sp-panel:hover .sp-num { color: var(--sp-num-fill, var(--sp-num-color, #fff)); }
  .sp-panel:hover .sp-text { max-height: 160px; opacity: 1; margin-top: 16px; }
  .sp-panel:hover .sp-more { color: var(--sp-link-hover, var(--sp-link-color, #fff)); }
  .sp-panel:hover .sp-more__line { width: 60px; }

  .sp--cursor .sp-panel { cursor: none; }
}

/* ── Intro: panels rise from the bottom, staggered ──────── */
.sp--intro .sp-panel {
  clip-path: inset(100% 0 0 0);
  animation: sp-rise 1.2s var(--sp-ease) forwards;
  animation-delay: calc(var(--sp-i, 0) * 0.12s);
}

@keyframes sp-rise {
  to { clip-path: inset(0 0 0 0); }
}

/* ── Phone: stacked panels, text always visible ─────────── */
@media (max-width: 768px) {
  .sp {
    flex-direction: column;
    height: auto;
    min-height: 0;
  }

  .sp .sp-panel {
    flex: none;
    height: 72vh;
    min-height: 440px;
    border-right: 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    cursor: pointer;
  }

  .sp .sp-panel:hover .sp-panel__img { filter: none; transform: scale(1.06); }

  .sp .sp-content {
    left: 16px;
    right: 16px;
    bottom: 30px;
  }

  .sp .sp-num {
    margin-bottom: 14px;
    font-size: 72px;
    color: var(--sp-num-color, #fff);
  }

  .sp .sp-text {
    max-height: none;
    opacity: 1;
    margin-top: 12px;
    font-size: 14px;
  }

  .sp .sp-more { color: var(--sp-link-color, #fff); }
  .sp .sp-more__line { width: 30px; }

  .sp-cursor { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  .sp--intro .sp-panel { animation: none; clip-path: none; }
  .sp-panel,
  .sp-panel__img,
  .sp-num,
  .sp-text,
  .sp-more,
  .sp-more__line,
  .sp-cursor { transition: none; }
}
</style>
