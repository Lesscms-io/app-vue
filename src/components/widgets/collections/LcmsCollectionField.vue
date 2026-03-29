<script setup lang="ts">
/**
 * Collection Field Widget
 *
 * Renders a single field from a collection entry.
 * Used within collection templates to display entry data.
 *
 * Uses element-group pattern: icon, label, text, config
 */

import { computed, inject, ref, unref, watch, onMounted, onUnmounted, Teleport, type Ref } from 'vue'
import { useLanguage } from '@/composables/useLanguage'
import { contentImage } from '@/composables/useImageOptimization'
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

// Get entry from context (injected by parent template renderer or DynamicPageResolver)
// May be a plain object (from LcmsEntryTemplateRenderer) or a Ref (from DynamicPageResolver)
const injectedEntry = inject<CollectionEntry | Ref<CollectionEntry | null> | null>('lcms-collection-entry', null)

// Resolve color variables (var:primary → CSS var(--lcms-color-primary))
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

const config = computed(() => props.data.widget || props.data || {})

// Element-group refs with backward compatibility (fallback to flat config.value.*)
const iconGroup = computed(() => config.value.icon || {})
const labelGroup = computed(() => config.value.label || {})
const textGroup = computed(() => config.value.text || {})
const configGroup = computed(() => config.value.config || {})

// Config settings (from config group, fallback to flat)
const fieldCode = computed(() => configGroup.value.field_code || config.value.field_code || '')
const fieldType = computed(() => configGroup.value.field_type || config.value.field_type || 'text')
const displayAs = computed(() => configGroup.value.display_as || config.value.display_as || 'p')
const collectionCode = computed(() => configGroup.value.collection_code || config.value.collection_code || '')
const entrySource = computed(() => configGroup.value.entry_source || config.value.entry_source || 'context')
const entryId = computed(() => configGroup.value.entry_id || config.value.entry_id || '')
const entryUrlSegment = computed(() => configGroup.value.entry_url_segment || config.value.entry_url_segment || 1)
const valueSource = computed(() => configGroup.value.value_source || config.value.value_source || 'field')
const linkToEntry = computed(() => (configGroup.value.link_to_entry ?? config.value.link_to_entry) === true)
const previewEntryId = computed(() => configGroup.value.preview_entry_id || config.value.preview_entry_id || '')
const buttonStyleField = computed(() => configGroup.value.button_style || config.value.button_style || 'primary')
const buttonSizeField = computed(() => configGroup.value.button_size || config.value.button_size || 'md')
const customDateFormat = computed(() => configGroup.value.custom_date_format || config.value.custom_date_format || '')
const dateFormat = computed(() => configGroup.value.date_format || config.value.date_format || 'full')
const showTime = computed(() => configGroup.value.show_time ?? config.value.show_time ?? false)
const imageWidth = computed(() => configGroup.value.image_width || config.value.image_width || null)
const imageHeight = computed(() => configGroup.value.image_height || config.value.image_height || null)
const imageObjectFit = computed(() => configGroup.value.image_object_fit || config.value.image_object_fit || 'contain')
const imageBorderRadius = computed(() => configGroup.value.image_border_radius ?? config.value.image_border_radius ?? 0)

// Label settings (from label group, fallback to flat)
const labelPosition = computed(() => labelGroup.value.position || config.value.label_position || 'hidden')
const label = computed(() => {
  const text = labelGroup.value.html || labelGroup.value.content || config.value.label
  if (!text) return ''
  return extractValue(text)
})
const labelBackground = computed(() => resolveColor(labelGroup.value.background || config.value.label_background))
const labelColor = computed(() => resolveColor(labelGroup.value.color || config.value.label_color))
const labelPadding = computed(() => labelGroup.value.padding ?? config.value.label_padding ?? null)
const labelFontSize = computed(() => labelGroup.value.font_size || config.value.label_font_size || null)
const labelFontWeight = computed(() => labelGroup.value.font_weight || config.value.label_font_weight || null)
const labelBackgroundHover = computed(() => resolveColor(labelGroup.value['background:hover']))
const labelColorHover = computed(() => resolveColor(labelGroup.value['color:hover']))

