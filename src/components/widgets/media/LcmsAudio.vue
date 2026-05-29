<script setup lang="ts">
/**
 * Audio Widget — modern dark player
 *
 * Native <audio> stays hidden and is driven by a custom dark/cyan UI:
 * a glowing circular play hero, draggable seek bar and a playlist with
 * gradient thumbnails. Files stream from img.lesscms.io with HTTP Range
 * support, so seeking + mobile playback work.
 */

import { computed, ref, onBeforeUnmount } from 'vue'
import type { AudioWidgetData, AudioTrack } from '@/types/widgets'

defineOptions({ inheritAttrs: false })

interface Props {
  data: AudioWidgetData
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

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
    .map((t) => (typeof t === 'string' ? { url: t, title: '' } : { url: t.url || (t as any).src || '', title: t.title || '' }))
    .filter((t) => t.url)
    .map((t) => ({ url: t.url, title: t.title || fileNameFromUrl(t.url) }))
})

const showPlaylist = computed(() => {
  const v = config.value.show_playlist ?? config.value.showPlaylist
  return v !== false
})
const autoplay = computed(() => config.value.autoplay || false)
const loop = computed(() => config.value.loop || false)

const audioEl = ref<HTMLAudioElement | null>(null)
const currentIndex = ref(0)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const isSeeking = ref(false)
const barEl = ref<HTMLElement | null>(null)

const currentTrack = computed(() => tracks.value[currentIndex.value] || null)
const hasPlaylist = computed(() => showPlaylist.value && tracks.value.length > 1)
const progress = computed(() => (duration.value ? (currentTime.value / duration.value) * 100 : 0))

