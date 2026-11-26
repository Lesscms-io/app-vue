<script setup lang="ts">
import { pluralWord } from '../../../utils/pluralCount'
/**
 * Shop Filters Widget (E-commerce)
 *
 * Filtry listingu sklepu: wyszukiwarka, kategorie z licznikami, cena,
 * atrybuty (wg typu), sortowanie, chipy aktywnych filtrów.
 * Tryb `sidebar` (lewa kolumna) albo `bar` (poziomy pasek rozwijanych sekcji).
 * Stan żyje w URL (parametry query, patrz utils/shopFilters.ts); LcmsProductGrid
 * czyta te same parametry i przelicza listing.
 */

import { computed, inject, onBeforeUnmount, onMounted, onServerPrefetch, ref, watch, type Ref } from 'vue'
import { useLanguage } from '../../../composables/useLanguage'
import { useStorefront } from '../../../composables/useStorefront'
import LcmsSortDropdown from '../../common/LcmsSortDropdown.vue'
import type { StorefrontCategory, StorefrontSearchFacets, StorefrontFacetFilter } from '../../../api/storefront'
import {
  readShopFilterQuery,
  useShopFilterDefaults,
  toStorefrontFilters,
  hasActiveShopFilters,
  buildShopFilterSearch,
  clearShopFilterKeys,
  commitShopFilterSearch,
  SHOP_FILTER_EVENT,
  type ShopFilterState,
} from '../../../utils/shopFilters'

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
const routeQuery = inject<Ref<Record<string, any>> | null>('routeQuery', null)
const routePath = inject<Ref<string> | null>('routePath', null)

const configGroup = computed<Record<string, any>>(() => props.data?.config || {})
const labelsGroup = computed<Record<string, any>>(() => props.data?.labels || {})
const mode = computed<'sidebar' | 'bar'>(() => (configGroup.value.mode === 'bar' ? 'bar' : 'sidebar'))
const showSearch = computed(() => configGroup.value.show_search !== false)
const showCategories = computed(() => configGroup.value.show_categories !== false)
const showPrice = computed(() => configGroup.value.show_price !== false)
const showInStock = computed(() => configGroup.value.show_in_stock !== false)
// Domyślnie tylko dostępne: brak parametru in_stock w URL = wartość z ustawień, wyłączenie = in_stock=0.
const inStockDefault = computed(() => configGroup.value.in_stock_default !== false)
const shopDefaults = useShopFilterDefaults()
shopDefaults.inStock = inStockDefault.value
watch(inStockDefault, (v) => { shopDefaults.inStock = v })
const showAttributes = computed(() => configGroup.value.show_attributes !== false)
const showSort = computed(() => configGroup.value.show_sort !== false)
const showChips = computed(() => configGroup.value.show_chips !== false)
const showResultsCount = computed(() => configGroup.value.show_results_count !== false)
// Grupy domyślnie zwinięte; rozwinięte tylko te z aktywnym filtrem.
const defaultCollapsed = computed(() => configGroup.value.default_collapsed !== false)
const allProductsUrl = computed(() => String(configGroup.value.all_products_url || '/sklep'))
const visibleLimit = computed(() => {
  const n = Number(configGroup.value.attr_visible_limit)
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 8
})

// Etykiety (wielojęzyczne) — jawny dostęp do każdego pola, bo edytor czyta je po kluczu.
const labelOverrides = computed<Record<string, any>>(() => ({
  title: labelsGroup.value.title,
  filters_button: labelsGroup.value.filters_button,
  clear: labelsGroup.value.clear,
  sort: labelsGroup.value.sort,
  search_placeholder: labelsGroup.value.search_placeholder,
  categories: labelsGroup.value.categories,
  price: labelsGroup.value.price,
  attributes: labelsGroup.value.attributes,
  show_more: labelsGroup.value.show_more,
  results: labelsGroup.value.results,
  apply: labelsGroup.value.apply,
}))

const DEFAULT_LABELS: Record<string, Record<string, string>> = {
  pl: {
    title: 'Filtry', filters_button: 'Filtry', clear: 'Wyczyść', sort: 'Sortowanie',
    search_placeholder: 'Szukaj produktów...', categories: 'Kategorie', price: 'Cena',
    attributes: 'Atrybuty', show_more: 'Pokaż więcej', results: 'wyników', apply: 'Zastosuj',
    close: 'Zamknij', from: 'Od', to: 'Do', in_stock: 'Tylko dostępne', availability: 'Dostępność', include_unavailable: 'Także niedostępne', default_sort: 'Domyślne',
    price_asc: 'Cena rosnąco', price_desc: 'Cena malejąco', newest: 'Najnowsze', name_asc: 'Nazwa (A–Z)',
    name_desc: 'Nazwa (Z–A)', show_less: 'Pokaż mniej', yes: 'Tak', no: 'Nie', currency_suffix: 'zł', all_products: 'Wszystkie produkty',
  },
  en: {
    title: 'Filters', filters_button: 'Filters', clear: 'Clear', sort: 'Sort by',
    search_placeholder: 'Search products...', categories: 'Categories', price: 'Price',
    attributes: 'Attributes', show_more: 'Show more', results: 'results', apply: 'Apply',
    close: 'Close', from: 'From', to: 'To', in_stock: 'In stock only', availability: 'Availability', include_unavailable: 'Including out of stock', default_sort: 'Default',
    price_asc: 'Price: low to high', price_desc: 'Price: high to low', newest: 'Newest', name_asc: 'Name (A–Z)',
    name_desc: 'Name (Z–A)', show_less: 'Show less', yes: 'Yes', no: 'No', currency_suffix: '', all_products: 'All products',
  },
}

