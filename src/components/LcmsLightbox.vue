<script setup lang="ts">
/**
 * LcmsLightbox — single global fullscreen viewer with zoom.
 *
 * Mounted once by LessCMSProvider. Open it from anywhere with
 * `openLightbox(items, index)` (see composables/useLightbox.ts).
 *
 * Controls: ✕ / Esc / click on backdrop closes, ←/→ and swipe change image
 * (swipe only at zoom 1), wheel zooms at cursor, double click / double tap
 * zooms 2.5× or resets, +/− buttons and keys, pinch zoom, drag when zoomed.
 */

import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useLightbox } from '@/composables/useLightbox'

const { state, closeLightbox, stepLightbox } = useLightbox()

const MIN_ZOOM = 1
const MAX_ZOOM = 5
const SWIPE_THRESHOLD = 50

const zoom = ref(1)
const panX = ref(0)
const panY = ref(0)
const dragging = ref(false)
const imgEl = ref<HTMLImageElement | null>(null)

const current = computed(() => state.items[state.index])
const isImage = computed(() => current.value?.type !== 'video')
const total = computed(() => state.items.length)
const zoomed = computed(() => zoom.value > MIN_ZOOM)

const imgStyle = computed(() => ({
  transform: `translate(${panX.value}px, ${panY.value}px) scale(${zoom.value})`
}))

function resetZoom() {
  zoom.value = 1
  panX.value = 0
  panY.value = 0
}

// Zoom to `next` keeping the point (cx, cy) under the cursor fixed.
function zoomTo(next: number, cx?: number, cy?: number) {
  const nz = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next))
  const el = imgEl.value
  if (el) {
    const r = el.getBoundingClientRect()
    const ox = r.left + r.width / 2
    const oy = r.top + r.height / 2
    const px = cx ?? window.innerWidth / 2
    const py = cy ?? window.innerHeight / 2
    panX.value += (px - ox) * (1 - nz / zoom.value)
    panY.value += (py - oy) * (1 - nz / zoom.value)
  }
  zoom.value = nz
  if (nz === MIN_ZOOM) {
    panX.value = 0
    panY.value = 0
  }
}

function close() {
  closeLightbox()
  resetZoom()
}

function next() { stepLightbox(1) }
function prev() { stepLightbox(-1) }

// Changing image resets zoom.
watch(() => state.index, () => resetZoom())

// Body scroll lock (client only; watch never runs on the server).
watch(() => state.open, (open) => {
  if (typeof document === 'undefined') return
  document.body.style.overflow = open ? 'hidden' : ''
  if (!open) resetZoom()
})

function onKey(e: KeyboardEvent) {
  if (!state.open) return
  if (e.key === 'Escape') close()
  else if (e.key === 'ArrowLeft') prev()
  else if (e.key === 'ArrowRight') next()
  else if (isImage.value && (e.key === '+' || e.key === '=')) zoomTo(zoom.value * 1.6)
  else if (isImage.value && e.key === '-') zoomTo(zoom.value / 1.6)
  else if (isImage.value && e.key === '0') resetZoom()
}

function onWheel(e: WheelEvent) {
  if (!isImage.value) return
  e.preventDefault()
  zoomTo(zoom.value * Math.exp(-e.deltaY * 0.0025), e.clientX, e.clientY)
}

function onDblClick(e: MouseEvent) {
  if (zoomed.value) resetZoom()
  else zoomTo(2.5, e.clientX, e.clientY)
}

// Pointer gestures: 1 pointer = pan (when zoomed) or swipe (at zoom 1),
// 2 pointers = pinch. Touch double-tap is detected here because dblclick
// is not reliable on touch devices.
const pointers = new Map<number, { x: number; y: number }>()
let pinchDist = 0
let startX = 0
let lastTap = 0

