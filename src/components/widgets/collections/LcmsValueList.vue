<template>
  <div class="lcms-value-list" :class="styleClass" :style="rootStyle">
    <template v-if="loading">
      <div class="lcms-value-list__loading">Loading...</div>
    </template>
    <template v-else-if="groupedValues">
      <div
        v-for="group in groupedValues"
        :key="group.key"
        class="lcms-value-list__group"
      >
        <h4 class="lcms-value-list__group-title">{{ group.label }}</h4>
        <div class="lcms-value-list__items" :style="columnsStyle">
          <component
            v-for="item in group.values"
            :key="item.value"
            :is="linkEnabled ? 'a' : 'span'"
            :href="linkEnabled ? getLink(item.value) : undefined"
            class="lcms-value-list__item"
            :style="itemStyle"
          >
            {{ item.label || item.value }}
            <span v-if="showCount && item.count" class="lcms-value-list__count">
              ({{ item.count }})
            </span>
          </component>
        </div>
      </div>
    </template>
    <template v-else-if="displayedValues.length > 0">
      <div class="lcms-value-list__items" :style="columnsStyle">
        <component
          v-for="item in displayedValues"
          :key="item.value"
          :is="linkEnabled ? 'a' : 'span'"
          :href="linkEnabled ? getLink(item.value) : undefined"
          class="lcms-value-list__item"
          :style="itemStyle"
        >
          {{ item.label || item.value }}
          <span v-if="showCount && item.count" class="lcms-value-list__count">
            ({{ item.count }})
          </span>
        </component>
        <component
          v-if="hasMore"
          :is="showMoreUrl ? 'a' : 'span'"
          :href="showMoreUrl || undefined"
          class="lcms-value-list__item lcms-value-list__item--more"
          :style="moreStyle"
        >
          {{ showMoreText || `+ ${values.length - visibleLimit}` }}
        </component>
      </div>
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
  label?: string
  count?: number
}

interface GroupedValues {
  key: string
  label: string
  values: ValueItem[]
}

const props = defineProps<{
  data: {
    widget_type: string
    config: {
      collection_code?: string
      value_field?: string
      group_field?: string
      display_style?: string
      columns?: number
      show_count?: boolean
      filter_field?: string
      filter_value?: string
      sort_field?: string
      sort_dir?: string
      visible_limit?: number
      show_more_text?: Record<string, string> | string
      show_more_url?: string
      tag_bg_color?: string
      tag_border_color?: string
      tag_text_color?: string
      more_bg_color?: string
      more_text_color?: string
      link_enabled?: boolean
      link_url_pattern?: string
    }
    settings?: Record<string, unknown>
  }
}>()

const config = computed(() => props.data.config || props.data || {})

const collectionCode = computed(() => config.value.collection_code || '')
const valueField = computed(() => config.value.value_field || '')
const groupField = computed(() => config.value.group_field || '')
const displayStyle = computed(() => config.value.display_style || 'list')
const columns = computed(() => config.value.columns || 1)
const showCount = computed(() => config.value.show_count ?? false)
const linkEnabled = computed(() => config.value.link_enabled ?? false)
const linkUrlPattern = computed(() => config.value.link_url_pattern || '')
const filterField = computed(() => config.value.filter_field || '')
const filterValue = computed(() => config.value.filter_value || '')
const sortFieldCfg = computed(() => config.value.sort_field || '')
const sortDir = computed(() => config.value.sort_dir || 'asc')
const visibleLimit = computed(() => config.value.visible_limit || 0)
const showMoreUrl = computed(() => config.value.show_more_url || '')

const showMoreText = computed(() => {
  const t = config.value.show_more_text
  if (!t) return ''
  if (typeof t === 'string') return t
  // Try current lang from html tag, fallback to first
  const lang = document.documentElement.lang || 'pl'
  return t[lang] || Object.values(t)[0] || ''
})

const styleClass = computed(() => `lcms-value-list--${displayStyle.value}`)

const rootStyle = computed(() => {
  const s: Record<string, string> = {}
  if (config.value.tag_text_color && displayStyle.value === 'inline') {
    s.color = config.value.tag_text_color
  }
  return s
})

const itemStyle = computed(() => {
  const s: Record<string, string> = {}
  if (config.value.tag_bg_color) s.background = config.value.tag_bg_color
  if (config.value.tag_border_color) s.borderColor = config.value.tag_border_color
  if (config.value.tag_text_color) s.color = config.value.tag_text_color
  return s
})

