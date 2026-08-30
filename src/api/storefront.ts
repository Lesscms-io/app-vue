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

export type StorefrontOptionDisplayType = 'select' | 'radio' | 'image_swatches' | 'color_swatches' | 'numeric' | 'text' | 'textarea' | 'file' | 'checkbox'

export interface StorefrontVisibilityRule {
  mode?: 'show_when' | 'hide_when'
  and_groups: string[][]
}

export interface StorefrontPriceOverride {
  when: StorefrontVisibilityRule
  value: number
  type?: 'absolute' | 'add' | 'subtract' | 'add_percent' | 'subtract_percent'
}

export interface StorefrontProductOption {
  uuid: string
  name: string
  code: string
  /** Additive price delta vs base. Negative = subtract. Type column was
   *  dropped in BE migration 2026_05_05 — value alone now drives modifier. */
  price_modifier_value: number | null
  /** Conditional price rules for this option. First match wins; when no rule
   *  matches, price_modifier_value applies as the default. */
  price_modifier_overrides?: StorefrontPriceOverride[] | null
  color_hex: string | null
  thumbnail: string | null
  is_default: boolean
  sort_order: number
}

export interface StorefrontProductOptionGroup {
  uuid: string
  name: string
  code: string
  display_type: StorefrontOptionDisplayType
  is_required: boolean
  sort_order: number
  /** Etykieta scalająca kilka grup w jeden krok wizarda. NULL = osobny krok. */
  wizard_step?: string | null
  visible_when_option_uuids: string[]
  numeric_min: number | null
  numeric_max: number | null
  numeric_step: number | null
  price_per_unit: number | null
  /** Numeric: jednostki wliczone w cenę bazową. Per-unit liczymy od (value - price_free_units). */
  price_free_units?: number | null
  /** Conditional per-unit overrides for numeric groups. First match wins. */
  price_per_unit_overrides?: StorefrontPriceOverride[] | null
  /** display_type='file' only: per-group upload constraints. */
  file_allowed_extensions?: string[] | null
  file_max_size_kb?: number | null
  file_max_count?: number | null
  /** display_type='checkbox' only: single yes/no toggle config. */
  checkbox_label?: string | null
  checkbox_price_modifier?: number | null
  /** Optional preview image rendered next to the TAK/NIE label. */
  checkbox_image?: string | null
  /** Conditional surcharge overrides for checkbox groups. First match wins. */
  checkbox_price_overrides?: StorefrontPriceOverride[] | null
  /** display_type='text'/'textarea': max input length in characters. */
  text_max_length?: number | null
  /** display_type='textarea' only: visible rows of the input. */
  text_rows?: number | null
  options: StorefrontProductOption[]
}

export interface StorefrontPluginBehaviorCta {
  /**
   * `start_plugin_flow` posts the configurator snapshot to `post_url` and
   * navigates to the `redirect_url` the plugin answers with — the generic
   * "hand the customer over to this plugin" action. `create_album_flow` is
   * the original, photo-albums-shaped name for the same behavior, kept so
   * older plugin builds keep working.
   */
  type: 'start_plugin_flow' | 'create_album_flow' | 'link'
  label: string
  post_url?: string
  url?: string
  /**
   * Generic flag set by any plugin behavior whose action requires an
   * authenticated customer. The widget redirects unauthenticated users to
   * the configured login URL with `?return=<current>` instead of letting
   * the action fail with a bare 401 toast. Plugin-agnostic — core does not
   * need to know which plugin set the flag.
   */
  requires_auth?: boolean
  /**
   * Where the CTA renders in wizard mode. 'summary' (default) keeps the
   * historical behavior — the button lives in the action row under the
   * wizard summary. 'step' asks the widget to render it inline, in the step
   * that owns the bound option, so the flow can run before the rest of the
   * configuration is filled in. Core does not decide this — the plugin does.
   */
  placement?: 'summary' | 'step'
  /**
   * Which groups must be valid before the CTA can run. 'all' (default) =
   * every visible required group. 'step' = only the required groups up to
   * and including the current wizard step — the natural scope for a CTA
   * placed mid-wizard.
   */
  validate?: 'all' | 'step'
  /**
   * GET endpoint the widget calls when the customer comes back from the
   * plugin's external service (`?lcms_resume=<plugin_id>:<ref>` on the URL).
   * `{ref}` is replaced with the reference from that marker. The response
   * shape is StorefrontPluginResume — a generic instruction set the widget
   * applies without knowing anything about the plugin's domain.
   */
  resume_url?: string
  /**
   * POST endpoint the widget calls with the final configurator snapshot
   * (`configured_options` + `configured_total`) right before add-to-cart,
   * so the plugin can replace the partial snapshot it stored when the flow
   * started. `{ref}` is replaced like in `resume_url`.
   */
  sync_url?: string
  /**
   * Shown next to the price total while this CTA is pending — the total is
   * not final yet because the flow behind the CTA still has to run.
   */
  pending_price_note?: string
}

