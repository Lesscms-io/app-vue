<script setup lang="ts">
/**
 * Family Tree Widget
 *
 * MyHeritage-style chart: cards for people, rounded connectors for couples
 * and children, pan / zoom viewport and an optional details panel.
 * Element-group structure: persons, card, name, dates, line, config.
 * Layout comes from @/utils/familyTree (mirrors the page-builder engine).
 */

import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { resolveColor } from '@/utils/resolveColor'
import { smallImage } from '@/composables/useImageOptimization'
import {
  buildTreeLayout,
  DEFAULT_METRICS,
  fullName,
  lifeSpan,
  type FtLayout,
  type FtNode,
  type FtPerson
} from '@/utils/familyTree'

defineOptions({
  inheritAttrs: false
})

interface Props {
  data: Record<string, any>
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const I18N: Record<string, Record<string, string>> = {
  pl: { deceased_m: 'Zmarły', deceased_f: 'Zmarła', born: 'Urodzenie', died: 'Śmierć', parents: 'Rodzice', partners: 'Partnerzy', children: 'Dzieci', close: 'Zamknij', zoom_in: 'Powiększ', zoom_out: 'Pomniejsz', fit: 'Dopasuj', home: 'Osoba główna', maiden: 'z domu' },
  en: { deceased_m: 'Deceased', deceased_f: 'Deceased', born: 'Born', died: 'Died', parents: 'Parents', partners: 'Partners', children: 'Children', close: 'Close', zoom_in: 'Zoom in', zoom_out: 'Zoom out', fit: 'Fit', home: 'Home person', maiden: 'née' },
  de: { deceased_m: 'Verstorben', deceased_f: 'Verstorben', born: 'Geboren', died: 'Gestorben', parents: 'Eltern', partners: 'Partner', children: 'Kinder', close: 'Schließen', zoom_in: 'Vergrößern', zoom_out: 'Verkleinern', fit: 'Anpassen', home: 'Hauptperson', maiden: 'geb.' },
  fr: { deceased_m: 'Décédé', deceased_f: 'Décédée', born: 'Naissance', died: 'Décès', parents: 'Parents', partners: 'Partenaires', children: 'Enfants', close: 'Fermer', zoom_in: 'Zoom avant', zoom_out: 'Zoom arrière', fit: 'Ajuster', home: 'Personne principale', maiden: 'née' },
  es: { deceased_m: 'Fallecido', deceased_f: 'Fallecida', born: 'Nacimiento', died: 'Fallecimiento', parents: 'Padres', partners: 'Parejas', children: 'Hijos', close: 'Cerrar', zoom_in: 'Acercar', zoom_out: 'Alejar', fit: 'Ajustar', home: 'Persona principal', maiden: 'de soltera' }
}
const lang = computed(() => props.language || 'pl')
const t = (key: string) => (I18N[lang.value] || I18N.en)[key] || I18N.en[key] || key

// Element groups
const persons = computed<FtPerson[]>(() => (Array.isArray(props.data.persons) ? props.data.persons : []))
const cardGroup = computed(() => props.data.card || {})
const nameGroup = computed(() => props.data.name || {})
const datesGroup = computed(() => props.data.dates || {})
const lineGroup = computed(() => props.data.line || {})
const configGroup = computed(() => props.data.config || {})

const showPhotos = computed(() => configGroup.value.show_photos !== false)
const showDates = computed(() => configGroup.value.show_dates !== false)
const showControls = computed(() => configGroup.value.show_controls !== false)
const showDetails = computed(() => configGroup.value.show_details !== false)
const viewportHeight = computed(() => Number(configGroup.value.height) || 520)

const metrics = computed(() => ({
  ...DEFAULT_METRICS,
  cardH: showPhotos.value ? DEFAULT_METRICS.cardH : 60
}))
const layout = computed<FtLayout>(() => buildTreeLayout(persons.value, configGroup.value.root_id, metrics.value))

const cssVars = computed(() => {
  const s: Record<string, string> = {}
  const put = (k: string, v: string | null | undefined) => { const r = resolveColor(v); if (r) s[k] = r }
  put('--ft-card-bg', cardGroup.value.background)
  put('--ft-card-bg-hover', cardGroup.value['background:hover'])
  put('--ft-male', cardGroup.value.male_color)
  put('--ft-female', cardGroup.value.female_color)
  put('--ft-neutral', cardGroup.value.neutral_color)
  put('--ft-name', nameGroup.value.color)
  put('--ft-dates', datesGroup.value.color)
  put('--ft-line', lineGroup.value.color)
  s['--ft-radius'] = `${cardGroup.value.radius ?? 10}px`
  return s
})

const deceasedLabel = (p: FtPerson) => t(p.gender === 'f' ? 'deceased_f' : 'deceased_m')
const genderClass = (p: FtPerson) => (p.gender === 'm' ? 'ft-card--m' : p.gender === 'f' ? 'ft-card--f' : 'ft-card--n')
const photoOf = (p: FtPerson) => (p.photo ? smallImage(p.photo) : null)

// ---- viewport: pan / zoom ----------------------------------------------
const PAD = 40
const viewport = ref<HTMLElement | null>(null)
const scale = ref(1)
const tx = ref(0)
const ty = ref(0)
const touched = ref(false)
const stageStyle = computed(() => ({
  width: `${layout.value.width}px`,
  height: `${layout.value.height}px`,
  transform: `translate(${tx.value}px, ${ty.value}px) scale(${scale.value})`
}))

const vpSize = () => ({ w: viewport.value?.clientWidth || 0, h: viewport.value?.clientHeight || 0 })

const fit = () => {
  const { w, h } = vpSize()
  if (!w || !layout.value.width) return
  const s = Math.max(0.2, Math.min(1, (w - PAD * 2) / layout.value.width, (h - PAD * 2) / layout.value.height))
  scale.value = s
  tx.value = (w - layout.value.width * s) / 2
  ty.value = Math.max(PAD, (h - layout.value.height * s) / 2)
}

const centerOn = (n: FtNode | undefined) => {
  const { w, h } = vpSize()
  if (!n) return fit()
  scale.value = 1
  tx.value = w / 2 - (n.x + metrics.value.cardW / 2)
  ty.value = h / 2 - (n.y + metrics.value.cardH / 2)
}
const home = () => centerOn(layout.value.nodes.find(x => x.isRoot))

const zoomBy = (factor: number, cx?: number, cy?: number) => {
  const { w, h } = vpSize()
  const px = cx ?? w / 2
  const py = cy ?? h / 2
  const next = Math.max(0.2, Math.min(2.5, scale.value * factor))
  const k = next / scale.value
  tx.value = px - (px - tx.value) * k
  ty.value = py - (py - ty.value) * k
  scale.value = next
  touched.value = true
}

const initialView = () => (configGroup.value.initial_view === 'home' ? home() : fit())

type Drag = { x: number; y: number; tx: number; ty: number; moved: boolean }
const pointers = new Map<number, { x: number; y: number }>()
let dragStart: Drag | null = null
let pinchStart: { dist: number; scale: number } | null = null

const onPointerDown = (e: PointerEvent) => {
  if (e.button != null && e.button !== 0) return
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
  if (pointers.size === 1) {
    dragStart = { x: e.clientX, y: e.clientY, tx: tx.value, ty: ty.value, moved: false }
  } else if (pointers.size === 2) {
    const [a, b] = [...pointers.values()]
    pinchStart = { dist: Math.hypot(a.x - b.x, a.y - b.y), scale: scale.value }
    dragStart = null
  }
  viewport.value?.setPointerCapture?.(e.pointerId)
}
const onPointerMove = (e: PointerEvent) => {
  if (!pointers.has(e.pointerId) || !viewport.value) return
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
  if (pointers.size === 2 && pinchStart) {
    const [a, b] = [...pointers.values()]
    const dist = Math.hypot(a.x - b.x, a.y - b.y)
    const rect = viewport.value.getBoundingClientRect()
    zoomBy((pinchStart.scale * dist / pinchStart.dist) / scale.value, (a.x + b.x) / 2 - rect.left, (a.y + b.y) / 2 - rect.top)
    return
  }
  if (dragStart) {
    const dx = e.clientX - dragStart.x
    const dy = e.clientY - dragStart.y
    if (Math.abs(dx) + Math.abs(dy) > 4) dragStart.moved = true
    if (dragStart.moved) { tx.value = dragStart.tx + dx; ty.value = dragStart.ty + dy; touched.value = true }
  }
}
const onPointerUp = (e: PointerEvent) => {
  pointers.delete(e.pointerId)
  if (pointers.size < 2) pinchStart = null
  if (pointers.size === 0) dragStart = null
}
const onWheel = (e: WheelEvent) => {
  if ((!e.ctrlKey && !e.metaKey) || !viewport.value) return
  e.preventDefault()
  const rect = viewport.value.getBoundingClientRect()
  zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - rect.left, e.clientY - rect.top)
}

