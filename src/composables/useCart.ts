/**
 * Cart composable — manages a server-side shopping cart for ecommerce widgets.
 *
 * The cart UUID is stored in a cookie (lcms_cart_uuid) so it persists across
 * page reloads and stays attached to the visitor session. All cart operations
 * are performed against the LessCommerce Storefront API.
 *
 * Singleton: a single cart store instance is shared across all widgets in
 * the page (created once on first useCart() call).
 */

import { ref, computed, type Ref, type ComputedRef } from 'vue'
import { useStorefront } from './useStorefront'
import type { StorefrontCart } from '../api/storefront'

const COOKIE_NAME = 'lcms_cart_uuid'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(^|;\\s*)${name}=([^;]+)`))
  return match ? decodeURIComponent(match[2]) : null
}

function setCookie(name: string, value: string, maxAge: number): void {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`
}

function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=; path=/; max-age=0`
}

export interface CartStore {
  cart: Ref<StorefrontCart | null>
  cartUuid: Ref<string | null>
  isLoading: Ref<boolean>
  hasInitialized: Ref<boolean>
  error: Ref<string | null>
  itemsCount: ComputedRef<number>
  total: ComputedRef<number>
  isEmpty: ComputedRef<boolean>
  init(): Promise<void>
  loadCart(): Promise<void>
  addItem(productUuid: string, quantity?: number, metadata?: Record<string, unknown>): Promise<void>
  updateItem(itemUuid: string, quantity: number): Promise<void>
  removeItem(itemUuid: string): Promise<void>
  clearCart(): Promise<void>
  checkout(data: any): Promise<any>
  reset(): void
}

let cartStoreSingleton: CartStore | null = null

function createCartStore(): CartStore {
  const cart = ref<StorefrontCart | null>(null)
  const cartUuid = ref<string | null>(null)
  const isLoading = ref(false)
  const hasInitialized = ref(false)
  const error = ref<string | null>(null)

  const { client, isAvailable } = useStorefront()

  const itemsCount = computed(() => cart.value?.totals.items_count || 0)
  const total = computed(() => cart.value?.totals.total || 0)
  const isEmpty = computed(() => itemsCount.value === 0)

  let initialized = false

  async function init() {
    if (initialized) return
    initialized = true

    if (!isAvailable.value) {
      hasInitialized.value = true
      return
    }

    // Check cookie for existing cart UUID. Flip isLoading synchronously so
    // widgets render their spinner on the first frame — otherwise the empty
    // state flashes before loadCart() starts.
    const existingUuid = getCookie(COOKIE_NAME)
    if (existingUuid) {
      cartUuid.value = existingUuid
      isLoading.value = true
      await loadCart()
    }
    hasInitialized.value = true
  }

  async function loadCart() {
    if (!client.value || !cartUuid.value) return

    isLoading.value = true
    error.value = null
    try {
      const response = await client.value.getCart(cartUuid.value)
      cart.value = response.data
    } catch (err: any) {
      // Cart not found (expired/cleared) — reset state
      if (err.status === 404) {
        cart.value = null
        cartUuid.value = null
        deleteCookie(COOKIE_NAME)
      } else {
        error.value = err.message || 'Failed to load cart'
      }
    } finally {
      isLoading.value = false
    }
  }

  async function ensureCart(): Promise<string> {
    if (cartUuid.value) return cartUuid.value
    if (!client.value) throw new Error('Storefront not available')

    isLoading.value = true
    try {
      const response = await client.value.createCart()
      cart.value = response.data
      cartUuid.value = response.data.uuid
      setCookie(COOKIE_NAME, response.data.uuid, COOKIE_MAX_AGE)
      return response.data.uuid
    } finally {
      isLoading.value = false
    }
  }

  async function addItem(productUuid: string, quantity: number = 1, metadata?: Record<string, unknown>) {
    if (!client.value) throw new Error('Storefront not available')

    isLoading.value = true
    error.value = null
    try {
      const uuid = await ensureCart()
      const response = await client.value.addToCart(uuid, productUuid, quantity, metadata)
      cart.value = response.data
    } catch (err: any) {
      error.value = err.message || 'Failed to add item'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function updateItem(itemUuid: string, quantity: number) {
    if (!client.value || !cartUuid.value) return

    if (quantity < 1) {
      return removeItem(itemUuid)
    }

    isLoading.value = true
    error.value = null
    try {
      const response = await client.value.updateCartItem(cartUuid.value, itemUuid, quantity)
      cart.value = response.data
    } catch (err: any) {
      error.value = err.message || 'Failed to update item'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function removeItem(itemUuid: string) {
    if (!client.value || !cartUuid.value) return

    isLoading.value = true
    error.value = null
    try {
      const response = await client.value.removeFromCart(cartUuid.value, itemUuid)
      cart.value = response.data
    } catch (err: any) {
      error.value = err.message || 'Failed to remove item'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function clearCart() {
    if (!client.value || !cartUuid.value) return

    isLoading.value = true
    error.value = null
    try {
      await client.value.clearCart(cartUuid.value)
      cart.value = null
      cartUuid.value = null
      deleteCookie(COOKIE_NAME)
    } catch (err: any) {
      error.value = err.message || 'Failed to clear cart'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function checkout(data: any) {
    if (!client.value || !cartUuid.value) {
      throw new Error('No cart to checkout')
    }

    isLoading.value = true
    error.value = null
    try {
      const response = await client.value.checkout(cartUuid.value, data)
      // Cart is consumed by checkout — clear local state
      cart.value = null
      cartUuid.value = null
      deleteCookie(COOKIE_NAME)
      return response.data
    } catch (err: any) {
      error.value = err.message || 'Checkout failed'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  function reset() {
    cart.value = null
    cartUuid.value = null
    error.value = null
    deleteCookie(COOKIE_NAME)
  }

  return {
    cart,
    cartUuid,
    isLoading,
    hasInitialized,
    error,
    itemsCount,
    total,
    isEmpty,
    init,
    loadCart,
    addItem,
    updateItem,
    removeItem,
    clearCart,
    checkout,
    reset,
  }
}

/**
 * Get the cart store singleton.
 * Auto-initializes on first call (loads cart from cookie if present).
 */
export function useCart(): CartStore {
  if (!cartStoreSingleton) {
    cartStoreSingleton = createCartStore()
    // Auto-init on client side
    if (typeof window !== 'undefined') {
      cartStoreSingleton.init().catch(() => { /* swallow */ })
    }
  }
  return cartStoreSingleton
}
