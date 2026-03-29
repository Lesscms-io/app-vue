<script setup lang="ts">
/**
 * Menu Widget
 *
 * Renders a navigation menu fetched from the API.
 * Supports a hamburger toggle for mobile/tablet breakpoints.
 * Uses element-group structure: link, logo, config, cta, dropdown.
 */

import { computed, ref, inject, onMounted, onUnmounted } from 'vue'
import { useMenu } from '@/composables/useMenu'
import { useLanguage } from '@/composables/useLanguage'
import { useResponsiveSettings } from '@/composables/useResponsiveSettings'
import { smallImage } from '@/composables/useImageOptimization'
import type { MenuItem } from '@/api/types'

defineOptions({
  inheritAttrs: false
})

interface Props {
  data: Record<string, any>
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

const resolveCollectionUrl = inject<(collectionCode: string, slug: string) => string>(
  'lesscms-resolve-collection-url',
  () => '#'
)

// Scrolled state from parent section (sticky section provides this)
const sectionIsScrolled = inject('sectionIsScrolled', ref(false))

// Element groups
const linkGroup = computed(() => props.data.link || {})
const logoGroup = computed(() => props.data.logo || {})
const configGroup = computed(() => props.data.config || {})
const ctaGroup = computed(() => props.data.cta || {})
const dropdownGroup = computed(() => props.data.dropdown || {})

// Config group
const menuCode = computed(() => configGroup.value.menu_code || '')
const labelField = computed(() => configGroup.value.label_field || '')
const layout = computed(() => configGroup.value.layout || 'horizontal')
const hamburgerBreakpoint = computed(() => configGroup.value.hamburger_breakpoint || 'never')
const itemsAlignment = computed(() => configGroup.value.items_alignment || 'left')
const itemsGap = computed(() => {
  const v = configGroup.value.items_gap
  if (v === 'sm') return 4
  if (v === 'md' || v === undefined || v === null) return 12
  if (v === 'lg') return 24
  return Number(v) || 12
})
const itemsPadding = computed(() => {
  const v = configGroup.value.items_padding
  if (v === null || v === undefined || v === 0) return null
  if (typeof v === 'number') return `${v}px`
  return v
})
const itemsIndent = computed(() => configGroup.value.items_indent || 0)

// Link group
const linkColor = computed(() => linkGroup.value.color || null)
const linkHoverColor = computed(() => linkGroup.value['color:hover'] || null)
const linkBackground = computed(() => linkGroup.value.background || null)
const linkBackgroundHover = computed(() => linkGroup.value['background:hover'] || null)
const linkHoverAnimation = computed(() => linkGroup.value.hover_animation || 'none')
const linkHoverAnimationColor = computed(() => linkGroup.value.hover_animation_color || null)

// Logo group
const logoLight = computed(() => logoGroup.value.light || '')
const logoDark = computed(() => logoGroup.value.dark || '')
const logoHeight = computed(() => logoGroup.value.height || 40)
const logoPosition = computed(() => logoGroup.value.position || 'left')
const logoType = computed(() => logoGroup.value.type || 'image')
const logoText = computed(() => logoGroup.value.text || '')
const logoFontFamily = computed(() => logoGroup.value.font_family || '')
const logoFontSize = computed(() => logoGroup.value.font_size || 20)
const logoFontWeight = computed(() => logoGroup.value.font_weight || '700')
const logoColor = computed(() => {
  const val = logoGroup.value.color as string | null
  if (!val) return null
  if (val.startsWith('var:')) return `var(--lcms-color-${val.split(':')[1]})`
  return val
})

// Optimized logo with srcset for responsive sizing
const logoOptimized = computed(() => {
  const url = logoLight.value || logoDark.value
  return url ? smallImage(url) : null
})

// CTA group
const ctaText = computed(() => ctaGroup.value.html || ctaGroup.value.content || '')
const ctaPosition = computed(() => ctaGroup.value.position || 'right')
const ctaLinkType = computed(() => ctaGroup.value.link_type || 'custom')
const ctaUrl = computed(() => ctaGroup.value.url || '#')
const ctaPageId = computed(() => ctaGroup.value.page_id || null)
const ctaCollectionCode = computed(() => ctaGroup.value.collection_code || null)
const ctaEntryId = computed(() => ctaGroup.value.entry_id || null)
const ctaRouteUuid = computed(() => ctaGroup.value.route_uuid || null)
const ctaTargetBlank = computed(() => ctaGroup.value.target_blank || false)
const ctaStyle = computed(() => ctaGroup.value.style || 'info')
const ctaSize = computed(() => ctaGroup.value.size || 'md')
const ctaBorderRadius = computed(() => ctaGroup.value.border_radius || 'md')
const ctaIcon = computed(() => ctaGroup.value.icon || '')
const ctaIconPosition = computed(() => ctaGroup.value.icon_position || 'left')
const isCtaSvgIcon = computed(() => ctaIcon.value.startsWith('svg:'))
const ctaSvgContent = computed(() => isCtaSvgIcon.value ? ctaIcon.value.slice(4) : '')

// Dropdown group
const dropdownBg = computed(() => dropdownGroup.value.background || null)
const dropdownLinkColor = computed(() => dropdownGroup.value.link_color || null)
const dropdownLinkHoverColor = computed(() => dropdownGroup.value.link_hover_color || null)
const dropdownFontSize = computed(() => dropdownGroup.value.font_size || 14)
const dropdownBorderRadius = computed(() => dropdownGroup.value.border_radius || 'md')
const dropdownShadow = computed(() => dropdownGroup.value.shadow || 'lg')

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
  return style
})

