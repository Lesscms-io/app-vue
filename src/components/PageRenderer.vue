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
  autoSeo?: boolean
  titleTemplate?: string
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
const pageReady = ref(false)

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
    pageReady.value = true
  }
})

watch(error, (newError) => {
  if (newError) {
    emit('error', newError)
  }
})

// Reset when page code changes (navigation)
watch(pageCode, () => {
  pageReady.value = false
})
</script>

<template>
  <div
    class="lcms-page"
    :data-page-code="code"
  >
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
