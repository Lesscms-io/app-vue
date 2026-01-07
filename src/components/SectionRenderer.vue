<script setup lang="ts">
/**
 * Section Renderer
 *
 * Renders a section with its columns and widgets.
 * Applies all settings: background, padding, margin, border, etc.
 * Supports responsive settings for tablet/mobile breakpoints.
 */

import { computed } from 'vue'
import WidgetRenderer from './WidgetRenderer.vue'
import { useResponsiveSettings } from '@/composables/useResponsiveSettings'
import type { PageSection, PageColumn, WidgetContent, SectionSettings, ColumnSettings } from '@/api/types'

interface Props {
  section: PageSection
  language?: string
}

const props = defineProps<Props>()

const { getMergedSettings, isHidden, shouldStack, currentBreakpoint } = useResponsiveSettings()

const sectionId = computed(() => props.section.uuid || props.section.id)
const settings = computed(() => getMergedSettings(props.section.settings as SectionSettings))
const columns = computed(() => props.section.columns || [])

// Grid type for column layout
const gridType = computed(() => {
  const count = props.section.columns_count || columns.value.length || 1
  return count === 1 ? '1' : `${count}-columns`
})

// Calculate section styles from settings
const sectionStyle = computed(() => {
  const s = settings.value as SectionSettings
  const style: Record<string, string> = {}

  // Background color with opacity
  if (s.backgroundColor) {
    const opacity = s.backgroundOpacity ?? 100
    if (opacity < 100) {
      style.backgroundColor = hexToRgba(s.backgroundColor, opacity / 100)
    } else {
      style.backgroundColor = s.backgroundColor
    }
  }

  // Background image
  if (s.backgroundImage) {
    // Encode URL to handle spaces and special characters
    const encodedUrl = encodeURI(s.backgroundImage)
    style.backgroundImage = `url("${encodedUrl}")`
    style.backgroundSize = s.backgroundSize || 'cover'
    style.backgroundPosition = s.backgroundPosition || 'center center'
    style.backgroundRepeat = 'no-repeat'
  }

  // Gradient (API returns { gradient: { type, colorStart, colorEnd, angle } })
  if (s.gradient && s.gradient.colorStart && s.gradient.colorEnd) {
    const type = s.gradient.type || 'linear'
    const angle = s.gradient.angle ?? 180
    if (type === 'linear') {
      style.background = `linear-gradient(${angle}deg, ${s.gradient.colorStart}, ${s.gradient.colorEnd})`
    } else {
      style.background = `radial-gradient(circle, ${s.gradient.colorStart}, ${s.gradient.colorEnd})`
    }
  }
  // Also support legacy format (useGradient)
  else if (s.useGradient && s.gradientColorStart && s.gradientColorEnd) {
    const type = s.gradientType || 'linear'
    const angle = s.gradientAngle ?? 180
    if (type === 'linear') {
      style.background = `linear-gradient(${angle}deg, ${s.gradientColorStart}, ${s.gradientColorEnd})`
    } else {
      style.background = `radial-gradient(circle, ${s.gradientColorStart}, ${s.gradientColorEnd})`
    }
  }

  // Padding
  if (s.paddingTop) style.paddingTop = `${s.paddingTop}px`
  if (s.paddingRight) style.paddingRight = `${s.paddingRight}px`
  if (s.paddingBottom) style.paddingBottom = `${s.paddingBottom}px`
  if (s.paddingLeft) style.paddingLeft = `${s.paddingLeft}px`

  // Margin
  if (s.marginTop) style.marginTop = `${s.marginTop}px`
  if (s.marginRight) style.marginRight = `${s.marginRight}px`
  if (s.marginBottom) style.marginBottom = `${s.marginBottom}px`
  if (s.marginLeft) style.marginLeft = `${s.marginLeft}px`

  // Border
  if (s.borderRadius) style.borderRadius = `${s.borderRadius}px`
  if (s.borderWidth) {
    style.borderWidth = `${s.borderWidth}px`
    style.borderStyle = s.borderStyle || 'solid'
    style.borderColor = s.borderColor || '#000000'
  }

  // Shadow
  if (s.boxShadow) style.boxShadow = s.boxShadow

  // Height
  if (s.fullHeight || s.heightMode === 'full') {
    style.minHeight = '100vh'
  } else if (s.sectionHeight) {
    style.minHeight = `${s.sectionHeight}px`
  } else if (s.minHeight) {
    style.minHeight = `${s.minHeight}px`
  }

  return style
})

