/**
 * Composables exports
 */

export { useApi, useApiOptional } from './useApi'
export { useLanguage, extractMultilingualValue, type UseLanguageReturn } from './useLanguage'
export { usePage, type UsePageReturn } from './usePage'
export { useCollection, useCollectionEntry, type UseCollectionReturn, type UseCollectionOptions } from './useCollection'
export { useMenu, type UseMenuReturn } from './useMenu'
export { useRoutes, type ResolvedRoute } from './useRoutes'
export {
  useResponsiveSettings,
  getResponsiveValue,
  mergeSettingsForBreakpoint,
  isHiddenForBreakpoint,
  BREAKPOINTS,
  breakpointCssVars,
  type Breakpoint
} from './useResponsiveSettings'
export {
  buildSrcset,
  buildSrc,
  contentImage,
  smallImage,
  heroImage
} from './useImageOptimization'

// Ecommerce composables
export { useStorefront, type CommerceContext, type UseStorefrontResult } from './useStorefront'
export { useCart, type CartStore } from './useCart'
export { useCustomer, type CustomerStore } from './useCustomer'
export { useToast, type ToastApi, type Toast } from './useToast'
export { useActiveCampaigns, provideActiveCampaigns, type UseActiveCampaignsResult } from './useActiveCampaigns'
export { useEditorMode } from './useEditorMode'
