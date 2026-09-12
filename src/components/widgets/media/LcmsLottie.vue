<script setup lang="ts">
/**
 * Lottie Widget (premium)
 *
 * Plays a Lottie JSON animation. lottie-web is loaded from a CDN on the
 * client only when the widget is present (nothing on SSR). Triggers:
 * load, viewport (IntersectionObserver), hover, click, scroll (scrubbed
 * by the element's position in the viewport).
 */

import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { useLanguage } from '@/composables/useLanguage'
import { resolveColor } from '@/utils/resolveColor'
import type { LottieWidgetData } from '@/types/widgets'

defineOptions({ inheritAttrs: false })

interface Props {
  data: LottieWidgetData
  settings?: Record<string, any>
  language?: string
}
const props = defineProps<Props>()
const { extractValue } = useLanguage(props.language)

const config = computed(() => (props.data as any).widget || props.data || {})
const sourceGroup = computed(() => config.value.source || {})
const playbackGroup = computed(() => config.value.playback || {})
const layoutGroup = computed(() => config.value.layout || {})

const src = computed(() => sourceGroup.value.src || '')
const alt = computed(() => extractValue(sourceGroup.value.alt) || '')
const trigger = computed(() => playbackGroup.value.trigger || 'viewport')

const LOTTIE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js'
let loader: Promise<any> | null = null
function loadLottie(): Promise<any> {
  const w = window as any
  if (w.lottie) return Promise.resolve(w.lottie)
  if (loader) return loader
  loader = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${LOTTIE_CDN}"]`)
    const el = existing || document.createElement('script')
    el.addEventListener('load', () => (w.lottie ? resolve(w.lottie) : reject(new Error('lottie missing'))))
    el.addEventListener('error', () => { loader = null; reject(new Error('lottie load failed')) })
    if (!existing) { el.src = LOTTIE_CDN; el.async = true; document.head.appendChild(el) }
  })
  return loader
}

const host = ref<HTMLElement | null>(null)
const box = ref<HTMLElement | null>(null)
const ready = ref(false)
let anim: any = null
let observer: IntersectionObserver | null = null
let onScroll: (() => void) | null = null

const onEnter = () => {
  if (trigger.value === 'hover') anim?.play()
  else if (playbackGroup.value.hover_pause) anim?.pause()
}
const onLeave = () => {
  if (trigger.value === 'hover') anim?.pause()
  else if (playbackGroup.value.hover_pause) anim?.play()
}
const onClick = () => {
  if (trigger.value !== 'click' || !anim) return
  if (anim.isPaused) anim.play(); else anim.pause()
}

onMounted(async () => {
  if (!src.value || !host.value) return
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  let lottie: any
  try { lottie = await loadLottie() } catch { return }
  if (!host.value) return
  const t = trigger.value
  anim = lottie.loadAnimation({
    container: host.value,
    renderer: playbackGroup.value.renderer || 'svg',
    loop: t === 'scroll' ? false : playbackGroup.value.loop !== false,
    autoplay: t === 'load',
    path: src.value
  })
  anim.setSpeed(Number(playbackGroup.value.speed) || 1)
  anim.setDirection(Number(playbackGroup.value.direction) === -1 ? -1 : 1)
  anim.addEventListener('DOMLoaded', () => { ready.value = true })

  if (t === 'viewport' && box.value) {
    if (typeof IntersectionObserver === 'undefined') { anim.play(); return }
    observer = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) anim?.play(); else anim?.pause() })
    }, { threshold: 0.2 })
    observer.observe(box.value)
  }
  if (t === 'scroll' && box.value) {
    onScroll = () => {
      if (!anim || !box.value) return
      const r = box.value.getBoundingClientRect()
      const vh = window.innerHeight || 1
      // 0 when the element enters from the bottom, 1 when it leaves at the top
      const p = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)))
      anim.goToAndStop(p * (anim.totalFrames - 1), true)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
  }
})
onBeforeUnmount(() => {
  observer?.disconnect()
  if (onScroll) window.removeEventListener('scroll', onScroll)
  anim?.destroy()
  anim = null
})

const rootStyle = computed(() => ({
  '--lt-max-width': `${layoutGroup.value.max_width || 400}px`,
  '--lt-bg': resolveColor(layoutGroup.value.background) || 'transparent',
  '--lt-radius': `${layoutGroup.value.radius ?? 0}px`,
  '--lt-padding': `${layoutGroup.value.padding ?? 0}px`,
  justifyContent: ({ left: 'flex-start', right: 'flex-end' } as Record<string, string>)[layoutGroup.value.align || ''] || 'center'
}))
const rootClasses = computed(() => ['lcms-lottie', `lt--trigger-${trigger.value}`, { 'is-ready': ready.value }])
</script>

<template>
  <div
    :class="rootClasses"
    :style="rootStyle"
  >
    <div
      ref="box"
      class="lt-box"
      :role="alt ? 'img' : undefined"
      :aria-label="alt || undefined"
      @mouseenter="onEnter"
      @mouseleave="onLeave"
      @click="onClick"
    >
      <div
        ref="host"
        class="lt-host"
      />
    </div>
  </div>
</template>
