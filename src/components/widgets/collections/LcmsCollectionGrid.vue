<script setup lang="ts">
/**
 * Collection Grid Widget
 *
 * Renders collection entries in a grid/list/cards layout.
 * Supports custom entry templates from the collection configuration.
 */

import { computed, watch, ref, onMounted } from 'vue'
import { useCollection } from '@/composables/useCollection'
import { useLanguage } from '@/composables/useLanguage'
import { useApi } from '@/composables/useApi'
import LcmsEntryTemplateRenderer from './LcmsEntryTemplateRenderer.vue'
import type { CollectionGridWidgetData } from '@/types/widgets'
import type { CollectionEntry, CollectionTemplate, TemplateSection } from '@/api/types'

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

// API returns config in data.config
const config = computed(() => props.data.config || props.data || {})

const collectionCode = computed(() => config.value.collection_code || '')
const layout = computed(() => config.value.layout || config.value.card_style || 'grid')
const columns = computed(() => Number(config.value.columns) || 3)
const postsCount = computed(() => config.value.posts_count || 6)

// Field mappings (for default template)
const titleField = computed(() => config.value.title_field || 'title')
const excerptField = computed(() => config.value.excerpt_field || '')
const imageField = computed(() => config.value.image_field || '')
const dateField = computed(() => config.value.date_field || '')

// Display toggles (for default template)
const showTitle = computed(() => config.value.show_title !== false)
const showExcerpt = computed(() => config.value.show_excerpt !== false)
const showImage = computed(() => config.value.show_image !== false)
const showDate = computed(() => config.value.show_date !== false)
const showReadMore = computed(() => config.value.show_read_more !== false)

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
})

// Re-fetch if template config changes
watch([collectionCode, templateId], () => {
  if (hasCustomTemplate.value) {
    fetchTemplate()
  }
})

// Note: order_by and order_dir are not yet supported by the API
const { entries, loading, error } = useCollection(collectionCode, {
  pageSize: postsCount.value,
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
  if (typeof image === 'object' && image.url) return image.url
  return image
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

function getUrl(entry: CollectionEntry): string {
  return entry.metadata?.url || '#'
}

const gridStyle = computed(() => {
  if (layout.value === 'list') return {}
  return {
    gridTemplateColumns: `repeat(${columns.value}, 1fr)`,
  }
})
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
      :style="gridStyle"
    >
      <article
        v-for="entry in entries"
        :key="entry.metadata?.entry_id || entry.metadata?.code"
        class="lcms-collection-grid__item lcms-collection-grid__item--custom"
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

    <!-- Default template rendering -->
    <div
      v-else
      class="lcms-collection-grid__items"
      :style="gridStyle"
    >
      <article
        v-for="entry in entries"
        :key="entry.metadata?.entry_id || entry.metadata?.code"
        class="lcms-collection-grid__item"
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

        <div class="lcms-collection-grid__content">
          <h3
            v-if="showTitle"
            class="lcms-collection-grid__title"
          >
            <a :href="getUrl(entry)">{{ getTitle(entry) }}</a>
          </h3>

          <time
            v-if="showDate && getDate(entry)"
            class="lcms-collection-grid__date"
          >
            {{ getDate(entry) }}
          </time>

          <p
            v-if="showExcerpt && excerptField && getExcerpt(entry)"
            class="lcms-collection-grid__excerpt"
          >
            {{ getExcerpt(entry) }}
          </p>

          <a
            v-if="showReadMore"
            :href="getUrl(entry)"
            class="lcms-collection-grid__read-more"
          >
            {{ readMoreText }}
          </a>
        </div>
      </article>
    </div>
  </div>
</template>