function t(key: string): string {
  const lang = props.language || 'pl'
  const custom = extractValue(labelOverrides.value[key])
  if (custom) return String(custom)
  return DEFAULT_LABELS[lang]?.[key] || DEFAULT_LABELS.pl[key] || key
}

// ── URL state ───────────────────────────────────────────────────────────
const urlTick = ref(0)
const state = computed<ShopFilterState>(() => {
  void urlTick.value
  if (typeof window !== 'undefined') return readShopFilterQuery(new URLSearchParams(window.location.search), shopDefaults)
  return readShopFilterQuery(routeQuery?.value ?? null, shopDefaults)
})
const apiFilters = computed(() => {
  const { sort_by, ...rest } = toStorefrontFilters(state.value)
  return rest
})
const filtersKey = computed(() => JSON.stringify(apiFilters.value))
const hasActive = computed(() => hasActiveShopFilters(state.value, shopDefaults))

function applyChanges(changes: Record<string, string | null>) {
  const current = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
  commitShopFilterSearch(buildShopFilterSearch(current, changes))
  urlTick.value++
}

// ── Data: facets, categories, bounds ────────────────────────────────────
const facets = ref<StorefrontSearchFacets | null>(null)
const total = ref<number | null>(null)
const categories = ref<StorefrontCategory[]>([])
const fallbackPrice = ref<{ min: number; max: number } | null>(null)
const isLoading = ref(false)

const categoryRoutePrefix = computed(() => {
  const route = projectConfig?.value?.commerce?.routes?.category || '/kategoria/:slug'
  return route.split(':slug')[0]
})

const currentPath = computed(() => {
  const injected = routePath?.value
  if (injected) return injected
  if (typeof window === 'undefined') return ''
  return window.location.pathname
})

// Strona kategorii: facety i liczniki liczymy w zakresie tej kategorii (jak listing).
const categoryPageSlug = computed(() => {
  const prefix = categoryRoutePrefix.value
  const path = currentPath.value
  if (!prefix || !path.startsWith(prefix)) return ''
  return decodeURIComponent(path.slice(prefix.length).split('/')[0] || '')
})

const priceBounds = computed(() => {
  const p = facets.value?.price
  if (p && p.min != null && p.max != null) return { min: Math.floor(p.min), max: Math.ceil(p.max) }
  return fallbackPrice.value
})
// Zakres do placeholderów: najszerszy znany (facet ceny nie zawęża się własnym filtrem).
const priceHint = computed(() => {
  const a = priceBounds.value
  const b = fallbackPrice.value
  if (!a) return b
  if (!b) return a
  return { min: Math.min(a.min, b.min), max: Math.max(a.max, b.max) }
})

const categoryCounts = computed(() => {
  const map = new Map<string, number>()
  for (const c of facets.value?.categories || []) map.set(c.uuid, c.count)
  return map
})

// Drzewo kategorii spłaszczone z wcięciem; pokazujemy tylko te z wynikami.
const categoryRows = computed(() => {
  const rows: Array<{ uuid: string; name: string; depth: number; count: number }> = []
  const walk = (list: StorefrontCategory[], depth: number) => {
    for (const c of list) {
      const count = categoryCounts.value.get(c.uuid) ?? 0
      if (count > 0) rows.push({ uuid: c.uuid, name: c.name, depth, count })
      if (c.children?.length) walk(c.children, depth + 1)
    }
  }
  walk(categories.value, 0)
  return rows
})

