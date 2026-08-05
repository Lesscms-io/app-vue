<script setup lang="ts">
/**
 * Product Carousel Widget (E-commerce)
 *
 * Horizontal scrolling carousel of products with arrow navigation.
 */

import { computed, ref, onMounted, onServerPrefetch, watch, inject, onUnmounted, type Ref } from 'vue'
import { useLanguage } from '../../../composables/useLanguage'
import { useStorefront } from '../../../composables/useStorefront'
import { formatPrice, hasDisplayablePrice } from '../../../utils/currency'
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
const projectConfig = inject<Ref<any> | null>('lesscms-project-config', null)

const config = computed(() => props.data?.config || props.data || {})
const headingText = computed(() => extractValue(props.data?.heading?.text) || '')

const source = computed(() => config.value.source || 'latest')
const categorySourceMode = computed(() => config.value.category_source || 'static')
const categoryUrlSegment = computed(() => Number(config.value.category_url_segment ?? 1))
const resolvedCategorySlug = computed(() => {
  if (categorySourceMode.value === 'url') {
    if (typeof window === 'undefined') return ''
    const segments = window.location.pathname.split('/').filter(Boolean)
    return segments[categoryUrlSegment.value] || ''
  }
  return config.value.category_slug || ''
})
const productSlugs = computed(() => {
  const raw = config.value.product_slugs || ''
  return String(raw)
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
})
const limit = computed(() => Number(config.value.limit) || 12)
const visibleItems = computed(() => Number(config.value.visible_items) || 4)
const autoplay = computed(() => config.value.autoplay === true)
const showPrice = computed(() => config.value.show_price !== false)

const products = ref<StorefrontProduct[]>([])
const isLoading = ref(false)
const trackEl = ref<HTMLDivElement | null>(null)
const currentIdx = ref(0)
const itemsPerView = ref(visibleItems.value)

const currency = computed(() => projectConfig?.value?.commerce?.currency || 'PLN')

const productUrl = (product: StorefrontProduct) => {
  const route = projectConfig?.value?.commerce?.routes?.product || '/produkt/:slug'
  return route.replace(':slug', product.slug || product.sku || product.uuid)
}

const trackStyle = computed(() => ({
  '--lcms-carousel-items': itemsPerView.value,
} as any))

const canGoPrev = computed(() => currentIdx.value > 0)
const canGoNext = computed(() => currentIdx.value < products.value.length - itemsPerView.value)

function scrollPrev() {
  currentIdx.value = Math.max(0, currentIdx.value - 1)
  scrollToCurrent()
}

function scrollNext() {
  currentIdx.value = Math.min(products.value.length - itemsPerView.value, currentIdx.value + 1)
  scrollToCurrent()
}

function scrollToCurrent() {
  if (!trackEl.value) return
  const itemWidth = trackEl.value.scrollWidth / products.value.length
  trackEl.value.scrollTo({ left: itemWidth * currentIdx.value, behavior: 'smooth' })
}

let autoplayTimer: ReturnType<typeof setInterval> | null = null

function startAutoplay() {
  if (!autoplay.value) return
  stopAutoplay()
  autoplayTimer = setInterval(() => {
    if (canGoNext.value) {
      scrollNext()
    } else {
      currentIdx.value = 0
      scrollToCurrent()
    }
  }, 5000)
}

function stopAutoplay() {
  if (autoplayTimer) {
    clearInterval(autoplayTimer)
    autoplayTimer = null
  }
}

function updateItemsPerView() {
  if (typeof window === 'undefined') return
  const w = window.innerWidth
  if (w < 640) itemsPerView.value = 1
  else if (w < 1024) itemsPerView.value = 2
  else itemsPerView.value = visibleItems.value
}

async function fetchProducts() {
  if (!client.value) return

  isLoading.value = true
  try {
    if (source.value === 'manual') {
      const slugs = productSlugs.value
      if (slugs.length === 0) {
        products.value = []
      } else {
        const results = await Promise.all(
          slugs.map((slug) =>
            client.value!.getProduct(slug).then((r) => r.data).catch(() => null)
          )
        )
        products.value = results.filter((p): p is StorefrontProduct => p !== null)
      }
    } else if (source.value === 'category' && resolvedCategorySlug.value) {
      const response = await client.value.getCategoryProducts(resolvedCategorySlug.value, { per_page: limit.value })
      products.value = response.data || []
    } else {
      const response = await client.value.getProducts({ per_page: limit.value, sort_by: 'newest' })
      products.value = response.data || []
    }
  } catch {
    products.value = []
  } finally {
    isLoading.value = false
  }
}

// SSR: fetch products before render so they appear in the initial HTML
onServerPrefetch(async () => {
  if (isAvailable.value) {
    await fetchProducts()
  }
})

