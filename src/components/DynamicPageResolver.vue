<script setup lang="ts">
/**
 * Dynamic Page Resolver
 *
 * Resolves dynamic routes by matching URL patterns from the routes API.
 * Supports both static pages and dynamic patterns like /blog/{slug}.
 */

import { ref, watch, onMounted, onBeforeUnmount, provide, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useRoutes, type ResolvedRoute } from '@/composables/useRoutes'
import PageRenderer from './PageRenderer.vue'

interface Props {
  language?: string
}

const props = defineProps<Props>()

const route = useRoute()
const router = useRouter()
const { loadRoutes, resolve, isLoaded, isLoading: routesLoading, error: routesError } = useRoutes()

const resolvedRoute = ref<ResolvedRoute | null>(null)
const loading = ref(true)
const notFound = ref(false)
const contentVisible = ref(false)

// Provide route params to child components (widgets can use these)
provide('routeParams', resolvedRoute)

/**
 * Resolve the current path to a page
 */
async function resolvePage() {
  // Scroll to top on page change
  window.scrollTo({ top: 0 })

  // Fade out current content
  contentVisible.value = false
  loading.value = true
  notFound.value = false
  resolvedRoute.value = null

  // Wait for routes to be loaded
  if (!isLoaded.value) {
    await loadRoutes()
  }

  // Check for errors loading routes
  if (routesError.value) {
    console.error('Failed to load routes:', routesError.value)
    notFound.value = true
    loading.value = false
    await nextTick()
    contentVisible.value = true
    return
  }

  const path = route.path

  // Try to resolve the path
  const resolved = resolve(path)

  if (resolved) {
    resolvedRoute.value = resolved
    loading.value = false
    return
  }

  // Not found
  notFound.value = true
  loading.value = false
  await nextTick()
  contentVisible.value = true
}

/**
 * SPA link interception — catch clicks on internal <a href> links
 * and use router.push() instead of full page reload.
 */
const containerRef = ref<HTMLElement | null>(null)

function handleLinkClick(e: MouseEvent) {
  // Don't intercept if modifier keys are pressed (open in new tab, etc.)
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return

  // Find the closest <a> element
  const anchor = (e.target as HTMLElement).closest('a')
  if (!anchor) return

  const href = anchor.getAttribute('href')
  if (!href) return

  // Skip external links, anchors, mailto, tel, javascript, etc.
  if (href.startsWith('http') || href.startsWith('//') || href.startsWith('mailto:') ||
      href.startsWith('tel:') || href.startsWith('#') || href.startsWith('javascript:')) return

  // Skip links with target="_blank"
  if (anchor.target === '_blank') return

  // Skip links with download attribute
  if (anchor.hasAttribute('download')) return

  // It's an internal link — use router instead of page reload
  e.preventDefault()
  router.push(href)
}

// Resolve on mount and when route changes
onMounted(() => {
  resolvePage()
  // Intercept link clicks on the whole document (not just container)
  // so menu links outside of .lcms-dynamic-page are also intercepted
  document.addEventListener('click', handleLinkClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleLinkClick)
})

watch(() => route.path, resolvePage)
</script>

<template>
  <div class="lcms-dynamic-page">
    <!-- Top loading bar -->
    <div
      v-if="loading || routesLoading"
      class="lcms-loading-bar"
    />

    <!-- Not found state -->
    <div
      v-if="notFound"
      class="lcms-dynamic-page__not-found"
      :class="{ 'lcms-fade-in': contentVisible }"
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
      @loaded="contentVisible = true"
    />
  </div>
</template>

<style scoped>
/* Top loading bar animation */
.lcms-loading-bar {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 3px;
  z-index: 99999;
  background: var(--lcms-color-primary, #50a5f1);
  animation: lcms-loading-bar 1.5s ease-in-out infinite;
}

@keyframes lcms-loading-bar {
  0% { transform: scaleX(0); transform-origin: left; }
  50% { transform: scaleX(1); transform-origin: left; }
  50.01% { transform-origin: right; }
  100% { transform: scaleX(0); transform-origin: right; }
}

.lcms-fade-in {
  animation: lcms-page-fade-in 0.4s ease-out forwards;
}

@keyframes lcms-page-fade-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.lcms-dynamic-page__not-found {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  opacity: 0;
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
