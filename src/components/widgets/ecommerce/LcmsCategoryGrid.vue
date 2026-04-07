<script setup lang="ts">
/**
 * Category Grid Widget (E-commerce)
 *
 * Displays top-level product categories from LessCommerce.
 */

import { computed, ref, onMounted, watch, inject, type Ref } from 'vue'
import { useLanguage } from '../../../composables/useLanguage'
import { useStorefront } from '../../../composables/useStorefront'
import type { StorefrontCategory } from '../../../api/storefront'

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

const columns = computed(() => Number(config.value.columns) || 3)
const columnsMobile = computed(() => Number(config.value.columns_mobile) || 1)
const showDescription = computed(() => config.value.show_description === true)

const categories = ref<StorefrontCategory[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)

const categoryUrl = (slug: string | null) => {
  if (!slug) return '#'
  const route = projectConfig?.value?.commerce?.routes?.category || '/kategoria/:slug'
  return route.replace(':slug', slug)
}

const gridStyle = computed(() => ({
  '--lcms-cat-cols-desktop': columns.value,
  '--lcms-cat-cols-mobile': columnsMobile.value,
} as any))

async function fetchCategories() {
  if (!client.value) return

  isLoading.value = true
  error.value = null

  try {
    const response = await client.value.getCategories()
    categories.value = response.data || []
  } catch (err: any) {
    error.value = err.message || (props.language === 'en' ? 'Failed to load categories' : 'Nie udało się załadować kategorii')
    categories.value = []
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  if (isAvailable.value) {
    fetchCategories()
  }
})

watch(isAvailable, (avail) => {
  if (avail) fetchCategories()
})

const t = (key: string) => {
  const dict: Record<string, string> = props.language === 'en'
    ? { empty: 'No categories' }
    : { empty: 'Brak kategorii' }
  return dict[key] || ''
}
</script>

<template>
  <div class="lcms-category-grid">
    <h3 v-if="headingText" class="lcms-category-grid__heading">{{ headingText }}</h3>

    <div v-if="isLoading" class="lcms-category-grid__loading" :style="gridStyle">
      <div v-for="i in columns" :key="i" class="lcms-category-card lcms-category-card--skeleton" />
    </div>

    <div v-else-if="error" class="lcms-category-grid__error">{{ error }}</div>

    <div v-else-if="categories.length === 0" class="lcms-category-grid__empty">
      {{ t('empty') }}
    </div>

    <div v-else class="lcms-category-grid__grid" :style="gridStyle">
      <a
        v-for="category in categories"
        :key="category.uuid"
        :href="categoryUrl(category.slug)"
        class="lcms-category-card"
      >
        <div class="lcms-category-card__image-wrap">
          <img
            v-if="category.image"
            :src="category.image"
            :alt="category.name"
            class="lcms-category-card__image"
            loading="lazy"
          />
          <div v-else class="lcms-category-card__placeholder">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M3 7h18M3 12h18M3 17h18" />
            </svg>
          </div>
          <div class="lcms-category-card__overlay">
            <h4 class="lcms-category-card__name">{{ category.name }}</h4>
            <p v-if="showDescription && category.description" class="lcms-category-card__description">
              {{ category.description }}
            </p>
          </div>
        </div>
      </a>
    </div>
  </div>
</template>

<style scoped>
.lcms-category-grid {
  font-family: var(--lcms-font-body, system-ui, sans-serif);
  color: var(--lcms-color-text, #1f2937);
}

.lcms-category-grid__heading {
  font-family: var(--lcms-font-heading, var(--lcms-font-body));
  font-size: var(--lcms-h2-font-size, 1.875rem);
  font-weight: var(--lcms-h2-font-weight, 700);
  color: var(--lcms-h2-color, var(--lcms-color-text));
  margin: 0 0 var(--lcms-section-gap, 1.5rem);
}

.lcms-category-grid__grid,
.lcms-category-grid__loading {
  display: grid;
  grid-template-columns: repeat(var(--lcms-cat-cols-desktop, 3), 1fr);
  gap: var(--lcms-section-gap, 1.5rem);
}

@media (max-width: 768px) {
  .lcms-category-grid__grid,
  .lcms-category-grid__loading {
    grid-template-columns: repeat(var(--lcms-cat-cols-mobile, 1), 1fr);
  }
}

.lcms-category-grid__empty,
.lcms-category-grid__error {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--lcms-color-muted, #6b7280);
}

.lcms-category-grid__error {
  color: var(--lcms-color-danger, #ef4444);
}

.lcms-category-card {
  display: block;
  text-decoration: none;
  color: inherit;
  border-radius: var(--lcms-border-radius, 0.5rem);
  overflow: hidden;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.lcms-category-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
}

.lcms-category-card--skeleton {
  aspect-ratio: 4 / 3;
  background: linear-gradient(90deg, #f3f4f6 0%, #e5e7eb 50%, #f3f4f6 100%);
  background-size: 200% 100%;
  animation: lcms-skel 1.5s ease-in-out infinite;
}

.lcms-category-card__image-wrap {
  position: relative;
  aspect-ratio: 4 / 3;
  background: var(--lcms-color-background-alt, #f3f4f6);
  overflow: hidden;
}

.lcms-category-card__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}

.lcms-category-card:hover .lcms-category-card__image {
  transform: scale(1.05);
}

.lcms-category-card__placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--lcms-color-muted, #d1d5db);
}

.lcms-category-card__placeholder svg {
  width: 64px;
  height: 64px;
}

.lcms-category-card__overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 1.5rem;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0.2) 60%, transparent 100%);
  color: #fff;
}

.lcms-category-card__name {
  font-family: var(--lcms-font-heading, var(--lcms-font-body));
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  line-height: 1.2;
}

.lcms-category-card__description {
  font-size: 0.875rem;
  margin: 0.5rem 0 0;
  opacity: 0.9;
  line-height: 1.4;
}

@keyframes lcms-skel {
  0%, 100% { background-position: 200% 0; }
  50% { background-position: -200% 0; }
}
</style>
