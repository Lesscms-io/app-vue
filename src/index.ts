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