onMounted(() => {
  updateItemsPerView()
  if (isAvailable.value && products.value.length === 0 && !error.value) fetchProducts()
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', updateItemsPerView)
    if (autoplay.value) startAutoplay()
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updateItemsPerView)
  }
  stopAutoplay()
})

watch([source, resolvedCategorySlug, productSlugs, isAvailable], () => {
  if (isAvailable.value) fetchProducts()
})
</script>

<template>
  <div class="lcms-product-carousel">
    <div class="lcms-product-carousel__header">
      <h3 v-if="headingText" class="lcms-product-carousel__heading">{{ headingText }}</h3>
      <div v-if="products.length > itemsPerView" class="lcms-product-carousel__nav">
        <button
          type="button"
          class="lcms-product-carousel__arrow"
          :disabled="!canGoPrev"
          @click="scrollPrev"
          :aria-label="props.language === 'en' ? 'Previous' : 'Poprzedni'"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <button
          type="button"
          class="lcms-product-carousel__arrow"
          :disabled="!canGoNext"
          @click="scrollNext"
          :aria-label="props.language === 'en' ? 'Next' : 'Następny'"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>
    </div>

    <div ref="trackEl" class="lcms-product-carousel__track" :style="trackStyle">
      <a
        v-for="product in products"
        :key="product.uuid"
        :href="productUrl(product)"
        class="lcms-product-carousel__card"
      >
        <div class="lcms-product-carousel__card-image-wrap">
          <img v-if="product.image" :src="product.image" :alt="product.name" loading="lazy" />
          <div v-else class="lcms-product-carousel__card-no-image">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
        </div>
        <div class="lcms-product-carousel__card-body">
          <div class="lcms-product-carousel__card-name">{{ product.name }}</div>
          <div v-if="showPrice && hasDisplayablePrice(product.price)" class="lcms-product-carousel__card-price">
            {{ formatPrice(product.price, currency) }}
          </div>
        </div>
      </a>
    </div>
  </div>
</template>

<style scoped>
.lcms-product-carousel {
  font-family: var(--lcms-font-body, system-ui, sans-serif);
  color: var(--lcms-color-text, #1f2937);
}

.lcms-product-carousel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  gap: 1rem;
}

.lcms-product-carousel__heading {
  font-family: var(--lcms-font-heading, var(--lcms-font-body));
  font-size: var(--lcms-h2-font-size, 1.875rem);
  font-weight: var(--lcms-h2-font-weight, 700);
  color: var(--lcms-h2-color, var(--lcms-color-text));
  margin: 0;
}

.lcms-product-carousel__nav {
  display: flex;
  gap: 0.5rem;
}

.lcms-product-carousel__arrow {
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--lcms-color-background, #ffffff);
  border: 1px solid var(--lcms-color-border, #e5e7eb);
  border-radius: 50%;
  cursor: pointer;
  color: var(--lcms-color-text, #374151);
  transition: all 0.15s;
}

.lcms-product-carousel__arrow:hover:not(:disabled) {
  background: var(--lcms-color-primary, #3b82f6);
  color: var(--lcms-color-white, #fff);
  border-color: var(--lcms-color-primary, #3b82f6);
}

.lcms-product-carousel__arrow:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.lcms-product-carousel__arrow svg {
  width: 1.25rem;
  height: 1.25rem;
}

.lcms-product-carousel__track {
  display: flex;
  gap: 1rem;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}

.lcms-product-carousel__track::-webkit-scrollbar {
  display: none;
}

.lcms-product-carousel__card {
  flex: 0 0 calc((100% - (var(--lcms-carousel-items, 4) - 1) * 1rem) / var(--lcms-carousel-items, 4));
  scroll-snap-align: start;
  text-decoration: none;
  color: inherit;
  background: var(--lcms-color-background, #ffffff);
  border: 1px solid var(--lcms-color-border, #e5e7eb);
  border-radius: var(--lcms-border-radius, 0.5rem);
  overflow: hidden;
  transition: box-shadow 0.2s, transform 0.2s;
}

.lcms-product-carousel__card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.lcms-product-carousel__card-image-wrap {
  aspect-ratio: 1 / 1;
  background: var(--lcms-color-background-alt, #f9fafb);
  overflow: hidden;
}

.lcms-product-carousel__card-image-wrap img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.lcms-product-carousel__card-no-image {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--lcms-color-muted, #d1d5db);
}

.lcms-product-carousel__card-no-image svg {
  width: 48px;
  height: 48px;
}

.lcms-product-carousel__card-body {
  padding: 0.875rem;
}

.lcms-product-carousel__card-name {
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--lcms-color-text);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 0.375rem;
  min-height: 2.7em;
}

.lcms-product-carousel__card-price {
  font-size: 1rem;
  font-weight: 700;
  color: var(--lcms-color-primary, #3b82f6);
}
</style>
