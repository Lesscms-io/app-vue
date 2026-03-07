<script setup lang="ts">
/**
 * Tabs Widget
 *
 * Renders tabbed content with configurable styles.
 */

import { ref, computed } from 'vue'
import { useLanguage } from '@/composables/useLanguage'
import type { TabsWidgetData } from '@/types/widgets'

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
  data: TabsWidgetData
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const { extractValue } = useLanguage(props.language)

const items = computed(() => {
  const raw = props.data.items
  if (!Array.isArray(raw)) return []
  return raw.map(item => ({
    title: extractValue(item.title),
    content: extractValue(item.content)
  }))
})

const activeColor = computed(() => resolveColor(props.data.active_color))
const borderColor = computed(() => resolveColor(props.data.border_color))
const tabStyle = computed(() => props.data.style || 'underline')
const alignment = computed(() => props.data.alignment || 'left')

const activeIndex = ref(0)

const tabListStyle = computed(() => {
  const styles: Record<string, string> = {}
  if (alignment.value === 'center') styles.justifyContent = 'center'
  else if (alignment.value === 'right') styles.justifyContent = 'flex-end'
  else if (alignment.value === 'stretch') styles.justifyContent = 'stretch'
  if (borderColor.value) styles.borderColor = borderColor.value
  return styles
})

const tabsContainerStyle = computed(() => {
  const styles: Record<string, string> = {}
  const hoverActive = resolveColor(props.data.hover_active_color)
  if (hoverActive) styles['--hover-active-color'] = hoverActive
  const hoverBorder = resolveColor(props.data.hover_border_color)
  if (hoverBorder) styles['--hover-border-color'] = hoverBorder
  styles['--transition-duration'] = `${props.data.transition_duration ?? 200}ms`
  return styles
})
</script>

<template>
  <div class="lcms-tabs" :class="[`lcms-tabs--${tabStyle}`, { 'has-hover': !!(data.hover_active_color || data.hover_border_color) }]" :style="tabsContainerStyle">
    <div
      class="lcms-tabs__list"
      :style="tabListStyle"
      role="tablist"
    >
      <button
        v-for="(item, index) in items"
        :key="index"
        class="lcms-tabs__tab"
        :class="{
          'lcms-tabs__tab--active': index === activeIndex,
          'lcms-tabs__tab--stretch': alignment === 'stretch'
        }"
        :style="index === activeIndex && activeColor ? { color: activeColor, borderColor: activeColor } : {}"
        role="tab"
        @click="activeIndex = index"
      >
        {{ item.title }}
      </button>
    </div>
    <div
      v-if="items[activeIndex]"
      class="lcms-tabs__content"
      role="tabpanel"
      v-html="items[activeIndex].content"
    />
  </div>
</template>

<style scoped>
.lcms-tabs__list {
  display: flex;
  gap: 0;
  border-bottom: 2px solid #e0e0e0;
  transition: border-color var(--transition-duration, 200ms) ease;
}

.lcms-tabs.has-hover:hover .lcms-tabs__list {
  border-color: var(--hover-border-color);
}

.lcms-tabs__tab {
  transition: color var(--transition-duration, 200ms) ease, border-color var(--transition-duration, 200ms) ease;
}

.lcms-tabs.has-hover:hover .lcms-tabs__tab--active {
  color: var(--hover-active-color);
  border-color: var(--hover-active-color);
}

.lcms-tabs__tab {
  padding: 10px 16px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  cursor: pointer;
  font-size: inherit;
  font-family: inherit;
  white-space: nowrap;
}

.lcms-tabs__tab--stretch {
  flex: 1;
  text-align: center;
}

.lcms-tabs__tab--active {
  font-weight: 600;
  border-bottom-color: currentColor;
}

.lcms-tabs--pills .lcms-tabs__list {
  border-bottom: none;
  gap: 4px;
}

.lcms-tabs--pills .lcms-tabs__tab {
  border-radius: 20px;
  border-bottom: none;
  margin-bottom: 0;
}

.lcms-tabs--pills .lcms-tabs__tab--active {
  background-color: currentColor;
  color: #fff;
}

.lcms-tabs--boxed .lcms-tabs__list {
  border-bottom: none;
}

.lcms-tabs--boxed .lcms-tabs__tab {
  border: 1px solid transparent;
  border-bottom: none;
  margin-bottom: 0;
  border-radius: 4px 4px 0 0;
}

.lcms-tabs--boxed .lcms-tabs__tab--active {
  border-color: #e0e0e0;
  border-bottom: 1px solid #fff;
}

.lcms-tabs__content {
  padding: 16px 0;
}
</style>