// Icon settings (from icon group, fallback to flat)
const showIcon = computed(() => iconGroup.value.show ?? config.value.show_icon ?? false)
const icon = computed(() => iconGroup.value.icon || config.value.icon || '')
const iconPosition = computed(() => iconGroup.value.position || config.value.icon_position || 'left')
const iconSize = computed(() => iconGroup.value.size || config.value.icon_size || '24')
const iconColor = computed(() => resolveColor(iconGroup.value.color || config.value.icon_color) || '#50a5f1')
const iconBackground = computed(() => resolveColor(iconGroup.value.background || config.value.icon_background))
const iconPadding = computed(() => iconGroup.value.padding ?? config.value.icon_padding ?? null)
const iconBorderRadius = computed(() => iconGroup.value.border_radius ?? config.value.icon_border_radius ?? null)
const iconGap = computed(() => iconGroup.value.gap ?? config.value.icon_gap ?? null)
const iconColorHover = computed(() => resolveColor(iconGroup.value['color:hover']))
const iconBackgroundHover = computed(() => resolveColor(iconGroup.value['background:hover']))

// Text/value styling (from text group, fallback to flat)
const valueColor = computed(() => resolveColor(textGroup.value.color || config.value.value_color))
const valueBackground = computed(() => resolveColor(textGroup.value.background || config.value.value_background))
const valuePadding = computed(() => textGroup.value.padding ?? config.value.value_padding ?? 0)
const valueFontSize = computed(() => textGroup.value.font_size || config.value.value_font_size || null)
const valueFontWeight = computed(() => textGroup.value.font_weight || config.value.value_font_weight || null)
const valueColorHover = computed(() => resolveColor(textGroup.value['color:hover']))
const valueBackgroundHover = computed(() => resolveColor(textGroup.value['background:hover']))

// Display settings
const linkText = computed(() => {
  const text = config.value.link_text
  if (!text) return ''
  if (typeof text === 'object') {
    return text[currentLanguage.value] || text.pl || Object.values(text)[0] || ''
  }
  return text
})

// Entry link (_link system field)
const isEntryLink = computed(() => fieldCode.value === '_link')

const entryUrl = computed(() => {
  // 1. Use pre-resolved URL from API (based on collection routes)
  if (config.value.entry_url) return config.value.entry_url

  // 2. Fallback to injected entry metadata URL
  const entry = unref(injectedEntry)
  if (entry?.metadata?.url) return entry.metadata.url

  // 3. Final fallback: /{collection_code}/{entry_id}
  const entry2 = unref(injectedEntry)
  const eid = entry2?.metadata?.entry_id || entry2?.entry_id || entryId.value
  const cc = collectionCode.value || entry2?.metadata?.code
  if (cc && eid) return `/${cc}/${eid}`
  return null
})

const resolvedLinkText = computed(() => {
  return linkText.value || 'Zobacz'
})

const entryLinkButtonClass = computed(() => {
  return `lcms-button__link--${buttonStyleField.value}`
})

const entryLinkSizeClass = computed(() => {
  const size = buttonSizeField.value
  if (size === 'sm') return 'lcms-button__link--size-sm'
  if (size === 'lg') return 'lcms-button__link--size-lg'
  return ''
})

// Get field value from entry or enriched data
const fieldValue = computed(() => {
  // Use enriched value from API if available
  if (config.value.value !== undefined && config.value.value !== null) {
    const value = config.value.value
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value[currentLanguage.value] || value.pl || Object.values(value)[0]
    }
    return value
  }

  // Fallback to injected entry (template context or DynamicPageResolver)
  const entry = unref(injectedEntry)
  if (!entry || !entry.content || !fieldCode.value) return null

  const value = entry.content[fieldCode.value]
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    // Multilingual field
    return value[currentLanguage.value] || value.pl || Object.values(value)[0]
  }
  return value
})

// Extract display text from enriched select/multiselect option objects
function extractOptionLabel(option: any): string {
  if (!option || typeof option !== 'object') return String(option ?? '')
  // Enriched option: { code, value, value_translation }
  if (option.value_translation) {
    if (typeof option.value_translation === 'string') {
      return option.value_translation
    }
    if (typeof option.value_translation === 'object') {
      const translated = option.value_translation[currentLanguage.value]
      if (translated) return translated
    }
  }
  return option.value || option.label || option.code || ''
}

// Check if field type is a select-like type
function isSelectType(type: string): boolean {
  return ['select', 'multiselect', 'radio', 'checkbox'].includes(type)
}

