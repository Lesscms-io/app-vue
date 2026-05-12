/**
 * Customer auth composable — manages customer login/register/profile state
 * for ecommerce widgets.
 *
 * Token is stored in localStorage (lcms_customer_token) so it persists across
 * page reloads. The token is also set on the storefront client for authenticated
 * requests.
 *
 * Singleton: a single customer store is shared across all widgets.
 */

import { ref, computed, type Ref, type ComputedRef } from 'vue'
import { useStorefront } from './useStorefront'
import type { StorefrontCustomer, StorefrontAddress, RegisterRequest } from '../api/storefront'

const TOKEN_KEY = 'lcms_customer_token'

function getStoredToken(): string | null {
  if (typeof localStorage === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

function setStoredToken(token: string | null): void {
  if (typeof localStorage === 'undefined') return
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

export interface CustomerStore {
  customer: Ref<StorefrontCustomer | null>
  token: Ref<string | null>
  isLoading: Ref<boolean>
  isInitialized: Ref<boolean>
  error: Ref<string | null>
  isAuthenticated: ComputedRef<boolean>
  init(): Promise<void>
  login(email: string, password: string): Promise<void>
  register(data: RegisterRequest): Promise<void>
  logout(): Promise<void>
  forgotPassword(email: string): Promise<void>
  resetPassword(email: string, token: string, password: string): Promise<void>
  updateProfile(data: Partial<StorefrontCustomer>): Promise<void>
  changePassword(currentPassword: string, newPassword: string): Promise<void>
  refreshProfile(): Promise<void>
  // Addresses
  addAddress(address: StorefrontAddress): Promise<void>
  updateAddress(addressUuid: string, address: Partial<StorefrontAddress>): Promise<void>
  deleteAddress(addressUuid: string): Promise<void>
}

let customerStoreSingleton: CustomerStore | null = null

function createCustomerStore(): CustomerStore {
  const customer = ref<StorefrontCustomer | null>(null)
  const token = ref<string | null>(null)
  const isLoading = ref(false)
  const isInitialized = ref(false)
  const error = ref<string | null>(null)

  const { client } = useStorefront()

  const isAuthenticated = computed(() => !!customer.value && !!token.value)

  let initPromise: Promise<void> | null = null

  function applyToken(newToken: string | null) {
    token.value = newToken
    setStoredToken(newToken)
    if (client.value) {
      client.value.setCustomerToken(newToken)
    }
  }

  // Share the in-flight init() across concurrent callers. The previous
  // `if (initialized) return` pattern bailed out the second caller before
  // getMe() resolved, leaving `customer.value === null` while the first
  // call was still hydrating it. That broke the configurator's auto-fire
  // path on return from login: the await returned synchronously, the
  // `isAuthenticated` check ran against null, and the plugin CTA never
  // re-fired.
  async function init() {
    if (initPromise) return initPromise
    initPromise = (async () => {
      const storedToken = getStoredToken()
      if (!storedToken || !client.value) {
        isInitialized.value = true
        return
      }

      applyToken(storedToken)
      try {
        const response = await client.value.getMe()
        customer.value = response.data
      } catch (err: any) {
        applyToken(null)
        customer.value = null
      } finally {
        isInitialized.value = true
      }
    })()
    return initPromise
  }

  async function login(email: string, password: string) {
    if (!client.value) throw new Error('Storefront not available')

    isLoading.value = true
    error.value = null
    try {
      const response = await client.value.login(email, password)
      applyToken(response.data.token)
      customer.value = response.data.customer
    } catch (err: any) {
      error.value = err.message || 'Login failed'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function register(data: RegisterRequest) {
    if (!client.value) throw new Error('Storefront not available')

    isLoading.value = true
    error.value = null
    try {
      const response = await client.value.register(data)
      applyToken(response.data.token)
      customer.value = response.data.customer
    } catch (err: any) {
      error.value = err.message || 'Registration failed'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function logout() {
    if (client.value) {
      try {
        await client.value.logout()
      } catch {
        // ignore — clear local state regardless
      }
    }
    customer.value = null
    applyToken(null)
  }

  async function forgotPassword(email: string) {
    if (!client.value) throw new Error('Storefront not available')

    isLoading.value = true
    error.value = null
    try {
      await client.value.forgotPassword(email)
    } catch (err: any) {
      error.value = err.message || 'Password reset request failed'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function resetPassword(email: string, resetToken: string, password: string) {
    if (!client.value) throw new Error('Storefront not available')

    isLoading.value = true
    error.value = null
    try {
      await client.value.resetPassword(email, resetToken, password)
    } catch (err: any) {
      error.value = err.message || 'Password reset failed'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function updateProfile(data: Partial<StorefrontCustomer>) {
    if (!client.value) throw new Error('Storefront not available')

    isLoading.value = true
    error.value = null
    try {
      const response = await client.value.updateProfile(data)
      customer.value = response.data
    } catch (err: any) {
      error.value = err.message || 'Profile update failed'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    if (!client.value) throw new Error('Storefront not available')

    isLoading.value = true
    error.value = null
    try {
      await client.value.changePassword(currentPassword, newPassword)
    } catch (err: any) {
      error.value = err.message || 'Password change failed'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function refreshProfile() {
    if (!client.value || !token.value) return
    try {
      const response = await client.value.getMe()
      customer.value = response.data
    } catch (err: any) {
      if (err.status === 401) {
        applyToken(null)
        customer.value = null
      }
    }
  }

  async function addAddress(address: StorefrontAddress) {
    if (!client.value) throw new Error('Storefront not available')

    isLoading.value = true
    try {
      const response = await client.value.addAddress(address)
      if (customer.value) {
        customer.value.addresses = response.data.addresses
        customer.value.default_address = response.data.default_address
      }
    } finally {
      isLoading.value = false
    }
  }

  async function updateAddress(addressUuid: string, address: Partial<StorefrontAddress>) {
    if (!client.value) throw new Error('Storefront not available')

    isLoading.value = true
    try {
      const response = await client.value.updateAddress(addressUuid, address)
      if (customer.value) {
        customer.value.addresses = response.data.addresses
        customer.value.default_address = response.data.default_address
      }
    } finally {
      isLoading.value = false
    }
  }

  async function deleteAddress(addressUuid: string) {
    if (!client.value) throw new Error('Storefront not available')

    isLoading.value = true
    try {
      const response = await client.value.deleteAddress(addressUuid)
      if (customer.value) {
        customer.value.addresses = response.data.addresses
        customer.value.default_address = response.data.default_address
      }
    } finally {
      isLoading.value = false
    }
  }

  return {
    customer,
    token,
    isLoading,
    isInitialized,
    error,
    isAuthenticated,
    init,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    updateProfile,
    changePassword,
    refreshProfile,
    addAddress,
    updateAddress,
    deleteAddress,
  }
}

export function useCustomer(): CustomerStore {
  if (!customerStoreSingleton) {
    customerStoreSingleton = createCustomerStore()
    if (typeof window !== 'undefined') {
      customerStoreSingleton.init().catch(() => { /* swallow */ })
    }
  }
  return customerStoreSingleton
}
