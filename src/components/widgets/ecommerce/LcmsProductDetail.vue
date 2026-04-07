<script setup lang="ts">
/**
 * Product Detail Widget (E-commerce)
 *
 * Full product detail page with gallery, info, add to cart.
 */

import { computed, ref, onMounted, watch, inject, type Ref } from 'vue'
import { useLanguage } from '../../../composables/useLanguage'
import { useStorefront } from '../../../composables/useStorefront'
import { useCart } from '../../../composables/useCart'
import { useToast } from '../../../composables/useToast'
import { formatPrice, calculateDiscount } from '../../../utils/currency'
import type { StorefrontProduct } from '../../../api/storefront'

defineOptions({ inheritAttrs: false })

interface Props {
  data: Record<string, any>
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const { extractValue } = useLanguage(props.language)
const { client, isAvailable } = useStorefront()
const cart = useCart()
const toast = useToast()
const projectConfig = inject<Ref<any> | null>('lesscms-project-config', null)

const config = computed(() => props.data?.config || props.data || {})

const addToCartText = computed(() =>
  extractValue(props.data?.add_to_cart_button?.text) || (props.language === 'en' ? 'Add to cart' : 'Dodaj do koszyka')
)

const showGallery = computed(() => config.value.show_gallery !== false)
const showVariants = computed(() => config.value.show_variants !== false)
const showDescription = computed(() => config.value.show_description !== false)
const showSpecifications = computed(() => config.value.show_specifications !== false)
const slugSource = computed(() => config.value.slug_source || 'url')
const slugUrlSegment = computed(() => Number(config.value.slug_url_segment ?? 1))
const staticSlug = computed(() => config.value.slug || '')

const product = ref<StorefrontProduct | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)
const selectedImageIdx = ref(0)
const quantity = ref(1)
const isAdding = ref(false)

const currency = computed(() => projectConfig?.value?.commerce?.currency || 'PLN')

const resolvedSlug = computed(() => {
  if (slugSource.value === 'static') return staticSlug.value
  if (typeof window === 'undefined') return ''
  const segments = window.location.pathname.split('/').filter(Boolean)
  return segments[slugUrlSegment.value] || ''
})

const hasDiscount = computed(() =>
  product.value?.compare_at_price && product.value.compare_at_price > product.value.price
)

const discountPercent = computed(() => {
  if (!product.value?.compare_at_price) return 0
  return calculateDiscount(product.value.compare_at_price, product.value.price)
})

const inStock = computed(() => {
  if (!product.value) return false
  if (!product.value.track_stock) return true
  return product.value.stock > 0
})

const stockStatus = computed(() => {
  if (!product.value) return null
  if (!product.value.track_stock) return 'available'
  if (product.value.stock <= 0) return 'out'
  if (product.value.stock < 5) return 'low'
  return 'available'
})

const allImages = computed(() => {
  if (!product.value) return []
  const imgs = [...(product.value.images || [])]
  if (product.value.image && !imgs.includes(product.value.image)) {
    imgs.unshift(product.value.image)
  }
  return imgs
})

const mainImage = computed(() => allImages.value[selectedImageIdx.value] || null)

const t = (key: string) => {
  const lang = props.language || 'pl'
  const dict: Record<string, Record<string, string>> = {
    pl: {
      loading: 'Ładowanie...',
      notFound: 'Produkt nie znaleziony',
      sku: 'SKU',
      stockAvailable: 'Dostępny',
      stockLow: 'Mało sztuk',
      stockOut: 'Brak',
      quantity: 'Ilość',
      addedToCart: 'Dodano do koszyka',
      addError: 'Nie udało się dodać do koszyka',
      description: 'Opis',
      specifications: 'Specyfikacja',
    },
    en: {
      loading: 'Loading...',
      notFound: 'Product not found',
      sku: 'SKU',
      stockAvailable: 'In stock',
      stockLow: 'Low stock',
      stockOut: 'Out of stock',
      quantity: 'Quantity',
      addedToCart: 'Added to cart',
      addError: 'Failed to add to cart',
      description: 'Description',
      specifications: 'Specifications',
    },
  }
  return dict[lang]?.[key] || dict.pl[key] || key
}

