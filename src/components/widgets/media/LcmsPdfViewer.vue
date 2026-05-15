<script setup lang="ts">
/**
 * PDF Viewer Widget
 *
 * Renders the PDF onto a <canvas> via pdfjs-dist and ships a custom toolbar
 * (prev / next / zoom / download / fullscreen). Native <iframe> + #toolbar=1
 * was insufficient — Chrome 105+ strips the embedded PDF viewer chrome for
 * cross-origin iframes (img.lesscms.io ≠ host page), so users saw the PDF
 * but no controls. Rendering ourselves sidesteps that entirely.
 */

import { computed, ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'

defineOptions({ inheritAttrs: false })

interface Props {
  data: {
    file?: string | { public_link?: string; url?: string }
    height?: number | string
    height_mode?: 'fixed' | 'container'
    page_mode?: 'single' | 'double'
    show_controls?: boolean
    show_thumbnails?: boolean
    show_outline?: boolean
    show_fullscreen?: boolean
    show_download?: boolean
    background_color?: string
  }
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const config = computed<Record<string, any>>(() => (props.data as any)?.widget || props.data || {})

const pdfUrl = computed<string | null>(() => {
  const f = config.value.file
  if (!f) return null
  if (typeof f === 'string') return f
  return (f as any).public_link || (f as any).url || null
})

const height = computed(() => {
  const h = parseInt(String(config.value.height))
  return h > 0 ? h : 600
})

const showControls = computed(() => config.value.show_controls !== false)
const showDownload = computed(() => config.value.show_download !== false)
const showFullscreen = computed(() => config.value.show_fullscreen !== false)
const pageMode = computed<'single' | 'double'>(() => (config.value.page_mode === 'single' ? 'single' : 'double'))

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

const backgroundColor = computed(() => resolveColor(config.value.background_color) || '#1a1a1a')

const wrapperRef = ref<HTMLElement | null>(null)
const canvasLeftRef = ref<HTMLCanvasElement | null>(null)
const canvasRightRef = ref<HTMLCanvasElement | null>(null)
const pdfDoc = ref<any>(null)
const pageCount = ref(0)
const currentPage = ref(1)
const zoom = ref(1)
const loading = ref(false)
const errorMsg = ref<string | null>(null)
const isFullscreen = ref(false)

// pdfjs-dist worker — bundled by Vite/webpack via the .mjs URL helper. Using a
// runtime URL keeps the worker out of the main bundle.
let pdfjsLib: any = null
async function ensurePdfJs() {
  if (pdfjsLib) return pdfjsLib
  pdfjsLib = await import('pdfjs-dist')
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjsLib.GlobalWorkerOptions.workerSrc = (worker as any).default || worker
  return pdfjsLib
}

async function renderPage(canvas: HTMLCanvasElement | null, pageNum: number) {
  if (!canvas || !pdfDoc.value || pageNum < 1 || pageNum > pageCount.value) {
    if (canvas) {
      const ctx = canvas.getContext('2d')
      ctx?.clearRect(0, 0, canvas.width, canvas.height)
    }
    return
  }
  const page = await pdfDoc.value.getPage(pageNum)
  const viewport = page.getViewport({ scale: zoom.value * 1.5 })
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  canvas.width = viewport.width
  canvas.height = viewport.height
  await page.render({ canvasContext: ctx, viewport }).promise
}

async function renderCurrent() {
  if (!pdfDoc.value) return
  if (pageMode.value === 'double') {
    // Spreads: page 1 alone (cover), then 2-3, 4-5, etc.
    if (currentPage.value === 1) {
      await renderPage(canvasLeftRef.value, 1)
      await renderPage(canvasRightRef.value, 0) // clear
    } else {
      await renderPage(canvasLeftRef.value, currentPage.value)
      await renderPage(canvasRightRef.value, currentPage.value + 1)
    }
  } else {
    await renderPage(canvasLeftRef.value, currentPage.value)
  }
}

async function loadPdf() {
  if (!pdfUrl.value) return
  loading.value = true
  errorMsg.value = null
  try {
    const lib = await ensurePdfJs()
    const task = lib.getDocument({ url: pdfUrl.value })
    pdfDoc.value = await task.promise
    pageCount.value = pdfDoc.value.numPages
    currentPage.value = 1
    await nextTick()
    await renderCurrent()
  } catch (e: any) {
    errorMsg.value = e?.message || 'Failed to load PDF'
    console.error('[LcmsPdfViewer] load error:', e)
  } finally {
    loading.value = false
  }
}

function prevPage() {
  const step = pageMode.value === 'double' && currentPage.value > 1 ? 2 : 1
  currentPage.value = Math.max(1, currentPage.value - step)
  renderCurrent()
}
function nextPage() {
  const step = pageMode.value === 'double' && currentPage.value > 1 ? 2 : 1
  currentPage.value = Math.min(pageCount.value, currentPage.value + step)
  renderCurrent()
}
function zoomIn() { zoom.value = Math.min(3, +(zoom.value + 0.25).toFixed(2)); renderCurrent() }
function zoomOut() { zoom.value = Math.max(0.5, +(zoom.value - 0.25).toFixed(2)); renderCurrent() }

function download() {
  if (!pdfUrl.value) return
  const a = document.createElement('a')
  a.href = pdfUrl.value
  a.download = pdfUrl.value.split('/').pop() || 'document.pdf'
  a.target = '_blank'
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

function toggleFullscreen() {
  if (!wrapperRef.value) return
  if (!document.fullscreenElement) {
    wrapperRef.value.requestFullscreen?.().then(() => { isFullscreen.value = true })
  } else {
    document.exitFullscreen?.().then(() => { isFullscreen.value = false })
  }
}

onMounted(() => { loadPdf() })
onBeforeUnmount(() => { pdfDoc.value?.destroy?.() })
watch(() => pdfUrl.value, () => loadPdf())
watch(() => pageMode.value, () => renderCurrent())

const containerStyle = computed(() => ({
  height: isFullscreen.value ? '100vh' : `${height.value}px`,
  backgroundColor: backgroundColor.value
}))
</script>

<template>
  <div
    ref="wrapperRef"
    class="lcms-pdf-viewer"
    :style="containerStyle"
  >
    <div
      v-if="loading"
      class="lcms-pdf-viewer__status"
    >
      <i class="fa-solid fa-spinner fa-spin" />
      <span>Wczytywanie…</span>
    </div>

    <div
      v-else-if="errorMsg"
      class="lcms-pdf-viewer__status lcms-pdf-viewer__status--error"
    >
      <i class="fa-solid fa-triangle-exclamation" />
      <span>{{ errorMsg }}</span>
    </div>

    <div
      v-else-if="!pdfUrl"
      class="lcms-pdf-viewer__status"
    >
      <i class="fa-solid fa-file-pdf" />
      <span>No PDF file selected</span>
    </div>

    <template v-else>
      <div class="lcms-pdf-viewer__stage">
        <canvas ref="canvasLeftRef" class="lcms-pdf-viewer__canvas" />
        <canvas
          v-if="pageMode === 'double'"
          ref="canvasRightRef"
          class="lcms-pdf-viewer__canvas"
        />
      </div>

      <div
        v-if="showControls"
        class="lcms-pdf-viewer__toolbar"
      >
        <button
          type="button"
          class="lcms-pdf-viewer__btn"
          :disabled="currentPage <= 1"
          aria-label="Poprzednia strona"
          @click="prevPage"
        >
          <i class="fa-solid fa-chevron-left" />
        </button>

        <span class="lcms-pdf-viewer__page-indicator">
          {{ currentPage }} / {{ pageCount }}
        </span>

        <button
          type="button"
          class="lcms-pdf-viewer__btn"
          :disabled="currentPage >= pageCount"
          aria-label="Następna strona"
          @click="nextPage"
        >
          <i class="fa-solid fa-chevron-right" />
        </button>

        <span class="lcms-pdf-viewer__divider" />

        <button
          type="button"
          class="lcms-pdf-viewer__btn"
          aria-label="Pomniejsz"
          @click="zoomOut"
        >
          <i class="fa-solid fa-magnifying-glass-minus" />
        </button>
        <span class="lcms-pdf-viewer__zoom-indicator">{{ Math.round(zoom * 100) }}%</span>
        <button
          type="button"
          class="lcms-pdf-viewer__btn"
          aria-label="Powiększ"
          @click="zoomIn"
        >
          <i class="fa-solid fa-magnifying-glass-plus" />
        </button>

        <span class="lcms-pdf-viewer__divider" />

        <button
          v-if="showDownload"
          type="button"
          class="lcms-pdf-viewer__btn"
          aria-label="Pobierz"
          @click="download"
        >
          <i class="fa-solid fa-download" />
        </button>

        <button
          v-if="showFullscreen"
          type="button"
          class="lcms-pdf-viewer__btn"
          aria-label="Pełny ekran"
          @click="toggleFullscreen"
        >
          <i :class="isFullscreen ? 'fa-solid fa-compress' : 'fa-solid fa-expand'" />
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.lcms-pdf-viewer {
  width: 100%;
  position: relative;
  overflow: hidden;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
}

.lcms-pdf-viewer__stage {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  overflow: auto;
  padding: 16px;
}

.lcms-pdf-viewer__canvas {
  max-width: 100%;
  max-height: 100%;
  height: auto;
  display: block;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
  background: #fff;
}

.lcms-pdf-viewer__toolbar {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(8px);
  color: #fff;
}

.lcms-pdf-viewer__btn {
  background: transparent;
  border: 0;
  color: inherit;
  padding: 6px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  transition: background 120ms ease, opacity 120ms ease;
}
.lcms-pdf-viewer__btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.15);
}
.lcms-pdf-viewer__btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.lcms-pdf-viewer__page-indicator,
.lcms-pdf-viewer__zoom-indicator {
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  min-width: 56px;
  text-align: center;
  user-select: none;
}

.lcms-pdf-viewer__divider {
  width: 1px;
  height: 20px;
  background: rgba(255, 255, 255, 0.25);
  margin: 0 4px;
}

.lcms-pdf-viewer__status {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  gap: 12px;
  color: var(--lcms-color-muted, #cccccc);
}
.lcms-pdf-viewer__status i {
  font-size: 48px;
  opacity: 0.5;
}
.lcms-pdf-viewer__status--error {
  color: var(--lcms-color-danger, #dc3545);
}
.lcms-pdf-viewer__status--error i {
  color: var(--lcms-color-danger, #dc3545);
  opacity: 0.7;
}
</style>
