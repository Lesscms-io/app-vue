<script setup lang="ts">
/**
 * Feature List Widget
 *
 * Renders a list of features with included/excluded status.
 */

import { computed } from 'vue'
import { useLanguage } from '@/composables/useLanguage'
import type { FeatureListWidgetData } from '@/types/widgets'

defineOptions({
  inheritAttrs: false
})

interface Props {
  data: FeatureListWidgetData
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const { extractValue } = useLanguage(props.language)

const items = computed(() => {
  const raw = props.data.items
  if (!Array.isArray(raw)) return []
  return raw.map(item => ({
    text: extractValue(item.text),
    included: item.included !== undefined ? item.included : true
  }))
})

function resolveColor(val: string | null | undefined): string | null {
  if (!val) return null
  if (val.startsWith('var:')) {
    const parts = val.split(':')
    const code = parts[1]
    const opacity = parts.length >= 3 ? parseInt(parts[2]) : 100
    if (opacity < 100) {
      return `color-mix(in srgb, var(--lcms-color-${code}) ${opacity}%, transparent)`
    }
    return `var(--lcms-color-${code})`
  }
  return val
}

const iconIncluded = computed(() => props.data.icon_included || 'fa-solid fa-check')
const iconExcluded = computed(() => props.data.icon_excluded || 'fa-solid fa-xmark')
const colorIncluded = computed(() => resolveColor(props.data.color_included) || '#28a745')
const colorExcluded = computed(() => resolveColor(props.data.color_excluded) || '#dc3545')
const columns = computed(() => parseInt(String(props.data.columns)) || 1)
</script>

<template>
  <ul
    class="lcms-feature-list"
    :style="columns > 1 ? { columnCount: columns } : {}"
  >
    <li
      v-for="(item, index) in items"
      :key="index"
      class="lcms-feature-list__item"
      :class="{ 'lcms-feature-list__item--excluded': !item.included }"
    >
      <i
        :class="item.included ? iconIncluded : iconExcluded"
        class="lcms-feature-list__icon"
        :style="{ color: item.included ? colorIncluded : colorExcluded }"
      />
      <span class="lcms-feature-list__text">{{ item.text }}</span>
    </li>
  </ul>
</template>

<style scoped>
.lcms-feature-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.lcms-feature-list__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
  break-inside: avoid;
}

.lcms-feature-list__item--excluded {
  opacity: 0.6;
}

.lcms-feature-list__icon {
  flex-shrink: 0;
  width: 20px;
  text-align: center;
}

.lcms-feature-list__text {
  flex: 1;
}
</style>