// ---- details panel ---------------------------------------------------------
const selectedId = ref<string | null>(null)
const byId = (id: string | null | undefined) => (id ? persons.value.find(p => p.id === id) || null : null)
const selected = computed(() => byId(selectedId.value))
const selectedParents = computed(() => [byId(selected.value?.father_id), byId(selected.value?.mother_id)].filter(Boolean) as FtPerson[])
const selectedPartners = computed(() => {
  const me = selected.value
  if (!me) return []
  const ids = new Set<string>(me.partner_ids || [])
  persons.value.forEach(o => { if ((o.partner_ids || []).includes(me.id)) ids.add(o.id) })
  persons.value.forEach(c => {
    if (c.father_id === me.id && c.mother_id) ids.add(c.mother_id)
    if (c.mother_id === me.id && c.father_id) ids.add(c.father_id)
  })
  return [...ids].map(byId).filter(Boolean) as FtPerson[]
})
const selectedChildren = computed(() => {
  const me = selected.value
  if (!me) return []
  return persons.value.filter(c => c.father_id === me.id || c.mother_id === me.id)
})
const selectedPhoto = computed(() => (selected.value?.photo ? smallImage(selected.value.photo) : null))

const onCardClick = (node: FtNode) => {
  if (dragStart?.moved || !showDetails.value) return
  selectedId.value = node.id
}
const jumpTo = (p: FtPerson) => {
  selectedId.value = p.id
  centerOn(layout.value.nodes.find(n => n.id === p.id))
  touched.value = true
}