// Check if field type is gallery
function isGalleryType(type: string): boolean {
  return type === 'gallery'
}

// Get gallery images from value
const galleryImages = computed(() => {
  const val = fieldValue.value
  if (!val || !Array.isArray(val)) return []
  return val.map((item: any) => {
    if (typeof item === 'string') return item
    if (typeof item === 'object' && item.url) return item.url
    return null
  }).filter(Boolean)
})

// Format value based on field type
const formattedValue = computed(() => {
  const val = fieldValue.value
  if (val === null || val === undefined) return ''

  switch (fieldType.value) {
    case 'date':
    case 'datetime':
      return formatDateValue(val)
    case 'image':
      return typeof val === 'object' && val.url ? val.url : val
    case 'gallery':
      return '' // Handled by galleryImages computed
    case 'boolean':
      return val ? 'Yes' : 'No'
    case 'select':
    case 'radio':
      // Single select: may be enriched { code, value } or raw string
      if (typeof val === 'object' && val !== null && !Array.isArray(val) && (val.code || val.value)) {
        return extractOptionLabel(val)
      }
      // Raw string (option code) — display as-is
      return String(val)
    case 'multiselect':
    case 'checkbox':
      // Array of enriched objects or raw strings
      if (Array.isArray(val)) {
        return val.map((item: any) => {
          if (typeof item === 'object' && (item.code || item.value)) return extractOptionLabel(item)
          return String(item)
        }).filter(Boolean).join(', ')
      }
      if (typeof val === 'object' && val !== null && (val.code || val.value)) {
        return extractOptionLabel(val)
      }
      return String(val)
    default:
      // Handle arrays (generic)
      if (Array.isArray(val)) {
        return val.map((item: any) => extractOptionLabel(item)).filter(Boolean).join(', ')
      }
      // Handle single enriched option object
      if (typeof val === 'object' && val !== null && (val.code || val.value)) {
        return extractOptionLabel(val)
      }
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
  if (valueFontSize.value) style.fontSize = valueFontSize.value
  if (valueFontWeight.value) style.fontWeight = valueFontWeight.value
  return style
})

// Icon styles
const iconStyle = computed(() => {
  const style: Record<string, string> = {
    fontSize: `${iconSize.value}px`,
    color: iconColor.value,
  }
  if (iconBackground.value) style.backgroundColor = iconBackground.value
  if (iconPadding.value) style.padding = `${iconPadding.value}px`
  if (iconBorderRadius.value) style.borderRadius = `${iconBorderRadius.value}px`
  return style
})

// Image styles
const imageStyle = computed(() => {
  const style: Record<string, string> = {}
  if (imageWidth.value) style.width = `${imageWidth.value}px`
  if (imageHeight.value) style.height = `${imageHeight.value}px`
  if (imageObjectFit.value) style.objectFit = imageObjectFit.value
  if (imageBorderRadius.value) style.borderRadius = `${imageBorderRadius.value}px`
  return style
})

// Format date helper
function formatDateValue(value: string | Date): string {
  const date = new Date(value)
  const format = dateFormat.value

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

  if (showTime.value) {
    options.timeStyle = 'short'
  }

  return date.toLocaleDateString(currentLanguage.value, options)
}

// --- Lightbox (for gallery fields) ---
const lightboxOpen = ref(false)
const lightboxIndex = ref(0)

function openLightbox(index: number) {
  lightboxIndex.value = index
  lightboxOpen.value = true
}

function closeLightbox() {
  lightboxOpen.value = false
}

function lightboxNext() {
  lightboxIndex.value = (lightboxIndex.value + 1) % galleryImages.value.length
}

function lightboxPrev() {
  lightboxIndex.value = (lightboxIndex.value - 1 + galleryImages.value.length) % galleryImages.value.length
}

function onLightboxKeydown(e: KeyboardEvent) {
  if (!lightboxOpen.value) return
  if (e.key === 'Escape') closeLightbox()
  else if (e.key === 'ArrowRight') lightboxNext()
  else if (e.key === 'ArrowLeft') lightboxPrev()
}

let touchStartX = 0
function onTouchStart(e: TouchEvent) {
  touchStartX = e.changedTouches[0].screenX
}
function onTouchEnd(e: TouchEvent) {
  const diff = touchStartX - e.changedTouches[0].screenX
  if (Math.abs(diff) >= 50) {
    diff > 0 ? lightboxNext() : lightboxPrev()
  }
}

function onBackdropClick(e: MouseEvent) {
  if ((e.target as HTMLElement).classList.contains('lcms-lightbox__backdrop')) {
    closeLightbox()
  }
}

watch(lightboxOpen, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
})

