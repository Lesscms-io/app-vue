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

import { provide, reactive, watch, onMounted, ref, computed } from 'vue'
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
}

const props = withDefaults(defineProps<Props>(), {
  apiKey: '',
  workspaceCode: '',
  projectCode: '',
  defaultLanguage: 'pl',
  autoLoadConfig: true,
  proxyMode: false,
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
 * Set CSS variable for font family
 */
function setFontVariable(fonts: string[]) {
  if (fonts.length > 0) {
    const fontStack = fonts.map(f => `"${f}"`).join(', ') + ', sans-serif'
    document.documentElement.style.setProperty('--lcms-font-family', fontStack)
  }
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
      available_widgets: data.available_widgets || [],
      available_fonts: data.available_fonts || [],
      google_fonts_url: data.google_fonts_url || null,
    }

    // Load Google Fonts
    if (projectConfig.value.google_fonts_url) {
      loadGoogleFonts(projectConfig.value.google_fonts_url)
    }

    // Set font CSS variable
    setFontVariable(projectConfig.value.fonts)

    // Load custom CSS
    if (projectConfig.value.custom_css_url) {
      loadCustomCss(projectConfig.value.custom_css_url)
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
})
</script>

<template>
  <slot />
</template>