const hasLogo = computed(() => logoType.value === 'text' ? !!logoText.value : !!(logoLight.value || logoDark.value))

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
      return `color-mix(in srgb, var(--lcms-color-${code}) ${opacity}%, transparent)`
    }
    return `var(--lcms-color-${code})`
  }
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
  const lhb = resolveColorValue(linkBackground.value)
  const lhbh = resolveColorValue(linkBackgroundHover.value)
  if (lc) vars['--lcms-menu-link-color'] = lc
  if (lhc) vars['--lcms-menu-link-hover-color'] = lhc
  if (lhb) vars['--lcms-menu-link-bg'] = lhb
  if (lhbh) vars['--lcms-menu-link-hover-bg'] = lhbh
  vars['--lcms-menu-items-gap'] = `${itemsGap.value}px`
  if (itemsIndent.value) vars['--lcms-menu-items-indent'] = `${itemsIndent.value}px`
  const lac = resolveColorValue(linkHoverAnimationColor.value)
  if (lac) vars['--lcms-menu-link-hover-anim-color'] = lac
  else if (lhc) vars['--lcms-menu-link-hover-anim-color'] = lhc
  if (itemsPadding.value) vars['--lcms-menu-items-padding'] = itemsPadding.value

  // Scrolled state colors
  const slc = resolveColorValue(linkGroup.value['color:scrolled'] as string || null)
  const slogo = resolveColorValue(logoGroup.value['color:scrolled'] as string || null)
  const sctaC = resolveColorValue(ctaGroup.value['color:scrolled'] as string || null)
  const sctaBg = resolveColorValue(ctaGroup.value['background:scrolled'] as string || null)
  if (slc) vars['--lcms-menu-scrolled-link-color'] = slc
  if (slogo) vars['--lcms-menu-scrolled-logo-color'] = slogo
  if (sctaC) vars['--lcms-menu-scrolled-cta-color'] = sctaC
  if (sctaBg) vars['--lcms-menu-scrolled-cta-bg'] = sctaBg

  // Dropdown styling
  const dlc = resolveColorValue(dropdownLinkColor.value)
  const dlhc = resolveColorValue(dropdownLinkHoverColor.value)
  if (dlc) vars['--lcms-menu-dropdown-link-color'] = dlc
  if (dlhc) vars['--lcms-menu-dropdown-link-hover-color'] = dlhc
  const dbg = resolveColorValue(dropdownBg.value)
  if (dbg) vars['--lcms-menu-dropdown-bg'] = dbg
  vars['--lcms-menu-dropdown-font-size'] = `${dropdownFontSize.value}px`

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
const openSubmenus = ref<Record<string, boolean>>({})

function toggleSubmenu(itemId: string) {
  openSubmenus.value[itemId] = !openSubmenus.value[itemId]
}

