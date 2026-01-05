import { ref, computed } from 'vue'
import { useApi } from './useApi'
import type { RoutePageItem, RouteCollectionItem } from '@/api/types'

export interface ResolvedRoute {
  pageCode: string
  pageUuid: string
  params: Record<string, string>
  isHomepage: boolean
}

/**
 * Composable for handling routing based on page patterns
 *
 * Usage:
 * const { loadRoutes, resolve, buildUrl, isLoaded } = useRoutes()
 *
 * // Load routes on app startup
 * await loadRoutes()
 *
 * // Resolve a path to a page
 * const resolved = resolve('/blog/my-post')
 * // { pageCode: 'blog-post', params: { slug: 'my-post' }, isHomepage: false }
 *
 * // Build URL for a page
 * const url = buildUrl('blog-post', { slug: 'my-post' })
 * // '/blog/my-post'
 */
export function useRoutes() {
  const api = useApi()

  const homepage = ref<{ code: string; url: string; page_uuid: string } | null>(null)
  const pages = ref<RoutePageItem[]>([])
  const collections = ref<RouteCollectionItem[]>([])
  const isLoaded = ref(false)
  const isLoading = ref(false)
  const error = ref<Error | null>(null)

  /**
   * Load routes from API
   */
  async function loadRoutes(): Promise<void> {
    if (isLoaded.value || isLoading.value) return

    isLoading.value = true
    error.value = null

    try {
      const response = await api.getRoutes()
      homepage.value = response.data.homepage
      pages.value = response.data.pages
      collections.value = response.data.collections
      isLoaded.value = true
    } catch (e) {
      error.value = e instanceof Error ? e : new Error('Failed to load routes')
      console.error('Failed to load routes:', e)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Extract parameters from a URL pattern
   */
  function extractParams(pattern: string): string[] {
    const matches = pattern.match(/\{(\w+)\}/g) || []
    return matches.map(m => m.slice(1, -1))
  }

  /**
   * Convert a URL pattern to a regex for matching
   */
  function patternToRegex(pattern: string): RegExp {
    // Escape special regex characters except for our placeholders
    let regexStr = pattern.replace(/[.*+?^${}()|[\]\\]/g, (match) => {
      // Don't escape our placeholders
      if (match === '{' || match === '}') return match
      return '\\' + match
    })

    // Replace {param} with named capture groups
    regexStr = regexStr.replace(/\{(\w+)\}/g, '(?<$1>[^/]+)')

    // Ensure exact match
    return new RegExp(`^${regexStr}$`)
  }

  /**
   * Resolve a path to a page and extract parameters
   */
  function resolve(path: string): ResolvedRoute | null {
    if (!isLoaded.value) {
      console.warn('Routes not loaded yet. Call loadRoutes() first.')
      return null
    }

    // Normalize path
    const normalizedPath = path.startsWith('/') ? path : '/' + path

    // Check homepage
    if (homepage.value && (normalizedPath === '/' || normalizedPath === homepage.value.url)) {
      return {
        pageCode: homepage.value.code,
        pageUuid: homepage.value.page_uuid,
        params: {},
        isHomepage: true
      }
    }

    // Try static pages first (exact match)
    for (const page of pages.value) {
      if (!page.pattern && page.url === normalizedPath) {
        return {
          pageCode: page.code,
          pageUuid: page.page_uuid,
          params: {},
          isHomepage: false
        }
      }
    }

    // Try dynamic pages (pattern match)
    for (const page of pages.value) {
      if (page.pattern) {
        const regex = patternToRegex(page.pattern)
        const match = normalizedPath.match(regex)

        if (match && match.groups) {
          return {
            pageCode: page.code,
            pageUuid: page.page_uuid,
            params: { ...match.groups },
            isHomepage: false
          }
        }
      }
    }

    return null
  }

  /**
   * Build a URL from a page code and parameters
   */
  function buildUrl(pageCode: string, params: Record<string, string> = {}): string | null {
    if (!isLoaded.value) {
      console.warn('Routes not loaded yet. Call loadRoutes() first.')
      return null
    }

    // Check homepage
    if (homepage.value && homepage.value.code === pageCode) {
      return '/'
    }

    // Find page
    const page = pages.value.find(p => p.code === pageCode)
    if (!page) {
      console.warn(`Page not found: ${pageCode}`)
      return null
    }

    // If no pattern, return static URL
    if (!page.pattern) {
      return page.url
    }

    // Build URL from pattern
    let url = page.pattern
    const requiredParams = extractParams(page.pattern)

    for (const param of requiredParams) {
      const value = params[param]
      if (value === undefined || value === null || value === '') {
        console.warn(`Missing required parameter: ${param} for page ${pageCode}`)
        return null
      }
      url = url.replace(`{${param}}`, encodeURIComponent(String(value)))
    }

    return url
  }

  /**
   * Build entry URL for a collection
   */
  function buildEntryUrl(
    collectionCode: string,
    entry: { entry_id?: string; data?: Record<string, any> },
    language: string = 'pl'
  ): string | null {
    if (!isLoaded.value) {
      console.warn('Routes not loaded yet. Call loadRoutes() first.')
      return null
    }

    const collection = collections.value.find(c => c.code === collectionCode)
    if (!collection || !collection.entry_url_pattern) {
      return null
    }

    const pattern = collection.entry_url_pattern
    const params = extractParams(pattern)
    const paramValues: Record<string, string> = {}

    for (const param of params) {
      switch (param) {
        case 'lang':
          paramValues[param] = language
          break
        case 'slug':
          if (collection.entry_url_field && entry.data) {
            const fieldValue = entry.data[collection.entry_url_field]
            // Handle multilingual fields
            if (fieldValue && typeof fieldValue === 'object' && !Array.isArray(fieldValue)) {
              paramValues[param] = fieldValue[language] || fieldValue.pl || Object.values(fieldValue)[0] as string || ''
            } else {
              paramValues[param] = fieldValue || entry.entry_id || ''
            }
          } else {
            paramValues[param] = entry.entry_id || ''
          }
          break
        case 'entry_id':
          paramValues[param] = entry.entry_id || ''
          break
        default:
          // Try to get from entry data
          if (entry.data && entry.data[param]) {
            const value = entry.data[param]
            if (value && typeof value === 'object' && !Array.isArray(value)) {
              paramValues[param] = value[language] || value.pl || Object.values(value)[0] as string || ''
            } else {
              paramValues[param] = String(value)
            }
          }
          break
      }
    }

    // Build URL
    let url = pattern
    for (const param of params) {
      const value = paramValues[param]
      if (!value) {
        return null // Missing required parameter
      }
      url = url.replace(`{${param}}`, encodeURIComponent(value))
    }

    return url
  }

  /**
   * Get all static pages (for navigation)
   */
  const staticPages = computed(() => {
    return pages.value.filter(p => !p.pattern || extractParams(p.pattern).length === 0)
  })

  /**
   * Get all dynamic pages
   */
  const dynamicPages = computed(() => {
    return pages.value.filter(p => p.pattern && extractParams(p.pattern).length > 0)
  })

  return {
    // State
    homepage,
    pages,
    collections,
    isLoaded,
    isLoading,
    error,

    // Computed
    staticPages,
    dynamicPages,

    // Methods
    loadRoutes,
    resolve,
    buildUrl,
    buildEntryUrl,
    extractParams
  }
}
