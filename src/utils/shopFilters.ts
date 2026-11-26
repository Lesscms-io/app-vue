/**
 * Stan filtrów sklepu w URL (widget shop-filters <-> LcmsProductGrid).
 *
 * Parametry query (wszystkie opcjonalne, brak = brak filtrów):
 *   q                 — fraza (ta sama co ?q= wyszukiwarki)
 *   cat               — uuid kategorii (drzewko w sidebarze)
 *   min_price/max_price
 *   in_stock=1
 *   sort              — manual|price_asc|price_desc|name_asc|name_desc|newest
 *   f_<kod>=a,b       — wartości atrybutu (OR w obrębie, AND między atrybutami)
 *   fmin_<kod>/fmax_<kod> — zakres liczbowy atrybutu
 * Parametr page jest zarządzany przez listing i jest kasowany przy zmianie filtra.
 */

import type { StorefrontListingFilters } from '../api/storefront'

export const SHOP_FILTER_EVENT = 'lcms:shop-filters-change'

export interface ShopFilterState {
  q: string
  category: string
  minPrice: string
  maxPrice: string
  inStock: boolean
  sort: string
  attrs: Record<string, string[]>
  attrMin: Record<string, string>
  attrMax: Record<string, string>
}

type QueryLike = URLSearchParams | Record<string, any> | null | undefined

const SORTS = ['manual', 'price_asc', 'price_desc', 'name_asc', 'name_desc', 'newest']

function getValue(query: QueryLike, key: string): string {
  if (!query) return ''
  let raw: any
  if (query instanceof URLSearchParams) raw = query.get(key)
  else raw = query[key]
  if (Array.isArray(raw)) raw = raw[0]
  return typeof raw === 'string' || typeof raw === 'number' ? String(raw).trim() : ''
}

function listKeys(query: QueryLike, prefix: string): string[] {
  if (!query) return []
  const keys = query instanceof URLSearchParams ? [...query.keys()] : Object.keys(query)
  return keys.filter((k) => k.startsWith(prefix) && k.length > prefix.length)
}

function isNumeric(v: string): boolean {
  return v !== '' && Number.isFinite(Number(v))
}

export function readShopFilterQuery(query: QueryLike): ShopFilterState {
  const attrs: Record<string, string[]> = {}
  for (const key of listKeys(query, 'f_')) {
    const code = key.slice(2)
    const values = getValue(query, key).split(',').map((v) => v.trim()).filter(Boolean)
    if (values.length) attrs[code] = values
  }
  const attrMin: Record<string, string> = {}
  for (const key of listKeys(query, 'fmin_')) {
    const v = getValue(query, key)
    if (isNumeric(v)) attrMin[key.slice(5)] = v
  }
  const attrMax: Record<string, string> = {}
  for (const key of listKeys(query, 'fmax_')) {
    const v = getValue(query, key)
    if (isNumeric(v)) attrMax[key.slice(5)] = v
  }
  const sort = getValue(query, 'sort')
  const minPrice = getValue(query, 'min_price')
  const maxPrice = getValue(query, 'max_price')
  return {
    q: getValue(query, 'q'),
    category: getValue(query, 'cat'),
    minPrice: isNumeric(minPrice) ? minPrice : '',
    maxPrice: isNumeric(maxPrice) ? maxPrice : '',
    inStock: ['1', 'true'].includes(getValue(query, 'in_stock')),
    sort: SORTS.includes(sort) ? sort : '',
    attrs,
    attrMin,
    attrMax,
  }
}

/** Parametry dla klienta storefront (zero kluczy, gdy brak filtrów). */
export function toStorefrontFilters(s: ShopFilterState): StorefrontListingFilters & { sort_by?: string } {
  const out: StorefrontListingFilters & { sort_by?: string } = {}
  if (s.q) out.q = s.q
  if (s.category) out.category_uuid = s.category
  if (s.minPrice) out.min_price = Number(s.minPrice)
  if (s.maxPrice) out.max_price = Number(s.maxPrice)
  if (s.inStock) out.in_stock = true
  if (s.sort) out.sort_by = s.sort
  const attr: Record<string, string> = {}
  for (const [code, values] of Object.entries(s.attrs)) if (values.length) attr[code] = values.join(',')
  if (Object.keys(attr).length) out.attr = attr
  const attrMin: Record<string, number> = {}
  for (const [code, v] of Object.entries(s.attrMin)) attrMin[code] = Number(v)
  if (Object.keys(attrMin).length) out.attr_min = attrMin
  const attrMax: Record<string, number> = {}
  for (const [code, v] of Object.entries(s.attrMax)) attrMax[code] = Number(v)
  if (Object.keys(attrMax).length) out.attr_max = attrMax
  return out
}

/** Czy jest jakikolwiek aktywny filtr (sortowanie nim nie jest). */
export function hasActiveShopFilters(s: ShopFilterState): boolean {
  return !!(s.q || s.category || s.minPrice || s.maxPrice || s.inStock
    || Object.keys(s.attrs).length || Object.keys(s.attrMin).length || Object.keys(s.attrMax).length)
}

/**
 * Buduje nowe query z obecnego: podmienia klucze filtrów, kasuje page.
 * `changes` — null = usuń klucz.
 */
export function buildShopFilterSearch(current: URLSearchParams, changes: Record<string, string | null>): string {
  const next = new URLSearchParams(current.toString())
  next.delete('page')
  for (const [key, value] of Object.entries(changes)) {
    if (value === null || value === '') next.delete(key)
    else next.set(key, value)
  }
  const str = next.toString()
  return str ? `?${str}` : ''
}

/** Klucze filtrów do wyczyszczenia (wszystko poza sort). */
export function clearShopFilterKeys(current: URLSearchParams): Record<string, null> {
  const out: Record<string, null> = {}
  for (const key of [...current.keys()]) {
    if (key === 'q' || key === 'cat' || key === 'min_price' || key === 'max_price' || key === 'in_stock'
      || key.startsWith('f_') || key.startsWith('fmin_') || key.startsWith('fmax_')) out[key] = null
  }
  return out
}

/** Zmień URL bez przeładowania i powiadom listingi na stronie. */
export function commitShopFilterSearch(search: string): void {
  if (typeof window === 'undefined') return
  const url = `${window.location.pathname}${search}${window.location.hash}`
  window.history.pushState(window.history.state, '', url)
  window.dispatchEvent(new CustomEvent(SHOP_FILTER_EVENT))
}