function onPointerDown(e: PointerEvent) {
  const el = imgEl.value
  if (!el) return
  el.setPointerCapture(e.pointerId)
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
  startX = e.clientX
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()]
    pinchDist = Math.hypot(a.x - b.x, a.y - b.y)
  }
  if (e.pointerType === 'touch' && pointers.size === 1) {
    const now = Date.now()
    if (now - lastTap < 300) {
      if (zoomed.value) resetZoom()
      else zoomTo(2.5, e.clientX, e.clientY)
    }
    lastTap = now
  }
  dragging.value = true
}

function onPointerMove(e: PointerEvent) {
  const prev = pointers.get(e.pointerId)
  if (!prev) return
  if (pointers.size === 2) {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const [a, b] = [...pointers.values()]
    const d = Math.hypot(a.x - b.x, a.y - b.y)
    if (pinchDist) zoomTo(zoom.value * d / pinchDist, (a.x + b.x) / 2, (a.y + b.y) / 2)
    pinchDist = d
    return
  }
  if (zoomed.value) {
    panX.value += e.clientX - prev.x
    panY.value += e.clientY - prev.y
  }
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
}

function onPointerUp(e: PointerEvent) {
  if (!pointers.has(e.pointerId)) return
  const single = pointers.size === 1
  pointers.delete(e.pointerId)
  if (pointers.size < 2) pinchDist = 0
  if (pointers.size === 0) {
    dragging.value = false
    if (single && !zoomed.value && e.pointerType === 'touch') {
      const dx = e.clientX - startX
      if (Math.abs(dx) > SWIPE_THRESHOLD) (dx < 0 ? next : prev)()
    }
  }
}

function onBackdropClick(e: MouseEvent) {
  if (e.target === e.currentTarget) close()
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  if (typeof document !== 'undefined' && state.open) document.body.style.overflow = ''
})

