<script setup lang="ts">
/**
 * Category Tree Widget (E-commerce)
 *
 * Expandable tree of product categories from LessCommerce — sidebar-style
 * navigation. Categories with children get a chevron toggle; the category
 * matching the current URL is highlighted and its ancestors auto-expand.
 */

import { computed, ref, onMounted, onServerPrefetch, watch, inject, type Ref } from 'vue'
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
// 'active' (default): rozwinięte tylko gałęzie aktywnej kategorii; 'all' | 'none'
const expandMode = computed(() => config.value.expand_mode || 'active')
const showAllLink = computed(() => config.value.show_all_link === true)
const allLinkUrl = computed(() => config.value.all_link_url || '/produkty')

const categories = ref<StorefrontCategory[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)
const expanded = ref<Set<string>>(new Set())

const categoryUrl = (slug: string | null) => {
  if (!slug) return '#'
  const route = projectConfig?.value?.commerce?.routes?.category || '/kategoria/:slug'
  return route.replace(':slug', slug)
}

const activeSlug = computed(() => {
  if (typeof window === 'undefined') return ''
  const route = projectConfig?.value?.commerce?.routes?.category || '/kategoria/:slug'
  const prefix = route.split(':slug')[0]
  const path = window.location.pathname
  if (!prefix || !path.startsWith(prefix)) return ''
  return decodeURIComponent(path.slice(prefix.length).split('/')[0] || '')
})

// Ścieżka uuid-ów od korzenia do kategorii o danym slugu (włącznie) — null gdy brak.
function pathTo(slug: string, nodes: StorefrontCategory[], trail: string[] = []): string[] | null {
  for (const node of nodes) {
    const next = [...trail, node.uuid]
    if (node.slug === slug) return next
    const found = pathTo(slug, node.children || [], next)
    if (found) return found
  }
  return null
}

function collectAllUuids(nodes: StorefrontCategory[], out: string[] = []): string[] {
  for (const node of nodes) {
    if (node.children?.length) {
      out.push(node.uuid)
      collectAllUuids(node.children, out)
    }
  }
  return out
}

function applyInitialExpansion() {
  if (expandMode.value === 'all') {
    expanded.value = new Set(collectAllUuids(categories.value))
    return
  }
  if (expandMode.value === 'active' && activeSlug.value) {
    expanded.value = new Set(pathTo(activeSlug.value, categories.value) || [])
    return
  }
  expanded.value = new Set()
}

function toggle(uuid: string) {
  const next = new Set(expanded.value)
  if (next.has(uuid)) {
    next.delete(uuid)
  } else {
    next.add(uuid)
  }
  expanded.value = next
}

async function fetchCategories() {
  if (!client.value) return
  isLoading.value = true
  error.value = null
  try {
    const response = await client.value.getCategories()
    categories.value = response.data || []
    applyInitialExpansion()
  } catch (err: any) {
    error.value = err.message || (props.language === 'en' ? 'Failed to load categories' : 'Nie udało się załadować kategorii')
    categories.value = []
  } finally {
    isLoading.value = false
  }
}

onServerPrefetch(async () => {
  if (isAvailable.value) {
    await fetchCategories()
  }
})

onMounted(() => {
  if (isAvailable.value && categories.value.length === 0 && !error.value) {
    fetchCategories()
  } else {
    // SSR już pobrał drzewo — stan rozwinięcia zależy od URL-a, więc licz na kliencie
    applyInitialExpansion()
  }
})

watch([isAvailable], () => {
  if (isAvailable.value) {
    fetchCategories()
  }
})

const t = (key: string) => {
  const lang = props.language || 'pl'
  const dict: Record<string, Record<string, string>> = {
    pl: { empty: 'Brak kategorii', allProducts: 'Wszystkie produkty' },
    en: { empty: 'No categories', allProducts: 'All products' },
  }
  return dict[lang]?.[key] || dict.pl[key] || key
}
</script>

<template>
  <div class="lcms-category-tree">
    <h3 v-if="headingText" class="lcms-category-tree__heading">{{ headingText }}</h3>

    <div v-if="isLoading" class="lcms-category-tree__loading">
      <div v-for="i in 5" :key="i" class="lcms-category-tree__skeleton" />
    </div>

    <div v-else-if="error" class="lcms-category-tree__error">{{ error }}</div>

    <div v-else-if="categories.length === 0" class="lcms-category-tree__empty">
      {{ t('empty') }}
    </div>

    <ul v-else class="lcms-category-tree__list">
      <li v-if="showAllLink" class="lcms-category-tree__item">
        <a
          :href="allLinkUrl"
          class="lcms-category-tree__all-btn"
        >
          {{ t('allProducts') }}
        </a>
      </li>
      <template v-for="category in categories" :key="category.uuid">
        <CategoryTreeNode
          :node="category"
          :depth="0"
          :expanded="expanded"
          :active-slug="activeSlug"
          :category-url="categoryUrl"
          :toggle="toggle"
        />
      </template>
    </ul>
  </div>
</template>

<script lang="ts">
import { defineComponent, h, type PropType } from 'vue'
import type { StorefrontCategory as TreeCategory } from '../../../api/storefront'

/**
 * Recursive tree node rendered via render function — keeps the whole widget
 * in one SFC (template recursion would need a second component file).
 */
