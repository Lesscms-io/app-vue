<script setup lang="ts">
/**
 * Section Renderer
 *
 * Renders a section with its columns and widgets.
 * Applies all settings: background, padding, margin, border, etc.
 * Supports responsive settings for tablet/mobile breakpoints.
 */

import { computed, ref, onMounted, onUnmounted, provide } from 'vue'
import WidgetRenderer from './WidgetRenderer.vue'
import LcmsWrapper from './widgets/LcmsWrapper.vue'
import { useResponsiveSettings } from '@/composables/useResponsiveSettings'
import { useScrollAnimation } from '@/composables/useScrollAnimation'
import { resolveColor } from '@/utils/resolveColor'
import type { PageSection, PageColumn, WidgetContent, SectionSettings, ColumnSettings } from '@/api/types'

interface HoverSettings {
  background_color?: string
  background_opacity?: number
  border_color?: string
  border_width?: number | null
  box_shadow?: string
  transition_duration?: number
  hover_translate_y?: number
  hover_scale?: number
  hover_rotate?: number
}

interface Props {
  section: PageSection
  language?: string
}

const props = defineProps<Props>()

const { getMergedSettings, isHidden, shouldStack, currentBreakpoint } = useResponsiveSettings()

const sectionId = computed(() => props.section.uuid || props.section.id)
const settings = computed(() => getMergedSettings(props.section.settings as SectionSettings))
const columns = computed(() => props.section.columns || [])

// Scroll state for sticky sections — provided to child widgets
const isScrolled = ref(false)
provide('sectionIsScrolled', isScrolled)

const handleScroll = () => {
  const s = settings.value as SectionSettings
  if (s.sticky) {
    // Trigger scrolled-bg as soon as the user actually starts scrolling.
    // Using `sticky_top` as the threshold (its original meaning is the *offset*
    // at which the section pins) made the background fade in only after the
    // user had scrolled past the offset — a long transparent stretch on
    // top-pinned sections with a header offset (e.g. sticky_top=80).
    isScrolled.value = window.scrollY > 4
  }
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })
  handleScroll()
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})

// Generate unique ID for section (used for hover CSS selectors)
const sectionUniqueId = computed(() => {
  const id = props.section.uuid || props.section.id || Math.random().toString(36).substring(2, 11)
  return `lcms-section-${id}`
})