// Focus the close button when opened, for keyboard users.
const closeBtn = ref<HTMLButtonElement | null>(null)
watch(() => state.open, async (open) => {
  if (open) {
    await nextTick()
    closeBtn.value?.focus()
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="lcms-lb-fade">
      <div
        v-if="state.open && current"
        class="lcms-lb"
        :class="{ 'lcms-lb--zoomed': zoomed, 'lcms-lb--dragging': dragging }"
        role="dialog"
        aria-modal="true"
        @click="onBackdropClick"
        @wheel="onWheel"
      >
        <button
          ref="closeBtn"
          type="button"
          class="lcms-lb__btn lcms-lb__close"
          aria-label="Close"
          @click.stop="close"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>
        </button>

        <template v-if="isImage">
          <button
            type="button"
            class="lcms-lb__btn lcms-lb__zoom lcms-lb__zoom--in"
            aria-label="Zoom in"
            @click.stop="zoomTo(zoom * 1.6)"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>
          </button>
          <button
            type="button"
            class="lcms-lb__btn lcms-lb__zoom lcms-lb__zoom--out"
            aria-label="Zoom out"
            :disabled="!zoomed"
            @click.stop="zoomTo(zoom / 1.6)"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M5 12h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>
          </button>
        </template>

        <button
          v-if="total > 1"
          type="button"
          class="lcms-lb__btn lcms-lb__nav lcms-lb__nav--prev"
          aria-label="Previous"
          @click.stop="prev"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
        </button>

        <div class="lcms-lb__stage">
          <img
            v-if="isImage"
            :key="`img-${state.index}`"
            ref="imgEl"
            :src="current.src"
            :alt="current.alt || ''"
            class="lcms-lb__img"
            :style="imgStyle"
            draggable="false"
            decoding="async"
            @pointerdown="onPointerDown"
            @pointermove="onPointerMove"
            @pointerup="onPointerUp"
            @pointercancel="onPointerUp"
            @dblclick="onDblClick"
          >
          <video
            v-else
            :key="`vid-${state.index}`"
            :src="current.src"
            :poster="current.poster || undefined"
            class="lcms-lb__video"
            controls
            autoplay
            playsinline
            @click.stop
          />
        </div>

        <button
          v-if="total > 1"
          type="button"
          class="lcms-lb__btn lcms-lb__nav lcms-lb__nav--next"
          aria-label="Next"
          @click.stop="next"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
        </button>

        <div
          v-if="total > 1 || current.caption"
          class="lcms-lb__cnt"
        >
          <b v-if="total > 1">{{ state.index + 1 }} / {{ total }}</b>
          <template v-if="current.caption">
            <span v-if="total > 1"> · </span>{{ current.caption }}
          </template>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.lcms-lb {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: grid;
  place-items: center;
  background: rgba(17, 17, 17, 0.94);
  background: color-mix(in srgb, var(--lcms-color-dark, #343a40) 94%, transparent);
  backdrop-filter: blur(8px);
  touch-action: none;
}

.lcms-lb-fade-enter-active,
.lcms-lb-fade-leave-active { transition: opacity 0.3s ease; }
.lcms-lb-fade-enter-from,
.lcms-lb-fade-leave-to { opacity: 0; }

.lcms-lb__stage {
  display: grid;
  place-items: center;
  max-width: 100vw;
  max-height: 100vh;
}

.lcms-lb__img {
  max-width: min(1400px, 88vw);
  max-height: 84vh;
  object-fit: contain;
  user-select: none;
  -webkit-user-drag: none;
  cursor: zoom-in;
  transition: transform 0.35s ease;
  border-radius: 4px;
}
.lcms-lb--zoomed .lcms-lb__img { cursor: grab; }
.lcms-lb--dragging .lcms-lb__img { transition: none; cursor: grabbing; }

.lcms-lb__video {
  max-width: min(1100px, 90vw);
  max-height: 84vh;
  background: #000;
  border-radius: 4px;
}

.lcms-lb__btn {
  position: absolute;
  z-index: 2;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  cursor: pointer;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(6px);
  border: 1.5px solid var(--lcms-color-primary, #50a5f1);
  color: var(--lcms-color-primary, #50a5f1);
  transition: background-color 0.3s, color 0.3s;
}
.lcms-lb__btn:hover:not(:disabled),
.lcms-lb__btn:focus-visible {
  background: var(--lcms-color-primary, #50a5f1);
  color: var(--lcms-color-on-primary, #fff);
}
.lcms-lb__btn:disabled { opacity: 0.3; cursor: default; }

.lcms-lb__close { top: 24px; right: 24px; }
.lcms-lb__zoom--in { top: 24px; right: 152px; }
.lcms-lb__zoom--out { top: 24px; right: 88px; }
.lcms-lb__zoom { width: 56px; }
.lcms-lb__nav { top: 50%; margin-top: -28px; }
.lcms-lb__nav--prev { left: 24px; }
.lcms-lb__nav--next { right: 24px; }

.lcms-lb__cnt {
  position: absolute;
  z-index: 2;
  bottom: 26px;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 14px;
  background: rgba(0, 0, 0, 0.45);
  border-radius: 999px;
  font-size: 12px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  white-space: nowrap;
  color: rgba(255, 255, 255, 0.85);
  font-weight: 600;
  max-width: 90vw;
  overflow: hidden;
  text-overflow: ellipsis;
}
.lcms-lb__cnt b { color: var(--lcms-color-primary, #50a5f1); font-weight: 700; }

@media (max-width: 768px) {
  .lcms-lb__img { max-width: 100vw; max-height: 78vh; }
  .lcms-lb__btn { width: 44px; height: 44px; }
  .lcms-lb__close { top: 14px; right: 14px; }
  .lcms-lb__zoom--in { top: 14px; right: 126px; }
  .lcms-lb__zoom--out { top: 14px; right: 70px; }
  .lcms-lb__zoom { width: 44px; }
  .lcms-lb__nav { top: auto; bottom: 16px; margin: 0; }
  .lcms-lb__nav--prev { left: 16px; }
  .lcms-lb__nav--next { right: 16px; }
}

@media (prefers-reduced-motion: reduce) {
  .lcms-lb,
  .lcms-lb__img,
  .lcms-lb__btn { transition: none; }
}
</style>
