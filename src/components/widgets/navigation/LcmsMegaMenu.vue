<script setup lang="ts">
/**
 * Mega Menu Widget (premium)
 *
 * Navigation bar driven by a CMS menu. Each top-level node opens a panel
 * whose type is resolved per item: 'none' (plain link), 'simple' (one
 * column of links) or 'mega' (child groups as columns + optional featured
 * card). Panels are absolutely positioned under the bar and open on hover
 * or click; below the configured breakpoint the bar collapses into a
 * hamburger + drawer. SSR renders the bar and (hidden) panels, so the
 * markup is crawlable; interaction attaches on mount.
 *
 * Element groups: items[], config, logo, bar, link, panel, cta, mobile.
 */

import { computed, inject, nextTick, onBeforeUnmount, onMounted, onServerPrefetch, ref, watch } from 'vue'
import { useMenu } from '@/composables/useMenu'
import { useLanguage } from '@/composables/useLanguage'
import { smallImage } from '@/composables/useImageOptimization'
import type { MenuItem } from '@/api/types'
import type { MegaMenuWidgetData, MegaMenuItemConfig, MegaMenuLink } from '@/types/widgets'

defineOptions({
  inheritAttrs: false
})

interface Props {
  data: MegaMenuWidgetData
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const { extractValue } = useLanguage(props.language)
const sectionIsScrolled = inject('sectionIsScrolled', ref(false))
const resolvePageUrl = inject<(code: string | null, uuid: string | null) => string>('lesscms-resolve-page-url', () => '#')
const resolveCollectionUrl = inject<(collectionCode: string, entryId: string) => string>('lesscms-resolve-collection-url', () => '#')

function resolveColor(val: string | null | undefined, fallback: string): string {
  if (!val) return fallback
  if (val.startsWith('var:')) {
    const parts = val.split(':')
    const code = parts[1]
    const opacity = parts.length >= 3 ? parseInt(parts[2]) : 100
    if (opacity < 100) {
      return `color-mix(in srgb, var(--lcms-color-${code}) ${opacity}%, transparent)`
    }
    return `var(--lcms-color-${code})`
  }
  return val
}

const config = computed(() => (props.data as any).widget || props.data || {})

// ── Element groups ───────────────────────────────────────────────────
const configGroup = computed(() => config.value.config || {})
const logoGroup = computed(() => config.value.logo || {})
const barGroup = computed(() => config.value.bar || {})
const linkGroup = computed(() => config.value.link || {})
const panelGroup = computed(() => config.value.panel || {})
const ctaGroup = computed(() => config.value.cta || {})
const mobileGroup = computed(() => config.value.mobile || {})
const itemConfigs = computed<MegaMenuItemConfig[]>(() => Array.isArray(config.value.items) ? config.value.items : [])

const text = (v: any) => (extractValue(v) as string) || ''

// ── Menu nodes ───────────────────────────────────────────────────────
const menuCode = computed(() => configGroup.value.menu_code || '')
const { items: nodes, refetch: fetchMenu } = useMenu(menuCode)
// SSR: the nav has to be in the initial HTML (crawlable, no layout jump).
onServerPrefetch(() => fetchMenu())
const topNodes = computed(() => nodes.value.filter(n => n?.metadata?.is_public !== false))
// One list, or two halves around a centred logo (logo.position = 'center').
const navGroups = computed<MenuItem[][]>(() => {
  const list = topNodes.value
  if ((logoGroup.value.position || 'left') !== 'center' || list.length < 2) return [list]
  const mid = Math.ceil(list.length / 2)
  return [list.slice(0, mid), list.slice(mid)]
})

const nodeChildren = (node: MenuItem | undefined): MenuItem[] => (Array.isArray(node?.children) ? node!.children! : [])
const nodeFields = (node: MenuItem): Record<string, any> => node.fields || node.custom || {}

// Field mapping with fallbacks (menus have free-form schemas) — mirror of
// fe/megaMenuShared.js so the canvas and the site agree.
const FALLBACK_LABELS = ['title', 'name', 'label', 'text']
const FALLBACK_DESCRIPTIONS = ['description', 'subtitle', 'excerpt', 'summary']
const FALLBACK_ICONS = ['icon']
const FALLBACK_IMAGES = ['image', 'thumbnail', 'photo', 'cover']

function pickField(data: Record<string, any>, configured: string | null | undefined, fallbacks: string[]): string {
  if (configured && data[configured] !== undefined) {
    const v = text(data[configured])
    if (v) return v
  }
  for (const key of fallbacks) {
    const v = text(data[key])
    if (v) return v
  }
  return ''
}

const label = (node: MenuItem) => pickField(nodeFields(node), configGroup.value.label_field, FALLBACK_LABELS) || text(node.label)
const description = (node: MenuItem) => pickField(nodeFields(node), configGroup.value.description_field, FALLBACK_DESCRIPTIONS)
const icon = (node: MenuItem) => pickField(nodeFields(node), configGroup.value.icon_field, FALLBACK_ICONS)
const image = (node: MenuItem): string => {
  const data = nodeFields(node)
  const raw = configGroup.value.image_field ? data[configGroup.value.image_field] : FALLBACK_IMAGES.map(k => data[k]).find(Boolean)
  if (!raw) return ''
  if (typeof raw === 'string') return raw
  if (Array.isArray(raw)) return raw[0]?.url || raw[0]?.public_link || raw[0] || ''
  return raw.url || raw.public_link || raw.path || ''
}
const url = (node: MenuItem) => node.metadata?.url || '#'
const target = (node: MenuItem) => (node.metadata?.target === '_blank' ? '_blank' : undefined)

// ── Per-item panel config ────────────────────────────────────────────
const BLANK_ITEM: MegaMenuItemConfig = {
  id: '', panel: 'auto', columns: 0, width: 'inherit', show_descriptions: true, show_icons: true, show_images: false,
  badge: { show: false, text: {}, color: 'var:primary' },
  featured: { show: false, position: 'right', image: '', title: {}, text: {}, button: { text: {}, url: '#', link_type: 'custom', show: true } }
}
// Stored config merged over the defaults, so the template never sees holes.
const itemOf = (node: MenuItem): MegaMenuItemConfig => {
  const item = itemConfigs.value.find(it => String(it.id) === String(node.id)) || BLANK_ITEM
  return {
    id: item.id != null ? String(item.id) : String(node.id),
    panel: item.panel || 'auto',
    columns: Number(item.columns) || 0,
    width: item.width || 'inherit',
    show_descriptions: item.show_descriptions !== false,
    show_icons: item.show_icons !== false,
    show_images: item.show_images === true,
    badge: { ...BLANK_ITEM.badge, ...(item.badge || {}) },
    featured: { ...BLANK_ITEM.featured, ...(item.featured || {}) }
  }
}

type PanelType = 'none' | 'simple' | 'mega'
function panelTypeOf(node: MenuItem): PanelType {
  const item = itemOf(node)
  const children = nodeChildren(node)
  const featured = item.featured?.show === true
  // The item's own choice wins; otherwise the widget-wide default (config.panel_default).
  const type = (item.panel && item.panel !== 'auto') ? item.panel : (configGroup.value.panel_default || 'auto')
  if (type === 'none') return 'none'
  if (type === 'auto') {
    if (!children.length && !featured) return 'none'
    if (featured || children.some(c => nodeChildren(c).length)) return 'mega'
    return 'simple'
  }
  if (!children.length && !featured) return 'none'
  return type as PanelType
}

// A simple panel is a dropdown hugging its item unless the item says
// otherwise; `config.panel_width` is the mega panel width.
const panelWidthOf = (node: MenuItem) => {
  const own = itemOf(node).width
  if (own && own !== 'inherit') return own
  return panelTypeOf(node) === 'simple' ? 'auto' : (configGroup.value.panel_width || 'container')
}

const columnsOf = (node: MenuItem) => nodeChildren(node).map(child => ({ node: child, links: nodeChildren(child) }))
const columnCountOf = (node: MenuItem) => {
  const own = Number(itemOf(node).columns || 0)
  const max = Number(panelGroup.value.max_columns || 4)
  return Math.max(1, Math.min(own > 0 ? own : columnsOf(node).length || 1, max))
}

const badgeOf = (node: MenuItem) => {
  const b = itemOf(node).badge
  return b?.show && text(b.text) ? { text: text(b.text), color: resolveColor(b.color, 'var(--lcms-color-primary)') } : null
}

// ── Links (CTA + featured buttons): prefer the server-resolved URL ───
function resolveLink(link: MegaMenuLink | undefined): string {
  if (!link) return '#'
  const lt = link.link_type || 'custom'
  const serverUrl = link.url || '#'
  if (lt === 'page') {
    if (serverUrl && serverUrl !== '#') return serverUrl
    if (link.page_id) {
      const r = resolvePageUrl(null, link.page_id)
      if (r && r !== '#') return r
    }
    return serverUrl
  }
  if (lt === 'route' && link.route_uuid) return resolvePageUrl(null, link.route_uuid)
  if (lt === 'entry') {
    if (serverUrl && serverUrl !== '#') return serverUrl
    if (link.collection_code && link.entry_id) {
      const r = resolveCollectionUrl(link.collection_code, link.entry_id)
      if (r && r !== '#') return r
    }
    return serverUrl
  }
  return serverUrl
}

const ctaShown = computed(() => ctaGroup.value.show === true && !!text(ctaGroup.value.text))
const ctaPosition = computed(() => ctaGroup.value.position || 'right')
const ctaLink = computed<MegaMenuLink>(() => ({
  url: ctaGroup.value.url || '#',
  link_type: ctaGroup.value.link_type || 'custom',
  page_id: ctaGroup.value.page_id || null,
  entry_id: ctaGroup.value.entry_id || null,
  collection_code: ctaGroup.value.collection_code || null,
  route_uuid: ctaGroup.value.route_uuid || null,
  target_blank: ctaGroup.value.target_blank === true
}))
const ctaHref = computed(() => resolveLink(ctaLink.value))
const showChevron = computed(() => linkGroup.value.chevron !== false)
const borderRadiusMap: Record<string, string> = { none: '0', sm: '4px', md: '8px', lg: '16px', pill: '9999px', full: '9999px' }
const ctaClasses = computed(() => {
  const size = ctaGroup.value.size || 'md'
  return ['lcms-button__link', `lcms-button__link--${ctaGroup.value.style || 'primary'}`, size === 'md' ? '' : `lcms-button__link--size-${size}`]
})
const ctaInlineStyle = computed(() => ({ borderRadius: borderRadiusMap[ctaGroup.value.border_radius || 'md'] || '8px' }))
const ctaIcon = computed(() => (ctaGroup.value.icon || '') as string)
const ctaIconIsSvg = computed(() => ctaIcon.value.startsWith('svg:'))
const ctaIconPosition = computed(() => ctaGroup.value.icon_position || 'left')

// ── Logo ─────────────────────────────────────────────────────────────
const logoType = computed(() => logoGroup.value.type || 'image')
const logoLight = computed(() => logoGroup.value.light || '')
const logoDark = computed(() => logoGroup.value.dark || '')
const logoSrc = computed(() => {
  const u = logoLight.value || logoDark.value
  return u ? (smallImage(u)?.src || u) : ''
})
const logoScrolledSrc = computed(() => (logoDark.value && logoLight.value ? (smallImage(logoDark.value)?.src || logoDark.value) : ''))
const logoText = computed(() => text(logoGroup.value.text))
const hasLogo = computed(() => (logoType.value === 'text' ? !!logoText.value : logoType.value === 'image' && !!logoSrc.value))

// ── Open state (desktop panels) ──────────────────────────────────────
const mounted = ref(false)
const openId = ref<string | null>(null)
const trigger = computed(() => configGroup.value.trigger || 'hover')
let closeTimer: ReturnType<typeof setTimeout> | null = null

const cancelClose = () => { if (closeTimer) { clearTimeout(closeTimer); closeTimer = null } }
const open = (node: MenuItem) => {
  cancelClose()
  openId.value = panelTypeOf(node) === 'none' ? null : String(node.id)
}
const scheduleClose = () => {
  cancelClose()
  closeTimer = setTimeout(() => { openId.value = null }, 120)
}
const onEnter = (node: MenuItem) => { if (trigger.value === 'hover') open(node) }
const onLeave = () => { if (trigger.value === 'hover') scheduleClose() }
const onClick = (node: MenuItem, e: MouseEvent) => {
  if (panelTypeOf(node) === 'none') return
  // Hover trigger: the label is a real link, the chevron toggles (touch).
  if (trigger.value === 'hover' && !(e.target as HTMLElement | null)?.closest('.mm-item__chevron')) return
  e.preventDefault()
  openId.value = openId.value === String(node.id) ? null : String(node.id)
}
const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') { openId.value = null; closeDrawer() }
}
const onDocumentClick = (e: MouseEvent) => {
  if (!root.value || root.value.contains(e.target as Node)) return
  openId.value = null
}

