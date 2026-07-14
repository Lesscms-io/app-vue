<script setup lang="ts">
/**
 * Product Grid Widget (E-commerce)
 *
 * Displays products from LessCommerce in a responsive grid.
 * Sources: latest, category, featured.
 */

import { computed, ref, onMounted, onServerPrefetch, watch, inject, type Ref } from 'vue'
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
// SSR-safe route params from the renderer — window is unavailable on the
// server, so URL-driven category resolution must go through this first.
const resolvedRoute = inject<Ref<{ params?: Record<string, string> } | null> | null>('routeParams', null)
// Query string from the renderer (?page=N) — same SSR reasoning as above.
const routeQuery = inject<Ref<Record<string, any>> | null>('routeQuery', null)

const config = computed(() => props.data?.config || props.data || {})
const headingText = computed(() => extractValue(props.data?.heading?.text) || '')
const subtitleText = computed(() => extractValue(props.data?.subtitle?.text) || '')
const seeAllText = computed(() => extractValue(props.data?.see_all?.text) || '')
const seeAllUrl = computed(() => props.data?.see_all?.url || '')
const showSeeAll = computed(() => !!(seeAllUrl.value && seeAllText.value))
// Kafel "wszystkie produkty" na końcu siatki; URL spada na link z "Zobacz wszystkie"
const allTileUrl = computed(() => props.data?.all_tile?.url || seeAllUrl.value || '')
const allTileText = computed(() => extractValue(props.data?.all_tile?.text) || t('allProducts'))
const showAllTile = computed(() => props.data?.all_tile?.enabled === true && !!allTileUrl.value)
const showDiscountFallback = computed(() => config.value.show_discount_badge !== false)

const source = computed(() => config.value.source || 'latest')
const categorySourceMode = computed(() => config.value.category_source || 'static')
const categoryUrlSegment = computed(() => Number(config.value.category_url_segment ?? 1))
const resolvedCategorySlug = computed(() => {
  if (categorySourceMode.value === 'url') {
    const routeVal = resolvedRoute?.value
    if (routeVal?.params?.slug) return routeVal.params.slug
    if (typeof window === 'undefined') return ''
    const segments = window.location.pathname.split('/').filter(Boolean)
    return segments[categoryUrlSegment.value] || ''
  }
  return config.value.category_slug || ''
})
const productSlugs = computed(() => {
  const raw = config.value.product_slugs || ''
  return String(raw)
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
})
const limit = computed(() => Number(config.value.limit) || 8)
const enablePagination = computed(() => config.value.enable_pagination === true && source.value !== 'manual')
// Sort key for latest/category sources — 'manual' honors products.sort_order
// set in the PIM (unpositioned products sort last).
const sortBy = computed(() => config.value.sort_by || 'newest')

const currentPage = computed(() => {
  let raw = routeQuery?.value?.page
  if (raw === undefined && typeof window !== 'undefined') {
    raw = new URLSearchParams(window.location.search).get('page') ?? undefined
  }
  const n = Number(Array.isArray(raw) ? raw[0] : raw)
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1
})

const paginationMeta = ref<{ current_page: number; last_page: number; total: number } | null>(null)

// Windowed page list: 1 … (p-1) p (p+1) … last, null = ellipsis.
const pageItems = computed<(number | null)[]>(() => {
  const last = paginationMeta.value?.last_page || 1
  const cur = Math.min(currentPage.value, last)
  const pages = new Set<number>([1, last, cur - 1, cur, cur + 1].filter((p) => p >= 1 && p <= last))
  const sorted = [...pages].sort((a, b) => a - b)
  const items: (number | null)[] = []
  let prev = 0
  for (const p of sorted) {
    if (prev && p - prev > 1) items.push(null)
    items.push(p)
    prev = p
  }
  return items
})

const pageUrl = (page: number) => (page <= 1 ? '?' : `?page=${page}`)
const columns = computed(() => Number(config.value.columns) || 4)
const columnsTablet = computed(() => Number(config.value.columns_tablet) || 2)
const columnsMobile = computed(() => Number(config.value.columns_mobile) || 1)
const showPrice = computed(() => config.value.show_price !== false)
const showCategory = computed(() => config.value.show_category !== false)

