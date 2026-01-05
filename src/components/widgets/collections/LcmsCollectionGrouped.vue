<template>
  <div class="lcms-collection-grouped" :class="styleClass">
    <template v-if="loading">
      <div class="lcms-collection-grouped__loading">Loading...</div>
    </template>
    <template v-else-if="groups.length > 0">
      <!-- Sections style -->
      <template v-if="displayStyle === 'sections'">
        <div v-for="group in groups" :key="group.name" class="lcms-collection-grouped__section">
          <h2 class="lcms-collection-grouped__group-title">{{ group.name }}</h2>
          <div class="lcms-collection-grouped__items" :class="itemLayoutClass">
            <div
              v-for="entry in group.entries"
              :key="entry.uuid"
              class="lcms-collection-grouped__item"
            >
              <img
                v-if="showImage && getImage(entry)"
                :src="getImage(entry)"
                :alt="getTitle(entry)"
                class="lcms-collection-grouped__image"
              />
              <div class="lcms-collection-grouped__item-content">
                <h3 v-if="showTitle" class="lcms-collection-grouped__item-title">
                  {{ getTitle(entry) }}
                </h3>
                <p v-if="showDescription" class="lcms-collection-grouped__item-description">
                  {{ getDescription(entry) }}
                </p>
                <span v-if="showPrice" class="lcms-collection-grouped__item-price">
                  {{ getPrice(entry) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Accordion style -->
      <template v-else-if="displayStyle === 'accordion'">
        <div v-for="group in groups" :key="group.name" class="lcms-collection-grouped__accordion">
          <button
            class="lcms-collection-grouped__accordion-header"
            :class="{ 'is-open': openGroups.has(group.name) }"
            @click="toggleGroup(group.name)"
          >
            {{ group.name }}
            <span class="lcms-collection-grouped__accordion-icon">
              {{ openGroups.has(group.name) ? '−' : '+' }}
            </span>
          </button>
          <div v-if="openGroups.has(group.name)" class="lcms-collection-grouped__accordion-content">
            <div class="lcms-collection-grouped__items" :class="itemLayoutClass">
              <div
                v-for="entry in group.entries"
                :key="entry.uuid"
                class="lcms-collection-grouped__item"
              >
                <img
                  v-if="showImage && getImage(entry)"
                  :src="getImage(entry)"
                  :alt="getTitle(entry)"
                  class="lcms-collection-grouped__image"
                />
                <div class="lcms-collection-grouped__item-content">
                  <h3 v-if="showTitle" class="lcms-collection-grouped__item-title">
                    {{ getTitle(entry) }}
                  </h3>
                  <p v-if="showDescription" class="lcms-collection-grouped__item-description">
                    {{ getDescription(entry) }}
                  </p>
                  <span v-if="showPrice" class="lcms-collection-grouped__item-price">
                    {{ getPrice(entry) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Tabs style -->
      <template v-else-if="displayStyle === 'tabs'">
        <div class="lcms-collection-grouped__tabs">
          <div class="lcms-collection-grouped__tab-headers">
            <button
              v-for="group in groups"
              :key="group.name"
              class="lcms-collection-grouped__tab-header"
              :class="{ 'is-active': activeTab === group.name }"
              @click="activeTab = group.name"
            >
              {{ group.name }}
            </button>
          </div>
          <div class="lcms-collection-grouped__tab-content">
            <template v-for="group in groups" :key="group.name">
              <div v-if="activeTab === group.name" class="lcms-collection-grouped__items" :class="itemLayoutClass">
                <div
                  v-for="entry in group.entries"
                  :key="entry.uuid"
                  class="lcms-collection-grouped__item"
                >
                  <img
                    v-if="showImage && getImage(entry)"
                    :src="getImage(entry)"
                    :alt="getTitle(entry)"
                    class="lcms-collection-grouped__image"
                  />
                  <div class="lcms-collection-grouped__item-content">
                    <h3 v-if="showTitle" class="lcms-collection-grouped__item-title">
                      {{ getTitle(entry) }}
                    </h3>
                    <p v-if="showDescription" class="lcms-collection-grouped__item-description">
                      {{ getDescription(entry) }}
                    </p>
                    <span v-if="showPrice" class="lcms-collection-grouped__item-price">
                      {{ getPrice(entry) }}
                    </span>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>
      </template>
    </template>
    <template v-else>
      <div class="lcms-collection-grouped__empty">No entries found</div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import { useApi } from '../../../composables/useApi'

interface Entry {
  uuid: string
  data: Record<string, unknown>
  [key: string]: unknown
}

interface Group {
  name: string
  entries: Entry[]
}

const props = defineProps<{
  data: {
    widget_type: string
    config: {
      collection_code?: string
      group_by_field?: string
      style?: string
      item_layout?: string
      posts_count?: number
      title_field?: string
      description_field?: string
      price_field?: string
      image_field?: string
      show_title?: boolean
      show_description?: boolean
      show_price?: boolean
      show_image?: boolean
      show_uncategorized?: boolean
    }
    settings?: Record<string, unknown>
  }
}>()

const config = computed(() => props.data.config || {})

const collectionCode = computed(() => config.value.collection_code || '')
const groupByField = computed(() => config.value.group_by_field || '')
const displayStyle = computed(() => config.value.style || 'sections')
const itemLayout = computed(() => config.value.item_layout || 'list')
const postsCount = computed(() => config.value.posts_count || 0)
const titleField = computed(() => config.value.title_field || 'title')
const descriptionField = computed(() => config.value.description_field || 'description')
const priceField = computed(() => config.value.price_field || 'price')
const imageField = computed(() => config.value.image_field || 'image')
const showTitle = computed(() => config.value.show_title ?? true)
const showDescription = computed(() => config.value.show_description ?? true)
const showPrice = computed(() => config.value.show_price ?? false)
const showImage = computed(() => config.value.show_image ?? true)
const showUncategorized = computed(() => config.value.show_uncategorized ?? true)

const styleClass = computed(() => `lcms-collection-grouped--${displayStyle.value}`)
const itemLayoutClass = computed(() => `lcms-collection-grouped__items--${itemLayout.value}`)

const { api } = useApi()
const loading = ref(false)
const groups = ref<Group[]>([])
const openGroups = ref(new Set<string>())
const activeTab = ref('')

function getTitle(entry: Entry): string {
  return String(entry.data?.[titleField.value] || '')
}

function getDescription(entry: Entry): string {
  return String(entry.data?.[descriptionField.value] || '')
}

function getPrice(entry: Entry): string {
  return String(entry.data?.[priceField.value] || '')
}

function getImage(entry: Entry): string {
  const img = entry.data?.[imageField.value]
  if (!img) return ''
  if (typeof img === 'string') return img
  if (typeof img === 'object' && img !== null && 'url' in img) {
    return String((img as { url: string }).url)
  }
  return ''
}

function toggleGroup(name: string) {
  if (openGroups.value.has(name)) {
    openGroups.value.delete(name)
  } else {
    openGroups.value.add(name)
  }
}

async function fetchEntries() {
  if (!collectionCode.value || !groupByField.value) {
    groups.value = []
    return
  }

  loading.value = true
  try {
    const response = await api.getCollectionEntries(collectionCode.value)
    const entries = (response.data || []) as Entry[]

    // Group entries by field value
    const groupMap = new Map<string, Entry[]>()
    const uncategorized: Entry[] = []

    for (const entry of entries) {
      const groupValue = entry.data?.[groupByField.value]
      if (groupValue) {
        const key = String(groupValue)
        if (!groupMap.has(key)) {
          groupMap.set(key, [])
        }
        const groupEntries = groupMap.get(key)!
        if (!postsCount.value || groupEntries.length < postsCount.value) {
          groupEntries.push(entry)
        }
      } else {
        uncategorized.push(entry)
      }
    }

    const result: Group[] = []
    for (const [name, groupEntries] of groupMap) {
      result.push({ name, entries: groupEntries })
    }

    if (showUncategorized.value && uncategorized.length > 0) {
      result.push({ name: 'Uncategorized', entries: uncategorized })
    }

    groups.value = result

    // Set initial active tab
    if (displayStyle.value === 'tabs' && result.length > 0 && !activeTab.value) {
      activeTab.value = result[0].name
    }

    // Open first accordion by default
    if (displayStyle.value === 'accordion' && result.length > 0) {
      openGroups.value.add(result[0].name)
    }
  } catch (error) {
    console.error('Failed to fetch entries:', error)
    groups.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchEntries()
})

watch([collectionCode, groupByField], () => {
  fetchEntries()
})
</script>

<style scoped>
.lcms-collection-grouped {
  width: 100%;
}

.lcms-collection-grouped__section {
  margin-bottom: 2rem;
}

.lcms-collection-grouped__group-title {
  margin: 0 0 1rem;
  font-size: 1.5rem;
  border-bottom: 2px solid #333;
  padding-bottom: 0.5rem;
}

.lcms-collection-grouped__items {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.lcms-collection-grouped__items--cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}

.lcms-collection-grouped__items--compact {
  gap: 0.5rem;
}

.lcms-collection-grouped__item {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: #f9f9f9;
  border-radius: 0.5rem;
}

.lcms-collection-grouped__items--cards .lcms-collection-grouped__item {
  flex-direction: column;
}

.lcms-collection-grouped__items--compact .lcms-collection-grouped__item {
  padding: 0.5rem;
  background: transparent;
  border-bottom: 1px solid #eee;
}

.lcms-collection-grouped__image {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 0.25rem;
}

.lcms-collection-grouped__items--cards .lcms-collection-grouped__image {
  width: 100%;
  height: 200px;
}

.lcms-collection-grouped__item-content {
  flex: 1;
}

.lcms-collection-grouped__item-title {
  margin: 0 0 0.5rem;
  font-size: 1.1rem;
}

.lcms-collection-grouped__item-description {
  margin: 0 0 0.5rem;
  color: #666;
  font-size: 0.9rem;
}

.lcms-collection-grouped__item-price {
  font-weight: bold;
  color: #28a745;
}

/* Accordion styles */
.lcms-collection-grouped__accordion {
  border: 1px solid #ddd;
  border-radius: 0.5rem;
  margin-bottom: 0.5rem;
  overflow: hidden;
}

.lcms-collection-grouped__accordion-header {
  width: 100%;
  padding: 1rem;
  background: #f5f5f5;
  border: none;
  text-align: left;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.lcms-collection-grouped__accordion-header:hover {
  background: #eee;
}

.lcms-collection-grouped__accordion-content {
  padding: 1rem;
}

/* Tabs styles */
.lcms-collection-grouped__tab-headers {
  display: flex;
  border-bottom: 2px solid #ddd;
  margin-bottom: 1rem;
}

.lcms-collection-grouped__tab-header {
  padding: 0.75rem 1.5rem;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
}

.lcms-collection-grouped__tab-header:hover {
  background: #f5f5f5;
}

.lcms-collection-grouped__tab-header.is-active {
  border-bottom-color: #007bff;
  color: #007bff;
}

.lcms-collection-grouped__loading,
.lcms-collection-grouped__empty {
  padding: 2rem;
  text-align: center;
  color: #999;
}
</style>
