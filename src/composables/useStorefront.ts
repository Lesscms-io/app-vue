/**
 * Storefront composable — provides a LessCommerce Storefront API client
 * to ecommerce widgets.
 *
 * The client is created from the commerce context injected by LessCMSProvider
 * (which receives storefrontApiUrl/storefrontApiKey/shopUuid props from the
 * Nuxt renderer plugin, populated from the resolve-domain server middleware).
 */

import { inject, computed, type ComputedRef, type Ref } from 'vue'
import { createStorefrontClient, type StorefrontClient } from '../api/storefront'

export interface CommerceContext {
  apiUrl: string
  apiKey: string
  shopUuid: string
}

export interface UseStorefrontResult {
  /** The storefront client, or null if commerce is not configured for this project */
  client: ComputedRef<StorefrontClient | null>
  /** True if commerce is enabled (linked shop + API key available) */
  isAvailable: ComputedRef<boolean>
  /** The linked shop UUID, or null */
  shopUuid: ComputedRef<string | null>
}

// Module-level cache so all widgets in the same app share the same client instance
let cachedClient: StorefrontClient | null = null
let cachedKey: string | null = null

export function useStorefront(): UseStorefrontResult {
  // Commerce context can be provided as either a plain object or a computed ref
  const ctx = inject<CommerceContext | Ref<CommerceContext | null> | null>(
    'lesscms-commerce-context',
    null
  )

  const resolveCtx = (): CommerceContext | null => {
    if (!ctx) return null
    // Handle Ref or computed
    if (typeof ctx === 'object' && 'value' in ctx) {
      return (ctx as Ref<CommerceContext | null>).value
    }
    return ctx as CommerceContext
  }

  const client = computed<StorefrontClient | null>(() => {
    const c = resolveCtx()
    if (!c?.apiUrl || !c?.apiKey) {
      cachedClient = null
      cachedKey = null
      return null
    }

    // Cache key combines URL and API key
    const key = `${c.apiUrl}|${c.apiKey}`
    if (cachedClient && cachedKey === key) {
      return cachedClient
    }

    cachedClient = createStorefrontClient({
      baseUrl: c.apiUrl,
      apiKey: c.apiKey,
    })
    cachedKey = key
    return cachedClient
  })

  const isAvailable = computed(() => client.value !== null)
  const shopUuid = computed(() => resolveCtx()?.shopUuid || null)

  return { client, isAvailable, shopUuid }
}
