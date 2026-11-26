<script setup lang="ts">
import { pluralWord } from '../../../utils/pluralCount'
/**
 * Product Grid Widget (E-commerce)
 *
 * Displays products from LessCommerce in a responsive grid.
 * Sources: latest, category, featured.
 */

import { computed, ref, onMounted, onBeforeUnmount, onServerPrefetch, watch, inject, type Ref } from 'vue'
import { useLanguage } from '../../../composables/useLanguage'
import { useStorefront } from '../../../composables/useStorefront'
import { formatPrice, calculateDiscount, hasDisplayablePrice } from '../../../utils/currency'
import type { StorefrontProduct } from '../../../api/storefront'
import { readShopFilterQuery, toStorefrontFilters, SHOP_FILTER_EVENT, buildShopFilterSearch, commitShopFilterSearch } from '../../../utils/shopFilters'
import { useCart } from '../../../composables/useCart'
import LcmsSortDropdown from '../../common/LcmsSortDropdown.vue'

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
// Current path from the renderer (SSR-safe) — used for category-page context.
const routePath = inject<Ref<string> | null>('routePath', null)

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

// Category-page context: current path matches the project's category route
// (e.g. /kategoria/:slug). A grid WITHOUT an explicit source on such a page
// defaults to listing that category — this survives builder saves that strip
// widget config (the recurring "albums on a category page" failure mode).
const currentPath = computed(() => {
  const injected = routePath?.value
  if (injected) return injected
  if (typeof window === 'undefined') return ''
  return window.location.pathname
})

const categoryRoutePrefix = computed(() => {
  const route = projectConfig?.value?.commerce?.routes?.category || '/kategoria/:slug'
  return route.split(':slug')[0]
})

const categoryPageSlug = computed(() => {
  const prefix = categoryRoutePrefix.value
  const path = currentPath.value
  if (!prefix || !path.startsWith(prefix)) return ''
  return decodeURIComponent(path.slice(prefix.length).split('/')[0] || '')
})

const source = computed(() => {
  if (config.value.source) return config.value.source
  return categoryPageSlug.value ? 'category' : 'latest'
})

