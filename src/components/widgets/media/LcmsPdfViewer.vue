<script setup lang="ts">
/**
 * PDF Viewer Widget
 *
 * Renders a PDF flipbook via dflip. dflip + its assets (three.js, pdf.js worker
 * shipped with dflip, sounds, CSS) are served from the renderer's /dflip/ path
 * so we don't depend on any external CDN. The PDF binary is fetched through
 * /pdf-proxy on the renderer so dflip sees a same-origin blob URL — avoids
 * Chrome's cross-origin PDF viewer restrictions and any CORS quirks.
 *
 * The widget exposes only prev/next/download buttons; dflip's own UI is hidden.
 */

import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'

declare global {
  interface Window {
    DFLIP: any
    jQuery: any
    $: any
    dFlipLocation: string
  }
}

defineOptions({ inheritAttrs: false })

interface Props {
  data: {
    file?: string | { public_link?: string; url?: string }
    height?: number | string
    height_mode?: 'fixed' | 'container'
    page_mode?: 'single' | 'double'
    show_controls?: boolean
    show_download?: boolean
    background_color?: string
  }
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const config = computed<Record<string, any>>(() => (props.data as any)?.widget || props.data || {})

const pdfSource = computed<string>(() => {
  const f = config.value.file
  if (!f) return ''
  if (typeof f === 'string') return f
  return (f as any).public_link || (f as any).url || ''
})

const height = computed(() => {
  const h = parseInt(String(config.value.height))
  return h > 0 ? h : 600
})
const heightMode = computed<'fixed' | 'container'>(() => (config.value.height_mode === 'container' ? 'container' : 'fixed'))
const viewerHeight = computed(() => (heightMode.value === 'container' ? 'calc(100vh - 40px)' : `${height.value}px`))

const showControls = computed(() => config.value.show_controls !== false)
const showDownload = computed(() => config.value.show_download !== false)
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
const backgroundColor = computed(() => resolveColor(config.value.background_color) || 'transparent')

const containerRef = ref<HTMLElement | null>(null)
const flipbookRef = ref<HTMLElement | null>(null)
const isLoading = ref(true)
const isReady = ref(false)
const loadError = ref<string | null>(null)
const blobUrl = ref<string | null>(null)
let flipbookInstance: any = null
const instanceId = computed(() => `pdf-flipbook-${Math.random().toString(36).slice(2, 11)}`)

// Hosts whose files we route through /pdf-proxy so dflip gets a same-origin
// blob URL — keeps Chrome's cross-origin PDF restrictions out of the picture.
const PROXIED_HOSTS = ['https://img.lesscms.io/', 'https://cdn.lesscms.io/']

async function fetchPdfAsBlob(url: string): Promise<string> {
  const fetchUrl = PROXIED_HOSTS.some((h) => url.startsWith(h))
    ? `/pdf-proxy?url=${encodeURIComponent(url)}`
    : url
  const response = await fetch(fetchUrl)
  if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.status}`)
  const blob = await response.blob()
  return URL.createObjectURL(blob)
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`)
    if (existing) {
      if ((existing as any).__loaded) return resolve()
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error(`Failed: ${src}`)))
      return
    }
    const s = document.createElement('script')
    s.src = src
    s.async = false
    s.onload = () => { (s as any).__loaded = true; resolve() }
    s.onerror = () => reject(new Error(`Failed: ${src}`))
    document.head.appendChild(s)
  })
}

async function ensureDflip() {
  if (window.DFLIP && window.jQuery) return

  if (!window.jQuery) {
    await loadScript('https://code.jquery.com/jquery-3.7.1.min.js')
  }

  window.dFlipLocation = '/dflip/'
  ;(window as any).defined = (window as any).defined || function (o: any) { return typeof o !== 'undefined' }

  if (!document.querySelector('link[href*="dflip.min.css"]')) {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = '/dflip/css/dflip.min.css'
    document.head.appendChild(link)
  }

  const scripts = [
    '/dflip/js/libs/three.min.js',
    '/dflip/js/libs/compatibility.min.js',
    '/dflip/js/libs/mockup.min.js',
    '/dflip/js/libs/pdf.min.js',
    '/dflip/js/dflip.min.js',
  ]
  for (const src of scripts) await loadScript(src)

  if (window.DFLIP?.defaults) {
    window.DFLIP.defaults.pdfjsSrc = '/dflip/js/libs/pdf.min.js'
    window.DFLIP.defaults.pdfjsCompatibilitySrc = '/dflip/js/libs/compatibility.min.js'
    window.DFLIP.defaults.threejsSrc = '/dflip/js/libs/three.min.js'
    window.DFLIP.defaults.mockupjsSrc = '/dflip/js/libs/mockup.min.js'
    window.DFLIP.defaults.soundFile = '/dflip/sound/turn2.mp3'
  }
}

