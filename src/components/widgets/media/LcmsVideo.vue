<script setup lang="ts">
/**
 * Video Widget
 *
 * Renders embedded video from YouTube, Vimeo, or direct URL.
 */

import { computed } from 'vue'
import type { VideoWidgetData } from '@/types/widgets'

defineOptions({
  inheritAttrs: false
})

interface Props {
  data: VideoWidgetData
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const source = computed(() => props.data.source || 'youtube')
const videoUrl = computed(() => props.data.url || '')
const autoplay = computed(() => props.data.autoplay || false)
const loop = computed(() => props.data.loop || false)
const muted = computed(() => props.data.muted || false)

// Extract video ID from URLs
const youtubeId = computed(() => {
  if (source.value !== 'youtube') return null
  const url = videoUrl.value
  // Support various YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/,
    /^([a-zA-Z0-9_-]{11})$/
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
})

const vimeoId = computed(() => {
  if (source.value !== 'vimeo') return null
  const url = videoUrl.value
  const patterns = [
    /vimeo\.com\/(\d+)/,
    /player\.vimeo\.com\/video\/(\d+)/,
    /^(\d+)$/
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
})

const embedUrl = computed(() => {
  const params = new URLSearchParams()

  if (source.value === 'youtube' && youtubeId.value) {
    if (autoplay.value) params.append('autoplay', '1')
    if (loop.value) params.append('loop', '1')
    if (muted.value) params.append('mute', '1')
    const query = params.toString()
    return `https://www.youtube.com/embed/${youtubeId.value}${query ? '?' + query : ''}`
  }

  if (source.value === 'vimeo' && vimeoId.value) {
    if (autoplay.value) params.append('autoplay', '1')
    if (loop.value) params.append('loop', '1')
    if (muted.value) params.append('muted', '1')
    const query = params.toString()
    return `https://player.vimeo.com/video/${vimeoId.value}${query ? '?' + query : ''}`
  }

  return null
})

const isDirectVideo = computed(() => source.value === 'url')
</script>

<template>
  <div class="lcms-video">
    <!-- YouTube/Vimeo Embed -->
    <div
      v-if="embedUrl"
      class="lcms-video__embed"
    >
      <iframe
        :src="embedUrl"
        class="lcms-video__iframe"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
      />
    </div>

    <!-- Direct Video URL -->
    <video
      v-else-if="isDirectVideo && videoUrl"
      class="lcms-video__player"
      :autoplay="autoplay"
      :loop="loop"
      :muted="muted"
      controls
    >
      <source :src="videoUrl">
      Your browser does not support the video tag.
    </video>

    <!-- Placeholder -->
    <div
      v-else
      class="lcms-video__placeholder"
    >
      <i class="fa-solid fa-video" />
      <span>No video URL provided</span>
    </div>
  </div>
</template>
