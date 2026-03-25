<script setup lang="ts">
/**
 * Dynamic Page Resolver
 *
 * Resolves dynamic routes by matching URL patterns from the routes API.
 * Supports both static pages and dynamic patterns like /blog/{slug}.
 * Also installs SPA link interception and loading bar via usePageTransition.
 */

import { ref, computed, watch, onMounted, provide, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useRoutes, type ResolvedRoute } from '@/composables/useRoutes'
import { usePageTransition } from '@/composables/usePageTransition'
import { useApi } from '@/composables/useApi'
import { useSeo } from '@/composables/useSeo'
import PageRenderer from './PageRenderer.vue'
import type { CollectionEntry, SeoData } from '@/api/types'

interface Props {
  language?: string
}

const props = defineProps<Props>()

const route = useRoute()
const router = useRouter()
const api = useApi()
const { loadRoutes, resolve, isLoaded, isLoading: routesLoading, error: routesError } = useRoutes()

// Install SPA link interception + loading bar
usePageTransition()

const resolvedRoute = ref<ResolvedRoute | null>(null)
const loading = ref(true)
const notFound = ref(false)
const isFirstLoad = ref(true)
const fadeOut = ref(false)
const waitingForPage = ref(false)

const FADE_DURATION = 150 // ms

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function onPageLoaded() {
  if (!waitingForPage.value) return
  waitingForPage.value = false
  window.scrollTo({ top: 0 })
  fadeOut.value = false
}

function onPageError(err: any) {
  // If page API returned 404, show not-found page
  const status = err?.response?.status || err?.status
  if (status === 404) {
    resolvedRoute.value = null
    collectionEntry.value = null
    entrySeo.value = null
    notFound.value = true
    waitingForPage.value = false
    fadeOut.value = false
  }
}

// Collection entry state
const collectionEntry = ref<CollectionEntry | null>(null)
const entrySeo = ref<SeoData | null>(null)

// Provide route params and collection entry to child components
provide('routeParams', resolvedRoute)
provide('lcms-collection-entry', collectionEntry)

// Apply entry SEO (overrides page SEO when entry has SEO data)
const currentLanguage = computed(() => props.language || 'en')
useSeo({
  seo: entrySeo,
  language: currentLanguage
})

/**
 * Fetch collection entry when route has collection params.
 * The entry identifier is extracted from URL params — it may be named
 * 'entry_id', 'slug', or any custom name from the URL pattern.
 * We use the first param that isn't 'collectionCode' as the entry identifier.
 */
async function fetchCollectionEntry(params: Record<string, string>): Promise<boolean> {
  const { collectionCode, ...rest } = params
  // Get entry identifier from the first URL param (could be 'slug', 'entry_id', etc.)
  const entryIdentifier = rest.entry_id || rest.slug || Object.values(rest)[0]
  if (!collectionCode || !entryIdentifier) return true

  try {
    const response = await api.getCollectionEntry(collectionCode, entryIdentifier)
    collectionEntry.value = response.data || null

    // Apply entry SEO if available
    if (collectionEntry.value?.seo) {
      entrySeo.value = collectionEntry.value.seo
    }

    return true
  } catch (e: any) {
    // 404 = entry not found
    if (e?.response?.status === 404 || e?.status === 404) {
      return false
    }
    return false
  }
}

/**
 * Resolve the current path to a page
 */
async function resolvePage() {
  loading.value = true
  notFound.value = false

  // Fade out current page (skip on first load)
  if (!isFirstLoad.value && resolvedRoute.value) {
    fadeOut.value = true
    await sleep(FADE_DURATION)
  }

  const path = route.path

  // Wait for routes to be loaded
  if (!isLoaded.value) {
    await loadRoutes()
  }

  // Check for errors loading routes
  if (routesError.value) {
    console.error('Failed to load routes:', routesError.value)
    resolvedRoute.value = null
    collectionEntry.value = null
    entrySeo.value = null
    notFound.value = true
    loading.value = false
    fadeOut.value = false
    isFirstLoad.value = false
    return
  }

  // Try to resolve the path
  const resolved = resolve(path)

  if (resolved) {
    // If this is a collection route, fetch the entry before swapping
    if (resolved.params.collectionCode) {
      const found = await fetchCollectionEntry(resolved.params)
      if (!found) {
        resolvedRoute.value = null
        collectionEntry.value = null
        entrySeo.value = null
        notFound.value = true
        loading.value = false
        fadeOut.value = false
        isFirstLoad.value = false
        return
      }
    } else {
      collectionEntry.value = null
      entrySeo.value = null
    }

    const isSamePage = resolvedRoute.value?.pageCode === resolved.pageCode
    resolvedRoute.value = resolved
    loading.value = false

    if (isFirstLoad.value || isSamePage) {
      // Same page (collection entry swap) or first load — content is already there
      await nextTick()
      window.scrollTo({ top: 0 })
      fadeOut.value = false
    } else {
      // Different page — wait for PageRenderer to finish fetching
      waitingForPage.value = true
      // Safety: fade in after 3s max even if loaded event doesn't fire
      setTimeout(() => {
        if (waitingForPage.value) {
          waitingForPage.value = false
          window.scrollTo({ top: 0 })
          fadeOut.value = false
        }
      }, 3000)
    }
    isFirstLoad.value = false
    return
  }

  // Not found
  resolvedRoute.value = null
  collectionEntry.value = null
  entrySeo.value = null
  notFound.value = true
  loading.value = false
  window.scrollTo({ top: 0 })
  fadeOut.value = false
  isFirstLoad.value = false
}

// Resolve on mount and when route changes
onMounted(resolvePage)
watch(() => route.path, resolvePage)
</script>

<template>
  <div
    class="lcms-dynamic-page"
    :class="{ 'is-fading-out': fadeOut }"
  >
    <!-- Not found state -->
    <div
      v-if="notFound"
      class="lcms-dynamic-page__not-found"
    >
      <div class="lcms-dynamic-page__not-found-content">
        <h1>404</h1>
        <p>Page not found</p>
        <button
          class="lcms-dynamic-page__back-btn"
          @click="router.push('/')"
        >
          Go to Home
        </button>
      </div>
    </div>

    <!-- Render page -->
    <PageRenderer
      v-else-if="resolvedRoute"
      :code="resolvedRoute.pageCode"
      :language="language"
      :route-params="resolvedRoute.params"
      @loaded="onPageLoaded"
      @error="onPageError"
    />
  </div>
</template>

<style scoped>
.lcms-dynamic-page {
  transition: opacity 150ms ease;
}

.lcms-dynamic-page.is-fading-out {
  opacity: 0;
}

.lcms-dynamic-page__not-found {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

.lcms-dynamic-page__not-found-content {
  text-align: center;
}

.lcms-dynamic-page__not-found-content h1 {
  font-size: 72px;
  font-weight: 700;
  color: #dee2e6;
  margin: 0;
}

.lcms-dynamic-page__not-found-content p {
  font-size: 18px;
  color: #6c757d;
  margin: 16px 0;
}

.lcms-dynamic-page__back-btn {
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 500;
  color: #fff;
  background: var(--lcms-color-primary, #50a5f1);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: filter 0.2s;
}

.lcms-dynamic-page__back-btn:hover {
  filter: brightness(0.9);
}
</style>
