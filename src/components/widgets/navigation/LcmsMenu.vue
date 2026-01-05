<script setup lang="ts">
/**
 * Menu Widget
 *
 * Renders a navigation menu fetched from the API.
 */

import { computed } from 'vue'
import { useMenu } from '@/composables/useMenu'
import { useLanguage } from '@/composables/useLanguage'
import type { MenuWidgetData } from '@/types/widgets'
import type { MenuItem } from '@/api/types'

defineOptions({
  inheritAttrs: false
})

interface Props {
  data: MenuWidgetData
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const { extractValue } = useLanguage(props.language)

const menuCode = computed(() => props.data.menu_code || '')
const layout = computed(() => props.data.layout || 'horizontal')

const { items, loading, error } = useMenu(menuCode)

function getItemLabel(item: MenuItem): string {
  return extractValue(item.label) as string
}

function getItemUrl(item: MenuItem): string {
  return item.metadata?.url || '#'
}

function getItemTarget(item: MenuItem): string | undefined {
  return item.metadata?.target
}
</script>

<template>
  <nav
    class="lcms-menu"
    :class="`lcms-menu--${layout}`"
  >
    <div
      v-if="loading"
      class="lcms-menu__loading"
    >
      <i class="fa-solid fa-spinner fa-spin" />
    </div>

    <div
      v-else-if="error"
      class="lcms-menu__error"
    >
      Failed to load menu
    </div>

    <ul
      v-else
      class="lcms-menu__list"
    >
      <li
        v-for="item in items"
        :key="item.id"
        class="lcms-menu__item"
        :class="{ 'lcms-menu__item--has-children': item.children && item.children.length > 0 }"
      >
        <a
          :href="getItemUrl(item)"
          class="lcms-menu__link"
          :target="getItemTarget(item)"
        >
          {{ getItemLabel(item) }}
        </a>

        <!-- Nested menu -->
        <ul
          v-if="item.children && item.children.length > 0"
          class="lcms-menu__submenu"
        >
          <li
            v-for="child in item.children"
            :key="child.id"
            class="lcms-menu__subitem"
          >
            <a
              :href="getItemUrl(child)"
              class="lcms-menu__sublink"
              :target="getItemTarget(child)"
            >
              {{ getItemLabel(child) }}
            </a>
          </li>
        </ul>
      </li>
    </ul>
  </nav>
</template>