// Field mapping — `image` in the storefront cache is already resolved by
// the backend via Product::effective_thumbnail (own column → parent's →
// template.main_image_attribute_code). No per-template detection here.
const fieldImage = computed(() => config.value.field_image || 'image')
const fieldName = computed(() => config.value.field_name || 'name')
const fieldPrice = computed(() => config.value.field_price || 'price')
const fieldCategory = computed(() => config.value.field_category || 'category.name')
const fieldDescription = computed(() => config.value.field_description || '')

function getField(product: any, path: string): any {
  if (!path) return null
  const val = path.split('.').reduce((obj: any, key: string) => obj?.[key], product)
  return Array.isArray(val) ? val[0] ?? null : val
}

function labelText(label: any): string {
  const lang = props.language || 'pl'
  return label?.text_translation?.[lang] || label?.text || ''
}

function labelStyle(label: any): Record<string, string> {
  const style: Record<string, string> = {}
  if (label?.background_color) style.background = label.background_color
  if (label?.text_color) style.color = label.text_color
  return style
}

const products = ref<StorefrontProduct[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)

const currency = computed(() => projectConfig?.value?.commerce?.currency || 'PLN')

// Resolve product detail URL using project's commerce route schema
const productUrl = (product: StorefrontProduct) => {
  const route = projectConfig?.value?.commerce?.routes?.product || '/produkt/:slug'
  const identifier = product.slug || product.sku || product.uuid
  return route.replace(':slug', identifier)
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
    if (source.value === 'manual') {
      // Manual curation: fetch each product by slug, preserve order, drop missing
      const slugs = productSlugs.value
      if (slugs.length === 0) {
        products.value = []
      } else {
        const results = await Promise.all(
          slugs.map((slug) =>
            client.value!.getProduct(slug).then((r) => r.data).catch(() => null)
          )
        )
        products.value = results.filter((p): p is StorefrontProduct => p !== null)
      }
    } else if (source.value === 'category') {
      // No resolvable category (e.g. slug missing from the URL) renders an
      // empty grid — silently falling back to "latest" masked misconfigured
      // category pages with unrelated products.
      if (!resolvedCategorySlug.value) {
        products.value = []
        paginationMeta.value = null
        return
      }
      const response = await client.value.getCategoryProducts(resolvedCategorySlug.value, {
        per_page: limit.value,
        sort_by: sortBy.value as any,
        ...(enablePagination.value ? { page: currentPage.value } : {}),
      })
      products.value = response.data || []
      paginationMeta.value = response.pagination || null
    } else {
      const response = await client.value.getProducts({
        per_page: limit.value,
        sort_by: sortBy.value as any,
        ...(enablePagination.value ? { page: currentPage.value } : {}),
      })
      products.value = response.data || []
      paginationMeta.value = response.pagination || null
    }
  } catch (err: any) {
    error.value = err.message || (props.language === 'en' ? 'Failed to load products' : 'Nie udało się załadować produktów')
    products.value = []
  } finally {
    isLoading.value = false
  }
}

// SSR: fetch products before render so they appear in the initial HTML
onServerPrefetch(async () => {
  if (isAvailable.value) {
    await fetchProducts()
  }
})

// Client: fetch on mount only if SSR didn't already load products
onMounted(() => {
  if (isAvailable.value && products.value.length === 0 && !error.value) {
    fetchProducts()
  }
})

watch([source, resolvedCategorySlug, productSlugs, limit, isAvailable, currentPage, sortBy], () => {
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
      allProducts: 'Wszystkie produkty',
      prevPage: 'Poprzednia strona',
      nextPage: 'Następna strona',
    },
    en: {
      loading: 'Loading products...',
      empty: 'No products',
      error: 'Failed to load products',
      from: 'from',
      allProducts: 'All products',
      prevPage: 'Previous page',
      nextPage: 'Next page',
    },
  }
  return dict[lang]?.[key] || dict.pl[key] || key
}
</script>

