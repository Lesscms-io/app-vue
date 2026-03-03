<script setup lang="ts">
/**
 * CTA Box Widget
 *
 * Renders a call-to-action box with title, subtitle and button.
 */

import { computed } from 'vue'
import { useLanguage } from '@/composables/useLanguage'
import type { CtaBoxWidgetData } from '@/types/widgets'

defineOptions({
  inheritAttrs: false
})

interface Props {
  data: CtaBoxWidgetData
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const { extractValue } = useLanguage(props.language)

const title = computed(() => extractValue(props.data.title))
const subtitle = computed(() => props.data.subtitle ? extractValue(props.data.subtitle) : '')
const buttonText = computed(() => props.data.button_text ? extractValue(props.data.button_text) : '')
const buttonUrl = computed(() => props.data.button_url || '')
const backgroundColor = computed(() => props.data.background_color || null)
const buttonColor = computed(() => props.data.button_color || null)
const textColor = computed(() => {
  const val = props.data.text_color || 'light'
  if (val === 'light') return '#ffffff'
  if (val === 'dark') return '#212529'
  return val
})
const alignment = computed(() => props.data.alignment || 'center')
const paddingY = computed(() => props.data.padding_y ?? 48)
const paddingX = computed(() => props.data.padding_x ?? 32)
const borderRadius = computed(() => props.data.border_radius ?? 12)
const titleFontSize = computed(() => {
  const v = props.data.title_font_size
  if (v == null) return '28px'
  if (typeof v === 'number') return `${v}px`
  return String(v).match(/[a-z]/) ? v : `${v}px`
})
const subtitleFontSize = computed(() => {
  const v = props.data.subtitle_font_size
  if (v == null) return '16px'
  if (typeof v === 'number') return `${v}px`
  return String(v).match(/[a-z]/) ? v : `${v}px`
})

// Button link settings
const buttonLinkType = computed(() => props.data.button_link_type || 'url')
const buttonPageId = computed(() => props.data.button_page_id || '')
const buttonCollectionCode = computed(() => props.data.button_collection_code || '')
const buttonEntryId = computed(() => props.data.button_entry_id || '')
const buttonRouteUuid = computed(() => props.data.button_route_uuid || '')
const buttonTargetBlank = computed(() => props.data.button_target_blank || false)
const buttonStyle = computed(() => props.data.button_style || '')
const buttonSize = computed(() => props.data.button_size || 'md')
const buttonBorderRadius = computed(() => props.data.button_border_radius || '')
const buttonPadding = computed(() => props.data.button_padding || '')
const buttonIcon = computed(() => props.data.button_icon || '')
const buttonIconPosition = computed(() => props.data.button_icon_position || 'left')

const buttonInlineStyle = computed(() => {
  const styles: Record<string, string> = {}
  if (buttonColor.value) styles.backgroundColor = buttonColor.value
  if (buttonBorderRadius.value) styles.borderRadius = `${buttonBorderRadius.value}px`
  if (buttonPadding.value) styles.padding = `${buttonPadding.value}px`
  return styles
})
</script>

<template>
  <div
    class="lcms-cta-box"
    :class="`lcms-cta-box--${alignment}`"
    :style="{
      backgroundColor: backgroundColor || undefined,
      color: textColor,
      padding: `${paddingY}px ${paddingX}px`,
      borderRadius: `${borderRadius}px`
    }"
  >
    <h3 v-if="title" class="lcms-cta-box__title" :style="{ fontSize: titleFontSize }">{{ title }}</h3>
    <p v-if="subtitle" class="lcms-cta-box__subtitle" :style="{ fontSize: subtitleFontSize }">{{ subtitle }}</p>
    <a
      v-if="buttonText && buttonUrl"
      :href="buttonUrl"
      class="lcms-cta-box__button"
      :class="[
        buttonStyle ? `btn-${buttonStyle}` : '',
        buttonSize !== 'md' ? `lcms-cta-box__button--${buttonSize}` : ''
      ]"
      :style="buttonInlineStyle"
      :target="buttonTargetBlank ? '_blank' : undefined"
      :rel="buttonTargetBlank ? 'noopener noreferrer' : undefined"
    >
      <i v-if="buttonIcon && buttonIconPosition === 'left'" :class="buttonIcon" style="margin-right: 6px;" />
      {{ buttonText }}
      <i v-if="buttonIcon && buttonIconPosition === 'right'" :class="buttonIcon" style="margin-left: 6px;" />
    </a>
  </div>
</template>

<style scoped>
.lcms-cta-box {
  background-color: #50a5f1;
  color: #fff;
}

.lcms-cta-box--center {
  text-align: center;
}

.lcms-cta-box--right {
  text-align: right;
}

.lcms-cta-box__title {
  margin: 0 0 8px;
}

.lcms-cta-box__subtitle {
  margin: 0 0 16px;
  opacity: 0.9;
}

.lcms-cta-box__button {
  display: inline-block;
  padding: 10px 24px;
  background-color: #fff;
  color: #212529;
  border-radius: 4px;
  text-decoration: none;
  font-weight: 600;
  transition: opacity 0.2s;
}

.lcms-cta-box__button:hover {
  opacity: 0.9;
}
</style>
