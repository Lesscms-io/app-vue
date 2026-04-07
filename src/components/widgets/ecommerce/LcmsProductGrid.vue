<script setup lang="ts">
/**
 * Product Grid Widget (E-commerce)
 *
 * Displays products from LessCommerce in a responsive grid.
 * Sources: latest, category, featured.
 */

import { computed, ref, onMounted, watch, inject, type Ref } from 'vue'
import { useLanguage } from '../../../composables/useLanguage'
import { useStorefront } from '../../../composables/useStorefront'
import { formatPrice, calculateDiscount } from '../../../utils/currency'
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
const headingText = computed(() => extractValue(props.data?.heading?.text) || '')

const source = computed(() => config.value.source || 'latest')
const categorySlug = computed(() => config.value.category_slug || '')
const limit = computed(() => Number(config.value.limit) || 8)
const columns = computed(() => Number(config.value.columns) || 4)
const columnsTablet = computed(() => Number(config.value.columns_tablet) || 2)
const columnsMobile = computed(() => Number(config.value.columns_mobile) || 1)
const showPrice = computed(() => config.value.show_price !== false)
const showCategory = computed(() => config.value.show_category !== false)

const products = ref<StorefrontProduct[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)

const currency = computed(() => projectConfig?.value?.commerce?.currency || 'PLN')

// Resolve product detail URL using project's commerce route schema
const productUrl = (product: StorefrontProduct) => {
  // Default Polish convention: /produkt/:slug
  const route = projectConfig?.value?.commerce?.routes?.product || '/produkt/:slug'
  return route.replace(':slug', product.slug)
}

const categoryUrl = (slug: string) => {
  const route = projectConfig?.value?.commerce?.routes?.category || '/kategoria/:slug'
  return route.replace(':slug', slug)
}

const gridStyle = computed(() => ({
  '--lcms-grid-cols-desktop': columns.value,
  '--lcms-grid-cols-tablet': columnsTablet.value,
  '--lcms-grid-cols-mobile': columnsMobile.value,
} as any))

async function fetchProducts() {
  if (!client.value) {
    error.value = props.language === 'en' ? 'Commerce not configured' : 'Commerce nie jest skonfigurowany'
    return
  }

  isLoading.value = true
  error.value = null

  try {
    let response
    if (source.value === 'category' && categorySlug.value) {
      response = await client.value.getCategoryProducts(categorySlug.value, { per_page: limit.value })
    } else {
      const sortBy = source.value === 'featured' ? 'newest' : 'newest'
      response = await client.value.getProducts({ per_page: limit.value, sort_by: sortBy })
    }
    products.value = response.data || []
  } catch (err: any) {
    error.value = err.message || (props.language === 'en' ? 'Failed to load products' : 'Nie udało się załadować produktów')
    products.value = []
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  if (isAvailable.value) {
    fetchProducts()
  }
})

watch([source, categorySlug, limit, isAvailable], () => {
  if (isAvailable.value) {
    fetchProducts()
  }
})

const t = (key: string) => {
  const lang = props.language || 'pl'
  const dict: Record<string, Record<string, string>> = {
    pl: {
      loading: 'Ładowanie produktów...',
      empty: 'Brak produktów',
      error: 'Nie udało się załadować produktów',
      from: 'od',
    },
    en: {
      loading: 'Loading products...',
      empty: 'No products',
      error: 'Failed to load products',
      from: 'from',
    },
  }
  return dict[lang]?.[key] || dict.pl[key] || key
}
</script>

<template>
  <div class="lcms-product-grid">
    <h3 v-if="headingText" class="lcms-product-grid__heading">{{ headingText }}</h3>

    <div v-if="isLoading" class="lcms-product-grid__loading">
      <div v-for="i in limit" :key="i" class="lcms-product-card lcms-product-card--skeleton">
        <div class="lcms-product-card__skeleton-image" />
        <div class="lcms-product-card__skeleton-text" />
        <div class="lcms-product-card__skeleton-text lcms-product-card__skeleton-text--short" />
      </div>
    </div>

    <div v-else-if="error" class="lcms-product-grid__error">
      {{ error }}
    </div>

    <div v-else-if="products.length === 0" class="lcms-product-grid__empty">
      {{ t('empty') }}
    </div>

    <div v-else class="lcms-product-grid__grid" :style="gridStyle">
      <a
        v-for="product in products"
        :key="product.uuid"
        :href="productUrl(product)"
        class="lcms-product-card"
      >
        <div class="lcms-product-card__image-wrap">
          <img
            v-if="product.image"
            :src="product.image"
            :alt="product.name"
            class="lcms-product-card__image"
            loading="lazy"
          />
          <div v-else class="lcms-product-card__image-placeholder">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
          <span
            v-if="product.compare_at_price && product.compare_at_price > product.price"
            class="lcms-product-card__discount-badge"
          >
            -{{ calculateDiscount(product.compare_at_price, product.price) }}%
          </span>
        </div>

        <div class="lcms-product-card__body">
          <span
            v-if="showCategory && product.category"
            class="lcms-product-card__category"
            @click.prevent.stop="$event.target instanceof HTMLElement && (window.location.href = categoryUrl(product.category!.slug))"
          >
            {{ product.category.name }}
          </span>
          <h4 class="lcms-product-card__name">{{ product.name }}</h4>
          <div v-if="showPrice" class="lcms-product-card__price-wrap">
            <span
              v-if="product.compare_at_price && product.compare_at_price > product.price"
              class="lcms-product-card__price-original"
            >
              {{ formatPrice(product.compare_at_price, currency) }}
            </span>
            <span class="lcms-product-card__price">{{ formatPrice(product.price, currency) }}</span>
          </div>
        </div>
      </a>
    </div>
  </div>
