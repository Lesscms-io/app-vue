<script setup lang="ts">
/**
 * Flip Box Widget (premium)
 *
 * Two-sided card: the front (icon / image + title + text) reveals the back
 * (title + text + button) on hover or click, with a 3D flip, slide, zoom
 * or fade. Both sides are in the DOM for SSR / SEO.
 */

import { computed, inject, ref } from 'vue'
import { useLanguage } from '@/composables/useLanguage'
import { resolveColor } from '@/utils/resolveColor'
import type { FlipBoxWidgetData, FlipBoxSide } from '@/types/widgets'

defineOptions({ inheritAttrs: false })

interface Props {
  data: FlipBoxWidgetData
  settings?: Record<string, any>
  language?: string
}
const props = defineProps<Props>()
const { extractValue } = useLanguage(props.language)

const resolvePageUrl = inject<(code: string | null, uuid: string | null) => string>('lesscms-resolve-page-url', () => '#')
const resolveCollectionUrl = inject<(collectionCode: string, entryId: string) => string>('lesscms-resolve-collection-url', () => '#')

const config = computed(() => (props.data as any).widget || props.data || {})
const frontGroup = computed<FlipBoxSide>(() => config.value.front || {})
const backGroup = computed<FlipBoxSide>(() => config.value.back || {})
const buttonGroup = computed(() => config.value.button || {})
const configGroup = computed(() => config.value.config || {})

const trigger = computed(() => configGroup.value.trigger || 'hover')
const flipped = ref(false)
// Click flips when configured so, and on touch screens (no real hover).
const toggle = () => {
  const touch = typeof window !== 'undefined' && window.matchMedia?.('(hover: none)').matches
  if (trigger.value === 'click' || touch) flipped.value = !flipped.value
}

const buttonShow = computed(() => buttonGroup.value.show !== false)
const buttonText = computed(() => extractValue(buttonGroup.value.text) || '')
const buttonTargetBlank = computed(() => buttonGroup.value.target_blank === true)
const buttonHref = computed(() => {
  const url = buttonGroup.value.url
  if (url && url !== '#') return url
  const linkType = buttonGroup.value.link_type || 'custom'
  if (linkType === 'page' && buttonGroup.value.page_id) return resolvePageUrl(null, buttonGroup.value.page_id)
  if (linkType === 'route' && buttonGroup.value.route_uuid) return resolvePageUrl(null, buttonGroup.value.route_uuid)
  if (linkType === 'entry' && buttonGroup.value.collection_code && buttonGroup.value.entry_id) {
    return resolveCollectionUrl(buttonGroup.value.collection_code, buttonGroup.value.entry_id)
  }
  return url || '#'
})
const RADIUS: Record<string, string> = { none: '0', sm: '4px', md: '8px', lg: '12px', pill: '50px', full: '50px' }
const buttonClass = computed(() => {
  const size = buttonGroup.value.size || 'md'
  return ['lcms-button__link', `lcms-button__link--${buttonGroup.value.style || 'light'}`, size === 'md' ? '' : `lcms-button__link--size-${size}`]
})
const buttonStyle = computed(() => ({ borderRadius: RADIUS[buttonGroup.value.border_radius || 'md'] || '8px' }))

// Normalised view of a side (the template iterates both).
const sideView = (key: 'front' | 'back', g: FlipBoxSide, fallbackBg: string) => ({
  key,
  icon: g.icon || '',
  image: g.image || '',
  background_image: g.background_image || '',
  title: extractValue(g.title) || '',
  text: extractValue(g.text) || '',
  style: {
    '--fb-bg': resolveColor(g.background) || fallbackBg,
    '--fb-color': resolveColor(g.color) || '#ffffff',
    backgroundImage: g.background_image ? `url(${g.background_image})` : undefined,
    textAlign: g.align || 'center',
    alignItems: ({ left: 'flex-start', right: 'flex-end' } as Record<string, string>)[g.align || ''] || 'center'
  }
})
const sides = computed(() => ([
  sideView('front', frontGroup.value, 'var(--lcms-color-primary)'),
  sideView('back', backGroup.value, 'var(--lcms-color-dark, #343a40)')
]))
const rootStyle = computed(() => ({
  '--fb-height': `${configGroup.value.height || 320}px`,
  '--fb-duration': `${configGroup.value.duration || 600}ms`,
  '--fb-radius': `${configGroup.value.radius ?? 12}px`,
  '--fb-padding': `${configGroup.value.padding ?? 32}px`,
  '--fb-icon-size': `${configGroup.value.icon_size || 48}px`,
  '--fb-title-size': `${configGroup.value.title_size || 24}px`,
  '--fb-overlay': String(configGroup.value.overlay ?? 0.35),
  '--fb-font': configGroup.value.font_family ? `'${configGroup.value.font_family}', var(--lcms-font-heading, inherit)` : 'inherit'
}))
const rootClasses = computed(() => [
  'lcms-flip-box',
  `fb--${configGroup.value.effect || 'flip-h'}`,
  `fb--trigger-${trigger.value}`,
  { 'fb--flipped': flipped.value }
])
</script>

<template>
  <div
    :class="rootClasses"
    :style="rootStyle"
    :role="trigger === 'click' ? 'button' : undefined"
    :tabindex="trigger === 'click' ? 0 : undefined"
    @click="toggle"
    @keydown.enter.space.prevent="toggle"
  >
    <div class="fb-card">
      <div
        v-for="s in sides"
        :key="s.key"
        class="fb-side"
        :class="`fb-side--${s.key}`"
        :style="s.style"
      >
        <div
          v-if="s.background_image"
          class="fb-overlay"
        />
        <div class="fb-body">
          <img
            v-if="s.image"
            class="fb-image"
            :src="s.image"
            alt=""
            loading="lazy"
          >
          <i
            v-else-if="s.icon"
            class="fb-icon"
            :class="s.icon"
          />
          <div
            v-if="s.title"
            class="fb-title"
          >{{ s.title }}</div>
          <div
            v-if="s.text"
            class="fb-text"
          >{{ s.text }}</div>
          <a
            v-if="s.key === 'back' && buttonShow && buttonText"
            class="fb-btn"
            :class="buttonClass"
            :style="buttonStyle"
            :href="buttonHref"
            :target="buttonTargetBlank ? '_blank' : undefined"
            :rel="buttonTargetBlank ? 'noopener' : undefined"
            @click.stop
          >{{ buttonText }}</a>
        </div>
      </div>
    </div>
  </div>
</template>
