<script setup lang="ts">
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
import type { StorefrontCategory, StorefrontSearchFacets, StorefrontFacetFilter } from '../../../api/storefront'
import {
  readShopFilterQuery,
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
const showAttributes = computed(() => configGroup.value.show_attributes !== false)
const showSort = computed(() => configGroup.value.show_sort !== false)
const showChips = computed(() => configGroup.value.show_chips !== false)
const showResultsCount = computed(() => configGroup.value.show_results_count !== false)
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
    close: 'Zamknij', from: 'Od', to: 'Do', in_stock: 'Tylko dostępne', default_sort: 'Domyślne',
    price_asc: 'Cena rosnąco', price_desc: 'Cena malejąco', newest: 'Najnowsze', name_asc: 'Nazwa (A–Z)',
    name_desc: 'Nazwa (Z–A)', show_less: 'Pokaż mniej', yes: 'Tak', no: 'Nie',
  },
  en: {
    title: 'Filters', filters_button: 'Filters', clear: 'Clear', sort: 'Sort by',
    search_placeholder: 'Search products...', categories: 'Categories', price: 'Price',
    attributes: 'Attributes', show_more: 'Show more', results: 'results', apply: 'Apply',
    close: 'Close', from: 'From', to: 'To', in_stock: 'In stock only', default_sort: 'Default',
    price_asc: 'Price: low to high', price_desc: 'Price: high to low', newest: 'Newest', name_asc: 'Name (A–Z)',
    name_desc: 'Name (Z–A)', show_less: 'Show less', yes: 'Yes', no: 'No',
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
  if (typeof window !== 'undefined') return readShopFilterQuery(new URLSearchParams(window.location.search))
  return readShopFilterQuery(routeQuery?.value ?? null)
})
const apiFilters = computed(() => {
  const { sort_by, ...rest } = toStorefrontFilters(state.value)
  return rest
})
const filtersKey = computed(() => JSON.stringify(apiFilters.value))
const hasActive = computed(() => hasActiveShopFilters(state.value))

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

const priceBounds = computed(() => facets.value?.price || fallbackPrice.value)

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

onMounted(() => {
  window.addEventListener(SHOP_FILTER_EVENT, bumpUrlTick)
  window.addEventListener('popstate', bumpUrlTick)
  if (isAvailable.value) {
    if (!facets.value) fetchData()
    if (!categories.value.length) fetchCategories()
  }
})