// Inner container styles for content width
const innerStyle = computed(() => {
  const s = settings.value as SectionSettings
  const style: Record<string, string> = {}

  const width = s.contentWidth
  if (width && width !== '100%') {
    if (width === 'custom' && s.customWidth) {
      style.maxWidth = `${s.customWidth}px`
    } else if (width.endsWith('px')) {
      style.maxWidth = width
    }
    style.marginLeft = 'auto'
    style.marginRight = 'auto'
    style.width = '100%'
  }

  // Column gap
  if (s.columnGap) {
    style.gap = `${s.columnGap}px`
  }

  return style
})

// Should columns stack on current breakpoint
const isStacked = computed(() => shouldStack(settings.value as SectionSettings))

// Calculate grid template columns based on column widths
const gridStyle = computed(() => {
  const cols = columns.value
  if (!cols.length) return { gridTemplateColumns: '1fr' }

  // If stacked, use single column
  if (isStacked.value) {
    return {
      gridTemplateColumns: '1fr',
      ...innerStyle.value
    }
  }

  // Use actual column widths if available
  const templateColumns = cols.map(col => {
    const width = col.width
    if (width) {
      return `${width}%`
    }
    return '1fr'
  }).join(' ')

  return {
    gridTemplateColumns: templateColumns,
    ...innerStyle.value
  }
})

// Check if column is hidden for current breakpoint
function isColumnHidden(column: PageColumn): boolean {
  return isHidden(column.settings as ColumnSettings)
}

// Column styles (with responsive merge)
function getColumnStyle(column: PageColumn) {
  const s = getMergedSettings(column.settings as ColumnSettings)
  const style: Record<string, string> = {}

  // Background
  if (s.backgroundColor) {
    const opacity = s.backgroundOpacity ?? 100
    if (opacity < 100) {
      style.backgroundColor = hexToRgba(s.backgroundColor, opacity / 100)
    } else {
      style.backgroundColor = s.backgroundColor
    }
  }

  if (s.backgroundImage) {
    // Encode URL to handle spaces and special characters
    const encodedUrl = encodeURI(s.backgroundImage)
    style.backgroundImage = `url("${encodedUrl}")`
    style.backgroundSize = s.backgroundSize || 'cover'
    style.backgroundPosition = s.backgroundPosition || 'center center'
    style.backgroundRepeat = 'no-repeat'
  }

  // Gradient (API returns { gradient: { type, colorStart, colorEnd, angle } })
  if (s.gradient && s.gradient.colorStart && s.gradient.colorEnd) {
    const type = s.gradient.type || 'linear'
    const angle = s.gradient.angle ?? 180
    if (type === 'linear') {
      style.background = `linear-gradient(${angle}deg, ${s.gradient.colorStart}, ${s.gradient.colorEnd})`
    } else {
      style.background = `radial-gradient(circle, ${s.gradient.colorStart}, ${s.gradient.colorEnd})`
    }
  }
  // Also support legacy format (useGradient)
  else if (s.useGradient && s.gradientColorStart && s.gradientColorEnd) {
    const type = s.gradientType || 'linear'
    const angle = s.gradientAngle ?? 180
    if (type === 'linear') {
      style.background = `linear-gradient(${angle}deg, ${s.gradientColorStart}, ${s.gradientColorEnd})`
    } else {
      style.background = `radial-gradient(circle, ${s.gradientColorStart}, ${s.gradientColorEnd})`
    }
  }

  // Padding
  if (s.paddingTop) style.paddingTop = `${s.paddingTop}px`
  if (s.paddingRight) style.paddingRight = `${s.paddingRight}px`
  if (s.paddingBottom) style.paddingBottom = `${s.paddingBottom}px`
  if (s.paddingLeft) style.paddingLeft = `${s.paddingLeft}px`

  // Margin
  if (s.marginTop) style.marginTop = `${s.marginTop}px`
  if (s.marginRight) style.marginRight = `${s.marginRight}px`
  if (s.marginBottom) style.marginBottom = `${s.marginBottom}px`
  if (s.marginLeft) style.marginLeft = `${s.marginLeft}px`

  // Border
  if (s.borderRadius) style.borderRadius = `${s.borderRadius}px`
  if (s.borderWidth) {
    style.borderWidth = `${s.borderWidth}px`
    style.borderStyle = s.borderStyle || 'solid'
    style.borderColor = s.borderColor || '#000000'
  }

  if (s.boxShadow) style.boxShadow = s.boxShadow

  // Alignment - column needs height to make vertical alignment work
  if (s.verticalAlign) {
    style.justifyContent = s.verticalAlign
    // Column needs height for justify-content to work
    if (!s.columnHeight && !s.minHeight) {
      style.height = '100%'
    }
  }
  if (s.horizontalAlign) {
    style.alignItems = s.horizontalAlign
  }

  // Height
  if (s.columnHeight) style.minHeight = `${s.columnHeight}px`
  if (s.minHeight) style.minHeight = `${s.minHeight}px`

  return style
}

