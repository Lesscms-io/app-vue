<script setup lang="ts">
/**
 * Collection Grid Widget
 *
 * Renders collection entries in a grid/list/cards layout.
 * Supports custom entry templates from the collection configuration.
 */

import { computed, watch, ref, inject, onMounted, onBeforeUnmount, type Ref } from 'vue'
import { useCollection } from '@/composables/useCollection'
import { useLanguage } from '@/composables/useLanguage'
import { useApi } from '@/composables/useApi'
import LcmsEntryTemplateRenderer from './LcmsEntryTemplateRenderer.vue'
import type { CollectionGridWidgetData } from '@/types/widgets'
import type { CollectionEntry, CollectionTemplate, TemplateSection } from '@/api/types'
import type { ResolvedRoute } from '@/composables/useRoutes'

defineOptions({
  inheritAttrs: false
})

interface Props {
  data: CollectionGridWidgetData
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const api = useApi()
const { extractValue, language: currentLanguage } = useLanguage(props.language)

// API returns widget data in data.widget
const config = computed(() => props.data.widget || props.data || {})

const collectionCode = computed(() => config.value.collection_code || '')
const layout = computed(() => config.value.layout || config.value.card_style || 'grid')
const columns = computed(() => Number(config.value.columns) || 3)
const columnsTablet = computed(() => config.value.columns_tablet ? Number(config.value.columns_tablet) : null)
const columnsMobile = computed(() => config.value.columns_mobile ? Number(config.value.columns_mobile) : null)
const postsCount = computed(() => config.value.posts_count || 6)
const gapPx = computed(() => `${Number(config.value.gap) || 16}px`)
const contentGapPx = computed(() => `${Number(config.value.content_gap) || 8}px`)

// Resolve color variable references (var:primary → var(--lcms-color-primary))
function resolveColorValue(val: string | null): string | null {
  if (!val) return null
  if (val.startsWith('var:')) {
    const parts = val.split(':')
    const code = parts[1]
    const opacity = parts[2] ? parseInt(parts[2]) : null
    if (opacity !== null && opacity < 100) {
      return `color-mix(in srgb, var(--lcms-color-${code}) ${opacity}%, transparent)`
    }
    return `var(--lcms-color-${code})`
  }
  return val
}

// Card styling
const cardStyle = computed(() => {
  const styles: Record<string, string> = {}
  const bg = resolveColorValue(config.value.card_background_color)
  if (bg) styles.backgroundColor = bg
  const txt = resolveColorValue(config.value.card_text_color)
  if (txt) styles.color = txt
  if (config.value.card_border_radius != null) {
    styles.borderRadius = `${config.value.card_border_radius}px`
  }
  if (config.value.card_padding != null) {
    styles.padding = `${config.value.card_padding}px`
  }
  return styles
})

// Exclude current entry support
const resolvedRoute = inject<Ref<ResolvedRoute | null>>('routeParams', ref(null))

const excludeEntryId = computed(() => {
  if (!config.value.exclude_current_entry) return ''
  const params = resolvedRoute?.value?.params
  if (!params) return ''
  return params.slug || params.entry_id || params.id || Object.values(params)[0] || ''
})

// Field mappings (for default template)
const titleField = computed(() => config.value.title_field || 'title')
const excerptField = computed(() => config.value.excerpt_field || '')
const imageField = computed(() => config.value.image_field || '')
const dateField = computed(() => config.value.date_field || '')
const tagsField = computed(() => config.value.tags_field || '')

// Display toggles (for default template)
const showTitle = computed(() => config.value.show_title !== false)
const showExcerpt = computed(() => config.value.show_excerpt !== false)
const showImage = computed(() => config.value.show_image !== false)
const showDate = computed(() => config.value.show_date !== false)
const showReadMore = computed(() => config.value.show_read_more !== false)
const showTags = computed(() => config.value.show_tags === true)

// Field order
const DEFAULT_FIELD_ORDER = ['image', 'date', 'title', 'excerpt', 'tags', 'extra', 'read_more']
const fieldOrder = computed(() => {
  const order = config.value.field_order
  if (Array.isArray(order) && order.length > 0) {
    const existing = new Set(order)
    const merged = [...order]
    for (const f of DEFAULT_FIELD_ORDER) {
      if (!existing.has(f)) merged.push(f)
    }
    return merged
  }
  return DEFAULT_FIELD_ORDER
})

// Limits (for default template)
const titleLimit = computed(() => config.value.title_limit || 100)
const excerptLimit = computed(() => config.value.excerpt_limit || 200)
const readMoreText = computed(() => config.value.read_more_text ? extractValue(config.value.read_more_text) : 'Read more')

// Custom entry template - format: "custom:uuid" or just uuid
const entryTemplateConfig = computed(() => config.value.entry_template || '')
const hasCustomTemplate = computed(() => !!entryTemplateConfig.value)
const templateId = computed(() => {
  const val = entryTemplateConfig.value
  if (val.startsWith('custom:')) {
    return val.replace('custom:', '')
  }
  return val
})

// Template data
const template = ref<CollectionTemplate | null>(null)
const templateLoading = ref(false)
const templateError = ref<Error | null>(null)

// Fetch template if configured
async function fetchTemplate() {
  if (!hasCustomTemplate.value || !collectionCode.value || !templateId.value) {
    return
  }

  templateLoading.value = true
  templateError.value = null

  try {
    const response = await api.getCollectionTemplate(collectionCode.value, templateId.value)
    template.value = response.data
    console.log('Loaded template:', template.value)
  } catch (e) {
    console.error('Failed to load template:', e)
    templateError.value = e as Error
  } finally {
    templateLoading.value = false
  }
}

// Fetch template on mount
onMounted(() => {
  if (hasCustomTemplate.value) {
    fetchTemplate()
  }
  updateResponsiveStyle()
})

// Re-fetch if template config changes
watch([collectionCode, templateId], () => {
  if (hasCustomTemplate.value) {
    fetchTemplate()
  }
})

// Update responsive styles when columns change
watch([columns, columnsTablet, columnsMobile], () => {
  updateResponsiveStyle()
})

onBeforeUnmount(() => {
  if (responsiveStyleEl.value) {
    responsiveStyleEl.value.remove()
  }
})

// Route, ordering, and filtering (for future features)
const routeUuid = computed(() => config.value.route_uuid || null)
const orderBy = computed(() => config.value.order_by || '')
const orderDir = computed(() => config.value.order_dir || 'asc')
const extraField = computed(() => config.value.extra_field || '')
const showPagination = computed(() => config.value.show_pagination || false)
const showExtra = computed(() => config.value.show_extra || false)
const excludeUrlSegment = computed(() => config.value.exclude_url_segment || null)
const filterField = computed(() => config.value.filter_field || '')
const filterSource = computed(() => config.value.filter_source || '')
const filterValue = computed(() => config.value.filter_value || '')
const filterUrlSegment = computed(() => config.value.filter_url_segment || null)
const cardStylePreset = computed(() => config.value.card_style || 'default')
const useCustomLayout = computed(() => config.value.use_custom_layout || false)
const layoutConfig = computed(() => config.value.layout_config || null)

// Use enriched entries from API if available, otherwise fetch client-side
const hasEnrichedData = computed(() => Array.isArray(config.value.entries))

const collectionCodeForFetch = computed(() => hasEnrichedData.value ? '' : collectionCode.value)

const { entries: fetchedEntries, loading: fetchLoading, error: fetchError } = useCollection(collectionCodeForFetch, {
  pageSize: postsCount.value,
}, excludeEntryId)

const allEntries = computed(() => hasEnrichedData.value ? config.value.entries : fetchedEntries.value)
const loading = computed(() => hasEnrichedData.value ? false : fetchLoading.value)
const error = computed(() => hasEnrichedData.value ? null : fetchError.value)

// Resolve filter value (static or from URL)
const resolvedFilterValue = computed(() => {
  if (!filterField.value) return ''
  if (filterSource.value === 'url') {
    const seg = Number(filterUrlSegment.value) || 1
    const segments = window.location.pathname.split('/').filter((s: string) => s)
    return segments[seg - 1] || ''
  }
  return filterValue.value
})

function matchFieldValue(fieldVal: any, target: string): boolean {
  if (!fieldVal) return false
  if (Array.isArray(fieldVal)) {
    return fieldVal.some((item: any) => {
      if (item && typeof item === 'object' && item.code) return item.code === target
      if (typeof item === 'string') return item === target
      return false
    })
  }
  if (fieldVal && typeof fieldVal === 'object' && fieldVal.code) return fieldVal.code === target
  if (typeof fieldVal === 'string') return fieldVal === target || fieldVal.toLowerCase() === target.toLowerCase()
  // Multilingual object
  if (fieldVal && typeof fieldVal === 'object' && !Array.isArray(fieldVal)) {
    const lang = document.documentElement.lang || 'pl'
    const resolved = fieldVal[lang] || fieldVal.pl || Object.values(fieldVal).find((v: any) => v != null && v !== '')
    if (resolved) return String(resolved).toLowerCase() === target.toLowerCase()
  }
  return String(fieldVal) === target
}

const entries = computed(() => {
  if (!filterField.value || !resolvedFilterValue.value) return allEntries.value
  return allEntries.value.filter((entry: CollectionEntry) => {
    if (filterField.value === '_entry_id') {
      const entryId = entry.metadata?.entry_id || (entry as any).entry_id || ''
      return entryId === resolvedFilterValue.value
    }
    const fieldVal = entry.content?.[filterField.value]
    return matchFieldValue(fieldVal, resolvedFilterValue.value)
  })
})

// Helper functions
function getFieldValue(entry: CollectionEntry, fieldCode: string): any {
  if (!fieldCode || !entry.content) return null
  const value = entry.content[fieldCode]
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value[currentLanguage.value] || value.pl || Object.values(value)[0]
  }
  return value
}

