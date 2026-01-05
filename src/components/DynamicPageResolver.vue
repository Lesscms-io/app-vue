<script setup lang="ts">
/**
 * Dynamic Page Resolver
 *
 * Resolves dynamic routes by matching URL patterns from the routes API.
 * Supports both static pages and dynamic patterns like /blog/{slug}.
 */

import { ref, watch, onMounted, provide } from 'vue'
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

// Provide route params to child components (widgets can use these)
provide('routeParams', resolvedRoute)

/**
 * Resolve the current path to a page
 */
async function resolvePage() {
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
}

// Resolve on mount and when route changes
onMounted(resolvePage)
watch(() => route.path, resolvePage)
</script>

<template>
  <div class="lcms-dynamic-page">
    <!-- Loading state -->
    <div
      v-if="loading || routesLoading"
      class="lcms-dynamic-page__loading"
    >
      <i class="fa-solid fa-spinner fa-spin" />
      <span>Loading...</span>
    </div>

    <!-- Not found state -->
    <div
      v-else-if="notFound"
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
    />
  </div>
</template>

<style scoped>
.lcms-dynamic-page__loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  gap: 12px;
  color: #6c757d;
}

.lcms-dynamic-page__loading i {
  font-size: 24px;
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
  background: #50a5f1;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.lcms-dynamic-page__back-btn:hover {
  background: #3d8fd9;
}
</style>
