/**
 * LessCMS API Client
 *
 * Supports two modes:
 * 1. Direct mode: Browser calls API directly with x-api-key header
 * 2. Proxy mode: Browser calls proxy server, which adds the API key server-side
 */

import type {
  LessCMSConfig,
  PageResponse,
  PagesListResponse,
  CollectionResponse,
  CollectionParams,
  MenuResponse,
  BlockResponse,
  ElementResponse,
  RoutesResponse,
} from './types'

export interface ApiClient {
  /**
   * Generic GET request
   */
  get<T>(path: string, params?: Record<string, any>): Promise<T>

  /**
   * Get all public pages
   */
  getPages(): Promise<PagesListResponse>

  /**
   * Get a single page by code
   */
  getPage(code: string): Promise<PageResponse>

  /**
   * Get collection entries
   */
  getCollection(code: string, params?: CollectionParams): Promise<CollectionResponse>

  /**
   * Get a single collection entry
   */
  getCollectionEntry(collectionCode: string, entryId: string): Promise<{ data: import('./types').CollectionEntry }>

  /**
   * Get collection entry template
   */
  getCollectionTemplate(collectionCode: string, templateId: string): Promise<import('./types').CollectionTemplateResponse>

  /**
   * Get menu by code
   */
  getMenu(code: string): Promise<MenuResponse>

  /**
   * Get block by code
   */
  getBlock(code: string): Promise<BlockResponse>

  /**
   * Get element by code
   */
  getElement(code: string): Promise<ElementResponse>

  /**
   * Get routing configuration
   */
  getRoutes(): Promise<RoutesResponse>

  /**
   * Check if client is in proxy mode
   */
  isProxyMode(): boolean
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public statusText: string,
    public response?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * Client configuration options
 */
export interface ApiClientConfig extends LessCMSConfig {
  /**
   * Enable proxy mode - requests go to proxy server instead of direct API
   * In proxy mode, apiKey is not sent from browser (proxy adds it server-side)
   */
  proxyMode?: boolean
}

/**
 * Create a new API client instance
 *
 * @param config - API configuration
 * @returns API client instance
 *
 * @example Direct mode (API key exposed in browser):
 * ```ts
 * const client = createApiClient({
 *   baseUrl: 'https://api.lesscms.io',
 *   apiKey: 'xxx',
 *   workspaceCode: 'my-ws',
 *   projectCode: 'my-proj',
 * })
 * ```
 *
 * @example Proxy mode (API key hidden server-side):
 * ```ts
 * const client = createApiClient({
 *   baseUrl: 'http://localhost:3001', // Proxy server URL
 *   apiKey: '', // Not needed in proxy mode
 *   workspaceCode: '', // Not needed in proxy mode
 *   projectCode: '', // Not needed in proxy mode
 *   proxyMode: true,
 * })
 * ```
 */
export function createApiClient(config: ApiClientConfig): ApiClient {
  const isProxy = config.proxyMode === true

  // In proxy mode: baseUrl/api/path
  // In direct mode: baseUrl/v1/workspace/project/path
  const basePath = isProxy
    ? `${config.baseUrl}/api`
    : `${config.baseUrl}/v1/${config.workspaceCode}/${config.projectCode}`

  async function get<T>(path: string, params?: Record<string, any>): Promise<T> {
    const url = new URL(`${basePath}${path}`)

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value))
        }
      })
    }

    console.log('API GET:', url.toString())

    // Build headers - only include API key in direct mode
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }

    if (!isProxy && config.apiKey) {
      headers['x-api-key'] = config.apiKey
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers,
      // Include credentials for proxy mode (cookies, etc.)
      credentials: isProxy ? 'include' : 'same-origin',
    })

    if (!response.ok) {
      let errorData
      try {
        errorData = await response.json()
      } catch {
        errorData = null
      }
      throw new ApiError(
        errorData?.message || `API error: ${response.status}`,
        response.status,
        response.statusText,
        errorData
      )
    }

    return response.json()
  }

  return {
    get,

    isProxyMode() {
      return isProxy
    },

    getPages() {
      return get<PagesListResponse>('/pages')
    },

    getPage(code: string) {
      return get<PageResponse>(`/pages/${encodeURIComponent(code)}`)
    },

    getCollection(code: string, params?: CollectionParams) {
      return get<CollectionResponse>(`/collections/${encodeURIComponent(code)}`, params)
    },

    getCollectionEntry(collectionCode: string, entryId: string) {
      return get(`/collections/${encodeURIComponent(collectionCode)}/${encodeURIComponent(entryId)}`)
    },

    getCollectionTemplate(collectionCode: string, templateId: string) {
      return get(`/collections/${encodeURIComponent(collectionCode)}/templates/${encodeURIComponent(templateId)}`)
    },

    getMenu(code: string) {
      return get<MenuResponse>(`/menus/${encodeURIComponent(code)}`)
    },

    getBlock(code: string) {
      return get<BlockResponse>(`/blocks/${encodeURIComponent(code)}`)
    },

    getElement(code: string) {
      return get<ElementResponse>(`/elements/${encodeURIComponent(code)}`)
    },

    getRoutes() {
      return get<RoutesResponse>('/routes')
    },
  }
}

/**
 * Default API client instance (can be configured later)
 */
let defaultClient: ApiClient | null = null

export function setDefaultClient(client: ApiClient) {
  defaultClient = client
}

export function getDefaultClient(): ApiClient | null {
  return defaultClient
}