const root = ref<HTMLElement | null>(null)

// The panel's arrow points at the open item (container / full panels are
// anchored to the bar, not to the item).
const arrowX = ref(48)
watch(openId, (id) => {
  if (!id) return
  nextTick(() => {
    const li = root.value?.querySelector('.mm-nav__li.is-open') as HTMLElement | null
    const link = li?.querySelector(':scope > .mm-item') as HTMLElement | null
    const panel = li?.querySelector(':scope > .mm-panel') as HTMLElement | null
    if (!link || !panel) return
    const a = link.getBoundingClientRect()
    const p = panel.getBoundingClientRect()
    arrowX.value = Math.max(24, a.left + a.width / 2 - p.left)
  })
})

// ── Sticky bar ───────────────────────────────────────────────────────
// Once the widget scrolls out at the top, the bar pins to the viewport
// and the root keeps its height so the page doesn't jump. Works in any
// section (a section-level sticky pins the whole section instead).
const stickyEl = ref<HTMLElement | null>(null)
const sticky = computed(() => barGroup.value.sticky === true)
const stuck = ref(false)
const stuckHeight = ref(0)
// 'scroll-up': the pinned bar slides away while scrolling down and comes
// back on the first scroll up (never while a panel or the drawer is open).
const stickyMode = computed(() => barGroup.value.sticky_mode || 'always')
const hidden = ref(false)
let lastY = 0
const onScroll = () => {
  if (!sticky.value || !root.value) { stuck.value = false; hidden.value = false; return }
  if (!stuck.value && stickyEl.value) stuckHeight.value = stickyEl.value.offsetHeight
  stuck.value = root.value.getBoundingClientRect().top < 0
  const y = window.scrollY
  if (stickyMode.value === 'scroll-up' && stuck.value && !openId.value && !drawerOpen.value) {
    if (y > lastY + 6) hidden.value = true
    else if (y < lastY - 6) hidden.value = false
  } else {
    hidden.value = false
  }
  lastY = y
}
const spacerStyle = computed(() => (sticky.value && stuck.value ? { height: `${stuckHeight.value}px` } : {}))
const isScrolled = computed(() => sectionIsScrolled.value || stuck.value)