onMounted(() => {
  document.addEventListener('keydown', onLightboxKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onLightboxKeydown)
  document.body.style.overflow = ''
})

const lightboxImage = computed(() => galleryImages.value[lightboxIndex.value] || null)
</script>

<template>
  <div class="lcms-collection-field" :class="`lcms-collection-field--${fieldType}`">
    <!-- Label -->
    <span
      v-if="labelPosition !== 'hidden' && label"
      class="lcms-collection-field__label"
      :class="`lcms-collection-field__label--${labelPosition}`"
      :style="{
        color: labelColor || undefined,
        backgroundColor: labelBackground || undefined,
        padding: labelPadding ? `${labelPadding}px` : undefined,
        fontSize: labelFontSize || undefined,
        fontWeight: labelFontWeight || undefined,
      }"
    >
      {{ label }}
    </span>

    <!-- Entry link button (_link system field) -->
    <a
      v-if="isEntryLink && entryUrl"
      :href="entryUrl"
      class="lcms-button__link"
      :class="[entryLinkButtonClass, entryLinkSizeClass]"
    >
      <i v-if="showIcon && icon && iconPosition === 'left'" :class="icon" :style="iconStyle" />
      {{ resolvedLinkText }}
      <i v-if="showIcon && icon && iconPosition === 'right'" :class="icon" :style="iconStyle" />
    </a>

    <!-- Value with optional icon (optionally linked to entry) -->
    <component
      v-else
      :is="linkToEntry && entryUrl ? 'a' : 'div'"
      :href="linkToEntry && entryUrl ? entryUrl : undefined"
      class="lcms-collection-field__value-wrapper"
      :class="{
        'lcms-collection-field__value-wrapper--with-icon': showIcon,
        'lcms-collection-field__value-wrapper--linked': linkToEntry && entryUrl
      }"
      :style="showIcon && iconGap ? { gap: `${iconGap}px` } : undefined"
    >
      <!-- Icon (left) -->
      <i
        v-if="showIcon && icon && iconPosition === 'left'"
        :class="icon"
        class="lcms-collection-field__icon"
        :style="iconStyle"
      />

      <!-- Value: HTML content uses div to allow block-level elements -->
      <div
        v-if="isHtml"
        class="lcms-collection-field__value"
        :style="valueStyle"
        v-html="formattedValue"
      />

      <!-- Gallery display -->
      <div
        v-else-if="isGalleryType(fieldType) && galleryImages.length"
        class="lcms-collection-field__gallery"
      >
        <img
          v-for="(img, idx) in galleryImages"
          :key="idx"
          :src="contentImage(img).src"
          :srcset="contentImage(img).srcset"
          :sizes="contentImage(img).sizes"
          :alt="`${label || fieldCode} ${idx + 1}`"
          loading="lazy"
          decoding="async"
          class="lcms-collection-field__gallery-image"
          style="cursor: pointer"
          @click="openLightbox(idx)"
        />
      </div>

      <!-- Image display (displayAs=image or fieldType=image) -->
      <img
        v-else-if="(displayAs === 'image' || fieldType === 'image') && formattedValue"
        :src="contentImage(formattedValue).src"
        :srcset="contentImage(formattedValue).srcset"
        :sizes="contentImage(formattedValue).sizes"
        :alt="label || fieldCode"
        loading="lazy"
        decoding="async"
        class="lcms-collection-field__value lcms-collection-field__image"
        :style="imageStyle"
      />

      <!-- Value: non-HTML content uses dynamic tag -->
      <component
        v-else
        :is="displayAs"
        class="lcms-collection-field__value"
        :style="valueStyle"
      >
        {{ formattedValue }}
      </component>

      <!-- Icon (right) -->
      <i
        v-if="showIcon && icon && iconPosition === 'right'"
        :class="icon"
        class="lcms-collection-field__icon"
        :style="iconStyle"
      />
    </component>

    <!-- Lightbox Overlay (gallery fields) -->
    <Teleport to="body">
      <Transition name="lcms-lightbox">
        <div
          v-if="lightboxOpen && lightboxImage"
          class="lcms-lightbox__backdrop"
          @click="onBackdropClick"
          @touchstart="onTouchStart"
          @touchend="onTouchEnd"
        >
          <button
            class="lcms-lightbox__close"
            type="button"
            @click="closeLightbox"
          >
            <i class="fa-solid fa-xmark" />
          </button>

          <div class="lcms-lightbox__counter">
            {{ lightboxIndex + 1 }} / {{ galleryImages.length }}
          </div>

          <button
            v-if="galleryImages.length > 1"
            class="lcms-lightbox__arrow lcms-lightbox__arrow--prev"
            type="button"
            @click.stop="lightboxPrev"
          >
            <i class="fa-solid fa-chevron-left" />
          </button>

          <div class="lcms-lightbox__image-wrapper">
            <img
              :src="lightboxImage"
              :alt="`${label || fieldCode} ${lightboxIndex + 1}`"
              class="lcms-lightbox__image"
              @click.stop
            >
          </div>

          <button
            v-if="galleryImages.length > 1"
            class="lcms-lightbox__arrow lcms-lightbox__arrow--next"
            type="button"
            @click.stop="lightboxNext"
          >
            <i class="fa-solid fa-chevron-right" />
          </button>
        </div>
      </Transition>
    </Teleport>
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

