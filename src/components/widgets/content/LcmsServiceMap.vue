<template>
  <div
    v-if="points.length"
    ref="rootRef"
    :class="rootClasses"
    :style="rootStyle"
  >
    <p
      v-if="captionText"
      class="lcms-smap__caption"
      :class="textStyleClass"
    >
      {{ captionText }}
    </p>

    <svg
      class="lcms-smap__svg"
      viewBox="0 0 600 600"
      role="img"
      :aria-label="ariaLabel"
      preserveAspectRatio="xMidYMid meet"
    >
      <path
        class="lcms-smap__outline"
        :d="outlinePath"
      />

      <g v-if="configGroup.show_lines !== false">
        <path
          v-for="(line, i) in lines"
          :key="`l-${line.key}`"
          class="lcms-smap__line"
          :style="{ transitionDelay: `${i * 0.12}s` }"
          :d="line.d"
          pathLength="1"
        />
      </g>

      <g
        v-for="p in points"
        :key="`p-${p.key}`"
      >
        <template v-if="p.hq">
          <circle
            class="lcms-smap__pulse"
            :cx="p.x"
            :cy="p.y"
            :r="dotSize * 2"
          />
          <circle
            class="lcms-smap__hq"
            :cx="p.x"
            :cy="p.y"
            :r="dotSize * 1.8"
          />
        </template>
        <circle
          v-else
          class="lcms-smap__dot"
          :cx="p.x"
          :cy="p.y"
          :r="dotSize"
        />
        <text
          v-if="p.name"
          class="lcms-smap__name"
          :class="{ 'is-hq': p.hq }"
          :x="p.labelX"
          :y="p.nameY"
          :text-anchor="p.anchor"
        >{{ p.name }}</text>
        <text
          v-if="p.coords"
          class="lcms-smap__coords"
          :x="p.labelX"
          :y="p.coordsY"
          :text-anchor="p.anchor"
        >{{ p.coords }}</text>
      </g>
    </svg>

    <ul class="lcms-smap__sr">
      <li
        v-for="p in points"
        :key="`s-${p.key}`"
      >
        {{ p.name }}
        <span v-if="p.coords">({{ p.coords }})</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
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

// Country geometry: outline (lon, lat) + projection bounds. Only PL for now.
const COUNTRIES: Record<string, { outline: [number, number][]; bounds: { lonMin: number; lonMax: number; latMin: number; latMax: number } }> = {
  pl: {
    outline: [[14.2, 53.9], [16, 54.25], [17.6, 54.8], [18.6, 54.75], [19.6, 54.45], [22.8, 54.35], [23.5, 53.9], [23.9, 52.7], [23.2, 52.2], [23.6, 51.5], [24.1, 50.8], [23.4, 50.3], [22.6, 49.5], [22.9, 49.05], [22, 49.2], [20.9, 49.35], [19.8, 49.2], [19, 49.4], [18, 50], [16.9, 50.4], [16.4, 50.6], [15, 51], [14.8, 51.6], [14.6, 52.6], [14.2, 53.3]],
    bounds: { lonMin: 14, lonMax: 24.2, latMin: 49, latMax: 55 }
  }
}

// Label metrics in viewBox units (600x600) — same as the mockup, 15px covers mobile
const LAYOUT_FS = 15
const COORD_FS = 10
const LINE_H = 14

const rootRef = ref<HTMLElement | null>(null)
const inView = ref(false)
let observer: IntersectionObserver | null = null

const widgetData = computed<Record<string, any>>(() => props.data?.widget || props.data || {})
const configGroup = computed<Record<string, any>>(() => widgetData.value.config || {})
const captionGroup = computed<Record<string, any>>(() => widgetData.value.caption || {})
const mapGroup = computed<Record<string, any>>(() => widgetData.value.map || {})
const dotGroup = computed<Record<string, any>>(() => widgetData.value.dot || {})
const lineGroup = computed<Record<string, any>>(() => widgetData.value.line || {})
const labelGroup = computed<Record<string, any>>(() => widgetData.value.label || {})
const items = computed<Record<string, any>[]>(() => (Array.isArray(widgetData.value.items) ? widgetData.value.items : []))

const country = computed(() => COUNTRIES[configGroup.value.country] || COUNTRIES.pl)
const dotSize = computed(() => {
  const n = Number(dotGroup.value.size)
  return n > 0 ? n : 4.5
})

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

const projectPoint = (lat: number, lon: number) => {
  const b = country.value.bounds
  return {
    x: 50 + ((lon - b.lonMin) / (b.lonMax - b.lonMin)) * 500,
    y: 570 - ((lat - b.latMin) / (b.latMax - b.latMin)) * 520
  }
}