// ── Mobile drawer ────────────────────────────────────────────────────
const drawerOpen = ref(false)
const expanded = ref<Record<string, boolean>>({})
const toggleExpanded = (id: string) => { expanded.value = { ...expanded.value, [id]: !expanded.value[id] } }
const lockBody = (lock: boolean) => {
  if (typeof document === 'undefined') return
  document.body.style.overflow = lock ? 'hidden' : ''
}
const toggleDrawer = () => { drawerOpen.value = !drawerOpen.value }
const closeDrawer = () => { drawerOpen.value = false }
watch(drawerOpen, (v) => {
  lockBody(v && (configGroup.value.mobile_mode || 'offcanvas-right') !== 'dropdown')
  if (!v) expanded.value = {}
})

onMounted(() => {
  mounted.value = true
  document.addEventListener('keydown', onKeydown)
  document.addEventListener('click', onDocumentClick)
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll, { passive: true })
  onScroll()
})
onBeforeUnmount(() => {
  cancelClose()
  lockBody(false)
  document.removeEventListener('keydown', onKeydown)
  document.removeEventListener('click', onDocumentClick)
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onScroll)
})

// ── Look ─────────────────────────────────────────────────────────────
const RADIUS: Record<string, string> = { none: '0', sm: '6px', md: '12px', lg: '20px' }
const LINK_RADIUS: Record<string, string> = { none: '0', sm: '4px', md: '8px', lg: '14px' }
const SHADOW: Record<string, string> = {
  none: 'none',
  sm: '0 2px 8px rgba(15, 23, 42, 0.08)',
  md: '0 8px 24px rgba(15, 23, 42, 0.12)',
  lg: '0 18px 50px rgba(15, 23, 42, 0.18)'
}

