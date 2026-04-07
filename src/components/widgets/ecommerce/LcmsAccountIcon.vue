<script setup lang="ts">
/**
 * Account Icon Widget (E-commerce)
 *
 * Header user account icon with logged-in/logged-out states.
 */

import { computed, ref, inject, onMounted, onUnmounted, type Ref } from 'vue'
import { useCustomer } from '../../../composables/useCustomer'

defineOptions({ inheritAttrs: false })

interface Props {
  data: Record<string, any>
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const customer = useCustomer()
const projectConfig = inject<Ref<any> | null>('lesscms-project-config', null)

const config = computed(() => props.data?.config || props.data || {})
const styleVariant = computed(() => config.value.style || 'icon-text')
const showName = computed(() => config.value.show_name !== false)

const isOpen = ref(false)
const containerEl = ref<HTMLDivElement | null>(null)

const accountUrl = computed(() => projectConfig?.value?.commerce?.routes?.account || '/konto')

const t = (key: string) => {
  const lang = props.language || 'pl'
  const dict: Record<string, Record<string, string>> = {
    pl: { signIn: 'Zaloguj', account: 'Konto', myAccount: 'Moje konto', orders: 'Zamówienia', logout: 'Wyloguj' },
    en: { signIn: 'Sign in', account: 'Account', myAccount: 'My account', orders: 'Orders', logout: 'Sign out' },
  }
  return dict[lang]?.[key] || dict.pl[key] || key
}

function handleClick(e: MouseEvent) {
  if (!customer.isAuthenticated.value) {
    window.location.href = accountUrl.value
    return
  }
  e.stopPropagation()
  isOpen.value = !isOpen.value
}

function handleClickOutside(e: MouseEvent) {
  if (containerEl.value && !containerEl.value.contains(e.target as Node)) {
    isOpen.value = false
  }
}

async function handleLogout() {
  await customer.logout()
  isOpen.value = false
  window.location.reload()
}

onMounted(() => {
  if (typeof document !== 'undefined') {
    document.addEventListener('click', handleClickOutside)
  }
})

onUnmounted(() => {
  if (typeof document !== 'undefined') {
    document.removeEventListener('click', handleClickOutside)
  }
})
</script>

<template>
  <div ref="containerEl" class="lcms-account-icon" :class="`lcms-account-icon--${styleVariant}`">
    <button type="button" class="lcms-account-icon__trigger" @click="handleClick">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
      <span v-if="showName && styleVariant !== 'icon-only'" class="lcms-account-icon__label">
        {{ customer.isAuthenticated.value ? (customer.customer.value?.name || t('account')) : t('signIn') }}
      </span>
    </button>

    <div v-if="isOpen && customer.isAuthenticated.value" class="lcms-account-icon__dropdown">
      <a :href="accountUrl" class="lcms-account-icon__menu-item">{{ t('myAccount') }}</a>
      <a :href="`${accountUrl}/zamowienia`" class="lcms-account-icon__menu-item">{{ t('orders') }}</a>
      <button type="button" class="lcms-account-icon__menu-item lcms-account-icon__menu-item--logout" @click="handleLogout">
        {{ t('logout') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.lcms-account-icon {
  position: relative;
  display: inline-block;
  font-family: var(--lcms-font-body, system-ui, sans-serif);
}

.lcms-account-icon__trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--lcms-color-text, #1f2937);
  font-family: inherit;
  font-size: 0.875rem;
}

.lcms-account-icon__trigger:hover {
  color: var(--lcms-color-primary, #3b82f6);
}

.lcms-account-icon__trigger svg {
  width: 1.5rem;
  height: 1.5rem;
}

.lcms-account-icon__label {
  font-weight: 500;
}

.lcms-account-icon__dropdown {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  min-width: 12rem;
  background: var(--lcms-color-background, #ffffff);
  border: 1px solid var(--lcms-color-border, #e5e7eb);
  border-radius: var(--lcms-border-radius, 0.5rem);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  padding: 0.5rem 0;
}

.lcms-account-icon__menu-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 0.625rem 1rem;
  background: transparent;
  border: none;
  color: var(--lcms-color-text, #1f2937);
  font-size: 0.875rem;
  text-decoration: none;
  cursor: pointer;
  font-family: inherit;
}

.lcms-account-icon__menu-item:hover {
  background: var(--lcms-color-background-alt, #f9fafb);
  color: var(--lcms-color-primary, #3b82f6);
}

.lcms-account-icon__menu-item--logout {
  border-top: 1px solid var(--lcms-color-border, #e5e7eb);
  margin-top: 0.25rem;
  color: var(--lcms-color-danger, #ef4444);
}

.lcms-account-icon__menu-item--logout:hover {
  background: rgba(239, 68, 68, 0.05);
  color: var(--lcms-color-danger, #ef4444);
}
</style>