/**
 * One value the plugin wants pre-filled in the configurator after the
 * customer returns from its external service (e.g. the page count that
 * resulted from designing an album). `value` is an option uuid for
 * select/radio/swatch groups, and the raw value for numeric/text/checkbox.
 */
export interface StorefrontPluginResumePrefill {
  group_uuid: string
  value: string | number | boolean
  /** Render the group read-only — the value came from the external flow. */
  locked?: boolean
  /** Short annotation rendered under the group, e.g. "z Twojego projektu". */
  note?: string
}

/**
 * Generic "resume the configuration" instruction set returned by a plugin's
 * `cta.resume_url`. Every field is optional; the widget applies whatever it
 * gets and stays entirely plugin-agnostic.
 */
export interface StorefrontPluginResume {
  prefill?: StorefrontPluginResumePrefill[]
  /** Extra groups to render read-only (beyond those marked in `prefill`). */
  lock_groups?: string[]
  /** Continue the wizard on the step right after the step owning this group. */
  goto_step_after_group?: string | null
  /** Merged into the cart-line metadata on the final add-to-cart. */
  cart_metadata?: Record<string, unknown>
}

export interface StorefrontPluginBehavior {
  plugin_id: string
  group_uuid: string
  option_uuid: string
  cta: StorefrontPluginBehaviorCta
}

/**
 * Plugin-injected flow block (product.render hook). Marks a product whose
 * purchase happens through an external designer/uploader (e.g. photo-albums
 * print-studio) instead of a plain add-to-cart. When `url` is present the
 * ProductConfigurator renders a flow CTA navigating there in place of the
 * add-to-cart button; without `url` the block is informational only.
 */
export interface StorefrontProductFlow {
  plugin_id: string
  type: string
  button_label?: string | null
  description?: string | null
  url?: string | null
  [key: string]: unknown
}

export interface StorefrontProductChild {
  uuid: string
  sku: string
  name: string
  slug: string
  price: number
  compare_at_price: number | null
  stock: number
  track_stock: boolean
  status: 'active' | 'inactive' | 'draft'
  image: string | null
  images: string[]
  variant_binding_values: Record<string, unknown> | null
}

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
  /** Manual merchandising order (sort_by=manual); null/absent sorts last. */
  sort_order?: number | null
  category_uuid: string | null
  /** All category assignments (category_product pivot + legacy column). */
  category_uuids?: string[]
  category: { uuid: string; name: string; slug: string } | null
  images: string[]
  image: string | null
  attributes: Record<string, unknown>
  metadata: Record<string, unknown>
  product_type?: 'simple' | 'configurable'
  option_groups?: StorefrontProductOptionGroup[]
  plugin_behaviors?: StorefrontPluginBehavior[]
  flow?: StorefrontProductFlow | null
  children?: StorefrontProductChild[]
  parent_product_uuid?: string | null
  variant_binding_values?: Record<string, unknown> | null
  has_children?: boolean
  is_container?: boolean
  marketing_labels?: StorefrontMarketingLabel[]
  created_at: string
  updated_at: string
}

