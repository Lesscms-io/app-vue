<script setup lang="ts">
/**
 * Accordion Widget
 *
 * Expandable/collapsible items. Element-group pattern.
 * Two looks, selected by config.header_layout:
 *  - simple:  boxed rows (title + chevron/plus icon) — legacy look
 *  - columns: "zestawienie realizacji" rows — index | title | meta1 | meta2 | icon,
 *             accent line draws on hover/open, optional gallery per item (lightbox).
 */

import { ref, computed, watch } from 'vue'
import { useLanguage } from '@/composables/useLanguage'
import { openLightbox } from '../../../composables/useLightbox'

function resolveColor(val: string | null | undefined): string | null {
  if (!val) return null
  if (val === 'transparent') return 'transparent'
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

defineOptions({
  inheritAttrs: false
})

const props = defineProps<{
  data: {
    widget_type: string
    widget?: Record<string, any>
    [key: string]: any
  }
  language?: string
  settings?: Record<string, any>
}>()

const { extractValue } = useLanguage(props.language)

const config = computed(() => props.data.widget || props.data || {})

// Element groups
const headerGroup = computed(() => config.value.header || {})
const metaGroup = computed(() => config.value.meta || {})
const indexGroup = computed(() => config.value.index || {})
const contentGroup = computed(() => config.value.content || {})
const iconGroup = computed(() => config.value.icon || {})
const borderGroup = computed(() => config.value.border || {})
const separatorGroup = computed(() => config.value.separator || {})
const dividerGroup = computed(() => config.value.divider || {})
const accent_lineGroup = computed(() => config.value.accent_line || {})
const configGroup = computed(() => config.value.config || {})
const itemsGroup = computed(() => {
  const raw = config.value.items
  if (!Array.isArray(raw)) return []
  return raw
})

// Config values
const allowMultiple = computed(() => configGroup.value.allow_multiple || false)
const firstOpen = computed(() => configGroup.value.first_open ?? true)
const isColumns = computed(() => configGroup.value.header_layout === 'columns')
const showIndex = computed(() => configGroup.value.show_index === true)
const isPlusCircle = computed(() => configGroup.value.icon_style === 'plus-circle')
const contentType = computed(() => configGroup.value.content_type || 'text')
// Lightbox for gallery images (default on); zoom inside it (default on).
const lightboxEnabled = computed(() => configGroup.value.lightbox !== false)
const lightboxZoom = computed(() => configGroup.value.lightbox_zoom !== false)
const showText = computed(() => contentType.value !== 'gallery')
const showGallery = computed(() => contentType.value === 'gallery' || contentType.value === 'text_gallery')
const accentEnabled = computed(() => accent_lineGroup.value.enabled === true)

// Legacy items stored content as plain text; wrap it in paragraphs so
// v-html keeps the line breaks. New content arrives as HTML (WYSIWYG).
function contentAsHtml(raw: string): string {
  if (!raw) return ''
  if (/<[a-z][\s\S]*>/i.test(raw)) return raw
  return raw
    .split('\n')
    .map(line => `<p>${line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`)
    .join('')
}

type GalleryImage = { url: string; alt?: string; type?: string }

// Items with extracted multilang values
const renderedItems = computed(() => {
  return itemsGroup.value.map((item: any) => ({
    title: extractValue(item.title_html || item.title),
    content: contentAsHtml(extractValue(item.html || item.content)),
    meta1: extractValue(item.meta1_html || item.meta1) || '',
    meta2: extractValue(item.meta2_html || item.meta2) || '',
    images: (Array.isArray(item.images) ? item.images : []).filter((img: GalleryImage) => img && img.url) as GalleryImage[]
  }))
})

// Header styles
const headerTag = computed(() => headerGroup.value.tag || 'h3')
// Named project text style (Projekt → Style → Style tekstu) for item titles,
// so card titles do not inherit the global h3 scale.
const headerTextClass = computed(() => {
  const code = headerGroup.value.text_style
  return code && /^[a-z0-9_-]+$/i.test(code) ? `lcms-ts-${code}` : ''
})
const headerColor = computed(() => resolveColor(headerGroup.value.color))
const headerBg = computed(() => resolveColor(headerGroup.value.background))
const headerHoverColor = computed(() => resolveColor(headerGroup.value['color:hover']))
const headerHoverBg = computed(() => resolveColor(headerGroup.value['background:hover']))

// Meta / index values
const metaColor = computed(() => resolveColor(metaGroup.value.color))
const indexStyle = computed(() => indexGroup.value.style === 'fill' ? 'fill' : 'outline')
const indexColor = computed(() => resolveColor(indexGroup.value.color))
const indexHoverColor = computed(() => resolveColor(indexGroup.value['color:hover']))

// Content styles
const contentTag = computed(() => contentGroup.value.tag || 'div')
const contentColor = computed(() => resolveColor(contentGroup.value.color))
const contentHoverColor = computed(() => resolveColor(contentGroup.value['color:hover']))
const contentBorderColor = computed(() => resolveColor(contentGroup.value.border_color))
const contentBorderHoverColor = computed(() => resolveColor(contentGroup.value['border_color:hover']))

// Icon values
const iconColor = computed(() => resolveColor(iconGroup.value.color))
const iconHoverColor = computed(() => resolveColor(iconGroup.value['color:hover']))
const iconBg = computed(() => resolveColor(iconGroup.value.background))
const iconHoverBg = computed(() => resolveColor(iconGroup.value['background:hover']))
const iconOpen = computed(() => iconGroup.value.open || 'fa-solid fa-minus')
const iconClosed = computed(() => iconGroup.value.closed || 'fa-solid fa-plus')

// Border values
const borderColor = computed(() => resolveColor(borderGroup.value.color))
const borderHoverColor = computed(() => resolveColor(borderGroup.value['color:hover']))

// Separator values
const separatorColor = computed(() => resolveColor(separatorGroup.value.color))
const separatorHoverColor = computed(() => resolveColor(separatorGroup.value['color:hover']))

// Divider (columns layout row lines) and accent line
const dividerColor = computed(() => resolveColor(dividerGroup.value.color))
const accentColor = computed(() => resolveColor(accent_lineGroup.value.color) || 'var(--lcms-color-primary, #50a5f1)')

// Hover detection
const hasHover = computed(() => !!(
  headerHoverColor.value || headerHoverBg.value ||
  contentHoverColor.value || contentBorderHoverColor.value ||
  iconHoverColor.value || borderHoverColor.value || separatorHoverColor.value
))

// State — initialize empty, then watch for data + config
const openItems = ref<Set<number>>(new Set())

// Watch items and first_open to set initial open state
watch(
  [renderedItems, firstOpen],
  ([items, fo]) => {
    if (fo && items.length > 0 && openItems.value.size === 0) {
      openItems.value = new Set([0])
    }
  },
  { immediate: true }
)

function toggle(index: number) {
  const newSet = new Set(openItems.value)
  if (newSet.has(index)) {
    newSet.delete(index)
  } else {
    if (!allowMultiple.value) {
      newSet.clear()
    }
    newSet.add(index)
  }
  openItems.value = newSet
}

function isOpen(index: number): boolean {
  return openItems.value.has(index)
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function openGallery(images: GalleryImage[], index: number, title = '') {
  if (!lightboxEnabled.value) return
  openLightbox(
    images.map(img => ({
      src: img.url,
      alt: img.alt || '',
      type: img.type === 'video' ? 'video' : 'image'
    })),
    index,
    { zoom: lightboxZoom.value, title }
  )
}

// Slide open/close: animate height between 0 and the natural height.
// v-show keeps open items in the SSR HTML; the hooks only run on toggles.
const SLIDE_MS = 280
function slide(el: Element, to: 'open' | 'closed', done: () => void) {
  const node = el as HTMLElement
  const cs = window.getComputedStyle(node)
  const open = { height: `${node.scrollHeight}px`, paddingTop: cs.paddingTop, paddingBottom: cs.paddingBottom, opacity: '1' }
  const closed = { height: '0px', paddingTop: '0px', paddingBottom: '0px', opacity: '0' }
  const from = to === 'open' ? closed : open
  const dest = to === 'open' ? open : closed
  node.style.overflow = 'hidden'
  node.style.boxSizing = 'border-box'
  Object.assign(node.style, from)
  node.style.transition = `height ${SLIDE_MS}ms ease, padding ${SLIDE_MS}ms ease, opacity ${SLIDE_MS}ms ease`
  void node.offsetHeight
  Object.assign(node.style, dest)
  window.setTimeout(done, SLIDE_MS)
}
function slideEnd(el: Element) {
  const node = el as HTMLElement
  for (const prop of ['height', 'padding-top', 'padding-bottom', 'opacity', 'overflow', 'box-sizing', 'transition']) {
    node.style.removeProperty(prop)
  }
}

// Computed styles — every group reaches CSS through custom properties so the
// hover/open states live in the stylesheet (and respect reduced motion).
const accordionStyle = computed(() => {
  const styles: Record<string, string> = {}
  if (headerColor.value) styles['--ac-header-color'] = headerColor.value
  if (headerBg.value) styles['--ac-header-bg'] = headerBg.value
  if (headerHoverColor.value) styles['--hover-header-color'] = headerHoverColor.value
  if (headerHoverBg.value) styles['--hover-header-bg'] = headerHoverBg.value
  if (metaColor.value) styles['--ac-meta-color'] = metaColor.value
  if (indexColor.value) styles['--ac-index-color'] = indexColor.value
  if (indexHoverColor.value) styles['--ac-index-hover'] = indexHoverColor.value
  if (contentHoverColor.value) styles['--hover-content-color'] = contentHoverColor.value
  if (contentBorderHoverColor.value) styles['--hover-content-border-color'] = contentBorderHoverColor.value
  if (iconColor.value) styles['--ac-icon-color'] = iconColor.value
  if (iconHoverColor.value) styles['--hover-icon-color'] = iconHoverColor.value
  if (iconBg.value) styles['--ac-icon-bg'] = iconBg.value
  if (iconHoverBg.value) styles['--ac-icon-bg-hover'] = iconHoverBg.value
  if (borderHoverColor.value) styles['--hover-border-color'] = borderHoverColor.value
  if (separatorHoverColor.value) styles['--hover-separator-color'] = separatorHoverColor.value
  if (dividerColor.value) styles['--ac-divider'] = dividerColor.value
  styles['--ac-accent'] = accentColor.value
  return styles
})

function itemStyle(index: number) {
  const styles: Record<string, string> = {}
  if (isColumns.value) {
    if (dividerColor.value) styles.borderBottomColor = dividerColor.value
    return styles
  }
  if (borderColor.value) styles.borderColor = borderColor.value
  if (index > 0 && separatorColor.value) styles.borderTopColor = separatorColor.value
  return styles
}

function headerStyle() {
  const styles: Record<string, string> = {}
  if (headerColor.value) styles.color = headerColor.value
  if (headerBg.value) styles.backgroundColor = headerBg.value
  return styles
}

function contentStyle() {
  const styles: Record<string, string> = {}
  if (contentColor.value) styles.color = contentColor.value
  if (contentBorderColor.value) styles.borderTopColor = contentBorderColor.value
  return styles
}
</script>

<template>
  <div
    class="lcms-accordion"
    :class="{
      'has-hover': hasHover,
      'lcms-accordion--columns': isColumns,
      'lcms-accordion--accent': accentEnabled,
      'lcms-accordion--index-fill': indexStyle === 'fill',
    }"
    :style="accordionStyle"
  >
    <div
      v-for="(item, index) in renderedItems"
      :key="index"
      class="lcms-accordion__item"
      :class="{ 'lcms-accordion__item--open': isOpen(index) }"
      :style="itemStyle(index)"
    >
      <button
        class="lcms-accordion__header"
        :style="headerStyle()"
        @click="toggle(index)"
      >
        <span
          v-if="isColumns && showIndex"
          class="lcms-accordion__index"
          aria-hidden="true"
        >{{ pad(index + 1) }}</span>
        <component
          :is="headerTag"
          class="lcms-accordion__title"
          :class="headerTextClass"
        >{{ item.title }}</component>
        <template v-if="isColumns">
          <span
            v-if="item.meta1"
            class="lcms-accordion__meta lcms-accordion__meta--1"
          >{{ item.meta1 }}</span>
          <span
            v-if="item.meta2"
            class="lcms-accordion__meta lcms-accordion__meta--2"
          >{{ item.meta2 }}</span>
        </template>
        <span
          v-if="isColumns && isPlusCircle"
          class="lcms-accordion__icon lcms-accordion__icon--circle"
        >
          <i :class="iconClosed" />
        </span>
        <i
          v-else
          :class="[isOpen(index) ? iconOpen : iconClosed, 'lcms-accordion__icon']"
        />
      </button>

      <Transition
        :css="false"
        @enter="(el, done) => slide(el, 'open', done)"
        @after-enter="slideEnd"
        @leave="(el, done) => slide(el, 'closed', done)"
        @after-leave="slideEnd"
      >
        <div
          v-show="isOpen(index)"
          class="lcms-accordion__content"
          :style="contentStyle()"
        >
          <div
            v-if="showText && item.content"
            class="lcms-accordion__text"
            v-html="item.content"
          />
          <div
            v-if="showGallery && item.images.length"
            class="lcms-accordion__gallery"
          >
            <button
              v-for="(img, imgIndex) in item.images"
              :key="imgIndex"
              type="button"
              class="lcms-accordion__gallery-item"
              :class="{ 'is-wide': imgIndex === 0, 'lcms-accordion__gallery-item--static': !lightboxEnabled }"
              :aria-label="img.alt || ''"
              @click.stop="openGallery(item.images, imgIndex, item.title)"
            >
              <video
                v-if="img.type === 'video'"
                :src="img.url"
                preload="metadata"
                muted
              />
              <img
                v-else
                :src="img.url"
                :alt="img.alt || ''"
                loading="lazy"
              >
            </button>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.lcms-accordion__item {
  position: relative;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  margin-bottom: 4px;
  overflow: hidden;
}

.lcms-accordion__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 12px 16px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: inherit;
  font-family: inherit;
  text-align: left;
  transition: color 200ms ease, background-color 200ms ease;
}

