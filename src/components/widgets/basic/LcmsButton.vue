<script setup lang="ts">
/**
 * Button Widget
 *
 * Renders a styled button/link element.
 */

import { computed } from 'vue'
import { useLanguage } from '@/composables/useLanguage'
import type { ButtonWidgetData } from '@/types/widgets'

defineOptions({
  inheritAttrs: false
})

interface Props {
  data: ButtonWidgetData
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const { extractValue } = useLanguage(props.language)

const buttonText = computed(() => extractValue(props.data.text))
const buttonUrl = computed(() => props.data.url || '#')
const buttonStyle = computed(() => props.data.style || 'primary')
const buttonSize = computed(() => props.data.size || 'md')
const targetBlank = computed(() => props.data.target_blank || false)
const linkType = computed(() => props.data.link_type || 'url')
const borderRadius = computed(() => props.data.border_radius || '')
const buttonPadding = computed(() => props.data.padding || '')
const buttonIcon = computed(() => props.data.icon || '')
const iconPosition = computed(() => props.data.icon_position || 'left')
const pageUuid = computed(() => props.data.page_uuid || '')
const pageCode = computed(() => props.data.page_code || '')
const routeUuid = computed(() => props.data.route_uuid || '')
const entryUuid = computed(() => props.data.entry_uuid || '')
const collectionCode = computed(() => props.data.collection_code || '')
const entryCode = computed(() => props.data.entry_code || '')

const buttonInlineStyle = computed(() => {
  const styles: Record<string, string> = {}
  if (borderRadius.value) styles.borderRadius = `${borderRadius.value}px`
  if (buttonPadding.value) styles.padding = `${buttonPadding.value}px`
  return styles
})
</script>

<template>
  <div class="lcms-button">
    <a
      :href="buttonUrl"
      class="lcms-button__link"
      :class="[
        `lcms-button__link--${buttonStyle}`,
        `lcms-button__link--size-${buttonSize}`
      ]"
      :style="buttonInlineStyle"
      :target="targetBlank ? '_blank' : undefined"
      :rel="targetBlank ? 'noopener noreferrer' : undefined"
    >
      <i v-if="buttonIcon && iconPosition === 'left'" :class="buttonIcon" style="margin-right: 6px;" />
      {{ buttonText }}
      <i v-if="buttonIcon && iconPosition === 'right'" :class="buttonIcon" style="margin-left: 6px;" />
    </a>
  </div>
</template>
