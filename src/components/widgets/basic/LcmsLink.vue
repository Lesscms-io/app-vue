<script setup lang="ts">
/**
 * Link Widget
 *
 * Renders a styled link with optional icon and hover animation.
 */

import { computed, inject } from 'vue'
import { useLanguage } from '@/composables/useLanguage'
import type { LinkWidgetData } from '@/types/widgets'

defineOptions({
  inheritAttrs: false
})

interface Props {
  data: LinkWidgetData
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const { extractValue } = useLanguage(props.language)

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

const resolvePageUrl = inject<(code: string | null, uuid: string | null) => string>('lesscms-resolve-page-url', () => '#')
const resolveCollectionUrl = inject<(collectionCode: string, entryId: string) => string>('lesscms-resolve-collection-url', () => '#')

const linkText = computed(() => extractValue(props.data.text))
const linkUrl = computed(() => props.data.url || '#')
const icon = computed(() => props.data.icon || 'fa-solid fa-arrow-right')
const iconPosition = computed(() => props.data.icon_position || 'right')
const animation = computed(() => props.data.animation || 'none')
const color = computed(() => props.data.color || null)
const targetBlank = computed(() => props.data.target_blank || false)

const linkStyles = computed(() => {
  const styles: Record<string, string> = {}
  const resolved = resolveColor(color.value)
  if (resolved) {
    styles.color = resolved
  }
  return styles
})

const linkClasses = computed(() => [
  'lcms-link__anchor',
  `lcms-link__anchor--animation-${animation.value}`,
  { 'lcms-link__anchor--icon-left': iconPosition.value === 'left' }
])
</script>

<template>
  <div class="lcms-link">
    <a
      :href="linkUrl"
      :class="linkClasses"
      :style="linkStyles"
      :target="targetBlank ? '_blank' : undefined"
      :rel="targetBlank ? 'noopener noreferrer' : undefined"
    >
      <i
        v-if="iconPosition === 'left'"
        :class="icon"
        class="lcms-link__icon lcms-link__icon--left"
      />
      <span class="lcms-link__text">{{ linkText }}</span>
      <i
        v-if="iconPosition === 'right'"
        :class="icon"
        class="lcms-link__icon lcms-link__icon--right"
      />
    </a>
  </div>
</template>
