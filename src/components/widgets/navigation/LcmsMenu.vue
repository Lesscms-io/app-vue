<script setup lang="ts">
/**
 * Menu Widget
 *
 * Renders a navigation menu fetched from the API.
 * Supports a hamburger toggle for mobile/tablet breakpoints.
 */

import { computed, ref, inject, onMounted, onUnmounted } from 'vue'
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

const resolvePageUrl = inject<(code: string | null, uuid: string | null) => string>(
  'lesscms-resolve-page-url',
  () => '#'
)

const menuCode = computed(() => props.data.menu_code || '')
const labelField = computed(() => props.data.label_field || '')
const layout = computed(() => props.data.layout || 'horizontal')
const hamburgerBreakpoint = computed(() => props.data.hamburger_breakpoint || 'never')
const itemsAlignment = computed(() => props.data.items_alignment || 'left')
const itemsGap = computed(() => {
  const v = props.data.items_gap
  if (v === 'sm') return 4
  if (v === 'md' || v === undefined || v === null) return 12
  if (v === 'lg') return 24
  return Number(v) || 12
})
const itemsIndent = computed(() => props.data.items_indent || 0)
const linkColor = computed(() => props.data.link_color || null)
const linkHoverColor = computed(() => props.data.link_hover_color || null)
const linkHoverBg = computed(() => props.data.link_hover_bg || null)
const linkHoverAnimation = computed(() => props.data.link_hover_animation || 'none')
const linkHoverAnimationColor = computed(() => props.data.link_hover_animation_color || null)
const itemsPadding = computed(() => {
  const v = props.data.items_padding
  if (v === null || v === undefined) return null
  if (typeof v === 'number') return `${v}px`
  return v
})
const ctaText = computed(() => props.data.cta_text || '')
const ctaUrl = computed(() => props.data.cta_url || '#')
const ctaStyle = computed(() => props.data.cta_style || 'primary')
const ctaTargetBlank = computed(() => props.data.cta_target_blank || false)

// Logo settings
const logoLight = computed(() => props.data.logo_light || '')
const logoDark = computed(() => props.data.logo_dark || '')
const logoHeight = computed(() => props.data.logo_height || 40)
const logoPosition = computed(() => props.data.logo_position || 'left')

// CTA link settings
const ctaLinkType = computed(() => props.data.cta_link_type || 'url')
const ctaPageId = computed(() => props.data.cta_page_id || null)
const ctaCollectionCode = computed(() => props.data.cta_collection_code || null)
const ctaEntryId = computed(() => props.data.cta_entry_id || null)
const ctaRouteUuid = computed(() => props.data.cta_route_uuid || null)
const ctaSize = computed(() => props.data.cta_size || 'md')
const ctaPosition = computed(() => props.data.cta_position || 'right')
const ctaBorderRadius = computed(() => props.data.cta_border_radius || null)
const ctaPadding = computed(() => props.data.cta_padding || null)
const ctaIcon = computed(() => props.data.cta_icon || '')
const ctaIconPosition = computed(() => props.data.cta_icon_position || 'left')
const isCtaSvgIcon = computed(() => ctaIcon.value.startsWith('svg:'))
const ctaSvgContent = computed(() => isCtaSvgIcon.value ? ctaIcon.value.slice(4) : '')

// Dropdown settings
const dropdownBg = computed(() => props.data.dropdown_bg || null)
const dropdownBorderRadius = computed(() => props.data.dropdown_border_radius || 'md')
const dropdownShadow = computed(() => props.data.dropdown_shadow || 'lg')

const resolveCollectionUrl = inject<(collectionCode: string, slug: string) => string>(
  'lesscms-resolve-collection-url',
  () => '#'
)

