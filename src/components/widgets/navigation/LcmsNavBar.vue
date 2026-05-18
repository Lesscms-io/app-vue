<script setup lang="ts">
/**
 * Nav Bar Widget
 *
 * Slot-based header. Each slot carries a list of typed items
 * (logo / menu / cta / link / icon / text / search / divider). Past the
 * hamburger breakpoint, slots marked `move-to-drawer` get pulled into a
 * drawer toggled by a button rendered in the slot pointed at by
 * `hamburger.toggle_slot`. Slots marked `keep-inline` stay in the bar;
 * slots marked `hide` disappear on mobile entirely.
 */

import { computed, ref, watch, onMounted, onUnmounted, inject } from 'vue'
import { useResponsiveSettings } from '@/composables/useResponsiveSettings'
import { useMenu } from '@/composables/useMenu'
import { useLanguage } from '@/composables/useLanguage'

defineOptions({ inheritAttrs: false })

interface Props {
  data: Record<string, any>
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const { extractValue } = useLanguage(props.language)
const { currentBreakpoint } = useResponsiveSettings()
const sectionIsScrolled = inject('sectionIsScrolled', ref(false))

const slots = computed<any[]>(() => Array.isArray(props.data?.slots) ? props.data.slots : [])
const hamburger = computed<Record<string, any>>(() => props.data?.hamburger || {})
const settings = computed<Record<string, any>>(() => props.settings || {})

const hamburgerActive = computed(() => {
  const bp = hamburger.value.breakpoint || 'mobile'
  if (bp === 'never') return false
  if (bp === 'mobile' && currentBreakpoint.value === 'mobile') return true
  if (bp === 'tablet' && (currentBreakpoint.value === 'mobile' || currentBreakpoint.value === 'tablet')) return true
  return false
})

const drawerOpen = ref(false)
watch(currentBreakpoint, () => { drawerOpen.value = false })

function slotInlineStyle(slot: any) {
  const out: Record<string, string> = {}
  const align = slot?.align
  if (align === 'center') out.justifyContent = 'center'
  else if (align === 'end') out.justifyContent = 'flex-end'
  else out.justifyContent = 'flex-start'
  const w = slot?.width
  if (w === 'grow') out.flex = '1 1 0'
  else if (typeof w === 'string' && w.endsWith('%')) out.flexBasis = w
  else if (typeof w === 'number' || (typeof w === 'string' && /^\d+$/.test(w))) out.flexBasis = `${w}px`
  return out
}

function slotVisibleInBar(slot: any) {
  if (!hamburgerActive.value) return slot.mobile_target !== 'hide'
  return slot.mobile_target === 'keep-inline'
}

const drawerSlots = computed(() => slots.value.filter(s => s.mobile_target === 'move-to-drawer'))
const toggleSlotId = computed(() => hamburger.value.toggle_slot || 'right')

const navStyle = computed(() => {
  const s = settings.value
  const out: Record<string, string> = {}
  if (s.padding_top != null) out.paddingTop = `${s.padding_top}px`
  if (s.padding_right != null) out.paddingRight = `${s.padding_right}px`
  if (s.padding_bottom != null) out.paddingBottom = `${s.padding_bottom}px`
  if (s.padding_left != null) out.paddingLeft = `${s.padding_left}px`
  if (s.gap) out.gap = `${s.gap}px`
  if (s.background_color) out.backgroundColor = s.background_color
  if (s.border_bottom_width) {
    out.borderBottomWidth = `${s.border_bottom_width}px`
    out.borderBottomStyle = 'solid'
    if (s.border_bottom_color) out.borderBottomColor = s.border_bottom_color
  }
  if (s.box_shadow) out.boxShadow = s.box_shadow
  if (s.transition_duration) out.transitionDuration = `${s.transition_duration}ms`
  if (sectionIsScrolled.value) {
    if (s['background_color:scrolled']) out.backgroundColor = s['background_color:scrolled']
    if (s['box_shadow:scrolled']) out.boxShadow = s['box_shadow:scrolled']
  }
  return out
})

const drawerStyle = computed(() => {
  const h = hamburger.value
  const out: Record<string, string> = {
    width: `${h.width || 320}px`,
    padding: `${h.padding ?? 24}px`,
    gap: `${h.item_gap ?? 16}px`,
  }
  if (h.bg) out.backgroundColor = h.bg
  if (h.text_color) out.color = h.text_color
  if (h.position === 'left') {
    out.left = '0'
    out.transform = drawerOpen.value ? 'translateX(0)' : 'translateX(-100%)'
  } else if (h.position === 'full-overlay') {
    out.left = '0'
    out.right = '0'
    out.width = '100%'
    out.transform = drawerOpen.value ? 'translateY(0)' : 'translateY(-100%)'
  } else {
    out.right = '0'
    out.transform = drawerOpen.value ? 'translateX(0)' : 'translateX(100%)'
  }
  return out
})

// Pre-resolve menu items for any `menu` item type so render is purely
// declarative. useMenu is reactive on menu_code so this works even when
// the editor changes the picked menu live.
const menuItemsCache = ref<Record<string, any[]>>({})

function ensureMenuLoaded(code: string) {
  if (!code || menuItemsCache.value[code]) return
  const { items } = useMenu(code)
  watch(items, (val) => {
    if (val) menuItemsCache.value = { ...menuItemsCache.value, [code]: val as any[] }
  }, { immediate: true })
}

watch(slots, (val) => {
  val.forEach(slot => (slot.items || []).forEach((it: any) => {
    if (it.type === 'menu' && it.config?.menu_code) ensureMenuLoaded(it.config.menu_code)
  }))
}, { immediate: true, deep: true })

// Resolve a menu item's visible label using the same fallback chain as
// the editor's MenuWidget: configured label_field → common fields
// (title/name/label/text) → first non-empty field → raw item.label.
// Without the fallbacks, items whose `label` is just the menu's
// generated code (e.g. "menu-glowne-1") would render the code on the
// storefront even though the editor previewed the real entry name.
function resolveFieldValue(val: any): string {
  if (!val) return ''
  if (typeof val === 'string') return val
  if (typeof val === 'object') {
    return (extractValue(val) as string) || ''
  }
  return String(val)
}

function getMenuItemLabel(item: any, labelField: string): string {
  const data = item?.fields || item?.custom || {}
  if (labelField && data[labelField] !== undefined) {
    const r = resolveFieldValue(data[labelField])
    if (r) return r
  }
  for (const k of ['title', 'name', 'label', 'text']) {
    const r = resolveFieldValue(data[k])
    if (r) return r
  }
  for (const v of Object.values(data)) {
    const r = resolveFieldValue(v)
    if (r) return r
  }
  return (extractValue(item?.label) as string) || item?.metadata?.entry_id || ''
}

function btnClasses(style: string, size: string) {
  const sty = style || 'info'
  const sz = size || 'md'
  const classes = ['lcms-nav-bar__cta', `lcms-nav-bar__cta--${sty}`, `lcms-nav-bar__cta--size-${sz}`]
  return classes
}

function dividerStyle(item: any) {
  const c = item?.config || {}
  return {
    width: `${c.thickness || 1}px`,
    height: `${c.height || 24}px`,
    backgroundColor: c.color || 'currentColor',
    display: 'inline-block'
  }
}

function iconStyle(item: any) {
  const c = item?.config || {}
  const out: Record<string, string> = { fontSize: `${c.size || 18}px` }
  if (c.color) out.color = c.color
  return out
}

function isExternal(url: string | null | undefined) {
  if (!url) return false
  return /^https?:\/\//i.test(url)
}

function lockBodyScroll(lock: boolean) {
  if (typeof document === 'undefined') return
  document.body.style.overflow = lock ? 'hidden' : ''
}
watch(drawerOpen, (v) => lockBodyScroll(v && hamburger.value.position === 'full-overlay'))
onUnmounted(() => lockBodyScroll(false))

onMounted(() => {
  // Close drawer on Escape
  const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') drawerOpen.value = false }
  window.addEventListener('keydown', handler)
  onUnmounted(() => window.removeEventListener('keydown', handler))
})
</script>

<template>
  <nav
    class="lcms-nav-bar"
    :class="{ 'lcms-nav-bar--scrolled': sectionIsScrolled, 'lcms-nav-bar--hamburger': hamburgerActive }"
    :style="navStyle"
  >
    <div class="lcms-nav-bar__row">
      <div
        v-for="slot in slots"
        v-show="slotVisibleInBar(slot)"
        :key="slot.id"
        class="lcms-nav-bar__slot"
        :data-slot-id="slot.id"
        :style="slotInlineStyle(slot)"
      >
        <template
          v-for="(item, idx) in slot.items || []"
          :key="`${slot.id}-${idx}`"
        >
          <!-- LOGO -->
          <a
            v-if="item.type === 'logo' && item.config?.image"
            :href="item.config?.link || '/'"
            class="lcms-nav-bar__logo"
          >
            <img
              :src="item.config.image"
              :style="{ height: `${item.config.height || 40}px` }"
              alt=""
            >
          </a>

