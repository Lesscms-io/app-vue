/**
 * Plugin extensions registry — generic, plugin-agnostic.
 *
 * The library defines the *contract* (types + inject helper). The host app
 * (e.g. the Nuxt renderer) is responsible for *building* the registry by
 * scanning its `extensions/` directory and providing it via:
 *
 *   app.provide(PLUGIN_EXTENSIONS_KEY, registry)
 *
 * Components like `PluginSlot` and the page-routing layer call
 * `usePluginExtensions()` and consume the data without knowing where the
 * extensions actually live on disk.
 */

import { inject, type Component, type InjectionKey } from 'vue'

export interface PluginPageEntry {
  pluginId: string
  /** Route pattern with `:param` placeholders, e.g. `/konto/albumy/:albumId/return`. */
  route: string
  /** Async loader for the Vue component. */
  loader: () => Promise<Component>
}

export interface PluginSlotEntry {
  pluginId: string
  /** Stable identifier within the slot — used for keys, active-state matching, etc. */
  key: string
  /** Display label (when the slot is rendered as e.g. a tab list). */
  label?: string
  /** Async loader for the Vue component. */
  loader: () => Promise<Component>
}

export interface PluginExtensions {
  pages: PluginPageEntry[]
  slots: Record<string, PluginSlotEntry[]>
}

// String literal (not Symbol) on purpose: the library can be loaded twice when
// yarn-linked (the same file resolves through both `@lib/...` and a relative
// path inside the library) and Symbol identity does not survive across module
// instances. A string literal is the same value in any instance, so
// provide/inject keeps matching no matter how many copies of this module Vite
// ends up evaluating.
export const PLUGIN_EXTENSIONS_KEY = 'lcms-plugin-extensions' as unknown as InjectionKey<PluginExtensions>

const EMPTY_REGISTRY: PluginExtensions = { pages: [], slots: {} }

export function usePluginExtensions(): PluginExtensions {
  return inject(PLUGIN_EXTENSIONS_KEY, EMPTY_REGISTRY)
}

export function useSlotEntries(slotName: string): PluginSlotEntry[] {
  return usePluginExtensions().slots[slotName] || []
}
