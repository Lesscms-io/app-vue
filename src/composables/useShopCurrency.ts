/**
 * Waluta wyświetlania cen sklepu (np. EUR obok PLN, kurs ręczny ze sklepu).
 *
 * API sklepu zwraca ceny w walucie sklepu; tutaj przeliczamy je dopiero przy
 * wyświetleniu. Dzięki temu działa to tak samo dla danych z SSR, z cache CDN
 * (HTML jest wspólny dla wszystkich) i z zapytań w przeglądarce.
 *
 * Kolejność: na serwerze i przy hydratacji zawsze waluta sklepu (bez rozjazdu
 * HTML), po zamontowaniu `initShopCurrency()` czyta konfigurację sklepu,
 * ciasteczko `lcms_currency` albo (pierwsza wizyta) walutę dla kraju klienta
 * z GET /geo — i wtedy ceny przeliczają się reaktywnie.
 *
 * Zamówienie składa się w wybranej walucie (checkout wysyła `currency`), a
 * kwoty zamówienia (sukces, konto klienta) formatujemy jego własną walutą —
 * bez przeliczania.
 */
import { computed, onMounted, reactive, type Ref } from 'vue'
import { formatPrice } from '../utils/currency'
import type { StorefrontClient } from '../api/storefront'
import { useStorefront } from './useStorefront'

export interface ShopCurrencyRounding {
  mode?: 'exact' | 'up' | 'ending'
  step?: number
  ending?: number
}