</template>

<style scoped>
.lcms-product-grid {
  font-family: var(--lcms-font-body, system-ui, sans-serif);
  color: var(--lcms-color-text, #1f2937);
}

.lcms-product-grid__heading {
  font-family: var(--lcms-font-heading, var(--lcms-font-body));
  font-size: var(--lcms-h2-font-size, 1.875rem);
  font-weight: var(--lcms-h2-font-weight, 700);
  color: var(--lcms-h2-color, var(--lcms-color-text));
  margin: 0 0 var(--lcms-section-gap, 1.5rem);
  line-height: var(--lcms-h2-line-height, 1.2);
}

.lcms-product-grid__grid {
  display: grid;
  grid-template-columns: repeat(var(--lcms-grid-cols-desktop, 4), 1fr);
  gap: var(--lcms-section-gap, 1.5rem);
}

@media (max-width: 1024px) {
  .lcms-product-grid__grid {
    grid-template-columns: repeat(var(--lcms-grid-cols-tablet, 2), 1fr);
  }
}

@media (max-width: 640px) {
  .lcms-product-grid__grid {
    grid-template-columns: repeat(var(--lcms-grid-cols-mobile, 1), 1fr);
  }
}

.lcms-product-grid__loading {
  display: grid;
  grid-template-columns: repeat(var(--lcms-grid-cols-desktop, 4), 1fr);
  gap: var(--lcms-section-gap, 1.5rem);
}

.lcms-product-grid__empty,
.lcms-product-grid__error {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--lcms-color-muted, #6b7280);
  font-size: var(--lcms-font-size-base, 1rem);
}

.lcms-product-grid__error {
  color: var(--lcms-color-danger, #ef4444);
}

/* Product card */
.lcms-product-card {
  display: flex;
  flex-direction: column;
  background: var(--lcms-color-background, #ffffff);
  border-radius: var(--lcms-border-radius, 0.5rem);
  border: 1px solid var(--lcms-color-border, #e5e7eb);
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.lcms-product-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.lcms-product-card__image-wrap {
  position: relative;
  aspect-ratio: 1 / 1;
  background: var(--lcms-color-background-alt, #f9fafb);
  overflow: hidden;
}

.lcms-product-card__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.lcms-product-card__image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--lcms-color-muted, #d1d5db);
}

.lcms-product-card__image-placeholder svg {
  width: 48px;
  height: 48px;
}

.lcms-product-card__discount-badge {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: var(--lcms-color-danger, #ef4444);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
}

.lcms-product-card__body {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
}

.lcms-product-card__category {
  font-size: 0.75rem;
  color: var(--lcms-color-muted, #6b7280);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: pointer;
}

.lcms-product-card__category:hover {
  color: var(--lcms-color-primary, #3b82f6);
}

.lcms-product-card__name {
  font-family: var(--lcms-font-heading, var(--lcms-font-body));
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  line-height: 1.4;
  color: var(--lcms-color-text, #1f2937);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.lcms-product-card__price-wrap {
  margin-top: auto;
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}

.lcms-product-card__price {
  color: var(--lcms-color-primary, #3b82f6);
  font-size: 1.125rem;
  font-weight: 700;
}

.lcms-product-card__price-original {
  color: var(--lcms-color-muted, #9ca3af);
  font-size: 0.875rem;
  text-decoration: line-through;
}

/* Skeleton loading */
.lcms-product-card--skeleton {
  pointer-events: none;
}

.lcms-product-card__skeleton-image,
.lcms-product-card__skeleton-text {
  background: linear-gradient(90deg, #f3f4f6 0%, #e5e7eb 50%, #f3f4f6 100%);
  background-size: 200% 100%;
  animation: lcms-skeleton-pulse 1.5s ease-in-out infinite;
}

.lcms-product-card__skeleton-image {
  aspect-ratio: 1 / 1;
}

.lcms-product-card__skeleton-text {
  height: 1rem;
  margin: 0.75rem 1rem;
  border-radius: 0.25rem;
}

.lcms-product-card__skeleton-text--short {
  width: 60%;
  margin-bottom: 1rem;
}

@keyframes lcms-skeleton-pulse {
  0%, 100% { background-position: 200% 0; }
  50% { background-position: -200% 0; }
}
</style>