// Resolve CTA URL based on link type (prefer server-resolved URL)
const resolvedCtaUrl = computed(() => {
  const linkType = ctaLinkType.value
  const serverUrl = ctaUrl.value

  if (linkType === 'page') {
    if (serverUrl && serverUrl !== '#') return serverUrl
    if (ctaPageId.value) {
      const clientResolved = resolvePageUrl(null, ctaPageId.value)
      if (clientResolved && clientResolved !== '#') return clientResolved
    }
    return serverUrl
  }

  if (linkType === 'route' && ctaRouteUuid.value) {
    return resolvePageUrl(null, ctaRouteUuid.value)
  }

  if (linkType === 'entry') {
    if (serverUrl && serverUrl !== '#') return serverUrl
    if (ctaCollectionCode.value && ctaEntryId.value) {
      const clientResolved = resolveCollectionUrl(ctaCollectionCode.value, ctaEntryId.value)
      if (clientResolved && clientResolved !== '#') return clientResolved
    }
    return serverUrl
  }

  // For 'url' or fallback, use raw URL
  return serverUrl
})

const ctaInlineStyle = computed(() => {
  const style: Record<string, string> = {}
  if (ctaBorderRadius.value === 'pill') {
    style.borderRadius = '50px'
  } else if (ctaBorderRadius.value === 'lg') {
    style.borderRadius = '12px'
  } else if (ctaBorderRadius.value === 'sm') {
    style.borderRadius = '2px'
  }
  if (ctaPadding.value) {
    style.padding = ctaPadding.value
  }
  return style
})

const hasLogo = computed(() => !!(logoLight.value || logoDark.value))