export interface ShopCurrencyItem {
  code: string
  rate: number
  rounding?: ShopCurrencyRounding
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

/** Zaokrąglenie ceny produktu — ta sama reguła co BE (ShopCurrencies::round) i storefront. */
export function roundShopPrice(value: number, rounding?: ShopCurrencyRounding): number {
  const mode = rounding?.mode || 'exact'
  if (!(value > 0) || mode === 'exact') return round2(value)
  const v = Math.round(value * 100)
  if (mode === 'up') {
    const step = Math.round((Number(rounding?.step) > 0 ? Number(rounding?.step) : 1) * 100)
    return (Math.ceil(v / step) * step) / 100
  }
  const end = Math.round(Math.max(0, Math.min(0.99, Number(rounding?.ending ?? 0.99))) * 100)
  let result = Math.floor(v / 100) * 100 + end
  if (result < v) result += 100
  return result / 100
}

const COOKIE = 'lcms_currency'
const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined'

const state = reactive({
  base: '' as string,
  current: '' as string,
  items: [] as ShopCurrencyItem[],
  ready: false,
})
let initPromise: Promise<void> | null = null

function readCookie(): string | null {
  if (!isBrowser) return null
  const m = document.cookie.match(/(?:^|;\s*)lcms_currency=([A-Za-z]{3})/)
  return m ? m[1].toUpperCase() : null
}

function writeCookie(code: string): void {
  if (!isBrowser) return
  document.cookie = `${COOKIE}=${code}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
}

/** Wczytuje waluty sklepu raz na stronę (tylko w przeglądarce). */
export function initShopCurrency(client: StorefrontClient | null | undefined): Promise<void> {
  if (!isBrowser || !client) return Promise.resolve()
  if (initPromise) return initPromise
  initPromise = (async () => {
    try {
      const res = await client.getConfig()
      const cfg = res?.data?.currencies
      const base = String(cfg?.base || res?.data?.currency || 'PLN').toUpperCase()
      const items: ShopCurrencyItem[] = Array.isArray(cfg?.items)
        ? cfg.items.map((c: any) => ({ code: String(c.code).toUpperCase(), rate: Number(c.rate) || 1, rounding: c.rounding || undefined }))
        : [{ code: base, rate: 1 }]
      state.base = base
      state.items = items
      let wanted = readCookie()
      if (!wanted && cfg?.auto_by_country && items.length > 1) {
        try {
          wanted = String((await client.getGeo())?.data?.currency || '').toUpperCase() || null
        } catch {
          wanted = null
        }
      }
      state.current = wanted && items.some((c) => c.code === wanted) ? wanted : base
      state.ready = true
    } catch {
      initPromise = null
    }
  })()
  return initPromise
}

/** Zmiana waluty przez klienta (przełącznik) — zapamiętana w ciasteczku. */
export function setShopCurrency(code: string): void {
  const c = code.toUpperCase()
  if (!state.items.some((i) => i.code === c)) return
  state.current = c
  writeCookie(c)
  if (isBrowser) window.dispatchEvent(new CustomEvent('lesscms:currency-change', { detail: { currency: c } }))
}

/** Waluta, w której klient płaci (do checkoutu / metod płatności); null = waluta sklepu. */
export function selectedOrderCurrency(): string | null {
  return state.ready && state.current && state.current !== state.base ? state.current : null
}

export function useShopCurrency(projectConfig?: Ref<any> | null) {
  const { client } = useStorefront()
  onMounted(() => { void initShopCurrency(client.value) })
  const base = computed(() => (state.base || projectConfig?.value?.commerce?.currency || 'PLN').toUpperCase())
  const currency = computed(() => (state.ready && state.current ? state.current : base.value))
  const item = computed(() => state.items.find((c) => c.code === currency.value))
  const rate = computed(() => item.value?.rate || 1)
  const isBase = () => currency.value === base.value

  const num = (amount: number | string | null | undefined): number | null => {
    if (amount === null || amount === undefined || amount === '') return null
    const n = typeof amount === 'string' ? parseFloat(amount) : amount
    return Number.isNaN(n) ? null : n
  }

  /** Cena produktu (waluta sklepu) → liczba w walucie klienta, z zaokrągleniem waluty (np. do ,99). */
  function convert(amount: number): number {
    return isBase() ? amount : roundShopPrice(round2(amount / rate.value), item.value?.rounding)
  }

  /** Kwota bez zaokrąglania cen (dostawa, rabat, dopłata opcji). */
  function convertExact(amount: number): number {
    return isBase() ? amount : round2(amount / rate.value)
  }

  /** Liczba już w walucie klienta → tekst. */
  function format(amount: number): string {
    return formatPrice(amount, currency.value)
  }

  /** Cena produktu w walucie sklepu → sformatowana w walucie klienta. */
  function money(amount: number | string | null | undefined): string {
    const n = num(amount)
    return n === null ? '' : format(convert(n))
  }

  /** Kwota dokładna (dostawa, rabat) w walucie sklepu → sformatowana w walucie klienta. */
  function moneyExact(amount: number | string | null | undefined): string {
    const n = num(amount)
    return n === null ? '' : format(convertExact(n))
  }

  /** Wartość pozycji = zaokrąglona cena × ilość (tak liczy zamówienie). */
  function lineAmount(unitPrice: number | string, quantity: number | string): number {
    const u = num(unitPrice) || 0
    const q = Number(quantity) || 0
    return isBase() ? u * q : round2(convert(u) * q)
  }

  /** Sumy koszyka w walucie klienta: z zaokrąglonych cen, rabat i dostawa dokładnie. */
  function cartSums(
    items: Array<{ unit_price: number | string; quantity: number | string }> | null | undefined,
    totals: { subtotal?: number | string; discount?: number | string; shipping_cost?: number | string; total?: number | string } | null | undefined,
  ): { subtotal: number; total: number } {
    if (isBase()) return { subtotal: num(totals?.subtotal) || 0, total: num(totals?.total) || 0 }
    const subtotal = round2((items || []).reduce((sum, i) => sum + lineAmount(i.unit_price, i.quantity), 0))
    const discount = convertExact(num(totals?.discount) || 0)
    const shipping = convertExact(num(totals?.shipping_cost) || 0)
    return { subtotal, total: round2(Math.max(0, subtotal - discount + shipping)) }
  }

  return {
    currency,
    base,
    money,
    moneyExact,
    convert,
    convertExact,
    format,
    lineAmount,
    cartSums,
    items: computed(() => state.items),
    ready: computed(() => state.ready),
    setCurrency: setShopCurrency,
  }
}
