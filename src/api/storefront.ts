/**
 * LessCommerce Storefront API client.
 *
 * Used by ecommerce widgets to fetch products, manage cart, handle customers,
 * checkout, etc. All requests authenticated via X-Api-Key header (read scope
 * for browsing, customer endpoints additionally use Authorization: Bearer token).
 */

// ============================================================================
// Types — mirror Storefront API response shapes
// ============================================================================

export interface StorefrontProduct {
  uuid: string
  name: string
  slug: string
  sku: string
  description: string | null
  short_description: string | null
  price: number
  compare_at_price: number | null
  cost_price: number | null
  stock: number
  track_stock: boolean
  status: 'active' | 'inactive' | 'draft'
  category_uuid: string | null
  category: { uuid: string; name: string; slug: string } | null
  images: string[]
  image: string | null
  attributes: Record<string, unknown>
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface StorefrontCategory {
  uuid: string
  name: string
  slug: string | null
  description: string | null
  image: string | null
  sort_order: number
  children: StorefrontCategory[]
}

export interface StorefrontCartItem {
  uuid: string
  product_uuid: string
  product: {
    uuid: string
    name: string
    slug: string
    sku: string
    price: number
    image: string | null
  }
  quantity: number
  unit_price: number
  subtotal: number
  metadata: Record<string, unknown> | null
}

export interface StorefrontCart {
  uuid: string
  shop_uuid: string
  customer_uuid: string | null
  session_id: string | null
  status: 'active' | 'converted' | 'abandoned' | 'expired'
  items: StorefrontCartItem[]
  totals: {
    items_count: number
    subtotal: number
    discount: number
    shipping_cost: number
    total: number
  }
  expires_at: string | null
  created_at: string
  updated_at: string
}

export interface StorefrontAddress {
  street: string
  city: string
  postal_code: string
  country: string
  state?: string | null
  company?: string | null
  notes?: string | null
}

export interface StorefrontCustomer {
  uuid: string
  shop_uuid: string
  name: string
  email: string
  phone: string | null
  company: string | null
  tax_id: string | null
  default_address: StorefrontAddress | null
  addresses: StorefrontAddress[]
  notes: string | null
  metadata: Record<string, unknown> | null
  orders_count: number
  total_spent: number
  created_at: string
  updated_at: string
}

export interface StorefrontOrder {
  uuid: string
  shop_uuid: string
  customer_uuid: string | null
  order_number: string
  status: string
  payment_status: string
  subtotal: number
  discount: number
  shipping_cost: number
  total: number
  currency: string
  payment_method: string | null
  shipping_method: string | null
  tracking_number: string | null
  customer_name: string | null
  customer_email: string | null
  customer_phone: string | null
  shipping_address: StorefrontAddress | null
  billing_address: StorefrontAddress | null
  notes: string | null
  metadata: Record<string, unknown> | null
  items: Array<{
    uuid: string
    product_uuid: string
    name: string
    sku: string
    quantity: number
    unit_price: number
    subtotal: number
  }>
  created_at: string
  updated_at: string
}

export interface StorefrontShippingMethod {
  code: string
  name: string
  description: string
  cost: number
  estimated_days: number
}

export interface StorefrontPaginated<T> {
  data: T[]
  pagination: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

export interface CheckoutRequest {
  customer_uuid?: string
  customer_name: string
  customer_email: string
  customer_phone?: string
  shipping_address: StorefrontAddress
  billing_address?: StorefrontAddress
  payment_method: 'p24' | 'stripe' | 'cod' | 'bank_transfer'
  shipping_method: string
  shipping_cost: number
  discount?: number
  notes?: string
  metadata?: Record<string, unknown>
}

export interface RegisterRequest {
  name: string
  email: string
  password: string
  phone?: string
  company?: string
  tax_id?: string
  default_address?: StorefrontAddress
}

export interface PaymentInitResponse {
  payment_id: string
  payment_url: string
  method: string
  order_uuid: string
  order_number: string
  amount: number
  currency: string
  bank_details?: {
    bank_name: string
    account_number: string
    recipient: string
    title: string
  }
}

// ============================================================================
// Client
// ============================================================================

export interface StorefrontClientOptions {
  baseUrl: string
  apiKey: string
}

export class StorefrontApiError extends Error {
  status: number
  code?: string
  errors?: Record<string, string[]>

  constructor(message: string, status: number, code?: string, errors?: Record<string, string[]>) {
    super(message)
    this.name = 'StorefrontApiError'
    this.status = status
    this.code = code
    this.errors = errors
  }
}

export interface StorefrontClient {
  // Config
  getConfig(): Promise<{ data: any }>

