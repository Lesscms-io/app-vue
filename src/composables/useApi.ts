/**
 * API composable for accessing the LessCMS API client
 */

import { inject } from 'vue'
import type { ApiClient } from '../api/client'

/**
 * Get the API client from the LessCMSProvider context
 * @throws Error if used outside LessCMSProvider
 */
export function useApi(): ApiClient {
  const apiClient = inject<ApiClient>('lesscms-api')

  if (!apiClient) {
    throw new Error(
      'useApi must be used within a LessCMSProvider. ' +
      'Make sure to wrap your app with <LessCMSProvider>.'
    )
  }

  return apiClient
}

/**
 * Try to get the API client, returns null if not available
 */
export function useApiOptional(): ApiClient | null {
  return inject<ApiClient>('lesscms-api', null)
}