<template>
  <div class="lcms-product-grid">
    <div
      v-if="headingText || subtitleText || showSeeAll"
      class="lcms-product-grid__header"
    >
      <div class="lcms-product-grid__header-text">
        <h3 v-if="headingText" class="lcms-product-grid__heading">{{ headingText }}</h3>
        <p v-if="subtitleText" class="lcms-product-grid__subtitle">{{ subtitleText }}</p>
      </div>
      <a
        v-if="showSeeAll"
        :href="seeAllUrl"
        class="lcms-product-grid__see-all"
      >
        {{ seeAllText }}
      </a>
    </div>

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
            v-if="getField(product, fieldImage)"
            :src="getField(product, fieldImage)"
            :alt="getField(product, fieldName) || product.name"
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
          <div
            v-if="(product.marketing_labels && product.marketing_labels.length) || (showDiscountFallback && product.compare_at_price && product.compare_at_price > product.price)"
            class="lcms-product-card__labels"
          >
            <span
              v-for="label in (product.marketing_labels || [])"
              :key="label.uuid"
              class="lcms-product-card__label"
              :style="labelStyle(label)"
            >
              {{ labelText(label) }}
            </span>
            <span
              v-if="(!product.marketing_labels || product.marketing_labels.length === 0) && showDiscountFallback && product.compare_at_price && product.compare_at_price > product.price"
              class="lcms-product-card__label lcms-product-card__label--discount"
            >
              -{{ calculateDiscount(product.compare_at_price, product.price) }}%
            </span>
          </div>
        </div>

        <div class="lcms-product-card__body">
          <span
            v-if="showCategory && getField(product, fieldCategory)"
            class="lcms-product-card__category"
            @click.prevent.stop="product.category && $event.target instanceof HTMLElement && (window.location.href = categoryUrl(product.category!.slug))"
          >
            {{ getField(product, fieldCategory) }}
          </span>
          <h4 class="lcms-product-card__name">{{ getField(product, fieldName) || product.name }}</h4>
          <p v-if="fieldDescription && getField(product, fieldDescription)" class="lcms-product-card__description">
            {{ getField(product, fieldDescription) }}
          </p>
          <div v-if="showPrice && getField(product, fieldPrice) != null" class="lcms-product-card__price-wrap">
            <span
              v-if="product.compare_at_price && product.compare_at_price > product.price"
              class="lcms-product-card__price-original"
            >
              {{ formatPrice(product.compare_at_price, currency) }}
            </span>
            <span class="lcms-product-card__price">{{ formatPrice(getField(product, fieldPrice), currency) }}</span>
          </div>
        </div>
      </a>

      <a
        v-if="showAllTile"
        :href="allTileUrl"
        class="lcms-product-card lcms-product-card--all"
      >
        <span class="lcms-product-card__all-text">{{ allTileText }}</span>
        <svg
          class="lcms-product-card__all-arrow"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </a>
    </div>

    <!-- Pagination — plain ?page=N links so every page is SSR-rendered
         (and CF-cacheable per URL). Hidden when everything fits one page. -->
    <nav
      v-if="enablePagination && paginationMeta && paginationMeta.last_page > 1"
      class="lcms-product-grid__pagination"
      aria-label="Pagination"
    >
      <a
        v-if="currentPage > 1"
        :href="pageUrl(currentPage - 1)"
        class="lcms-product-grid__page lcms-product-grid__page--nav"
        :aria-label="t('prevPage')"
      >‹</a>
      <template v-for="(item, idx) in pageItems" :key="idx">
        <span v-if="item === null" class="lcms-product-grid__page-ellipsis">…</span>
        <a
          v-else
          :href="pageUrl(item)"
          class="lcms-product-grid__page"
          :class="{ 'lcms-product-grid__page--current': item === Math.min(currentPage, paginationMeta.last_page) }"
          :aria-current="item === currentPage ? 'page' : undefined"
        >{{ item }}</a>
      </template>
      <a
        v-if="currentPage < paginationMeta.last_page"
        :href="pageUrl(currentPage + 1)"
        class="lcms-product-grid__page lcms-product-grid__page--nav"
        :aria-label="t('nextPage')"
      >›</a>
    </nav>
  </div>
</template>

<style scoped>
.lcms-product-grid {
  font-family: var(--lcms-font-body, system-ui, sans-serif);
  color: var(--lcms-color-text, #1f2937);
}

.lcms-product-grid__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: var(--lcms-section-gap, 1.5rem);
}

.lcms-product-grid__header-text {
  flex: 1;
  min-width: 0;
}

.lcms-product-grid__heading {
  font-family: var(--lcms-font-heading, var(--lcms-font-body));
  font-size: var(--lcms-h2-font-size, 1.875rem);
  font-weight: var(--lcms-h2-font-weight, 700);
  color: var(--lcms-h2-color, var(--lcms-color-text));
  margin: 0;
  line-height: var(--lcms-h2-line-height, 1.2);
}

