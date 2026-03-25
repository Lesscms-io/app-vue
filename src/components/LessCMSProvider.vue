<script setup lang="ts">
/**
 * LessCMS Provider Component
 *
 * Provides API configuration and client to all child components.
 * Must wrap any component that uses LessCMS composables or widgets.
 *
 * Features:
 * - Provides API client to all children via inject
 * - Automatically loads project config (fonts, widgets, custom CSS)
 * - Injects Google Fonts and custom stylesheets
 *
 * @example
 * ```vue
 * <LessCMSProvider
 *   base-url="https://api.lesscms.io"
 *   api-key="your-api-key"
 *   workspace-code="my-workspace"
 *   project-code="my-project"
 *   default-language="pl"
 * >
 *   <PageRenderer code="home" />
 * </LessCMSProvider>
 * ```
 */

import { provide, reactive, watch, onMounted, ref, computed, getCurrentInstance } from 'vue'
import { createHead, type Head } from '@unhead/vue'
import { createApiClient, type ApiClient, type ApiClientConfig } from '../api/client'
import type { LessCMSConfig, ProjectConfig } from '../api/types'

interface Props {
  /**
   * Base URL of the LessCMS API or proxy server
   * @example "https://api.lesscms.io" (direct mode)
   * @example "http://localhost:3001" (proxy mode)
   */
  baseUrl: string

  /**
   * API key for authentication (not needed in proxy mode)
   */
  apiKey?: string

  /**
   * Workspace code (not needed in proxy mode)
   */
  workspaceCode?: string

  /**
   * Project code (not needed in proxy mode)
   */
  projectCode?: string

  /**
   * Default language for multilingual content
   * @default "pl"
   */
  defaultLanguage?: string

  /**
   * Whether to automatically load project config (fonts, CSS)
   * @default true
   */
  autoLoadConfig?: boolean

  /**
   * Enable proxy mode - API key is stored server-side, not exposed in browser
   * In proxy mode, only baseUrl is needed (apiKey, workspace, project configured in proxy)
   * @default false
   */
  proxyMode?: boolean

  /**
   * Enable automatic SEO meta tag management via @unhead/vue
   * When enabled, LessCMSProvider will install the Unhead plugin if not already installed.
   * @default true
   */
  enableSeo?: boolean

  /**
   * Email sending configuration (e.g. for form widget notifications).
   * Currently supports Mailtrap Send API.
   */
  emailConfig?: {
    provider: 'mailtrap'
    token: string
    fromEmail: string
    fromName?: string
  }
}

const props = withDefaults(defineProps<Props>(), {
  apiKey: '',
  workspaceCode: '',
  projectCode: '',
  defaultLanguage: 'pl',
  autoLoadConfig: true,
  proxyMode: false,
  enableSeo: true,
})

const emit = defineEmits<{
  (e: 'configLoaded', config: ProjectConfig): void
  (e: 'configError', error: Error): void
}>()

// Create reactive config
const config = reactive<ApiClientConfig>({
  baseUrl: props.baseUrl,
  apiKey: props.apiKey,
  workspaceCode: props.workspaceCode,
  projectCode: props.projectCode,
  language: props.defaultLanguage,
  proxyMode: props.proxyMode,
})

// Computed to check if we're in proxy mode
const isProxyMode = computed(() => props.proxyMode)

// Install @unhead/vue if SEO is enabled and not already installed
if (props.enableSeo) {
  const instance = getCurrentInstance()
  if (instance) {
    const app = instance.appContext.app
    // Check if Unhead is already installed (avoid duplicate installation)
    if (!app.config.globalProperties.$head) {
      const head = createHead()
      app.use(head)
    }
  }
}

// Project config state
const projectConfig = ref<ProjectConfig | null>(null)
const configLoading = ref(false)
const configError = ref<Error | null>(null)

// Create API client
let apiClient: ApiClient = createApiClient(config)

