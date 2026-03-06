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
            :href="linkEnabled ? getLink(item) : undefined"
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
    <!-- Cards display style -->
    <template v-else-if="displayStyle === 'cards' && displayedValues.length > 0">
      <div class="lcms-value-list__cards" :style="columnsStyle">
        <component
          v-for="item in displayedValues"
          :key="item.value"
          :is="linkEnabled ? 'a' : 'div'"
          :href="linkEnabled ? getLink(item) : undefined"
          class="lcms-value-list__card"
          :style="itemStyle"
        >
          <div
            v-if="item.icon"
            class="lcms-value-list__card-icon"
            :style="cardIconStyle"
          >
            <i :class="item.icon" />
          </div>
          <div class="lcms-value-list__card-content">
            <div class="lcms-value-list__card-title">{{ item.label || item.value }}</div>
            <div
              v-if="item.subtitle"
              class="lcms-value-list__card-subtitle"
            >{{ item.subtitle }}</div>
          </div>
          <div v-if="linkEnabled" class="lcms-value-list__card-arrow">
            <i class="fa-solid fa-arrow-right" />
          </div>
        </component>
        <component
          v-if="hasMore"
          :is="showMoreUrl ? 'a' : 'span'"
          :href="showMoreUrl || undefined"
          class="lcms-value-list__card lcms-value-list__card--more"
          :style="moreStyle"
        >
          {{ showMoreText || `+ ${values.length - visibleLimit}` }}
        </component>
      </div>
    </template>

    <template v-else-if="displayedValues.length > 0">
      <div class="lcms-value-list__items" :style="columnsStyle">
        <component
          v-for="item in displayedValues"
          :key="item.value"
          :is="linkEnabled ? 'a' : 'span'"
          :href="linkEnabled ? getLink(item) : undefined"
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
  subtitle?: string
  icon?: string
  entryUrl?: string
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
      subtitle_field?: string
      icon_field?: string
      display_style?: string
      columns?: number
      show_count?: boolean
      filter_field?: string
      filter_value?: string
      filter_value_source?: string
      filter_url_segment?: number
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
      link_to_entry?: boolean
      link_url_pattern?: string
      card_icon?: string
      card_icon_bg_color?: string
      card_icon_color?: string
    }
    settings?: Record<string, unknown>
  }
}>()

const config = computed(() => props.data.widget || props.data || {})

const collectionCode = computed(() => config.value.collection_code || '')
const valueField = computed(() => config.value.value_field || '')
const groupField = computed(() => config.value.group_field || '')
const subtitleField = computed(() => config.value.subtitle_field || '')
const iconField = computed(() => config.value.icon_field || '')
const cardIcon = computed(() => config.value.card_icon || '')
const displayStyle = computed(() => config.value.display_style || 'list')
const columns = computed(() => config.value.columns || 1)
const showCount = computed(() => config.value.show_count ?? false)
const linkEnabled = computed(() => config.value.link_enabled ?? false)
const linkToEntry = computed(() => config.value.link_to_entry ?? false)
const linkUrlPattern = computed(() => config.value.link_url_pattern || '')
const filterField = computed(() => config.value.filter_field || '')
const filterValueSource = computed(() => config.value.filter_value_source || 'static')
const filterUrlSegment = computed(() => Number(config.value.filter_url_segment) || 1)
const filterValue = computed(() => {
  if (filterValueSource.value === 'url') {
    const path = window.location.pathname
    const segments = path.split('/').filter((s: string) => s)
    return segments[filterUrlSegment.value - 1] || ''
  }
  return config.value.filter_value || ''
})
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
  if (config.value.tag_padding) s.padding = config.value.tag_padding
  if (config.value.tag_font_size) s.fontSize = config.value.tag_font_size
  if (config.value.tag_border_radius) s.borderRadius = config.value.tag_border_radius
  return s
})

const moreStyle = computed(() => {
  const s: Record<string, string> = {}
  if (config.value.more_bg_color) s.background = config.value.more_bg_color
  if (config.value.more_text_color) s.color = config.value.more_text_color
  return s
})

const cardIconStyle = computed(() => {
  const s: Record<string, string> = {}
  if (config.value.card_icon_bg_color) s.background = config.value.card_icon_bg_color
  if (config.value.card_icon_color) s.color = config.value.card_icon_color
  return s
})

const itemsGap = computed(() => config.value.items_gap || '')

const columnsStyle = computed(() => {
  const gap = itemsGap.value || '8px'
  if (columns.value <= 1) {
    if (itemsGap.value) return { gap: itemsGap.value }
    return {}
  }
  return {
    display: 'grid',
    gridTemplateColumns: `repeat(${columns.value}, 1fr)`,
    gap: `${gap} 16px`
  }
})

const { api } = useApi()
const loading = ref(false)
const allEntries = ref<any[]>([])

function getLink(item: ValueItem): string {
  if (linkToEntry.value && item.entryUrl) return item.entryUrl
  if (!linkUrlPattern.value) return '#'
  return linkUrlPattern.value.replace('{value}', encodeURIComponent(item.value))
}