export interface StorefrontMarketingLabel {
  uuid: string
  code: string
  text: string
  text_translation?: Record<string, string> | null
  background_color: string | null
  text_color: string | null
  sort_order: number
  source?: string
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
  uuid?: string
  name?: string | null
  phone?: string | null
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
    // The internal order serializer returns `product_name`; `name` kept
    // optional for any legacy payloads.
    product_name?: string
    name?: string
    sku: string
    quantity: number
    unit_price: number
    subtotal: number
    product?: { uuid: string; name: string; slug: string | null; image: string | null } | null
  }>
  created_at: string
  updated_at: string
}

export interface StorefrontShippingMethod {
  code: string
  name: string
  carrier: string
  price: number
  currency: string
  estimated_days?: string | number | null
  requires_pickup_point?: boolean
  shipx_service?: string | null
  logo_url?: string | null
  geowidget_config?: { token: string; environment: 'sandbox' | 'production' } | null
  // Legacy fields kept so older mocks/payloads don't crash; prefer `price`.
  cost?: number
  description?: string
}

export interface StorefrontPickupPoint {
  id: string
  name: string
  address: string
  city?: string
  postal_code?: string
  latitude?: number | null
  longitude?: number | null
  opening_hours?: Record<string, string> | string | null
  /** Free-text description (e.g. "obok wejścia do biedronki"). */
  description?: string | null
  /** Distance from the searched postal code, in meters. */
  distance?: number | null
  type?: string | string[] | null
  /** Origin carrier code: `inpost`, `dpd`, ... */
  carrier?: string | null
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
    sort_by?: 'manual' | 'price_asc' | 'price_desc' | 'name_asc' | 'name_desc' | 'newest' | 'oldest'
    page?: number
    per_page?: number
  }): Promise<StorefrontPaginated<StorefrontProduct>>
  getProduct(slug: string): Promise<{ data: StorefrontProduct }>
  searchProducts(q: string, params?: { page?: number; per_page?: number }): Promise<StorefrontPaginated<StorefrontProduct>>
  /**
   * Produkty powiązane wyliczone przez reguły sklepu (ustawienia → Produkty powiązane).
   * `set` wybiera zestaw reguł, `limit` nadpisuje limit z konfiguracji.
   */
  getRelatedProducts(
    slug: string,
    params?: { set?: string; limit?: number }
  ): Promise<{ data: StorefrontProduct[]; meta?: { set: string | null; name: string | null; limit: number; total: number } }>

  // Categories
  getCategories(): Promise<{ data: StorefrontCategory[] }>
  getCategory(slug: string): Promise<{ data: StorefrontCategory }>
  getCategoryProducts(
    slug: string,
    params?: { page?: number; per_page?: number; sort_by?: 'manual' | 'price_asc' | 'price_desc' | 'name_asc' | 'name_desc' | 'newest' | 'oldest' }
  ): Promise<StorefrontPaginated<StorefrontProduct>>

  // Cart
  createCart(): Promise<{ data: StorefrontCart }>
  getCart(uuid: string): Promise<{ data: StorefrontCart }>
  addToCart(uuid: string, productUuid: string, quantity: number, metadata?: Record<string, unknown>): Promise<{ data: StorefrontCart }>
  /**
   * `metadata` replaces the line's stored configuration — sent when the
   * customer edited a configured item in the configurator. Omit it for a
   * plain quantity change and the stored configuration stays untouched.
   */
  updateCartItem(
    uuid: string,
    itemId: string,
    quantity: number,
    metadata?: Record<string, unknown>
  ): Promise<{ data: StorefrontCart }>
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
  reorderOrder(orderUuid: string): Promise<{
    data: {
      cart: StorefrontCart
      added: Array<{ order_item_uuid: string; cart_item_uuid: string; product_name: string; sku: string | null; quantity: number }>
      skipped: Array<{ order_item_uuid: string; product_name: string; sku: string | null; reason: string }>
    }
  }>

  // Shipping
  getShippingMethods(): Promise<{ data: StorefrontShippingMethod[] }>
  calculateShipping(data: {
    postal_code: string
    country: string
    weight?: number
    items_count?: number
    cart_uuid?: string
  }): Promise<{ data: { postal_code: string; country: string; methods: StorefrontShippingMethod[] } }>
  getPickupPoints(params: {
    postal_code?: string
    carrier?: string
    radius?: number
    /** Map viewport "swLat,swLng,neLat,neLng" — returns only points in view. */
    bbox?: string
    /** Free-text locate query (town / street / postal code). */
    search?: string
  }): Promise<{ data: { postal_code: string; carrier: string; points: StorefrontPickupPoint[] } }>

  // Payments
  initPayment(orderUuid: string, method: string, returnUrl?: string, blikCode?: string): Promise<{ data: PaymentInitResponse }>
  getPaymentMethods(): Promise<{ data: Array<{ code: string; name: string; sandbox?: boolean | null; logo_url?: string | null }> }>
  getPaymentStatus(paymentId: string): Promise<{ data: { payment_id: string; status: string; order_uuid?: string } }>
  chargeBlik(paymentId: string, blikCode: string): Promise<{ data: { payment_uuid: string; status: string } }>

  // Customer token management
  setCustomerToken(token: string | null): void
  getCustomerToken(): string | null

  // Marketing
  getActiveCampaigns(params?: {
    include?: StorefrontCampaignInclude[]
  }): Promise<{ data: StorefrontActiveCampaign[] }>

  // Generic plugin endpoint. `path` must be the storefront-relative path
  // exposed by the plugin's storefront proxy (e.g. `/plugins/photo-albums/flows/start`).
  callPluginEndpoint<T = any>(
    path: string,
    options?: { method?: string; body?: any; requireAuth?: boolean }
  ): Promise<T>

  // Option-group file uploads (display_type=file)
  uploadOptionFile(
    cartUuid: string,
    optionGroupUuid: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<{ data: StorefrontOptionUpload }>
  deleteOptionUpload(uploadUuid: string): Promise<void>
}

