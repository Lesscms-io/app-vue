<script setup lang="ts">
/**
 * Page Renderer
 *
 * Fetches and renders a complete page from the API.
 * Automatically sets SEO meta tags when page loads.
 */

import { computed, watch, toRef } from 'vue'
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
watch(page, (newPage) => {
  if (newPage) {
    emit('loaded', newPage)
  }
})

watch(error, (newError) => {
  if (newError) {
    emit('error', newError)
  }
})
</script>

<template>
  <div
    class="lcms-page"
    :data-page-code="code"
  >
    <div
      v-if="loading"
      class="lcms-page__loading"
    >
      <i class="fa-solid fa-spinner fa-spin" />
      <span>Loading page...</span>
    </div>

    <div
      v-else-if="error"
      class="lcms-page__error"
    >
      <i class="fa-solid fa-exclamation-triangle" />
      <span>Failed to load page</span>
    </div>

    <div
      v-else-if="!page"
      class="lcms-page__not-found"
    >
      <i class="fa-solid fa-file-circle-question" />
      <span>Page not found</span>
    </div>

    <div
      v-else
      class="lcms-page__content"
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
