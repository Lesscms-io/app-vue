<script setup lang="ts">
/**
 * Page Renderer
 *
 * Fetches and renders a complete page from the API.
 * Automatically sets SEO meta tags when page loads.
 */

import { computed, watch, ref, nextTick } from 'vue'
import { usePage } from '@/composables/usePage'
import { useSeo } from '@/composables/useSeo'
import SectionRenderer from './SectionRenderer.vue'

interface Props {
  code: string
  language?: string
  routeParams?: Record<string, string>
  /**
   * Enable automatic SEO meta tag management
   * @default true
   */
  autoSeo?: boolean
  /**
   * Title template for SEO (use %s for title placeholder)
   * Example: "%s | My Site"
   */
  titleTemplate?: string
  /**
   * Default title to use if SEO title is not set
   */
  defaultTitle?: string
}

const props = withDefaults(defineProps<Props>(), {
  autoSeo: true
})

const emit = defineEmits<{
  (e: 'loaded', page: any): void
  (e: 'error', error: Error): void
}>()

const pageCode = computed(() => props.code)
const currentLanguage = computed(() => props.language || 'en')
const contentVisible = ref(false)

const { page, sections, seo, loading, error } = usePage(pageCode)

// Auto SEO management
if (props.autoSeo) {
  useSeo({
    seo,
    language: currentLanguage,
    titleTemplate: props.titleTemplate,
    defaultTitle: props.defaultTitle
  })
}

// Emit events when page loads or errors
watch(page, async (newPage) => {
  if (newPage) {
    emit('loaded', newPage)
    await nextTick()
    // Small delay to ensure DOM is ready before fade-in
    requestAnimationFrame(() => {
      contentVisible.value = true
    })
  }
})

watch(error, (newError) => {
  if (newError) {
    emit('error', newError)
  }
})

// Reset visibility when page code changes
watch(pageCode, () => {
  contentVisible.value = false
})
</script>

<template>
  <div
    class="lcms-page"
    :data-page-code="code"
  >
    <!-- Top loading bar -->
    <div
      v-if="loading"
      class="lcms-loading-bar"
    />

    <div
      v-if="error && !loading"
      class="lcms-page__error"
    >
      <i class="fa-solid fa-exclamation-triangle" />
      <span>Failed to load page</span>
    </div>

    <div
      v-else-if="!page && !loading"
      class="lcms-page__not-found"
    >
      <i class="fa-solid fa-file-circle-question" />
      <span>Page not found</span>
    </div>

    <div
      v-else-if="page"
      class="lcms-page__content"
      :class="{ 'lcms-page__content--visible': contentVisible }"
    >
      <SectionRenderer
        v-for="section in sections"
        :key="section.id || section.uuid"
        :section="section"
        :language="language"
      />
    </div>
  </div>
</template>

<style scoped>
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

.lcms-page__content {
  opacity: 0;
  transition: opacity 0.4s ease-out;
}

.lcms-page__content--visible {
  opacity: 1;
}
</style>