const moreStyle = computed(() => {
  const s: Record<string, string> = {}
  if (config.value.more_bg_color) s.background = config.value.more_bg_color
  if (config.value.more_text_color) s.color = config.value.more_text_color
  return s
})

const columnsStyle = computed(() => {
  if (columns.value <= 1) return {}
  return {
    display: 'grid',
    gridTemplateColumns: `repeat(${columns.value}, 1fr)`,
    gap: '8px 16px'
  }
})

const { api } = useApi()
const loading = ref(false)
const allEntries = ref<any[]>([])

function getLink(value: string): string {
  if (!linkUrlPattern.value) return '#'
  return linkUrlPattern.value.replace('{value}', encodeURIComponent(value))
}

// Match a filter value in an entry field
function matchesFilter(entry: any): boolean {
  if (!filterField.value || !filterValue.value) return true
  const fv = entry.data?.[valueField.value] !== undefined ? entry.data?.[filterField.value] : undefined
  // Actually look at the filter field, not the value field
  const fieldVal = entry.data?.[filterField.value]
  if (!fieldVal) return false

  if (Array.isArray(fieldVal)) {
    return fieldVal.some((item: any) => {
      if (item && typeof item === 'object' && item.code) return item.code === filterValue.value
      if (typeof item === 'string') return item === filterValue.value
      return false
    })
  }
  if (fieldVal && typeof fieldVal === 'object' && fieldVal.code) return fieldVal.code === filterValue.value
  if (typeof fieldVal === 'string') return fieldVal === filterValue.value
  return String(fieldVal) === filterValue.value
}

function sortItems(items: ValueItem[]): ValueItem[] {
  const dir = sortDir.value === 'desc' ? -1 : 1
  if (sortFieldCfg.value === 'count') {
    return items.sort((a, b) => ((a.count || 0) - (b.count || 0)) * dir)
  }
  if (sortFieldCfg.value === 'label') {
    return items.sort((a, b) => (a.label || a.value).localeCompare(b.label || b.value) * dir)
  }
  // Sort by collection field: build map from entries
  if (sortFieldCfg.value && sortFieldCfg.value.startsWith('field:')) {
    const fieldCode = sortFieldCfg.value.replace('field:', '')
    const sortKeyMap = new Map<string, string>()
    for (const entry of filteredEntries.value) {
      const sortVal = entry.data?.[fieldCode]
      const valField = entry.data?.[valueField.value]
      if (!valField) continue
      const vals = Array.isArray(valField) ? valField : [valField]
      for (const v of vals) {
        const code = typeof v === 'object' && v?.code ? v.code : String(v)
        if (!sortKeyMap.has(code)) {
          let key = ''
          if (sortVal && typeof sortVal === 'object' && sortVal.code) {
            key = sortVal.value || sortVal.code
          } else if (typeof sortVal === 'string') {
            key = sortVal
          } else if (sortVal != null) {
            key = String(sortVal)
          }
          sortKeyMap.set(code, key)
        }
      }
    }
    return items.sort((a, b) => {
      const ka = sortKeyMap.get(a.value) || ''
      const kb = sortKeyMap.get(b.value) || ''
      return ka.localeCompare(kb) * dir
    })
  }
  return items.sort((a, b) => (a.label || a.value).localeCompare(b.label || b.value))
}

function extractLabel(item: any): string {
  if (typeof item === 'string') return item
  if (item?.value_translation) {
    const lang = document.documentElement.lang || 'pl'
    if (item.value_translation[lang]) return item.value_translation[lang]
    const vals = Object.values(item.value_translation) as string[]
    if (vals.length > 0 && vals[0]) return vals[0]
  }
  return item?.value || item?.code || String(item)
}

const filteredEntries = computed(() => {
  if (!filterField.value || !filterValue.value) return allEntries.value
  return allEntries.value.filter(matchesFilter)
})

