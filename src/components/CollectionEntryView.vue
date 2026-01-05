<script setup lang="ts">
/**
 * Collection Entry View
 *
 * Displays a single collection entry.
 */

import { computed, watch } from 'vue'
import { useCollectionEntry } from '@/composables/useCollection'
import { useLanguage } from '@/composables/useLanguage'

interface Props {
  collectionCode: string
  entryId: string
  language?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'loaded', entry: any): void
  (e: 'error', error: Error): void
}>()

const code = computed(() => props.collectionCode)
const entryId = computed(() => props.entryId)

const { language: currentLanguage, extractValue } = useLanguage(props.language)

const { entry, loading, error } = useCollectionEntry(code, entryId)

// Emit events
watch(entry, (newEntry) => {
  if (newEntry) {
    emit('loaded', newEntry)
  }
})

watch(error, (newError) => {
  if (newError) {
    emit('error', newError)
  }
})

// Get field value with language fallback
function getFieldValue(fieldCode: string): any {
  if (!fieldCode || !entry.value?.content) return null
  const value = entry.value.content[fieldCode]
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value[currentLanguage.value] || value.pl || Object.values(value)[0]
  }
  return value
}

// Get all content fields for display
const contentFields = computed(() => {
  if (!entry.value?.content) return []
  return Object.entries(entry.value.content).map(([key, value]) => ({
    key,
    value: extractValue(value),
  }))
})

const metadata = computed(() => entry.value?.metadata || {})
</script>

<template>
  <div class="lcms-collection-entry">
    <div
      v-if="loading"
      class="lcms-collection-entry__loading"
    >
      <i class="fa-solid fa-spinner fa-spin" />
      <span>Loading...</span>
    </div>

    <div
      v-else-if="error"
      class="lcms-collection-entry__error"
    >
      <i class="fa-solid fa-exclamation-triangle" />
      <span>Failed to load entry</span>
    </div>

    <div
      v-else-if="!entry"
      class="lcms-collection-entry__not-found"
    >
      <i class="fa-solid fa-file-circle-question" />
      <span>Entry not found</span>
    </div>

    <article
      v-else
      class="lcms-collection-entry__content"
    >
      <!-- Slot for custom header -->
      <slot
        name="header"
        :entry="entry"
        :metadata="metadata"
      />

      <!-- Default content rendering -->
      <div class="lcms-collection-entry__fields">
        <div
          v-for="field in contentFields"
          :key="field.key"
          class="lcms-collection-entry__field"
          :data-field="field.key"
        >
          <template v-if="typeof field.value === 'string'">
            <!-- Check if it's HTML content -->
            <div
              v-if="field.value.includes('<')"
              class="lcms-collection-entry__field-html"
              v-html="field.value"
            />
            <p
              v-else
              class="lcms-collection-entry__field-text"
            >
              {{ field.value }}
            </p>
          </template>

          <template v-else-if="typeof field.value === 'object' && field.value?.url">
            <!-- Image field -->
            <img
              :src="field.value.url"
              :alt="field.value.alt || ''"
              class="lcms-collection-entry__field-image"
            >
          </template>

          <template v-else-if="Array.isArray(field.value)">
            <!-- Array field (gallery, tags, etc.) -->
            <ul class="lcms-collection-entry__field-list">
              <li
                v-for="(item, index) in field.value"
                :key="index"
              >
                <template v-if="typeof item === 'object' && item.url">
                  <img
                    :src="item.url"
                    :alt="item.alt || ''"
                  >
                </template>
                <template v-else>
                  {{ item }}
                </template>
              </li>
            </ul>
          </template>

          <template v-else>
            <pre class="lcms-collection-entry__field-json">{{ JSON.stringify(field.value, null, 2) }}</pre>
          </template>
        </div>
      </div>

      <!-- Slot for custom footer -->
      <slot
        name="footer"
        :entry="entry"
        :metadata="metadata"
      />
    </article>
  </div>
</template>