function resolveMultilingual(val: any): string | null {
  if (typeof val === 'string') return val
  if (val && typeof val === 'object' && !Array.isArray(val) && !val.code) {
    const lang = document.documentElement.lang || 'pl'
    return val[lang] || val.pl || (Object.values(val).find(v => v != null && v !== '') as string) || null
  }
  return null
}

function matchFieldValue(fieldVal: any, target: string): boolean {
  if (!fieldVal) return false

  // Array (multiselect)
  if (Array.isArray(fieldVal)) {
    return fieldVal.some((item: any) => {
      if (item && typeof item === 'object' && (item.code || item.entry_id)) return (item.code || item.entry_id) === target
      if (typeof item === 'string') return item === target
      return false
    })
  }
  // Enriched select: { code, value } or relation: { entry_id, collection_code, value }
  if (fieldVal && typeof fieldVal === 'object' && (fieldVal.code || fieldVal.entry_id)) return (fieldVal.code || fieldVal.entry_id) === target
  // Simple string
  if (typeof fieldVal === 'string') return fieldVal === target
  // Multilingual object: { pl: "...", en: "..." } — resolve to current language
  const resolved = resolveMultilingual(fieldVal)
  if (resolved) return resolved.toLowerCase() === target.toLowerCase()
  return String(fieldVal) === target
}

// Match a filter value in an entry field
function matchesFilter(entry: any): boolean {
  if (!filterField.value || !filterValue.value) return true
  // Special: filter by entry_id (metadata)
  if (filterField.value === '_entry_id') {
    const entryId = entry.metadata?.entry_id || entry.entry_id || ''
    return entryId === filterValue.value
  }
  const fieldVal = entry.data?.[filterField.value]
  return matchFieldValue(fieldVal, filterValue.value)
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
        const code = typeof v === 'object' && v?.code ? v.code : extractLabel(v)
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
  // Enriched select option: { code, value, value_translation }
  if (item?.value_translation) {
    const lang = document.documentElement.lang || 'pl'
    if (typeof item.value_translation === 'string') return item.value_translation
    if (item.value_translation[lang]) return item.value_translation[lang]
    const vals = Object.values(item.value_translation) as string[]
    if (vals.length > 0 && vals[0]) return vals[0]
  }
  if (item?.value || item?.code) {
    return item.value || item.code
  }
  // Multilingual object: { pl: "...", en: "..." }
  if (typeof item === 'object' && item !== null) {
    const lang = document.documentElement.lang || 'pl'
    if (item[lang]) return item[lang]
    if (item.pl) return item.pl
    const vals = Object.values(item).filter(v => v != null && v !== '') as string[]
    if (vals.length > 0 && typeof vals[0] === 'string') return vals[0]
  }
  return String(item)
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
      const label = extractLabel(item)
      const code = typeof item === 'object' && item?.code ? item.code : label
      if (valueMap.has(code)) {
        valueMap.get(code)!.count = (valueMap.get(code)!.count || 0) + 1
      } else {
        const vi: ValueItem = { value: code, label, count: 1 }
        // Store entry URL for link_to_entry mode
        if (linkToEntry.value && entry.metadata?.url) {
          vi.entryUrl = entry.metadata.url
        }
        // Extract subtitle and icon from entry for cards style
        if (subtitleField.value) {
          const sv = entry.data?.[subtitleField.value]
          if (sv) vi.subtitle = extractLabel(sv)
        }
        if (iconField.value) {
          const iv = entry.data?.[iconField.value]
          if (iv) vi.icon = typeof iv === 'string' ? iv : extractLabel(iv)
        } else if (cardIcon.value) {
          vi.icon = cardIcon.value
        }
        valueMap.set(code, vi)
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
      const label = extractLabel(item)
      const code = typeof item === 'object' && item?.code ? item.code : label
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

  // Use enriched entries from API if available
  if (Array.isArray(config.value.entries)) {
    // Normalize enriched entries (content → data key for compatibility)
    allEntries.value = config.value.entries.map((e: any) => {
      if (e.data) return e
      return { ...e, data: e.content || {} }
    })
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
  padding: 0.35rem 0.85rem;
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

/* Cards style */
.lcms-value-list__cards {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.lcms-value-list__card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  background: #fff;
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  text-decoration: none;
  color: inherit;
  transition: box-shadow 0.2s, transform 0.2s;
  min-width: 0;
}

a.lcms-value-list__card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  transform: translateY(-1px);
  text-decoration: none;
}

.lcms-value-list__card-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  background: #2a3547;
  color: #fff;
  font-size: 1.25rem;
  flex-shrink: 0;
}

.lcms-value-list__card-content {
  flex: 1;
  min-width: 0;
}

.lcms-value-list__card-title {
  font-weight: 600;
  font-size: 1rem;
  line-height: 1.3;
}

.lcms-value-list__card-subtitle {
  font-size: 0.85rem;
  color: #6c757d;
  margin-top: 0.15rem;
}

.lcms-value-list__card-arrow {
  flex-shrink: 0;
  color: #adb5bd;
  font-size: 0.875rem;
  transition: transform 0.2s;
}

a.lcms-value-list__card:hover .lcms-value-list__card-arrow {
  transform: translateX(3px);
  color: #495057;
}
</style>
