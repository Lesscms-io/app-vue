<script setup lang="ts">
/**
 * Audio Widget
 *
 * Native HTML5 audio player with optional playlist. Tracks reference uploaded
 * files served through img.lesscms.io, which supports HTTP Range requests so
 * playback + seeking work on mobile (iOS Safari) and large files stream
 * progressively instead of downloading whole.
 */

import { computed, ref } from 'vue'
import type { AudioWidgetData, AudioTrack } from '@/types/widgets'

defineOptions({
  inheritAttrs: false
})

interface Props {
  data: AudioWidgetData
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

// API returns widget payload under data.widget (snake_case); fall back to data.
const config = computed(() => props.data.widget || props.data || {})

function fileNameFromUrl(url: string): string {
  try {
    const clean = url.split('?')[0].split('#')[0]
    const last = decodeURIComponent(clean.substring(clean.lastIndexOf('/') + 1))
    return last.replace(/\.[a-z0-9]+$/i, '') || last
  } catch {
    return url
  }
}

const tracks = computed<AudioTrack[]>(() => {
  const raw = (config.value.tracks || props.data.tracks || []) as (string | AudioTrack)[]
  return raw
    .map((t) => {
      if (typeof t === 'string') return { url: t, title: '' }
      return { url: t.url || (t as any).src || '', title: t.title || '' }
    })
    .filter((t) => t.url)
    .map((t) => ({ url: t.url, title: t.title || fileNameFromUrl(t.url) }))
})

const showPlaylist = computed(() => {
  const v = config.value.show_playlist ?? config.value.showPlaylist
  return v !== false
})
const autoplay = computed(() => config.value.autoplay || false)
const loop = computed(() => config.value.loop || false)

const currentIndex = ref(0)
const isPlaying = ref(false)
const audioEl = ref<HTMLAudioElement | null>(null)

const currentTrack = computed(() => tracks.value[currentIndex.value] || null)
const hasPlaylist = computed(() => showPlaylist.value && tracks.value.length > 1)

function playIndex(index: number) {
  currentIndex.value = index
  // Wait for src to update, then play.
  requestAnimationFrame(() => {
    audioEl.value?.play().catch(() => { /* autoplay/user-gesture blocked */ })
  })
}

function next() {
  if (currentIndex.value < tracks.value.length - 1) {
    playIndex(currentIndex.value + 1)
  } else if (loop.value) {
    playIndex(0)
  }
}

function prev() {
  if (currentIndex.value > 0) {
    playIndex(currentIndex.value - 1)
  } else if (loop.value) {
    playIndex(tracks.value.length - 1)
  }
}

function onEnded() {
  const isLast = currentIndex.value >= tracks.value.length - 1
  if (!isLast || loop.value) {
    next()
  } else {
    isPlaying.value = false
  }
}
</script>

<template>
  <div class="lcms-audio">
    <template v-if="currentTrack">
      <div
        v-if="hasPlaylist"
        class="lcms-audio__now-playing"
      >
        <i class="fa-solid fa-music" />
        <span class="lcms-audio__now-playing-title">{{ currentTrack.title }}</span>
      </div>

      <div class="lcms-audio__player">
        <button
          v-if="hasPlaylist"
          type="button"
          class="lcms-audio__nav"
          :disabled="currentIndex === 0 && !loop"
          aria-label="Previous"
          @click="prev"
        >
          <i class="fa-solid fa-backward-step" />
        </button>

        <audio
          ref="audioEl"
          class="lcms-audio__el"
          controls
          preload="metadata"
          :autoplay="autoplay"
          :src="currentTrack.url"
          @play="isPlaying = true"
          @pause="isPlaying = false"
          @ended="onEnded"
        >
          Twoja przeglądarka nie obsługuje odtwarzania audio.
        </audio>

        <button
          v-if="hasPlaylist"
          type="button"
          class="lcms-audio__nav"
          :disabled="currentIndex === tracks.length - 1 && !loop"
          aria-label="Next"
          @click="next"
        >
          <i class="fa-solid fa-forward-step" />
        </button>
      </div>

      <ul
        v-if="hasPlaylist"
        class="lcms-audio__playlist"
      >
        <li
          v-for="(track, index) in tracks"
          :key="index"
          class="lcms-audio__track"
          :class="{ 'lcms-audio__track--active': index === currentIndex }"
          @click="playIndex(index)"
        >
          <span class="lcms-audio__track-icon">
            <i
              :class="index === currentIndex && isPlaying
                ? 'fa-solid fa-volume-high'
                : 'fa-solid fa-play'"
            />
          </span>
          <span class="lcms-audio__track-title">{{ track.title }}</span>
        </li>
      </ul>
    </template>

    <div
      v-else
      class="lcms-audio__placeholder"
    >
      <i class="fa-solid fa-music" />
      <span>Brak plików audio</span>
    </div>
  </div>
</template>

<style>
.lcms-audio { width: 100%; }
.lcms-audio__now-playing {
  display: flex; align-items: center; gap: 8px;
  font-size: 14px; font-weight: 600; margin-bottom: 8px;
  color: var(--lcms-color-text, #222);
}
.lcms-audio__now-playing-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lcms-audio__player { display: flex; align-items: center; gap: 8px; }
.lcms-audio__el { flex: 1; width: 100%; min-width: 0; }
.lcms-audio__nav {
  flex: none; width: 36px; height: 36px; border-radius: 50%;
  border: none; cursor: pointer; background: rgba(0,0,0,0.06);
  display: flex; align-items: center; justify-content: center;
  transition: background 200ms;
}
.lcms-audio__nav:hover:not(:disabled) { background: rgba(0,0,0,0.12); }
.lcms-audio__nav:disabled { opacity: 0.35; cursor: default; }
.lcms-audio__playlist { list-style: none; margin: 10px 0 0; padding: 0; }
.lcms-audio__track {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 10px; border-radius: 8px; cursor: pointer;
  transition: background 150ms;
}
.lcms-audio__track:hover { background: rgba(0,0,0,0.04); }
.lcms-audio__track--active { background: rgba(0,0,0,0.06); font-weight: 600; }
.lcms-audio__track-icon {
  flex: none; width: 22px; text-align: center;
  color: var(--lcms-color-primary, #50a5f1); font-size: 12px;
}
.lcms-audio__track-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lcms-audio__placeholder {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 8px; padding: 32px; color: #adb5bd;
  border: 1px dashed #dee2e6; border-radius: 8px;
}
.lcms-audio__placeholder i { font-size: 28px; }
</style>
