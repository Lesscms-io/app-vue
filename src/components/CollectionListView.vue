<script setup lang="ts">
/**
 * Collection List View
 *
 * Displays a paginated list of collection entries.
 */

import { computed, ref, watch } from 'vue'
import { useCollection } from '@/composables/useCollection'
import { useLanguage } from '@/composables/useLanguage'
import type { CollectionEntry } from '@/api/types'

interface Props {
  collectionCode: string
  language?: string
  pageSize?: number
  titleField?: string
  excerptField?: string
  imageField?: string
  dateField?: string
}

const props = withDefaults(defineProps<Props>(), {
  pageSize: 10,
  titleField: 'title',
  excerptField: '',
  imageField: '',
  dateField: '',
})

const emit = defineEmits<{
  (e: 'entryClick', entry: CollectionEntry): void
}>()

const code = computed(() => props.collectionCode)
const currentPage = ref(1)

const { language: currentLanguage } = useLanguage(props.language)

const { entries, loading, error, totalPages, refetch } = useCollection(code, {
  pageSize: props.pageSize,
  page: currentPage.value,
})

// Refetch when page changes
watch(currentPage, () => {
  refetch()
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
  return getFieldValue(entry, props.titleField) || entry.metadata?.entry_id || ''
}

function getExcerpt(entry: CollectionEntry): string {
  if (!props.excerptField) return ''
  const text = getFieldValue(entry, props.excerptField) || ''
  const stripped = text.replace(/<[^>]*>/g, '')
  return stripped.length > 200 ? stripped.substring(0, 200) + '...' : stripped
}

function getImage(entry: CollectionEntry): string {
  if (!props.imageField) return ''
  const image = getFieldValue(entry, props.imageField)
  if (!image) return ''
  if (typeof image === 'object' && image.url) return image.url
  return image
}

function getDate(entry: CollectionEntry): string {
  const dateValue = props.dateField
    ? getFieldValue(entry, props.dateField)
    : entry.metadata?.created_at

  if (!dateValue) return ''
  const date = new Date(dateValue)
  return date.toLocaleDateString(currentLanguage.value, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function getUrl(entry: CollectionEntry): string {
  return entry.metadata?.url || `/collection/${props.collectionCode}/${entry.metadata?.entry_id}`
}

function handleEntryClick(entry: CollectionEntry, event: Event) {
  emit('entryClick', entry)
}

function goToPage(page: number) {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}
</script>

<template>
  <div class="lcms-collection-list">
    <div
      v-if="loading"
      class="lcms-collection-list__loading"
    >
      <i class="fa-solid fa-spinner fa-spin" />
      <span>Loading...</span>
    </div>

    <div
      v-else-if="error"
      class="lcms-collection-list__error"
    >
      <i class="fa-solid fa-exclamation-triangle" />
      <span>Failed to load collection</span>
    </div>

    <div
      v-else-if="entries.length === 0"
      class="lcms-collection-list__empty"
    >
      <i class="fa-solid fa-inbox" />
      <span>No entries found</span>
    </div>

    <template v-else>
      <div class="lcms-collection-list__items">
        <article
          v-for="entry in entries"
          :key="entry.metadata?.entry_id"
          class="lcms-collection-list__item"
          @click="handleEntryClick(entry, $event)"
        >
          <a
            v-if="imageField && getImage(entry)"
            :href="getUrl(entry)"
            class="lcms-collection-list__image-link"
          >
            <img
              :src="getImage(entry)"
              :alt="getTitle(entry)"
              class="lcms-collection-list__image"
            >
          </a>

          <div class="lcms-collection-list__content">
            <h2 class="lcms-collection-list__title">
              <a :href="getUrl(entry)">{{ getTitle(entry) }}</a>
            </h2>

            <time
              v-if="getDate(entry)"
              class="lcms-collection-list__date"
            >
              {{ getDate(entry) }}
            </time>

            <p
              v-if="excerptField && getExcerpt(entry)"
              class="lcms-collection-list__excerpt"
            >
              {{ getExcerpt(entry) }}
            </p>
          </div>
        </article>
      </div>

      <!-- Pagination -->
      <nav
        v-if="totalPages > 1"
        class="lcms-collection-list__pagination"
      >
        <button
          class="lcms-collection-list__page-btn lcms-collection-list__page-btn--prev"
          :disabled="currentPage <= 1"
          @click="goToPage(currentPage - 1)"
        >
          <i class="fa-solid fa-chevron-left" />
        </button>

        <span class="lcms-collection-list__page-info">
          {{ currentPage }} / {{ totalPages }}
        </span>

        <button
          class="lcms-collection-list__page-btn lcms-collection-list__page-btn--next"
          :disabled="currentPage >= totalPages"
          @click="goToPage(currentPage + 1)"
        >
          <i class="fa-solid fa-chevron-right" />
        </button>
      </nav>
    </template>
  </div>
</template>
