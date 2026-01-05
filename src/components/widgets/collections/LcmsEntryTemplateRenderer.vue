<script setup lang="ts">
/**
 * Entry Template Renderer
 *
 * Renders a collection entry using a custom template.
 * Provides the entry context to child widgets via inject/provide.
 */

import { provide, computed } from 'vue'
import { getWidgetComponent } from '@/components/widgets'
import type { CollectionEntry, TemplateSection, TemplateColumn, TemplateWidget, SectionSettings, ColumnSettings, WidgetSettings } from '@/api/types'

defineOptions({
  inheritAttrs: false
})

interface Props {
  entry: CollectionEntry
  sections: TemplateSection[]
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

// Provide entry to child widgets (especially collection-field)
provide('lcms-collection-entry', props.entry)

// Helper: hex to rgba
function hexToRgba(hex: string, alpha: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return hex
  const r = parseInt(result[1], 16)
  const g = parseInt(result[2], 16)
  const b = parseInt(result[3], 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// Build section styles
function getSectionStyle(settings: SectionSettings = {}) {
  const style: Record<string, string> = {}

  if (settings.backgroundColor) {
    const opacity = settings.backgroundOpacity ?? 100
    style.backgroundColor = opacity < 100
      ? hexToRgba(settings.backgroundColor, opacity / 100)
      : settings.backgroundColor
  }

  if (settings.paddingTop) style.paddingTop = `${settings.paddingTop}px`
  if (settings.paddingRight) style.paddingRight = `${settings.paddingRight}px`
  if (settings.paddingBottom) style.paddingBottom = `${settings.paddingBottom}px`
  if (settings.paddingLeft) style.paddingLeft = `${settings.paddingLeft}px`

  if (settings.marginTop) style.marginTop = `${settings.marginTop}px`
  if (settings.marginRight) style.marginRight = `${settings.marginRight}px`
  if (settings.marginBottom) style.marginBottom = `${settings.marginBottom}px`
  if (settings.marginLeft) style.marginLeft = `${settings.marginLeft}px`

  if (settings.borderRadius) style.borderRadius = `${settings.borderRadius}px`

  return style
}

// Build column styles
function getColumnStyle(column: TemplateColumn) {
  const settings = column.settings || {}
  const style: Record<string, string> = {}

  if (settings.backgroundColor) {
    const opacity = settings.backgroundOpacity ?? 100
    style.backgroundColor = opacity < 100
      ? hexToRgba(settings.backgroundColor, opacity / 100)
      : settings.backgroundColor
  }

  if (settings.paddingTop) style.paddingTop = `${settings.paddingTop}px`
  if (settings.paddingRight) style.paddingRight = `${settings.paddingRight}px`
  if (settings.paddingBottom) style.paddingBottom = `${settings.paddingBottom}px`
  if (settings.paddingLeft) style.paddingLeft = `${settings.paddingLeft}px`

  return style
}

// Build widget styles
function getWidgetStyle(settings: WidgetSettings = {}) {
  const style: Record<string, string> = {}

  if (settings.backgroundColor) {
    const opacity = settings.backgroundOpacity ?? 100
    style.backgroundColor = opacity < 100
      ? hexToRgba(settings.backgroundColor, opacity / 100)
      : settings.backgroundColor
  }

  if (settings.height) style.height = `${settings.height}px`
  if (settings.minHeight) style.minHeight = `${settings.minHeight}px`

  if (settings.paddingTop) style.paddingTop = `${settings.paddingTop}px`
  if (settings.paddingRight) style.paddingRight = `${settings.paddingRight}px`
  if (settings.paddingBottom) style.paddingBottom = `${settings.paddingBottom}px`
  if (settings.paddingLeft) style.paddingLeft = `${settings.paddingLeft}px`

  return style
}

// Get grid template columns
function getGridStyle(columns: TemplateColumn[]) {
  const templateColumns = columns.map(col => {
    const span = col.span || 12
    return `${(span / 12) * 100}%`
  }).join(' ')

  return { gridTemplateColumns: templateColumns }
}

// Get widget component
function getComponent(widgetType: string) {
  return getWidgetComponent(widgetType)
}

// Build widget data
function getWidgetData(widget: TemplateWidget) {
  return {
    config: widget.config
  }
}
</script>

<template>
  <div class="lcms-entry-template">
    <div
      v-for="section in sections"
      :key="section.uuid"
      class="lcms-entry-template__section"
      :style="getSectionStyle(section.settings)"
    >
      <div
        class="lcms-entry-template__grid"
        :style="getGridStyle(section.columns)"
      >
        <div
          v-for="(column, colIndex) in section.columns"
          :key="column.uuid || colIndex"
          class="lcms-entry-template__column"
          :style="getColumnStyle(column)"
        >
          <div
            v-for="widget in column.content"
            :key="widget.uuid"
            class="lcms-entry-template__widget"
            :style="getWidgetStyle(widget.settings)"
          >
            <component
              :is="getComponent(widget.widget_type)"
              v-if="getComponent(widget.widget_type)"
              :data="getWidgetData(widget)"
              :settings="widget.settings"
              :language="language"
            />
            <div v-else class="lcms-entry-template__unsupported">
              Unsupported widget: {{ widget.widget_type }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.lcms-entry-template {
  display: block;
}

.lcms-entry-template__section {
  display: block;
}

.lcms-entry-template__grid {
  display: grid;
  gap: 16px;
}

.lcms-entry-template__column {
  display: flex;
  flex-direction: column;
}

.lcms-entry-template__widget {
  display: block;
}

.lcms-entry-template__unsupported {
  padding: 8px;
  background: #fef3c7;
  border: 1px solid #fbbf24;
  border-radius: 4px;
  font-size: 12px;
  color: #92400e;
}
</style>
