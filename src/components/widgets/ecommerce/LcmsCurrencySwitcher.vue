<script setup lang="ts">
/**
 * Currency Switcher Widget
 *
 * Przełącznik waluty sklepu (np. PLN / EUR). Lista walut pochodzi z ustawień
 * sklepu (LessCommerce → Waluty); wybór zapamiętuje ciasteczko, a ceny
 * w widgetach sklepu przeliczają się od razu (useShopCurrency).
 * Sklep z jedną walutą = widget niewidoczny.
 *
 * Element groups: label (text, color, color:hover), active (color, background), config
 * Config:
 * - display_mode: 'codes' (PLN) | 'symbols' (zł) | 'codes-symbols' (PLN · zł)
 * - layout: 'inline' | 'dropdown'
 */
import { computed, inject, ref, type Ref } from 'vue'
import { useLanguage } from '@/composables/useLanguage'
import { resolveColor } from '@/utils/resolveColor'
import { useShopCurrency } from '../../../composables/useShopCurrency'

defineOptions({ inheritAttrs: false })

interface Props {
  data: Record<string, any>
  language?: string
  settings?: Record<string, any>
}

const props = withDefaults(defineProps<Props>(), { language: 'pl' })
const { extractValue } = useLanguage(props.language)

const projectConfig = inject<Ref<any> | null>('lesscms-project-config', null)
const { currency, items, ready, setCurrency } = useShopCurrency(projectConfig)

const labelGroup = computed(() => props.data?.label || {})
const activeGroup = computed(() => props.data?.active || {})
const configGroup = computed(() => props.data?.config || {})

const labelText = computed(() => {
  const t = labelGroup.value.text || ''
  return t && typeof t === 'object' ? (extractValue(t) as string) : t
})
const displayMode = computed(() => configGroup.value.display_mode || 'codes')
const isDropdown = computed(() => configGroup.value.layout === 'dropdown')

const SYMBOLS: Record<string, string> = { PLN: 'zł', EUR: '€', USD: '$', GBP: '£', CZK: 'Kč', CHF: 'CHF', SEK: 'kr', NOK: 'kr', DKK: 'kr', HUF: 'Ft' }
function display(code: string): string {
  const sym = SYMBOLS[code] || code
  if (displayMode.value === 'symbols') return sym
  if (displayMode.value === 'codes-symbols') return sym === code ? code : `${code} · ${sym}`
  return code
}

const visible = computed(() => ready.value && items.value.length > 1)
const isOpen = ref(false)

function choose(code: string) {
  setCurrency(code)
  isOpen.value = false
}

const rootStyle = computed(() => {
  const label = resolveColor(labelGroup.value.color) || ''
  const hover = resolveColor(labelGroup.value['color:hover']) || ''
  return {
    '--lcs-color': label || 'inherit',
    '--lcs-hover': hover || label || 'inherit',
    '--lcs-active-color': resolveColor(activeGroup.value.color) || hover || label || 'inherit',
    '--lcs-active-bg': resolveColor(activeGroup.value.background) || 'transparent',
  }
})
</script>

<template>
  <div v-if="!visible" class="lcms-currency-switcher lcms-currency-switcher--empty" />

  <div v-else-if="isDropdown" class="lcms-currency-switcher lcms-currency-switcher--dropdown" :style="rootStyle">
    <button type="button" class="lcs-toggle" :aria-expanded="isOpen" @click="isOpen = !isOpen" @blur="isOpen = false">
      <span v-if="labelText" class="lcs-label">{{ labelText }}</span>
      <span class="lcs-current">{{ display(currency) }}</span>
      <span class="lcs-caret" aria-hidden="true">▾</span>
    </button>
    <ul v-show="isOpen" class="lcs-menu" role="listbox">
      <li v-for="c in items" :key="c.code">
        <button type="button" class="lcs-option" :class="{ active: c.code === currency }" :aria-selected="c.code === currency"
                role="option" @mousedown.prevent @click="choose(c.code)">
          {{ display(c.code) }}
        </button>
      </li>
    </ul>
  </div>

  <div v-else class="lcms-currency-switcher lcms-currency-switcher--inline" :style="rootStyle">
    <span v-if="labelText" class="lcs-label">{{ labelText }}</span>
    <div class="lcs-list" role="group">
      <template v-for="(c, i) in items" :key="c.code">
        <span v-if="i > 0" class="lcs-sep" aria-hidden="true">/</span>
        <button type="button" class="lcs-link" :class="{ active: c.code === currency }" :aria-pressed="c.code === currency" @click="choose(c.code)">
          {{ display(c.code) }}
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.lcms-currency-switcher { display: inline-flex; align-items: center; gap: 0.5rem; font-family: var(--lcms-font-body, inherit); }
.lcms-currency-switcher--empty { display: none; }
.lcs-label { color: var(--lcs-color); font-size: 0.875rem; }
.lcs-list { display: inline-flex; align-items: center; gap: 0.25rem; }
.lcs-sep { color: var(--lcs-color); opacity: 0.4; font-size: 0.8rem; }
.lcs-link,
.lcs-toggle,
.lcs-option { background: none; border: 0; cursor: pointer; font: inherit; color: var(--lcs-color); }
.lcs-link { padding: 0.25rem 0.4rem; border-radius: 4px; font-size: 0.875rem; opacity: 0.65; transition: opacity 0.15s, color 0.15s; }
.lcs-link:hover { color: var(--lcs-hover); opacity: 1; }
.lcs-link.active { color: var(--lcs-active-color); background: var(--lcs-active-bg); opacity: 1; font-weight: 600; }
.lcms-currency-switcher--dropdown { position: relative; }
.lcs-toggle { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.3rem 0.5rem; font-size: 0.875rem; font-weight: 600; }
.lcs-toggle:hover { color: var(--lcs-hover); }
.lcs-caret { font-size: 0.7rem; opacity: 0.6; }
.lcs-menu { position: absolute; top: 100%; right: 0; z-index: 50; min-width: 100%; margin: 4px 0 0; padding: 4px; list-style: none;
  background: #fff; border-radius: 8px; box-shadow: 0 8px 24px rgba(16, 24, 40, 0.14); }
.lcs-option { display: block; width: 100%; padding: 0.4rem 0.75rem; text-align: left; font-size: 0.875rem; border-radius: 6px; white-space: nowrap; }
.lcs-option:hover { color: var(--lcs-hover); background: rgba(0, 0, 0, 0.04); }
.lcs-option.active { color: var(--lcs-active-color); background: var(--lcs-active-bg); font-weight: 600; }
</style>