// ---- lifecycle --------------------------------------------------------------
let ro: ResizeObserver | null = null
watch(viewport, (el) => {
  ro?.disconnect()
  ro = null
  if (!el) return
  initialView()
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(() => { if (!touched.value) initialView() })
    ro.observe(el)
  }
}, { immediate: true })
onBeforeUnmount(() => ro?.disconnect())
watch(() => [layout.value.width, layout.value.height, configGroup.value.initial_view], async () => {
  await nextTick()
  if (!touched.value) initialView()
})
</script>

<template>
  <div
    class="lcms-family-tree"
    :style="cssVars"
  >
    <div
      v-if="persons.length"
      ref="viewport"
      class="lcms-family-tree__viewport"
      :style="{ height: `${viewportHeight}px` }"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @wheel="onWheel"
    >
      <div
        class="lcms-family-tree__stage"
        :style="stageStyle"
      >
        <svg
          class="lcms-family-tree__lines"
          :width="layout.width"
          :height="layout.height"
          :viewBox="`0 0 ${layout.width} ${layout.height}`"
        >
          <path
            v-for="(l, i) in layout.links"
            :key="i"
            :d="l.d"
            class="lcms-family-tree__link"
          />
        </svg>

        <div
          v-for="n in layout.nodes"
          :key="n.id"
          class="ft-card"
          :class="[genderClass(n.person), { 'ft-card--root': n.isRoot, 'ft-card--selected': selectedId === n.id, 'ft-card--clickable': showDetails }]"
          :style="{ left: `${n.x}px`, top: `${n.y}px`, width: `${metrics.cardW}px`, height: `${metrics.cardH}px` }"
          @click="onCardClick(n)"
        >
          <div
            v-if="showPhotos"
            class="ft-card__photo"
          >
            <img
              v-if="photoOf(n.person)"
              :src="photoOf(n.person)!.src"
              :srcset="photoOf(n.person)!.srcset"
              sizes="44px"
              :alt="fullName(n.person)"
              loading="lazy"
              draggable="false"
            >
            <svg
              v-else
              viewBox="0 0 24 24"
              class="ft-card__silhouette"
              aria-hidden="true"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7z" />
            </svg>
          </div>
          <div class="ft-card__body">
            <div class="ft-card__name">{{ fullName(n.person) }}</div>
            <div
              v-if="showDates && lifeSpan(n.person, deceasedLabel(n.person))"
              class="ft-card__dates"
            >{{ lifeSpan(n.person, deceasedLabel(n.person)) }}</div>
          </div>
        </div>
      </div>

      <div
        v-if="showControls"
        class="lcms-family-tree__controls"
        @pointerdown.stop
      >
        <button type="button" :title="t('zoom_in')" :aria-label="t('zoom_in')" @click="zoomBy(1.25)"><i class="fa-solid fa-plus" /></button>
        <button type="button" :title="t('zoom_out')" :aria-label="t('zoom_out')" @click="zoomBy(0.8)"><i class="fa-solid fa-minus" /></button>
        <button type="button" :title="t('fit')" :aria-label="t('fit')" @click="fit(); touched = true"><i class="fa-solid fa-expand" /></button>
        <button type="button" :title="t('home')" :aria-label="t('home')" @click="home(); touched = true"><i class="fa-solid fa-house" /></button>
      </div>

      <transition name="ft-details">
        <div
          v-if="selected"
          class="lcms-family-tree__details"
          @pointerdown.stop
          @wheel.stop
        >
          <button
            type="button"
            class="lcms-family-tree__close"
            :aria-label="t('close')"
            @click="selectedId = null"
          >
            <i class="fa-solid fa-xmark" />
          </button>
          <div
            class="ft-details__photo"
            :class="genderClass(selected)"
          >
            <img
              v-if="selectedPhoto"
              :src="selectedPhoto.src"
              :srcset="selectedPhoto.srcset"
              sizes="96px"
              :alt="fullName(selected)"
            >
            <svg
              v-else
              viewBox="0 0 24 24"
              class="ft-card__silhouette"
              aria-hidden="true"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7z" />
            </svg>
          </div>
          <div class="ft-details__name">{{ [selected.first_name, selected.last_name].filter(Boolean).join(' ') }}</div>
          <div v-if="selected.maiden_name" class="ft-details__maiden">{{ t('maiden') }} {{ selected.maiden_name }}</div>
          <dl class="ft-details__facts">
            <template v-if="selected.birth">
              <dt>{{ t('born') }}</dt><dd>{{ selected.birth }}</dd>
            </template>
            <template v-if="selected.death || selected.deceased">
              <dt>{{ t('died') }}</dt><dd>{{ selected.death || '†' }}</dd>
            </template>
          </dl>
          <p v-if="selected.note" class="ft-details__note">{{ selected.note }}</p>
          <template v-for="rel in [['parents', selectedParents], ['partners', selectedPartners], ['children', selectedChildren]] as [string, FtPerson[]][]" :key="rel[0]">
            <div v-if="rel[1].length" class="ft-details__rel">
              <div class="ft-details__rel-title">{{ t(rel[0]) }}</div>
              <button
                v-for="p in rel[1]"
                :key="p.id"
                type="button"
                class="ft-details__rel-link"
                @click="jumpTo(p)"
              >{{ fullName(p) }}</button>
            </div>
          </template>
        </div>
      </transition>
    </div>
  </div>
