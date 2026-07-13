<script setup lang="ts">
import { computed, ref, onMounted, onServerPrefetch, watch, inject, type Ref } from 'vue'
import { useLanguage } from '../../../composables/useLanguage'
import { useStorefront } from '../../../composables/useStorefront'
import { formatPrice, calculateDiscount } from '../../../utils/currency'
import type { StorefrontProduct } from '../../../api/storefront'

defineOptions({ inheritAttrs: false })

interface ResolvedRoute {
  params?: Record<string, string>
}

interface Props {
  data: Record<string, any>
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const { extractValue } = useLanguage(props.language)
const { client, isAvailable } = useStorefront()
const projectConfig = inject<Ref<any> | null>('lesscms-project-config', null)
const resolvedRoute = inject<Ref<ResolvedRoute | null> | null>('routeParams', null)
// Product page context — provided by the renderer's [...slug].vue, saves a fetch.
const injectedProduct = inject<Ref<any> | null>('lcms-product', null)

const config = computed(() => props.data?.config || props.data || {})
const headingText = computed(() => extractValue(props.data?.heading?.text) || '')

const basis = computed(() => config.value.basis === 'template' ? 'template' : 'category')
const slugSource = computed(() => config.value.slug_source || 'url')
const slugUrlSegment = computed(() => Number(config.value.slug_url_segment ?? 1))
const staticSlug = computed(() => config.value.slug || '')
const limit = computed(() => Number(config.value.limit) || 4)
const columns = computed(() => Number(config.value.columns) || 4)
const columnsTablet = computed(() => Number(config.value.columns_tablet) || 2)
const columnsMobile = computed(() => Number(config.value.columns_mobile) || 2)
const showPrice = computed(() => config.value.show_price !== false)
const showCategory = computed(() => config.value.show_category === true)

const currency = computed(() => projectConfig?.value?.commerce?.currency || 'PLN')

const resolvedSlug = computed(() => {
  if (slugSource.value === 'static') return staticSlug.value
  const routeVal = resolvedRoute?.value
  if (routeVal?.params?.slug) return routeVal.params.slug
  if (typeof window === 'undefined') return ''
  const segments = window.location.pathname.split('/').filter(Boolean)
  return segments[slugUrlSegment.value] || ''
})

const products = ref<StorefrontProduct[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)
// No related products is a legitimate outcome — collapse the widget instead
// of showing an empty-state that reads as an error on a product page.
const isEmpty = computed(() => !isLoading.value && !error.value && products.value.length === 0)

const productUrl = (product: StorefrontProduct) => {
  const route = projectConfig?.value?.commerce?.routes?.product || '/produkt/:slug'
  const identifier = product.slug || product.sku || product.uuid
  return route.replace(':slug', identifier)
}

const gridStyle = computed(() => ({
  '--lcms-related-cols-desktop': columns.value,
  '--lcms-related-cols-tablet': columnsTablet.value,
  '--lcms-related-cols-mobile': columnsMobile.value,
} as any))

async function resolveBaseProduct(): Promise<any | null> {
  const injected = injectedProduct?.value
  if (injected && slugSource.value === 'url') return injected
  const slug = resolvedSlug.value
  if (!slug) return null
  try {
    const response = await client.value!.getProduct(slug)
    return response.data || null
  } catch {
    return null
  }
}

async function fetchRelated() {
  if (!client.value) return

  isLoading.value = true
  error.value = null

  try {
    const base = await resolveBaseProduct()
    if (!base) {
      products.value = []
      return
    }

    let candidates: StorefrontProduct[] = []

    if (basis.value === 'template' && base.template_uuid) {
      // Same product template — the list endpoint returns full cached
      // payloads, so template_uuid is filterable client-side.
      const response = await client.value.getProducts({ per_page: 100 })
      candidates = (response.data || []).filter(
        (p: any) => p.template_uuid === base.template_uuid
      )
    } else if (base.category?.slug) {
      // Same category (default basis; also the fallback when a product
      // has no template).
      const response = await client.value.getCategoryProducts(base.category.slug, {
        per_page: limit.value + 1,
      })
      candidates = response.data || []
    }

    products.value = candidates
      .filter((p) => p.uuid !== base.uuid)
      .slice(0, limit.value)
  } catch (err: any) {
    error.value = err.message || (props.language === 'en' ? 'Failed to load products' : 'Nie udało się załadować produktów')
    products.value = []
  } finally {
    isLoading.value = false
  }
}

onServerPrefetch(async () => {
  if (isAvailable.value) {
    await fetchRelated()
  }
})

onMounted(() => {
  if (isAvailable.value && products.value.length === 0 && !error.value) {
    fetchRelated()
  }
})

watch([basis, resolvedSlug, limit, isAvailable], () => {
  if (isAvailable.value) {
    fetchRelated()
  }
})

const t = (key: string) => {
  const lang = props.language || 'pl'
  const dict: Record<string, Record<string, string>> = {
    pl: {
      heading: 'Produkty podobne',
    },
    en: {
      heading: 'Related products',
    },
  }
  return dict[lang]?.[key] || dict.pl[key] || key
}
</script>

<template>
  <div
    v-if="!isEmpty"
    class="lcms-related-products"
  >
    <h3 class="lcms-related-products__heading">{{ headingText || t('heading') }}</h3>