onBeforeUnmount(() => {
  window.removeEventListener(SHOP_FILTER_EVENT, bumpUrlTick)
  window.removeEventListener('popstate', bumpUrlTick)
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
  applyChanges({ in_stock: checked ? '1' : null })
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
    out.push({ label: `${t('price')}: ${s.minPrice || '0'}–${s.maxPrice || '∞'}`, remove: { min_price: null, max_price: null } })
  }
  if (s.inStock) out.push({ label: t('in_stock'), remove: { in_stock: null } })
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

const resultsLabel = computed(() => (total.value != null ? `${total.value} ${t('results')}` : ''))
</script>

<template>
  <div
    v-if="isAvailable"
    class="lcms-shop-filters"
    :class="[`lcms-shop-filters--${mode}`, { 'is-drawer-open': mobileOpen }]"
  >
    <div class="lcms-shop-filters__topbar">
      <button
        type="button"
        class="lcms-shop-filters__toggle"
        @click="mobileOpen = true"
      >
        <i class="fa-solid fa-sliders" aria-hidden="true" />
        {{ t('filters_button') }}
      </button>
      <span
        v-if="showResultsCount && resultsLabel"
        class="lcms-shop-filters__count"
      >{{ resultsLabel }}</span>
      <label
        v-if="showSort"
        class="lcms-shop-filters__sort"
      >
        <span class="lcms-shop-filters__sort-label">{{ t('sort') }}</span>
        <select
          class="lcms-shop-filters__select"
          :value="state.sort"
          @change="setSort(($event.target as HTMLSelectElement).value)"
        >
          <option
            v-for="opt in sortOptions"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.label }}
          </option>
        </select>
      </label>
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
          <i class="fa-solid fa-xmark" aria-hidden="true" />
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
          {{ chip.label }} <i
            class="fa-solid fa-xmark"
            aria-hidden="true"
          />
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
        :class="{ 'is-open': openSection === sec.key }"
      >
        <button
          v-if="mode === 'bar'"
          type="button"
          class="lcms-shop-filters__section-title lcms-shop-filters__section-title--toggle"
          :aria-expanded="openSection === sec.key"
          @click="toggleSection(sec.key)"
        >
          {{ sec.title }} <i
            class="fa-solid fa-chevron-down"
            aria-hidden="true"
          />
        </button>
        <h4
          v-else
          class="lcms-shop-filters__section-title"
        >
          {{ sec.title }}
        </h4>

        <div
          v-show="mode === 'sidebar' || openSection === sec.key"
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
              <label class="lcms-shop-filters__option">
                <input
                  type="checkbox"
                  :checked="state.category === row.uuid"
                  @change="toggleCategory(row.uuid)"
                >
                <span>{{ row.name }}</span>
                <span class="lcms-shop-filters__count-badge">{{ row.count }}</span>
              </label>
            </li>
          </ul>

          <!-- Cena: suwak + pola od/do -->
          <div
            v-else-if="sec.key === 'price' && priceBounds"
            class="lcms-shop-filters__range"
          >
            <div class="lcms-shop-filters__dual">
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
              <input
                type="number"
                class="lcms-shop-filters__input"
                :placeholder="t('from')"
                :min="priceBounds.min"
                :value="state.minPrice"
                @change="setPrice('min_price', ($event.target as HTMLInputElement).value)"
              >
              <input
                type="number"
                class="lcms-shop-filters__input"
                :placeholder="t('to')"
                :max="priceBounds.max"
                :value="state.maxPrice"
                @change="setPrice('max_price', ($event.target as HTMLInputElement).value)"
              >
            </div>
            <label class="lcms-shop-filters__option">
              <input
                type="checkbox"
                :checked="state.inStock"
                @change="setInStock(($event.target as HTMLInputElement).checked)"
              >
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
                    type="number"
                    class="lcms-shop-filters__input"
                    :placeholder="t('from')"
                    :min="f.min"
                    :max="f.max"
                    :value="state.attrMin[f.code] ?? ''"
                    @change="setAttrRange(f.code, 'min', ($event.target as HTMLInputElement).value)"
                  >
                  <input
                    type="number"
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
                class="lcms-shop-filters__option"
              >
                <input
                  type="checkbox"
                  :checked="attrValues(f.code).includes('1')"
                  @change="toggleAttrValue(f.code, '1', ($event.target as HTMLInputElement).checked)"
                >
                <span>{{ f.label }}</span>
              </label>

              <!-- select / multiselect / text: checkboxy z liczbami -->
              <template v-else>
                <ul class="lcms-shop-filters__list">
                  <li
                    v-for="(v, vi) in (f.values || []).filter((x) => x.count > 0)"
                    v-show="expandedFacets[f.code] || vi < visibleLimit"
                    :key="v.value"
                  >
                    <label class="lcms-shop-filters__option">
                      <input
                        type="checkbox"
                        :checked="attrValues(f.code).includes(v.value)"
                        @change="toggleAttrValue(f.code, v.value, ($event.target as HTMLInputElement).checked)"
                      >
                      <span>{{ v.label }}</span>
                      <span class="lcms-shop-filters__count-badge">{{ v.count }}</span>
                    </label>
                  </li>
                </ul>
                <button
                  v-if="(f.values || []).filter((x) => x.count > 0).length > visibleLimit"
                  type="button"
                  class="lcms-shop-filters__more"
                  @click="expandedFacets[f.code] = !expandedFacets[f.code]"
                >
                  {{ expandedFacets[f.code] ? t('show_less') : t('show_more') }}
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
.lcms-shop-filters__count { color: var(--lcms-muted-color, #6b7280); }
.lcms-shop-filters__sort { display: inline-flex; align-items: center; gap: 8px; margin-left: auto; }
.lcms-shop-filters__sort-label { color: var(--lcms-muted-color, #6b7280); }
.lcms-shop-filters__select,
.lcms-shop-filters__input {
  padding: 6px 10px;
  border: 1px solid var(--lcms-border-color, #d0d5dd);
  border-radius: var(--lcms-border-radius, 6px);
  background: var(--lcms-color-background, #fff);
  color: inherit;
  font: inherit;
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
}
.lcms-shop-filters__panel { display: flex; flex-direction: column; gap: 16px; }
.lcms-shop-filters__panel-head { display: none; justify-content: space-between; align-items: center; }
.lcms-shop-filters__close { background: none; border: 0; cursor: pointer; color: inherit; font-size: 1.125rem; }
.lcms-shop-filters__chips { display: flex; flex-wrap: wrap; gap: 6px; }
.lcms-shop-filters__chip {
  display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px;
  border: 1px solid var(--lcms-color-primary, #2563eb);
  background: color-mix(in srgb, var(--lcms-color-primary, #2563eb) 10%, transparent);
  color: inherit; font-size: 0.8125rem; cursor: pointer;
}
.lcms-shop-filters__clear {
  background: none; border: 0; padding: 4px 6px; cursor: pointer;
  color: var(--lcms-color-primary, #2563eb); text-decoration: underline; font: inherit;
}
.lcms-shop-filters__section { border-top: 1px solid var(--lcms-border-color, #e5e7eb); padding-top: 12px; }
.lcms-shop-filters__section-title {
  margin: 0 0 8px; font-size: 0.875rem; font-weight: 600; background: none; border: 0; padding: 0;
  color: inherit; font-family: inherit; text-align: left; width: 100%;
}
.lcms-shop-filters__section-title--toggle { display: flex; justify-content: space-between; cursor: pointer; }
.lcms-shop-filters__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.lcms-shop-filters__option { display: flex; align-items: center; gap: 8px; cursor: pointer; }
.lcms-shop-filters__count-badge { margin-left: auto; color: var(--lcms-muted-color, #6b7280); font-size: 0.8125rem; }
.lcms-shop-filters__more {
  margin-top: 6px; background: none; border: 0; padding: 0; cursor: pointer;
  color: var(--lcms-color-primary, #2563eb); font: inherit;
}
.lcms-shop-filters__range { display: flex; flex-direction: column; gap: 10px; }
.lcms-shop-filters__dual { position: relative; height: 24px; }
.lcms-shop-filters__dual input[type='range'] {
  position: absolute; inset: 0; width: 100%; pointer-events: none; background: none; appearance: none; margin: 0;
  accent-color: var(--lcms-color-primary, #2563eb);
}
.lcms-shop-filters__dual input[type='range']::-webkit-slider-thumb { pointer-events: auto; }
.lcms-shop-filters__dual input[type='range']::-moz-range-thumb { pointer-events: auto; }
.lcms-shop-filters__range-inputs { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.lcms-shop-filters__backdrop { display: none; }

/* Bar: poziomy pasek, sekcje jako rozwijane panele */
.lcms-shop-filters--bar .lcms-shop-filters__panel {
  flex-direction: row; flex-wrap: wrap; align-items: flex-start; gap: 8px;
}
.lcms-shop-filters--bar .lcms-shop-filters__section {
  border-top: 0; padding-top: 0; position: relative; flex: 0 0 auto;
}
.lcms-shop-filters--bar .lcms-shop-filters__section-title--toggle {
  width: auto; padding: 8px 12px; border: 1px solid var(--lcms-border-color, #d0d5dd);
  border-radius: var(--lcms-border-radius, 8px); gap: 8px; margin: 0;
}
.lcms-shop-filters--bar .lcms-shop-filters__section-body {
  position: absolute; z-index: 20; top: calc(100% + 6px); left: 0; min-width: 240px; max-width: 320px;
  padding: 12px; background: var(--lcms-color-background, #fff); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  border: 1px solid var(--lcms-border-color, #e5e7eb); border-radius: var(--lcms-border-radius, 8px);
}
.lcms-shop-filters--bar .lcms-shop-filters__panel > .lcms-shop-filters__chips,
.lcms-shop-filters--bar .lcms-shop-filters__panel > .lcms-shop-filters__panel-head { flex-basis: 100%; }

@media (max-width: 768px) {
  .lcms-shop-filters__toggle { display: inline-flex; }
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
  .lcms-shop-filters--bar .lcms-shop-filters__section-title--toggle { width: 100%; }
  .lcms-shop-filters--bar .lcms-shop-filters__panel { flex-direction: column; }
}
</style>
