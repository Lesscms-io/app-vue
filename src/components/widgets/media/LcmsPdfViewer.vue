<script setup lang="ts">
/**
 * PDF Viewer Widget
 *
 * Renders a PDF file with flipbook effect using dFlip library.
 * The library must be loaded externally (via CDN or bundled).
 */

import { computed, ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'

defineOptions({
  inheritAttrs: false
})

interface Props {
  data: {
    file?: string
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

// Generate unique ID for this instance
const instanceId = ref(`pdf-viewer-${Math.random().toString(36).substring(2, 9)}`)
const containerRef = ref<HTMLElement | null>(null)
const flipbookInstance = ref<any>(null)
const isLoaded = ref(false)
const hasError = ref(false)

// Computed properties
const pdfUrl = computed(() => {
  const file = props.data?.file
  if (!file) return null
  if (typeof file === 'string') return file
  return (file as any).public_link || (file as any).url || null
})

const heightMode = computed(() => props.data?.height_mode || 'fixed')

const height = computed(() => {
  const h = parseInt(String(props.data?.height))
  return h > 0 ? h : 600
})

const containerStyle = computed(() => {
  if (heightMode.value === 'container') {
    return { height: '100%', minHeight: '200px' }
  }
  return { height: `${height.value}px` }
})

const pageMode = computed(() => props.data?.page_mode || 'double')
const showControls = computed(() => props.data?.show_controls !== false)
const showThumbnails = computed(() => props.data?.show_thumbnails !== false)
const showOutline = computed(() => props.data?.show_outline !== false)
const showFullscreen = computed(() => props.data?.show_fullscreen !== false)
const showDownload = computed(() => props.data?.show_download !== false)
const backgroundColor = computed(() => props.data?.background_color || '#1a1a1a')

// Check if dFlip library is available
const isDFlipAvailable = () => {
  return typeof window !== 'undefined' &&
         (window as any).jQuery &&
         (window as any).DFLIP
}

// Initialize the flipbook
const initFlipbook = async () => {
  if (!pdfUrl.value || !containerRef.value) return

  // Wait for dFlip to be available
  if (!isDFlipAvailable()) {
    console.warn('dFlip library is not loaded. PDF viewer requires dFlip.')
    hasError.value = true
    return
  }

  try {
    // Destroy previous instance if exists
    if (flipbookInstance.value) {
      try {
        if (flipbookInstance.value.dispose) {
          flipbookInstance.value.dispose()
        }
      } catch (e) {
        // Ignore cleanup errors
      }
      containerRef.value.innerHTML = ''
    }

    const $ = (window as any).jQuery
    const DFLIP = (window as any).DFLIP

    // Configure dFlip options
    const options = {
      height: '100%',
      autoEnableOutline: showOutline.value,
      autoEnableThumbnail: showThumbnails.value,
      webgl: true,
      hard: 'none',
      duration: 800,
      backgroundColor: backgroundColor.value,
      backgroundImage: '',
      paddingTop: 20,
      paddingBottom: 20,
      paddingLeft: 20,
      paddingRight: 20,
      controlsPosition: showControls.value ? 'bottom' : 'hidden',
      scrollWheel: true,
      soundEnable: true,
      pageMode: pageMode.value === 'single'
        ? DFLIP.PAGE_MODE.SINGLE
        : DFLIP.PAGE_MODE.DOUBLE,
      singlePageMode: DFLIP.SINGLE_PAGE_MODE.BOOKLET,
      direction: DFLIP.DIRECTION.LTR,
      enableDownload: showDownload.value,
      hideControls: !showControls.value,
      showDownloadControl: showDownload.value,
      showFullscreen: showFullscreen.value
    }

    // Initialize flipbook
    flipbookInstance.value = $(containerRef.value).flipBook(pdfUrl.value, options)
    isLoaded.value = true
    hasError.value = false
  } catch (error) {
    console.error('Failed to initialize PDF viewer:', error)
    hasError.value = true
  }
}

// Cleanup on unmount
onBeforeUnmount(() => {
  if (flipbookInstance.value) {
    try {
      if (flipbookInstance.value.dispose) {
        flipbookInstance.value.dispose()
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  }
})

// Initialize on mount
onMounted(() => {
  nextTick(() => {
    initFlipbook()
  })
})

// Watch for URL changes
watch(() => pdfUrl.value, () => {
  nextTick(() => {
    initFlipbook()
  })
})
</script>

<template>
  <div
    class="lcms-pdf-viewer"
    :style="{
      ...containerStyle,
      backgroundColor: backgroundColor
    }"
  >
    <!-- PDF Flipbook Container -->
    <div
      v-if="pdfUrl"
      :id="instanceId"
      ref="containerRef"
      class="lcms-pdf-viewer__flipbook"
    />

    <!-- Error state -->
    <div
      v-else-if="hasError"
      class="lcms-pdf-viewer__error"
    >
      <i class="fa-solid fa-exclamation-triangle" />
      <span>Failed to load PDF viewer</span>
    </div>

    <!-- No file placeholder -->
    <div
      v-else
      class="lcms-pdf-viewer__placeholder"
    >
      <i class="fa-solid fa-file-pdf" />
      <span>No PDF file selected</span>
    </div>
  </div>
</template>

<style scoped>
.lcms-pdf-viewer {
  width: 100%;
  position: relative;
  overflow: hidden;
  border-radius: 8px;
}

.lcms-pdf-viewer__flipbook {
  width: 100%;
  height: 100%;
}

.lcms-pdf-viewer__placeholder,
.lcms-pdf-viewer__error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  gap: 12px;
  color: #6c757d;
}

.lcms-pdf-viewer__placeholder i,
.lcms-pdf-viewer__error i {
  font-size: 48px;
  opacity: 0.5;
}

.lcms-pdf-viewer__placeholder i {
  color: #dc3545;
}

.lcms-pdf-viewer__error {
  color: #dc3545;
}

.lcms-pdf-viewer__error i {
  color: #dc3545;
}
</style>