    <div v-if="isLoading" class="lcms-related-products__grid" :style="gridStyle">
      <div v-for="i in limit" :key="i" class="lcms-related-card lcms-related-card--skeleton">
        <div class="lcms-related-card__skeleton-image" />
        <div class="lcms-related-card__skeleton-text" />
      </div>
    </div>

    <div v-else-if="error" class="lcms-related-products__error">
      {{ error }}
    </div>

    <div v-else class="lcms-related-products__grid" :style="gridStyle">
      <a
        v-for="product in products"
        :key="product.uuid"
        :href="productUrl(product)"
        class="lcms-related-card"
      >
        <div class="lcms-related-card__image-wrap">
          <img
            v-if="product.image"
            :src="product.image"
            :alt="product.name"
            class="lcms-related-card__image"
            loading="lazy"
          />
          <div v-else class="lcms-related-card__image-placeholder">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
          <span
            v-if="product.compare_at_price && product.compare_at_price > product.price"
            class="lcms-related-card__discount"
          >
            -{{ calculateDiscount(product.compare_at_price, product.price) }}%
          </span>
        </div>
        <div class="lcms-related-card__body">
          <span v-if="showCategory && product.category?.name" class="lcms-related-card__category">
            {{ product.category.name }}
          </span>
          <h4 class="lcms-related-card__name">{{ product.name }}</h4>
          <div v-if="showPrice" class="lcms-related-card__price-wrap">
            <span
              v-if="product.compare_at_price && product.compare_at_price > product.price"
              class="lcms-related-card__price-original"
            >
              {{ formatPrice(product.compare_at_price, currency) }}
            </span>
            <span class="lcms-related-card__price">{{ formatPrice(product.price, currency) }}</span>
          </div>
        </div>
      </a>
    </div>
  </div>
</template>

<style scoped>
.lcms-related-products {
  font-family: var(--lcms-font-body, system-ui, sans-serif);
  color: var(--lcms-color-text, #1f2937);
}

.lcms-related-products__heading {
  font-family: var(--lcms-font-heading, var(--lcms-font-body));
  font-size: var(--lcms-h3-font-size, 1.5rem);
  font-weight: var(--lcms-h3-font-weight, 700);
  color: var(--lcms-h3-color, var(--lcms-color-text));
  margin: 0 0 var(--lcms-section-gap, 1.25rem);
  line-height: 1.2;
}

.lcms-related-products__error {
  padding: 1rem;
  color: var(--lcms-color-muted, #6b7280);
  font-size: 0.9375rem;
}

.lcms-related-products__grid {
  display: grid;
  grid-template-columns: repeat(var(--lcms-related-cols-desktop, 4), minmax(0, 1fr));
  gap: var(--lcms-grid-gap, 1.25rem);
}

@media (max-width: 1024px) {
  .lcms-related-products__grid {
    grid-template-columns: repeat(var(--lcms-related-cols-tablet, 2), minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .lcms-related-products__grid {
    grid-template-columns: repeat(var(--lcms-related-cols-mobile, 2), minmax(0, 1fr));
  }
}

.lcms-related-card {
  display: block;
  text-decoration: none;
  color: inherit;
  border: 1px solid var(--lcms-color-border, #e5e7eb);
  border-radius: var(--lcms-border-radius, 0.5rem);
  overflow: hidden;
  background: var(--lcms-color-background, #fff);
  transition: box-shadow 0.15s, transform 0.15s;
}

.lcms-related-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.lcms-related-card__image-wrap {
  position: relative;
  aspect-ratio: 1 / 1;
  background: var(--lcms-color-background-alt, #f9fafb);
}

.lcms-related-card__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.lcms-related-card__image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--lcms-color-border, #e5e7eb);
}

.lcms-related-card__image-placeholder svg {
  width: 3rem;
  height: 3rem;
}

.lcms-related-card__discount {
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
  background: var(--lcms-color-danger, #ef4444);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 600;
}

.lcms-related-card__body {
  padding: 0.75rem;
}

.lcms-related-card__category {
  display: block;
  font-size: 0.75rem;
  color: var(--lcms-color-muted, #6b7280);
  margin-bottom: 0.25rem;
}

.lcms-related-card__name {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 500;
  line-height: 1.35;
}

.lcms-related-card__price-wrap {
  margin-top: 0.375rem;
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.lcms-related-card__price {
  font-weight: 700;
  font-size: 0.9375rem;
}

.lcms-related-card__price-original {
  font-size: 0.8125rem;
  color: var(--lcms-color-muted, #6b7280);
  text-decoration: line-through;
}

/* Skeleton */
.lcms-related-card--skeleton {
  pointer-events: none;
}

.lcms-related-card__skeleton-image {
  aspect-ratio: 1 / 1;
  background: var(--lcms-color-background-alt, #f3f4f6);
  animation: lcms-related-pulse 1.4s ease-in-out infinite;
}

.lcms-related-card__skeleton-text {
  height: 0.875rem;
  margin: 0.75rem;
  border-radius: 4px;
  background: var(--lcms-color-background-alt, #f3f4f6);
  animation: lcms-related-pulse 1.4s ease-in-out infinite;
}

@keyframes lcms-related-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.55; }
}
</style>
