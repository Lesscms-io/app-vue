<script setup lang="ts">
/**
 * Animated Headline Widget (premium)
 *
 * "We build websites that are [fast|beautiful|effective]" — one word
 * rotates (rotate / slide / flip / clip), is typed (typewriter) or stays
 * static (none), optionally with a drawn highlight. SSR renders the first
 * word; the client cycles.
 */

import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useLanguage } from '@/composables/useLanguage'
import { resolveColor } from '@/utils/resolveColor'
import type { AnimatedHeadlineWidgetData } from '@/types/widgets'

defineOptions({ inheritAttrs: false })

interface Props {
  data: AnimatedHeadlineWidgetData
  settings?: Record<string, any>
  language?: string
}
const props = defineProps<Props>()
const { extractValue } = useLanguage(props.language)

const config = computed(() => (props.data as any).widget || props.data || {})
const textGroup = computed(() => config.value.text || {})
const animationGroup = computed(() => config.value.animation || {})
const highlightGroup = computed(() => config.value.highlight || {})
const headingGroup = computed(() => config.value.heading || {})

const before = computed(() => extractValue(textGroup.value.before) || '')
const after = computed(() => extractValue(textGroup.value.after) || '')
const words = computed<string[]>(() => String(extractValue(textGroup.value.words) || '').split('\n').map((w) => w.trim()).filter(Boolean))
const longestWord = computed(() => words.value.reduce((a, b) => (b.length > a.length ? b : a), ''))

const type = computed(() => animationGroup.value.type || 'rotate')
const interval = computed(() => Math.max(600, Number(animationGroup.value.interval) || 2500))
const speed = computed(() => Math.max(100, Number(animationGroup.value.speed) || 600))
const loop = computed(() => animationGroup.value.loop !== false)
const showCursor = computed(() => type.value === 'typewriter' && animationGroup.value.cursor !== false)

// ── Cycling (client only) ─────────────────────────────────────────────
const index = ref(0)
const phase = ref<'in' | 'out'>('in')
const typed = ref(words.value[0] || '') // SSR: first word fully visible
let timer: ReturnType<typeof setTimeout> | null = null
const clear = () => { if (timer) clearTimeout(timer); timer = null }
const later = (fn: () => void, ms: number) => { timer = setTimeout(fn, ms) }

function typeWord(word: string, done: () => void) {
  const perChar = Math.max(30, Math.round(speed.value / Math.max(4, word.length)))
  let i = 0
  const step = () => { typed.value = word.slice(0, i); if (i < word.length) { i++; later(step, perChar) } else done() }
  step()
}
function untypeWord(done: () => void) {
  const perChar = Math.max(20, Math.round(speed.value / Math.max(4, typed.value.length) / 2))
  const step = () => { if (typed.value.length) { typed.value = typed.value.slice(0, -1); later(step, perChar) } else done() }
  step()
}
function schedule() {
  clear()
  if (type.value === 'none' || words.value.length < 2) return
  if (type.value === 'typewriter') {
    later(() => untypeWord(() => {
      const next = (index.value + 1) % words.value.length
      if (next === 0 && !loop.value) { typed.value = words.value[index.value]; return }
      index.value = next
      typeWord(words.value[next], schedule)
    }), interval.value)
    return
  }
  later(() => {
    phase.value = 'out'
    later(() => {
      const next = (index.value + 1) % words.value.length
      if (next === 0 && !loop.value) { phase.value = 'in'; return }
      index.value = next
      phase.value = 'in'
      schedule()
    }, speed.value)
  }, interval.value)
}
watch([type, interval, speed, loop, () => words.value.join('|')], () => { index.value = 0; typed.value = words.value[0] || ''; phase.value = 'in'; schedule() })
onMounted(() => {
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  schedule()
})
onBeforeUnmount(clear)

const currentWord = computed(() => (type.value === 'typewriter' ? typed.value : (words.value[index.value] || '')))

const tag = computed(() => headingGroup.value.tag || 'h2')
const rootStyle = computed(() => ({
  '--ah-size': `${headingGroup.value.size || 44}px`,
  '--ah-weight': String(headingGroup.value.weight || '700'),
  '--ah-lh': String(headingGroup.value.line_height || 1.15),
  '--ah-color': resolveColor(headingGroup.value.color) || 'var(--lcms-color-dark, #111827)',
  '--ah-word-color': resolveColor(headingGroup.value.word_color) || 'var(--lcms-color-primary)',
  '--ah-font': headingGroup.value.font_family ? `'${headingGroup.value.font_family}', var(--lcms-font-heading, inherit)` : 'var(--lcms-font-heading, inherit)',
  '--ah-hl-color': resolveColor(highlightGroup.value.color) || 'var(--lcms-color-primary)',
  '--ah-hl-weight': `${highlightGroup.value.weight ?? 4}px`,
  '--ah-speed': `${speed.value}ms`,
  textAlign: headingGroup.value.align || 'left'
}))
const rootClasses = computed(() => [
  'lcms-animated-headline',
  `ah--${type.value}`,
  `ah--hl-${highlightGroup.value.style || 'none'}`,
  { 'ah--hl-animate': highlightGroup.value.animate !== false }
])
</script>

<template>
  <div
    :class="rootClasses"
    :style="rootStyle"
  >
    <component
      :is="tag"
      class="ah"
    >
      <span
        v-if="before"
        class="ah__text"
      >{{ before }} </span>
      <span
        class="ah__word"
        :class="`is-${phase}`"
      >
        <span
          v-if="type !== 'typewriter'"
          class="ah__ghost"
          aria-hidden="true"
        >{{ longestWord }}</span>
        <span
          :key="type === 'typewriter' ? 'tw' : index"
          class="ah__current"
        >{{ currentWord }}<span
          v-if="showCursor"
          class="ah__caret"
        /></span>
      </span>
      <span
        v-if="after"
        class="ah__text"
      > {{ after }}</span>
    </component>
  </div>
</template>