// Get widgets from column content
function getColumnWidgets(column: any) {
  // API returns widgets as "content" array with widget_type, uuid, content, config, settings
  const content = column.content || []

  return content.map((item: any, index: number) => {
    // For config-only widgets (social-icons, video, countdown, etc.), data is in config
    // For content widgets (text, heading), data is in content
    // Merge both to ensure all data is available
    const widgetData = {
      ...item.content,
      ...item.config
    }

    return {
      id: item.uuid || `widget-${index}`,
      type: item.widget_type || item.type || 'text',
      data: widgetData,
      settings: item.settings || {}
    }
  })
}

// Check if section is hidden for current breakpoint
const isSectionHidden = computed(() => isHidden(props.section.settings))

// CSS class for section
const sectionClass = computed(() => {
  const classes = ['lcms-section', `lcms-section--grid-${gridType.value}`]

  const s = settings.value as SectionSettings
  if (s.cssClass) {
    classes.push(s.cssClass)
  }
  if (isSectionHidden.value) {
    classes.push('lcms-hidden')
  }
  if (isStacked.value) {
    classes.push('lcms-section--stacked')
  }

  // Add breakpoint class for CSS targeting
  classes.push(`lcms-section--${currentBreakpoint.value}`)

  return classes.join(' ')
})

// Helper: hex to rgba
function hexToRgba(hex: string, alpha: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return hex
  const r = parseInt(result[1], 16)
  const g = parseInt(result[2], 16)
  const b = parseInt(result[3], 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
</script>

<template>
  <section
    :id="settings.cssId || undefined"
    :class="sectionClass"
    :data-section-id="sectionId"
    :style="sectionStyle"
  >
    <div
      class="lcms-section__grid"
      :style="gridStyle"
    >
      <div
        v-for="(column, colIndex) in columns"
        :key="column.id || colIndex"
        :id="column.settings?.cssId || undefined"
        class="lcms-section__column"
        :class="{ 'lcms-hidden': isColumnHidden(column) }"
        :style="getColumnStyle(column)"
        :data-column-index="colIndex"
      >
        <WidgetRenderer
          v-for="widget in getColumnWidgets(column)"
          :key="widget.id"
          :widget="widget"
          :language="language"
        />
      </div>
    </div>
  </section>
</template>

<style>
.lcms-hidden {
  display: none !important;
}

/* Stacked layout class (applied via JS based on breakpoint settings) */
.lcms-section--stacked .lcms-section__grid {
  grid-template-columns: 1fr !important;
}

/* Column flex layout for proper vertical alignment */
.lcms-section__column {
  display: flex;
  flex-direction: column;
}
</style>