// Watch for prop changes and update config
watch(
  () => [props.baseUrl, props.apiKey, props.workspaceCode, props.projectCode, props.defaultLanguage, props.proxyMode],
  () => {
    config.baseUrl = props.baseUrl
    config.apiKey = props.apiKey
    config.workspaceCode = props.workspaceCode
    config.projectCode = props.projectCode
    config.language = props.defaultLanguage
    config.proxyMode = props.proxyMode
    // Recreate client with new config
    apiClient = createApiClient(config)
    provide('lesscms-api', apiClient)
  }
)

// Provide config and API client to children
provide('lesscms-config', config)
provide('lesscms-api', apiClient)
provide('lesscms-project-config', projectConfig)
provide('lesscms-email-config', props.emailConfig || null)

// Route pages cache (populated after routes are loaded by DynamicPageResolver)
const routePages = ref<Array<{ code: string; url: string; page_uuid: string }>>([])
provide('lesscms-route-pages', routePages)

// Provide route resolver for link_type:"page" widgets
const resolvePageUrl = (pageCode: string | null, pageUuid: string | null): string => {
  if (!pageCode && !pageUuid) return '#'
  const schema = projectConfig.value?.page_route_schema || '/{slug}'

  // Resolve by page_code (most reliable)
  if (pageCode) {
    return schema.replace('{slug}', pageCode)
  }

  // Resolve by page_uuid
  if (pageUuid) {
    // Check homepage
    if (projectConfig.value?.homepage_uuid === pageUuid) {
      return '/'
    }
    // Try to find in cached route pages
    const page = routePages.value.find(p => p.page_uuid === pageUuid)
    if (page) {
      return page.url || schema.replace('{slug}', page.code)
    }
  }

  return '#'
}

const resolveCollectionUrl = (collectionCode: string, slug: string): string => {
  const schema = projectConfig.value?.collection_route_schema || '/{slug}'
  return schema
    .replace('{collection_code}', collectionCode)
    .replace('{slug}', slug)
}

provide('lesscms-resolve-page-url', resolvePageUrl)
provide('lesscms-resolve-collection-url', resolveCollectionUrl)

/**
 * Load Google Fonts by injecting a <link> tag
 */
