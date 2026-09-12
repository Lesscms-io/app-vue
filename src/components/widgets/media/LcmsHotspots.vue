<script setup lang="ts">
/**
 * Hotspots Widget (premium)
 *
 * Markers pinned on an image (x/y in %), each opening a tooltip with
 * title, text, image and an optional link. Trigger: hover, click or
 * always-open. Keyboard: markers are buttons.
 */

import { computed, inject, ref, onMounted, onBeforeUnmount } from 'vue'
import { useLanguage } from '@/composables/useLanguage'
import { resolveColor } from '@/utils/resolveColor'
import type { HotspotsWidgetData, HotspotItem } from '@/types/widgets'

defineOptions({ inheritAttrs: false })

interface Props {
  data: HotspotsWidgetData
  settings?: Record<string, any>
  language?: string
}
const props = defineProps<Props>()
const { extractValue } = useLanguage(props.language)

const resolvePageUrl = inject<(code: string | null, uuid: string | null) => string>('lesscms-resolve-page-url', () => '#')
const resolveCollectionUrl = inject<(collectionCode: string, entryId: string) => string>('lesscms-resolve-collection-url', () => '#')

const config = computed(() => (props.data as any).widget || props.data || {})
const imageGroup = computed(() => config.value.image || {})
const markerGroup = computed(() => config.value.marker || {})
const tooltipGroup = computed(() => config.value.tooltip || {})
const items = computed<HotspotItem[]>(() => (Array.isArray(config.value.items) ? config.value.items : []))

const imageSrc = computed(() => imageGroup.value.src || '')
const imageAlt = computed(() => extractValue(imageGroup.value.alt) || '')
const trigger = computed(() => tooltipGroup.value.trigger || 'hover')
const markerStyle = computed(() => markerGroup.value.style || 'dot')

const open = ref(-1)
const root = ref<HTMLElement | null>(null)
const isOpen = (i: number) => trigger.value === 'always' || open.value === i
const onMarkerClick = (i: number) => {
  if (trigger.value === 'always') return
  open.value = open.value === i ? -1 : i
}
const onEnter = (i: number) => { if (trigger.value === 'hover') open.value = i }
const onLeave = (i: number) => { if (trigger.value === 'hover' && open.value === i) open.value = -1 }
const onDocClick = (e: MouseEvent) => { if (root.value && !root.value.contains(e.target as Node)) open.value = -1 }
onMounted(() => document.addEventListener('click', onDocClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))

function autoSide(x: number, y: number) {
  if (y < 35) return 'bottom'
  if (y > 65) return 'top'
  return x > 50 ? 'left' : 'right'
}
const sideOf = (item: HotspotItem) => {
  const p = tooltipGroup.value.position
  return p && p !== 'auto' ? p : autoSide(Number(item.x ?? 50), Number(item.y ?? 50))
}
const hrefOf = (item: HotspotItem) => {
  if (item.url && item.url !== '#') return item.url
  if (item.link_type === 'page' && item.page_id) return resolvePageUrl(null, item.page_id)
  if (item.link_type === 'route' && item.route_uuid) return resolvePageUrl(null, item.route_uuid)
  if (item.link_type === 'entry' && item.collection_code && item.entry_id) return resolveCollectionUrl(item.collection_code, item.entry_id)
  return ''
}

const rootStyle = computed(() => ({
  '--hp-radius': `${imageGroup.value.radius ?? 12}px`,
  '--hp-marker-size': `${markerGroup.value.size || 28}px`,
  '--hp-marker-color': resolveColor(markerGroup.value.color) || '#ffffff',
  '--hp-marker-bg': resolveColor(markerGroup.value.background) || 'var(--lcms-color-primary)',
  '--hp-marker-bg-hover': resolveColor(markerGroup.value['background:hover']) || resolveColor(markerGroup.value.background) || 'var(--lcms-color-primary)',
  '--hp-tip-bg': resolveColor(tooltipGroup.value.background) || '#ffffff',
  '--hp-tip-color': resolveColor(tooltipGroup.value.color) || 'var(--lcms-color-dark, #111827)',
  '--hp-tip-width': `${tooltipGroup.value.width || 240}px`,
  '--hp-tip-radius': `${tooltipGroup.value.radius ?? 10}px`
}))
const rootClasses = computed(() => [
  'lcms-hotspots',
  `hp--marker-${markerStyle.value}`,
  `hp--trigger-${trigger.value}`,
  { 'hp--pulse': markerGroup.value.pulse !== false }
])
</script>

<template>
  <div
    ref="root"
    :class="rootClasses"
    :style="rootStyle"
  >
    <div class="hp-frame">
      <img
        v-if="imageSrc"
        class="hp-image"
        :src="imageSrc"
        :alt="imageAlt"
        draggable="false"
        loading="lazy"
      >
      <div
        v-for="(item, index) in items"
        :key="item.uuid || index"
        class="hp-spot"
        :class="[`hp-spot--${sideOf(item)}`, { 'is-open': isOpen(index) }]"
        :style="{ left: `${item.x ?? 50}%`, top: `${item.y ?? 50}%` }"
        @mouseenter="onEnter(index)"
        @mouseleave="onLeave(index)"
      >
        <button
          type="button"
          class="hp-marker"
          :aria-expanded="isOpen(index) ? 'true' : 'false'"
          :aria-label="extractValue(item.title) || `${index + 1}`"
          @click.stop="onMarkerClick(index)"
        >
          <i
            v-if="markerStyle === 'icon'"
            :class="item.icon || 'fa-solid fa-plus'"
          />
          <template v-else-if="markerStyle === 'number'">{{ index + 1 }}</template>
        </button>
        <div
          v-show="isOpen(index)"
          class="hp-tip"
          role="tooltip"
        >
          <img
            v-if="item.image"
            class="hp-tip__img"
            :src="item.image"
            alt=""
            loading="lazy"
          >
          <div
            v-if="extractValue(item.title)"
            class="hp-tip__title"
          >{{ extractValue(item.title) }}</div>
          <div
            v-if="extractValue(item.text)"
            class="hp-tip__text"
          >{{ extractValue(item.text) }}</div>
          <a
            v-if="hrefOf(item)"
            class="hp-tip__link"
            :href="hrefOf(item)"
            :target="item.target_blank ? '_blank' : undefined"
            :rel="item.target_blank ? 'noopener' : undefined"
          >{{ extractValue(item.title) || hrefOf(item) }} →</a>
        </div>
      </div>
    </div>
  </div>
</template>