async function fetchProduct() {
  if (!client.value || !resolvedSlug.value) return

  isLoading.value = true
  error.value = null
  selectedImageIdx.value = 0
  quantity.value = 1

  try {
    const response = await client.value.getProduct(resolvedSlug.value)
    product.value = response.data || null
  } catch (err: any) {
    error.value = err.message || t('notFound')
    product.value = null
  } finally {
    isLoading.value = false
  }
}

async function handleAddToCart() {
  if (!product.value || !inStock.value) return

  isAdding.value = true
  try {
    await cart.addItem(product.value.uuid, quantity.value)
    toast.success(t('addedToCart'))
  } catch (err: any) {
    toast.error(err.message || t('addError'))
  } finally {
    isAdding.value = false
  }
}

function increaseQty() {
  if (product.value?.track_stock && quantity.value >= product.value.stock) return
  quantity.value++
}

function decreaseQty() {
  if (quantity.value > 1) quantity.value--
}

onMounted(() => {
  if (isAvailable.value) fetchProduct()
})

watch([resolvedSlug, isAvailable], () => {
  if (isAvailable.value) fetchProduct()
})
</script>

<template>
  <div class="lcms-product-detail">
    <div v-if="isLoading" class="lcms-product-detail__loading">{{ t('loading') }}</div>

    <div v-else-if="error || !product" class="lcms-product-detail__not-found">
      {{ error || t('notFound') }}
    </div>

    <div v-else class="lcms-product-detail__layout">
      <!-- Gallery -->
      <div v-if="showGallery" class="lcms-product-detail__gallery">
        <div class="lcms-product-detail__main-image-wrap">
          <img
            v-if="mainImage"
            :src="mainImage"
            :alt="product.name"
            class="lcms-product-detail__main-image"
          />
          <div v-else class="lcms-product-detail__no-image">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
          <span v-if="hasDiscount" class="lcms-product-detail__discount-badge">
            -{{ discountPercent }}%
          </span>
        </div>
        <div v-if="allImages.length > 1" class="lcms-product-detail__thumbs">
          <button
            v-for="(img, idx) in allImages"
            :key="img"
            type="button"
            class="lcms-product-detail__thumb"
            :class="{ 'lcms-product-detail__thumb--active': idx === selectedImageIdx }"
            @click="selectedImageIdx = idx"
          >
            <img :src="img" :alt="`${product.name} ${idx + 1}`" />
          </button>
        </div>
      </div>

      <!-- Info -->
      <div class="lcms-product-detail__info">
        <span v-if="product.category" class="lcms-product-detail__category">
          {{ product.category.name }}
        </span>

        <h1 class="lcms-product-detail__name">{{ product.name }}</h1>

        <div class="lcms-product-detail__sku">{{ t('sku') }}: {{ product.sku }}</div>

        <div class="lcms-product-detail__price-wrap">
          <span v-if="hasDiscount" class="lcms-product-detail__price-original">
            {{ formatPrice(product.compare_at_price, currency) }}
          </span>
          <span class="lcms-product-detail__price">{{ formatPrice(product.price, currency) }}</span>
        </div>

        <div
          class="lcms-product-detail__stock"
          :class="`lcms-product-detail__stock--${stockStatus}`"
        >
          <span class="lcms-product-detail__stock-dot" />
          {{ stockStatus === 'available' ? t('stockAvailable') : stockStatus === 'low' ? t('stockLow') : t('stockOut') }}
        </div>

        <p v-if="product.short_description" class="lcms-product-detail__short-description">
          {{ product.short_description }}
        </p>

        <div v-if="inStock" class="lcms-product-detail__actions">
          <div class="lcms-product-detail__qty">
            <span class="lcms-product-detail__qty-label">{{ t('quantity') }}:</span>
            <div class="lcms-product-detail__qty-control">
              <button type="button" class="lcms-product-detail__qty-btn" @click="decreaseQty" :disabled="quantity <= 1">−</button>
              <span class="lcms-product-detail__qty-value">{{ quantity }}</span>
              <button type="button" class="lcms-product-detail__qty-btn" @click="increaseQty">+</button>
            </div>
          </div>

          <button
            type="button"
            class="lcms-product-detail__add-btn"
            :disabled="isAdding"
            @click="handleAddToCart"
          >
            <svg v-if="!isAdding" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            <span class="lcms-product-detail__add-spinner" v-else />
            {{ addToCartText }}
          </button>
        </div>

        <!-- Description -->
        <div v-if="showDescription && product.description" class="lcms-product-detail__section">
          <h3 class="lcms-product-detail__section-title">{{ t('description') }}</h3>
          <div class="lcms-product-detail__description" v-html="product.description" />
        </div>

        <!-- Specifications -->
        <div
          v-if="showSpecifications && product.attributes && Object.keys(product.attributes).length > 0"
          class="lcms-product-detail__section"
        >
          <h3 class="lcms-product-detail__section-title">{{ t('specifications') }}</h3>
          <table class="lcms-product-detail__specs">
            <tr v-for="(value, key) in product.attributes" :key="String(key)">
              <th>{{ key }}</th>
              <td>{{ value }}</td>
            </tr>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lcms-product-detail {
  font-family: var(--lcms-font-body, system-ui, sans-serif);
  color: var(--lcms-color-text, #1f2937);
}

.lcms-product-detail__loading,
.lcms-product-detail__not-found {
  text-align: center;
  padding: 4rem 1rem;
  color: var(--lcms-color-muted, #6b7280);
  font-size: 1.125rem;
}

.lcms-product-detail__layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--lcms-section-gap, 2rem);
}

