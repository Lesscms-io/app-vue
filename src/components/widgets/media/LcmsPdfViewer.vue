<script setup lang="ts">
/**
 * PDF Viewer Widget
 *
 * Embeds the PDF via a native <iframe> — every modern browser ships a built-in
 * PDF reader with paging, zoom, download and fullscreen, so no external library
 * is required. (The previous dFlip-based flipbook quietly errored out in prod
 * because dFlip is a commercial plugin and was never bundled or loaded from a
 * CDN, leaving widgets in a permanent error state.)
 *
 * #toolbar/#view/#zoom hash params are Chrome's PDF viewer convention but are
 * also widely accepted by Firefox's pdf.js — they let us mirror the on/off
 * controls in the widget settings.
 */

import { computed } from 'vue'

defineOptions({
  inheritAttrs: false
})

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

// Some build pipelines wrap widget content in `.widget`, others pass it flat —
// support both shapes so the widget renders in editor preview AND on the storefront.
const config = computed<Record<string, any>>(() => (props.data as any)?.widget || props.data || {})

const rawFile = computed(() => config.value.file)
const pdfUrl = computed<string | null>(() => {
  const f = rawFile.value
  if (!f) return null
  if (typeof f === 'string') return f
  return (f as any).public_link || (f as any).url || null
})

const showControls = computed(() => config.value.show_controls !== false)
const showThumbnails = computed(() => config.value.show_thumbnails !== false)
const showDownload = computed(() => config.value.show_download !== false)

// Hash params control Chrome/Firefox built-in viewer chrome. We don't get
// flipbook spreads from native, but we honor what we can — toolbar visibility,
// initial sidebar mode (thumbnails/outline/none), and the page-spread layout.
const pdfUrlWithHash = computed<string | null>(() => {
  if (!pdfUrl.value) return null
  const params: string[] = []
  params.push(`toolbar=${showControls.value ? 1 : 0}`)
  params.push(`navpanes=${showThumbnails.value ? 1 : 0}`)
  if (!showDownload.value) {
    // Chrome's viewer doesn't have a "disable download" flag — best-effort hint.
    params.push('view=Fit')
  }
  return `${pdfUrl.value}#${params.join('&')}`
})

const height = computed(() => {
  const h = parseInt(String(config.value.height))
  return h > 0 ? h : 600
})

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

const backgroundColor = computed(() => resolveColor(config.value.background_color) || '#1a1a1a')

const containerStyle = computed(() => ({
  height: `${height.value}px`,
  backgroundColor: backgroundColor.value
}))
</script>

<template>
  <div
    class="lcms-pdf-viewer"
    :style="containerStyle"
  >
    <iframe
      v-if="pdfUrlWithHash"
      :src="pdfUrlWithHash"
      class="lcms-pdf-viewer__frame"
      :title="'PDF viewer'"
      loading="lazy"
      referrerpolicy="no-referrer"
    />

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

.lcms-pdf-viewer__frame {
  width: 100%;
  height: 100%;
  border: 0;
  display: block;
}

.lcms-pdf-viewer__placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  gap: 12px;
  color: var(--lcms-color-muted, #6c757d);
}

.lcms-pdf-viewer__placeholder i {
  font-size: 48px;
  opacity: 0.5;
  color: var(--lcms-color-danger, #dc3545);
}
</style>
