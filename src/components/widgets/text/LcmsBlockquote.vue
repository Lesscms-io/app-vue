<script setup lang="ts">
/**
 * Blockquote Widget
 *
 * Renders a quotation with author and source attribution.
 * Element-group architecture: quote, author, source, config groups.
 */

import { computed } from 'vue'
import { useLanguage } from '@/composables/useLanguage'
import type { BlockquoteWidgetData } from '@/types/widgets'

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

defineOptions({
  inheritAttrs: false
})

interface Props {
  data: BlockquoteWidgetData
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const { extractValue } = useLanguage(props.language)

// Element-group computed refs
const quoteGroup = computed(() => props.data.quote || {})
const authorGroup = computed(() => props.data.author || {})
const sourceGroup = computed(() => props.data.source || {})
const configGroup = computed(() => props.data.config || {})

// Element-group reads
const quote = computed(() => extractValue(quoteGroup.value.html || quoteGroup.value.content))
const author = computed(() => {
  const val = authorGroup.value.html || authorGroup.value.content
  return val ? extractValue(val) : ''
})
const source = computed(() => {
  const val = sourceGroup.value.html || sourceGroup.value.content
  return val ? extractValue(val) : ''
})
const blockquoteStyle = computed(() => configGroup.value.blockquote_style || 'bordered')
const accentColor = computed(() => resolveColor(quoteGroup.value.color))

const hoverAccentColor = computed(() => resolveColor(quoteGroup.value['color:hover']))

const hasHover = computed(() => !!hoverAccentColor.value)

const blockquoteContainerStyle = computed(() => {
  const style: Record<string, string> = {}
  if (accentColor.value) style['--accent-color'] = accentColor.value

  if (hoverAccentColor.value) style['--hover-accent-color'] = hoverAccentColor.value

  return style
})
</script>

<template>
  <figure
    class="lcms-blockquote"
    :class="[`lcms-blockquote--${blockquoteStyle}`, { 'has-hover': hasHover }]"
    :style="blockquoteContainerStyle"
  >
    <blockquote class="lcms-blockquote__text">
      <i class="fa-solid fa-quote-left lcms-blockquote__icon" />
      {{ quote }}
    </blockquote>
    <figcaption
      v-if="author || source"
      class="lcms-blockquote__attribution"
    >
      <span v-if="author" class="lcms-blockquote__author">{{ author }}</span>
      <cite v-if="source" class="lcms-blockquote__source">{{ source }}</cite>
    </figcaption>
  </figure>
</template>

<style scoped>
.lcms-blockquote {
  --accent-color: var(--lcms-color-primary, #50a5f1);
  margin: 0;
  padding: 16px 0;
  transition: transform var(--transition-duration, 200ms) ease, box-shadow var(--transition-duration, 200ms) ease;
}

.lcms-blockquote--bordered {
  border-left: 4px solid var(--accent-color);
  padding-left: 20px;
  transition: border-color var(--transition-duration, 200ms) ease, transform var(--transition-duration, 200ms) ease, box-shadow var(--transition-duration, 200ms) ease;
}

.lcms-blockquote.has-hover:hover {
  --accent-color: var(--hover-accent-color);
  transform: translateY(var(--hover-lift, 0)) scale(var(--hover-scale, 1));
  box-shadow: var(--hover-shadow, none);
}

.lcms-blockquote--filled {
  background-color: var(--lcms-color-background-alt, #f8f9fa);
  border-radius: 8px;
  padding: 24px;
}

.lcms-blockquote__icon {
  color: var(--accent-color);
  opacity: 0.4;
  margin-right: 8px;
}

.lcms-blockquote__text {
  margin: 0 0 8px;
  font-size: 1.1em;
  line-height: 1.6;
}

.lcms-blockquote__attribution {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9em;
  color: var(--lcms-color-muted, #6c757d);
}

.lcms-blockquote__author {
  font-weight: 600;
}

.lcms-blockquote__source {
  font-style: italic;
}

.lcms-blockquote__source::before {
  content: '\2014  ';
}
</style>