  // Products
  getProducts(params?: {
    q?: string
    category_uuid?: string
    min_price?: number
    max_price?: number
    in_stock?: boolean
    sort_by?: 'price_asc' | 'price_desc' | 'name_asc' | 'name_desc' | 'newest' | 'oldest'
    page?: number
    per_page?: number
  }): Promise<StorefrontPaginated<StorefrontProduct>>
  getProduct(slug: string): Promise<{ data: StorefrontProduct }>
  searchProducts(q: string, params?: { page?: number; per_page?: number }): Promise<StorefrontPaginated<StorefrontProduct>>

  // Categories
  getCategories(): Promise<{ data: StorefrontCategory[] }>
  getCategory(slug: string): Promise<{ data: StorefrontCategory }>
  getCategoryProducts(
    slug: string,
    params?: { page?: number; per_page?: number }
  ): Promise<StorefrontPaginated<StorefrontProduct>>

  // Cart
  createCart(): Promise<{ data: StorefrontCart }>
  getCart(uuid: string): Promise<{ data: StorefrontCart }>
  addToCart(uuid: string, productUuid: string, quantity: number, metadata?: Record<string, unknown>): Promise<{ data: StorefrontCart }>
  updateCartItem(uuid: string, itemId: string, quantity: number): Promise<{ data: StorefrontCart }>
  removeFromCart(uuid: string, itemId: string): Promise<{ data: StorefrontCart }>
  clearCart(uuid: string): Promise<{ data: StorefrontCart }>
  validateCart(uuid: string): Promise<{ data: any }>
  mergeCart(sessionId: string): Promise<{ data: StorefrontCart }>
  checkout(cartUuid: string, data: CheckoutRequest): Promise<{ data: StorefrontOrder }>

  // Customer auth
  register(data: RegisterRequest): Promise<{ data: { token: string; customer: StorefrontCustomer } }>
  login(email: string, password: string): Promise<{ data: { token: string; customer: StorefrontCustomer } }>
  logout(): Promise<{ data: { success: boolean } }>
  forgotPassword(email: string): Promise<{ data: { success: boolean; message: string } }>
  resetPassword(email: string, token: string, password: string): Promise<{ data: { success: boolean; message: string } }>

  // Customer profile (requires customer auth)
  getMe(): Promise<{ data: StorefrontCustomer }>
  updateProfile(data: Partial<StorefrontCustomer>): Promise<{ data: StorefrontCustomer }>
  changePassword(currentPassword: string, newPassword: string): Promise<{ data: { success: boolean } }>
  getAddresses(): Promise<{ data: { addresses: StorefrontAddress[]; default_address: StorefrontAddress | null } }>
  addAddress(address: StorefrontAddress): Promise<{ data: { addresses: StorefrontAddress[]; default_address: StorefrontAddress | null } }>
  updateAddress(addressUuid: string, address: Partial<StorefrontAddress>): Promise<{ data: { addresses: StorefrontAddress[]; default_address: StorefrontAddress | null } }>
  deleteAddress(addressUuid: string): Promise<{ data: { addresses: StorefrontAddress[]; default_address: StorefrontAddress | null } }>

  // Orders
  getMyOrders(params?: { page?: number; per_page?: number }): Promise<StorefrontPaginated<StorefrontOrder>>
  getOrder(uuid: string): Promise<{ data: StorefrontOrder }>
  getOrderByNumber(orderNumber: string): Promise<{ data: StorefrontOrder }>
  getOrderTracking(uuid: string): Promise<{ data: any }>

  // Shipping
  getShippingMethods(): Promise<{ data: StorefrontShippingMethod[] }>
  calculateShipping(data: {
    postal_code: string
    country: string
    weight?: number
    items_count?: number
    cart_uuid?: string
  }): Promise<{ data: { postal_code: string; country: string; methods: StorefrontShippingMethod[] } }>

  // Payments
  initPayment(orderUuid: string, method: string, returnUrl?: string): Promise<{ data: PaymentInitResponse }>
  getPaymentStatus(paymentId: string): Promise<{ data: { payment_id: string; status: string } }>

  // Customer token management
  setCustomerToken(token: string | null): void
  getCustomerToken(): string | null
}

export function createStorefrontClient(options: StorefrontClientOptions): StorefrontClient {
  const baseUrl = options.baseUrl.replace(/\/$/, '')
  const apiKey = options.apiKey

  let customerToken: string | null = null

  async function request<T>(
    method: string,
    path: string,
    options: { body?: any; params?: Record<string, any>; requireAuth?: boolean } = {}
  ): Promise<T> {
    const url = new URL(`${baseUrl}/storefront${path}`)

    if (options.params) {
      for (const [key, value] of Object.entries(options.params)) {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.append(key, String(value))
        }
      }
    }

    const headers: Record<string, string> = {
      'X-Api-Key': apiKey,
      Accept: 'application/json',
    }

    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json'
    }