const outlinePath = computed(() => {
  const pts = country.value.outline.map(([lon, lat]) => projectPoint(lat, lon))
  return `M${pts.map(p => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('L')}Z`
})

type Box = { x0: number; y0: number; x1: number; y1: number }
const overlaps = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1

const points = computed(() => {
  const base = items.value
    .filter(it => Number.isFinite(Number(it?.lat)) && Number.isFinite(Number(it?.lon)))
    .map((it, i) => {
      const { x, y } = projectPoint(Number(it.lat), Number(it.lon))
      const name = extractValue(it.name) || ''
      const coords = configGroup.value.show_coords !== false && it.show_coords !== false
        ? `${Number(it.lat).toFixed(2)}N ${Number(it.lon).toFixed(2)}E`
        : ''
      return {
        key: i,
        hq: !!it.is_hq,
        name,
        coords,
        x,
        y,
        dx: it.label_dx ?? null,
        dy: it.label_dy ?? null
      }
    })
  // Automatic label placement: manual offsets first, then HQ, then the rest.
  // Every label tries right, left, above, below and takes the first free slot.
  const r = dotSize.value
  const placed: Box[] = base.map(p => ({ x0: p.x - r - 2, y0: p.y - r - 2, x1: p.x + r + 2, y1: p.y + r + 2 }))
  const order = [...base.filter(p => p.dx !== null && p.dy !== null), ...base.filter(p => p.hq && !(p.dx !== null && p.dy !== null)), ...base.filter(p => !p.hq && !(p.dx !== null && p.dy !== null))]
  const result = new Map<number, any>()
  for (const p of order) {
    const nameW = p.name.length * LAYOUT_FS * 0.6
    const coordsW = p.coords.length * COORD_FS * 0.62
    const w = Math.max(nameW, coordsW)
    const h = LAYOUT_FS * 0.8 + (p.coords ? LINE_H : 0)
    const box = (x: number, top: number, anchor: string): Box => ({
      x0: anchor === 'start' ? x : anchor === 'end' ? x - w : x - w / 2,
      x1: anchor === 'start' ? x + w : anchor === 'end' ? x : x + w / 2,
      y0: top,
      y1: top + h
    })
    let slot: { x: number; top: number; anchor: string; box: Box } | null = null
    if (p.dx !== null && p.dy !== null) {
      const anchor = p.dx < 0 ? 'end' : p.dx > 0 ? 'start' : 'middle'
      const x = p.x + Number(p.dx)
      const top = p.y + Number(p.dy) - LAYOUT_FS * 0.4
      slot = { x, top, anchor, box: box(x, top, anchor) }
    } else {
      const candidates = [
        { x: p.x + r + 5, top: p.y - LAYOUT_FS * 0.4, anchor: 'start' },
        { x: p.x - r - 5, top: p.y - LAYOUT_FS * 0.4, anchor: 'end' },
        { x: p.x, top: p.y - r - 6 - h, anchor: 'middle' },
        { x: p.x, top: p.y + r + 6, anchor: 'middle' }
      ]
      for (const c of candidates) {
        const b = box(c.x, c.top, c.anchor)
        const inside = b.x0 >= 0 && b.x1 <= 600 && b.y0 >= 0 && b.y1 <= 600
        if (inside && !placed.some(o => overlaps(o, { x0: b.x0 - 2, y0: b.y0 - 2, x1: b.x1 + 2, y1: b.y1 + 2 }))) {
          slot = { ...c, box: b }
          break
        }
      }
      if (!slot) {
        const c = candidates[0]
        slot = { ...c, box: box(c.x, c.top, c.anchor) }
      }
    }
    placed.push(slot.box)
    const nameY = slot.top + LAYOUT_FS * 0.8
    result.set(p.key, {
      ...p,
      labelX: slot.x,
      anchor: slot.anchor,
      nameY,
      coordsY: nameY + LINE_H
    })
  }
  return base.map(p => result.get(p.key))
})

const hqPoint = computed(() => points.value.find(p => p.hq) || null)

const lines = computed(() => {
  const hq = hqPoint.value
  if (!hq) return []
  return points.value
    .filter(p => !p.hq)
    .map(p => ({ key: p.key, d: `M${hq.x.toFixed(1)} ${hq.y.toFixed(1)} L${p.x.toFixed(1)} ${p.y.toFixed(1)}` }))
})

const captionText = computed(() => extractValue(captionGroup.value.text) || '')

const ariaLabel = computed(() => {
  const names = points.value.map(p => p.name).filter(Boolean).join(', ')
  return captionText.value ? `${captionText.value}: ${names}` : names
})

const textStyleClass = computed(() => {
  const code = captionGroup.value.text_style || ''
  return /^[a-z0-9-]+$/.test(code) ? `lcms-ts-${code}` : ''
})