/* Apply global typography styles for heading tags */
h1.lcms-collection-field__value, h2.lcms-collection-field__value, h3.lcms-collection-field__value,
h4.lcms-collection-field__value, h5.lcms-collection-field__value, h6.lcms-collection-field__value {
  font-family: var(--lcms-font-heading, inherit);
}
h1.lcms-collection-field__value { font-size: var(--lcms-h1-font-size); font-weight: var(--lcms-h1-font-weight); line-height: var(--lcms-h1-line-height); color: var(--lcms-h1-color, inherit); margin-bottom: var(--lcms-h1-margin-bottom, 0); }
h2.lcms-collection-field__value { font-size: var(--lcms-h2-font-size); font-weight: var(--lcms-h2-font-weight); line-height: var(--lcms-h2-line-height); color: var(--lcms-h2-color, inherit); margin-bottom: var(--lcms-h2-margin-bottom, 0); }
h3.lcms-collection-field__value { font-size: var(--lcms-h3-font-size); font-weight: var(--lcms-h3-font-weight); line-height: var(--lcms-h3-line-height); color: var(--lcms-h3-color, inherit); margin-bottom: var(--lcms-h3-margin-bottom, 0); }
h4.lcms-collection-field__value { font-size: var(--lcms-h4-font-size); font-weight: var(--lcms-h4-font-weight); line-height: var(--lcms-h4-line-height); color: var(--lcms-h4-color, inherit); margin-bottom: var(--lcms-h4-margin-bottom, 0); }
h5.lcms-collection-field__value { font-size: var(--lcms-h5-font-size); font-weight: var(--lcms-h5-font-weight); line-height: var(--lcms-h5-line-height); color: var(--lcms-h5-color, inherit); margin-bottom: var(--lcms-h5-margin-bottom, 0); }
h6.lcms-collection-field__value { font-size: var(--lcms-h6-font-size); font-weight: var(--lcms-h6-font-weight); line-height: var(--lcms-h6-line-height); color: var(--lcms-h6-color, inherit); margin-bottom: var(--lcms-h6-margin-bottom, 0); }
p.lcms-collection-field__value { font-family: var(--lcms-font-body, inherit); font-size: var(--lcms-p-font-size); font-weight: var(--lcms-p-font-weight); line-height: var(--lcms-p-line-height); color: var(--lcms-p-color, inherit); }

.lcms-collection-field__icon {
  flex-shrink: 0;
}

a.lcms-collection-field__value-wrapper--linked {
  text-decoration: none;
  color: inherit;
}

a.lcms-collection-field__value-wrapper--linked:hover {
  text-decoration: underline;
}

.lcms-collection-field__image {
  max-width: 100%;
  height: auto;
}

.lcms-collection-field__gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 8px;
}

.lcms-collection-field__gallery-image {
  width: 100%;
  height: 150px;
  object-fit: cover;
  border-radius: 4px;
}
</style>