</template>

<style scoped>
.lcms-family-tree {
  position: relative;
  font-family: var(--lcms-font-body, inherit);
}

.lcms-family-tree__viewport {
  position: relative;
  overflow: hidden;
  width: 100%;
  cursor: grab;
  touch-action: none;
  user-select: none;
  border-radius: var(--lcms-border-radius, 8px);
}
.lcms-family-tree__viewport:active { cursor: grabbing; }

.lcms-family-tree__stage {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: 0 0;
  will-change: transform;
}

.lcms-family-tree__lines {
  position: absolute;
  top: 0;
  left: 0;
  overflow: visible;
  pointer-events: none;
}
.lcms-family-tree__link {
  fill: none;
  stroke: var(--ft-line, var(--lcms-color-border, #c9ced6));
  stroke-width: 2;
}

.ft-card {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  box-sizing: border-box;
  background: var(--ft-card-bg, #fff);
  border: 2px solid var(--ft-neutral, #b8bec7);
  border-radius: var(--ft-radius, 10px);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  transition: background 0.15s ease, box-shadow 0.15s ease;
}
.ft-card--clickable { cursor: pointer; }
.ft-card:hover { background: var(--ft-card-bg-hover, var(--ft-card-bg, #fff)); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12); }
.ft-card--m { border-color: var(--ft-male, #5bb3d9); }
.ft-card--f { border-color: var(--ft-female, #ef8a8a); }
.ft-card--root { border-width: 3px; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.16); }
.ft-card--selected { outline: 2px solid var(--lcms-color-primary, #50a5f1); outline-offset: 3px; }

.ft-card__photo {
  flex: 0 0 auto;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  overflow: hidden;
  background: #eef0f3;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ft-card__photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
.ft-card__silhouette { width: 30px; height: 30px; fill: #c3c9d2; }

.ft-card__body { min-width: 0; flex: 1; }
.ft-card__name {
  font-size: 13px;
  font-weight: 600;
  line-height: 1.25;
  color: var(--ft-name, var(--lcms-color-dark, #212529));
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.ft-card__dates {
  font-size: 12px;
  margin-top: 2px;
  color: var(--ft-dates, var(--lcms-color-muted, #6c757d));
  white-space: nowrap;
}

.lcms-family-tree__controls {
  position: absolute;
  right: 12px;
  bottom: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.lcms-family-tree__controls button {
  width: 32px;
  height: 32px;
  border: 1px solid #dfe3e8;
  border-radius: 8px;
  background: #fff;
  color: #495057;
  cursor: pointer;
  font-size: 13px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}
.lcms-family-tree__controls button:hover { background: #f5f6f8; }

.lcms-family-tree__details {
  position: absolute;
  top: 12px;
  right: 12px;
  bottom: 12px;
  width: min(300px, calc(100% - 24px));
  overflow-y: auto;
  padding: 20px 16px 16px;
  background: var(--ft-card-bg, #fff);
  border-radius: var(--ft-radius, 10px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);
  cursor: default;
  user-select: text;
  text-align: center;
}
.lcms-family-tree__close {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: #6c757d;
  cursor: pointer;
}
.lcms-family-tree__close:hover { background: #f0f2f5; }

.ft-details__photo {
  width: 96px;
  height: 96px;
  margin: 0 auto 10px;
  border-radius: 50%;
  overflow: hidden;
  background: #eef0f3;
  border: 3px solid var(--ft-neutral, #b8bec7);
  display: flex;
  align-items: center;
  justify-content: center;
}
.ft-details__photo.ft-card--m { border-color: var(--ft-male, #5bb3d9); }
.ft-details__photo.ft-card--f { border-color: var(--ft-female, #ef8a8a); }
.ft-details__photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
.ft-details__photo .ft-card__silhouette { width: 60px; height: 60px; }

.ft-details__name { font-size: 17px; font-weight: 700; color: var(--ft-name, var(--lcms-color-dark, #212529)); }
.ft-details__maiden { font-size: 13px; color: var(--ft-dates, var(--lcms-color-muted, #6c757d)); }

.ft-details__facts {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 12px;
  margin: 14px 0 0;
  text-align: left;
  font-size: 13px;
}
.ft-details__facts dt { color: var(--ft-dates, var(--lcms-color-muted, #6c757d)); }
.ft-details__facts dd { margin: 0; color: var(--ft-name, var(--lcms-color-dark, #212529)); }

.ft-details__note {
  margin: 12px 0 0;
  font-size: 13px;
  line-height: 1.5;
  text-align: left;
  color: var(--ft-name, var(--lcms-color-dark, #212529));
  white-space: pre-line;
}

.ft-details__rel { margin-top: 12px; text-align: left; }
.ft-details__rel-title {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--ft-dates, var(--lcms-color-muted, #6c757d));
  margin-bottom: 4px;
}
.ft-details__rel-link {
  display: block;
  width: 100%;
  text-align: left;
  padding: 4px 0;
  border: none;
  background: transparent;
  font-size: 13px;
  color: var(--lcms-color-primary, #50a5f1);
  cursor: pointer;
}
.ft-details__rel-link:hover { text-decoration: underline; }

.ft-details-enter-active, .ft-details-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.ft-details-enter-from, .ft-details-leave-to { opacity: 0; transform: translateX(12px); }
</style>