const isHamburgerMode = computed(() => {
  if (hamburgerBreakpoint.value === 'never') return false
  if (hamburgerBreakpoint.value === 'mobile') return currentBreakpoint.value === 'mobile'
  if (hamburgerBreakpoint.value === 'tablet') return currentBreakpoint.value === 'mobile' || currentBreakpoint.value === 'tablet'
  return false
})

function toggleHamburger() {
  hamburgerOpen.value = !hamburgerOpen.value
  document.body.style.overflow = hamburgerOpen.value ? 'hidden' : ''
}

function closeHamburger() {
  hamburgerOpen.value = false
  document.body.style.overflow = ''
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
      { 'lcms-menu--hamburger': isHamburgerMode, 'lcms-menu--open': hamburgerOpen && isHamburgerMode, 'is-scrolled': sectionIsScrolled.value }
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
          v-if="logoType === 'image'"
          :src="logoOptimized?.src || logoLight || logoDark"
          :srcset="logoOptimized?.srcset || undefined"
          :sizes="logoOptimized?.sizes || undefined"
          :style="{ height: `${logoHeight}px` }"
          alt="Logo"
          decoding="async"
          class="lcms-menu__logo-img"
        >
        <span
          v-else
          class="lcms-menu__logo-text"
          :style="{ fontFamily: logoFontFamily || undefined, fontSize: `${logoFontSize}px`, fontWeight: logoFontWeight, color: logoColor || undefined }"
        >{{ logoText }}</span>
      </a>

      <!-- Hamburger toggle button (right-aligned) -->
      <button
        v-if="isHamburgerMode && !hamburgerOpen"
        class="lcms-menu__hamburger"
        type="button"
        aria-label="Toggle menu"
        aria-expanded="false"
        @click="toggleHamburger"
      >
        <span class="lcms-menu__hamburger-bar" />
        <span class="lcms-menu__hamburger-bar" />
        <span class="lcms-menu__hamburger-bar" />
      </button>

      <!-- Backdrop overlay (hamburger mode) -->
      <div
        v-if="isHamburgerMode && hamburgerOpen"
        class="lcms-menu__backdrop"
        @click="closeHamburger"
      />

      <!-- Menu drawer panel -->
      <div
        class="lcms-menu__panel"
        :class="{ 'lcms-menu__panel--open': hamburgerOpen || !isHamburgerMode }"
      >
        <!-- Drawer header: logo + close button -->
        <div v-if="isHamburgerMode" class="lcms-menu__drawer-header">
          <a v-if="hasLogo" href="/" class="lcms-menu__drawer-logo">
            <img
              v-if="logoType === 'image'"
              :src="logoOptimized?.src || logoLight || logoDark"
              :srcset="logoOptimized?.srcset || undefined"
              :sizes="logoOptimized?.sizes || undefined"
              :style="{ height: `${logoHeight}px` }"
              alt="Logo"
              decoding="async"
            >
            <span
              v-else
              class="lcms-menu__logo-text"
              :style="{ fontFamily: logoFontFamily || undefined, fontSize: `${logoFontSize}px`, fontWeight: logoFontWeight }"
            >{{ logoText }}</span>
          </a>
          <button
            class="lcms-menu__drawer-close"
            type="button"
            aria-label="Close menu"
            @click="closeHamburger"
          >
            &#10005;
          </button>
        </div>
        <!-- Logo (center position) -->
        <a
          v-if="hasLogo && logoPosition === 'center'"
          href="/"
          class="lcms-menu__logo lcms-menu__logo--center"
        >
          <img
            v-if="logoType === 'image'"
            :src="logoOptimized?.src || logoLight || logoDark"
            :srcset="logoOptimized?.srcset || undefined"
            :sizes="logoOptimized?.sizes || undefined"
            :style="{ height: `${logoHeight}px` }"
            alt="Logo"
            decoding="async"
            class="lcms-menu__logo-img"
          >
          <span
            v-else
            class="lcms-menu__logo-text"
            :style="{ fontFamily: logoFontFamily || undefined, fontSize: `${logoFontSize}px`, fontWeight: logoFontWeight, color: logoColor || undefined }"
          >{{ logoText }}</span>
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
            <div v-if="isHamburgerMode && item.children && item.children.length > 0" class="lcms-menu__link-row">
              <a
                :href="getItemUrl(item)"
                class="lcms-menu__link"
                :style="itemsPadding && !isHamburgerMode ? { padding: itemsPadding } : undefined"
                :target="getItemTarget(item)"
                @click="handleLinkClick"
              >
                {{ getItemLabel(item) }}
              </a>
              <button class="lcms-menu__chevron" :class="{ 'lcms-menu__chevron--open': openSubmenus[item.id] }" @click.stop="toggleSubmenu(item.id)">
                &#9662;
              </button>
            </div>
            <a
              v-else
              :href="getItemUrl(item)"
              class="lcms-menu__link"
              :style="itemsPadding && !isHamburgerMode ? { padding: itemsPadding } : undefined"
              :target="getItemTarget(item)"
              @click="handleLinkClick"
            >
              {{ getItemLabel(item) }}
            </a>

            <!-- Nested menu -->
            <ul
              v-if="item.children && item.children.length > 0"
              class="lcms-menu__submenu"
              :class="{ 'lcms-menu__submenu--open': !isHamburgerMode || openSubmenus[item.id] }"
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
          v-if="logoType === 'image'"
          :src="logoOptimized?.src || logoLight || logoDark"
          :srcset="logoOptimized?.srcset || undefined"
          :sizes="logoOptimized?.sizes || undefined"
          :style="{ height: `${logoHeight}px` }"
          alt="Logo"
          decoding="async"
          class="lcms-menu__logo-img"
        >
        <span
          v-else
          class="lcms-menu__logo-text"
          :style="{ fontFamily: logoFontFamily || undefined, fontSize: `${logoFontSize}px`, fontWeight: logoFontWeight, color: logoColor || undefined }"
        >{{ logoText }}</span>
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

.lcms-menu__logo-text {
  display: block;
  white-space: nowrap;
  line-height: 1.2;
  text-decoration: none;
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
   Hamburger button — right-aligned, link color
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
  margin-left: auto;
  color: var(--lcms-menu-link-color, inherit);
}

.lcms-menu__hamburger-bar {
  display: block;
  width: 24px;
  height: 2px;
  background-color: currentColor;
  border-radius: 1px;
}

/* ===========================
   Backdrop overlay
   =========================== */
.lcms-menu__backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 9998;
}

