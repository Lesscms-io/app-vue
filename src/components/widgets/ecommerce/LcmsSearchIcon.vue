<script setup lang="ts">
/**
 * Search Icon Widget (E-commerce)
 *
 * Icon trigger for product search. Two click actions:
 *   - `dropdown` — toggles inline popover with search input + autocomplete
 *   - `navigate` — opens configured URL (e.g. /search)
 */

import { computed, ref, watch, inject, onMounted, onUnmounted, type Ref } from 'vue'
import { useLanguage } from '../../../composables/useLanguage'
import { useStorefront } from '../../../composables/useStorefront'
import { formatPrice } from '../../../utils/currency'
import type { StorefrontProduct } from '../../../api/storefront'

defineOptions({ inheritAttrs: false })

interface Props {
  data: Record<string, any>
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const { extractValue } = useLanguage(props.language)
const { client } = useStorefront()
const projectConfig = inject<Ref<any> | null>('lesscms-project-config', null)

const config = computed(() => props.data?.config || {})
const iconGroup = computed(() => props.data?.icon || {})

const iconClass = computed(() => config.value.icon || 'fa-solid fa-magnifying-glass')
const iconSize = computed(() => Number(config.value.size) || 20)
const clickAction = computed(() => config.value.click_action || 'dropdown')
const navigateUrl = computed(() => config.value.navigate_url || '/search')
const placeholderText = computed(() =>
  extractValue(config.value.placeholder) || (props.language === 'en' ? 'Search products...' : 'Szukaj produktów...')
)

const query = ref('')
const results = ref<StorefrontProduct[]>([])
const isOpen = ref(false)
const isLoading = ref(false)
const containerEl = ref<HTMLDivElement | null>(null)
const inputEl = ref<HTMLInputElement | null>(null)

let debounceTimer: ReturnType<typeof setTimeout> | null = null

const currency = computed(() => projectConfig?.value?.commerce?.currency || 'PLN')

const productUrl = (product: StorefrontProduct) => {
  const route = projectConfig?.value?.commerce?.routes?.product || '/produkt/:slug'
  return route.replace(':slug', product.slug || product.sku || product.uuid)
}

const searchPageUrl = computed(() =>
  projectConfig?.value?.commerce?.routes?.search || navigateUrl.value
)

function resolveColorValue(val: string | null | undefined): string | null {
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

const cssVars = computed(() => {
  const vars: Record<string, string> = {
    '--lcms-search-icon-size': `${iconSize.value}px`
  }
  const c = resolveColorValue(iconGroup.value.color)
  const ch = resolveColorValue(iconGroup.value['color:hover'])
  if (c) vars['--lcms-search-icon-color'] = c
  if (ch) vars['--lcms-search-icon-color-hover'] = ch
  return vars
})

watch(query, (newQuery) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  if (newQuery.length < 2) {
    results.value = []
    return
  }
  debounceTimer = setTimeout(async () => {
    if (!client.value) return
    isLoading.value = true
    try {
      const response = await client.value.searchProducts(newQuery, { per_page: 5 })
      results.value = response.data || []
    } catch {
      results.value = []
    } finally {
      isLoading.value = false
    }
  }, 300)
})

function handleTriggerClick(e: MouseEvent) {
  if (clickAction.value === 'navigate') {
    window.location.href = navigateUrl.value
    return
  }
  e.stopPropagation()
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    requestAnimationFrame(() => inputEl.value?.focus())
  }
}

function handleSubmit(e: Event) {
  e.preventDefault()
  if (!query.value.trim()) return
  window.location.href = `${searchPageUrl.value}?q=${encodeURIComponent(query.value)}`
}

