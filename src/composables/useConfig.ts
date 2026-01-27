/**
 * useConfig Composable
 *
 * Fetches and manages project configuration including fonts and widgets.
 */

import { ref, onMounted, type Ref } from 'vue'
import { useApi } from './useApi'

export interface ProjectConfig {
  fonts: string[]
  custom_css_url: string | null
  custom_css: string | null
  available_widgets: string[]
  available_fonts: string[]
  google_fonts_url: string | null
}

const defaultConfig: ProjectConfig = {
  fonts: ['Inter', 'Roboto'],
  custom_css_url: null,
  custom_css: null,
  available_widgets: [],
  available_fonts: [],
  google_fonts_url: null,
}

// Global config state (singleton)
const globalConfig: Ref<ProjectConfig> = ref({ ...defaultConfig })
const isLoaded = ref(false)
const isLoading = ref(false)

/**
 * Load Google Fonts by injecting a <link> tag
 */
function loadGoogleFonts(url: string) {
  // Check if already loaded
  const existingLink = document.querySelector(`link[href="${url}"]`)
  if (existingLink) return

  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = url
  document.head.appendChild(link)
}

/**
 * Load custom CSS by injecting a <link> tag
 */
function loadCustomCss(url: string) {
  // Remove any existing custom CSS
  const existingLink = document.querySelector('link[data-lesscms-custom-css]')
  if (existingLink) {
    existingLink.remove()
  }

  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = url
  link.dataset.lesscmsCustomCss = 'true'
  document.head.appendChild(link)
}

/**
 * Load inline custom CSS by injecting a <style> tag (global, no scoping)
 */
function loadCustomCssInline(cssText: string) {
  const existingStyle = document.querySelector('style[data-lesscms-custom-css-inline]')
  if (existingStyle) {
    existingStyle.remove()
  }

  if (!cssText || !cssText.trim()) return

  const style = document.createElement('style')
  style.dataset.lesscmsCustomCssInline = 'true'
  style.textContent = cssText
  document.head.appendChild(style)
}

/**
 * Set CSS variable for primary font
 */
function setFontVariable(fonts: string[]) {
  if (fonts.length > 0) {
    const fontStack = fonts.map(f => `"${f}"`).join(', ') + ', sans-serif'
    document.documentElement.style.setProperty('--lcms-font-family', fontStack)
  }
}

export function useConfig() {
  const api = useApi()
  const error = ref<Error | null>(null)

  async function fetchConfig() {
    if (isLoaded.value || isLoading.value) {
      return globalConfig.value
    }

    isLoading.value = true
    error.value = null

    try {
      const response = await api.get('/config')
      const data = response.data as ProjectConfig

      globalConfig.value = {
        fonts: data.fonts || defaultConfig.fonts,
        custom_css_url: data.custom_css_url,
        custom_css: data.custom_css || null,
        available_widgets: data.available_widgets || [],
        available_fonts: data.available_fonts || [],
        google_fonts_url: data.google_fonts_url,
      }

      // Load fonts
      if (globalConfig.value.google_fonts_url) {
        loadGoogleFonts(globalConfig.value.google_fonts_url)
      }

      // Set font CSS variable
      setFontVariable(globalConfig.value.fonts)

      // Load custom CSS (external URL)
      if (globalConfig.value.custom_css_url) {
        loadCustomCss(globalConfig.value.custom_css_url)
      }

      // Load inline custom CSS
      if (globalConfig.value.custom_css) {
        loadCustomCssInline(globalConfig.value.custom_css)
      }

      isLoaded.value = true
    } catch (err: any) {
      console.error('Failed to load project config:', err)
      error.value = err
    } finally {
      isLoading.value = false
    }

    return globalConfig.value
  }

  return {
    config: globalConfig,
    loading: isLoading,
    loaded: isLoaded,
    error,
    fetchConfig,
    // Utility functions
    loadGoogleFonts,
    loadCustomCss,
    loadCustomCssInline,
    setFontVariable,
  }
}
