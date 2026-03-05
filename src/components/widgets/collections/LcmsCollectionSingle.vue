<script setup lang="ts">
/**
 * Collection Single Widget
 *
 * Renders a single collection entry.
 */

import { computed, inject, unref, type Ref } from 'vue'
import { useCollectionEntry } from '@/composables/useCollection'
import { useLanguage } from '@/composables/useLanguage'
import type { CollectionSingleWidgetData } from '@/types/widgets'
import type { CollectionEntry } from '@/api/types'
import type { ResolvedRoute } from '@/composables/useRoutes'

defineOptions({
  inheritAttrs: false
})

interface Props {
  data: CollectionSingleWidgetData
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const { language: currentLanguage } = useLanguage(props.language)

const collectionCode = computed(() => props.data.collection_code || '')
const entryId = computed(() => props.data.entry_id || '')
const layout = computed(() => props.data.layout || 'standard')

// Route and entry source settings
const routeUuid = computed(() => props.data.route_uuid || null)
const entrySource = computed(() => props.data.entry_source || 'static')
const entryUrlSegment = computed(() => props.data.entry_url_segment || 1)
const entryTemplate = computed(() => props.data.entry_template || 'default:standard')
const useCustomLayout = computed(() => props.data.use_custom_layout || false)
const layoutConfig = computed(() => props.data.layout_config || null)

// Field mappings
const titleField = computed(() => props.data.title_field || 'title')
const contentField = computed(() => props.data.content_field || '')
const imageField = computed(() => props.data.image_field || '')

// Display toggles
const showTitle = computed(() => props.data.show_title !== false)
const showContent = computed(() => props.data.show_content !== false)
const showImage = computed(() => props.data.show_image !== false)

// Inject route params and collection entry from DynamicPageResolver
const resolvedRoute = inject<Ref<ResolvedRoute | null> | null>('routeParams', null)
const injectedEntry = inject<Ref<CollectionEntry | null> | CollectionEntry | null>('lcms-collection-entry', null)

// Determine effective collection code and entry ID based on entry_source
const effectiveCollectionCode = computed(() => {
  if (entrySource.value === 'url') {
    const params = unref(resolvedRoute)?.params
    return params?.collectionCode || collectionCode.value
  }
  return collectionCode.value
})

const effectiveEntryId = computed(() => {
  if (entrySource.value === 'url') {
    const params = unref(resolvedRoute)?.params
    if (!params) return ''
    // Entry identifier may be named 'entry_id', 'slug', or any custom name
    const { collectionCode: _cc, ...rest } = params
    return rest.entry_id || rest.slug || Object.values(rest)[0] || ''
  }
  return entryId.value
})

// Use enriched entry from API if available, or injected entry for 'url' mode, otherwise fetch client-side
const hasEnrichedData = computed(() => !!props.data.entry)
const hasInjectedEntry = computed(() => {
  if (entrySource.value !== 'url') return false
  const entry = unref(injectedEntry)
  return !!entry
})

const collectionCodeForFetch = computed(() => {
  if (hasEnrichedData.value || hasInjectedEntry.value) return ''
  return effectiveCollectionCode.value
})

const entryIdForFetch = computed(() => {
  if (hasEnrichedData.value || hasInjectedEntry.value) return ''
  return effectiveEntryId.value
})

const { entry: fetchedEntry, loading: fetchLoading, error: fetchError } = useCollectionEntry(collectionCodeForFetch, entryIdForFetch)

const entry = computed(() => {
  if (hasEnrichedData.value) return props.data.entry
  if (hasInjectedEntry.value) return unref(injectedEntry)
  return fetchedEntry.value
})
const loading = computed(() => {
  if (hasEnrichedData.value || hasInjectedEntry.value) return false
  return fetchLoading.value
})
const error = computed(() => {
  if (hasEnrichedData.value || hasInjectedEntry.value) return null
  return fetchError.value
})

// Helper functions
function getFieldValue(fieldCode: string): any {
  if (!fieldCode || !entry.value?.content) return null
  const value = entry.value.content[fieldCode]
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value[currentLanguage.value] || value.pl || Object.values(value)[0]
  }
  return value
}

const title = computed(() => getFieldValue(titleField.value) || '')

const content = computed(() => getFieldValue(contentField.value) || '')

const image = computed(() => {
  const img = getFieldValue(imageField.value)
  if (!img) return ''
  if (typeof img === 'object' && img.url) return img.url
  return img
})
</script>

<template>
  <article
    class="lcms-collection-single"
    :class="`lcms-collection-single--${layout}`"
  >
    <div
      v-if="loading"
      class="lcms-collection-single__loading"
    >
      <i class="fa-solid fa-spinner fa-spin" />
      <span>Loading...</span>
    </div>

    <div
      v-else-if="error"
      class="lcms-collection-single__error"
    >
      Failed to load entry
    </div>

    <div
      v-else-if="!entry"
      class="lcms-collection-single__empty"
    >
      Entry not found
    </div>

    <template v-else>
      <img
        v-if="showImage && image"
        :src="image"
        :alt="title"
        class="lcms-collection-single__image"
      >

      <div class="lcms-collection-single__content">
        <h2
          v-if="showTitle && title"
          class="lcms-collection-single__title"
        >
          {{ title }}
        </h2>

        <div
          v-if="showContent && content"
          class="lcms-collection-single__body"
          v-html="content"
        />
      </div>
    </template>
  </article>
</template>