/* ===========================
   Full-screen drawer panel
   =========================== */
.lcms-menu--hamburger .lcms-menu__panel {
  position: fixed;
  top: 0;
  right: 0;
  width: min(380px, 85vw);
  height: 100vh;
  height: 100dvh;
  background: var(--lcms-color-white, #fff);
  z-index: 9999;
  transform: translateX(100%);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow-y: auto;
  padding: 0;
  box-sizing: border-box;
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.1);
}

.lcms-menu--hamburger .lcms-menu__panel--open {
  transform: translateX(0);
}

/* Drawer header */
.lcms-menu__drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.lcms-menu__drawer-logo {
  text-decoration: none;
  color: var(--lcms-color-dark, #333);
}

.lcms-menu__drawer-close {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.25rem;
  color: var(--lcms-color-dark, #333);
  padding: 8px;
  line-height: 1;
  margin-left: auto;
}

/* Drawer list — flush top, no flex grow */
.lcms-menu--hamburger .lcms-menu__list {
  flex: none;
  width: 100%;
  padding: 0;
  margin: 0;
  gap: 0;
}

.lcms-menu--hamburger .lcms-menu__item {
  width: 100%;
}

/* Link row with chevron */
.lcms-menu__link-row {
  display: flex;
  align-items: center;
  width: 100%;
}

.lcms-menu__link-row .lcms-menu__link {
  flex: 1;
  border-bottom: none;
}

.lcms-menu__chevron {
  background: none;
  border: none;
  cursor: pointer;
  padding: 18px 24px 18px 12px;
  color: var(--lcms-color-text-muted, #999);
  font-size: 0.6rem;
  transition: transform 0.25s ease;
}

.lcms-menu__chevron--open {
  transform: rotate(180deg);
}

/* Non-hamburger panel */
.lcms-menu__panel {
  /* Base: hidden for hamburger, overridden below for non-hamburger */
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
  gap: 0;
}

/* Drawer link styling */
.lcms-menu--hamburger .lcms-menu__panel .lcms-menu__link {
  color: var(--lcms-color-dark, #333);
  padding: 16px 24px;
  font-size: 1.05rem;
  font-weight: 400;
  display: block;
  width: 100%;
  text-decoration: none;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  box-sizing: border-box;
}

.lcms-menu--hamburger .lcms-menu__panel .lcms-menu__link:hover {
  background: rgba(0, 0, 0, 0.02);
}

/* Submenu: hidden by default, slides open */
.lcms-menu--hamburger .lcms-menu__submenu {
  position: static;
  box-shadow: none;
  background: rgba(0, 0, 0, 0.02);
  border: none;
  border-radius: 0;
  padding: 0;
  margin: 0;
  list-style: none;
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease;
  width: 100%;
}

.lcms-menu--hamburger .lcms-menu__submenu--open {
  max-height: 500px;
}

.lcms-menu--hamburger .lcms-menu__submenu .lcms-menu__sublink {
  display: block;
  padding: 14px 24px 14px 40px;
  font-size: 0.95rem;
  color: var(--lcms-color-text-muted, #555);
  text-decoration: none;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
}

.lcms-menu--hamburger .lcms-menu__submenu .lcms-menu__sublink:hover {
  background: rgba(0, 0, 0, 0.02);
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

/* ===========================
   Submenu / Dropdown
   =========================== */
.lcms-menu__submenu {
  list-style: none;
  margin: 0;
  padding: 4px;
  position: absolute;
  top: 100%;
  left: 0;
  background: var(--lcms-menu-dropdown-bg, #fff);
  border-radius: var(--lcms-menu-dropdown-radius, 8px);
  box-shadow: var(--lcms-menu-dropdown-shadow, 0 10px 25px rgba(0,0,0,0.15));
  min-width: 180px;
  display: none;
  z-index: 10;
}

.lcms-menu__item:hover > .lcms-menu__submenu {
  display: block;
}

.lcms-menu__sublink {
  display: block;
  padding: 8px 14px;
  color: var(--lcms-menu-dropdown-link-color, #495057) !important;
  text-decoration: none;
  font-size: var(--lcms-menu-dropdown-font-size, 0.9em);
  border-radius: 4px;
  transition: background-color 0.15s, color 0.15s;
  white-space: nowrap;
}

.lcms-menu__sublink:hover {
  color: var(--lcms-menu-dropdown-link-hover-color, var(--lcms-menu-link-hover-color, #50a5f1)) !important;
  background-color: rgba(0, 0, 0, 0.04);
}

/* Scrolled state should NOT affect dropdown links — dropdown has its own colors */
.lcms-menu.is-scrolled .lcms-menu__sublink {
  color: var(--lcms-menu-dropdown-link-color, #495057) !important;
}

.lcms-menu.is-scrolled .lcms-menu__sublink:hover {
  color: var(--lcms-menu-dropdown-link-hover-color, var(--lcms-menu-link-hover-color, #50a5f1)) !important;
}

/* ===========================
   Scrolled state (from sticky section)
   =========================== */
.lcms-menu.is-scrolled {
  transition: color 0.3s ease;
}

.lcms-menu.is-scrolled .lcms-menu__link {
  color: var(--lcms-menu-scrolled-link-color, var(--lcms-menu-link-color, inherit));
}

.lcms-menu.is-scrolled .lcms-menu__logo-text {
  color: var(--lcms-menu-scrolled-logo-color, inherit) !important;
}

.lcms-menu.is-scrolled .lcms-menu__hamburger-bar {
  background-color: var(--lcms-menu-scrolled-link-color, currentColor);
}

.lcms-menu.is-scrolled .lcms-menu__cta {
  color: var(--lcms-menu-scrolled-cta-color, inherit) !important;
  background-color: var(--lcms-menu-scrolled-cta-bg, inherit) !important;
  border-color: var(--lcms-menu-scrolled-cta-bg, inherit) !important;
}
</style>