const cssVars = computed(() => {
  const vars: Record<string, string> = {
    '--mm-bar-bg': barGroup.value.background ? resolveColor(barGroup.value.background, 'transparent') : 'transparent',
    '--mm-bar-h': `${barGroup.value.height ?? 72}px`,
    '--mm-bar-shadow': SHADOW[barGroup.value.shadow] || 'none',
    '--mm-logo-h': `${logoGroup.value.height ?? 40}px`,
    '--mm-logo-color': resolveColor(logoGroup.value.color, 'var(--lcms-color-dark, #111827)'),
    '--mm-logo-size': `${logoGroup.value.font_size ?? 20}px`,
    '--mm-logo-font': logoGroup.value.font_family ? `'${logoGroup.value.font_family}', sans-serif` : 'var(--lcms-font-heading)',
    '--mm-link-font': linkGroup.value.font_family ? `'${linkGroup.value.font_family}', sans-serif` : 'inherit',
    '--mm-panel-font': panelGroup.value.font_family ? `'${panelGroup.value.font_family}', sans-serif` : 'inherit',
    '--mm-logo-weight': logoGroup.value.font_weight || '700',
    '--mm-link-color': resolveColor(linkGroup.value.color, 'var(--lcms-color-text, #111827)'),
    '--mm-link-hover': resolveColor(linkGroup.value['color:hover'] || linkGroup.value.color, 'var(--lcms-color-primary, #556ee6)'),
    '--mm-link-bg': linkGroup.value.background ? resolveColor(linkGroup.value.background, 'transparent') : 'transparent',
    '--mm-link-bg-hover': linkGroup.value['background:hover'] ? resolveColor(linkGroup.value['background:hover'], 'transparent') : 'rgba(85, 110, 230, 0.1)',
    '--mm-link-size': `${linkGroup.value.font_size ?? 15}px`,
    '--mm-link-weight': linkGroup.value.font_weight || '500',
    '--mm-link-spacing': `${linkGroup.value.letter_spacing ?? 0}px`,
    '--mm-link-gap': `${linkGroup.value.gap ?? 4}px`,
    '--mm-link-px': `${linkGroup.value.padding_x ?? 14}px`,
    '--mm-link-py': `${linkGroup.value.padding_y ?? 10}px`,
    '--mm-link-radius': ({ none: '0', sm: '6px', md: '10px', pill: '999px' } as Record<string, string>)[linkGroup.value.border_radius] || '999px',
    '--mm-panel-bg': resolveColor(panelGroup.value.background, '#ffffff'),
    '--mm-panel-color': resolveColor(panelGroup.value.color, 'var(--lcms-color-text, #111827)'),
    '--mm-heading': resolveColor(panelGroup.value.heading_color, 'var(--lcms-color-dark, #111827)'),
    '--mm-plink': resolveColor(panelGroup.value.link_color, 'var(--lcms-color-text, #374151)'),
    '--mm-plink-hover': resolveColor(panelGroup.value['link_color:hover'], 'var(--lcms-color-primary, #556ee6)'),
    '--mm-desc': resolveColor(panelGroup.value.description_color, 'var(--lcms-color-muted, #6b7280)'),
    '--mm-icon': resolveColor(panelGroup.value.icon_color, 'var(--lcms-color-primary, #556ee6)'),
    '--mm-panel-radius': RADIUS[panelGroup.value.border_radius] || '12px',
    '--mm-panel-shadow': SHADOW[panelGroup.value.shadow] || SHADOW.lg,
    '--mm-panel-border': panelGroup.value.border === true ? `1px solid ${resolveColor(panelGroup.value.border_color, '#e5e7eb')}` : '0',
    '--mm-panel-pad': `${panelGroup.value.padding ?? 32}px`,
    '--mm-cols-gap': `${panelGroup.value.columns_gap ?? 32}px`,
    '--mm-plink-px': `${panelGroup.value.link_padding_x ?? 10}px`,
    '--mm-plink-py': `${panelGroup.value.link_padding_y ?? 8}px`,
    '--mm-plink-gap': `${panelGroup.value.link_gap ?? 2}px`,
    '--mm-plink-radius': LINK_RADIUS[panelGroup.value.link_radius] || '8px',
    '--mm-plink-size': `${panelGroup.value.link_font_size ?? 14}px`,
    '--mm-plink-bg-hover': panelGroup.value['link_background:hover'] ? resolveColor(panelGroup.value['link_background:hover'], 'transparent') : 'rgba(15, 23, 42, 0.04)',
    '--mm-mobile-bg': resolveColor(mobileGroup.value.background, '#ffffff'),
    '--mm-mobile-color': resolveColor(mobileGroup.value.color, 'var(--lcms-color-text, #111827)'),
    '--mm-mobile-w': `${mobileGroup.value.width ?? 360}px`,
    '--mm-hamburger': resolveColor(mobileGroup.value.hamburger_color || linkGroup.value.color, 'var(--lcms-color-text, #111827)')
  }
  // Scrolled-state colours (sticky sections): only set when configured.
  const sbar = barGroup.value['background:scrolled'] ? resolveColor(barGroup.value['background:scrolled'], '') : ''
  const slink = linkGroup.value['color:scrolled'] ? resolveColor(linkGroup.value['color:scrolled'], '') : ''
  const slogo = logoGroup.value['color:scrolled'] ? resolveColor(logoGroup.value['color:scrolled'], '') : ''
  if (sbar) vars['--mm-bar-bg-scrolled'] = sbar
  if (slink) vars['--mm-link-color-scrolled'] = slink
  if (slogo) vars['--mm-logo-color-scrolled'] = slogo
  return vars
})

