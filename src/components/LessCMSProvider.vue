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
 * Apply style variables from project config
 */
function applyStyleVariables(styles: Record<string, any>) {
  if (!styles) return

  const root = document.documentElement

  // Theme color variables
  if (styles.primary_color) root.style.setProperty('--lcms-color-primary', styles.primary_color)
  if (styles.secondary_color) root.style.setProperty('--lcms-color-secondary', styles.secondary_color)

  // Semantic color variables
  if (styles.success_color) root.style.setProperty('--lcms-color-success', styles.success_color)
  if (styles.danger_color) root.style.setProperty('--lcms-color-danger', styles.danger_color)
  if (styles.warning_color) root.style.setProperty('--lcms-color-warning', styles.warning_color)
  if (styles.info_color) root.style.setProperty('--lcms-color-info', styles.info_color)

  // Neutral color variables
  if (styles.light_color) root.style.setProperty('--lcms-color-light', styles.light_color)
  if (styles.dark_color) root.style.setProperty('--lcms-color-dark', styles.dark_color)

  // Content color variables
  if (styles.text_color) root.style.setProperty('--lcms-color-text', styles.text_color)
  if (styles.background_color) root.style.setProperty('--lcms-color-background', styles.background_color)
  if (styles.link_color) root.style.setProperty('--lcms-color-link', styles.link_color)
  if (styles.muted_color) root.style.setProperty('--lcms-color-muted', styles.muted_color)

  // Typography variables
  if (styles.font_heading) root.style.setProperty('--lcms-font-heading', `"${styles.font_heading}", sans-serif`)
  if (styles.font_body) root.style.setProperty('--lcms-font-body', `"${styles.font_body}", sans-serif`)
  if (styles.font_size_base) root.style.setProperty('--lcms-font-size-base', `${styles.font_size_base}px`)
  if (styles.line_height) root.style.setProperty('--lcms-line-height', String(styles.line_height))

  // Layout variables
  if (styles.border_radius !== undefined) root.style.setProperty('--lcms-border-radius', `${styles.border_radius}px`)
  if (styles.container_max_width) root.style.setProperty('--lcms-container-max-width', `${styles.container_max_width}px`)
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
      custom_css: data.custom_css || null,
      available_widgets: data.available_widgets || [],
      available_fonts: data.available_fonts || [],
      google_fonts_url: data.google_fonts_url || null,
      styles: data.styles || null,
    }

    // Load Google Fonts
    if (projectConfig.value.google_fonts_url) {
      loadGoogleFonts(projectConfig.value.google_fonts_url)
    }

    // Set font CSS variable
    setFontVariable(projectConfig.value.fonts)

    // Apply style variables (colors, typography, layout)
    if (projectConfig.value.styles) {
      applyStyleVariables(projectConfig.value.styles)
    }

    // Load custom CSS (external URL)
    if (projectConfig.value.custom_css_url) {
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
