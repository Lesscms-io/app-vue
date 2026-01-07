/**
 * Responsive Settings Composable
 *
 * Handles responsive breakpoints and provides merged settings
 * based on current viewport size. Falls back to desktop values
 * when no override exists.
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { BaseSettings } from '@/api/types'

/**
 * Breakpoint definitions - matching FE configuration
 */
export const BREAKPOINTS = {
  desktop: {
    min: 1200,
    max: Infinity,
    label: 'Desktop',
    mediaQuery: '(min-width: 1200px)'
  },
  tablet: {
    min: 768,
    max: 1199,
    label: 'Tablet',
    mediaQuery: '(min-width: 768px) and (max-width: 1199px)'
  },
  mobile: {
    min: 0,
    max: 767,
    label: 'Mobile',
    mediaQuery: '(max-width: 767px)'
  }
} as const

export type Breakpoint = keyof typeof BREAKPOINTS

/**
 * Current breakpoint - shared reactive state
 */
const currentBreakpoint = ref<Breakpoint>('desktop')
let isInitialized = false
let listenerCount = 0

/**
 * Detect current breakpoint based on window width
 */
function detectBreakpoint(): Breakpoint {
  if (typeof window === 'undefined') return 'desktop'

  const width = window.innerWidth
  if (width >= BREAKPOINTS.desktop.min) return 'desktop'
  if (width >= BREAKPOINTS.tablet.min) return 'tablet'
  return 'mobile'
}

/**
 * Handle resize event
 */
function handleResize() {
  currentBreakpoint.value = detectBreakpoint()
}

/**
 * Initialize viewport listener (singleton pattern)
 */
function initializeListener() {
  if (typeof window === 'undefined') return
  if (isInitialized) return

  currentBreakpoint.value = detectBreakpoint()
  window.addEventListener('resize', handleResize, { passive: true })
  isInitialized = true
}

/**
 * Cleanup viewport listener
 */
function cleanupListener() {
  if (typeof window === 'undefined') return
  if (!isInitialized) return
  if (listenerCount > 0) return // Other components still using it

  window.removeEventListener('resize', handleResize)
  isInitialized = false
}

/**
 * Composable for handling responsive settings with automatic viewport detection
 *
 * @returns Responsive settings utilities
 */
export function useResponsiveSettings() {
  // Track listener usage
  onMounted(() => {
    listenerCount++
    initializeListener()
  })

  onUnmounted(() => {
    listenerCount--
    cleanupListener()
  })

  /**
   * Get effective value for a property based on current breakpoint
   * Falls back: responsive[breakpoint][property] -> desktop[property] -> defaultValue
   */
  function getValue<T>(settings: BaseSettings | undefined, property: keyof BaseSettings, defaultValue?: T): T | undefined {
    if (!settings) return defaultValue

    // For desktop, return desktop value directly
    if (currentBreakpoint.value === 'desktop') {
      return (settings[property] as T) ?? defaultValue
    }

    // Check for responsive override
    const responsiveValue = settings?.responsive?.[currentBreakpoint.value]?.[property]
    if (responsiveValue !== undefined) {
      return responsiveValue as T
    }

    // Fall back to desktop value
    return (settings[property] as T) ?? defaultValue
  }

  /**
   * Get merged settings for current breakpoint
   * Merges desktop settings with responsive overrides
   */
  function getMergedSettings<T extends BaseSettings>(settings: T | undefined): T {
    if (!settings) return {} as T

    // Desktop - return as-is
    if (currentBreakpoint.value === 'desktop') {
      return settings
    }

    // Merge responsive overrides
    const responsiveOverrides = settings.responsive?.[currentBreakpoint.value] || {}

    return {
      ...settings,
      ...responsiveOverrides
    } as T
  }

  /**
   * Check if element is hidden for current breakpoint
   * Note: Hidden is independent per breakpoint - no fallback to desktop
   */
  function isHidden(settings: BaseSettings | undefined): boolean {
    if (!settings) return false

    // For desktop, check desktop hidden value
    if (currentBreakpoint.value === 'desktop') {
      return settings.hidden ?? false
    }

    // For tablet/mobile, check responsive override only (no fallback)
    const responsiveHidden = settings.responsive?.[currentBreakpoint.value]?.hidden
    return responsiveHidden ?? false
  }

  /**
   * Check if should stack columns on current breakpoint
   */
  function shouldStack(settings: { stackOnTablet?: boolean; stackOnMobile?: boolean } | undefined): boolean {
    if (!settings) {
      // Default: stack on mobile, don't stack on tablet
      return currentBreakpoint.value === 'mobile'
    }

    if (currentBreakpoint.value === 'tablet') {
      return settings.stackOnTablet ?? false
    }

    if (currentBreakpoint.value === 'mobile') {
      return settings.stackOnMobile ?? true // Default true for mobile
    }

    return false
  }

  return {
    currentBreakpoint: computed(() => currentBreakpoint.value),
    isDesktop: computed(() => currentBreakpoint.value === 'desktop'),
    isTablet: computed(() => currentBreakpoint.value === 'tablet'),
    isMobile: computed(() => currentBreakpoint.value === 'mobile'),
    getValue,
    getMergedSettings,
    isHidden,
    shouldStack,
    BREAKPOINTS
  }
}

/**
 * Standalone helper: get effective value for a property
 * Use when you don't need reactive viewport detection
 */
export function getResponsiveValue<T>(
  settings: BaseSettings | undefined,
  property: keyof BaseSettings,
  breakpoint: Breakpoint,
  defaultValue?: T
): T | undefined {
  if (!settings) return defaultValue

  if (breakpoint === 'desktop') {
    return (settings[property] as T) ?? defaultValue
  }

  const responsiveValue = settings?.responsive?.[breakpoint]?.[property]
  if (responsiveValue !== undefined) {
    return responsiveValue as T
  }

  return (settings[property] as T) ?? defaultValue
}

/**
 * Standalone helper: merge settings for a breakpoint
 */
export function mergeSettingsForBreakpoint<T extends BaseSettings>(
  settings: T | undefined,
  breakpoint: Breakpoint
): T {
  if (!settings) return {} as T
  if (breakpoint === 'desktop') return settings

  const responsiveOverrides = settings.responsive?.[breakpoint] || {}
  return { ...settings, ...responsiveOverrides } as T
}

/**
 * Standalone helper: check if hidden for breakpoint
 */
export function isHiddenForBreakpoint(
  settings: BaseSettings | undefined,
  breakpoint: Breakpoint
): boolean {
  if (!settings) return false

  if (breakpoint === 'desktop') {
    return settings.hidden ?? false
  }

  return settings.responsive?.[breakpoint]?.hidden ?? false
}

/**
 * CSS custom properties for breakpoints (to use in :root)
 */
export const breakpointCssVars = {
  '--lcms-breakpoint-desktop': `${BREAKPOINTS.desktop.min}px`,
  '--lcms-breakpoint-tablet': `${BREAKPOINTS.tablet.min}px`,
  '--lcms-breakpoint-mobile': `${BREAKPOINTS.mobile.max}px`
}
