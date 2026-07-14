<script setup lang="ts">
/**
 * Category Header Widget (E-commerce)
 *
 * Renders a category page header with breadcrumbs, image, name, description, count.
 * Slug source: from URL path or static config.
 */

import { computed, ref, onMounted, onServerPrefetch, watch, inject, type Ref } from 'vue'
import { useStorefront } from '../../../composables/useStorefront'
import type { StorefrontCategory } from '../../../api/storefront'

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

const { client, isAvailable } = useStorefront()
const projectConfig = inject<Ref<any> | null>('lesscms-project-config', null)

const config = computed(() => props.data?.config || props.data || {})

const showBreadcrumbs = computed(() => config.value.show_breadcrumbs !== false)
const showDescription = computed(() => config.value.show_description !== false)
const showProductCount = computed(() => config.value.show_product_count === true)
const slugSource = computed(() => config.value.slug_source || 'url')
const slugUrlSegment = computed(() => Number(config.value.slug_url_segment ?? 1))
const staticSlug = computed(() => config.value.slug || '')

const category = ref<StorefrontCategory | null>(null)
// Ancestor chain (root → parent) for the breadcrumb trail, excluding the
// category itself — built from the category tree in one request.
const ancestors = ref<StorefrontCategory[]>([])
const productCount = ref<number>(0)
const isLoading = ref(false)
const error = ref<string | null>(null)

// SSR-safe slug resolution, same contract as product-detail: static config →
// route params provided by the renderer → window pathname (client fallback).
const resolvedRoute = inject<Ref<ResolvedRoute | null> | null>('routeParams', null)

const resolvedSlug = computed(() => {
  if (slugSource.value === 'static') return staticSlug.value
  const routeVal = resolvedRoute?.value
  if (routeVal?.params?.slug) return routeVal.params.slug
  if (typeof window === 'undefined') return ''
  const segments = window.location.pathname.split('/').filter(Boolean)
  return segments[slugUrlSegment.value] || ''
})

const categoryUrl = (slug: string | null) => {
  if (!slug) return '#'
  const route = projectConfig?.value?.commerce?.routes?.category || '/kategoria/:slug'
  return route.replace(':slug', slug)
}

// Root → target path in the nested tree; null when the slug is absent.
function pathToCategory(nodes: StorefrontCategory[], slug: string, trail: StorefrontCategory[] = []): StorefrontCategory[] | null {
  for (const node of nodes) {
    const next = [...trail, node]
    if (node.slug === slug) return next
    const found = pathToCategory(node.children || [], slug, next)
    if (found) return found
  }
  return null
}

const homeUrl = '/'

const t = (key: string) => {
  const lang = props.language || 'pl'
  const dict: Record<string, Record<string, string>> = {
    pl: { home: 'Strona główna', categories: 'Kategorie', products: 'produktów', loading: 'Ładowanie...' },
    en: { home: 'Home', categories: 'Categories', products: 'products', loading: 'Loading...' },
  }
  return dict[lang]?.[key] || dict.pl[key] || key
}

async function fetchCategory() {
  if (!client.value || !resolvedSlug.value) return

  isLoading.value = true
  error.value = null

  try {
    // Full tree in one request — gives the category AND its ancestor chain
    // for the breadcrumb trail.
    const response = await client.value.getCategories()
    const path = pathToCategory(response.data || [], resolvedSlug.value)
    category.value = path ? path[path.length - 1] : null
    ancestors.value = path ? path.slice(0, -1) : []

    if (showProductCount.value && category.value) {
      const productsRes = await client.value.getCategoryProducts(resolvedSlug.value, { per_page: 1 })
      productCount.value = productsRes.pagination?.total || 0
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to load category'
    category.value = null
    ancestors.value = []
  } finally {
    isLoading.value = false
  }
}

// SSR: resolve before render so the header (name/description/breadcrumbs)
// is part of the initial HTML — also matters for SEO on category pages.
onServerPrefetch(async () => {
  if (isAvailable.value) await fetchCategory()
})

onMounted(() => {
  if (isAvailable.value && !category.value) fetchCategory()
})

watch([resolvedSlug, isAvailable], () => {
  if (isAvailable.value) fetchCategory()
})
</script>

<template>
  <div class="lcms-category-header" v-if="!isLoading || category">
    <nav v-if="showBreadcrumbs" class="lcms-category-header__breadcrumbs" aria-label="Breadcrumb">
      <a :href="homeUrl">{{ t('home') }}</a>
      <template v-for="crumb in ancestors" :key="crumb.uuid">
        <span class="lcms-category-header__breadcrumb-separator">/</span>
        <a :href="categoryUrl(crumb.slug)">{{ crumb.name }}</a>
      </template>
      <template v-if="category">
        <span class="lcms-category-header__breadcrumb-separator">/</span>
        <span>{{ category.name }}</span>
      </template>
    </nav>

    <div v-if="category" class="lcms-category-header__content">
      <div v-if="category.image" class="lcms-category-header__image-wrap">
        <img :src="category.image" :alt="category.name" class="lcms-category-header__image" />
      </div>

      <div class="lcms-category-header__text">
        <h1 class="lcms-category-header__name">{{ category.name }}</h1>
        <p v-if="showDescription && category.description" class="lcms-category-header__description">
          {{ category.description }}
        </p>
        <span v-if="showProductCount" class="lcms-category-header__count">
          {{ productCount }} {{ t('products') }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lcms-category-header {
  font-family: var(--lcms-font-body, system-ui, sans-serif);
  color: var(--lcms-color-text, #1f2937);
  margin-bottom: var(--lcms-section-gap, 1.5rem);
}

.lcms-category-header__breadcrumbs {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--lcms-color-muted, #6b7280);
  margin-bottom: 1rem;
}

.lcms-category-header__breadcrumbs a {
  color: var(--lcms-color-link, var(--lcms-color-primary, #3b82f6));
  text-decoration: none;
}

.lcms-category-header__breadcrumbs a:hover {
  text-decoration: underline;
}

.lcms-category-header__breadcrumb-separator {
  opacity: 0.5;
}

.lcms-category-header__content {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
}

@media (min-width: 768px) {
  .lcms-category-header__content {
    grid-template-columns: 1fr 2fr;
    align-items: center;
  }
}

.lcms-category-header__image-wrap {
  border-radius: var(--lcms-border-radius, 0.5rem);
  overflow: hidden;
  aspect-ratio: 16 / 9;
}

.lcms-category-header__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.lcms-category-header__name {
  font-family: var(--lcms-font-heading, var(--lcms-font-body));
  font-size: var(--lcms-h1-font-size, 2.5rem);
  font-weight: var(--lcms-h1-font-weight, 800);
  color: var(--lcms-h1-color, var(--lcms-color-text));
  line-height: var(--lcms-h1-line-height, 1.1);
  margin: 0;
}

.lcms-category-header__description {
  font-size: 1rem;
  color: var(--lcms-color-muted, #6b7280);
  line-height: 1.6;
  margin: 0.75rem 0 0;
}

.lcms-category-header__count {
  display: inline-block;
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: var(--lcms-color-muted, #6b7280);
}
</style>