.lcms-accordion__title {
  font-weight: 600;
  margin: 0;
}

.lcms-accordion__icon {
  transition: transform 0.2s ease, color 200ms ease;
  flex-shrink: 0;
  margin-left: 12px;
}

.lcms-accordion__content {
  padding: 0 16px 12px;
  transition: color 200ms ease, border-color 200ms ease;
}

.lcms-accordion__content :deep(p) {
  margin: 0 0 0.5em 0;
}

.lcms-accordion__content :deep(p:last-child) {
  margin: 0;
}

.lcms-accordion__content :deep(ul),
.lcms-accordion__content :deep(ol) {
  padding-left: 1.5em;
  margin: 0 0 0.5em 0;
}

/* Hover styles */
.lcms-accordion.has-hover .lcms-accordion__item:hover .lcms-accordion__header {
  color: var(--hover-header-color, inherit);
  background-color: var(--hover-header-bg, inherit);
}

.lcms-accordion.has-hover .lcms-accordion__item:hover .lcms-accordion__icon {
  color: var(--hover-icon-color, inherit);
}

.lcms-accordion.has-hover .lcms-accordion__item:hover .lcms-accordion__content {
  color: var(--hover-content-color, inherit);
  border-top-color: var(--hover-content-border-color, inherit);
}