.lcms-product-grid__subtitle {
  margin: 0.375rem 0 0;
  color: var(--lcms-color-muted, #6b7280);
  font-size: 0.9375rem;
  line-height: 1.5;
}

.lcms-product-grid__see-all {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 1rem;
  border: 1px solid var(--lcms-color-border, #e5e7eb);
  border-radius: var(--lcms-btn-border-radius, var(--lcms-border-radius, 0.375rem));
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--lcms-color-text, #1f2937);
  text-decoration: none;
  background: transparent;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.lcms-product-grid__see-all:hover {
  background: var(--lcms-color-background-alt, #f9fafb);
  border-color: var(--lcms-color-text, #1f2937);
}

.lcms-product-grid__pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.375rem;
  margin-top: var(--lcms-section-gap, 1.5rem);
  flex-wrap: wrap;
}

.lcms-product-grid__page {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2.25rem;
  height: 2.25rem;
  padding: 0 0.5rem;
  border: 1px solid var(--lcms-color-border, #e5e7eb);
  border-radius: var(--lcms-btn-border-radius, var(--lcms-border-radius, 0.375rem));
  color: var(--lcms-color-text, #1f2937);
  font-size: 0.9375rem;
  text-decoration: none;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.lcms-product-grid__page:hover {
  background: var(--lcms-color-background-alt, #f9fafb);
  border-color: var(--lcms-color-text, #1f2937);
}

.lcms-product-grid__page--current {
  background: var(--lcms-color-primary, #3b82f6);
  border-color: var(--lcms-color-primary, #3b82f6);
  color: var(--lcms-color-white, #fff);
  pointer-events: none;
}

.lcms-product-grid__page-ellipsis {
  color: var(--lcms-color-muted, #6b7280);
  padding: 0 0.25rem;
}

@media (max-width: 640px) {
  .lcms-product-grid__header {
    flex-direction: column;
    align-items: stretch;
  }
  .lcms-product-grid__see-all {
    align-self: flex-start;
  }
}

.lcms-product-grid__grid {
  display: grid;
  grid-template-columns: repeat(var(--lcms-grid-cols-desktop, 4), 1fr);
  gap: 0.75rem;
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
  gap: 0.75rem;
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
  background: #ffffff;
  border: 1px solid var(--lcms-color-border, #e5e7eb);
  border-radius: 12px;
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  transition: box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease;
}

.lcms-product-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  border-color: var(--lcms-color-border-strong, #d1d5db);
  transform: translateY(-2px);
}

.lcms-product-card--all {
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  min-height: 220px;
  background: var(--lcms-color-surface, #f9fafb);
  border-style: dashed;
  font-weight: 600;
  color: var(--lcms-color-primary, #3b82f6);
}

.lcms-product-card--all:hover .lcms-product-card__all-arrow {
  transform: translateX(4px);
}

.lcms-product-card__all-text {
  font-size: 1rem;
  text-align: center;
  padding: 0 1rem;
}

.lcms-product-card__all-arrow {
  width: 24px;
  height: 24px;
  transition: transform 0.2s ease;
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

.lcms-product-card__labels {
  position: absolute;
  top: 0.625rem;
  left: 0.625rem;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.375rem;
  pointer-events: none;
  z-index: 1;
}

.lcms-product-card__label {
  display: inline-block;
  padding: 0.25rem 0.625rem;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  border-radius: 4px;
  background: var(--lcms-color-primary, #3b82f6);
  color: var(--lcms-color-white, #fff);
  line-height: 1.2;
}

.lcms-product-card__label--discount {
  background: var(--lcms-color-danger, #ef4444);
}

.lcms-product-card__body {
  padding: 1.25rem;
  background: #ffffff;
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
  font-weight: 700;
  margin: 0;
  line-height: 1.35;
  color: var(--lcms-color-text, #1f2937);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.lcms-product-card__description {
  font-size: 0.875rem;
  color: var(--lcms-color-muted, #6b7280);
  margin: 0;
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
  font-size: 1.25rem;
  font-weight: 800;
}

.lcms-product-card__price-original {
  color: var(--lcms-color-muted, #9ca3af);
  font-size: 0.875rem;
  text-decoration: line-through;
  font-weight: 500;
}

/* Skeleton loading */
.lcms-product-card--skeleton {
  pointer-events: none;
}

.lcms-product-card__skeleton-image,
.lcms-product-card__skeleton-text {
  background: linear-gradient(90deg, var(--lcms-color-background-alt, #f3f4f6) 0%, var(--lcms-color-border, #e5e7eb) 50%, var(--lcms-color-background-alt, #f3f4f6) 100%);
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