function loadGoogleFonts(url: string) {
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
 * Set CSS variable for font family
 */
function setFontVariable(fonts: string[]) {
  if (fonts.length > 0) {
    const fontStack = fonts.map(f => `"${f}"`).join(', ') + ', sans-serif'
    document.documentElement.style.setProperty('--lcms-font-family', fontStack)
  }
}

/**
 * Apply color variables from project config color_variables array.
 * These power "var:primary", "var:white" etc. in widget configs.
 */
function applyColorVariables(colorVariables: Array<{ code: string; value: string }>) {
  if (!colorVariables?.length) return
  const root = document.documentElement
  for (const cv of colorVariables) {
    root.style.setProperty(`--lcms-color-${cv.code}`, cv.value)
  }
}

/**
 * Apply style variables from project config
 */
function applyStyleVariables(styles: Record<string, any>) {
  if (!styles) return

  const root = document.documentElement

  // Theme color variables
  if (styles.primary_color) root.style.setProperty('--lcms-color-primary', styles.primary_color)
  if (styles.secondary_color) root.style.setProperty('--lcms-color-secondary', styles.secondary_color)
  if (styles.accent_color) root.style.setProperty('--lcms-color-accent', styles.accent_color)

  // Semantic color variables
  if (styles.success_color) root.style.setProperty('--lcms-color-success', styles.success_color)
  if (styles.danger_color) root.style.setProperty('--lcms-color-danger', styles.danger_color)
  if (styles.warning_color) root.style.setProperty('--lcms-color-warning', styles.warning_color)
  if (styles.info_color) root.style.setProperty('--lcms-color-info', styles.info_color)

  // Neutral color variables
  if (styles.light_color) root.style.setProperty('--lcms-color-light', styles.light_color)
  if (styles.dark_color) root.style.setProperty('--lcms-color-dark', styles.dark_color)
  if (styles.white_color) root.style.setProperty('--lcms-color-white', styles.white_color)
  if (styles.black_color) root.style.setProperty('--lcms-color-black', styles.black_color)

  // Content color variables
  if (styles.text_color) root.style.setProperty('--lcms-color-text', styles.text_color)
  if (styles.background_color) root.style.setProperty('--lcms-color-background', styles.background_color)
  if (styles.background_alt_color) root.style.setProperty('--lcms-color-background-alt', styles.background_alt_color)
  if (styles.link_color) root.style.setProperty('--lcms-color-link', styles.link_color)
  if (styles.muted_color) root.style.setProperty('--lcms-color-muted', styles.muted_color)
  if (styles.border_color) root.style.setProperty('--lcms-color-border', styles.border_color)

  // Custom colors
  if (Array.isArray(styles.custom_colors)) {
    for (const cc of styles.custom_colors) {
      if (cc.name && cc.color) {
        const code = cc.name.toLowerCase().replace(/\s+/g, '-')
        root.style.setProperty(`--lcms-color-${code}`, cc.color)
      }
    }
  }

  // Typography variables
  if (styles.font_heading) root.style.setProperty('--lcms-font-heading', `"${styles.font_heading}", sans-serif`)
  if (styles.font_body) root.style.setProperty('--lcms-font-body', `"${styles.font_body}", sans-serif`)
  if (styles.font_button) root.style.setProperty('--lcms-font-button', `"${styles.font_button}", sans-serif`)
  if (styles.font_size_base) root.style.setProperty('--lcms-font-size-base', `${styles.font_size_base}px`)
  if (styles.line_height) root.style.setProperty('--lcms-line-height', String(styles.line_height))

  // Heading typography variables (H1-H6)
  for (const level of [1, 2, 3, 4, 5, 6]) {
    if (styles[`h${level}_font_size`])
      root.style.setProperty(`--lcms-h${level}-font-size`, styles[`h${level}_font_size`])
    if (styles[`h${level}_font_weight`])
      root.style.setProperty(`--lcms-h${level}-font-weight`, String(styles[`h${level}_font_weight`]))
    if (styles[`h${level}_color`])
      root.style.setProperty(`--lcms-h${level}-color`, styles[`h${level}_color`])
  }

  // Paragraph typography variables
  if (styles.p_font_size) root.style.setProperty('--lcms-p-font-size', styles.p_font_size)
  if (styles.p_font_weight) root.style.setProperty('--lcms-p-font-weight', String(styles.p_font_weight))
  if (styles.p_color) root.style.setProperty('--lcms-p-color', styles.p_color)
  if (styles.p_line_height) root.style.setProperty('--lcms-p-line-height', styles.p_line_height)

  // Layout variables
  if (styles.border_radius !== undefined) root.style.setProperty('--lcms-border-radius', `${styles.border_radius}px`)
  if (styles.container_max_width) root.style.setProperty('--lcms-container-max-width', `${styles.container_max_width}px`)
  if (styles.section_gap) root.style.setProperty('--lcms-section-gap', styles.section_gap)

  // Button defaults
  if (styles.btn_padding) root.style.setProperty('--lcms-btn-padding', styles.btn_padding)
  if (styles.btn_border_radius) root.style.setProperty('--lcms-btn-border-radius', styles.btn_border_radius)
  if (styles.btn_font_size) root.style.setProperty('--lcms-btn-font-size', styles.btn_font_size)
  if (styles.btn_font_weight) root.style.setProperty('--lcms-btn-font-weight', String(styles.btn_font_weight))

  // Link defaults
  if (styles.link_hover_color) root.style.setProperty('--lcms-link-hover-color', styles.link_hover_color)
  if (styles.link_text_decoration) root.style.setProperty('--lcms-link-text-decoration', styles.link_text_decoration)
  if (styles.link_hover_text_decoration) root.style.setProperty('--lcms-link-hover-text-decoration', styles.link_hover_text_decoration)

  // Input defaults
  if (styles.input_background_color) root.style.setProperty('--lcms-input-bg-color', styles.input_background_color)
  if (styles.input_text_color) root.style.setProperty('--lcms-input-text-color', styles.input_text_color)
  if (styles.input_border_color) root.style.setProperty('--lcms-input-border-color', styles.input_border_color)
  if (styles.input_border_width) root.style.setProperty('--lcms-input-border-width', `${styles.input_border_width}px`)
  if (styles.input_border_style) root.style.setProperty('--lcms-input-border-style', styles.input_border_style)
  if (styles.input_focus_border_color) root.style.setProperty('--lcms-input-focus-border-color', styles.input_focus_border_color)
  if (styles.input_placeholder_color) root.style.setProperty('--lcms-input-placeholder-color', styles.input_placeholder_color)
}

/**
 * Fetch and apply project config
 */
async function fetchProjectConfig() {
  // In direct mode, we need apiKey, workspace, and project
  // In proxy mode, we only need baseUrl (proxy has the credentials)
  if (!props.proxyMode && (!props.apiKey || !props.workspaceCode || !props.projectCode)) {
    return
  }

  configLoading.value = true
  configError.value = null

  try {
    const response = await apiClient.get('/config')
    const data = response.data as ProjectConfig

    projectConfig.value = {
      fonts: data.fonts || ['Inter', 'Roboto'],
      custom_css_url: data.custom_css_url || null,
      custom_css_urls: data.custom_css_urls || [],
      custom_css: data.custom_css || null,
      available_widgets: data.available_widgets || [],
      available_fonts: data.available_fonts || [],
      google_fonts_url: data.google_fonts_url || null,
      styles: data.styles || undefined,
      page_route_schema: data.page_route_schema || '/p/{slug}',
      collection_route_schema: data.collection_route_schema || '/c/{collection_code}/{slug}',
      homepage_uuid: data.homepage_uuid || null,
      color_variables: data.color_variables || [],
    }

    // Load Google Fonts
    if (projectConfig.value.google_fonts_url) {
      loadGoogleFonts(projectConfig.value.google_fonts_url)
    }

    // Set font CSS variable
    setFontVariable(projectConfig.value.fonts)

    // Apply color variables from API (var:primary, var:white, etc.)
    if (projectConfig.value.color_variables?.length) {
      applyColorVariables(projectConfig.value.color_variables)
    }

    // Apply style variables (colors, typography, layout)
    if (projectConfig.value.styles) {
      applyStyleVariables(projectConfig.value.styles)
    }

    // Load custom CSS (external URLs — array format)
    if (projectConfig.value.custom_css_urls?.length) {
      for (const url of projectConfig.value.custom_css_urls) {
        loadCustomCss(url)
      }
    }
    // Fallback: legacy single URL format
    else if (projectConfig.value.custom_css_url) {
      loadCustomCss(projectConfig.value.custom_css_url)
    }

    // Load inline custom CSS
    if (projectConfig.value.custom_css) {
      loadCustomCssInline(projectConfig.value.custom_css)
    }

    emit('configLoaded', projectConfig.value)
  } catch (err: any) {
    console.error('Failed to load project config:', err)
    configError.value = err
    emit('configError', err)
  } finally {
    configLoading.value = false
  }
}

// Auto-load config on mount
onMounted(() => {
  if (props.autoLoadConfig) {
    fetchProjectConfig()
  }
})

// Expose for parent components
defineExpose({
  config,
  apiClient,
  projectConfig,
  configLoading,
  configError,
  isProxyMode,
  setLanguage: (lang: string) => {
    config.language = lang
  },
  fetchProjectConfig,
  loadGoogleFonts,
  loadCustomCss,
  loadCustomCssInline,
})
</script>

<template>
  <slot />
</template>
