<script setup lang="ts">
/**
 * Collection Single Widget
 *
 * Renders a single collection entry.
 */

import { computed } from 'vue'
import { useCollectionEntry } from '@/composables/useCollection'
import { useLanguage } from '@/composables/useLanguage'
import type { CollectionSingleWidgetData } from '@/types/widgets'

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

// Field mappings
const titleField = computed(() => props.data.title_field || 'title')
const contentField = computed(() => props.data.content_field || '')
const imageField = computed(() => props.data.image_field || '')

// Display toggles
const showTitle = computed(() => props.data.show_title !== false)
const showContent = computed(() => props.data.show_content !== false)
const showImage = computed(() => props.data.show_image !== false)

const { entry, loading, error } = useCollectionEntry(collectionCode, entryId)

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
