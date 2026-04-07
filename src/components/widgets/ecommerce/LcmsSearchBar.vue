<script setup lang="ts">
/**
 * Search Bar Widget (E-commerce)
 *
 * Product search input with optional autocomplete dropdown.
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
const { client, isAvailable } = useStorefront()
const projectConfig = inject<Ref<any> | null>('lesscms-project-config', null)

const config = computed(() => props.data?.config || props.data || {})
const styleVariant = computed(() => config.value.style || 'default')
const placeholderText = computed(() =>
  extractValue(config.value.placeholder) || (props.language === 'en' ? 'Search products...' : 'Szukaj produktów...')
)

const query = ref('')
const results = ref<StorefrontProduct[]>([])
const isOpen = ref(false)
const isLoading = ref(false)
const inputEl = ref<HTMLInputElement | null>(null)
const containerEl = ref<HTMLDivElement | null>(null)

let debounceTimer: ReturnType<typeof setTimeout> | null = null

const currency = computed(() => projectConfig?.value?.commerce?.currency || 'PLN')

const productUrl = (product: StorefrontProduct) => {
  const route = projectConfig?.value?.commerce?.routes?.product || '/produkt/:slug'
  return route.replace(':slug', product.slug)
}

const searchPageUrl = computed(() => {
  return projectConfig?.value?.commerce?.routes?.search || '/szukaj'
})

watch(query, (newQuery) => {
  if (debounceTimer) clearTimeout(debounceTimer)

  if (newQuery.length < 2) {
    results.value = []
    isOpen.value = false
    return
  }

  debounceTimer = setTimeout(async () => {
    if (!client.value) return
    isLoading.value = true
    try {
      const response = await client.value.searchProducts(newQuery, { per_page: 5 })
      results.value = response.data || []
      isOpen.value = results.value.length > 0
    } catch {
      results.value = []
    } finally {
      isLoading.value = false
    }
  }, 300)
})

function handleSubmit(e: Event) {
  e.preventDefault()
  if (!query.value.trim()) return
  const url = `${searchPageUrl.value}?q=${encodeURIComponent(query.value)}`
  window.location.href = url
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
  <div ref="containerEl" class="lcms-search-bar" :class="`lcms-search-bar--${styleVariant}`">
    <form class="lcms-search-bar__form" @submit="handleSubmit">
      <div class="lcms-search-bar__input-wrap">
        <svg class="lcms-search-bar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          ref="inputEl"
          v-model="query"
          type="search"
          class="lcms-search-bar__input"
          :placeholder="placeholderText"
          autocomplete="off"
          @focus="results.length > 0 && (isOpen = true)"
        />
        <div v-if="isLoading" class="lcms-search-bar__spinner" />
      </div>
    </form>

    <div v-if="isOpen && results.length > 0" class="lcms-search-bar__dropdown">
      <a
        v-for="product in results"
        :key="product.uuid"
        :href="productUrl(product)"
        class="lcms-search-bar__result"
      >
        <img v-if="product.image" :src="product.image" :alt="product.name" class="lcms-search-bar__result-image" />
        <div class="lcms-search-bar__result-info">
          <div class="lcms-search-bar__result-name">{{ product.name }}</div>
          <div class="lcms-search-bar__result-price">{{ formatPrice(product.price, currency) }}</div>
        </div>
      </a>
    </div>
  </div>
</template>

<style scoped>
.lcms-search-bar {
  position: relative;
  width: 100%;
  font-family: var(--lcms-font-body, system-ui, sans-serif);
}

.lcms-search-bar__form {
  width: 100%;
}

.lcms-search-bar__input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.lcms-search-bar__icon {
  position: absolute;
  left: 1rem;
  width: 1.25rem;
  height: 1.25rem;
  color: var(--lcms-color-muted, #9ca3af);
  pointer-events: none;
}

.lcms-search-bar__input {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.75rem;
  background: var(--lcms-input-bg-color, var(--lcms-color-background, #ffffff));
  color: var(--lcms-input-text-color, var(--lcms-color-text, #1f2937));
  border: var(--lcms-input-border-width, 1px) var(--lcms-input-border-style, solid) var(--lcms-input-border-color, #d1d5db);
  border-radius: var(--lcms-border-radius, 0.5rem);
  font-size: var(--lcms-font-size-base, 1rem);
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.lcms-search-bar__input:focus {
  border-color: var(--lcms-input-focus-border-color, var(--lcms-color-primary, #3b82f6));
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.lcms-search-bar__input::placeholder {
  color: var(--lcms-input-placeholder-color, var(--lcms-color-muted, #9ca3af));
}

/* Style variants */
.lcms-search-bar--rounded .lcms-search-bar__input {
  border-radius: 9999px;
}

.lcms-search-bar--minimal .lcms-search-bar__input {
  background: transparent;
  border: none;
  border-bottom: 2px solid var(--lcms-color-border, #e5e7eb);
  border-radius: 0;
  padding-left: 2.5rem;
}

.lcms-search-bar--minimal .lcms-search-bar__input:focus {
  border-bottom-color: var(--lcms-color-primary, #3b82f6);
  box-shadow: none;
}

.lcms-search-bar__spinner {
  position: absolute;
  right: 1rem;
  width: 1rem;
  height: 1rem;
  border: 2px solid var(--lcms-color-border, #e5e7eb);
  border-top-color: var(--lcms-color-primary, #3b82f6);
  border-radius: 50%;
  animation: lcms-spin 0.8s linear infinite;
}

@keyframes lcms-spin {
  to { transform: rotate(360deg); }
}

.lcms-search-bar__dropdown {
  position: absolute;
  top: calc(100% + 0.25rem);
  left: 0;
  right: 0;
  background: var(--lcms-color-background, #ffffff);
  border: 1px solid var(--lcms-color-border, #e5e7eb);
  border-radius: var(--lcms-border-radius, 0.5rem);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
  z-index: 100;
  max-height: 400px;
  overflow-y: auto;
}

.lcms-search-bar__result {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  text-decoration: none;
  color: var(--lcms-color-text, #1f2937);
  border-bottom: 1px solid var(--lcms-color-border, #f3f4f6);
  transition: background 0.15s;
}

.lcms-search-bar__result:last-child {
  border-bottom: none;
}

.lcms-search-bar__result:hover {
  background: var(--lcms-color-background-alt, #f9fafb);
}

.lcms-search-bar__result-image {
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: 0.25rem;
  flex-shrink: 0;
}

.lcms-search-bar__result-info {
  flex: 1;
  min-width: 0;
}

.lcms-search-bar__result-name {
  font-size: 0.875rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lcms-search-bar__result-price {
  font-size: 0.875rem;
  color: var(--lcms-color-primary, #3b82f6);
  font-weight: 600;
  margin-top: 0.125rem;
}
</style>