const CategoryTreeNode = defineComponent({
  name: 'CategoryTreeNode',
  props: {
    node: { type: Object as PropType<TreeCategory>, required: true },
    depth: { type: Number, required: true },
    expanded: { type: Object as PropType<Set<string>>, required: true },
    activeSlug: { type: String, default: '' },
    categoryUrl: { type: Function as PropType<(slug: string | null) => string>, required: true },
    toggle: { type: Function as PropType<(uuid: string) => void>, required: true },
  },
  setup(props) {
    return () => {
      const hasChildren = (props.node.children || []).length > 0
      const isOpen = props.expanded.has(props.node.uuid)
      const isActive = !!props.node.slug && props.node.slug === props.activeSlug

      const row = h('div', { class: 'lcms-category-tree__row' }, [
        hasChildren
          ? h('button', {
              type: 'button',
              class: ['lcms-category-tree__chevron', { 'lcms-category-tree__chevron--open': isOpen }],
              'aria-expanded': isOpen ? 'true' : 'false',
              onClick: () => props.toggle(props.node.uuid),
            }, [
              h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }, [
                h('path', { d: 'M9 6l6 6-6 6' }),
              ]),
            ])
          : h('span', { class: 'lcms-category-tree__chevron lcms-category-tree__chevron--spacer' }),
        h('a', {
          href: props.categoryUrl(props.node.slug),
          class: ['lcms-category-tree__link', { 'lcms-category-tree__link--active': isActive }],
        }, props.node.name),
      ])

      const children = hasChildren && isOpen
        ? h('ul', { class: 'lcms-category-tree__list lcms-category-tree__list--nested' },
            (props.node.children || []).map((child) =>
              h(CategoryTreeNode, {
                key: child.uuid,
                node: child,
                depth: props.depth + 1,
                expanded: props.expanded,
                activeSlug: props.activeSlug,
                categoryUrl: props.categoryUrl,
                toggle: props.toggle,
              })
            ))
        : null

      return h('li', { class: 'lcms-category-tree__item' }, [row, children])
    }
  },
})

export default { components: { CategoryTreeNode } }
</script>

<!-- NOT scoped on purpose: tree nodes render through a render-function child
     component (CategoryTreeNode), which never receives the parent's data-v
     scope attribute — scoped selectors silently miss every node and links
     fall back to browser defaults. All classes are lcms-category-tree__*
     namespaced, so global is safe. -->
<style>
.lcms-category-tree {
  font-family: var(--lcms-font-body, system-ui, sans-serif);
  color: var(--lcms-color-text, #1f2937);
}

.lcms-category-tree__heading {
  margin: 0 0 0.75rem;
  font-family: var(--lcms-font-heading, inherit);
  font-size: 1.125rem;
  font-weight: 600;
}

.lcms-category-tree__list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.lcms-category-tree__list--nested {
  padding-left: 1.25rem;
}

.lcms-category-tree__row {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.lcms-category-tree__chevron {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
  color: var(--lcms-color-muted, #6b7280);
  border-radius: 4px;
}

.lcms-category-tree__chevron svg {
  width: 14px;
  height: 14px;
  transition: transform 0.15s ease;
}

.lcms-category-tree__chevron--open svg {
  transform: rotate(90deg);
}

.lcms-category-tree__chevron:hover {
  background: var(--lcms-color-surface, #f3f4f6);
  color: var(--lcms-color-text, #1f2937);
}

.lcms-category-tree__chevron--spacer {
  cursor: default;
  pointer-events: none;
}

.lcms-category-tree__link {
  display: block;
  padding: 0.375rem 0.5rem;
  border-radius: 6px;
  /* Project-level link settings (Ustawienia → Linki) with quiet-nav fallbacks. */
  text-decoration: var(--lcms-link-text-decoration, none);
  color: var(--lcms-color-link, inherit);
  font-size: 0.9375rem;
  flex: 1;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.lcms-category-tree__link:hover {
  background: var(--lcms-color-surface, #f3f4f6);
  color: var(--lcms-link-hover-color, var(--lcms-color-link, inherit));
  text-decoration: var(--lcms-link-hover-text-decoration, var(--lcms-link-text-decoration, none));
}

.lcms-category-tree__link--active {
  color: var(--lcms-color-primary, #3b82f6);
  font-weight: 600;
  background: var(--lcms-color-surface, #f3f4f6);
}

/* "Wszystkie produkty" — themed primary button, same conventions as the
   add-to-cart button (project button settings + primary color). */
.lcms-category-tree__all-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 0 0.75rem;
  background: var(--lcms-color-primary, #3b82f6);
  color: var(--lcms-color-white, #fff);
  padding: var(--lcms-btn-padding, 0.5rem 1rem);
  border-radius: var(--lcms-btn-border-radius, var(--lcms-border-radius, 0.375rem));
  font-size: var(--lcms-btn-font-size, 0.9375rem);
  font-weight: var(--lcms-btn-font-weight, 600);
  font-family: var(--lcms-font-button, var(--lcms-font-body));
  text-decoration: none;
  transition: opacity 0.2s;
}

.lcms-category-tree__all-btn:hover {
  opacity: 0.9;
  text-decoration: none;
}

.lcms-category-tree__empty,
.lcms-category-tree__error {
  font-size: 0.875rem;
  color: var(--lcms-color-muted, #6b7280);
  padding: 0.5rem 0;
}

.lcms-category-tree__error {
  color: #b91c1c;
}

.lcms-category-tree__skeleton {
  height: 20px;
  margin: 8px 0;
  border-radius: 4px;
  background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
  background-size: 200% 100%;
  animation: lcms-cat-tree-shimmer 1.2s infinite;
}

@keyframes lcms-cat-tree-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