    if (customerToken) {
      headers['Authorization'] = `Bearer ${customerToken}`
    } else if (options.requireAuth) {
      throw new StorefrontApiError('Authentication required', 401, 'NOT_AUTHENTICATED')
    }

    let response: Response
    try {
      response = await fetch(url.toString(), {
        method,
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      })
    } catch (err: any) {
      throw new StorefrontApiError(`Network error: ${err.message}`, 0, 'NETWORK_ERROR')
    }

    if (!response.ok) {
      let errorData: any = {}
      try {
        errorData = await response.json()
      } catch {
        // ignore parse errors
      }
      throw new StorefrontApiError(
        errorData.message || response.statusText || 'Storefront API error',
        response.status,
        errorData.code,
        errorData.errors
      )
    }

    if (response.status === 204) {
      return undefined as any
    }

    return await response.json()
  }

  return {
    // Config
    getConfig: () => request('GET', '/config'),

    // Products
    getProducts: (params) => request('GET', '/products', { params }),
    getProduct: (slug) => request('GET', `/products/${encodeURIComponent(slug)}`),
    searchProducts: (q, params) => request('GET', '/products/search', { params: { q, ...params } }),

    // Categories
    getCategories: () => request('GET', '/categories'),
    getCategory: (slug) => request('GET', `/categories/${encodeURIComponent(slug)}`),
    getCategoryProducts: (slug, params) =>
      request('GET', `/categories/${encodeURIComponent(slug)}/products`, { params }),

    // Cart
    createCart: () => request('POST', '/cart'),
    getCart: (uuid) => request('GET', `/cart/${uuid}`),
    addToCart: (uuid, productUuid, quantity, metadata) =>
      request('POST', `/cart/${uuid}/items`, { body: { product_uuid: productUuid, quantity, metadata } }),
    updateCartItem: (uuid, itemId, quantity) =>
      request('PATCH', `/cart/${uuid}/items/${itemId}`, { body: { quantity } }),
    removeFromCart: (uuid, itemId) => request('DELETE', `/cart/${uuid}/items/${itemId}`),
    clearCart: (uuid) => request('DELETE', `/cart/${uuid}`),
    validateCart: (uuid) => request('GET', `/cart/${uuid}/validate`),
    mergeCart: (sessionId) => request('POST', '/cart/merge', { body: { session_id: sessionId }, requireAuth: true }),
    checkout: (cartUuid, data) => request('POST', `/cart/${cartUuid}/checkout`, { body: data }),

    // Customer auth
    register: (data) => request('POST', '/customers/register', { body: data }),
    login: (email, password) => request('POST', '/customers/login', { body: { email, password } }),
    logout: () => request('POST', '/customers/logout'),
    forgotPassword: (email) => request('POST', '/customers/password/forgot', { body: { email } }),
    resetPassword: (email, token, password) =>
      request('POST', '/customers/password/reset', { body: { email, token, password } }),

    // Customer profile
    getMe: () => request('GET', '/customers/me', { requireAuth: true }),
    updateProfile: (data) => request('PATCH', '/customers/me', { body: data, requireAuth: true }),
    changePassword: (currentPassword, newPassword) =>
      request('POST', '/customers/me/password', {
        body: { current_password: currentPassword, new_password: newPassword },
        requireAuth: true,
      }),
    getAddresses: () => request('GET', '/customers/me/addresses', { requireAuth: true }),
    addAddress: (address) => request('POST', '/customers/me/addresses', { body: address, requireAuth: true }),
    updateAddress: (addressUuid, address) =>
      request('PATCH', `/customers/me/addresses/${addressUuid}`, { body: address, requireAuth: true }),
    deleteAddress: (addressUuid) =>
      request('DELETE', `/customers/me/addresses/${addressUuid}`, { requireAuth: true }),

    // Orders
    getMyOrders: (params) => request('GET', '/customers/me/orders', { params, requireAuth: true }),
    getOrder: (uuid) => request('GET', `/orders/${uuid}`),
    getOrderByNumber: (orderNumber) => request('GET', `/orders/by-number/${orderNumber}`),
    getOrderTracking: (uuid) => request('GET', `/orders/${uuid}/tracking`),

    // Shipping
    getShippingMethods: () => request('GET', '/shipping/methods'),
    calculateShipping: (data) => request('POST', '/shipping/calculate', { body: data }),

    // Payments
    initPayment: (orderUuid, method, returnUrl) =>
      request('POST', '/payments/init', { body: { order_uuid: orderUuid, method, return_url: returnUrl } }),
    getPaymentStatus: (paymentId) => request('GET', `/payments/${paymentId}/status`),

    // Customer token management
    setCustomerToken(token: string | null) {
      customerToken = token
    },
    getCustomerToken() {
      return customerToken
    },
  }
}