export interface StorefrontOptionUpload {
  uuid: string
  original_filename: string
  extension: string
  mime_type: string
  size: number
  public_url: string | null
}

export interface StorefrontMarketingTopBar {
  uuid: string
  code: string
  text: string
  text_translation: Record<string, string> | null
  background_color: string | null
  text_color: string | null
  link_url: string | null
  link_text: string | null
  link_text_translation: Record<string, string> | null
  priority?: number
}

export type StorefrontBannerPlacement = 'hero' | 'category_strip' | 'cart_drawer' | 'thank_you'

export interface StorefrontMarketingBanner {
  uuid: string
  code: string
  placement: StorefrontBannerPlacement
  image_url: string | null
  image_url_mobile: string | null
  alt_text: string | null
  alt_text_translation: Record<string, string> | null
  title: string | null
  title_translation: Record<string, string> | null
  subtitle: string | null
  subtitle_translation: Record<string, string> | null
  cta_text: string | null
  cta_text_translation: Record<string, string> | null
  cta_url: string | null
  priority: number
}

export interface StorefrontActiveCampaign {
  uuid: string
  name: string
  name_translation: Record<string, string> | null
  starts_at: string | null
  ends_at: string | null
  topbars?: StorefrontMarketingTopBar[]
  banners?: StorefrontMarketingBanner[]
}

export type StorefrontCampaignInclude = 'topbars' | 'banners'

