/**
 * Active campaigns composable — single batch fetch per page render shared
 * across all marketing widgets (topbar, banner, …). Without this, every
 * widget would hit the storefront endpoint independently and burn the cache
 * advantage we built on the BE.
 *
 * The fetched promise lives inside the Vue app instance via inject/provide,
 * so SSR per-request isolation works correctly (no module-level shared
 * state across requests, which would leak data between tenants).
 */

import { computed, inject, provide, ref, type Ref, type ComputedRef } from 'vue'
import { useStorefront } from './useStorefront'
import type { StorefrontActiveCampaign, StorefrontMarketingBanner, StorefrontMarketingTopBar } from '../api/storefront'

const INJECT_KEY = Symbol('lcms-active-campaigns') as unknown as string

interface CampaignStore {
  campaigns: Ref<StorefrontActiveCampaign[]>
  loaded: Ref<boolean>
  loading: Ref<boolean>
  load: () => Promise<void>
}

function createStore(): CampaignStore {
  const campaigns = ref<StorefrontActiveCampaign[]>([])
  const loaded = ref(false)
  const loading = ref(false)
  let inflight: Promise<void> | null = null
  const { client, isAvailable } = useStorefront()

  async function load(): Promise<void> {
    if (loaded.value) return
    if (inflight) return inflight
    if (!isAvailable.value || !client.value) {
      loaded.value = true
      return
    }
    loading.value = true
    inflight = (async () => {
      try {
        const res = await client.value!.getActiveCampaigns({ include: ['topbars', 'banners'] })
        campaigns.value = res?.data ?? []
      } catch {
        campaigns.value = []
      } finally {
        loaded.value = true
        loading.value = false
        inflight = null
      }
    })()
    return inflight
  }

  return { campaigns, loaded, loading, load }
}

export interface UseActiveCampaignsResult {
  campaigns: ComputedRef<StorefrontActiveCampaign[]>
  loaded: ComputedRef<boolean>
  loading: ComputedRef<boolean>
  /** Fire the batch fetch. Idempotent — second caller awaits the same promise. */
  ensureLoaded: () => Promise<void>
  /** All active topbars across active campaigns, sorted by priority desc. */
  allTopBars: ComputedRef<Array<StorefrontMarketingTopBar & { campaign_uuid: string }>>
  /** All active banners across active campaigns, optionally filtered by placement. */
  bannersFor: (placement?: string, campaignUuid?: string) => ComputedRef<Array<StorefrontMarketingBanner & { campaign_uuid: string }>>
  topBarFor: (campaignUuid?: string) => ComputedRef<(StorefrontMarketingTopBar & { campaign_uuid: string }) | null>
}

/**
 * Provide the store at app root. Call this once (LessCMSProvider does it).
 * Subsequent useActiveCampaigns() calls in widgets read the same store.
 */
export function provideActiveCampaigns(): void {
  provide(INJECT_KEY, createStore())
}

export function useActiveCampaigns(): UseActiveCampaignsResult {
  // Fall back to creating a store on demand — useful in tests / standalone
  // widget renders where LessCMSProvider isn't in the tree.
  const store = inject<CampaignStore>(INJECT_KEY) ?? createStore()

  const campaigns = computed(() => store.campaigns.value)
  const loaded = computed(() => store.loaded.value)
  const loading = computed(() => store.loading.value)

  const allTopBars = computed(() => {
    const out: Array<StorefrontMarketingTopBar & { campaign_uuid: string }> = []
    for (const c of store.campaigns.value) {
      for (const tb of c.topbars ?? []) {
        out.push({ ...tb, campaign_uuid: c.uuid })
      }
    }
    out.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
    return out
  })

  const bannersFor = (placement?: string, campaignUuid?: string) =>
    computed(() => {
      const out: Array<StorefrontMarketingBanner & { campaign_uuid: string }> = []
      for (const c of store.campaigns.value) {
        if (campaignUuid && c.uuid !== campaignUuid) continue
        for (const b of c.banners ?? []) {
          if (placement && b.placement !== placement) continue
          out.push({ ...b, campaign_uuid: c.uuid })
        }
      }
      out.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
      return out
    })

  const topBarFor = (campaignUuid?: string) =>
    computed(() => {
      const list = allTopBars.value
      if (!campaignUuid) return list[0] ?? null
      return list.find((tb) => tb.campaign_uuid === campaignUuid) ?? null
    })

  return {
    campaigns,
    loaded,
    loading,
    ensureLoaded: store.load,
    allTopBars,
    bannersFor,
    topBarFor,
  }
}