function handleClickOutside(e: MouseEvent) {
  if (containerEl.value && !containerEl.value.contains(e.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => {
  if (typeof document !== 'undefined') {
    document.addEventListener('click', handleClickOutside)
  }
})

onUnmounted(() => {
  if (typeof document !== 'undefined') {
    document.removeEventListener('click', handleClickOutside)
  }
  if (debounceTimer) clearTimeout(debounceTimer)
})
</script>

<template>
  <div ref="containerEl" class="lcms-search-icon" :style="cssVars">
    <button
      type="button"
      class="lcms-search-icon__trigger"
      :aria-label="placeholderText"
      @click="handleTriggerClick"
    >
      <i :class="iconClass" class="lcms-search-icon__i" />
    </button>

    <div v-if="isOpen && clickAction === 'dropdown'" class="lcms-search-icon__dropdown" @click.stop>
      <form class="lcms-search-icon__form" @submit="handleSubmit">
        <input
          ref="inputEl"
          v-model="query"
          type="search"
          class="lcms-search-icon__input"
          :placeholder="placeholderText"
        >
        <button type="submit" class="lcms-search-icon__submit" :aria-label="placeholderText">
          <i :class="iconClass" />
        </button>
      </form>

      <div v-if="isLoading" class="lcms-search-icon__state">
        <span>...</span>
      </div>

      <div v-else-if="results.length > 0" class="lcms-search-icon__results">
        <a
          v-for="product in results"
          :key="product.uuid"
          :href="productUrl(product)"
          class="lcms-search-icon__result"
        >
          <img v-if="product.image" :src="product.image" :alt="product.name">
          <div class="lcms-search-icon__result-info">
            <div class="lcms-search-icon__result-name">{{ product.name }}</div>
            <div class="lcms-search-icon__result-price">
              {{ formatPrice(product.price, currency) }}
            </div>
          </div>
        </a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lcms-search-icon {
  position: relative;
  display: inline-block;
  font-family: var(--lcms-font-body, system-ui, sans-serif);
}

.lcms-search-icon__trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 0.625rem;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--lcms-search-icon-color, var(--lcms-color-text, #1f2937));
  transition: color 0.15s;
}

.lcms-search-icon__trigger:hover {
  color: var(--lcms-search-icon-color-hover, var(--lcms-color-primary, #3b82f6));
}

.lcms-search-icon__i {
  font-size: var(--lcms-search-icon-size, 20px);
  line-height: 1;
}

.lcms-search-icon__dropdown {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  width: 22rem;
  background: var(--lcms-color-background, #ffffff);
  border: 1px solid var(--lcms-color-border, #e5e7eb);
  border-radius: var(--lcms-border-radius, 0.5rem);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  overflow: hidden;
}

.lcms-search-icon__form {
  display: flex;
  align-items: center;
  padding: 0.5rem;
  border-bottom: 1px solid var(--lcms-color-border, #e5e7eb);
  gap: 0.5rem;
}

.lcms-search-icon__input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  padding: 0.5rem 0.75rem;
  font: inherit;
  color: var(--lcms-color-text, #1f2937);
  background: transparent;
}

.lcms-search-icon__submit {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--lcms-color-muted, #6b7280);
  padding: 0.5rem;
}

.lcms-search-icon__submit:hover {
  color: var(--lcms-color-primary, #3b82f6);
}

.lcms-search-icon__state {
  padding: 1rem;
  text-align: center;
  color: var(--lcms-color-muted, #6b7280);
  font-size: 0.875rem;
}

.lcms-search-icon__results {
  max-height: 320px;
  overflow-y: auto;
}

.lcms-search-icon__result {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 0.75rem;
  text-decoration: none;
  color: inherit;
  border-bottom: 1px solid var(--lcms-color-border, #f3f4f6);
}

.lcms-search-icon__result:last-child {
  border-bottom: none;
}

.lcms-search-icon__result:hover {
  background: var(--lcms-color-background-alt, #f9fafb);
}

.lcms-search-icon__result img {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 0.25rem;
  flex-shrink: 0;
}

.lcms-search-icon__result-info {
  flex: 1;
  min-width: 0;
}

.lcms-search-icon__result-name {
  font-size: 0.875rem;
  color: var(--lcms-color-text, #1f2937);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lcms-search-icon__result-price {
  font-size: 0.75rem;
  color: var(--lcms-color-muted, #6b7280);
}
</style>
