<script setup lang="ts">
/**
 * Language Switcher Widget
 *
 * Renders a dropdown or inline list of available languages.
 * Links to the current page in different languages using per-language URLs.
 * Element-group structure: label, config
 *
 * Config options:
 * - display_mode: 'codes' (en, pl), 'names' (English, Polski), 'text-codes' (English / en)
 * - layout: 'dropdown' or 'inline'
 * - hide_current: boolean - hide the current language from the switcher
 *
 * Uses injected languageAlternates from renderer to build per-language links
 */

import { computed, inject, ref, unref, type Ref } from 'vue'
import { useLanguage } from '@/composables/useLanguage'
import { resolveColor } from '@/utils/resolveColor'

defineOptions({
  inheritAttrs: false
})

interface Props {
  data: Record<string, any>
  language?: string
  settings?: Record<string, any>
}

const props = withDefaults(defineProps<Props>(), {
  language: 'pl'
})

const { extractValue, language: propLanguage } = useLanguage(props.language)

// Element groups
const labelGroup = computed(() => props.data.label || {})
const configGroup = computed(() => props.data.config || {})

// Label group
const labelText = computed(() => {
  const t = labelGroup.value.text || ''
  if (t && typeof t === 'object') return extractValue(t) as string
  return t || ''
})
const labelColor = computed(() => resolveColor(labelGroup.value.color) || '#212529')
const labelHoverColor = computed(() => resolveColor(labelGroup.value['color:hover']) || null)

// Config group
const displayMode = computed(() => configGroup.value.display_mode || 'names')
const layout = computed(() => configGroup.value.layout || 'dropdown')
const hideCurrent = computed(() => configGroup.value.hide_current ?? false)


// Adres bieżącej strony w każdym języku, w którym ma treść — dostarcza renderer
const alternatesRef = inject<Record<string, string> | Ref<Record<string, string>>>('languageAlternates', {})
const languageAlternates = computed<Record<string, string>>(() => unref(alternatesRef) || {})

// Języki projektu (z treścią) i język domyślny — dostarcza renderer
const i18nRef = inject<Record<string, any> | Ref<Record<string, any>>>('lcmsI18n', {})
const i18nInfo = computed<Record<string, any>>(() => unref(i18nRef) || {})
const currentLanguage = computed<string>(() => i18nInfo.value.language || propLanguage.value)

// Language names for display
const languageNames: Record<string, { name: string }> = {
  pl: { name: 'Polski' },
  en: { name: 'English' },
  de: { name: 'Deutsch' },
  fr: { name: 'Français' },
  es: { name: 'Español' },
  it: { name: 'Italiano' },
  nl: { name: 'Nederlands' },
  pt: { name: 'Português' },
  cs: { name: 'Čeština' },
  sk: { name: 'Slovenčina' },
  uk: { name: 'Українська' },
  ru: { name: 'Русский' },
  ja: { name: '日本語' },
  zh: { name: '中文' },
  ar: { name: 'العربية' },
  ko: { name: '한국어' }
}

// Tylko języki, w których ta strona istnieje — w kolejności języków projektu
const availableLanguages = computed(() => {
  const alternates = languageAlternates.value
  const order: string[] = i18nInfo.value.languages || []
  const codes = [
    ...order.filter(code => alternates[code]),
    ...Object.keys(alternates).filter(code => !order.includes(code))
  ]
  return codes
    .filter(code => !(hideCurrent.value && code === currentLanguage.value))
    .map(code => ({ code, url: alternates[code] }))
})

const hasAlternatives = computed(() => Object.keys(languageAlternates.value).length > 1)

// Display text for a language
function getLanguageDisplay(lang: string): string {
  const info = languageNames[lang]
  switch (displayMode.value) {
    case 'codes':
      return lang.toUpperCase()
    case 'names':
      return info?.name || lang.toUpperCase()
    case 'text-codes':
      return `${info?.name || lang.toUpperCase()} / ${lang.toUpperCase()}`
    default:
      return lang.toUpperCase()
  }
}

