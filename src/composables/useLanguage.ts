/**
 * Language composable for extracting multilingual values
 */

import { computed, inject, type Ref, type ComputedRef } from 'vue'
import type { MultilingualValue, LessCMSConfig } from '../api/types'

export interface UseLanguageReturn {
  /**
   * Current language code
   */
  language: ComputedRef<string>

  /**
   * Extract value from multilingual object
   * Falls back to: current language -> 'pl' -> first available -> empty string
   */
  extractValue: <T = string>(value: MultilingualValue<T> | undefined | null) => T | string

  /**
   * Check if value is multilingual object
   */
  isMultilingual: (value: any) => boolean
}

/**
 * Composable for handling multilingual values
 */
export function useLanguage(languageOverride?: Ref<string> | string): UseLanguageReturn {
  const config = inject<LessCMSConfig>('lesscms-config')

  const language = computed(() => {
    if (languageOverride) {
      return typeof languageOverride === 'string' ? languageOverride : languageOverride.value
    }
    return config?.language || 'pl'
  })

  function isMultilingual(value: any): boolean {
    return (
      value !== null &&
      value !== undefined &&
      typeof value === 'object' &&
      !Array.isArray(value)
    )
  }

  function extractValue<T = string>(value: MultilingualValue<T> | undefined | null): T | string {
    if (value === undefined || value === null) {
      return ''
    }

    // If it's not an object, return as-is (global value)
    if (!isMultilingual(value)) {
      return value as T
    }

    const obj = value as Record<string, T>
    const lang = language.value

    // Try current language
    if (obj[lang] !== undefined && obj[lang] !== null) {
      return obj[lang]
    }

    // Fallback to Polish
    if (obj['pl'] !== undefined && obj['pl'] !== null) {
      return obj['pl']
    }

    // Fallback to first available value
    const values = Object.values(obj)
    if (values.length > 0) {
      return values[0]
    }

    return ''
  }

  return {
    language,
    extractValue,
    isMultilingual,
  }
}

/**
 * Standalone function to extract value without composable
 */
export function extractMultilingualValue<T = string>(
  value: MultilingualValue<T> | undefined | null,
  language: string = 'pl'
): T | string {
  if (value === undefined || value === null) {
    return ''
  }

  if (typeof value !== 'object' || Array.isArray(value)) {
    return value as T
  }

  const obj = value as Record<string, T>

  if (obj[language] !== undefined && obj[language] !== null) {
    return obj[language]
  }

  if (obj['pl'] !== undefined && obj['pl'] !== null) {
    return obj['pl']
  }

  const values = Object.values(obj)
  return values.length > 0 ? values[0] : ''
}