          <!-- MENU -->
          <ul
            v-else-if="item.type === 'menu'"
            class="lcms-nav-bar__menu"
            :style="{ gap: `${item.config?.items_gap || 16}px`, '--menu-color': item.config?.color || 'inherit', '--menu-color-hover': item.config?.['color:hover'] || item.config?.color || 'inherit' }"
          >
            <li
              v-for="(mi, mIdx) in (menuItemsCache[item.config?.menu_code] || [])"
              :key="`mi-${mIdx}`"
              class="lcms-nav-bar__menu-item"
            >
              <a :href="mi.url || '#'">{{ getMenuItemLabel(mi, item.config?.label_field || '') }}</a>
            </li>
          </ul>

          <!-- CTA -->
          <a
            v-else-if="item.type === 'cta'"
            :href="item.config?.link || '#'"
            :target="item.config?.target_blank ? '_blank' : undefined"
            :rel="item.config?.target_blank ? 'noopener noreferrer' : undefined"
            :class="btnClasses(item.config?.style, item.config?.size)"
          >
            <i
              v-if="item.config?.icon && item.config?.icon_position !== 'right'"
              :class="item.config.icon"
              class="me-1"
            />
            {{ item.config?.text }}
            <i
              v-if="item.config?.icon && item.config?.icon_position === 'right'"
              :class="item.config.icon"
              class="ms-1"
            />
          </a>

