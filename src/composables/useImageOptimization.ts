/**
 * Image Optimization Helpers
 *
 * Builds srcset from image URL by appending ?w= query params.
 * Image proxy (img.lesscms.io) handles resize + WebP conversion.
 *
 * Allowed presets: 100, 200, 400, 600, 800, 1200, 1920
 */

const PRESETS = [400, 800, 1200]
const PRESETS_SMALL = [100, 200, 400]
const PRESETS_HERO = [800, 1200, 1920]

// SVG is vector — image-proxy doesn't allow svg in its IMAGE_EXTENSIONS
// allowlist (returns 400) and rasterizing via Sharp would lose quality.
// Skip the proxy entirely and serve the original asset.
function isSvg(url: string): boolean {
  if (!url) return false
  try {
    return new URL(url).pathname.toLowerCase().endsWith('.svg')
  } catch {
    return url.toLowerCase().split('?')[0].endsWith('.svg')
  }
}

/**
 * Build srcset string from image URL
 */
export function buildSrcset(url: string, widths: number[] = PRESETS): string {
  if (!url) return ''
  if (isSvg(url)) return url
  const sep = url.includes('?') ? '&' : '?'
  return widths.map(w => `${url}${sep}w=${w} ${w}w`).join(', ')
}

/**
 * Build src with specific width
 */
export function buildSrc(url: string, width: number): string {
  if (!url) return ''
  if (isSvg(url)) return url
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}w=${width}`
}

/**
 * Get srcset + sizes for content images (collection grid, image widget)
 */
export function contentImage(url: string) {
  return {
    src: buildSrc(url, 800),
    srcset: buildSrcset(url, PRESETS),
    sizes: '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
  }
}

/**
 * Get srcset + sizes for small images (avatars, thumbnails)
 */
export function smallImage(url: string) {
  return {
    src: buildSrc(url, 200),
    srcset: buildSrcset(url, PRESETS_SMALL),
    sizes: '200px'
  }
}

/**
 * Get srcset + sizes for hero/background images
 */
export function heroImage(url: string) {
  return {
    src: buildSrc(url, 1200),
    srcset: buildSrcset(url, PRESETS_HERO),
    sizes: '100vw'
  }
}