function fmt(s: number): string {
  if (!s || !isFinite(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function play() {
  audioEl.value?.play().catch(() => { /* gesture/autoplay blocked */ })
}
function togglePlay() {
  if (!audioEl.value) return
  if (audioEl.value.paused) play()
  else audioEl.value.pause()
}
function playIndex(index: number) {
  currentIndex.value = index
  currentTime.value = 0
  requestAnimationFrame(play)
}
function next() {
  if (currentIndex.value < tracks.value.length - 1) playIndex(currentIndex.value + 1)
  else if (loop.value) playIndex(0)
}
function prev() {
  if (audioEl.value && audioEl.value.currentTime > 3) {
    audioEl.value.currentTime = 0
    return
  }
  if (currentIndex.value > 0) playIndex(currentIndex.value - 1)
  else if (loop.value) playIndex(tracks.value.length - 1)
}
function onEnded() {
  const isLast = currentIndex.value >= tracks.value.length - 1
  if (!isLast || loop.value) next()
  else isPlaying.value = false
}

// --- Seeking (click + drag) ---
function seekFromEvent(clientX: number) {
  const el = barEl.value
  if (!el || !duration.value || !audioEl.value) return
  const rect = el.getBoundingClientRect()
  const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
  audioEl.value.currentTime = ratio * duration.value
  currentTime.value = audioEl.value.currentTime
}
function onPointerMove(e: PointerEvent) {
  if (isSeeking.value) seekFromEvent(e.clientX)
}
function onPointerUp() {
  isSeeking.value = false
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
}
function onBarPointerDown(e: PointerEvent) {
  isSeeking.value = true
  seekFromEvent(e.clientX)
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
}

onBeforeUnmount(() => {
  if (typeof window === 'undefined') return
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
})
</script>

<template>
  <div class="lcms-audio">
    <template v-if="currentTrack">
      <audio
        ref="audioEl"
        class="lcms-audio__native"
        preload="metadata"
        :autoplay="autoplay"
        :src="currentTrack.url"
        @play="isPlaying = true"
        @pause="isPlaying = false"
        @ended="onEnded"
        @timeupdate="currentTime = audioEl?.currentTime || 0"
        @loadedmetadata="duration = audioEl?.duration || 0"
      />

      <div class="lcms-audio__card">
        <!-- Hero: glowing circular play -->
        <div class="lcms-audio__hero">
          <button
            type="button"
            class="lcms-audio__hero-btn"
            :class="{ 'is-playing': isPlaying }"
            :aria-label="isPlaying ? 'Pauza' : 'Odtwórz'"
            @click="togglePlay"
          >
            <i :class="isPlaying ? 'fa-solid fa-pause' : 'fa-solid fa-play'" />
          </button>
        </div>

        <div class="lcms-audio__title">{{ currentTrack.title }}</div>
        <div class="lcms-audio__sub">
          <span
            class="lcms-audio__eq"
            :class="{ 'lcms-audio__eq--on': isPlaying }"
          ><i /><i /><i /></span>
          <span v-if="hasPlaylist">Utwór {{ currentIndex + 1 }} z {{ tracks.length }}</span>
          <span v-else>Audio</span>
        </div>

        <!-- Seek -->
        <div
          ref="barEl"
          class="lcms-audio__bar"
          :class="{ 'lcms-audio__bar--active': isSeeking }"
          @pointerdown="onBarPointerDown"
        >
          <div
            class="lcms-audio__bar-fill"
            :style="{ width: progress + '%' }"
          >
            <span class="lcms-audio__thumb" />
          </div>
        </div>
        <div class="lcms-audio__time">
          <span>{{ fmt(currentTime) }}</span>
          <span>{{ fmt(duration) }}</span>
        </div>

        <!-- Secondary controls -->
        <div class="lcms-audio__controls">
          <button
            v-if="hasPlaylist"
            type="button"
            class="lcms-audio__btn"
            :disabled="currentIndex === 0 && !loop"
            aria-label="Poprzedni"
            @click="prev"
          >
            <i class="fa-solid fa-backward-step" />
          </button>
          <button
            v-if="hasPlaylist"
            type="button"
            class="lcms-audio__btn"
            :disabled="currentIndex === tracks.length - 1 && !loop"
            aria-label="Następny"
            @click="next"
          >
            <i class="fa-solid fa-forward-step" />
          </button>
        </div>
      </div>

      <!-- Playlist -->
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
          <span class="lcms-audio__thumbtile">
            <span
              v-if="index === currentIndex && isPlaying"
              class="lcms-audio__eq lcms-audio__eq--on"
            ><i /><i /><i /></span>
            <i
              v-else
              class="fa-solid fa-play"
            />
          </span>
          <span class="lcms-audio__track-meta">
            <span class="lcms-audio__track-title">{{ track.title }}</span>
            <span class="lcms-audio__track-sub">Utwór {{ index + 1 }}</span>
          </span>
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
.lcms-audio {
  width: 100%;
  --lcms-audio-accent: #22d3ee;
  --lcms-audio-accent-2: #38bdf8;
  --lcms-audio-card: linear-gradient(180deg, #1b2029 0%, #0e1117 100%);
  --lcms-audio-text: #eef1f7;
  --lcms-audio-muted: #8b93a6;
}
.lcms-audio__native { display: none; }

.lcms-audio__card {
  background: var(--lcms-audio-card);
  border-radius: 22px;
  padding: 26px 22px 22px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
  text-align: center;
  color: var(--lcms-audio-text);
}

/* Hero play with glowing rings */
.lcms-audio__hero { display: flex; justify-content: center; margin: 6px 0 18px; }
.lcms-audio__hero-btn {
  position: relative;
  width: 116px; height: 116px; border-radius: 50%;
  border: none; cursor: pointer; color: #04121a; font-size: 38px;
  display: flex; align-items: center; justify-content: center;
  background: radial-gradient(circle at 32% 28%, #aef4ff 0%, var(--lcms-audio-accent) 45%, var(--lcms-audio-accent-2) 100%);
  box-shadow:
    0 0 0 8px rgba(34, 211, 238, 0.10),
    0 0 0 16px rgba(34, 211, 238, 0.05),
    0 12px 40px rgba(34, 211, 238, 0.45);
  transition: transform .12s ease, box-shadow .2s ease;
}
.lcms-audio__hero-btn i { margin-left: 4px; }
.lcms-audio__hero-btn:hover { transform: scale(1.04); }
.lcms-audio__hero-btn:active { transform: scale(.97); }
.lcms-audio__hero-btn.is-playing i { margin-left: 0; }
.lcms-audio__hero-btn.is-playing {
  box-shadow:
    0 0 0 8px rgba(34, 211, 238, 0.14),
    0 0 0 16px rgba(34, 211, 238, 0.07),
    0 12px 48px rgba(34, 211, 238, 0.6);
}

.lcms-audio__title {
  font-size: 17px; font-weight: 700; color: var(--lcms-audio-text);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.lcms-audio__sub {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  font-size: 12px; color: var(--lcms-audio-muted); margin-top: 5px;
}

/* Seek bar */
.lcms-audio__bar {
  position: relative; height: 6px; border-radius: 999px; margin-top: 18px;
  background: rgba(255, 255, 255, 0.12); cursor: pointer; touch-action: none;
}
.lcms-audio__bar-fill {
  position: relative; height: 100%; border-radius: 999px; min-width: 6px;
  background: linear-gradient(90deg, var(--lcms-audio-accent-2), var(--lcms-audio-accent));
}
.lcms-audio__thumb {
  position: absolute; right: -7px; top: 50%;
  width: 15px; height: 15px; border-radius: 50%;
  transform: translateY(-50%) scale(0);
  background: #fff; box-shadow: 0 0 10px rgba(34, 211, 238, 0.9);
  transition: transform .15s ease;
}
.lcms-audio__bar:hover .lcms-audio__thumb,
.lcms-audio__bar--active .lcms-audio__thumb { transform: translateY(-50%) scale(1); }

.lcms-audio__time {
  display: flex; justify-content: space-between;
  font-size: 11px; color: var(--lcms-audio-muted);
  margin-top: 8px; font-variant-numeric: tabular-nums;
}

/* Secondary controls */
.lcms-audio__controls { display: flex; align-items: center; justify-content: center; gap: 28px; margin-top: 14px; }
.lcms-audio__btn {
  border: none; cursor: pointer; background: transparent;
  color: var(--lcms-audio-accent); font-size: 22px;
  width: 44px; height: 44px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  transition: background .15s, opacity .15s, transform .1s;
}
.lcms-audio__btn:hover:not(:disabled) { background: rgba(34, 211, 238, 0.12); }
.lcms-audio__btn:active:not(:disabled) { transform: scale(.9); }
.lcms-audio__btn:disabled { opacity: .3; cursor: default; }

/* Playlist */
.lcms-audio__playlist { list-style: none; margin: 12px 0 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.lcms-audio__track {
  display: flex; align-items: center; gap: 14px;
  padding: 10px; border-radius: 14px; cursor: pointer;
  background: var(--lcms-audio-card);
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: border-color .15s, transform .1s;
}
.lcms-audio__track:hover { transform: translateY(-1px); border-color: rgba(34, 211, 238, 0.35); }
.lcms-audio__track--active { border-color: rgba(34, 211, 238, 0.6); }
.lcms-audio__thumbtile {
  flex: none; width: 48px; height: 48px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  color: #04121a; font-size: 15px;
  background: linear-gradient(135deg, #34d399, var(--lcms-audio-accent));
  box-shadow: 0 6px 16px rgba(34, 211, 238, 0.3);
}
.lcms-audio__track-meta { display: flex; flex-direction: column; min-width: 0; gap: 2px; text-align: left; }
.lcms-audio__track-title { color: var(--lcms-audio-text); font-size: 14px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lcms-audio__track--active .lcms-audio__track-title { color: var(--lcms-audio-accent); }
.lcms-audio__track-sub { color: var(--lcms-audio-muted); font-size: 11px; }

/* Equalizer */
.lcms-audio__eq { display: inline-flex; align-items: flex-end; gap: 2px; height: 12px; color: var(--lcms-audio-accent); }
.lcms-audio__eq i { width: 3px; height: 40%; border-radius: 2px; background: currentColor; }
.lcms-audio__eq--on i { animation: lcms-audio-eq .9s ease-in-out infinite; }
.lcms-audio__eq--on i:nth-child(2) { animation-delay: .25s; }
.lcms-audio__eq--on i:nth-child(3) { animation-delay: .5s; }
@keyframes lcms-audio-eq { 0%,100% { height: 30%; } 50% { height: 100%; } }

.lcms-audio__placeholder {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 8px; padding: 40px; color: var(--lcms-audio-muted);
  background: var(--lcms-audio-card); border-radius: 22px;
  border: 1px solid rgba(255, 255, 255, 0.07);
}
.lcms-audio__placeholder i { font-size: 30px; color: var(--lcms-audio-accent); }

@media (max-width: 480px) {
  .lcms-audio__hero-btn { width: 100px; height: 100px; font-size: 33px; }
}
</style>