          <!-- LINK -->
          <a
            v-else-if="item.type === 'link'"
            :href="item.config?.link || '#'"
            :target="item.config?.target_blank ? '_blank' : undefined"
            :rel="item.config?.target_blank ? 'noopener noreferrer' : undefined"
            class="lcms-nav-bar__link"
            :style="{ color: item.config?.color || undefined, '--lcms-nav-bar-link-hover': item.config?.['color:hover'] || undefined }"
          >
            {{ item.config?.text }}
          </a>

          <!-- ICON -->
          <a
            v-else-if="item.type === 'icon'"
            :href="item.config?.link || '#'"
            class="lcms-nav-bar__icon"
            :style="iconStyle(item)"
          >
            <i :class="item.config?.icon || 'fa-solid fa-circle'" />
          </a>

          <!-- TEXT -->
          <div
            v-else-if="item.type === 'text'"
            class="lcms-nav-bar__text"
            v-html="item.config?.html || ''"
          />

          <!-- SEARCH -->
          <a
            v-else-if="item.type === 'search'"
            :href="item.config?.url || '/search'"
            class="lcms-nav-bar__search"
            :style="{ fontSize: `${item.config?.size || 18}px` }"
            aria-label="Search"
          >
            <i :class="item.config?.icon || 'fa-solid fa-magnifying-glass'" />
          </a>

          <!-- DIVIDER -->
          <span
            v-else-if="item.type === 'divider'"
            class="lcms-nav-bar__divider"
            :style="dividerStyle(item)"
            aria-hidden="true"
          />
        </template>