// Generate hover CSS for section
const sectionHoverCss = computed(() => {
  const hover = (props.section.settings as any)?.hover as HoverSettings | undefined
  if (!hover) return ''

  const hasTransform = hover.hover_translate_y || (hover.hover_scale !== undefined && hover.hover_scale !== 1) || hover.hover_rotate
  const hasHoverStyles = hover.background_color || hover.border_color || hover.box_shadow || hasTransform
  if (!hasHoverStyles) return ''

  const transitionDuration = hover.transition_duration ?? 300

  let css = `#${sectionUniqueId.value} { transition: all ${transitionDuration}ms ease; }`
  css += `#${sectionUniqueId.value}:hover {`

  if (hover.background_color) {
    const resolved = resolveColor(hover.background_color)
    const opacity = hover.background_opacity ?? 100
    if (opacity < 100 && resolved.startsWith('#')) {
      css += `background-color: ${hexToRgba(resolved, opacity / 100)};`
    } else {
      css += `background-color: ${resolved};`
    }
  }

  if (hover.border_color) {
    css += `border-color: ${resolveColor(hover.border_color)};`
  }

  if (hover.border_width !== undefined && hover.border_width !== null) {
    css += `border-width: ${hover.border_width}px;`
  }

  if (hover.box_shadow) {
    css += `box-shadow: ${hover.box_shadow};`
  }

  if (hasTransform) {
    const parts: string[] = []
    if (hover.hover_translate_y) parts.push(`translateY(${hover.hover_translate_y}px)`)
    if (hover.hover_scale !== undefined && hover.hover_scale !== 1) parts.push(`scale(${hover.hover_scale})`)
    if (hover.hover_rotate) parts.push(`rotate(${hover.hover_rotate}deg)`)
    css += `transform: ${parts.join(' ')};`
  }

  css += '}'

  return css
})

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
  if (s.background_color) {
    const resolved = resolveColor(s.background_color)
    const opacity = s.background_opacity ?? 100
    if (opacity < 100 && resolved.startsWith('#')) {
      style.backgroundColor = hexToRgba(resolved, opacity / 100)
    } else if (opacity < 100 && resolved.startsWith('var(')) {
      style.backgroundColor = `color-mix(in srgb, ${resolved} ${opacity}%, transparent)`
    } else {
      style.backgroundColor = resolved
    }
  }

  // Background image + gradient (gradient overlays image)
  {
    let gradientValue = ''
    // Gradient (API returns { gradient: { type, color_start, color_end, angle } })
    if (s.gradient && s.gradient.color_start && s.gradient.color_end) {
      const type = s.gradient.type || 'linear'
      const angle = s.gradient.angle ?? 180
      const start = resolveColor(s.gradient.color_start)
      const end = resolveColor(s.gradient.color_end)
      gradientValue = type === 'linear'
        ? `linear-gradient(${angle}deg, ${start}, ${end})`
        : `radial-gradient(circle, ${start}, ${end})`
    }
    // Also support legacy format (use_gradient)
    else if (s.use_gradient && s.gradient_color_start && s.gradient_color_end) {
      const type = s.gradient_type || 'linear'
      const angle = s.gradient_angle ?? 180
      const start = resolveColor(s.gradient_color_start)
      const end = resolveColor(s.gradient_color_end)
      gradientValue = type === 'linear'
        ? `linear-gradient(${angle}deg, ${start}, ${end})`
        : `radial-gradient(circle, ${start}, ${end})`
    }

    if (s.background_image) {
      const encodedUrl = encodeURI(s.background_image_optimized || s.background_image)
      const imgSize = s.background_size || 'cover'
      const imgPos = s.background_position || 'center center'
      if (gradientValue) {
        // Gradient on top of image
        style.backgroundImage = `${gradientValue}, url("${encodedUrl}")`
        style.backgroundSize = `auto, ${imgSize}`
        style.backgroundPosition = `0 0, ${imgPos}`
      } else {
        style.backgroundImage = `url("${encodedUrl}")`
        style.backgroundSize = imgSize
        style.backgroundPosition = imgPos
      }
      style.backgroundRepeat = 'no-repeat'
    } else if (gradientValue) {
      style.backgroundImage = gradientValue
    }
  }

  // Padding
  if (s.padding_top) style.paddingTop = `${s.padding_top}px`
  if (s.padding_right) style.paddingRight = `${s.padding_right}px`
  if (s.padding_bottom) style.paddingBottom = `${s.padding_bottom}px`
  if (s.padding_left) style.paddingLeft = `${s.padding_left}px`

  // Margin
  if (s.margin_top) style.marginTop = `${s.margin_top}px`
  if (s.margin_right) style.marginRight = `${s.margin_right}px`
  if (s.margin_bottom) style.marginBottom = `${s.margin_bottom}px`
  if (s.margin_left) style.marginLeft = `${s.margin_left}px`

  // Border
  if (s.border_radius) style.borderRadius = `${s.border_radius}px`
  if (s.border_width) {
    style.borderWidth = `${s.border_width}px`
    style.borderStyle = s.border_style || 'solid'
    style.borderColor = resolveColor(s.border_color) || '#000000'
  }

  // Shadow
  if (s.box_shadow) style.boxShadow = s.box_shadow

  // Height
  if (s.full_height || s.height_mode === 'full') {
    const minH = s.min_height || s.minHeight
    style.minHeight = minH ? `max(100vh, ${minH}px)` : '100vh'
  } else if (s.sectionHeight || s.section_height) {
    style.minHeight = `${s.sectionHeight || s.section_height}px`
  } else if (s.min_height || s.minHeight) {
    style.minHeight = `${s.min_height || s.minHeight}px`
  }

  // Sticky
  if (s.sticky) {
    if (s.overlay) {
      // Overlay: fixed to top, doesn't take space in document flow
      style.position = 'fixed'
      style.top = s.sticky_top ? `${s.sticky_top}px` : '0'
      style.left = '0'
      style.right = '0'
      style.width = '100%'
    } else {
      style.position = 'sticky'
      style.top = s.sticky_top ? `${s.sticky_top}px` : '0'
    }
    style.zIndex = String(s.sticky_z_index ?? 100)
    // Sticky sections almost always host nav widgets (menus, mini-cart,
    // account icon) whose dropdowns need to extend below the section
    // bounds. The base `.lcms-section { overflow: hidden }` clips bg media,
    // but here it would also clip the dropdowns. Override to visible.
    style.overflow = 'visible'

    // No transition — flip the background the moment the user touches the
    // scrollwheel. Any interpolation leaves a visible transparent flash.
    if (s.scrolled_bg) {
      style.transition = 'none'
    }

    // Apply scrolled styles
    if (isScrolled.value && s.scrolled_bg) {
      style.backgroundColor = resolveColor(s.scrolled_bg) || style.backgroundColor
      if (s.scrolled_shadow && s.scrolled_shadow !== 'none') {
        const shadowMap: Record<string, string> = {
          sm: '0 1px 3px rgba(0,0,0,0.12)',
          md: '0 4px 6px rgba(0,0,0,0.1)',
          lg: '0 10px 25px rgba(0,0,0,0.15)'
        }
        style.boxShadow = shadowMap[s.scrolled_shadow] || ''
      }
    }
  }

  return style
})