const isDropdown = computed(() => layout.value === 'dropdown')
const isOpen = ref(false)

const rootStyle = computed(() => ({
  '--label-color': labelColor.value,
  '--label-hover-color': labelHoverColor.value || labelColor.value
}))
</script>

<template>
  <!-- Strona istnieje tylko w jednym języku — nie ma czego przełączać -->
  <div v-if="!hasAlternatives" />

  <!-- Dropdown layout -->
  <div
    v-else-if="isDropdown"
    class="lcms-language-switcher lcms-language-switcher--dropdown"
    :style="rootStyle"
  >
    <div class="dropdown">
      <button
        class="btn btn-sm btn-outline-secondary dropdown-toggle"
        type="button"
        :aria-expanded="isOpen"
        @click="isOpen = !isOpen"
        @blur="isOpen = false"
      >
        <span v-if="labelText" class="me-2">{{ labelText }}</span>
        <span class="lang-code">{{ currentLanguage.toUpperCase() }}</span>
      </button>
      <ul
        class="dropdown-menu"
        :class="{ show: isOpen }"
      >
        <li v-for="lang in availableLanguages" :key="lang.code">
          <a
            :href="lang.url"
            class="dropdown-item"
            @mousedown.prevent
            :class="{ active: lang.code === currentLanguage }"
            :hreflang="lang.code"
            :lang="lang.code"
          >
            {{ getLanguageDisplay(lang.code) }}
          </a>
        </li>
      </ul>
    </div>
  </div>

  <!-- Inline layout -->
  <div
    v-else
    class="lcms-language-switcher lcms-language-switcher--inline"
    :style="rootStyle"
  >
    <div class="lang-list">
      <span v-if="labelText" class="lang-label">{{ labelText }}</span>
      <div class="lang-links">
        <a
          v-for="lang in availableLanguages"
          :key="lang.code"
          :href="lang.url"
          class="lang-link"
          :class="{ active: lang.code === currentLanguage }"
          :hreflang="lang.code"
          :lang="lang.code"
          :aria-current="lang.code === currentLanguage ? 'true' : undefined"
        >
          <span>{{ getLanguageDisplay(lang.code) }}</span>
        </a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lcms-language-switcher {
  display: inline-block;
}

/* Dropdown layout */
.lcms-language-switcher--dropdown .dropdown {
  position: relative;
  display: inline-block;
}

.lcms-language-switcher--dropdown .dropdown-toggle {
  color: var(--label-color);
  border-color: var(--label-color);
}

.lcms-language-switcher--dropdown .dropdown-toggle:hover {
  color: var(--label-hover-color);
  border-color: var(--label-hover-color);
  background-color: transparent;
}

.lcms-language-switcher--dropdown .dropdown-menu {
  min-width: auto;
  border: 1px solid #dee2e6;
  border-radius: 0.25rem;
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
}

.lcms-language-switcher--dropdown .dropdown-item {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  color: var(--label-color);
  text-decoration: none;
}

.lcms-language-switcher--dropdown .dropdown-item:hover {
  color: var(--label-hover-color);
  background-color: #f8f9fa;
}

.lcms-language-switcher--dropdown .dropdown-item.active {
  color: var(--label-hover-color);
  background-color: #e9ecef;
  font-weight: 500;
}

/* Inline layout */
.lcms-language-switcher--inline .lang-list {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.lcms-language-switcher--inline .lang-label {
  color: var(--label-color);
  font-size: 0.875rem;
  font-weight: 500;
}

.lcms-language-switcher--inline .lang-links {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.lcms-language-switcher--inline .lang-link {
  color: var(--label-color);
  text-decoration: none;
  font-size: 0.875rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  transition: all 0.2s ease;
}

.lcms-language-switcher--inline .lang-link:hover {
  color: var(--label-hover-color);
  background-color: #f8f9fa;
}

.lcms-language-switcher--inline .lang-link.active {
  color: var(--label-hover-color);
  background-color: #e9ecef;
  font-weight: 500;
}


.lang-code {
  font-weight: 500;
  font-size: 0.875rem;
}
</style>
