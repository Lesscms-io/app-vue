<script setup lang="ts">
/**
 * Collection Field Widget
 *
 * Renders a single field from a collection entry.
 * Used within collection templates to display entry data.
 */

import { computed, inject, ref, unref, watch, onMounted, onUnmounted, Teleport, type Ref } from 'vue'
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
const valueColor = computed(() => resolveColor(config.value.value_color))
const valueBackground = computed(() => resolveColor(config.value.value_background))
const valuePadding = computed(() => config.value.value_padding || 0)

// Label styling (also used in template via config.*)
const labelBackground = computed(() => resolveColor(config.value.label_background))
const labelColor = computed(() => resolveColor(config.value.label_color))
const labelPadding = computed(() => config.value.label_padding || null)
const labelFontSize = computed(() => config.value.label_font_size || null)
const labelFontWeight = computed(() => config.value.label_font_weight || null)

// Icon settings
const showIcon = computed(() => config.value.show_icon || false)
const icon = computed(() => config.value.icon || '')
const iconPosition = computed(() => config.value.icon_position || 'left')
const iconSize = computed(() => config.value.icon_size || '24')
const iconColor = computed(() => resolveColor(config.value.icon_color) || '#50a5f1')
const iconBackground = computed(() => resolveColor(config.value.icon_background))
const iconPadding = computed(() => config.value.icon_padding || null)
const iconBorderRadius = computed(() => config.value.icon_border_radius || null)
const iconGap = computed(() => config.value.icon_gap || null)

// Value source and dynamic settings (for future features)
const valueSource = computed(() => config.value.value_source || 'field')
const staticValue = computed(() => config.value.static_value || '')
const collectionCode = computed(() => config.value.collection_code || '')
const entrySource = computed(() => config.value.entry_source || 'context')
const entryId = computed(() => config.value.entry_id || '')
const entryUrlSegment = computed(() => config.value.entry_url_segment || 1)

// Display settings
const customDateFormat = computed(() => config.value.custom_date_format || '')
const linkText = computed(() => {
  const text = config.value.link_text
  if (!text) return ''
  if (typeof text === 'object') {
    return text[currentLanguage.value] || text.pl || Object.values(text)[0] || ''
  }
  return text
})
const buttonStyleField = computed(() => config.value.button_style || 'primary')
const buttonSizeField = computed(() => config.value.button_size || 'md')

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
      return formatDate(val)
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

    <!-- Value with optional icon -->
    <div
      v-else
      class="lcms-collection-field__value-wrapper"
      :class="{ 'lcms-collection-field__value-wrapper--with-icon': showIcon }"
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
          :src="img"
          :alt="`${label || fieldCode} ${idx + 1}`"
          class="lcms-collection-field__gallery-image"
          style="cursor: pointer"
          @click="openLightbox(idx)"
        />
      </div>

      <!-- Value: non-HTML content uses dynamic tag -->
      <component
        v-else
        :is="displayAs"
        class="lcms-collection-field__value"
        :style="valueStyle"
      >
        <!-- Image field -->
        <template v-if="fieldType === 'image' && formattedValue">
          <img :src="formattedValue" :alt="label || fieldCode" class="lcms-collection-field__image" />
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

.lcms-collection-field__icon {
  flex-shrink: 0;
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
