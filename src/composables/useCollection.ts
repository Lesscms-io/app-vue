/**
 * Collection fetching composable
 */

import { ref, watch, isRef, computed, type Ref } from 'vue'
import { useApi } from './useApi'
import type { CollectionEntry, CollectionMeta, CollectionParams } from '../api/types'

export interface UseCollectionReturn {
  /**
   * Collection entries
   */
  entries: Ref<CollectionEntry[]>

  /**
   * Pagination metadata
   */
  meta: Ref<CollectionMeta | null>

  /**
   * Loading state
   */
  loading: Ref<boolean>

  /**
   * Error state
   */
  error: Ref<Error | null>

  /**
   * Current page number
   */
  page: Ref<number>

  /**
   * Total pages
   */
  totalPages: Ref<number>

  /**
   * Has more pages
   */
  hasMore: Ref<boolean>

  /**
   * Go to next page
   */
  nextPage: () => void

  /**
   * Go to previous page
   */
  prevPage: () => void

  /**
   * Go to specific page
   */
  goToPage: (page: number) => void

  /**
   * Manually refetch
   */
  refetch: () => Promise<void>
}

export interface UseCollectionOptions extends CollectionParams {
  /**
   * Auto-fetch on mount
   */
  immediate?: boolean
}

/**
 * Composable for fetching collection entries
 */
export function useCollection(
  code: Ref<string> | string,
  options: UseCollectionOptions = {}
): UseCollectionReturn {
  const api = useApi()

  const entries = ref<CollectionEntry[]>([])
  const meta = ref<CollectionMeta | null>(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)
  const page = ref(options.page || 1)

  const codeRef = isRef(code) ? code : ref(code)

  const totalPages = computed(() => meta.value?.totalPages || 0)
  const hasMore = computed(() => page.value < totalPages.value)

  async function fetchCollection() {
    console.log('useCollection fetchCollection called, code:', codeRef.value)
    if (!codeRef.value) {
      console.log('useCollection: empty code, skipping')
      entries.value = []
      meta.value = null
      return
    }

    loading.value = true
    error.value = null

    try {
      const { immediate, ...params } = options
      console.log('useCollection: calling API with params:', { code: codeRef.value, ...params, page: page.value })
      const response = await api.getCollection(codeRef.value, {
        ...params,
        page: page.value,
      })
      console.log('useCollection response for', codeRef.value, ':', response)
      entries.value = response.data || []
      meta.value = response.meta || null
    } catch (e) {
      console.error('useCollection: API error:', e)
      error.value = e as Error
      entries.value = []
      meta.value = null
    } finally {
      loading.value = false
    }
  }

  function nextPage() {
    if (hasMore.value) {
      page.value++
    }
  }

  function prevPage() {
    if (page.value > 1) {
      page.value--
    }
  }

  function goToPage(newPage: number) {
    if (newPage >= 1 && newPage <= totalPages.value) {
      page.value = newPage
    }
  }

  // Watch for code or page changes
  watch([codeRef, page], fetchCollection, { immediate: options.immediate !== false })

  return {
    entries,
    meta,
    loading,
    error,
    page,
    totalPages,
    hasMore,
    nextPage,
    prevPage,
    goToPage,
    refetch: fetchCollection,
  }
}

/**
 * Composable for fetching a single collection entry
 */
export function useCollectionEntry(
  collectionCode: Ref<string> | string,
  entryId: Ref<string> | string
) {
  const api = useApi()

  const entry = ref<CollectionEntry | null>(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  const collectionRef = isRef(collectionCode) ? collectionCode : ref(collectionCode)
  const entryRef = isRef(entryId) ? entryId : ref(entryId)

  async function fetchEntry() {
    if (!collectionRef.value || !entryRef.value) {
      entry.value = null
      return
    }

    loading.value = true
    error.value = null

    try {
      const response = await api.getCollectionEntry(collectionRef.value, entryRef.value)
      entry.value = response.data || null
    } catch (e) {
      error.value = e as Error
      entry.value = null
    } finally {
      loading.value = false
    }
  }

  watch([collectionRef, entryRef], fetchEntry, { immediate: true })

  return {
    entry,
    loading,
    error,
    refetch: fetchEntry,
  }
}