export function createStorefrontClient(options: StorefrontClientOptions): StorefrontClient {
  const baseUrl = options.baseUrl.replace(/\/$/, '')
  const apiKey = options.apiKey

  let customerToken: string | null = null

  async function request<T>(
    method: string,
    path: string,
    options: { body?: any; params?: Record<string, any>; requireAuth?: boolean } = {}
  ): Promise<T> {
    const url = new URL(`${baseUrl}/v1${path}`)

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
    getRelatedProducts: (slug, params) =>
      request('GET', `/products/${encodeURIComponent(slug)}/related`, { params }),

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
    updateCartItem: (uuid, itemId, quantity, metadata) =>
      request('PATCH', `/cart/${uuid}/items/${itemId}`, {
        body: metadata ? { quantity, metadata } : { quantity },
      }),
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
    reorderOrder: (orderUuid) =>
      request('POST', '/cart/reorder', { body: { order_uuid: orderUuid }, requireAuth: true }),

    // Shipping
    getShippingMethods: () => request('GET', '/shipping/methods'),
    calculateShipping: (data) => request('POST', '/shipping/calculate', { body: data }),
    getPickupPoints: (params) => request('GET', '/shipping/points', { params }),

    // Payments
    initPayment: (orderUuid, method, returnUrl, blikCode) =>
      request('POST', '/payments/init', {
        body: {
          order_uuid: orderUuid,
          method,
          return_url: returnUrl,
          ...(blikCode ? { blik_code: blikCode } : {}),
        },
      }),
    getPaymentMethods: () => request('GET', '/payments/methods'),
    getPaymentStatus: (paymentId) => request('GET', `/payments/${paymentId}/status`),
    chargeBlik: (paymentId, blikCode) =>
      request('POST', `/payments/${paymentId}/blik-charge`, { body: { blik_code: blikCode } }),

    // Customer token management
    setCustomerToken(token: string | null) {
      customerToken = token
    },
    getCustomerToken() {
      return customerToken
    },

    callPluginEndpoint: (path, opts = {}) =>
      request(opts.method || 'POST', path, {
        body: opts.body,
        requireAuth: opts.requireAuth ?? true,
      }),

    // Option-group file uploads. Multipart goes through a dedicated POST that
    // bypasses the JSON request() helper. Storefront proxy must expose
    // /v1/cart/:cart/option-groups/:group/uploads accepting multipart/form-data.
    async uploadOptionFile(cartUuid, optionGroupUuid, file, onProgress) {
      const formData = new FormData()
      formData.append('file', file)

      const url = `${baseUrl}/v1/cart/${cartUuid}/option-groups/${optionGroupUuid}/uploads`

      // Use XMLHttpRequest so we can report upload progress; fetch lacks a
      // native progress event for request bodies.
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', url)
        xhr.setRequestHeader('X-Api-Key', apiKey)
        xhr.setRequestHeader('Accept', 'application/json')
        if (customerToken) {
          xhr.setRequestHeader('Authorization', `Bearer ${customerToken}`)
        }
        xhr.upload.onprogress = (ev) => {
          if (onProgress && ev.lengthComputable) {
            onProgress(Math.round((ev.loaded / ev.total) * 100))
          }
        }
        xhr.onload = () => {
          let body: any = null
          try { body = JSON.parse(xhr.responseText) } catch { /* ignore */ }
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(body)
          } else {
            reject(new StorefrontApiError(
              body?.message || xhr.statusText || 'Upload failed',
              xhr.status,
              body?.code,
              body?.errors
            ))
          }
        }
        xhr.onerror = () => reject(new StorefrontApiError('Network error', 0, 'NETWORK_ERROR'))
        xhr.send(formData)
      })
    },
    deleteOptionUpload: (uploadUuid) =>
      request('DELETE', `/cart/option-uploads/${uploadUuid}`),

    // Marketing
    getActiveCampaigns: (params) =>
      request('GET', '/marketing/campaigns/active', {
        params: params?.include ? { include: params.include.join(',') } : undefined,
      }),
  }
}
