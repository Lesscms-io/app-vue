<script setup lang="ts">
/**
 * Blockquote Widget
 *
 * Renders a quotation with author and source attribution.
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

const quote = computed(() => extractValue(props.data.quote))
const author = computed(() => props.data.author ? extractValue(props.data.author) : '')
const source = computed(() => props.data.source ? extractValue(props.data.source) : '')
const blockquoteStyle = computed(() => props.data.style || 'simple')
const accentColor = computed(() => resolveColor(props.data.accent_color))

const blockquoteContainerStyle = computed(() => {
  const style: Record<string, string> = {}
  if (accentColor.value) style['--accent-color'] = accentColor.value
  const hoverAccent = resolveColor(props.data.hover_accent_color)
  if (hoverAccent) style['--hover-accent-color'] = hoverAccent
  style['--transition-duration'] = `${props.data.transition_duration ?? 200}ms`
  return style
})
</script>

<template>
  <figure
    class="lcms-blockquote"
    :class="[`lcms-blockquote--${blockquoteStyle}`, { 'has-hover': !!data.hover_accent_color }]"
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
  --accent-color: #50a5f1;
  margin: 0;
  padding: 16px 0;
}

.lcms-blockquote--bordered {
  border-left: 4px solid var(--accent-color);
  padding-left: 20px;
  transition: border-color var(--transition-duration, 200ms) ease;
}

.lcms-blockquote.has-hover:hover {
  --accent-color: var(--hover-accent-color);
}

.lcms-blockquote--filled {
  background-color: #f8f9fa;
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
  color: #6c757d;
}

.lcms-blockquote__author {
  font-weight: 600;
}

.lcms-blockquote__source {
  font-style: italic;
}

.lcms-blockquote__source::before {
  content: '— ';
}
</style>