const rootClasses = computed(() => [
  `mm--align-${barGroup.value.align || 'left'}`,
  `mm--width-${barGroup.value.width || 'container'}`,
  `mm--cta-${ctaPosition.value}`,
  `mm--hover-${linkGroup.value.hover_animation || 'underline'}`,
  `mm--anim-${panelGroup.value.animation || 'fade-down'}`,
  `mm--logo-${logoGroup.value.position || 'left'}`,
  `mm--bp-${configGroup.value.mobile_breakpoint || 'md'}`,
  `mm--mobile-${configGroup.value.mobile_mode || 'offcanvas-right'}`,
  `mm--mobile-anim-${mobileGroup.value.animation || 'slide'}`,
  `mm--trigger-${trigger.value}`,
  {
    'mm--divider': barGroup.value.divider === true,
    'mm--sticky': sticky.value,
    'mm--stuck': stuck.value,
    'mm--hidden': hidden.value,
    'mm--uppercase': linkGroup.value.uppercase === true,
    'mm--arrow': panelGroup.value.arrow !== false,
    'mm--mounted': mounted.value,
    'mm--drawer-open': drawerOpen.value,
    'mm--has-scrolled-logo': !!logoScrolledSrc.value,
    'is-scrolled': isScrolled.value
  }
])
</script>

