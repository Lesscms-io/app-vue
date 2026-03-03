/**
 * useRedirects Composable
 *
 * Fetches and manages URL redirects for the project.
 * Provides a matchRedirect(path) helper to find redirects for a given path.
 */

import { ref } from 'vue'
import { useApi } from './useApi'
import type { Redirect } from '../api/types'

const redirects = ref<Redirect[]>([])
const isLoaded = ref(false)
const isLoading = ref(false)

export function useRedirects() {
  const api = useApi()
  const error = ref<Error | null>(null)

  async function fetchRedirects() {
    if (isLoaded.value || isLoading.value) {
      return redirects.value
    }

    isLoading.value = true
    error.value = null

    try {
      const response = await api.getRedirects()
      redirects.value = response.data || []
      isLoaded.value = true
    } catch (err: any) {
      console.error('Failed to load redirects:', err)
      error.value = err
    } finally {
      isLoading.value = false
    }

    return redirects.value
  }

  /**
   * Find a redirect matching the given path
   */
  function matchRedirect(path: string): Redirect | null {
    return redirects.value.find(r => r.source_path === path && r.is_active) || null
  }

  return {
    redirects,
    loading: isLoading,
    loaded: isLoaded,
    error,
    fetchRedirects,
    matchRedirect,
  }
}
