<template>
  <div class="lcms-value-list" :class="styleClass">
    <template v-if="loading">
      <div class="lcms-value-list__loading">Loading...</div>
    </template>
    <template v-else-if="values.length > 0">
      <component
        v-for="(item, index) in values"
        :key="index"
        :is="linkEnabled ? 'a' : 'span'"
        :href="linkEnabled ? getLink(item.value) : undefined"
        class="lcms-value-list__item"
      >
        {{ item.value }}
        <span v-if="showCount && item.count" class="lcms-value-list__count">
          ({{ item.count }})
        </span>
      </component>
    </template>
    <template v-else>
      <div class="lcms-value-list__empty">No values found</div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import { useApi } from '../../../composables/useApi'

interface ValueItem {
  value: string
  count?: number
}

const props = defineProps<{
  data: {
    widget_type: string
    config: {
      collection_code?: string
      value_field?: string
      display_style?: string
      show_count?: boolean
      link_enabled?: boolean
      link_url_pattern?: string
    }
    settings?: Record<string, unknown>
  }
}>()

const config = computed(() => props.data.config || {})

const collectionCode = computed(() => config.value.collection_code || '')
const valueField = computed(() => config.value.value_field || '')
const displayStyle = computed(() => config.value.display_style || 'list')
const showCount = computed(() => config.value.show_count ?? false)
const linkEnabled = computed(() => config.value.link_enabled ?? false)
const linkUrlPattern = computed(() => config.value.link_url_pattern || '')

const styleClass = computed(() => `lcms-value-list--${displayStyle.value}`)

const { api } = useApi()
const loading = ref(false)
const values = ref<ValueItem[]>([])

function getLink(value: string): string {
  if (!linkUrlPattern.value) return '#'
  return linkUrlPattern.value.replace('{value}', encodeURIComponent(value))
}

async function fetchValues() {
  if (!collectionCode.value || !valueField.value) {
    values.value = []
    return
  }

  loading.value = true
  try {
    const response = await api.getCollectionEntries(collectionCode.value)
    const entries = response.data || []

    // Extract unique values from entries
    const valueMap = new Map<string, number>()
    for (const entry of entries) {
      const fieldValue = entry.data?.[valueField.value]
      if (fieldValue) {
        const strValue = String(fieldValue)
        valueMap.set(strValue, (valueMap.get(strValue) || 0) + 1)
      }
    }

    values.value = Array.from(valueMap.entries()).map(([value, count]) => ({
      value,
      count
    }))
  } catch (error) {
    console.error('Failed to fetch values:', error)
    values.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchValues()
})

watch([collectionCode, valueField], () => {
  fetchValues()
})
</script>

<style scoped>
.lcms-value-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.lcms-value-list--list {
  flex-direction: column;
}

.lcms-value-list--inline {
  flex-direction: row;
}

.lcms-value-list--tags .lcms-value-list__item,
.lcms-value-list--buttons .lcms-value-list__item {
  background: #f0f0f0;
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.875rem;
}

.lcms-value-list--buttons .lcms-value-list__item {
  border-radius: 0.25rem;
  background: #007bff;
  color: white;
}

.lcms-value-list__item {
  text-decoration: none;
  color: inherit;
}

.lcms-value-list__item:hover {
  text-decoration: underline;
}

.lcms-value-list__count {
  opacity: 0.7;
  margin-left: 0.25rem;
}

.lcms-value-list__loading,
.lcms-value-list__empty {
  color: #999;
  padding: 1rem;
}
</style>