<template>
  <div
    ref="root"
    class="lcms-mega-menu"
    :class="rootClasses"
    :style="[cssVars, spacerStyle]"
  >
    <div
      ref="stickyEl"
      class="mm-sticky"
    >
      <nav
        class="mm-bar"
        aria-label="Main"
      >
        <div class="mm-bar__inner">
          <!-- Logo -->
          <a
            v-if="hasLogo"
            class="mm-logo"
            href="/"
          >
            <template v-if="logoType === 'image'">
              <img
                :src="logoSrc"
                class="mm-logo__img mm-logo__img--default"
                alt=""
                loading="eager"
              >
              <img
                v-if="logoScrolledSrc"
                :src="logoScrolledSrc"
                class="mm-logo__img mm-logo__img--scrolled"
                alt=""
                loading="eager"
              >
            </template>
            <span
              v-else
              class="mm-logo__text"
            >{{ logoText }}</span>
          </a>

          <!-- Desktop items -->
          <ul
            v-for="(group, gi) in navGroups"
            :key="gi"
            class="mm-nav"
            :class="{ 'mm-nav--a': navGroups.length > 1 && gi === 0, 'mm-nav--b': gi === 1 }"
          >
            <li
              v-for="node in group"
              :key="node.id"
              class="mm-nav__li"
              :class="{ 'is-open': openId === String(node.id), 'has-panel': panelTypeOf(node) !== 'none', 'mm-nav__li--anchor': panelWidthOf(node) === 'auto' }"
              @mouseenter="onEnter(node)"
              @mouseleave="onLeave"
            >
              <a
                class="mm-item"
                :href="url(node)"
                :target="target(node)"
                :aria-expanded="panelTypeOf(node) !== 'none' ? openId === String(node.id) : undefined"
                :aria-haspopup="panelTypeOf(node) !== 'none' ? 'true' : undefined"
                @click="onClick(node, $event)"
              >
                <i
                  v-if="itemOf(node).show_icons !== false && icon(node)"
                  :class="icon(node)"
                  class="mm-item__icon"
                />
                <span class="mm-item__label">{{ label(node) }}</span>
                <span
                  v-if="badgeOf(node)"
                  class="mm-badge"
                  :style="{ background: badgeOf(node)!.color }"
                >{{ badgeOf(node)!.text }}</span>
                <i
                  v-if="showChevron && panelTypeOf(node) !== 'none'"
                  class="fa-solid fa-chevron-down mm-item__chevron"
                />
              </a>

              <!-- Panel -->
              <div
                v-if="panelTypeOf(node) !== 'none'"
                class="mm-panel"
                :class="[
                  `mm-panel--${panelTypeOf(node)}`,
                  `mm-panel--${panelWidthOf(node)}`,
                  itemOf(node).featured?.show ? `mm-panel--featured-${itemOf(node).featured?.position || 'right'}` : ''
                ]"
                :style="{ '--mm-cols': columnCountOf(node), '--mm-arrow-x': openId === String(node.id) ? `${arrowX}px` : undefined }"
              >
                <div class="mm-panel__inner">
                  <!-- Simple dropdown -->
                  <ul
                    v-if="panelTypeOf(node) === 'simple'"
                    class="mm-links"
                  >
                    <li
                      v-for="child in nodeChildren(node)"
                      :key="child.id"
                    >
                      <a
                        :href="url(child)"
                        :target="target(child)"
                        class="mm-link"
                      >
                        <i
                          v-if="itemOf(node).show_icons !== false && icon(child)"
                          :class="icon(child)"
                          class="mm-link__icon"
                        />
                        <img
                          v-else-if="itemOf(node).show_images && image(child)"
                          :src="image(child)"
                          class="mm-link__img"
                          alt=""
                          loading="lazy"
                        >
                        <span class="mm-link__body">
                          <span class="mm-link__label">{{ label(child) }}</span>
                          <span
                            v-if="itemOf(node).show_descriptions !== false && description(child)"
                            class="mm-link__desc"
                          >{{ description(child) }}</span>
                        </span>
                      </a>
                    </li>
                  </ul>

                  <!-- Mega: columns -->
                  <div
                    v-else
                    class="mm-columns"
                  >
                    <div
                      v-for="col in columnsOf(node)"
                      :key="col.node.id"
                      class="mm-col"
                    >
                      <a
                        :href="url(col.node)"
                        :target="target(col.node)"
                        class="mm-col__heading"
                      >
                        <i
                          v-if="itemOf(node).show_icons !== false && icon(col.node)"
                          :class="icon(col.node)"
                          class="mm-col__icon"
                        />
                        {{ label(col.node) }}
                      </a>
                      <span
                        v-if="itemOf(node).show_descriptions !== false && description(col.node) && !col.links.length"
                        class="mm-link__desc"
                      >{{ description(col.node) }}</span>
                      <ul
                        v-if="col.links.length"
                        class="mm-links"
                      >
                        <li
                          v-for="leaf in col.links"
                          :key="leaf.id"
                        >
                          <a
                            :href="url(leaf)"
                            :target="target(leaf)"
                            class="mm-link"
                          >
                            <i
                              v-if="itemOf(node).show_icons !== false && icon(leaf)"
                              :class="icon(leaf)"
                              class="mm-link__icon"
                            />
                            <img
                              v-else-if="itemOf(node).show_images && image(leaf)"
                              :src="image(leaf)"
                              class="mm-link__img"
                              alt=""
                              loading="lazy"
                            >
                            <span class="mm-link__body">
                              <span class="mm-link__label">{{ label(leaf) }}</span>
                              <span
                                v-if="itemOf(node).show_descriptions !== false && description(leaf)"
                                class="mm-link__desc"
                              >{{ description(leaf) }}</span>
                            </span>
                          </a>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <!-- Featured card -->
                  <a
                    v-if="itemOf(node).featured?.show"
                    class="mm-featured"
                    :class="{ 'mm-featured--empty': !itemOf(node).featured?.image }"
                    :style="itemOf(node).featured?.image ? { backgroundImage: `url(${itemOf(node).featured!.image})` } : {}"
                    :href="resolveLink(itemOf(node).featured?.button)"
                    :target="itemOf(node).featured?.button?.target_blank ? '_blank' : undefined"
                    :rel="itemOf(node).featured?.button?.target_blank ? 'noopener noreferrer' : undefined"
                  >
                    <span class="mm-featured__body">
                      <span
                        v-if="text(itemOf(node).featured?.title)"
                        class="mm-featured__title"
                      >{{ text(itemOf(node).featured?.title) }}</span>
                      <span
                        v-if="text(itemOf(node).featured?.text)"
                        class="mm-featured__text"
                      >{{ text(itemOf(node).featured?.text) }}</span>
                      <span
                        v-if="itemOf(node).featured?.button?.show !== false && text(itemOf(node).featured?.button?.text)"
                        class="mm-featured__btn"
                      >{{ text(itemOf(node).featured?.button?.text) }} <i class="fa-solid fa-arrow-right" /></span>
                    </span>
                  </a>
                </div>
              </div>
            </li>
          </ul>

          <a
            v-if="ctaShown"
            class="mm-cta"
            :class="ctaClasses"
            :style="ctaInlineStyle"
            :href="ctaHref"
            :target="ctaLink.target_blank ? '_blank' : undefined"
            :rel="ctaLink.target_blank ? 'noopener noreferrer' : undefined"
          >
            <span
              v-if="ctaIcon && ctaIconIsSvg && ctaIconPosition !== 'right'"
              class="mm-cta__icon"
              v-html="ctaIcon.slice(4)"
            />
            <i
              v-else-if="ctaIcon && ctaIconPosition !== 'right'"
              :class="ctaIcon"
              class="mm-cta__icon"
            />
            {{ text(ctaGroup.text) }}
            <span
              v-if="ctaIcon && ctaIconIsSvg && ctaIconPosition === 'right'"
              class="mm-cta__icon"
              v-html="ctaIcon.slice(4)"
            />
            <i
              v-else-if="ctaIcon && ctaIconPosition === 'right'"
              :class="ctaIcon"
              class="mm-cta__icon"
            />
          </a>

          <!-- Hamburger (visible below the breakpoint) -->
          <button
            type="button"
            class="mm-hamburger"
            :class="{ 'is-open': drawerOpen }"
            :aria-expanded="drawerOpen"
            aria-label="Menu"
            @click="toggleDrawer"
          >
            <span /><span /><span />
          </button>
        </div>
      </nav>
    </div>

    <!-- Mobile drawer -->
    <div
      class="mm-backdrop"
      @click="closeDrawer"
    />
    <div
      class="mm-drawer"
      :aria-hidden="!drawerOpen"
    >
      <ul class="mm-drawer__list">
        <li
          v-for="node in topNodes"
          :key="node.id"
          class="mm-drawer__item"
          :class="{ 'is-open': expanded[String(node.id)] }"
        >
          <div class="mm-drawer__row">
            <i
              v-if="itemOf(node).show_icons !== false && icon(node)"
              :class="icon(node)"
              class="mm-drawer__icon"
            />
            <a
              class="mm-drawer__label"
              :href="url(node)"
              :target="target(node)"
              @click="closeDrawer"
            >{{ label(node) }}</a>
            <span
              v-if="badgeOf(node)"
              class="mm-badge"
              :style="{ background: badgeOf(node)!.color }"
            >{{ badgeOf(node)!.text }}</span>
            <button
              v-if="panelTypeOf(node) !== 'none'"
              type="button"
              class="mm-drawer__toggle"
              :aria-expanded="!!expanded[String(node.id)]"
              @click.stop="toggleExpanded(String(node.id))"
            >
              <i class="fa-solid fa-chevron-down" />
            </button>
          </div>
          <ul
            v-if="panelTypeOf(node) !== 'none'"
            class="mm-drawer__sub"
          >
            <li
              v-for="child in nodeChildren(node)"
              :key="child.id"
            >
              <a
                class="mm-drawer__sublabel"
                :href="url(child)"
                :target="target(child)"
                @click="closeDrawer"
              >{{ label(child) }}</a>
              <ul v-if="nodeChildren(child).length">
                <li
                  v-for="leaf in nodeChildren(child)"
                  :key="leaf.id"
                >
                  <a
                    :href="url(leaf)"
                    :target="target(leaf)"
                    @click="closeDrawer"
                  >{{ label(leaf) }}</a>
                </li>
              </ul>
            </li>
            <li
              v-if="itemOf(node).featured?.show && itemOf(node).featured?.image"
            >
              <a
                class="mm-drawer__featured"
                :style="{ backgroundImage: `url(${itemOf(node).featured!.image})` }"
                :href="resolveLink(itemOf(node).featured?.button)"
                @click="closeDrawer"
              >{{ text(itemOf(node).featured?.title) }}</a>
            </li>
          </ul>
        </li>
      </ul>
      <div
        v-if="ctaShown"
        class="mm-drawer__cta"
      >
        <a
          :class="ctaClasses"
          :style="ctaInlineStyle"
          :href="ctaHref"
          :target="ctaLink.target_blank ? '_blank' : undefined"
          @click="closeDrawer"
        >{{ text(ctaGroup.text) }}</a>
      </div>
    </div>
  </div>
</template>