@media (min-width: 768px) {
  .lcms-product-detail__layout {
    grid-template-columns: 1fr 1fr;
  }
}

@media (min-width: 1024px) {
  .lcms-product-detail__layout {
    grid-template-columns: 1.2fr 1fr;
    gap: 3rem;
  }
}

/* Gallery */
.lcms-product-detail__gallery {
  position: sticky;
  top: 2rem;
  align-self: start;
}

.lcms-product-detail__main-image-wrap {
  position: relative;
  aspect-ratio: 1 / 1;
  background: var(--lcms-color-background-alt, #f9fafb);
  border-radius: var(--lcms-border-radius, 0.5rem);
  overflow: hidden;
  border: 1px solid var(--lcms-color-border, #e5e7eb);
}

.lcms-product-detail__main-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.lcms-product-detail__no-image {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--lcms-color-muted, #d1d5db);
}

.lcms-product-detail__no-image svg {
  width: 80px;
  height: 80px;
}

.lcms-product-detail__discount-badge {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: var(--lcms-color-danger, #ef4444);
  color: #fff;
  font-size: 0.875rem;
  font-weight: 700;
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem;
}

.lcms-product-detail__thumbs {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.lcms-product-detail__thumb {
  aspect-ratio: 1 / 1;
  background: var(--lcms-color-background-alt, #f9fafb);
  border: 2px solid var(--lcms-color-border, #e5e7eb);
  border-radius: 0.375rem;
  overflow: hidden;
  cursor: pointer;
  padding: 0;
  transition: border-color 0.15s;
}

.lcms-product-detail__thumb:hover {
  border-color: var(--lcms-color-primary, #3b82f6);
}

.lcms-product-detail__thumb--active {
  border-color: var(--lcms-color-primary, #3b82f6);
}

.lcms-product-detail__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Info */
.lcms-product-detail__category {
  display: inline-block;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--lcms-color-muted, #6b7280);
  margin-bottom: 0.5rem;
}

.lcms-product-detail__name {
  font-family: var(--lcms-font-heading, var(--lcms-font-body));
  font-size: var(--lcms-h1-font-size, 2rem);
  font-weight: var(--lcms-h1-font-weight, 700);
  color: var(--lcms-h1-color, var(--lcms-color-text));
  line-height: var(--lcms-h1-line-height, 1.2);
  margin: 0 0 0.5rem;
}

.lcms-product-detail__sku {
  font-size: 0.875rem;
  color: var(--lcms-color-muted, #6b7280);
  margin-bottom: 1rem;
}

.lcms-product-detail__price-wrap {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.lcms-product-detail__price {
  font-size: 2rem;
  font-weight: 800;
  color: var(--lcms-color-primary, #3b82f6);
  line-height: 1;
}

.lcms-product-detail__price-original {
  font-size: 1.125rem;
  color: var(--lcms-color-muted, #9ca3af);
  text-decoration: line-through;
}

.lcms-product-detail__stock {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.875rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 1.5rem;
}

.lcms-product-detail__stock--available {
  background: rgba(16, 185, 129, 0.1);
  color: var(--lcms-color-success, #10b981);
}

.lcms-product-detail__stock--low {
  background: rgba(245, 158, 11, 0.1);
  color: var(--lcms-color-warning, #f59e0b);
}

.lcms-product-detail__stock--out {
  background: rgba(239, 68, 68, 0.1);
  color: var(--lcms-color-danger, #ef4444);
}

.lcms-product-detail__stock-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}

.lcms-product-detail__short-description {
  color: var(--lcms-color-text, #4b5563);
  line-height: 1.6;
  margin: 0 0 1.5rem;
}

.lcms-product-detail__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: flex-end;
  margin-bottom: 2rem;
}

.lcms-product-detail__qty {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.lcms-product-detail__qty-label {
  font-size: 0.875rem;
  font-weight: 500;
}

.lcms-product-detail__qty-control {
  display: flex;
  align-items: center;
  border: 1px solid var(--lcms-color-border, #d1d5db);
  border-radius: var(--lcms-border-radius, 0.375rem);
  overflow: hidden;
}

.lcms-product-detail__qty-btn {
  width: 2.5rem;
  height: 2.75rem;
  background: var(--lcms-color-background, white);
  border: none;
  cursor: pointer;
  font-size: 1.25rem;
  color: var(--lcms-color-text, #374151);
  display: flex;
  align-items: center;
  justify-content: center;
}

.lcms-product-detail__qty-btn:hover:not(:disabled) {
  background: var(--lcms-color-background-alt, #f3f4f6);
}

.lcms-product-detail__qty-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.lcms-product-detail__qty-value {
  min-width: 3rem;
  text-align: center;
  font-weight: 600;
  font-size: 1rem;
}

.lcms-product-detail__add-btn {
  flex: 1;
  min-height: 2.75rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: var(--lcms-color-primary, #3b82f6);
  color: var(--lcms-color-white, #fff);
  padding: var(--lcms-btn-padding, 0.75rem 1.5rem);
  border-radius: var(--lcms-btn-border-radius, var(--lcms-border-radius, 0.375rem));
  border: none;
  font-size: var(--lcms-btn-font-size, 1rem);
  font-weight: var(--lcms-btn-font-weight, 600);
  font-family: var(--lcms-font-button, var(--lcms-font-body));
  cursor: pointer;
  transition: opacity 0.2s, transform 0.1s;
}

.lcms-product-detail__add-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.lcms-product-detail__add-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.lcms-product-detail__add-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.lcms-product-detail__add-btn svg {
  width: 1.25rem;
  height: 1.25rem;
}

.lcms-product-detail__add-spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: lcms-spin 0.8s linear infinite;
}

@keyframes lcms-spin {
  to { transform: rotate(360deg); }
}

.lcms-product-detail__section {
  border-top: 1px solid var(--lcms-color-border, #e5e7eb);
  padding-top: 1.5rem;
  margin-top: 1.5rem;
}

.lcms-product-detail__section-title {
  font-family: var(--lcms-font-heading, var(--lcms-font-body));
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 0.75rem;
}

.lcms-product-detail__description {
  line-height: 1.7;
  color: var(--lcms-color-text, #374151);
}

.lcms-product-detail__description :deep(p) {
  margin: 0 0 1rem;
}

.lcms-product-detail__specs {
  width: 100%;
  border-collapse: collapse;
}

.lcms-product-detail__specs th,
.lcms-product-detail__specs td {
  padding: 0.625rem 0;
  text-align: left;
  border-bottom: 1px solid var(--lcms-color-border, #f3f4f6);
  font-size: 0.875rem;
}

.lcms-product-detail__specs th {
  font-weight: 500;
  color: var(--lcms-color-muted, #6b7280);
  width: 40%;
}
</style>
