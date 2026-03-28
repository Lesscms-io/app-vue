/**
 * Image Optimization Composable
 *
 * Consumes optimized image data from API responses.
 * API returns image data in two formats:
 *
 * 1. Optimized (object): { src, srcset, original }
 * 2. Legacy (string): plain URL
 *
 * This composable handles both formats and provides
 * computed properties for use in <img> tags.
 */

import { computed, type Ref, unref, type MaybeRef } from 'vue'

export interface OptimizedImage {
  src: string
  srcset: string
  original: string
}

export type ImageData = OptimizedImage | string | null | undefined

/**
 * Check if value is an optimized image object from API
 */
function isOptimizedImage(value: unknown): value is OptimizedImage {
  return (
    typeof value === 'object' &&
    value !== null &&
    'src' in value &&
    'srcset' in value &&
    'original' in value
  )
}

/**
 * Extract image properties from API response data.
 * Works with both optimized objects and plain URL strings.
 *
 * @param imageData - Reactive or plain image data from API
 * @param defaultSizes - Default sizes attribute for srcset
 * @returns Computed properties for <img> tag
 */
export function useImageOptimization(
  imageData: MaybeRef<ImageData>,
  defaultSizes: string = '100vw'
) {
  const data = computed(() => unref(imageData))

  const src = computed(() => {
    const val = data.value
    if (!val) return ''
    if (isOptimizedImage(val)) return val.src
    return val
  })

  const srcset = computed(() => {
    const val = data.value
    if (!val || !isOptimizedImage(val)) return undefined
    return val.srcset
  })

  const original = computed(() => {
    const val = data.value
    if (!val) return ''
    if (isOptimizedImage(val)) return val.original
    return val
  })

  const sizes = computed(() => {
    if (!srcset.value) return undefined
    return defaultSizes
  })

  return {
    src,
    srcset,
    original,
    sizes
  }
}

/**
 * Non-reactive helper to extract src from image data.
 * Useful in computed properties and template expressions.
 */
export function getImageSrc(imageData: ImageData): string {
  if (!imageData) return ''
  if (isOptimizedImage(imageData)) return imageData.src
  return imageData
}

/**
 * Non-reactive helper to extract srcset from image data.
 */
export function getImageSrcset(imageData: ImageData): string | undefined {
  if (!imageData || !isOptimizedImage(imageData)) return undefined
  return imageData.srcset
}

/**
 * Non-reactive helper to get original URL from image data.
 * Useful for lightbox / full-resolution viewing.
 */
export function getImageOriginal(imageData: ImageData): string {
  if (!imageData) return ''
  if (isOptimizedImage(imageData)) return imageData.original
  return imageData
}
