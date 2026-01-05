<script setup lang="ts">
/**
 * Collection Field Widget
 *
 * Renders a single field from a collection entry.
 * Used within collection templates to display entry data.
 */

import { computed, inject } from 'vue'
import { useLanguage } from '@/composables/useLanguage'
import type { CollectionFieldConfig, CollectionEntry } from '@/api/types'

defineOptions({
  inheritAttrs: false
})

interface Props {
  data: {
    config: CollectionFieldConfig
  }
  settings?: Record<string, any>
  language?: string
}

const props = defineProps<Props>()

const { extractValue, language: currentLanguage } = useLanguage(props.language)

// Get entry from context (injected by parent template renderer)
const entry = inject<CollectionEntry | null>('lcms-collection-entry', null)

const config = computed(() => props.data.config || {})
const fieldCode = computed(() => config.value.field_code || '')
const fieldType = computed(() => config.value.field_type || 'text')
const displayAs = computed(() => config.value.display_as || 'p')

// Label settings
const labelPosition = computed(() => config.value.label_position || 'hidden')
const label = computed(() => {
  if (!config.value.label) return ''
  return extractValue(config.value.label)
})

// Value styling
const valueColor = computed(() => config.value.value_color || null)
const valueBackground = computed(() => config.value.value_background || null)
const valuePadding = computed(() => config.value.value_padding || 0)

// Icon settings
const showIcon = computed(() => config.value.show_icon || false)
const icon = computed(() => config.value.icon || '')
const iconPosition = computed(() => config.value.icon_position || 'left')
const iconSize = computed(() => config.value.icon_size || '24')
const iconColor = computed(() => config.value.icon_color || '#50a5f1')

// Get field value from entry
const fieldValue = computed(() => {
  if (!entry || !entry.content || !fieldCode.value) return null

  const value = entry.content[fieldCode.value]
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    // Multilingual field
    return value[currentLanguage.value] || value.pl || Object.values(value)[0]
  }
  return value
})

// Format value based on field type
const formattedValue = computed(() => {
  const val = fieldValue.value
  if (val === null || val === undefined) return ''

  switch (fieldType.value) {
    case 'date':
    case 'datetime':
      return formatDate(val)
    case 'image':
      return typeof val === 'object' && val.url ? val.url : val
    case 'boolean':
      return val ? 'Yes' : 'No'
    default:
      return String(val)
  }
})

// Check if value is HTML
const isHtml = computed(() => {
  return fieldType.value === 'text-rich-html' ||
         fieldType.value === 'richtext' ||
         (typeof formattedValue.value === 'string' && formattedValue.value.includes('<'))
})

// Value styles
const valueStyle = computed(() => {
  const style: Record<string, string> = {}
  if (valueColor.value) style.color = valueColor.value
  if (valueBackground.value) style.backgroundColor = valueBackground.value
  if (valuePadding.value) style.padding = `${valuePadding.value}px`
  return style
})

// Icon styles
const iconStyle = computed(() => ({
  fontSize: `${iconSize.value}px`,
  color: iconColor.value,
}))

// Format date helper
function formatDate(value: string | Date): string {
  const date = new Date(value)
  const format = config.value.date_format || 'full'
  const showTime = config.value.show_time ?? false

  const options: Intl.DateTimeFormatOptions = {}

  switch (format) {
    case 'short':
      options.dateStyle = 'short'
      break
    case 'medium':
      options.dateStyle = 'medium'
      break
    case 'long':
      options.dateStyle = 'long'
      break
    case 'full':
    default:
      options.dateStyle = 'full'
  }

  if (showTime) {
    options.timeStyle = 'short'
  }

  return date.toLocaleDateString(currentLanguage.value, options)
}
</script>

<template>
  <div class="lcms-collection-field" :class="`lcms-collection-field--${fieldType}`">
    <!-- Label -->
    <span
      v-if="labelPosition !== 'hidden' && label"
      class="lcms-collection-field__label"
      :class="`lcms-collection-field__label--${labelPosition}`"
      :style="{
        color: config.label_color || undefined,
        backgroundColor: config.label_background || undefined,
        padding: config.label_padding ? `${config.label_padding}px` : undefined,
        fontSize: config.label_font_size || undefined,
        fontWeight: config.label_font_weight || undefined,
      }"
    >
      {{ label }}
    </span>

    <!-- Value with optional icon -->
    <div
      class="lcms-collection-field__value-wrapper"
      :class="{ 'lcms-collection-field__value-wrapper--with-icon': showIcon }"
    >
      <!-- Icon (left) -->
      <i
        v-if="showIcon && icon && iconPosition === 'left'"
        :class="icon"
        class="lcms-collection-field__icon"
        :style="iconStyle"
      />

      <!-- Value -->
      <component
        :is="displayAs"
        class="lcms-collection-field__value"
        :style="valueStyle"
      >
        <!-- Image field -->
        <template v-if="fieldType === 'image' && formattedValue">
          <img :src="formattedValue" :alt="label || fieldCode" class="lcms-collection-field__image" />
        </template>

        <!-- HTML content -->
        <template v-else-if="isHtml">
          <span v-html="formattedValue" />
        </template>

        <!-- Plain text -->
        <template v-else>
          {{ formattedValue }}
        </template>
      </component>

      <!-- Icon (right) -->
      <i
        v-if="showIcon && icon && iconPosition === 'right'"
        :class="icon"
        class="lcms-collection-field__icon"
        :style="iconStyle"
      />
    </div>
  </div>
</template>

<style>
.lcms-collection-field {
  display: block;
}

.lcms-collection-field__label {
  display: block;
  margin-bottom: 4px;
  font-weight: 600;
}

.lcms-collection-field__label--inline {
  display: inline;
  margin-right: 8px;
}

.lcms-collection-field__value-wrapper {
  display: block;
}

.lcms-collection-field__value-wrapper--with-icon {
  display: flex;
  align-items: center;
  gap: 12px;
}

.lcms-collection-field__value {
  margin: 0;
}

.lcms-collection-field__icon {
  flex-shrink: 0;
}

.lcms-collection-field__image {
  max-width: 100%;
  height: auto;
}
</style>
