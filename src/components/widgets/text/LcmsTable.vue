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

const headers = computed(() => {
  const raw = props.data.headers
  if (!Array.isArray(raw)) return []
  return raw.map(h => extractValue(h.text))
})

const rows = computed(() => {
  const raw = props.data.rows
  if (!Array.isArray(raw)) return []
  return raw.map(row => {
    if (Array.isArray(row)) {
      return row.map(cell => {
        if (typeof cell === 'object' && cell !== null) return extractValue(cell)
        return cell
      })
    }
    return row
  })
})

const headerBg = computed(() => props.data.header_bg || null)
const headerText = computed(() => props.data.header_text || 'light')
const striped = computed(() => props.data.striped || false)
const bordered = computed(() => props.data.bordered || false)
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
