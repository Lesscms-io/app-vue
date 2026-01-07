/**
 * useSeo Composable
 *
 * Automatically sets HTML meta tags based on SEO data from LessCMS API.
 * Uses @unhead/vue for managing document head.
 */

import { computed, watch, type Ref, type ComputedRef } from 'vue'
import { useHead } from '@unhead/vue'
import type { SeoData, SeoLanguageData } from '../api/types'

export interface UseSeoOptions {
  /**
   * SEO data from API (keyed by language)
   */
  seo: Ref<SeoData | null> | ComputedRef<SeoData | null>

  /**
   * Current language code
   */
  language: Ref<string> | ComputedRef<string> | string

  /**
   * Default title to use if SEO title is not set
   */
  defaultTitle?: string

  /**
   * Title template (use %s for title placeholder)
   * Example: "%s | My Site"
   */
  titleTemplate?: string
}

export interface UseSeoReturn {
  /**
   * Current SEO data for the active language
   */
  currentSeo: ComputedRef<SeoLanguageData | null>
}

/**
 * Composable for automatically setting HTML meta tags from LessCMS SEO data
 *
 * @example
 * ```vue
 * <script setup>
 * import { usePage, useSeo } from '@lesscms/vue-widgets'
 *
 * const { seo } = usePage('home')
 *
 * useSeo({
 *   seo,
 *   language: 'en',
 *   titleTemplate: '%s | My Website'
 * })
 * </script>
 * ```
 */
export function useSeo(options: UseSeoOptions): UseSeoReturn {
  const { seo, language, defaultTitle, titleTemplate } = options

  // Get language value (handle both ref and string)
  const getLanguage = () => {
    if (typeof language === 'string') return language
    return language.value
  }

  // Get current SEO data for active language
  const currentSeo = computed<SeoLanguageData | null>(() => {
    const seoData = typeof seo === 'object' && 'value' in seo ? seo.value : seo
    if (!seoData) return null

    const lang = getLanguage()
    return seoData[lang] || null
  })

  // Build robots meta content
  const robotsContent = computed(() => {
    const robots = currentSeo.value?.robots
    if (!robots) return undefined

    const parts: string[] = []

    if (robots.index === false) {
      parts.push('noindex')
    } else {
      parts.push('index')
    }

    if (robots.follow === false) {
      parts.push('nofollow')
    } else {
      parts.push('follow')
    }

    if (robots.max_snippet !== undefined && robots.max_snippet !== -1) {
      parts.push(`max-snippet:${robots.max_snippet}`)
    }

    if (robots.max_image_preview && robots.max_image_preview !== 'large') {
      parts.push(`max-image-preview:${robots.max_image_preview}`)
    }

    if (robots.max_video_preview !== undefined && robots.max_video_preview !== -1) {
      parts.push(`max-video-preview:${robots.max_video_preview}`)
    }

    return parts.length > 0 ? parts.join(', ') : undefined
  })

  // Build title with template
  const computedTitle = computed(() => {
    const seoTitle = currentSeo.value?.title
    const title = seoTitle || defaultTitle

    if (!title) return undefined

    if (titleTemplate) {
      return titleTemplate.replace('%s', title)
    }

    return title
  })

  // Use @unhead/vue to set meta tags
  useHead({
    // Title
    title: computedTitle,

    // Meta tags
    meta: computed(() => {
      const seoData = currentSeo.value
      if (!seoData) return []

      const meta: Array<{ name?: string; property?: string; content: string }> = []

      // Basic SEO
      if (seoData.meta_description) {
        meta.push({ name: 'description', content: seoData.meta_description })
      }

      // Robots
      if (robotsContent.value) {
        meta.push({ name: 'robots', content: robotsContent.value })
      }

      // Open Graph
      if (seoData.og) {
        const og = seoData.og

        if (og.title) {
          meta.push({ property: 'og:title', content: og.title })
        }

        if (og.description) {
          meta.push({ property: 'og:description', content: og.description })
        }

        if (og.type) {
          meta.push({ property: 'og:type', content: og.type })
        }

        if (og.url) {
          meta.push({ property: 'og:url', content: og.url })
        }

        if (og.site_name) {
          meta.push({ property: 'og:site_name', content: og.site_name })
        }

        if (og.locale) {
          meta.push({ property: 'og:locale', content: og.locale })
        }

        // OG Image
        if (og.image?.url) {
          meta.push({ property: 'og:image', content: og.image.url })

          if (og.image.alt) {
            meta.push({ property: 'og:image:alt', content: og.image.alt })
          }

          if (og.image.width) {
            meta.push({ property: 'og:image:width', content: String(og.image.width) })
          }

          if (og.image.height) {
            meta.push({ property: 'og:image:height', content: String(og.image.height) })
          }
        }
      }

      // Twitter Cards
      if (seoData.twitter) {
        const twitter = seoData.twitter

        if (twitter.card) {
          meta.push({ name: 'twitter:card', content: twitter.card })
        }

        if (twitter.title) {
          meta.push({ name: 'twitter:title', content: twitter.title })
        }

        if (twitter.description) {
          meta.push({ name: 'twitter:description', content: twitter.description })
        }

        if (twitter.image) {
          meta.push({ name: 'twitter:image', content: twitter.image })
        }
      }

      // Custom meta tags
      if (seoData.custom_meta && seoData.custom_meta.length > 0) {
        for (const customMeta of seoData.custom_meta) {
          if (customMeta.property && customMeta.content) {
            // Check if it's a property (og:, fb:, etc.) or name
            if (customMeta.property.includes(':')) {
              meta.push({ property: customMeta.property, content: customMeta.content })
            } else {
              meta.push({ name: customMeta.property, content: customMeta.content })
            }
          }
        }
      }

      return meta
    }),

    // Canonical URL
    link: computed(() => {
      const canonical = currentSeo.value?.canonical_url
      if (!canonical) return []

      return [{ rel: 'canonical', href: canonical }]
    })
  })

  return {
    currentSeo
  }
}