// ── source = 'related' ──────────────────────────────────────────────────
// Siatka powiązanych stoi na karcie produktu, więc musi wiedzieć, KTÓRY to
// produkt. Kolejność jak w LcmsProductDetail: wstrzyknięty produkt (renderer
// wypełnia go przy SSR), potem parametr trasy, na końcu segment URL-a.
const injectedProduct = inject<Ref<any> | null>('lcms-product', null)
const relatedSet = computed(() => config.value.related_set || '')
const relatedSlugUrlSegment = computed(() => Number(config.value.related_slug_url_segment ?? 1))
const relatedSourceSlug = computed(() => {
  const injected = injectedProduct?.value
  if (injected?.slug) return injected.slug

  const routeVal = resolvedRoute?.value
  if (routeVal?.params?.slug) return routeVal.params.slug

  const segments = currentPath.value.split('/').filter(Boolean)
  return decodeURIComponent(segments[relatedSlugUrlSegment.value - 1] || '')
})
// True when 'category' came from page context, not explicit config — slug
// resolution then ignores category_source (which defaults to 'static').
const contextCategoryDefault = computed(() => !config.value.source && !!categoryPageSlug.value)
const categorySourceMode = computed(() => config.value.category_source || 'static')
const categoryUrlSegment = computed(() => Number(config.value.category_url_segment ?? 1))
const resolvedCategorySlug = computed(() => {
  if (contextCategoryDefault.value) return categoryPageSlug.value
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
const enablePagination = computed(() => config.value.enable_pagination === true && source.value !== 'manual' && source.value !== 'related')
// Sort key for latest/category sources — 'manual' honors products.sort_order
// set in the PIM (unpositioned products sort last).
const sortBy = computed(() => config.value.sort_by || 'newest')

// Pasek nad listingiem: liczba wyników, sortowanie (stan w URL ?sort=, jak panel
// filtrów), przełącznik siatka/lista (URL ?view= albo localStorage) i — na
// telefonie — przycisk „Filtry” otwierający szufladę widgetu shop-filters.
const showToolbar = computed(() => config.value.show_toolbar === true)
const toolbarSort = computed(() => showToolbar.value && config.value.toolbar_sort !== false)
const toolbarView = computed(() => showToolbar.value && config.value.toolbar_view_toggle !== false)
const toolbarCount = computed(() => showToolbar.value && config.value.toolbar_count !== false)
const VIEW_KEY = 'lcms:product-view'
const view = ref<'grid' | 'list'>(config.value.default_view === 'list' ? 'list' : 'grid')
function setView(v: 'grid' | 'list') {
  view.value = v
  try { localStorage.setItem(VIEW_KEY, v) } catch { /* storage off */ }
}
const sortOptions = computed(() => [
  { value: '', label: t('sortDefault') },
  { value: 'price_asc', label: t('sortPriceAsc') },
  { value: 'price_desc', label: t('sortPriceDesc') },
  { value: 'newest', label: t('sortNewest') },
  { value: 'name_asc', label: t('sortNameAsc') },
  { value: 'name_desc', label: t('sortNameDesc') },
])
function setSort(value: string) {
  const current = new URLSearchParams(window.location.search)
  commitShopFilterSearch(buildShopFilterSearch(current, { sort: value || null }))
  urlTick.value++
}
const hasFiltersWidget = ref(false)
function openFilters() { window.dispatchEvent(new CustomEvent('lcms:shop-filters-open')) }

// Widok listy: przycisk „Do koszyka” dla produktów bez wariantów.
const cart = useCart()
const adding = ref<Record<string, 'busy' | 'done'>>({})
async function quickAdd(product: StorefrontProduct) {
  if (adding.value[product.uuid]) return
  adding.value = { ...adding.value, [product.uuid]: 'busy' }
  try {
    await cart.addItem(product.uuid, 1)
    adding.value = { ...adding.value, [product.uuid]: 'done' }
    setTimeout(() => { const { [product.uuid]: _, ...rest } = adding.value; adding.value = rest }, 2000)
  } catch {
    const { [product.uuid]: _, ...rest } = adding.value
    adding.value = rest
  }
}
function canQuickAdd(product: StorefrontProduct): boolean {
  return !product.has_children && !product.is_container && hasPrice(product)
}
function shortText(product: StorefrontProduct): string {
  // Krótki opis do widoku listy: pierwszy akapit czystego tekstu, bez nagłówków i list.
  const raw = String((product as any).short_description || (product as any).description || '')
  const firstP = raw.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1]
  const src = firstP ?? raw.split(/<h[1-6][\s>]/i)[0]
  const txt = src.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()
  return txt.length > 200 ? txt.slice(0, 197).replace(/\s+\S*$/, '') + '…' : txt
}

const currentPage = computed(() => {
  let raw = routeQuery?.value?.page
  if (raw === undefined && typeof window !== 'undefined') {
    raw = new URLSearchParams(window.location.search).get('page') ?? undefined
  }
  const n = Number(Array.isArray(raw) ? raw[0] : raw)
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1
})

// Search mode (source === 'search'): query text from ?q= — the URL the
// search-bar widget navigates to. Same route/window fallback as `page`.
const searchQuery = computed(() => {
  let raw = routeQuery?.value?.q
  if (raw === undefined && typeof window !== 'undefined') {
    raw = new URLSearchParams(window.location.search).get('q') ?? undefined
  }
  const v = Array.isArray(raw) ? raw[0] : raw
  return typeof v === 'string' ? v.trim() : ''
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

// Zachowuje pozostałe parametry (filtry sklepu, ?q=) — bez nich strona 2 gubi filtry.
const pageUrl = (page: number) => {
  const sp = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
  if (typeof window === 'undefined' && routeQuery?.value) {
    for (const [k, v] of Object.entries(routeQuery.value)) if (typeof v === 'string') sp.set(k, v)
  }
  sp.delete('page')
  if (page > 1) sp.set('page', String(page))
  const str = sp.toString()
  return str ? `?${str}` : '?'
}

// Filtry sklepu z URL (widget shop-filters). Na kliencie czytamy window, bo
// filtr zmienia URL bez nawigacji renderera; na serwerze — routeQuery.
// Bez parametrów filtrów shopFilters jest pusty i zapytania są jak dotąd.
const urlTick = ref(0)
const shopFilterState = computed(() => {
  void urlTick.value
  if (typeof window !== 'undefined') return readShopFilterQuery(new URLSearchParams(window.location.search))
  return readShopFilterQuery(routeQuery?.value ?? null)
})
const shopFilters = computed(() => {
  const { sort_by, ...rest } = toStorefrontFilters(shopFilterState.value)
  return { filters: rest as Record<string, any>, sort: sort_by as string | undefined }
})
const shopFilterKey = computed(() => JSON.stringify(shopFilters.value))
const bumpUrlTick = () => { urlTick.value++ }
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
  if (Array.isArray(val)) return val[0] ?? null
  // Atrybut tłumaczony przychodzi jako { pl: '…', en: '…' } — bierzemy język
  // strony, potem jego wersję bazową (pt-BR → pt), potem pierwszy niepusty.
  if (val && typeof val === 'object') {
    const lang = props.language || 'pl'
    const picked = val[lang] ?? val[lang.split('-')[0]]
    if (picked !== undefined && picked !== null && picked !== '') return picked
    return Object.values(val).find((v) => v !== null && v !== undefined && v !== '') ?? null
  }
  return val
}

// Base price 0 = product priced by the configurator — hide the price (and any
// discount derived from it) instead of showing "0,00 zł".
//
// Same treatment for a grouped tile whose variants disagree on price: the
// container's own price would quote one arbitrary variant, so we show nothing
// and let the product page state the real figure per variant.
function hasPrice(product: any): boolean {
  if (product?.price_varies === true) return hasDisplayablePrice(product?.price_min)
  return hasDisplayablePrice(getField(product, fieldPrice.value))
}

// Variants that disagree on price: quote the cheapest one as "od X zł"
// (price_min from the cache) rather than one arbitrary variant's price.
function priceLabel(product: any): string {
  if (product?.price_varies === true) return `${t('from')} ${formatPrice(product.price_min, currency.value)}`
  return formatPrice(getField(product, fieldPrice.value), currency.value)
}

function hasDiscount(product: any): boolean {
  return hasPrice(product) && product?.price_varies !== true && !!product.compare_at_price && product.compare_at_price > product.price
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

// Gap between tiles (px). Defaults to 12 (the old hard-coded 0.75rem) so
// existing grids look identical until the merchant changes it.
const gap = computed(() => {
  const g = Number(config.value.gap)
  return Number.isFinite(g) && g >= 0 ? g : 12
})

const gridStyle = computed(() => ({
  '--lcms-grid-cols-desktop': columns.value,
  '--lcms-grid-cols-tablet': columnsTablet.value,
  '--lcms-grid-cols-mobile': columnsMobile.value,
  '--lcms-grid-gap': `${gap.value}px`,
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
    } else if (source.value === 'search') {
      // Search-results mode: no query → empty grid (the page renders its own
      // "type something" state), non-empty → storefront full-text search.
      if (!searchQuery.value) {
        products.value = []
        paginationMeta.value = null
        return
      }
      const { q: _q, ...searchFilters } = shopFilters.value.filters
      const response = await client.value.searchProducts(searchQuery.value, {
        ...searchFilters,
        per_page: limit.value,
        ...(enablePagination.value ? { page: currentPage.value } : {}),
      })
      products.value = response.data || []
      paginationMeta.value = response.pagination || null
    } else if (source.value === 'related') {
      // Brak produktu w kontekście = pusta siatka. Cichy fallback na „latest"
      // pokazywałby przypadkowe produkty pod nagłówkiem „Podobne", co jest
      // gorsze niż brak sekcji.
      if (!relatedSourceSlug.value) {
        products.value = []
        paginationMeta.value = null
        return
      }
      const response = await client.value.getRelatedProducts(relatedSourceSlug.value, {
        ...(relatedSet.value ? { set: relatedSet.value } : {}),
        limit: limit.value,
      })
      products.value = response.data || []
      paginationMeta.value = null
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
        ...shopFilters.value.filters,
        per_page: limit.value,
        sort_by: (shopFilters.value.sort || sortBy.value) as any,
        ...(enablePagination.value ? { page: currentPage.value } : {}),
      })
      products.value = response.data || []
      paginationMeta.value = response.pagination || null
    } else {
      const response = await client.value.getProducts({
        ...shopFilters.value.filters,
        per_page: limit.value,
        sort_by: (shopFilters.value.sort || sortBy.value) as any,
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
  window.addEventListener(SHOP_FILTER_EVENT, bumpUrlTick)
  window.addEventListener('popstate', bumpUrlTick)
  if (toolbarView.value) {
    const q = new URLSearchParams(window.location.search).get('view')
    let saved: string | null = null
    try { saved = localStorage.getItem(VIEW_KEY) } catch { /* storage off */ }
    const v = q || saved
    if (v === 'list' || v === 'grid') view.value = v
  }
  hasFiltersWidget.value = !!document.querySelector('.lcms-shop-filters')
  if (isAvailable.value && products.value.length === 0 && !error.value) {
    fetchProducts()
  }
})

onBeforeUnmount(() => {
  window.removeEventListener(SHOP_FILTER_EVENT, bumpUrlTick)
  window.removeEventListener('popstate', bumpUrlTick)
})

watch([source, resolvedCategorySlug, productSlugs, limit, isAvailable, currentPage, sortBy, searchQuery, relatedSourceSlug, relatedSet, shopFilterKey], () => {
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
      searchPrompt: 'Wpisz szukaną frazę w wyszukiwarce',
      searchEmpty: 'Brak wyników dla',
      searchResults: 'Wyniki wyszukiwania dla',
      results: 'produktów', sort: 'Sortuj', sortDefault: 'Domyślnie', sortPriceAsc: 'Cena rosnąco',
      sortPriceDesc: 'Cena malejąco', sortNewest: 'Najnowsze', sortNameAsc: 'Nazwa (A–Z)', sortNameDesc: 'Nazwa (Z–A)',
      viewGrid: 'Widok siatki', viewList: 'Widok listy', filters: 'Filtry', addToCart: 'Do koszyka', added: 'Dodano',
    },
    en: {
      loading: 'Loading products...',
      empty: 'No products',
      error: 'Failed to load products',
      from: 'from',
      allProducts: 'All products',
      prevPage: 'Previous page',
      nextPage: 'Next page',
      searchPrompt: 'Type a phrase in the search bar',
      searchEmpty: 'No results for',
      searchResults: 'Search results for',
      results: 'products', sort: 'Sort by', sortDefault: 'Default', sortPriceAsc: 'Price: low to high',
      sortPriceDesc: 'Price: high to low', sortNewest: 'Newest', sortNameAsc: 'Name (A–Z)', sortNameDesc: 'Name (Z–A)',
      viewGrid: 'Grid view', viewList: 'List view', filters: 'Filters', addToCart: 'Add to cart', added: 'Added',
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

    <!-- Search mode: query + result count line above the grid -->
    <p
      v-if="source === 'search' && searchQuery && !isLoading && products.length > 0"
      class="lcms-product-grid__search-summary"
    >
      {{ t('searchResults') }} „{{ searchQuery }}"
      <span v-if="paginationMeta?.total"> ({{ paginationMeta.total }})</span>
    </p>

    <div
      v-if="showToolbar"
      class="lcms-product-grid__toolbar"
    >
      <div class="lcms-product-grid__toolbar-left">
        <button
          v-if="hasFiltersWidget"
          type="button"
          class="lcms-product-grid__filters-btn"
          @click="openFilters"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></svg>
          {{ t('filters') }}
        </button>
        <span
          v-if="toolbarCount && paginationMeta"
          class="lcms-product-grid__count"
        ><strong>{{ paginationMeta.total }}</strong> {{ pluralWord(paginationMeta.total, t('results'), language || 'pl') }}</span>
      </div>
      <div class="lcms-product-grid__toolbar-right">
        <LcmsSortDropdown
          v-if="toolbarSort"
          :label="t('sort')"
          :model-value="shopFilterState.sort || ''"
          :options="sortOptions"
          @update:model-value="setSort"
        />
        <div
          v-if="toolbarView"
          class="lcms-product-grid__view"
          role="group"
        >
          <button
            type="button"
            class="lcms-product-grid__view-btn"
            :class="{ 'is-active': view === 'grid' }"
            :aria-pressed="view === 'grid'"
            :aria-label="t('viewGrid')"
            :title="t('viewGrid')"
            @click="setView('grid')"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
          </button>
          <button
            type="button"
            class="lcms-product-grid__view-btn"
            :class="{ 'is-active': view === 'list' }"
            :aria-pressed="view === 'list'"
            :aria-label="t('viewList')"
            :title="t('viewList')"
            @click="setView('list')"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" focusable="false"><rect x="3" y="4" width="5" height="5" rx="1" /><rect x="3" y="15" width="5" height="5" rx="1" /><path d="M11 6.5h10M11 17.5h10" /></svg>
          </button>
        </div>
      </div>
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
      <template v-if="source === 'search'">
        {{ searchQuery ? `${t('searchEmpty')} „${searchQuery}"` : t('searchPrompt') }}
      </template>
      <template v-else>
        {{ t('empty') }}
      </template>
    </div>

    <div
      v-else
      class="lcms-product-grid__grid"
      :class="{ 'lcms-product-grid__grid--list': view === 'list' }"
      :style="gridStyle"
    >
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
            v-if="(product.marketing_labels && product.marketing_labels.length) || (showDiscountFallback && hasDiscount(product))"
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
              v-if="(!product.marketing_labels || product.marketing_labels.length === 0) && showDiscountFallback && hasDiscount(product)"
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
          <p
            v-if="view === 'list' && shortText(product)"
            class="lcms-product-card__excerpt"
          >
            {{ shortText(product) }}
          </p>
          <div v-if="showPrice && hasPrice(product) && view !== 'list'" class="lcms-product-card__price-wrap">
            <span
              v-if="hasDiscount(product)"
              class="lcms-product-card__price-original"
            >
              {{ formatPrice(product.compare_at_price, currency) }}
            </span>
            <span class="lcms-product-card__price">{{ priceLabel(product) }}</span>
          </div>
        </div>
        <div
          v-if="view === 'list'"
          class="lcms-product-card__actions"
        >
          <div v-if="showPrice && hasPrice(product)" class="lcms-product-card__price-wrap">
            <span v-if="hasDiscount(product)" class="lcms-product-card__price-original">{{ formatPrice(product.compare_at_price, currency) }}</span>
            <span class="lcms-product-card__price">{{ priceLabel(product) }}</span>
          </div>
          <button
            v-if="canQuickAdd(product)"
            type="button"
            class="lcms-product-card__cart-btn"
            :class="{ 'is-done': adding[product.uuid] === 'done' }"
            :disabled="adding[product.uuid] === 'busy'"
            @click.prevent.stop="quickAdd(product)"
          >
            <svg v-if="adding[product.uuid] === 'done'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M20 6 9 17l-5-5" /></svg>
            <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="9" cy="20" r="1.5" /><circle cx="18" cy="20" r="1.5" /><path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.6L21 8H6.2" /></svg>
            {{ adding[product.uuid] === 'done' ? t('added') : t('addToCart') }}
          </button>
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
  gap: var(--lcms-grid-gap, 0.75rem);
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
  gap: var(--lcms-grid-gap, 0.75rem);
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

.lcms-product-grid__search-summary {
  margin: 0 0 1rem;
  color: var(--lcms-color-muted, #6b7280);
  font-size: var(--lcms-font-size-sm, 0.875rem);
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

/* Pasek nad listingiem */
.lcms-product-grid__toolbar {
  --tb-primary: var(--lcms-color-primary, #2563eb);
  --tb-border: var(--lcms-border-color, #e5e7eb);
  display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 20px;
}
.lcms-product-grid__toolbar-left,
.lcms-product-grid__toolbar-right { display: flex; align-items: center; gap: 12px; }
.lcms-product-grid__count { font-size: 0.875rem; color: var(--lcms-muted-color, #6b7280); }
.lcms-product-grid__count strong { color: var(--tb-primary); font-weight: 700; }
.lcms-product-grid__filters-btn {
  display: none; align-items: center; gap: 8px; height: 40px; padding: 0 16px; border: 0; border-radius: 10px;
  background: var(--tb-primary); color: #fff; font: inherit; font-size: 0.875rem; font-weight: 600; cursor: pointer;
}
.lcms-product-grid__view { display: inline-flex; padding: 3px; border: 1px solid var(--tb-border); border-radius: 10px; gap: 2px; }
.lcms-product-grid__view-btn {
  display: inline-grid; place-items: center; width: 34px; height: 32px; border: 0; border-radius: 7px;
  background: none; color: var(--lcms-muted-color, #6b7280); cursor: pointer; transition: background 0.15s, color 0.15s;
}
.lcms-product-grid__view-btn:hover { color: var(--tb-primary); }
.lcms-product-grid__view-btn.is-active { background: var(--tb-primary); color: #fff; }

/* Widok listy — selektory z .lcms-product-grid i !important, żeby CSS projektu dla kart siatki nie łapał wiersza */
.lcms-product-grid .lcms-product-grid__grid--list { grid-template-columns: 1fr !important; }
.lcms-product-grid .lcms-product-grid__grid--list > .lcms-product-card {
  display: grid !important; grid-template-columns: 180px minmax(0, 1fr) auto !important; flex-direction: initial !important;
  align-items: center !important; gap: 24px !important; padding: 20px !important; text-align: left !important;
}
.lcms-product-grid .lcms-product-grid__grid--list > .lcms-product-card > .lcms-product-card__image-wrap {
  position: relative !important; width: 180px !important; height: 180px !important; aspect-ratio: 1 / 1 !important;
  margin: 0 !important; padding: 0 !important; border: 0 !important; border-radius: 10px !important;
  background: var(--lcms-color-surface, #f8f8f8) !important; overflow: hidden !important;
}
.lcms-product-grid .lcms-product-grid__grid--list > .lcms-product-card .lcms-product-card__image {
  position: absolute !important; inset: 10px !important; width: calc(100% - 20px) !important; height: calc(100% - 20px) !important;
  object-fit: contain !important; border-radius: 0 !important;
}
.lcms-product-grid .lcms-product-grid__grid--list > .lcms-product-card > .lcms-product-card__body {
  padding: 0 !important; display: flex !important; flex-direction: column !important; gap: 6px !important; min-width: 0;
}
.lcms-product-grid .lcms-product-grid__grid--list .lcms-product-card__name { min-height: 0 !important; }
.lcms-product-card__excerpt {
  margin: 2px 0 0; font-size: 0.875rem; line-height: 1.55; color: var(--lcms-muted-color, #6b7280);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.lcms-product-grid .lcms-product-grid__grid--list .lcms-product-card__actions {
  display: flex; flex-direction: column; align-items: flex-end; justify-content: center; gap: 12px; padding: 0;
}
.lcms-product-grid .lcms-product-grid__grid--list .lcms-product-card__actions .lcms-product-card__price-wrap {
  margin: 0 !important; padding: 0 !important; display: flex; flex-direction: column; align-items: flex-end; gap: 2px;
}
.lcms-product-card__cart-btn {
  display: inline-flex; align-items: center; gap: 8px; height: 42px; padding: 0 18px; border: 0; border-radius: 10px;
  background: var(--lcms-color-primary, #2563eb); color: #fff; font: inherit; font-size: 0.875rem; font-weight: 600;
  white-space: nowrap; cursor: pointer; transition: filter 0.15s;
}
.lcms-product-card__cart-btn:hover { filter: brightness(1.07); }
.lcms-product-card__cart-btn:disabled { opacity: 0.6; cursor: wait; }
.lcms-product-card__cart-btn.is-done { background: #16a34a; }

@media (max-width: 768px) {
  .lcms-product-grid__filters-btn { display: inline-flex; }
  .lcms-product-grid__count { display: none; }
  .lcms-product-grid__toolbar .lcms-sort :deep(.lcms-sort__label) { display: none; }
  .lcms-product-grid__toolbar-right :deep(.lcms-sort__button) { min-width: 0; }
  .lcms-product-grid .lcms-product-grid__grid--list > .lcms-product-card {
    grid-template-columns: 96px minmax(0, 1fr) !important; align-items: start !important; gap: 8px 14px !important; padding: 12px !important;
  }
  .lcms-product-grid .lcms-product-grid__grid--list > .lcms-product-card > .lcms-product-card__image-wrap { width: 96px !important; height: 96px !important; grid-row: span 2; }
  .lcms-product-grid .lcms-product-grid__grid--list .lcms-product-card .lcms-product-card__image { inset: 6px !important; width: calc(100% - 12px) !important; height: calc(100% - 12px) !important; }
  .lcms-product-grid .lcms-product-grid__grid--list .lcms-product-card__actions {
    grid-column: 2; flex-direction: row; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;
  }
  .lcms-product-grid .lcms-product-grid__grid--list .lcms-product-card__actions .lcms-product-card__price-wrap { align-items: flex-start; }
  .lcms-product-grid .lcms-product-grid__grid--list .lcms-product-card__cart-btn { height: 36px; padding: 0 12px; font-size: 0.8125rem; }
}
</style>
