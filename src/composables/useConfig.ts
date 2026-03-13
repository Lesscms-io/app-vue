/**
 * useConfig Composable
 *
 * Fetches and manages project configuration including fonts and widgets.
 */

import { ref, onMounted, type Ref } from 'vue'
import { useApi } from './useApi'

import type { ColorVariable } from '../api/types'

export interface ProjectConfig {
  fonts: string[]
  custom_css_url: string | null
  custom_css_urls: string[]
  custom_css: string | null
  available_widgets: string[]
  available_fonts: string[]
  google_fonts_url: string | null
  page_route_schema: string
  collection_route_schema: string
  homepage_uuid: string | null
  color_variables: ColorVariable[]
  google_analytics_id: string | null
  google_tag_manager_id: string | null
  head_scripts: string | null
}

const defaultConfig: ProjectConfig = {
  fonts: ['Inter', 'Roboto'],
  custom_css_url: null,
  custom_css_urls: [],
  custom_css: null,
  available_widgets: [],
  available_fonts: [],
  google_fonts_url: null,
  page_route_schema: '/p/{slug}',
  collection_route_schema: '/c/{collection_code}/{slug}',
  homepage_uuid: null,
  color_variables: [],
  google_analytics_id: null,
  google_tag_manager_id: null,
  head_scripts: null,
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

/**
 * Inject Google Analytics (gtag.js)
 */
function loadGoogleAnalytics(gaId: string) {
  if (!gaId || document.querySelector(`script[src*="googletagmanager.com/gtag"]`)) return

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`
  document.head.appendChild(script)

  const inlineScript = document.createElement('script')
  inlineScript.textContent = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`
  document.head.appendChild(inlineScript)
}

/**
 * Inject Google Tag Manager
 */
function loadGoogleTagManager(gtmId: string) {
  if (!gtmId || document.querySelector(`script[src*="googletagmanager.com/gtm.js"]`)) return

  const script = document.createElement('script')
  script.textContent = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`
  document.head.appendChild(script)
}

/**
 * Inject custom head scripts
 */
function loadHeadScripts(html: string) {
  if (!html || !html.trim()) return

  const existing = document.querySelector('div[data-lesscms-head-scripts]')
  if (existing) existing.remove()

  const container = document.createElement('div')
  container.dataset.lesscmsHeadScripts = 'true'
  container.style.display = 'none'
  container.innerHTML = html
  // Move script tags to head so they execute
  const scripts = container.querySelectorAll('script')
  scripts.forEach(oldScript => {
    const newScript = document.createElement('script')
    for (const attr of oldScript.attributes) {
      newScript.setAttribute(attr.name, attr.value)
    }
    newScript.textContent = oldScript.textContent
    document.head.appendChild(newScript)
  })
  // Move non-script elements (e.g. noscript, meta) to head
  const nonScripts = container.querySelectorAll(':not(script)')
  nonScripts.forEach(el => {
    document.head.appendChild(el)
  })
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
        custom_css_urls: data.custom_css_urls || [],
        custom_css: data.custom_css || null,
        available_widgets: data.available_widgets || [],
        available_fonts: data.available_fonts || [],
        google_fonts_url: data.google_fonts_url,
        page_route_schema: data.page_route_schema || defaultConfig.page_route_schema,
        collection_route_schema: data.collection_route_schema || defaultConfig.collection_route_schema,
        homepage_uuid: data.homepage_uuid || null,
        color_variables: data.color_variables || [],
        google_analytics_id: data.google_analytics_id || null,
        google_tag_manager_id: data.google_tag_manager_id || null,
        head_scripts: data.head_scripts || null,
      }

      // Load fonts
      if (globalConfig.value.google_fonts_url) {
        loadGoogleFonts(globalConfig.value.google_fonts_url)
      }

      // Set font CSS variable
      setFontVariable(globalConfig.value.fonts)

      // Load custom CSS (external URLs — array format)
      if (globalConfig.value.custom_css_urls?.length) {
        for (const url of globalConfig.value.custom_css_urls) {
          loadCustomCss(url)
        }
      }
      // Fallback: legacy single URL format
      else if (globalConfig.value.custom_css_url) {
        loadCustomCss(globalConfig.value.custom_css_url)
      }

      // Load inline custom CSS
      if (globalConfig.value.custom_css) {
        loadCustomCssInline(globalConfig.value.custom_css)
      }

      // Load tracking scripts
      if (globalConfig.value.google_analytics_id) {
        loadGoogleAnalytics(globalConfig.value.google_analytics_id)
      }
      if (globalConfig.value.google_tag_manager_id) {
        loadGoogleTagManager(globalConfig.value.google_tag_manager_id)
      }
      if (globalConfig.value.head_scripts) {
        loadHeadScripts(globalConfig.value.head_scripts)
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
