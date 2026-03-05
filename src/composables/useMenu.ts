/**
 * Menu fetching composable
 */

import { ref, watch, isRef, type Ref } from 'vue'
import { useApi } from './useApi'
import type { MenuItem, MenuMetadata } from '../api/types'

export interface UseMenuReturn {
  /**
   * Menu items (nested structure)
   */
  items: Ref<MenuItem[]>

  /**
   * Menu metadata
   */
  metadata: Ref<MenuMetadata | null>

  /**
   * Loading state
   */
  loading: Ref<boolean>

  /**
   * Error state
   */
  error: Ref<Error | null>

  /**
   * Manually refetch
   */
  refetch: () => Promise<void>
}

/**
 * Composable for fetching a menu by code
 */
export function useMenu(code: Ref<string> | string): UseMenuReturn {
  const api = useApi()

  const items = ref<MenuItem[]>([])
  const metadata = ref<MenuMetadata | null>(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  const codeRef = isRef(code) ? code : ref(code)

  async function fetchMenu() {
    if (!codeRef.value) {
      items.value = []
      metadata.value = null
      return
    }

    loading.value = true
    error.value = null

    try {
      const response = await api.getMenu(codeRef.value)
      items.value = response.data.content || []
      metadata.value = response.data.metadata || null
    } catch (e) {
      error.value = e as Error
      items.value = []
      metadata.value = null
    } finally {
      loading.value = false
    }
  }

  watch(codeRef, fetchMenu, { immediate: true })

  return {
    items,
    metadata,
    loading,
    error,
    refetch: fetchMenu,
  }
}
