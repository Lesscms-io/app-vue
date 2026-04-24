/**
 * LessCMS Vue Widget Library
 *
 * Main entry point - exports all components, composables, and utilities.
 */

// Provider
export { default as LessCMSProvider } from './components/LessCMSProvider.vue'

// Renderers
export { default as PageRenderer } from './components/PageRenderer.vue'
export { default as SectionRenderer } from './components/SectionRenderer.vue'
export { default as WidgetRenderer } from './components/WidgetRenderer.vue'

// View components
export { default as CollectionListView } from './components/CollectionListView.vue'
export { default as CollectionEntryView } from './components/CollectionEntryView.vue'
export { default as DynamicPageResolver } from './components/DynamicPageResolver.vue'

// Widgets - All
export * from './components/widgets'

// Widget registry
export {
  widgetComponents,
  getWidgetComponent,
  isWidgetSupported,
  getSupportedWidgetTypes,
} from './components/widgets'

// Composables
export { useApi, type ApiClient } from './composables/useApi'
export { useLanguage } from './composables/useLanguage'
export { usePage } from './composables/usePage'
export { useCollection, useCollectionEntry } from './composables/useCollection'
export { useMenu } from './composables/useMenu'
export { useConfig, type ProjectConfig } from './composables/useConfig'
export { useSeo, type UseSeoOptions, type UseSeoReturn } from './composables/useSeo'
export { useRedirects } from './composables/useRedirects'
export { usePageTransition } from './composables/usePageTransition'

// Ecommerce composables
export { useStorefront, type CommerceContext, type UseStorefrontResult } from './composables/useStorefront'
export { useCart, type CartStore } from './composables/useCart'
export { useCustomer, type CustomerStore } from './composables/useCustomer'
export { useToast, type ToastApi, type Toast } from './composables/useToast'

// Plugin extensions (host app provides registry via app.provide(PLUGIN_EXTENSIONS_KEY, ...))
export {
  PLUGIN_EXTENSIONS_KEY,
  usePluginExtensions,
  useSlotEntries,
  type PluginExtensions,
  type PluginPageEntry,
  type PluginSlotEntry,
} from './composables/usePluginExtensions'
export { default as PluginSlot } from './components/PluginSlot.vue'

// Storefront API
export {
  createStorefrontClient,
  StorefrontApiError,
  type StorefrontClient,
  type StorefrontProduct,
  type StorefrontCategory,
  type StorefrontCart,
  type StorefrontCartItem,
  type StorefrontCustomer,
  type StorefrontAddress,
  type StorefrontOrder,
  type StorefrontShippingMethod,
  type CheckoutRequest,
  type RegisterRequest,
} from './api/storefront'

// Utilities
export { resolveColor, hexToRgba } from './utils/resolveColor'
export { formatPrice, calculateDiscount } from './utils/currency'

// API
export { createApiClient } from './api/client'
export type * from './api/types'

// Types
export type * from './types/widgets'

// Router
export {
  createLessCMSRouter,
  getLessCMSRoutes,
  defaultRoutes,
  type LessCMSRouterOptions,
} from './router'

// Styles (users should import these directly)
// import '@lesscms/vue-widgets/styles/variables.css'
// import '@lesscms/vue-widgets/styles/widgets.css'