const facetList = computed<StorefrontFacetFilter[]>(() => {
  const list = [...(facets.value?.filters || [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  return list.filter((f) => {
    if (f.type === 'number') return f.min != null && f.max != null
    if (f.type === 'bool') return true
    return (f.values || []).some((v) => v.count > 0)
  })
})

const sections = computed(() => {
  const list: Array<{ key: string; title: string }> = []
  if (showSearch.value) list.push({ key: 'search', title: t('title') })
  if (showCategories.value && categoryRows.value.length) list.push({ key: 'categories', title: t('categories') })
  if (showPrice.value && priceBounds.value) list.push({ key: 'price', title: t('price') })
  if (showInStock.value) list.push({ key: 'availability', title: t('availability') })
  if (showAttributes.value) for (const f of facetList.value) list.push({ key: `attr:${f.code}`, title: f.label })
  return list
})

// Bar mode: jedna rozwijana sekcja naraz.
const openSection = ref<string | null>(null)
const mobileOpen = ref(false)
const expandedFacets = ref<Record<string, boolean>>({})

function toggleSection(key: string) {
  openSection.value = openSection.value === key ? null : key
}

// Sidebar: sekcje jako akordeon, domyślnie rozwinięte.
const collapsed = ref<Record<string, boolean>>({})
function toggleCollapse(key: string) {
  collapsed.value = { ...collapsed.value, [key]: sectionOpen(key) }
}
function sectionHasActive(key: string): boolean {
  const s = state.value
  if (key === 'search') return !!s.q
  if (key === 'categories') return !!s.category
  if (key === 'price') return !!(s.minPrice || s.maxPrice)
  if (key === 'availability') return s.inStock !== inStockDefault.value
  if (key.startsWith('attr:')) {
    const code = key.slice(5)
    return !!(s.attrs[code]?.length || s.attrMin[code] || s.attrMax[code])
  }
  return false
}
function sectionOpen(key: string): boolean {
  if (mode.value === 'bar') return openSection.value === key
  if (key in collapsed.value) return !collapsed.value[key]
  return !defaultCollapsed.value || sectionHasActive(key)
}

async function fetchData() {
  if (!client.value) return
  isLoading.value = true
  try {
    const filters = apiFilters.value
    const response = categoryPageSlug.value
      ? await client.value.getCategoryProducts(categoryPageSlug.value, { ...filters, per_page: 1 })
      : await client.value.getProducts({ ...filters, per_page: 1 })
    facets.value = response.search?.facets || null
    total.value = response.pagination?.total ?? null

    // Zakres ceny: z facetu, a gdy go brak — z najtańszego i najdroższego produktu.
    if (!facets.value?.price && showPrice.value) {
      const { min_price, max_price, ...noPrice } = apiFilters.value as any
      const [asc, desc] = await Promise.all([
        client.value.getProducts({ ...noPrice, sort_by: 'price_asc', per_page: 1 }),
        client.value.getProducts({ ...noPrice, sort_by: 'price_desc', per_page: 1 }),
      ])
      const lo = Number((asc.data?.[0] as any)?.price)
      const hi = Number((desc.data?.[0] as any)?.price)
      fallbackPrice.value = Number.isFinite(lo) && Number.isFinite(hi) && hi > 0 ? { min: Math.floor(lo), max: Math.ceil(hi) } : null
    }
  } catch {
    facets.value = null
    total.value = null
  } finally {
    isLoading.value = false
  }
}

async function fetchCategories() {
  if (!client.value || !showCategories.value) return
  try {
    const response = await client.value.getCategories()
    categories.value = response.data || []
  } catch {
    categories.value = []
  }
}

onServerPrefetch(async () => {
  if (isAvailable.value) await Promise.all([fetchData(), fetchCategories()])
})

// Pasek nad listingiem (product-grid) ma własny przycisk „Filtry” i sortowanie —
// wtedy na telefonie chowamy topbar panelu, a szufladę otwiera zdarzenie.
const gridToolbar = ref(false)
function openDrawer() { mobileOpen.value = true }

onMounted(() => {
  window.addEventListener(SHOP_FILTER_EVENT, bumpUrlTick)
  window.addEventListener('popstate', bumpUrlTick)
  window.addEventListener('lcms:shop-filters-open', openDrawer)
  const detect = () => { gridToolbar.value = !!document.querySelector('.lcms-product-grid__toolbar') }
  detect()
  setTimeout(detect, 800)
  if (isAvailable.value) {
    if (!facets.value) fetchData()
    if (!categories.value.length) fetchCategories()
  }
})

onBeforeUnmount(() => {
  window.removeEventListener(SHOP_FILTER_EVENT, bumpUrlTick)
  window.removeEventListener('popstate', bumpUrlTick)
  window.removeEventListener('lcms:shop-filters-open', openDrawer)
})

function bumpUrlTick() {
  urlTick.value++
}

watch(filtersKey, () => {
  if (isAvailable.value) fetchData()
})

// ── Controls ────────────────────────────────────────────────────────────
const searchDraft = ref(state.value.q)
watch(() => state.value.q, (q) => { searchDraft.value = q })
let searchTimer: ReturnType<typeof setTimeout> | null = null
function onSearchInput(value: string) {
  searchDraft.value = value
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => applyChanges({ q: value.trim() || null }), 400)
}

function toggleCategory(uuid: string) {
  applyChanges({ cat: state.value.category === uuid ? null : uuid })
}

function attrValues(code: string): string[] {
  return state.value.attrs[code] || []
}

function toggleAttrValue(code: string, value: string, checked: boolean) {
  const current = new Set(attrValues(code))
  if (checked) current.add(value)
  else current.delete(value)
  applyChanges({ [`f_${code}`]: current.size ? [...current].join(',') : null })
}

function setAttrRange(code: string, kind: 'min' | 'max', value: string) {
  applyChanges({ [`f${kind}_${code}`]: value === '' ? null : value })
}

function setPrice(kind: 'min_price' | 'max_price', value: string) {
  applyChanges({ [kind]: value === '' ? null : value })
}

function setInStock(checked: boolean) {
  applyChanges({ in_stock: checked === inStockDefault.value ? null : (checked ? '1' : '0') })
}

function setSort(value: string) {
  applyChanges({ sort: value || null })
}

function clearAll() {
  const current = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
  applyChanges(clearShopFilterKeys(current))
}

// Dwuuchwytowy suwak: dwa range-inputy nakładane na siebie.
function rangeValue(kind: 'min' | 'max', bounds: { min: number; max: number }, current: string): number {
  const n = Number(current)
  if (current !== '' && Number.isFinite(n)) return Math.min(Math.max(n, bounds.min), bounds.max)
  return kind === 'min' ? bounds.min : bounds.max
}

function onPriceSlider(kind: 'min' | 'max', bounds: { min: number; max: number }, event: Event) {
  const raw = Number((event.target as HTMLInputElement).value)
  if (kind === 'min') setPrice('min_price', raw <= bounds.min ? '' : String(raw))
  else setPrice('max_price', raw >= bounds.max ? '' : String(raw))
}

function facetLabel(code: string, value: string): string {
  const facet = facets.value?.filters?.find((f) => f.code === code)
  return facet?.values?.find((v) => v.value === value)?.label || value
}

const sortOptions = computed(() => [
  { value: '', label: t('default_sort') },
  { value: 'price_asc', label: t('price_asc') },
  { value: 'price_desc', label: t('price_desc') },
  { value: 'newest', label: t('newest') },
  { value: 'name_asc', label: t('name_asc') },
  { value: 'name_desc', label: t('name_desc') },
])

const chips = computed(() => {
  const out: Array<{ label: string; remove: Record<string, string | null> }> = []
  const s = state.value
  if (s.q) out.push({ label: `"${s.q}"`, remove: { q: null } })
  if (s.category) {
    const row = categoryRows.value.find((r) => r.uuid === s.category)
    out.push({ label: row?.name || t('categories'), remove: { cat: null } })
  }
  if (s.minPrice || s.maxPrice) {
    const cur = t('currency_suffix') ? ` ${t('currency_suffix')}` : ''
    const range = s.minPrice && s.maxPrice ? `${s.minPrice}–${s.maxPrice}${cur}`
      : s.minPrice ? `${t('from').toLowerCase()} ${s.minPrice}${cur}` : `${t('to').toLowerCase()} ${s.maxPrice}${cur}`
    out.push({ label: `${t('price')}: ${range}`, remove: { min_price: null, max_price: null } })
  }
  if (s.inStock !== inStockDefault.value) out.push({ label: s.inStock ? t('in_stock') : t('include_unavailable'), remove: { in_stock: null } })
  for (const [code, values] of Object.entries(s.attrs)) {
    const label = facetList.value.find((f) => f.code === code)?.label || code
    for (const v of values) {
      out.push({ label: `${label}: ${facetLabel(code, v)}`, remove: { [`f_${code}`]: values.filter((x) => x !== v).join(',') || null } })
    }
  }
  for (const code of new Set([...Object.keys(s.attrMin), ...Object.keys(s.attrMax)])) {
    const label = facetList.value.find((f) => f.code === code)?.label || code
    const from = s.attrMin[code] ?? ''
    const to = s.attrMax[code] ?? ''
    out.push({ label: `${label}: ${from || '…'}–${to || '…'}`, remove: { [`fmin_${code}`]: null, [`fmax_${code}`]: null } })
  }
  return out
})

const resultsWord = computed(() => pluralWord(total.value ?? 0, t('results'), props.language || 'pl'))

// Wypełnienie toru suwaka ceny między uchwytami (procenty dla CSS).
function priceFill(bounds: { min: number; max: number }): Record<string, string> {
  const span = bounds.max - bounds.min || 1
  const lo = (rangeValue('min', bounds, state.value.minPrice) - bounds.min) / span * 100
  const hi = (rangeValue('max', bounds, state.value.maxPrice) - bounds.min) / span * 100
  return { '--lo': `${lo}%`, '--hi': `${hi}%` }
}
</script>

<template>
  <div
    v-if="isAvailable"
    class="lcms-shop-filters"
    :class="[`lcms-shop-filters--${mode}`, { 'is-drawer-open': mobileOpen }]"
  >
    <div
      class="lcms-shop-filters__topbar"
      :class="{ 'has-grid-toolbar': gridToolbar }"
    >
      <button
        type="button"
        class="lcms-shop-filters__toggle"
        @click="mobileOpen = true"
      >
        <svg class="lcms-shop-filters__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></svg>
        {{ t('filters_button') }}
      </button>
      <template v-if="showResultsCount && total != null">
        <button
          v-if="hasActive"
          type="button"
          class="lcms-shop-filters__count is-action"
          :title="t('clear')"
          @click="clearAll"
        >
          <span>{{ total }} {{ resultsWord }}</span>
          <svg class="lcms-shop-filters__icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
        <a
          v-else-if="(currentPath || '').replace(/\/+$/, '') !== allProductsUrl.replace(/\/+$/, '')"
          :href="allProductsUrl"
          class="lcms-shop-filters__count is-action"
        >{{ t('all_products') }} · {{ total }}</a>
        <span
          v-else
          class="lcms-shop-filters__count"
        >{{ total }} {{ resultsWord }}</span>
      </template>
      <LcmsSortDropdown
        v-if="showSort"
        class="lcms-shop-filters__sort"
        :label="t('sort')"
        :model-value="state.sort"
        :options="sortOptions"
        @update:model-value="setSort"
      />
    </div>

    <div
      v-if="mobileOpen"
      class="lcms-shop-filters__backdrop"
      @click="mobileOpen = false"
    />

    <div
      v-if="sections.length || showSearch || showChips"
      class="lcms-shop-filters__panel"
    >
      <div class="lcms-shop-filters__panel-head">
        <strong>{{ t('title') }}</strong>
        <button
          type="button"
          class="lcms-shop-filters__close"
          :aria-label="t('close')"
          @click="mobileOpen = false"
        >
          <svg class="lcms-shop-filters__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      </div>

      <div
        v-if="showChips && hasActive"
        class="lcms-shop-filters__chips"
      >
        <button
          v-for="(chip, i) in chips"
          :key="i"
          type="button"
          class="lcms-shop-filters__chip"
          @click="applyChanges(chip.remove)"
        >
          {{ chip.label }} <svg class="lcms-shop-filters__icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
        <button
          type="button"
          class="lcms-shop-filters__clear"
          @click="clearAll"
        >
          {{ t('clear') }}
        </button>
      </div>

      <div
        v-for="sec in sections"
        :key="sec.key"
        class="lcms-shop-filters__section"
        :class="{ 'is-open': sectionOpen(sec.key) }"
      >
        <button
          type="button"
          class="lcms-shop-filters__section-title lcms-shop-filters__section-title--toggle"
          :aria-expanded="sectionOpen(sec.key)"
          @click="mode === 'bar' ? toggleSection(sec.key) : toggleCollapse(sec.key)"
        >
          <span>{{ sec.title }}</span>
          <svg class="lcms-shop-filters__icon lcms-shop-filters__chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6" /></svg>
        </button>

        <div
          v-show="sectionOpen(sec.key)"
          class="lcms-shop-filters__section-body"
        >
          <!-- Wyszukiwarka -->
          <input
            v-if="sec.key === 'search'"
            type="search"
            class="lcms-shop-filters__input"
            :value="searchDraft"
            :placeholder="t('search_placeholder')"
            @input="onSearchInput(($event.target as HTMLInputElement).value)"
          >

          <!-- Kategorie z licznikami -->
          <ul
            v-else-if="sec.key === 'categories'"
            class="lcms-shop-filters__list"
          >
            <li
              v-for="row in categoryRows"
              :key="row.uuid"
              :style="{ paddingLeft: `${row.depth * 12}px` }"
            >
              <label class="lcms-shop-filters__option lcms-shop-filters__option--check">
                <input
                  type="checkbox"
                  class="lcms-shop-filters__check"
                  :checked="state.category === row.uuid"
                  @change="toggleCategory(row.uuid)"
                >
                <span class="lcms-shop-filters__option-label">{{ row.name }}</span>
                <span class="lcms-shop-filters__count-badge">{{ row.count }}</span>
              </label>
            </li>
          </ul>

          <!-- Cena: suwak + pola od/do -->
          <div
            v-else-if="sec.key === 'price' && priceBounds"
            class="lcms-shop-filters__range"
          >
            <div
              v-if="priceBounds.max > priceBounds.min"
              class="lcms-shop-filters__dual"
              :style="priceFill(priceBounds)"
            >
              <input
                type="range"
                :min="priceBounds.min"
                :max="priceBounds.max"
                :value="rangeValue('min', priceBounds, state.minPrice)"
                aria-label="min"
                @change="onPriceSlider('min', priceBounds, $event)"
              >
              <input
                type="range"
                :min="priceBounds.min"
                :max="priceBounds.max"
                :value="rangeValue('max', priceBounds, state.maxPrice)"
                aria-label="max"
                @change="onPriceSlider('max', priceBounds, $event)"
              >
            </div>
            <div class="lcms-shop-filters__range-inputs">
              <label class="lcms-shop-filters__affix">
                <input
                  type="text"
                  inputmode="decimal"
                  class="lcms-shop-filters__input"
                  :placeholder="`${t('from')} ${priceHint?.min ?? priceBounds.min}`"
                  :value="state.minPrice"
                  @change="setPrice('min_price', ($event.target as HTMLInputElement).value.replace(',', '.').replace(/[^0-9.]/g, ''))"
                >
                <span
                  v-if="t('currency_suffix')"
                  class="lcms-shop-filters__suffix"
                >{{ t('currency_suffix') }}</span>
              </label>
              <span class="lcms-shop-filters__range-sep">–</span>
              <label class="lcms-shop-filters__affix">
                <input
                  type="text"
                  inputmode="decimal"
                  class="lcms-shop-filters__input"
                  :placeholder="`${t('to')} ${priceHint?.max ?? priceBounds.max}`"
                  :value="state.maxPrice"
                  @change="setPrice('max_price', ($event.target as HTMLInputElement).value.replace(',', '.').replace(/[^0-9.]/g, ''))"
                >
                <span
                  v-if="t('currency_suffix')"
                  class="lcms-shop-filters__suffix"
                >{{ t('currency_suffix') }}</span>
              </label>
            </div>
          </div>

          <div
            v-else-if="sec.key === 'availability'"
            class="lcms-shop-filters__availability"
          >
            <label class="lcms-shop-filters__switch">
              <input
                type="checkbox"
                role="switch"
                :checked="state.inStock"
                @change="setInStock(($event.target as HTMLInputElement).checked)"
              >
              <span
                class="lcms-shop-filters__switch-track"
                aria-hidden="true"
              />
              <span>{{ t('in_stock') }}</span>
            </label>
          </div>

          <!-- Atrybut wg typu -->
          <template v-else-if="sec.key.startsWith('attr:')">
            <template
              v-for="f in facetList.filter((x) => `attr:${x.code}` === sec.key)"
              :key="f.code"
            >
              <!-- number: zakres min/max -->
              <div
                v-if="f.type === 'number'"
                class="lcms-shop-filters__range"
              >
                <div class="lcms-shop-filters__range-inputs">
                  <input
                    type="text"
                    inputmode="decimal"
                    class="lcms-shop-filters__input"
                    :placeholder="t('from')"
                    :min="f.min"
                    :max="f.max"
                    :value="state.attrMin[f.code] ?? ''"
                    @change="setAttrRange(f.code, 'min', ($event.target as HTMLInputElement).value)"
                  >
                  <input
                    type="text"
                    inputmode="decimal"
                    class="lcms-shop-filters__input"
                    :placeholder="t('to')"
                    :min="f.min"
                    :max="f.max"
                    :value="state.attrMax[f.code] ?? ''"
                    @change="setAttrRange(f.code, 'max', ($event.target as HTMLInputElement).value)"
                  >
                </div>
              </div>

              <!-- bool: przełącznik -->
              <label
                v-else-if="f.type === 'bool'"
                class="lcms-shop-filters__switch"
              >
                <input
                  type="checkbox"
                  role="switch"
                  :checked="attrValues(f.code).includes('1')"
                  @change="toggleAttrValue(f.code, '1', ($event.target as HTMLInputElement).checked)"
                >
                <span
                  class="lcms-shop-filters__switch-track"
                  aria-hidden="true"
                />
                <span>{{ f.label }}</span>
              </label>

              <!-- select / multiselect / text: checkboxy z liczbami -->
              <template v-else>
                <div
                  class="lcms-shop-filters__pills"
                  role="group"
                  :aria-label="f.label"
                >
                  <button
                    v-for="(v, vi) in (f.values || []).filter((x) => x.count > 0)"
                    v-show="expandedFacets[f.code] || vi < visibleLimit"
                    :key="v.value"
                    type="button"
                    class="lcms-shop-filters__pill"
                    :class="{ 'is-active': attrValues(f.code).includes(v.value) }"
                    :aria-pressed="attrValues(f.code).includes(v.value)"
                    @click="toggleAttrValue(f.code, v.value, !attrValues(f.code).includes(v.value))"
                  >
                    <span>{{ v.label }}</span>
                    <span class="lcms-shop-filters__count-badge">{{ v.count }}</span>
                  </button>
                </div>
                <button
                  v-if="(f.values || []).filter((x) => x.count > 0).length > visibleLimit"
                  type="button"
                  class="lcms-shop-filters__more"
                  :class="{ 'is-expanded': expandedFacets[f.code] }"
                  @click="expandedFacets[f.code] = !expandedFacets[f.code]"
                >
                  <span>{{ expandedFacets[f.code] ? t('show_less') : `${t('show_more')} (${(f.values || []).filter((x) => x.count > 0).length - visibleLimit})` }}</span>
                  <svg class="lcms-shop-filters__icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6" /></svg>
                </button>
              </template>
            </template>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lcms-shop-filters {
  position: relative;
  font-family: var(--lcms-font-body, inherit);
  color: var(--lcms-text-color, #212529);
  font-size: 0.9375rem;
}
.lcms-shop-filters__topbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.lcms-shop-filters__toggle {
  display: none;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border: 1px solid var(--lcms-border-color, #d0d5dd);
  border-radius: var(--lcms-border-radius, 8px);
  background: var(--lcms-color-background, #fff);
  color: inherit;
  cursor: pointer;
}
.lcms-shop-filters {
  --sf-primary: var(--lcms-color-primary, #2563eb);
  --sf-border: var(--lcms-border-color, #e5e7eb);
  --sf-muted: var(--lcms-muted-color, #6b7280);
  --sf-bg: var(--lcms-color-background, #fff);
  --sf-soft: color-mix(in srgb, var(--sf-primary) 8%, var(--sf-bg));
  --sf-radius: 10px;
}
.lcms-shop-filters__count {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px; width: 100%; box-sizing: border-box;
  min-height: 44px; padding: 10px 18px; border: 0; border-radius: var(--sf-radius); background: var(--sf-primary);
  color: #fff; font: inherit; font-size: 0.9375rem; font-weight: 600; text-decoration: none; text-align: center;
}
a.lcms-shop-filters__count, button.lcms-shop-filters__count { cursor: pointer; transition: filter 0.15s, transform 0.15s; }
a.lcms-shop-filters__count:hover, button.lcms-shop-filters__count:hover { filter: brightness(1.07); transform: translateY(-1px); color: #fff; }
.lcms-shop-filters__sort { margin-left: auto; }
.lcms-shop-filters__sort-label { color: var(--sf-muted); font-size: 0.875rem; white-space: nowrap; }
.lcms-shop-filters__select,
.lcms-shop-filters__input {
  height: 40px;
  padding: 0 12px;
  border: 1px solid var(--sf-border);
  border-radius: var(--sf-radius);
  background: var(--sf-bg);
  color: inherit;
  font: inherit;
  font-size: 0.875rem;
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.lcms-shop-filters__select:focus,
.lcms-shop-filters__input:focus {
  outline: none; border-color: var(--sf-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--sf-primary) 18%, transparent);
}
.lcms-shop-filters__select--sort {
  appearance: none; -webkit-appearance: none; width: auto; min-width: 170px; padding-right: 36px; cursor: pointer;
  font-weight: 500;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 12px center;
}
.lcms-shop-filters__icon { display: inline-block; flex: 0 0 auto; vertical-align: middle; }
.lcms-shop-filters__panel { display: flex; flex-direction: column; gap: 12px; }
.lcms-shop-filters__panel-head { display: none; justify-content: space-between; align-items: center; font-size: 1.125rem; }
.lcms-shop-filters__close {
  display: inline-grid; place-items: center;
  width: 36px; height: 36px; border-radius: 50%; background: var(--sf-soft); border: 0; cursor: pointer;
  color: inherit; font-size: 1rem;
}
.lcms-shop-filters__chips { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.lcms-shop-filters__chip {
  display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px 5px 12px; border-radius: 999px;
  border: 0; background: var(--sf-primary); color: #fff; font: inherit; font-size: 0.8125rem; font-weight: 500;
  cursor: pointer; transition: opacity 0.15s;
}
.lcms-shop-filters__chip:hover { opacity: 0.85; }
.lcms-shop-filters__chip .lcms-shop-filters__icon { opacity: 0.85; }
.lcms-shop-filters__clear {
  background: none; border: 0; padding: 4px 6px; cursor: pointer; font: inherit; font-size: 0.8125rem;
  color: var(--sf-muted); text-decoration: none;
}
.lcms-shop-filters__clear:hover { color: var(--sf-primary); }
.lcms-shop-filters__section {
  border: 1px solid var(--sf-border); border-radius: var(--sf-radius); background: var(--sf-bg); padding: 0;
}
.lcms-shop-filters__section-title {
  margin: 0; font-size: 0.9375rem; font-weight: 600; letter-spacing: 0; text-transform: none;
  background: none; border: 0; padding: 14px 16px; color: inherit; font-family: inherit; text-align: left; width: 100%;
}
.lcms-shop-filters__section-title--toggle { display: flex; justify-content: space-between; align-items: center; gap: 8px; cursor: pointer; }
.lcms-shop-filters__chevron { flex: 0 0 auto; color: var(--sf-muted); transition: transform 0.2s; }
.lcms-shop-filters__section.is-open .lcms-shop-filters__chevron { transform: rotate(180deg); }
.lcms-shop-filters__section-body { padding: 0 16px 16px; }
.lcms-shop-filters__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
.lcms-shop-filters__option { display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 0.875rem; padding: 3px 0; }
.lcms-shop-filters__check {
  appearance: none; -webkit-appearance: none; flex: 0 0 18px; width: 18px; height: 18px; margin: 0;
  border: 1.5px solid var(--sf-border); border-radius: 5px; background: var(--sf-bg); cursor: pointer;
  display: grid; place-content: center; transition: background 0.15s, border-color 0.15s;
}
.lcms-shop-filters__check::after {
  content: ''; width: 9px; height: 5px; border: solid #fff; border-width: 0 0 2px 2px; transform: rotate(-45deg) translate(1px, -1px);
  opacity: 0;
}
.lcms-shop-filters__check:checked { background: var(--sf-primary); border-color: var(--sf-primary); }
.lcms-shop-filters__check:checked::after { opacity: 1; }
.lcms-shop-filters__count-badge {
  margin-left: auto; min-width: 22px; padding: 1px 7px; border-radius: 999px; text-align: center;
  background: var(--sf-soft); color: var(--sf-muted); font-size: 0.75rem; font-weight: 500; line-height: 1.5;
}
.lcms-shop-filters__pills { display: flex; flex-wrap: wrap; gap: 8px; }
.lcms-shop-filters__pill {
  display: inline-flex; align-items: center; gap: 6px; padding: 6px 8px 6px 12px; border-radius: 999px;
  border: 1px solid var(--sf-border); background: var(--sf-bg); color: inherit; font: inherit; font-size: 0.8125rem;
  cursor: pointer; transition: border-color 0.15s, background 0.15s, color 0.15s;
}
.lcms-shop-filters__pill .lcms-shop-filters__count-badge { margin-left: 0; }
.lcms-shop-filters__pill:hover { border-color: var(--sf-primary); }
.lcms-shop-filters__pill.is-active { background: var(--sf-primary); border-color: var(--sf-primary); color: #fff; }
.lcms-shop-filters__pill.is-active .lcms-shop-filters__count-badge { background: rgba(255, 255, 255, 0.22); color: #fff; }
.lcms-shop-filters__more {
  display: flex; align-items: center; justify-content: center; gap: 6px; width: calc(100% + 32px); height: 40px;
  margin: 14px -16px -16px; padding: 0 16px; border: 0; border-top: 1px solid var(--sf-border);
  border-radius: 0 0 calc(var(--sf-radius) - 1px) calc(var(--sf-radius) - 1px);
  background: none; cursor: pointer; color: var(--sf-primary); font: inherit; font-size: 0.8125rem; font-weight: 500;
  transition: background 0.15s;
}
.lcms-shop-filters__more:hover { background: var(--sf-more-hover, color-mix(in srgb, var(--sf-primary) 6%, var(--sf-bg))); }
.lcms-shop-filters__more:focus-visible { outline: none; box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--sf-primary) 35%, transparent); }
.lcms-shop-filters__more .lcms-shop-filters__icon { transition: transform 0.2s; }
.lcms-shop-filters__more.is-expanded .lcms-shop-filters__icon { transform: rotate(180deg); }
.lcms-shop-filters__range { display: flex; flex-direction: column; gap: 14px; }
.lcms-shop-filters__dual { position: relative; height: 20px; margin: 4px 8px 0; }
.lcms-shop-filters__dual::before,
.lcms-shop-filters__dual::after {
  content: ''; position: absolute; top: 50%; height: 3px; transform: translateY(-50%); border-radius: 2px;
}
.lcms-shop-filters__dual::before { left: 0; right: 0; background: var(--sf-border); }
.lcms-shop-filters__dual::after { left: var(--lo, 0%); right: calc(100% - var(--hi, 100%)); background: var(--sf-primary); }
.lcms-shop-filters__dual input[type='range'] {
  position: absolute; inset: 0 -8px; width: calc(100% + 16px); pointer-events: none; background: none;
  appearance: none; -webkit-appearance: none; margin: 0; z-index: 1;
}
.lcms-shop-filters__dual input[type='range']::-webkit-slider-runnable-track { background: none; height: 20px; }
.lcms-shop-filters__dual input[type='range']::-moz-range-track { background: none; }
.lcms-shop-filters__dual input[type='range']::-webkit-slider-thumb {
  pointer-events: auto; -webkit-appearance: none; appearance: none; width: 18px; height: 18px; margin-top: 1px;
  border-radius: 50%; border: 3px solid var(--sf-primary); background: #fff; cursor: grab;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.18);
}
.lcms-shop-filters__dual input[type='range']::-moz-range-thumb {
  pointer-events: auto; width: 14px; height: 14px; border-radius: 50%; border: 3px solid var(--sf-primary);
  background: #fff; cursor: grab;
}
.lcms-shop-filters__range-inputs { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 8px; }
.lcms-shop-filters__range-sep { color: var(--sf-muted); }
.lcms-shop-filters__affix { position: relative; display: block; }
.lcms-shop-filters__affix .lcms-shop-filters__input { padding-right: 32px; }
.lcms-shop-filters__suffix {
  position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: var(--sf-muted); font-size: 0.8125rem;
  pointer-events: none;
}
.lcms-shop-filters__switch { display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 0.875rem; }
.lcms-shop-filters__switch input { position: absolute; opacity: 0; width: 1px; height: 1px; }
.lcms-shop-filters__switch-track {
  position: relative; flex: 0 0 36px; width: 36px; height: 20px; border-radius: 999px; background: var(--sf-border);
  transition: background 0.2s;
}
.lcms-shop-filters__switch-track::after {
  content: ''; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25); transition: transform 0.2s;
}
.lcms-shop-filters__switch input:checked + .lcms-shop-filters__switch-track { background: var(--sf-primary); }
.lcms-shop-filters__switch input:checked + .lcms-shop-filters__switch-track::after { transform: translateX(16px); }
.lcms-shop-filters__switch input:focus-visible + .lcms-shop-filters__switch-track { box-shadow: 0 0 0 3px color-mix(in srgb, var(--sf-primary) 25%, transparent); }
.lcms-shop-filters__backdrop { display: none; }

/* Bar: poziomy pasek, sekcje jako rozwijane panele */
.lcms-shop-filters--bar .lcms-shop-filters__panel {
  flex-direction: row; flex-wrap: wrap; align-items: flex-start; gap: 8px;
}
.lcms-shop-filters--bar .lcms-shop-filters__section {
  border: 0; position: relative; flex: 0 0 auto; background: none;
}
.lcms-shop-filters--bar .lcms-shop-filters__section-title--toggle {
  width: auto; padding: 9px 14px; border: 1px solid var(--sf-border); background: var(--sf-bg);
  border-radius: 999px; gap: 8px; margin: 0; font-size: 0.875rem;
}
.lcms-shop-filters--bar .lcms-shop-filters__section.is-open .lcms-shop-filters__section-title--toggle { border-color: var(--sf-primary); }
.lcms-shop-filters--bar .lcms-shop-filters__section-body {
  position: absolute; z-index: 20; top: calc(100% + 6px); left: 0; min-width: 240px; max-width: 320px;
  padding: 16px; background: var(--sf-bg); box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
  border: 1px solid var(--sf-border); border-radius: var(--sf-radius);
}
.lcms-shop-filters--bar .lcms-shop-filters__panel > .lcms-shop-filters__chips,
.lcms-shop-filters--bar .lcms-shop-filters__panel > .lcms-shop-filters__panel-head { flex-basis: 100%; }

@media (max-width: 768px) {
  .lcms-shop-filters__toggle { display: inline-flex; }
  .lcms-shop-filters__topbar.has-grid-toolbar { display: none; }
  .lcms-shop-filters__sort { margin-left: 0; }
  .lcms-shop-filters__panel {
    position: fixed; top: 0; bottom: 0; left: 0; width: min(88vw, 340px); z-index: 1000;
    padding: 16px; overflow-y: auto; background: var(--lcms-color-background, #fff);
    transform: translateX(-100%); transition: transform 0.25s ease; box-shadow: 0 0 24px rgba(0, 0, 0, 0.2);
    flex-direction: column;
  }
  .lcms-shop-filters.is-drawer-open .lcms-shop-filters__panel { transform: translateX(0); }
  .lcms-shop-filters.is-drawer-open .lcms-shop-filters__backdrop {
    display: block; position: fixed; inset: 0; z-index: 999; background: rgba(0, 0, 0, 0.35);
  }
  .lcms-shop-filters__panel-head { display: flex; }
  .lcms-shop-filters--bar .lcms-shop-filters__section-body { position: static; box-shadow: none; min-width: 0; max-width: none; border: 0; padding: 0; }
  .lcms-shop-filters--bar .lcms-shop-filters__more { width: 100%; margin: 10px 0 0; border: 1px solid var(--sf-border); border-radius: 8px; }
  .lcms-shop-filters--bar .lcms-shop-filters__section-title--toggle { width: 100%; }
  .lcms-shop-filters--bar .lcms-shop-filters__panel { flex-direction: column; }
}
</style>