const rootClasses = computed(() => [
  'lcms-smap',
  textStyleClass.value,
  {
    'is-anim': configGroup.value.animate_lines !== false && configGroup.value.show_lines !== false,
    'is-in': inView.value || configGroup.value.animate_lines === false
  }
])

const rootStyle = computed(() => {
  const s: Record<string, string> = {}
  const set = (k: string, v: string | null) => { if (v) s[k] = v }
  set('--sm-caption', resolveColor(captionGroup.value.color))
  set('--sm-outline', resolveColor(mapGroup.value.outline_color))
  set('--sm-fill', resolveColor(mapGroup.value.fill))
  set('--sm-bg', resolveColor(mapGroup.value.background))
  set('--sm-border', resolveColor(mapGroup.value.border_color))
  set('--sm-dot', resolveColor(dotGroup.value.color))
  set('--sm-hq', resolveColor(dotGroup.value.hq_color))
  set('--sm-line', resolveColor(lineGroup.value.color))
  set('--sm-label', resolveColor(labelGroup.value.color))
  set('--sm-coords', resolveColor(labelGroup.value.coords_color))
  s['--sm-line-w'] = `${Number(lineGroup.value.width) > 0 ? Number(lineGroup.value.width) : 1.5}px`
  return s
})

onMounted(() => {
  if (configGroup.value.animate_lines === false || typeof IntersectionObserver === 'undefined' || !rootRef.value) {
    inView.value = true
    return
  }
  observer = new IntersectionObserver((entries) => {
    if (entries.some(e => e.isIntersecting)) {
      inView.value = true
      observer?.disconnect()
      observer = null
    }
  }, { threshold: 0.25 })
  observer.observe(rootRef.value)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})
</script>

<style scoped>
.lcms-smap {
  position: relative;
  box-sizing: border-box;
  width: 100%;
  aspect-ratio: 1 / 1;
  border: 1px solid var(--sm-border, transparent);
  background: var(--sm-bg, transparent);
  font-family: var(--lcms-font-body, inherit);
}

.lcms-smap__caption {
  position: absolute;
  left: 20px;
  top: 18px;
  margin: 0;
  z-index: 1;
  font-size: 11px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  font-weight: 600;
  color: var(--sm-caption, var(--lcms-color-primary, currentColor));
}

.lcms-smap__svg {
  display: block;
  width: 100%;
  height: 100%;
}

.lcms-smap__outline {
  fill: var(--sm-fill, color-mix(in srgb, var(--lcms-color-primary, currentColor) 6%, transparent));
  stroke: var(--sm-outline, color-mix(in srgb, currentColor 35%, transparent));
  stroke-width: 1.2;
  stroke-dasharray: 5 4;
}

.lcms-smap__line {
  fill: none;
  stroke: var(--sm-line, var(--lcms-color-primary, currentColor));
  stroke-width: var(--sm-line-w, 1.5px);
}
.lcms-smap.is-anim .lcms-smap__line {
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  transition: stroke-dashoffset 1.6s cubic-bezier(0.77, 0, 0.18, 1);
}
.lcms-smap.is-anim.is-in .lcms-smap__line { stroke-dashoffset: 0; }

.lcms-smap__dot { fill: var(--sm-dot, currentColor); }
.lcms-smap__hq { fill: var(--sm-hq, var(--lcms-color-primary, currentColor)); }
.lcms-smap__pulse {
  fill: none;
  stroke: var(--sm-hq, var(--lcms-color-primary, currentColor));
  stroke-width: 2;
  transform-box: fill-box;
  transform-origin: center;
  animation: lcms-smap-pulse 2s infinite;
}

.lcms-smap__name {
  font-family: var(--lcms-font-body, inherit);
  font-size: 13px;
  font-weight: 600;
  fill: var(--sm-label, currentColor);
}
.lcms-smap__name.is-hq { font-weight: 800; fill: var(--sm-hq, var(--lcms-color-primary, currentColor)); }
.lcms-smap__coords {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 10px;
  fill: var(--sm-coords, color-mix(in srgb, currentColor 55%, transparent));
}

.lcms-smap__sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  margin: -1px;
  padding: 0;
  border: 0;
  list-style: none;
}

@keyframes lcms-smap-pulse {
  from { transform: scale(0.4); opacity: 1; }
  to { transform: scale(3); opacity: 0; }
}

@media (max-width: 768px) {
  .lcms-smap__caption { font-size: 9px; letter-spacing: 0.12em; left: 12px; top: 12px; }
  .lcms-smap__name { font-size: 15px; }
}

@media (prefers-reduced-motion: reduce) {
  .lcms-smap__pulse { animation: none; opacity: 0; }
  .lcms-smap.is-anim .lcms-smap__line { transition: none; stroke-dasharray: none; stroke-dashoffset: 0; }
}
</style>