function getTitle(entry: CollectionEntry): string {
  const title = getFieldValue(entry, titleField.value) || ''
  if (titleLimit.value && title.length > titleLimit.value) {
    return title.substring(0, titleLimit.value) + '...'
  }
  return title
}

function getExcerpt(entry: CollectionEntry): string {
  const text = getFieldValue(entry, excerptField.value) || ''
  // Strip HTML tags
  const stripped = text.replace(/<[^>]*>/g, '')
  if (excerptLimit.value && stripped.length > excerptLimit.value) {
    return stripped.substring(0, excerptLimit.value) + '...'
  }
  return stripped
}

function getImage(entry: CollectionEntry): string {
  const image = getFieldValue(entry, imageField.value)
  if (!image) return ''
  // Support gallery fields - take first image from array
  const single = Array.isArray(image) ? image[0] : image
  if (!single) return ''
  if (typeof single === 'object' && single.url) return single.url
  return single
}

function getDate(entry: CollectionEntry): string {
  const dateValue = dateField.value ? getFieldValue(entry, dateField.value) : entry.metadata?.created_at
  if (!dateValue) return ''
  const date = new Date(dateValue)
  return date.toLocaleDateString(currentLanguage.value, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function getTags(entry: CollectionEntry): string[] {
  if (!tagsField.value) return []
  const value = getFieldValue(entry, tagsField.value)
  if (!value) return []
  if (Array.isArray(value)) {
    return value.map((item: any) => {
      if (item && typeof item === 'object' && item.value) return item.value
      if (item && typeof item === 'object' && item.code) return item.code
      return String(item)
    })
  }
  if (typeof value === 'string') return [value]
  return []
}

function getUrl(entry: CollectionEntry): string {
  return entry.metadata?.url || '#'
}

// Build a unique ID for responsive style injection
const responsiveStyleId = computed(() => `lcms-grid-${Math.random().toString(36).slice(2, 8)}`)

const gridClass = computed(() => {
  if (columnsTablet.value || columnsMobile.value) {
    return responsiveStyleId.value
  }
  return ''
})

const gridStyle = computed(() => {
  if (layout.value === 'list') return { gap: gapPx.value }
  return {
    gridTemplateColumns: `repeat(${columns.value}, 1fr)`,
    gap: gapPx.value,
  }
})

// Inject responsive CSS for tablet/mobile columns
const responsiveStyleEl = ref<HTMLStyleElement | null>(null)

function updateResponsiveStyle() {
  if (responsiveStyleEl.value) {
    responsiveStyleEl.value.remove()
    responsiveStyleEl.value = null
  }
  if (!columnsTablet.value && !columnsMobile.value) return
  if (layout.value === 'list') return

  const cls = responsiveStyleId.value
  let css = ''
  if (columnsTablet.value) {
    css += `@media (max-width: 1199px) { .${cls} { grid-template-columns: repeat(${columnsTablet.value}, 1fr) !important; } }\n`
  }
  if (columnsMobile.value) {
    css += `@media (max-width: 767px) { .${cls} { grid-template-columns: repeat(${columnsMobile.value}, 1fr) !important; } }\n`
  }
  if (css) {
    const style = document.createElement('style')
    style.textContent = css
    document.head.appendChild(style)
    responsiveStyleEl.value = style
  }
}
</script>

<template>
  <div
    class="lcms-collection-grid"
    :class="`lcms-collection-grid--${layout}`"
  >
    <div
      v-if="loading"
      class="lcms-collection-grid__loading"
    >
      <i class="fa-solid fa-spinner fa-spin" />
      <span>Loading...</span>
    </div>

    <div
      v-else-if="error"
      class="lcms-collection-grid__error"
    >
      Failed to load collection
    </div>

    <div
      v-else-if="entries.length === 0"
      class="lcms-collection-grid__empty"
    >
      No entries found
    </div>

    <!-- Custom template rendering -->
    <div
      v-else-if="hasCustomTemplate && template"
      class="lcms-collection-grid__items lcms-collection-grid__items--custom"
      :class="gridClass"
      :style="gridStyle"
    >
      <article
        v-for="entry in entries"
        :key="entry.metadata?.entry_id || entry.metadata?.code"
        class="lcms-collection-grid__item lcms-collection-grid__item--custom"
        :style="cardStyle"
      >
        <LcmsEntryTemplateRenderer
          :entry="entry"
          :sections="template.sections"
          :language="language"
        />
      </article>
    </div>

    <!-- Template loading -->
    <div
      v-else-if="hasCustomTemplate && templateLoading"
      class="lcms-collection-grid__loading"
    >
      <i class="fa-solid fa-spinner fa-spin" />
      <span>Loading template...</span>
    </div>

    <!-- Overlay style rendering -->
    <div
      v-else-if="cardStylePreset === 'overlay'"
      class="lcms-collection-grid__items lcms-collection-grid--style-overlay"
      :class="gridClass"
      :style="gridStyle"
    >
      <article
        v-for="entry in entries"
        :key="entry.metadata?.entry_id || entry.metadata?.code"
        class="lcms-collection-grid__item"
        :style="{
          ...cardStyle,
          backgroundImage: showImage && imageField && getImage(entry) ? `url('${getImage(entry)}')` : undefined,
        }"
      >
        <div class="lcms-collection-grid__overlay-gradient" />
        <div class="lcms-collection-grid__content" :style="{ gap: contentGapPx }">
          <template v-for="field in fieldOrder" :key="field">
            <h3
              v-if="field === 'title' && showTitle"
              class="lcms-collection-grid__title"
            >
              <a :href="getUrl(entry)">{{ getTitle(entry) }}</a>
            </h3>

            <time
              v-else-if="field === 'date' && showDate && getDate(entry)"
              class="lcms-collection-grid__date"
            >
              {{ getDate(entry) }}
            </time>

            <p
              v-else-if="field === 'excerpt' && showExcerpt && excerptField && getExcerpt(entry)"
              class="lcms-collection-grid__excerpt"
            >
              {{ getExcerpt(entry) }}
            </p>

            <div
              v-else-if="field === 'tags' && showTags && getTags(entry).length > 0"
              class="lcms-collection-grid__tags"
            >
              <span
                v-for="(tag, tagIndex) in getTags(entry)"
                :key="tagIndex"
                class="lcms-collection-grid__tag"
              >{{ tag }}</span>
            </div>

            <a
              v-else-if="field === 'read_more' && showReadMore"
              :href="getUrl(entry)"
              class="lcms-collection-grid__read-more"
            >
              {{ readMoreText }}
            </a>
          </template>
        </div>
      </article>
    </div>

    <!-- Default template rendering (default, shadow, bordered, minimal) -->
    <div
      v-else
      class="lcms-collection-grid__items"
      :class="[gridClass, cardStylePreset !== 'default' ? 'lcms-collection-grid--style-' + cardStylePreset : '']"
      :style="gridStyle"
    >
      <article
        v-for="entry in entries"
        :key="entry.metadata?.entry_id || entry.metadata?.code"
        class="lcms-collection-grid__item"
        :style="cardStyle"
      >
        <a
          v-if="showImage && imageField && getImage(entry)"
          :href="getUrl(entry)"
          class="lcms-collection-grid__image-link"
        >
          <img
            :src="getImage(entry)"
            :alt="getTitle(entry)"
            class="lcms-collection-grid__image"
          >
        </a>

        <div class="lcms-collection-grid__content" :style="{ gap: contentGapPx }">
          <template v-for="field in fieldOrder" :key="field">
            <h3
              v-if="field === 'title' && showTitle"
              class="lcms-collection-grid__title"
            >
              <a :href="getUrl(entry)">{{ getTitle(entry) }}</a>
            </h3>

            <time
              v-else-if="field === 'date' && showDate && getDate(entry)"
              class="lcms-collection-grid__date"
            >
              {{ getDate(entry) }}
            </time>

            <p
              v-else-if="field === 'excerpt' && showExcerpt && excerptField && getExcerpt(entry)"
              class="lcms-collection-grid__excerpt"
            >
              {{ getExcerpt(entry) }}
            </p>

            <div
              v-else-if="field === 'tags' && showTags && getTags(entry).length > 0"
              class="lcms-collection-grid__tags"
            >
              <span
                v-for="(tag, tagIndex) in getTags(entry)"
                :key="tagIndex"
                class="lcms-collection-grid__tag"
              >{{ tag }}</span>
            </div>

            <a
              v-else-if="field === 'read_more' && showReadMore"
              :href="getUrl(entry)"
              class="lcms-collection-grid__read-more"
            >
              {{ readMoreText }}
            </a>
          </template>
        </div>
      </article>
    </div>
  </div>
</template>