function initFlipbook() {
  if (!flipbookRef.value || !blobUrl.value || !window.jQuery || !window.DFLIP) return

  if (flipbookInstance) {
    try { flipbookInstance.dispose?.() } catch (e) { /* ignore */ }
    flipbookRef.value.innerHTML = ''
  }

  isLoading.value = true
  const $ = window.jQuery
  // Open-book aspect: 2 A4 pages side-by-side ≈ 1.414:1 (sqrt(2)).
  const containerWidth = flipbookRef.value.parentElement?.clientWidth || 1200
  const containerHeight = Math.round(containerWidth / 1.414)

  flipbookInstance = $(flipbookRef.value).flipBook(blobUrl.value, {
    height: heightMode.value === 'container' ? '100%' : containerHeight,
    autoEnableOutline: false,
    autoEnableThumbnail: false,
    webgl: true,
    hard: 'none',
    duration: 800,
    backgroundColor: backgroundColor.value || 'transparent',
    backgroundImage: '',
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 10,
    paddingRight: 10,
    controlsPosition: 'bottom',
    // Hide every native dflip control — we render our own arrows + download.
    hideControls: 'altPrev,altNext,outline,thumbnail,zoomIn,zoomOut,fullScreen,share,download,pageNumber,sound,more',
    scrollWheel: true,
    soundEnable: false,
    pageMode: pageMode.value === 'single' ? window.DFLIP.PAGE_MODE.SINGLE : window.DFLIP.PAGE_MODE.DOUBLE,
    singlePageMode: window.DFLIP.SINGLE_PAGE_MODE.BOOKLET,
    direction: window.DFLIP.DIRECTION.LTR,
    onReady: () => { isLoading.value = false },
  })
}

async function loadAndRender() {
  if (!pdfSource.value) return
  isLoading.value = true
  loadError.value = null
  try {
    if (blobUrl.value) URL.revokeObjectURL(blobUrl.value)
    blobUrl.value = await fetchPdfAsBlob(pdfSource.value)
    initFlipbook()
  } catch (e: any) {
    loadError.value = e?.message || 'Failed to load PDF'
    isLoading.value = false
    console.error('[LcmsPdfViewer]', e)
  }
}

function prevPage() { try { flipbookInstance?.target?.prev?.() } catch (e) { /* noop */ } }
function nextPage() { try { flipbookInstance?.target?.next?.() } catch (e) { /* noop */ } }
function downloadPdf() {
  if (!pdfSource.value) return
  const a = document.createElement('a')
  a.href = pdfSource.value
  a.download = (pdfSource.value.split('/').pop() || 'document.pdf')
  a.target = '_blank'
  a.rel = 'noopener'
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
}

onMounted(async () => {
  try {
    await ensureDflip()
    isReady.value = true
    await loadAndRender()
  } catch (e: any) {
    loadError.value = e?.message || 'Failed to load PDF viewer'
    isLoading.value = false
  }
})

watch(pdfSource, () => { if (isReady.value) loadAndRender() })

onBeforeUnmount(() => {
  try { flipbookInstance?.dispose?.() } catch (e) { /* ignore */ }
  if (blobUrl.value) URL.revokeObjectURL(blobUrl.value)
})
</script>

<template>
  <div ref="containerRef" class="lcms-pdf">
    <div
      v-if="pdfSource && !loadError"
      class="lcms-pdf__viewer"
      :style="{ height: viewerHeight }"
    >
      <div v-if="isLoading" class="lcms-pdf__loading">
        <i class="fa-solid fa-spinner fa-spin" />
        <span>Wczytywanie…</span>
      </div>

      <div
        :id="instanceId"
        ref="flipbookRef"
        class="lcms-pdf__flipbook"
      />

      <button
        v-if="showControls"
        type="button"
        class="lcms-pdf__arrow lcms-pdf__arrow--prev"
        aria-label="Poprzednia strona"
        @click="prevPage"
      >
        <i class="fa-solid fa-chevron-left" />
      </button>

      <button
        v-if="showControls"
        type="button"
        class="lcms-pdf__arrow lcms-pdf__arrow--next"
        aria-label="Następna strona"
        @click="nextPage"
      >
        <i class="fa-solid fa-chevron-right" />
      </button>

      <button
        v-if="showDownload"
        type="button"
        class="lcms-pdf__download"
        aria-label="Pobierz PDF"
        @click="downloadPdf"
      >
        <i class="fa-solid fa-download" />
      </button>
    </div>

    <div v-else-if="loadError" class="lcms-pdf__placeholder lcms-pdf__placeholder--error">
      <i class="fa-solid fa-exclamation-triangle" />
      <span>{{ loadError }}</span>
    </div>

    <div v-else class="lcms-pdf__placeholder">
      <i class="fa-solid fa-file-pdf" />
      <span>Nie podano URL pliku PDF</span>
    </div>
  </div>
</template>

<style scoped>
.lcms-pdf {
  width: 100%;
  position: relative;
}

.lcms-pdf__viewer {
  width: 100%;
  position: relative;
  overflow: hidden;
}

.lcms-pdf__flipbook {
  width: 100%;
  height: 100%;
}

.lcms-pdf__loading,
.lcms-pdf__placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--lcms-color-muted, #cccccc);
  pointer-events: none;
}
.lcms-pdf__loading i,
.lcms-pdf__placeholder i {
  font-size: 48px;
  opacity: 0.6;
}
.lcms-pdf__placeholder--error {
  position: static;
  pointer-events: auto;
  color: var(--lcms-color-danger, #dc3545);
}

.lcms-pdf__arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 0;
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  z-index: 5;
  transition: background 120ms ease;
}
.lcms-pdf__arrow:hover { background: rgba(0, 0, 0, 0.7); }
.lcms-pdf__arrow--prev { left: 12px; }
.lcms-pdf__arrow--next { right: 12px; }

.lcms-pdf__download {
  position: absolute;
  right: 12px;
  bottom: 12px;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 0;
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  z-index: 5;
  transition: background 120ms ease;
}
.lcms-pdf__download:hover { background: rgba(0, 0, 0, 0.7); }
</style>
