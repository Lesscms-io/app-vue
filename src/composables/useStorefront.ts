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

// Module-level cache so all widgets share client instances — one per API
// key and language. Language is part of the key (not a mutable setting on a
// shared client) because on the server concurrent SSR requests for different
// languages go through the same module.
const clients = new Map<string, StorefrontClient>()
const rawTokenSetters = new WeakMap<StorefrontClient, (token: string | null) => void>()

/**
 * Client for a shop + language. Clients of the same shop share the logged-in
 * customer's token: logging in through one widget must authorise requests of
 * every other widget, whatever language client it ended up with.
 */
function getClient(apiUrl: string, apiKey: string, language: string): StorefrontClient {
  const shopKey = `${apiUrl}|${apiKey}`
  const key = `${shopKey}|${language}`
  const existing = clients.get(key)
  if (existing) return existing

  const siblings = () =>
    [...clients.entries()].filter(([k]) => k.startsWith(`${shopKey}|`)).map(([, c]) => c)
  const currentToken = siblings()[0]?.getCustomerToken() ?? null

  const created = createStorefrontClient({ baseUrl: apiUrl, apiKey, language: language || undefined })
  rawTokenSetters.set(created, created.setCustomerToken.bind(created))
  created.setCustomerToken = (token: string | null) => {
    for (const c of siblings()) rawTokenSetters.get(c)?.(token)
  }
  clients.set(key, created)
  if (currentToken) rawTokenSetters.get(created)!(currentToken)
  return created
}

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

  // Language of the page being rendered — provided by SectionRenderer, which
  // gets it from the page. Outside a page (plugin pages) fall back to the
  // project's default language from the provider config.
  const pageLanguage = inject<Ref<string | undefined> | null>('lesscms-current-language', null)
  const config = inject<{ language?: string } | null>('lesscms-config', null)

  const client = computed<StorefrontClient | null>(() => {
    const c = resolveCtx()
    if (!c?.apiUrl || !c?.apiKey) {
      return null
    }

    const language = pageLanguage?.value || config?.language || ''
    return getClient(c.apiUrl, c.apiKey, language)
  })

  const isAvailable = computed(() => client.value !== null)
  const shopUuid = computed(() => resolveCtx()?.shopUuid || null)

  return { client, isAvailable, shopUuid }
}