// Inner container styles for content width
const innerStyle = computed(() => {
  const s = settings.value as SectionSettings
  const style: Record<string, string> = {}

  const width = s.content_width
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
  if (s.column_gap) {
    style.gap = `${s.column_gap}px`
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

  // Use actual column widths if available (span = 12-column grid system)
  const templateColumns = cols.map(col => {
    if (col.width) {
      return `${col.width}%`
    }
    if (col.span) {
      return `${(col.span / 12) * 100}%`
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
  if (s.background_color) {
    const resolved = resolveColor(s.background_color)
    const opacity = s.background_opacity ?? 100
    if (opacity < 100 && resolved.startsWith('#')) {
      style.backgroundColor = hexToRgba(resolved, opacity / 100)
    } else if (opacity < 100 && resolved.startsWith('var(')) {
      style.backgroundColor = `color-mix(in srgb, ${resolved} ${opacity}%, transparent)`
    } else {
      style.backgroundColor = resolved
    }
  }

  // Background image + gradient (gradient overlays image)
  {
    let gradientValue = ''
    if (s.gradient && s.gradient.color_start && s.gradient.color_end) {
      const type = s.gradient.type || 'linear'
      const angle = s.gradient.angle ?? 180
      const start = resolveColor(s.gradient.color_start)
      const end = resolveColor(s.gradient.color_end)
      gradientValue = type === 'linear'
        ? `linear-gradient(${angle}deg, ${start}, ${end})`
        : `radial-gradient(circle, ${start}, ${end})`
    }
    else if (s.use_gradient && s.gradient_color_start && s.gradient_color_end) {
      const type = s.gradient_type || 'linear'
      const angle = s.gradient_angle ?? 180
      const start = resolveColor(s.gradient_color_start)
      const end = resolveColor(s.gradient_color_end)
      gradientValue = type === 'linear'
        ? `linear-gradient(${angle}deg, ${start}, ${end})`
        : `radial-gradient(circle, ${start}, ${end})`
    }

    if (s.background_image) {
      const encodedUrl = encodeURI(s.background_image_optimized || s.background_image)
      const imgSize = s.background_size || 'cover'
      const imgPos = s.background_position || 'center center'
      if (gradientValue) {
        style.backgroundImage = `${gradientValue}, url("${encodedUrl}")`
        style.backgroundSize = `auto, ${imgSize}`
        style.backgroundPosition = `0 0, ${imgPos}`
      } else {
        style.backgroundImage = `url("${encodedUrl}")`
        style.backgroundSize = imgSize
        style.backgroundPosition = imgPos
      }
      style.backgroundRepeat = 'no-repeat'
    } else if (gradientValue) {
      style.backgroundImage = gradientValue
    }
  }

  // Padding
  if (s.padding_top) style.paddingTop = `${s.padding_top}px`
  if (s.padding_right) style.paddingRight = `${s.padding_right}px`
  if (s.padding_bottom) style.paddingBottom = `${s.padding_bottom}px`
  if (s.padding_left) style.paddingLeft = `${s.padding_left}px`

  // Margin
  if (s.margin_top) style.marginTop = `${s.margin_top}px`
  if (s.margin_right) style.marginRight = `${s.margin_right}px`
  if (s.margin_bottom) style.marginBottom = `${s.margin_bottom}px`
  if (s.margin_left) style.marginLeft = `${s.margin_left}px`

  // Border
  if (s.border_radius) style.borderRadius = `${s.border_radius}px`
  if (s.border_width) {
    style.borderWidth = `${s.border_width}px`
    style.borderStyle = s.border_style || 'solid'
    style.borderColor = resolveColor(s.border_color) || '#000000'
  }

  if (s.box_shadow) style.boxShadow = s.box_shadow

  // Alignment - column uses flex-direction: column, so:
  //   justify-content = vertical axis (main axis)
  //   align-items = horizontal axis (cross axis)
  if (s.vertical_align) {
    style.justifyContent = mapFlexAlign(s.vertical_align)
    // Column needs height for justify-content to work
    if (!s.column_height && !s.min_height) {
      style.height = '100%'
    }
  }
  if (s.horizontal_align) {
    style.alignItems = mapFlexAlign(s.horizontal_align)
  }

  // Height
  if (s.column_height) style.minHeight = `${s.column_height}px`
  if (s.min_height) style.minHeight = `${s.min_height}px`

  // Sticky column
  if (s.sticky) {
    style.position = 'sticky'
    style.top = s.sticky_top ? `${s.sticky_top}px` : '0px'
    style.zIndex = String(s.sticky_z_index ?? 10)
    style.alignSelf = 'flex-start'
  }

  return style
}

// Get alignment CSS class for column (controls child widget width behavior)
function getColumnAlignClass(column: PageColumn): string {
  const s = getMergedSettings(column.settings as ColumnSettings)
  const align = s.horizontal_align
  if (!align || align === 'stretch') return ''
  const resolved = mapFlexAlign(align)
  if (resolved === 'center') return 'lcms-section__column--align-center'
  if (resolved === 'flex-start') return 'lcms-section__column--align-start'
  if (resolved === 'flex-end') return 'lcms-section__column--align-end'
  return ''
}

// Generate unique ID for column
function getColumnId(column: PageColumn, index: number): string {
  const id = column.uuid || column.id || `col-${index}`
  return `lcms-column-${id}`
}

// Generate hover CSS for a column
function getColumnHoverCss(column: PageColumn, index: number): string {
  const hover = (column.settings as any)?.hover as HoverSettings | undefined
  if (!hover) return ''

  const hasHoverStyles = hover.backgroundColor || hover.background_color ||
    hover.borderColor || hover.border_color ||
    hover.boxShadow || hover.box_shadow
  if (!hasHoverStyles) return ''

  const columnId = getColumnId(column, index)
  const transitionDuration = hover.transitionDuration ?? hover.transition_duration ?? 300

  let css = `#${columnId} { transition: all ${transitionDuration}ms ease; }`
  css += `#${columnId}:hover {`

  const bgColor = hover.backgroundColor || hover.background_color
  if (bgColor) {
    const resolved = resolveColor(bgColor)
    const opacity = hover.backgroundOpacity ?? hover.background_opacity ?? 100
    if (opacity < 100 && resolved.startsWith('#')) {
      css += `background-color: ${hexToRgba(resolved, opacity / 100)};`
    } else {
      css += `background-color: ${resolved};`
    }
  }

  const bdrColor = hover.borderColor || hover.border_color
  if (bdrColor) {
    css += `border-color: ${resolveColor(bdrColor)};`
  }

  const bdrWidth = hover.borderWidth ?? hover.border_width
  if (bdrWidth !== undefined && bdrWidth !== null) {
    css += `border-width: ${bdrWidth}px;`
  }

  const shadow = hover.boxShadow || hover.box_shadow
  if (shadow) {
    css += `box-shadow: ${shadow};`
  }

  css += '}'

  return css
}

// All columns hover CSS combined
const columnsHoverCss = computed(() => {
  return columns.value.map((col, idx) => getColumnHoverCss(col, idx)).filter(Boolean).join('\n')
})

// Get widgets from column content
function getColumnWidgets(column: any) {
  // API returns widgets as "content" array with widget_type, uuid, widget, settings
  const content = column.content || []

  return content.map((item: any, index: number) => {
    // Wrapper node: pass through as-is
    if (item.type === 'wrapper') {
      return {
        id: item.uuid || `wrapper-${index}`,
        type: 'wrapper',
        data: item.data || {},
        items: (item.items || []).map((child: any, childIdx: number) => {
          const childData = child.widget || child.data || {}
          return {
            id: child.uuid || `widget-${index}-${childIdx}`,
            type: child.widget_type || child.type || 'text',
            data: childData,
            settings: child.settings || {}
          }
        })
      }
    }

    // Regular widget
    const widgetData = item.widget || item.data || {}

    const result: any = {
      id: item.uuid || `widget-${index}`,
      type: item.widget_type || item.type || 'text',
      data: widgetData,
      settings: item.settings || {}
    }

    // Pass through multi-item properties (legacy)
    if (item.multi_item) {
      result.multi_item = true
      result.items = item.items
      result.multi_columns = item.multi_columns
      result.multi_gap = item.multi_gap
      result.multi_layout = item.multi_layout
    }

    return result
  })
}

// Scroll animation for section
const sectionAnimConfig = computed(() => {
  const s = settings.value as SectionSettings
  const type = (s as any).animationType || 'none'
  if (type === 'none') return null
  return {
    type,
    duration: (s as any).animationDuration ?? 600,
    delay: (s as any).animationDelay ?? 0,
    once: (s as any).animationOnce ?? true
  }
})

const sectionRef = ref<HTMLElement | null>(null)
const { isVisible: sectionVisible, hasAnimated: sectionHasAnimated } = useScrollAnimation(sectionRef, sectionAnimConfig)

// Scroll animation inline style
const sectionAnimStyle = computed(() => {
  if (!sectionAnimConfig.value) return {}
  return {
    '--lcms-anim-duration': `${sectionAnimConfig.value.duration}ms`,
    '--lcms-anim-delay': `${sectionAnimConfig.value.delay}ms`
  }
})

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

  // Scroll animation classes
  if (sectionAnimConfig.value) {
    classes.push(`lcms-anim-${sectionAnimConfig.value.type}`)
    if (sectionVisible.value || sectionHasAnimated.value) {
      classes.push('lcms-anim--visible')
    }
  }

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

// Helper: resolve color with opacity suffix (#hex:opacity → rgba)
function resolveColorOpacity(color: string): string {
  if (!color) return color
  // Handle "#hex:opacity" format (e.g., "#667eea:50")
  if (color.startsWith('#') && color.includes(':')) {
    const [hex, opacityStr] = color.split(':')
    const opacity = parseInt(opacityStr) || 100
    if (opacity < 100) {
      return hexToRgba(hex, opacity / 100)
    }
    return hex
  }
  return color
}

function mapFlexAlign(value: string): string {
  const map: Record<string, string> = {
    'left': 'flex-start',
    'top': 'flex-start',
    'center': 'center',
    'right': 'flex-end',
    'bottom': 'flex-end',
    'flex-start': 'flex-start',
    'flex-end': 'flex-end'
  }
  return map[value] || value
}
</script>

<template>
  <!-- Dynamic hover styles for section -->
  <component
    :is="'style'"
    v-if="sectionHoverCss"
  >{{ sectionHoverCss }}</component>

  <!-- Dynamic hover styles for columns -->
  <component
    :is="'style'"
    v-if="columnsHoverCss"
  >{{ columnsHoverCss }}</component>

  <section
    ref="sectionRef"
    :id="settings.cssId || sectionUniqueId"
    :class="sectionClass"
    :data-section-id="sectionId"
    :style="{ ...sectionStyle, ...sectionAnimStyle }"
  >
    <video
      v-if="(settings as any).background_video_url"
      class="lcms-section__bg-video"
      :src="(settings as any).background_video_url"
      :poster="(settings as any).background_image || undefined"
      autoplay
      muted
      loop
      playsinline
    />
    <div
      class="lcms-section__grid"
      :style="gridStyle"
    >
      <div
        v-for="(column, colIndex) in columns"
        :key="column.id || colIndex"
        :id="column.settings?.cssId || getColumnId(column, colIndex)"
        class="lcms-section__column"
        :class="[
          { 'lcms-hidden': isColumnHidden(column) },
          getColumnAlignClass(column)
        ]"
        :style="getColumnStyle(column)"
        :data-column-index="colIndex"
      >
        <video
          v-if="(getMergedSettings(column.settings as ColumnSettings) as any).background_video_url"
          class="lcms-section__column-bg-video"
          :src="(getMergedSettings(column.settings as ColumnSettings) as any).background_video_url"
          :poster="(getMergedSettings(column.settings as ColumnSettings) as any).background_image || undefined"
          autoplay
          muted
          loop
          playsinline
        />
        <template
          v-for="node in getColumnWidgets(column)"
          :key="node.id"
        >
          <!-- Wrapper node -->
          <LcmsWrapper
            v-if="node.type === 'wrapper'"
            :data="node.data"
            :items="node.items"
            :language="language"
          >
            <template #item="{ item, index }">
              <WidgetRenderer
                :widget="item"
                :language="language"
                :item-index="index"
              />
            </template>
          </LcmsWrapper>

          <!-- Regular widget -->
          <WidgetRenderer
            v-else
            :widget="node"
            :language="language"
          />
        </template>
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
  position: relative;
}

/* Background video (section + column) — under content, hidden on mobile */
.lcms-section {
  position: relative;
  overflow: hidden;
}
.lcms-section__bg-video,
.lcms-section__column-bg-video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 0;
  pointer-events: none;
  border-radius: inherit;
}
.lcms-section__column:has(> .lcms-section__column-bg-video) {
  overflow: hidden;
}
.lcms-section__grid {
  position: relative;
  z-index: 1;
}
@media (max-width: 767px) {
  .lcms-section__bg-video,
  .lcms-section__column-bg-video {
    display: none;
  }
}
</style>