function hexToRgba(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${opacity / 100})`
}

function resolveColorValue(val: string | null): string | null {
  if (!val) return null
  if (val.startsWith('var:')) {
    const parts = val.split(':')
    const code = parts[1]
    const opacity = parts.length >= 3 ? parseInt(parts[2]) : 100
    if (opacity < 100) {
      // Can't apply opacity to CSS variable directly, use color-mix
      return `color-mix(in srgb, var(--lcms-color-${code}) ${opacity}%, transparent)`
    }
    return `var(--lcms-color-${code})`
  }
  // Handle #hex:opacity format
  if (val.startsWith('#') && val.includes(':')) {
    const parts = val.split(':')
    const hex = parts[0]
    const opacity = parseInt(parts[1]) || 100
    if (opacity < 100) return hexToRgba(hex, opacity)
    return hex
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
  vars['--lcms-menu-items-gap'] = `${itemsGap.value}px`
  if (itemsIndent.value) vars['--lcms-menu-items-indent'] = `${itemsIndent.value}px`
  const lac = resolveColorValue(linkHoverAnimationColor.value)
  if (lac) vars['--lcms-menu-link-hover-anim-color'] = lac
  else if (lhc) vars['--lcms-menu-link-hover-anim-color'] = lhc
  if (itemsPadding.value) vars['--lcms-menu-items-padding'] = itemsPadding.value

  // Dropdown styling
  const dbg = resolveColorValue(dropdownBg.value)
  if (dbg) vars['--lcms-menu-dropdown-bg'] = dbg

  const radiusMap: Record<string, string> = { none: '0', sm: '4px', md: '8px', lg: '12px' }
  vars['--lcms-menu-dropdown-radius'] = radiusMap[dropdownBorderRadius.value] || '8px'

  const shadowMap: Record<string, string> = {
    none: 'none',
    sm: '0 1px 3px rgba(0,0,0,0.12)',
    md: '0 4px 6px rgba(0,0,0,0.1)',
    lg: '0 10px 25px rgba(0,0,0,0.15)'
  }
  vars['--lcms-menu-dropdown-shadow'] = shadowMap[dropdownShadow.value] || shadowMap.lg

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
  // If a specific label field is configured, use it from item fields
  if (labelField.value && item.fields) {
    const val = item.fields[labelField.value]
    if (val) {
      const resolved = extractValue(val)
      if (resolved) return resolved as string
    }
  }
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
      linkHoverAnimation !== 'none' ? `lcms-menu--anim-${linkHoverAnimation}` : '',
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
      <!-- Logo (before hamburger in markup for left position) -->
      <a
        v-if="hasLogo && logoPosition === 'left'"
        href="/"
        class="lcms-menu__logo lcms-menu__logo--left"
      >
        <img
          :src="logoLight || logoDark"
          :style="{ height: `${logoHeight}px` }"
          alt="Logo"
          class="lcms-menu__logo-img"
        >
      </a>

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
        <!-- Logo (center position) -->
        <a
          v-if="hasLogo && logoPosition === 'center'"
          href="/"
          class="lcms-menu__logo lcms-menu__logo--center"
        >
          <img
            :src="logoLight || logoDark"
            :style="{ height: `${logoHeight}px` }"
            alt="Logo"
            class="lcms-menu__logo-img"
          >
        </a>

        <!-- CTA Button (left position) -->
        <a
          v-if="ctaText && ctaPosition === 'left'"
          :href="resolvedCtaUrl"
          class="lcms-menu__cta lcms-menu__cta--left"
          :class="[
            `lcms-menu__cta--${ctaStyle}`,
            `lcms-menu__cta--size-${ctaSize}`
          ]"
          :style="ctaInlineStyle"
          :target="ctaTargetBlank ? '_blank' : undefined"
          :rel="ctaTargetBlank ? 'noopener noreferrer' : undefined"
          @click="handleLinkClick"
        >
          <span v-if="isCtaSvgIcon && ctaIconPosition === 'left'" class="lcms-menu__cta-icon lcms-menu__cta-icon--left lcms-menu__cta-svg" v-html="ctaSvgContent" />
          <i v-else-if="ctaIcon && ctaIconPosition === 'left'" :class="ctaIcon" class="lcms-menu__cta-icon lcms-menu__cta-icon--left" />
          {{ ctaText }}
          <span v-if="isCtaSvgIcon && ctaIconPosition === 'right'" class="lcms-menu__cta-icon lcms-menu__cta-icon--right lcms-menu__cta-svg" v-html="ctaSvgContent" />
          <i v-else-if="ctaIcon && ctaIconPosition === 'right'" :class="ctaIcon" class="lcms-menu__cta-icon lcms-menu__cta-icon--right" />
        </a>

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
              :style="itemsPadding ? { padding: itemsPadding } : undefined"
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

        <!-- CTA Button (right position, default) -->
        <a
          v-if="ctaText && ctaPosition !== 'left'"
          :href="resolvedCtaUrl"
          class="lcms-menu__cta"
          :class="[
            `lcms-menu__cta--${ctaStyle}`,
            `lcms-menu__cta--size-${ctaSize}`
          ]"
          :style="ctaInlineStyle"
          :target="ctaTargetBlank ? '_blank' : undefined"
          :rel="ctaTargetBlank ? 'noopener noreferrer' : undefined"
          @click="handleLinkClick"
        >
          <span v-if="isCtaSvgIcon && ctaIconPosition === 'left'" class="lcms-menu__cta-icon lcms-menu__cta-icon--left lcms-menu__cta-svg" v-html="ctaSvgContent" />
          <i v-else-if="ctaIcon && ctaIconPosition === 'left'" :class="ctaIcon" class="lcms-menu__cta-icon lcms-menu__cta-icon--left" />
          {{ ctaText }}
          <span v-if="isCtaSvgIcon && ctaIconPosition === 'right'" class="lcms-menu__cta-icon lcms-menu__cta-icon--right lcms-menu__cta-svg" v-html="ctaSvgContent" />
          <i v-else-if="ctaIcon && ctaIconPosition === 'right'" :class="ctaIcon" class="lcms-menu__cta-icon lcms-menu__cta-icon--right" />
        </a>
      </div>

      <!-- Logo (right position) -->
      <a
        v-if="hasLogo && logoPosition === 'right'"
        href="/"
        class="lcms-menu__logo lcms-menu__logo--right"
      >
        <img
          :src="logoLight || logoDark"
          :style="{ height: `${logoHeight}px` }"
          alt="Logo"
          class="lcms-menu__logo-img"
        >
      </a>
    </template>
  </nav>
</template>

<style scoped>
/* ===========================
   Base nav layout
   =========================== */
.lcms-menu {
  display: flex;
  align-items: center;
  width: 100%;
  gap: var(--lcms-menu-items-gap, 12px);
}

.lcms-menu--vertical:not(.lcms-menu--hamburger) {
  flex-direction: column;
  align-items: stretch;
}

.lcms-menu--centered:not(.lcms-menu--hamburger) {
  flex-direction: column;
  align-items: center;
}

/* ===========================
   Logo
   =========================== */
.lcms-menu__logo {
  display: flex;
  align-items: center;
  text-decoration: none;
  flex-shrink: 0;
}

.lcms-menu__logo-img {
  display: block;
  width: auto;
  object-fit: contain;
}

/* ===========================
   CTA icon
   =========================== */
.lcms-menu__cta-icon--left {
  margin-right: 6px;
}

.lcms-menu__cta-icon--right {
  margin-left: 6px;
}

.lcms-menu__cta-svg {
  display: inline-flex;
  align-items: center;
}

.lcms-menu__cta-svg :deep(svg) {
  width: 1em;
  height: 1em;
  fill: currentColor;
}

/* CTA sizes */
.lcms-menu__cta--size-sm {
  padding: 4px 12px;
  font-size: 0.85em;
}

.lcms-menu__cta--size-lg {
  padding: 12px 28px;
  font-size: 1.1em;
}

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
  display: flex;
  align-items: center;
  gap: var(--lcms-menu-items-gap, 12px);
  flex: 1;
  min-width: 0;
}

/* Menu list */
.lcms-menu__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  gap: var(--lcms-menu-items-gap, 12px);
  flex: 1;
  flex-wrap: wrap;
}

/* Items alignment — higher specificity to override layout defaults */
.lcms-menu.lcms-menu--align-left .lcms-menu__list {
  justify-content: flex-start;
}

.lcms-menu.lcms-menu--align-center .lcms-menu__list {
  justify-content: center;
}

.lcms-menu.lcms-menu--align-right .lcms-menu__list {
  justify-content: flex-end;
}

/* Vertical layout */
.lcms-menu--vertical .lcms-menu__list {
  flex-direction: column;
  flex-wrap: nowrap;
}

.lcms-menu--vertical:not(.lcms-menu--hamburger) .lcms-menu__panel {
  flex-direction: column;
  align-items: flex-start;
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

.lcms-menu__cta--left {
  margin-left: 0;
  margin-right: 8px;
}

.lcms-menu__cta:hover {
  filter: brightness(0.9);
}

.lcms-menu__cta--primary {
  background-color: var(--lcms-color-primary, #3B82F6);
  color: #fff;
  border: 1px solid var(--lcms-color-primary, #3B82F6);
}

.lcms-menu__cta--secondary {
  background-color: var(--lcms-color-secondary, #64748B);
  color: #fff;
  border: 1px solid var(--lcms-color-secondary, #64748B);
}

.lcms-menu__cta--success {
  background-color: var(--lcms-color-success, #28a745);
  color: #fff;
  border: 1px solid var(--lcms-color-success, #28a745);
}

.lcms-menu__cta--danger {
  background-color: var(--lcms-color-danger, #dc3545);
  color: #fff;
  border: 1px solid var(--lcms-color-danger, #dc3545);
}

.lcms-menu__cta--warning {
  background-color: var(--lcms-color-warning, #ffc107);
  color: #212529;
  border: 1px solid var(--lcms-color-warning, #ffc107);
}

.lcms-menu__cta--info {
  background-color: var(--lcms-color-info, #17a2b8);
  color: #fff;
  border: 1px solid var(--lcms-color-info, #17a2b8);
}

.lcms-menu__cta--light {
  background-color: var(--lcms-color-light, #f8f9fa);
  color: #212529;
  border: 1px solid var(--lcms-color-light, #f8f9fa);
}

.lcms-menu__cta--dark {
  background-color: var(--lcms-color-dark, #343a40);
  color: #fff;
  border: 1px solid var(--lcms-color-dark, #343a40);
}

.lcms-menu__cta--outline,
.lcms-menu__cta--outline-primary {
  background-color: transparent;
  color: var(--lcms-color-primary, #3B82F6);
  border: 1px solid var(--lcms-color-primary, #3B82F6);
}

.lcms-menu__cta--outline-secondary {
  background-color: transparent;
  color: var(--lcms-color-secondary, #64748B);
  border: 1px solid var(--lcms-color-secondary, #64748B);
}

.lcms-menu__cta--outline-success {
  background-color: transparent;
  color: var(--lcms-color-success, #28a745);
  border: 1px solid var(--lcms-color-success, #28a745);
}

.lcms-menu__cta--outline-danger {
  background-color: transparent;
  color: var(--lcms-color-danger, #dc3545);
  border: 1px solid var(--lcms-color-danger, #dc3545);
}

.lcms-menu__cta--outline-warning {
  background-color: transparent;
  color: var(--lcms-color-warning, #ffc107);
  border: 1px solid var(--lcms-color-warning, #ffc107);
}

.lcms-menu__cta--outline-info {
  background-color: transparent;
  color: var(--lcms-color-info, #17a2b8);
  border: 1px solid var(--lcms-color-info, #17a2b8);
}

.lcms-menu__cta--outline-light {
  background-color: transparent;
  color: var(--lcms-color-light, #f8f9fa);
  border: 1px solid var(--lcms-color-light, #f8f9fa);
}

.lcms-menu__cta--outline-dark {
  background-color: transparent;
  color: var(--lcms-color-dark, #343a40);
  border: 1px solid var(--lcms-color-dark, #343a40);
}

.lcms-menu__cta--accent {
  background-color: var(--lcms-color-accent, #FF6B35);
  color: #fff;
  border: 1px solid var(--lcms-color-accent, #FF6B35);
}

.lcms-menu__cta--outline-accent {
  background-color: transparent;
  color: var(--lcms-color-accent, #FF6B35);
  border: 1px solid var(--lcms-color-accent, #FF6B35);
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

/* ===========================
   Hover animations
   =========================== */

/* Shared: links need position relative for pseudo-elements */
.lcms-menu--anim-underline .lcms-menu__link,
.lcms-menu--anim-overline .lcms-menu__link,
.lcms-menu--anim-bracket .lcms-menu__link {
  position: relative;
}

/* --- Underline animation --- */
.lcms-menu--anim-underline .lcms-menu__link::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: -4px;
  width: 0;
  height: 2px;
  background-color: var(--lcms-menu-link-hover-anim-color, var(--lcms-color-primary, currentColor));
  transition: width 0.3s ease;
}

.lcms-menu--anim-underline .lcms-menu__link:hover::after {
  width: 100%;
}

/* --- Overline animation --- */
.lcms-menu--anim-overline .lcms-menu__link::after {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  width: 0;
  height: 2px;
  background-color: var(--lcms-menu-link-hover-anim-color, var(--lcms-color-primary, currentColor));
  transition: width 0.3s ease;
}

.lcms-menu--anim-overline .lcms-menu__link:hover::after {
  width: 100%;
}

/* --- Highlight animation --- */
.lcms-menu--anim-highlight .lcms-menu__link {
  transition: background-color 0.3s ease;
}

.lcms-menu--anim-highlight .lcms-menu__link:hover {
  background-color: var(--lcms-menu-link-hover-anim-color, var(--lcms-color-primary, rgba(0, 0, 0, 0.05)));
  opacity: 0.85;
}

/* --- Scale animation --- */
.lcms-menu--anim-scale .lcms-menu__link {
  transition: transform 0.2s ease;
}

.lcms-menu--anim-scale .lcms-menu__link:hover {
  transform: scale(1.05);
}

/* --- Bracket animation --- */
.lcms-menu--anim-bracket .lcms-menu__link::before,
.lcms-menu--anim-bracket .lcms-menu__link::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  width: 0;
  border-color: var(--lcms-menu-link-hover-anim-color, var(--lcms-color-primary, currentColor));
  border-style: solid;
  transition: width 0.3s ease, border-width 0.3s ease;
  border-width: 0;
}

.lcms-menu--anim-bracket .lcms-menu__link::before {
  left: 0;
  border-left-width: 0;
  border-top-width: 0;
  border-bottom-width: 0;
}

.lcms-menu--anim-bracket .lcms-menu__link::after {
  right: 0;
  border-right-width: 0;
  border-top-width: 0;
  border-bottom-width: 0;
}

.lcms-menu--anim-bracket .lcms-menu__link:hover::before {
  width: 6px;
  border-left-width: 2px;
  border-top-width: 2px;
  border-bottom-width: 2px;
}

.lcms-menu--anim-bracket .lcms-menu__link:hover::after {
  width: 6px;
  border-right-width: 2px;
  border-top-width: 2px;
  border-bottom-width: 2px;
}
</style>
