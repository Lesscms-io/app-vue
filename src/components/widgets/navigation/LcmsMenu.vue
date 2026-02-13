<script setup lang="ts">
/**
 * Menu Widget
 *
 * Renders a navigation menu fetched from the API.
 * Supports a hamburger toggle for mobile/tablet breakpoints.
 */

import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useMenu } from '@/composables/useMenu'
import { useLanguage } from '@/composables/useLanguage'
import { useResponsiveSettings } from '@/composables/useResponsiveSettings'
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
const { currentBreakpoint } = useResponsiveSettings()

const menuCode = computed(() => props.data.menu_code || '')
const layout = computed(() => props.data.layout || 'horizontal')
const hamburgerBreakpoint = computed(() => props.data.hamburger_breakpoint || 'never')
const itemsAlignment = computed(() => props.data.items_alignment || 'left')
const itemsGap = computed(() => props.data.items_gap || 'md')
const linkColor = computed(() => props.data.link_color || null)
const linkHoverColor = computed(() => props.data.link_hover_color || null)
const linkHoverBg = computed(() => props.data.link_hover_bg || null)
const ctaText = computed(() => props.data.cta_text || '')
const ctaUrl = computed(() => props.data.cta_url || '#')
const ctaStyle = computed(() => props.data.cta_style || 'primary')

function resolveColorValue(val: string | null): string | null {
  if (!val) return null
  if (val.startsWith('var:')) {
    const code = val.replace('var:', '')
    return `var(--lcms-color-${code})`
  }
  return val
}

const menuCssVars = computed(() => {
  const vars: Record<string, string> = {}
  const lc = resolveColorValue(linkColor.value)
  const lhc = resolveColorValue(linkHoverColor.value)
  const lhb = resolveColorValue(linkHoverBg.value)
  if (lc) vars['--lcms-menu-link-color'] = lc
  if (lhc) vars['--lcms-menu-link-hover-color'] = lhc
  if (lhb) vars['--lcms-menu-link-hover-bg'] = lhb
  return vars
})

const { items, loading, error } = useMenu(menuCode)

const hamburgerOpen = ref(false)

/**
 * Determine whether the hamburger mode is active based on
 * the configured breakpoint and the current viewport size.
 *
 * - 'never'  : hamburger is never shown
 * - 'mobile' : hamburger shows on mobile only (<=767px)
 * - 'tablet' : hamburger shows on tablet and mobile (<=1199px)
 */
const isHamburgerMode = computed(() => {
  if (hamburgerBreakpoint.value === 'never') return false
  if (hamburgerBreakpoint.value === 'mobile') return currentBreakpoint.value === 'mobile'
  if (hamburgerBreakpoint.value === 'tablet') return currentBreakpoint.value === 'mobile' || currentBreakpoint.value === 'tablet'
  return false
})

function toggleHamburger() {
  hamburgerOpen.value = !hamburgerOpen.value
}

function closeHamburger() {
  hamburgerOpen.value = false
}

function handleLinkClick() {
  if (isHamburgerMode.value) {
    closeHamburger()
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && hamburgerOpen.value) {
    closeHamburger()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})

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
    :class="[
      `lcms-menu--${layout}`,
      `lcms-menu--align-${itemsAlignment}`,
      `lcms-menu--gap-${itemsGap}`,
      { 'lcms-menu--hamburger': isHamburgerMode, 'lcms-menu--open': hamburgerOpen && isHamburgerMode }
    ]"
    :style="menuCssVars"
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

    <template v-else>
      <!-- Hamburger toggle button -->
      <button
        v-if="isHamburgerMode"
        class="lcms-menu__hamburger"
        :class="{ 'lcms-menu__hamburger--active': hamburgerOpen }"
        type="button"
        aria-label="Toggle menu"
        :aria-expanded="hamburgerOpen"
        @click="toggleHamburger"
      >
        <span class="lcms-menu__hamburger-bar" />
        <span class="lcms-menu__hamburger-bar" />
        <span class="lcms-menu__hamburger-bar" />
      </button>

      <!-- Menu list -->
      <div
        class="lcms-menu__panel"
        :class="{ 'lcms-menu__panel--open': hamburgerOpen || !isHamburgerMode }"
      >
        <ul class="lcms-menu__list">
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
              @click="handleLinkClick"
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
                  @click="handleLinkClick"
                >
                  {{ getItemLabel(child) }}
                </a>
              </li>
            </ul>
          </li>
        </ul>

        <!-- CTA Button -->
        <a
          v-if="ctaText"
          :href="ctaUrl"
          class="lcms-menu__cta"
          :class="`lcms-menu__cta--${ctaStyle}`"
          @click="handleLinkClick"
        >
          {{ ctaText }}
        </a>
      </div>
    </template>
  </nav>
</template>

<style scoped>
/* ===========================
   Hamburger button
   =========================== */
.lcms-menu__hamburger {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 5px;
  width: 40px;
  height: 40px;
  padding: 6px;
  background: none;
  border: none;
  cursor: pointer;
}

.lcms-menu__hamburger-bar {
  display: block;
  width: 24px;
  height: 2px;
  background-color: currentColor;
  border-radius: 1px;
  transition: transform 0.3s ease, opacity 0.3s ease;
}

/* Animate bars into an X when active */
.lcms-menu__hamburger--active .lcms-menu__hamburger-bar:nth-child(1) {
  transform: translateY(7px) rotate(45deg);
}

.lcms-menu__hamburger--active .lcms-menu__hamburger-bar:nth-child(2) {
  opacity: 0;
}

.lcms-menu__hamburger--active .lcms-menu__hamburger-bar:nth-child(3) {
  transform: translateY(-7px) rotate(-45deg);
}

/* ===========================
   Slide-down panel
   =========================== */
.lcms-menu__panel {
  overflow: hidden;
  max-height: 0;
  opacity: 0;
  transition: max-height 0.35s ease, opacity 0.25s ease;
}

.lcms-menu__panel--open {
  max-height: 2000px;
  opacity: 1;
}

/* When NOT in hamburger mode, panel is always visible without transition */
.lcms-menu:not(.lcms-menu--hamburger) .lcms-menu__panel {
  max-height: none;
  opacity: 1;
  overflow: visible;
  transition: none;
}

/* In hamburger mode, force vertical layout for the list */
.lcms-menu--hamburger .lcms-menu__list {
  flex-direction: column;
}

/* ===========================
   CTA Button
   =========================== */
.lcms-menu__cta {
  display: inline-flex;
  align-items: center;
  padding: 8px 20px;
  font-size: inherit;
  font-weight: 500;
  text-decoration: none;
  border-radius: 4px;
  transition: opacity 0.15s;
  white-space: nowrap;
  margin-left: 8px;
}

.lcms-menu__cta:hover {
  opacity: 0.85;
}

.lcms-menu__cta--primary {
  background-color: var(--lcms-primary, #3B82F6);
  color: #fff;
  border: 1px solid var(--lcms-primary, #3B82F6);
}

.lcms-menu__cta--secondary {
  background-color: var(--lcms-secondary, #64748B);
  color: #fff;
  border: 1px solid var(--lcms-secondary, #64748B);
}

.lcms-menu__cta--outline {
  background-color: transparent;
  color: var(--lcms-primary, #3B82F6);
  border: 1px solid var(--lcms-primary, #3B82F6);
}

.lcms-menu--vertical .lcms-menu__cta {
  margin-left: 0;
  margin-top: 8px;
  align-self: flex-start;
}

.lcms-menu--hamburger .lcms-menu__cta {
  margin-left: 0;
  margin-top: 8px;
}
</style>
