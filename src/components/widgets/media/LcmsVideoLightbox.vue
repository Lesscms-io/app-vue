<script setup lang="ts">
/**
 * Video Lightbox Widget (premium)
 *
 * Poster + play button. Click opens the video in a fullscreen lightbox
 * (teleported to body, ESC / backdrop closes) or, with the lightbox off,
 * swaps the poster for the player in place. YouTube / Vimeo iframes or a
 * direct file — the embed URL comes from the API (fallback computed here).
 */

import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { useLanguage } from '@/composables/useLanguage'
import { resolveColor } from '@/utils/resolveColor'
import type { VideoLightboxWidgetData } from '@/types/widgets'

defineOptions({ inheritAttrs: false })

interface Props {
  data: VideoLightboxWidgetData
  settings?: Record<string, any>
  language?: string
}
const props = defineProps<Props>()
const { extractValue } = useLanguage(props.language)

const config = computed(() => (props.data as any).widget || props.data || {})
const videoGroup = computed(() => config.value.video || {})
const posterGroup = computed(() => config.value.poster || {})
const playGroup = computed(() => config.value.play || {})
const textGroup = computed(() => config.value.text || {})
const lightboxGroup = computed(() => config.value.lightbox || {})

const source = computed(() => videoGroup.value.source || 'youtube')
const isFile = computed(() => source.value === 'file')
const embedUrl = computed(() => {
  if (videoGroup.value.embed_url) return videoGroup.value.embed_url
  const url = videoGroup.value.url || ''
  const t = Number(videoGroup.value.start) || 0
  if (source.value === 'youtube') {
    const m = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/)
    return m ? `https://www.youtube-nocookie.com/embed/${m[1]}?autoplay=1&rel=0${t ? `&start=${t}` : ''}` : ''
  }
  if (source.value === 'vimeo') {
    const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
    return m ? `https://player.vimeo.com/video/${m[1]}?autoplay=1${t ? `#t=${t}s` : ''}` : ''
  }
  return url
})
const poster = computed(() => posterGroup.value.image || '')
const posterAlt = computed(() => extractValue(posterGroup.value.alt) || '')
const title = computed(() => extractValue(textGroup.value.title) || '')
const subtitle = computed(() => extractValue(textGroup.value.subtitle) || '')
const textPosition = computed(() => textGroup.value.position || 'overlay-bottom')
const useLightbox = computed(() => lightboxGroup.value.enabled !== false)

const open = ref(false)
const inline = ref(false)
const play = () => {
  if (!embedUrl.value) return
  if (useLightbox.value) { open.value = true; document.body.style.overflow = 'hidden' } else inline.value = true
}
const close = () => { open.value = false; document.body.style.overflow = '' }
const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && open.value) close() }
onMounted(() => document.addEventListener('keydown', onKey))
onBeforeUnmount(() => { document.removeEventListener('keydown', onKey); if (open.value) document.body.style.overflow = '' })

const ratioStyle = computed(() => {
  const [w, h] = (posterGroup.value.ratio || '16:9').split(':').map(Number)
  return { aspectRatio: `${w || 16} / ${h || 9}` }
})
const rootStyle = computed(() => ({
  '--vl-radius': `${posterGroup.value.radius ?? 12}px`,
  '--vl-overlay': String(posterGroup.value.overlay ?? 0.25),
  '--vl-play-size': `${playGroup.value.size || 80}px`,
  '--vl-play-color': resolveColor(playGroup.value.color) || '#ffffff',
  '--vl-play-bg': resolveColor(playGroup.value.background) || 'var(--lcms-color-primary)',
  '--vl-play-bg-hover': resolveColor(playGroup.value['background:hover']) || resolveColor(playGroup.value.background) || 'var(--lcms-color-primary)',
  '--vl-text-color': resolveColor(textGroup.value.color) || '#ffffff',
  '--vl-backdrop': resolveColor(lightboxGroup.value.backdrop) || 'rgba(17, 24, 39, 0.92)',
  '--vl-width': `${lightboxGroup.value.width || 1100}px`
}))
const rootClasses = computed(() => [
  'lcms-video-lightbox',
  `vl--play-${playGroup.value.style || 'circle'}`,
  `vl--text-${textPosition.value}`
])
</script>

<template>
  <div
    :class="rootClasses"
    :style="rootStyle"
  >
    <div
      class="vl-poster"
      :style="ratioStyle"
    >
      <template v-if="inline">
        <video
          v-if="isFile"
          class="vl-player"
          :src="embedUrl"
          controls
          autoplay
          playsinline
        />
        <iframe
          v-else
          class="vl-player"
          :src="embedUrl"
          :title="title || 'Video'"
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          allowfullscreen
        />
      </template>
      <template v-else>
        <img
          v-if="poster"
          class="vl-poster__img"
          :src="poster"
          :alt="posterAlt"
          loading="lazy"
        >
        <div class="vl-overlay" />
        <button
          type="button"
          class="vl-play"
          :aria-label="title || 'Play video'"
          @click="play"
        >
          <svg
            viewBox="0 0 24 24"
            width="1em"
            height="1em"
            fill="currentColor"
            aria-hidden="true"
          ><path d="M8 5v14l11-7z" /></svg>
        </button>
        <div
          v-if="(textPosition === 'overlay-bottom' || textPosition === 'overlay-center') && (title || subtitle)"
          class="vl-text vl-text--overlay"
        >
          <div
            v-if="title"
            class="vl-title"
          >{{ title }}</div>
          <div
            v-if="subtitle"
            class="vl-subtitle"
          >{{ subtitle }}</div>
        </div>
      </template>
    </div>
    <div
      v-if="textPosition === 'below' && (title || subtitle)"
      class="vl-text vl-text--below"
    >
      <div
        v-if="title"
        class="vl-title"
      >{{ title }}</div>
      <div
        v-if="subtitle"
        class="vl-subtitle"
      >{{ subtitle }}</div>
    </div>

    <Teleport to="body">
      <div
        v-if="open"
        class="lcms-video-lightbox__modal"
        :style="rootStyle"
        role="dialog"
        aria-modal="true"
        @click.self="close"
      >
        <button
          type="button"
          class="vl-close"
          aria-label="Close"
          @click="close"
        >
          ×
        </button>
        <div
          class="vl-modal__frame"
          :style="ratioStyle"
        >
          <video
            v-if="isFile"
            class="vl-player"
            :src="embedUrl"
            controls
            autoplay
            playsinline
          />
          <iframe
            v-else
            class="vl-player"
            :src="embedUrl"
            :title="title || 'Video'"
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            allowfullscreen
          />
        </div>
      </div>
    </Teleport>
  </div>
</template>
