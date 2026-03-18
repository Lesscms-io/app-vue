<script setup lang="ts">
/**
 * Table Widget
 *
 * Renders a data table with headers and rows.
 */

import { computed } from 'vue'
import { useLanguage } from '@/composables/useLanguage'
import type { TableWidgetData } from '@/types/widgets'

defineOptions({
  inheritAttrs: false
})

interface Props {
  data: TableWidgetData
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const { extractValue } = useLanguage(props.language)

const config = computed(() => props.data.widget || props.data || {})

const headers = computed(() => {
  const raw = config.value.headers
  if (!Array.isArray(raw)) return []
  return raw.map((h: any) => extractValue(h.content))
})

const rows = computed(() => {
  const raw = config.value.rows
  if (!Array.isArray(raw)) return []
  return raw.map((row: any) => {
    if (Array.isArray(row)) {
      return row.map((cell: any) => {
        if (typeof cell === 'object' && cell !== null) return extractValue(cell)
        return cell
      })
    }
    return row
  })
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

const headerBg = computed(() => resolveColor(config.value.header_bg))
const headerText = computed(() => config.value.header_text || 'light')
const striped = computed(() => config.value.striped || false)
const bordered = computed(() => config.value.bordered || false)
</script>

<template>
  <div class="lcms-table-wrapper">
    <table
      class="lcms-table"
      :class="{
        'lcms-table--striped': striped,
        'lcms-table--bordered': bordered
      }"
    >
      <thead
        v-if="headers.length > 0"
        :style="{
          backgroundColor: headerBg || undefined,
          color: headerText === 'light' ? '#fff' : '#212529'
        }"
      >
        <tr>
          <th v-for="(header, i) in headers" :key="i">{{ header }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, rIndex) in rows" :key="rIndex">
          <td v-for="(cell, cIndex) in row" :key="cIndex">{{ cell }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.lcms-table-wrapper {
  overflow-x: auto;
}

.lcms-table {
  width: 100%;
  border-collapse: collapse;
}

.lcms-table th,
.lcms-table td {
  padding: 10px 14px;
  text-align: left;
}

.lcms-table thead th {
  font-weight: 600;
}

.lcms-table--bordered th,
.lcms-table--bordered td {
  border: 1px solid #dee2e6;
}

.lcms-table:not(.lcms-table--bordered) tbody td {
  border-bottom: 1px solid #dee2e6;
}

.lcms-table--striped tbody tr:nth-child(even) {
  background-color: #f8f9fa;
}
</style>
