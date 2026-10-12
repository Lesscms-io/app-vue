/**
 * Global lightbox state (singleton).
 *
 * Widgets call `openLightbox(items, index, { zoom, title })`; the single
 * <LcmsLightbox /> mounted by LessCMSProvider renders it. Safe for SSR:
 * nothing touches window/document here, and the state only changes from
 * user actions.
 */

import { reactive, readonly } from 'vue'

export interface LightboxItem {
  src: string
  alt?: string
  caption?: string
  /** Default 'image'. Videos are shown with native controls and no zoom. */
  type?: 'image' | 'video'
  poster?: string
}

export interface LightboxOptions {
  /** Enable zoom (wheel, double click, +/−, pinch). Default true. */
  zoom?: boolean
  /** Entry / group title shown after the counter. Falls back to item caption. */
  title?: string
}

interface LightboxState {
  open: boolean
  items: LightboxItem[]
  index: number
  zoom: boolean
  title: string
}

const state = reactive<LightboxState>({ open: false, items: [], index: 0, zoom: true, title: '' })

export function openLightbox(items: LightboxItem[], index = 0, options: LightboxOptions = {}): void {
  if (!items || items.length === 0) return
  state.items = items
  state.index = Math.min(Math.max(0, index), items.length - 1)
  state.zoom = options.zoom !== false
  state.title = options.title || ''
  state.open = true
}

export function closeLightbox(): void {
  state.open = false
}

export function stepLightbox(delta: number): void {
  const n = state.items.length
  if (n === 0) return
  state.index = (state.index + delta + n) % n
}

export function useLightbox() {
  return {
    state: readonly(state),
    openLightbox,
    closeLightbox,
    stepLightbox
  }
}