        <!-- Hamburger toggle button rendered inside its target slot -->
        <button
          v-if="hamburgerActive && toggleSlotId === slot.id"
          type="button"
          class="lcms-nav-bar__hamburger-toggle"
          :aria-expanded="drawerOpen"
          aria-label="Menu"
          @click="drawerOpen = !drawerOpen"
        >
          <i :class="hamburger.toggle_icon || 'fa-solid fa-bars'" />
        </button>
      </div>
    </div>

    <!-- Drawer -->
    <div
      v-if="hamburgerActive"
      class="lcms-nav-bar__drawer-backdrop"
      :class="{ 'is-open': drawerOpen }"
      @click="drawerOpen = false"
    />
    <aside
      v-if="hamburgerActive"
      class="lcms-nav-bar__drawer"
      :class="[`lcms-nav-bar__drawer--${hamburger.position || 'right'}`, { 'is-open': drawerOpen }]"
      :style="drawerStyle"
    >
      <div class="lcms-nav-bar__drawer-header">
        <button
          type="button"
          class="lcms-nav-bar__drawer-close"
          aria-label="Zamknij menu"
          @click="drawerOpen = false"
        >
          <i :class="hamburger.close_icon || 'fa-solid fa-xmark'" />
        </button>
      </div>
      <div class="lcms-nav-bar__drawer-body">
        <template
          v-for="(slot, sIdx) in drawerSlots"
          :key="`drawer-slot-${slot.id}-${sIdx}`"
        >
          <template
            v-for="(item, idx) in slot.items || []"
            :key="`drawer-${slot.id}-${idx}`"
          >
            <!-- Same item-type rendering as the bar, vertical layout -->
            <a
              v-if="item.type === 'logo' && item.config?.image"
              :href="item.config?.link || '/'"
              class="lcms-nav-bar__drawer-logo"
            >
              <img
                :src="item.config.image"
                :style="{ height: `${item.config.height || 40}px` }"
                alt=""
              >
            </a>
            <ul
              v-else-if="item.type === 'menu'"
              class="lcms-nav-bar__drawer-menu"
              :style="{ gap: `${hamburger.item_gap || 12}px` }"
            >
              <li
                v-for="(mi, mIdx) in (menuItemsCache[item.config?.menu_code] || [])"
                :key="`drawer-mi-${mIdx}`"
              >
                <a
                  :href="mi.url || '#'"
                  @click="drawerOpen = false"
                >{{ getMenuItemLabel(mi, item.config?.label_field || '') }}</a>
              </li>
            </ul>
            <a
              v-else-if="item.type === 'cta'"
              :href="item.config?.link || '#'"
              :target="item.config?.target_blank ? '_blank' : undefined"
              :rel="item.config?.target_blank ? 'noopener noreferrer' : undefined"
              :class="[btnClasses(item.config?.style, item.config?.size), `lcms-nav-bar__drawer-cta--${hamburger.cta_style || 'full-width'}`]"
            >
              {{ item.config?.text }}
            </a>
            <a
              v-else-if="item.type === 'link'"
              :href="item.config?.link || '#'"
              :target="item.config?.target_blank ? '_blank' : undefined"
              class="lcms-nav-bar__drawer-link"
              @click="drawerOpen = false"
            >
              {{ item.config?.text }}
            </a>
            <a
              v-else-if="item.type === 'icon'"
              :href="item.config?.link || '#'"
              class="lcms-nav-bar__drawer-icon"
            >
              <i :class="item.config?.icon" />
            </a>
            <div
              v-else-if="item.type === 'text'"
              class="lcms-nav-bar__drawer-text"
              v-html="item.config?.html || ''"
            />
          </template>
        </template>
      </div>
    </aside>
  </nav>
</template>

<style>
.lcms-nav-bar {
  width: 100%;
  position: relative;
  box-sizing: border-box;
  transition: background-color var(--lcms-nav-bar-transition, 200ms) ease, box-shadow var(--lcms-nav-bar-transition, 200ms) ease;
}
.lcms-nav-bar__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--lcms-nav-bar-gap, 24px);
  width: 100%;
}
.lcms-nav-bar__slot {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}
.lcms-nav-bar__logo img,
.lcms-nav-bar__drawer-logo img {
  display: block;
  width: auto;
  max-width: 100%;
  height: auto;
}
.lcms-nav-bar__menu {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  align-items: center;
}
.lcms-nav-bar__menu-item > a {
  color: var(--menu-color, inherit);
  text-decoration: none;
  transition: color 0.2s ease;
}
.lcms-nav-bar__menu-item > a:hover {
  color: var(--menu-color-hover, var(--menu-color, inherit));
}
.lcms-nav-bar__link {
  text-decoration: none;
  transition: color 0.2s ease;
}
.lcms-nav-bar__link:hover {
  color: var(--lcms-nav-bar-link-hover, inherit);
}
.lcms-nav-bar__cta {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  border-radius: 6px;
  font-weight: 500;
  transition: all 0.2s ease;
  white-space: nowrap;
}
.lcms-nav-bar__cta--size-sm { padding: 4px 12px; font-size: 13px; }
.lcms-nav-bar__cta--size-md { padding: 8px 16px; font-size: 14px; }
.lcms-nav-bar__cta--size-lg { padding: 12px 22px; font-size: 16px; }
.lcms-nav-bar__cta--info    { background: var(--lcms-color-primary, #0d6efd); color: #fff; }
.lcms-nav-bar__cta--success { background: var(--lcms-color-success, #198754); color: #fff; }
.lcms-nav-bar__cta--danger  { background: var(--lcms-color-danger, #dc3545); color: #fff; }
.lcms-nav-bar__cta--dark    { background: var(--lcms-color-dark, #212529); color: #fff; }
.lcms-nav-bar__cta--light   { background: var(--lcms-color-light, #f8f9fa); color: var(--lcms-color-dark, #212529); }
.lcms-nav-bar__cta--outline { background: transparent; border: 1px solid currentColor; }
.lcms-nav-bar__cta--link    { background: transparent; color: inherit; padding-left: 0; padding-right: 0; }
.lcms-nav-bar__cta:hover    { opacity: 0.9; transform: translateY(-1px); }

.lcms-nav-bar__icon,
.lcms-nav-bar__search {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: inherit;
  text-decoration: none;
  line-height: 1;
}
.lcms-nav-bar__text { display: inline-flex; align-items: center; }
.lcms-nav-bar__divider { flex-shrink: 0; }
.lcms-nav-bar__hamburger-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: transparent;
  border: 1px solid currentColor;
  border-radius: 6px;
  cursor: pointer;
  font-size: 18px;
  color: inherit;
}

/* Drawer */
.lcms-nav-bar__drawer-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.25s ease, visibility 0.25s ease;
  z-index: 9998;
}
.lcms-nav-bar__drawer-backdrop.is-open {
  opacity: 1;
  visibility: visible;
}
.lcms-nav-bar__drawer {
  position: fixed;
  top: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  background: #fff;
  color: #1a1a1a;
  box-shadow: -8px 0 24px rgba(0, 0, 0, 0.15);
  transition: transform 0.3s ease;
  z-index: 9999;
  overflow-y: auto;
}
.lcms-nav-bar__drawer--full-overlay {
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
}
.lcms-nav-bar__drawer-header {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
}
.lcms-nav-bar__drawer-close {
  background: transparent;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: inherit;
  padding: 4px 8px;
}
.lcms-nav-bar__drawer-body {
  display: flex;
  flex-direction: column;
  gap: inherit;
}
.lcms-nav-bar__drawer-menu {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}
.lcms-nav-bar__drawer-menu > li > a,
.lcms-nav-bar__drawer-link {
  display: block;
  color: inherit;
  text-decoration: none;
  font-size: 18px;
  padding: 4px 0;
}
.lcms-nav-bar__drawer-menu > li > a:hover,
.lcms-nav-bar__drawer-link:hover { opacity: 0.7; }
.lcms-nav-bar__drawer-cta--full-width { width: 100%; justify-content: center; }
.lcms-nav-bar__drawer-cta--pinned-to-bottom {
  margin-top: auto;
  width: 100%;
  justify-content: center;
}
</style>
