/**
 * Page fetching composable
 */

import { ref, watch, isRef, computed, type Ref, type ComputedRef } from 'vue'
import { useApi } from './useApi'
import type { PageResponse, PageSection, PageMetadata, SeoData } from '../api/types'

export interface UsePageReturn {
  /**
   * Full page data
   */
  page: ComputedRef<{ sections: PageSection[]; metadata: PageMetadata | null; seo: SeoData | null } | null>

  /**
   * Page sections
   */
  sections: Ref<PageSection[]>

  /**
   * Page metadata
   */
  metadata: Ref<PageMetadata | null>

  /**
   * SEO data
   */
  seo: Ref<SeoData | null>

  /**
   * Loading state
   */
  loading: Ref<boolean>

  /**
   * Error state
   */
  error: Ref<Error | null>

  /**
   * Manually refetch the page
   */
  refetch: () => Promise<void>
}

/**
 * Composable for fetching a page by code
 */
export function usePage(code: Ref<string> | string): UsePageReturn {
  const api = useApi()

  const sections = ref<PageSection[]>([])
  const metadata = ref<PageMetadata | null>(null)
  const seo = ref<SeoData | null>(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  const codeRef = isRef(code) ? code : ref(code)

  // Computed page object
  const page = computed(() => {
    if (!sections.value.length && !metadata.value) return null
    return {
      sections: sections.value,
      metadata: metadata.value,
      seo: seo.value
    }
  })

  async function fetchPage() {
    if (!codeRef.value) {
      sections.value = []
      metadata.value = null
      seo.value = null
      return
    }

    loading.value = true
    error.value = null

    try {
      const response: PageResponse = await api.getPage(codeRef.value)
      sections.value = response.data.content || []
      metadata.value = response.data.metadata || null
      seo.value = response.data.seo || null
    } catch (e) {
      error.value = e as Error
      sections.value = []
      metadata.value = null
      seo.value = null
    } finally {
      loading.value = false
    }
  }

  // Watch for code changes and refetch
  watch(codeRef, fetchPage, { immediate: true })

  return {
    page,
    sections,
    metadata,
    seo,
    loading,
    error,
    refetch: fetchPage,
  }
}
