<template>
  <div class="lcms-icon-list-item" :class="{ 'has-hover': hasItemHover }" :style="itemStyle">
    <div class="lcms-icon-list-item__icon" :style="iconStyles">
      <i :class="iconClass" />
    </div>
    <span class="lcms-icon-list-item__text" :style="textStyles">{{ textValue }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useLanguage } from '@/composables/useLanguage'

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
  data: Record<string, any>
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const { extractValue } = useLanguage(props.language)

// Element-group computed refs
const iconGroup = computed(() => props.data.icon || {})
const textGroup = computed(() => props.data.text || {})
const item_styleGroup = computed(() => props.data.item_style || {})

// Icon group reads
const iconClass = computed(() => iconGroup.value.icon || 'fa-solid fa-circle')
const iconColor = computed(() => resolveColor(iconGroup.value.color))
const iconHoverColor = computed(() => resolveColor(iconGroup.value['color:hover']))
const iconSize = computed(() => iconGroup.value.size || 'md')

// Text group reads
const textValue = computed(() => extractValue(textGroup.value.content))
const textSize = computed(() => textGroup.value.size || 'md')

// Item style group reads
const itemBgColor = computed(() => resolveColor(item_styleGroup.value.background))
const itemHoverBgColor = computed(() => resolveColor(item_styleGroup.value['background:hover']))

const iconSizeMap: Record<string, string> = { sm: '16px', md: '24px', lg: '32px' }
const textSizeMap: Record<string, string> = { sm: '0.875rem', md: '1rem', lg: '1.125rem' }

const hasItemHover = computed(() => !!(iconHoverColor.value || itemHoverBgColor.value))

const iconStyles = computed(() => {
  const styles: Record<string, string> = {}
  if (iconColor.value) styles.color = iconColor.value
  const sz = iconSizeMap[iconSize.value]
  if (sz) styles.fontSize = sz
  if (iconHoverColor.value) styles['--hover-icon-color'] = iconHoverColor.value
  return styles
})

const textStyles = computed(() => {
  const styles: Record<string, string> = {}
  const sz = textSizeMap[textSize.value]
  if (sz) styles.fontSize = sz
  return styles
})

const itemStyle = computed(() => {
  const styles: Record<string, string> = {}
  if (itemBgColor.value) {
    styles.backgroundColor = itemBgColor.value
    styles.padding = '10px 14px'
    styles.borderRadius = '6px'
  }
  if (itemHoverBgColor.value) styles['--hover-item-bg'] = itemHoverBgColor.value
  return styles
})
</script>

<style scoped>
.lcms-icon-list-item {
  display: flex;
  align-items: center;
  gap: 12px;
  transition: background-color 200ms ease, transform 200ms ease, box-shadow 200ms ease;
}

.lcms-icon-list-item.has-hover:hover {
  background-color: var(--hover-item-bg) !important;
}

.lcms-icon-list-item__icon {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: color 200ms ease;
}

.lcms-icon-list-item.has-hover:hover .lcms-icon-list-item__icon {
  color: var(--hover-icon-color) !important;
}

.lcms-icon-list-item__text {
  flex: 1;
}
</style>