.lcms-accordion.has-hover .lcms-accordion__item:hover {
  border-color: var(--hover-border-color, inherit);
}

/* ---------- Columns layout: "zestawienie realizacji" ---------- */

.lcms-accordion--columns {
  border-top: 1px solid var(--ac-divider, #e0e0e0);
}

.lcms-accordion--columns .lcms-accordion__item {
  border: none;
  border-bottom: 1px solid var(--ac-divider, #e0e0e0);
  border-radius: 0;
  margin-bottom: 0;
  overflow: visible;
}

.lcms-accordion--columns .lcms-accordion__header {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 30px 0;
  position: relative;
}

.lcms-accordion--columns .lcms-accordion__title {
  flex: 2 1 0;
  min-width: 0;
  font-weight: 700;
  line-height: 1.15;
  transition: transform 0.5s cubic-bezier(0.2, 0.7, 0.2, 1), color 0.3s ease;
}

.lcms-accordion--columns .lcms-accordion__meta {
  flex: 1 1 0;
  min-width: 0;
  font-size: 12px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  font-weight: 600;
  line-height: 1.5;
  color: var(--ac-meta-color, var(--lcms-color-muted, #868e96));
}

.lcms-accordion--columns .lcms-accordion__meta--2 {
  flex: 2 1 0;
}

/* Accent line: draws from the left on hover / open */
.lcms-accordion--accent .lcms-accordion__item::before {
  content: "";
  position: absolute;
  left: 0;
  top: -1px;
  width: 100%;
  height: 2px;
  background: var(--ac-accent);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.6s cubic-bezier(0.2, 0.7, 0.2, 1);
  pointer-events: none;
}

.lcms-accordion--accent .lcms-accordion__item:hover::before,
.lcms-accordion--accent .lcms-accordion__item--open::before {
  transform: scaleX(1);
}

/* Index number: outline by default, fills on hover / open */
.lcms-accordion__index {
  flex: 0 0 70px;
  font-size: 28px;
  font-weight: 900;
  line-height: 1;
  color: transparent;
  -webkit-text-stroke: 1.2px var(--ac-index-color, var(--lcms-color-primary, #50a5f1));
  transition: color 0.4s ease;
}

.lcms-accordion--index-fill .lcms-accordion__index {
  -webkit-text-stroke: 0;
  color: var(--ac-index-color, var(--lcms-color-primary, #50a5f1));
}

.lcms-accordion--columns .lcms-accordion__item:hover .lcms-accordion__index,
.lcms-accordion--columns .lcms-accordion__item--open .lcms-accordion__index {
  color: var(--ac-index-hover, var(--ac-index-color, var(--lcms-color-primary, #50a5f1)));
}

.lcms-accordion--columns .lcms-accordion__item:hover .lcms-accordion__title,
.lcms-accordion--columns .lcms-accordion__item--open .lcms-accordion__title {
  transform: translateX(8px);
}

/* Plus button: outlined circle, rotates to x and fills when open */
.lcms-accordion__icon--circle {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 1.5px solid var(--ac-icon-color, var(--lcms-color-primary, #50a5f1));
  background: var(--ac-icon-bg, transparent);
  color: var(--ac-icon-color, var(--lcms-color-primary, #50a5f1));
  display: grid;
  place-items: center;
  font-size: 22px;
  margin-left: 0;
  transition: transform 0.5s cubic-bezier(0.2, 0.7, 0.2, 1), background-color 0.3s ease, color 0.3s ease;
}

.lcms-accordion--columns .lcms-accordion__item:hover .lcms-accordion__icon--circle {
  background: var(--ac-icon-bg-hover, var(--ac-icon-color, var(--lcms-color-primary, #50a5f1)));
  color: var(--lcms-color-dark, #0b0b0b);
}

.lcms-accordion--columns .lcms-accordion__item--open .lcms-accordion__icon--circle {
  transform: rotate(45deg);
  background: var(--ac-icon-bg-hover, var(--ac-icon-color, var(--lcms-color-primary, #50a5f1)));
  color: var(--lcms-color-dark, #0b0b0b);
}

/* Gallery */
.lcms-accordion__gallery {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 12px;
  padding: 10px 0 34px;
}

.lcms-accordion__gallery-item {
  display: block;
  padding: 0;
  border: none;
  background: none;
  cursor: zoom-in;
  overflow: hidden;
}

.lcms-accordion__gallery-item--static { cursor: default; }

.lcms-accordion__gallery-item img,
.lcms-accordion__gallery-item video {
  display: block;
  width: 100%;
  height: 380px;
  object-fit: cover;
  transform: scale(1.04);
  transition: transform 1.2s cubic-bezier(0.2, 0.7, 0.2, 1);
}

.lcms-accordion__item--open .lcms-accordion__gallery-item img,
.lcms-accordion__item--open .lcms-accordion__gallery-item video {
  transform: none;
}

@media (max-width: 768px) {
  .lcms-accordion--columns .lcms-accordion__header {
    gap: 12px;
    padding: 20px 0;
  }

  .lcms-accordion--columns .lcms-accordion__meta {
    display: none;
  }

  .lcms-accordion--columns .lcms-accordion__title {
    font-size: 1.05rem;
  }

  .lcms-accordion__index {
    flex-basis: 36px;
    font-size: 20px;
  }

  .lcms-accordion__icon--circle {
    width: 40px;
    height: 40px;
    font-size: 18px;
  }

  .lcms-accordion__gallery {
    grid-template-columns: 1fr 1fr;
  }

  .lcms-accordion__gallery-item:first-child {
    grid-column: 1 / -1;
  }

  .lcms-accordion__gallery-item img,
  .lcms-accordion__gallery-item video {
    height: 220px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .lcms-accordion *,
  .lcms-accordion *::before {
    transition: none !important;
  }
}
</style>