const values = computed<ValueItem[]>(() => {
  if (!valueField.value || filteredEntries.value.length === 0) return []

  const valueMap = new Map<string, ValueItem>()
  for (const entry of filteredEntries.value) {
    const fieldValue = entry.data?.[valueField.value]
    if (!fieldValue) continue

    const items = Array.isArray(fieldValue) ? fieldValue : [fieldValue]
    for (const item of items) {
      const code = typeof item === 'object' && item?.code ? item.code : String(item)
      const label = extractLabel(item)
      if (valueMap.has(code)) {
        valueMap.get(code)!.count = (valueMap.get(code)!.count || 0) + 1
      } else {
        valueMap.set(code, { value: code, label, count: 1 })
      }
    }
  }

  return sortItems(Array.from(valueMap.values()))
})

const displayedValues = computed(() => {
  if (!visibleLimit.value || visibleLimit.value <= 0) return values.value
  return values.value.slice(0, visibleLimit.value)
})

const hasMore = computed(() => {
  return visibleLimit.value > 0 && values.value.length > visibleLimit.value
})

// Grouped values
const groupedValues = computed<GroupedValues[] | null>(() => {
  if (!groupField.value || !valueField.value || filteredEntries.value.length === 0) return null

  const groups = new Map<string, { key: string; label: string; valuesMap: Map<string, ValueItem> }>()

  for (const entry of filteredEntries.value) {
    const fieldValue = entry.data?.[valueField.value]
    if (!fieldValue) continue

    const groupVal = entry.data?.[groupField.value]
    let groupKey = '__ungrouped__'
    let groupLabel = 'Other'

    if (groupVal) {
      if (typeof groupVal === 'object' && groupVal.code) {
        groupKey = groupVal.code
        groupLabel = extractLabel(groupVal)
      } else if (typeof groupVal === 'string') {
        groupKey = groupVal
        groupLabel = groupVal
      } else if (Array.isArray(groupVal) && groupVal.length > 0) {
        const first = groupVal[0]
        groupKey = typeof first === 'object' && first?.code ? first.code : String(first)
        groupLabel = extractLabel(first)
      }
    }

    if (!groups.has(groupKey)) {
      groups.set(groupKey, { key: groupKey, label: groupLabel, valuesMap: new Map() })
    }
    const group = groups.get(groupKey)!

    const items = Array.isArray(fieldValue) ? fieldValue : [fieldValue]
    for (const item of items) {
      const code = typeof item === 'object' && item?.code ? item.code : String(item)
      const label = extractLabel(item)
      if (group.valuesMap.has(code)) {
        group.valuesMap.get(code)!.count = (group.valuesMap.get(code)!.count || 0) + 1
      } else {
        group.valuesMap.set(code, { value: code, label, count: 1 })
      }
    }
  }

  return Array.from(groups.values())
    .map(g => ({
      key: g.key,
      label: g.label,
      values: sortItems(Array.from(g.valuesMap.values()))
    }))
    .sort((a, b) => {
      if (a.key === '__ungrouped__') return 1
      if (b.key === '__ungrouped__') return -1
      return a.label.localeCompare(b.label)
    })
})

async function fetchValues() {
  if (!collectionCode.value || !valueField.value) {
    allEntries.value = []
    return
  }

  loading.value = true
  try {
    const response = await api.getCollectionEntries(collectionCode.value)
    allEntries.value = response.data || []
  } catch (error) {
    console.error('Failed to fetch values:', error)
    allEntries.value = []
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
.lcms-value-list__items {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.lcms-value-list--list .lcms-value-list__items {
  flex-direction: column;
}

.lcms-value-list--inline .lcms-value-list__items {
  flex-direction: row;
}

.lcms-value-list--tags .lcms-value-list__item,
.lcms-value-list--buttons .lcms-value-list__item {
  background: #f0f0f0;
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.875rem;
  border: 1px solid transparent;
}

.lcms-value-list--buttons .lcms-value-list__item {
  border-radius: 0.25rem;
}

.lcms-value-list__item {
  text-decoration: none;
  color: inherit;
}

.lcms-value-list__item:hover {
  text-decoration: underline;
}

.lcms-value-list__item--more {
  font-weight: 600;
}

.lcms-value-list__count {
  opacity: 0.7;
  margin-left: 0.25rem;
}

.lcms-value-list__group {
  margin-bottom: 1rem;
}

.lcms-value-list__group:last-child {
  margin-bottom: 0;
}

.lcms-value-list__group-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  padding-bottom: 0.25rem;
  border-bottom: 1px solid #e5e5e5;
}

.lcms-value-list__loading,
.lcms-value-list__empty {
  color: #999;
  padding: 1rem;
}
</style>
