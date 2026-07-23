<script setup lang="ts">
/**
 * Product Configurator Widget (E-commerce)
 *
 * Renders the product's `option_groups` from LessCommerce as a configurable UI:
 * - select / radio / image_swatches / color_swatches display types
 * - per-option price modifiers (fixed_price or percentage)
 * - conditional visibility (visible_when_option_uuids — OR semantics)
 * - running price total
 * - add-to-cart with selected options stored in cart item metadata
 */

import { computed, ref, onMounted, watch, inject, nextTick, type Ref } from 'vue'
import { useLanguage } from '../../../composables/useLanguage'
import { useStorefront } from '../../../composables/useStorefront'
import { useCart } from '../../../composables/useCart'
import { useCustomer } from '../../../composables/useCustomer'
import { useToast } from '../../../composables/useToast'
import { formatPrice } from '../../../utils/currency'
import { isVisible } from '../../../utils/visibility'
import type {
  StorefrontProduct,
  StorefrontProductOptionGroup,
  StorefrontProductOption,
  StorefrontPluginBehavior,
  StorefrontProductFlow,
  StorefrontOptionUpload,
} from '../../../api/storefront'

// Resolves `var:<color>` refs to the runtime CSS variable, mirroring what
// LcmsForm does. Project-level input styles use the same `var:name` shape.
function resolveColor(val: string | null | undefined): string | null {
  if (!val || typeof val !== 'string') return null
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

interface ResolvedRoute {
  pageCode: string
  pageUuid: string
  params: Record<string, string>
  isHomepage: boolean
}

defineOptions({ inheritAttrs: false })

interface Props {
  data: Record<string, any>
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const { extractValue } = useLanguage(props.language)
const { client, isAvailable } = useStorefront()
const cart = useCart()
const customer = useCustomer()
const toast = useToast()
const projectConfig = inject<Ref<any> | null>('lesscms-project-config', null)
const resolvedRoute = inject<Ref<ResolvedRoute | null> | null>('routeParams', null)
const injectedProduct = inject<Ref<any> | null>('lcms-product', null)

const config = computed(() => props.data?.config || {})
const heading = computed(() => props.data?.heading || {})
const groupLabel = computed(() => props.data?.group_label || {})
const optionStyle = computed(() => props.data?.option || {})
const priceSummary = computed(() => props.data?.price_summary || {})
const addToCartButton = computed(() => props.data?.add_to_cart_button || {})
const buttonStyle = computed(() => addToCartButton.value.style || 'primary')
const buttonSize = computed(() => addToCartButton.value.size || 'md')
const buttonBorderRadius = computed(() => addToCartButton.value.border_radius || 'md')
const buttonPadding = computed(() => addToCartButton.value.padding || '')
const buttonIcon = computed(() => addToCartButton.value.icon || '')
const buttonIconPosition = computed(() => addToCartButton.value.icon_position || 'left')

// Reuses the global .lcms-button__link--{variant} / --size-{size} classes
// from styles/widgets.css so the add-to-cart button stays visually consistent
// with regular LcmsButton and picks up project color theming (--lcms-color-*)
// automatically without hardcoded hex values.
const buttonClass = computed(() => [
  'lcms-product-configurator__button',
  'lcms-button__link',
  `lcms-button__link--${buttonStyle.value}`,
  `lcms-button__link--size-${buttonSize.value}`
])

// Back button on the summary step shares the CTA's size/padding/radius
// classes so the two visually match in the same row — the small floating
// nav-btn-secondary used to dwarf next to a full-width CTA.
const backButtonClass = computed(() => [
  'lcms-product-configurator__back-btn',
  'lcms-button__link',
  'lcms-button__link--outline',
  `lcms-button__link--size-${buttonSize.value}`
])

const RADIUS_MAP: Record<string, string> = {
  none: '0', sm: '4px', md: '8px', lg: '12px', pill: '50px'
}
const buttonInlineStyle = computed(() => {
  const styles: Record<string, string> = {}
  if (buttonBorderRadius.value) {
    styles.borderRadius = RADIUS_MAP[buttonBorderRadius.value] || `${buttonBorderRadius.value}px`
  }
  if (buttonPadding.value) styles.padding = `${buttonPadding.value}px`
  return styles
})

const showHeading = computed(() => config.value.show_heading !== false)
const showPriceSummary = computed(() => config.value.show_price_summary !== false)
const showRequiredBadge = computed(() => config.value.show_required_badge !== false)
const showOptionPrices = computed(() => config.value.show_option_prices !== false)
const swatchSize = computed<'sm' | 'md' | 'lg'>(() => {
  const s = config.value.swatch_size
  return s === 'sm' || s === 'lg' ? s : 'md'
})
const swatchColumns = computed<number>(() => {
  const n = Number(config.value.swatch_columns)
  return Number.isFinite(n) && n >= 1 ? Math.min(n, 8) : 2
})
const radioColumns = computed<number>(() => {
  const explicit = Number(config.value.radio_columns)
  if (Number.isFinite(explicit) && explicit >= 1) return Math.min(explicit, 6)
  // Unset → inherit swatch_columns. Most projects want radios laid out the
  // same way as image/colour swatches (DG-Lab feedback 2026-05-08), so a
  // sensible default beats a per-page tweak.
  const swatch = Number(config.value.swatch_columns)
  return Number.isFinite(swatch) && swatch >= 1 ? Math.min(swatch, 6) : 2
})

const swatchImageMaxHeight = computed<string | null>(() => {
  const n = Number(config.value.swatch_image_max_height)
  return Number.isFinite(n) && n > 0 ? `${n}px` : null
})
// Apply the cap to the BUTTON, not just the inner <img>. The default size
// class fixes the button at 4.5rem × 4.5rem, so capping the img alone is a
// no-op (the button is already smaller than any sane cap value). Capping the
// button + width:100% lets the image grow with the grid cell up to the
// configured cap. Both max-width and max-height are needed: the grid CSS sets
// `aspect-ratio: 1/1` plus `width: 100%`, so capping height alone leaves a
// rectangle (browsers don't auto-shrink width when only max-height clamps).
const swatchImgButtonStyle = computed<Record<string, string>>(() => (
  swatchImageMaxHeight.value
    ? {
        width: '100%',
        height: 'auto',
        maxWidth: swatchImageMaxHeight.value,
        maxHeight: swatchImageMaxHeight.value,
      }
    : {}
))
const swatchImgStyle = computed<Record<string, string>>(() => (
  swatchImageMaxHeight.value
    ? { maxHeight: swatchImageMaxHeight.value, objectFit: 'contain' }
    : {}
))

// Radio container grid style — clamps user's radio_columns to count of visible
// options so a group with 2 options on a 3-col setting doesn't render an empty
// trailing cell.
function radioGridStyle(group: StorefrontProductOptionGroup): Record<string, string> {
  const visible = visibleOptionsOf(group, selectedSet.value).length
  if (visible <= 1 || radioColumns.value <= 1) return {}
  const cols = Math.max(1, Math.min(radioColumns.value, visible))
  // minmax(0, 1fr): plain 1fr has min = content width, so an unbreakable chip
  // ("30×20 pionowy +51 zł") pushes the whole grid past the viewport on
  // mobile. The column COUNT goes through a CSS var so the ≤640px media query
  // below can cap it — a media query can't beat an inline template otherwise.
  return {
    display: 'grid',
    '--lcms-pc-grid-cols': String(cols),
    gridTemplateColumns: 'repeat(var(--lcms-pc-grid-cols), minmax(0, 1fr))',
  }
}
// Display mode = single source of truth for how the configurator paints groups:
//   'grouped' (default) — each group as a labeled section, group-by-group flow
//   'flat'              — same controls, no group headings, one continuous list
//   'wizard'            — one group per step, prev/next buttons + progress
// Legacy back-compat: pages saved before the display_mode migration carry
// `wizard_mode: true/false` instead. We honor it here — without this fallback
// every old wizard-mode page silently regresses to 'grouped' on first render
// (and the editor preselects 'wizard' from the same legacy flag, so admins
// see the right setting and assume it's working, but the storefront paints flat).
const displayMode = computed<'flat' | 'grouped' | 'wizard'>(() => {
  const m = config.value.display_mode
  if (m === 'flat' || m === 'wizard' || m === 'grouped') return m
  if (config.value.wizard_mode === true) return 'wizard'
  return 'grouped'
})
const wizardMode = computed(() => displayMode.value === 'wizard')
const showProgress = computed(() => config.value.show_progress !== false)
const showStepCount = computed(() => config.value.show_step_count !== false)
const slugSource = computed(() => config.value.slug_source || 'url')
const slugUrlSegment = computed(() => Number(config.value.slug_url_segment ?? 2))
const staticSlug = computed(() => config.value.slug || '')

const currency = computed(() => projectConfig?.value?.commerce?.currency || 'PLN')

// Project-level input style defaults (padding, colors, border) — same source
// as LcmsForm uses. Selects and text/numeric inputs inherit these so the
// configurator matches every other form surface in the project.
const projectInputStyles = computed(() => projectConfig?.value?.styles || {})

const inputInlineStyle = computed<Record<string, string>>(() => {
  const s = projectInputStyles.value
  const styles: Record<string, string> = {}
  if (s.input_padding) styles.padding = `${s.input_padding}px`
  const bg = resolveColor(s.input_background_color)
  if (bg) styles.backgroundColor = bg
  const text = resolveColor(s.input_text_color)
  if (text) styles.color = text
  if (s.input_border_color || s.input_border_width || s.input_border_style) {
    const w = s.input_border_width ? `${s.input_border_width}px` : '1px'
    const st = s.input_border_style || 'solid'
    const c = resolveColor(s.input_border_color) || 'var(--lcms-color-border, #d1d5db)'
    styles.border = `${w} ${st} ${c}`
  }
  return styles
})

const inputFocusVars = computed<Record<string, string>>(() => {
  const s = projectInputStyles.value
  const vars: Record<string, string> = {}
  const focus = resolveColor(s.input_focus_border_color)
  if (focus) vars['--lcms-pc-input-focus'] = focus
  const placeholder = resolveColor(s.input_placeholder_color)
  if (placeholder) vars['--lcms-pc-input-placeholder'] = placeholder
  return vars
})

const product = ref<StorefrontProduct | null>(null)
const isLoading = ref(false)
const fetchError = ref<string | null>(null)
const isAdding = ref(false)

const effectiveProduct = computed<StorefrontProduct | null>(() => {
  const injected = injectedProduct?.value
  if (injected) return injected
  return product.value
})

const resolvedSlug = computed(() => {
  if (slugSource.value === 'static') return staticSlug.value
  const routeVal = resolvedRoute?.value
  if (routeVal?.params?.slug) return routeVal.params.slug
  if (typeof window === 'undefined') return ''
  const segments = window.location.pathname.split('/').filter(Boolean)
  return segments[slugUrlSegment.value] || ''
})

const t = (key: string, params?: Record<string, string | number>) => {
  const lang = props.language || 'pl'
  const dict: Record<string, Record<string, string>> = {
    pl: {
      loading: 'Ładowanie...',
      notFound: 'Produkt nie znaleziony',
      required: '*',
      selectPlaceholder: 'Wybierz...',
      addedToCart: 'Dodano do koszyka',
      addError: 'Nie udało się dodać do koszyka',
      defaultHeading: 'Skonfiguruj produkt',
      defaultButton: 'Dodaj do koszyka',
      defaultTotal: 'Razem:',
      fillRequired: 'Uzupełnij wymagane opcje',
      filePickButton: 'Wybierz pliki',
      fileDropHint: 'lub przeciągnij i upuść',
      fileInvalidExt: 'Plik {name} ma niedozwolone rozszerzenie',
      fileTooLarge: 'Plik {name} jest większy niż {max} KB',
      fileTooMany: 'Maksymalnie {count} plików',
      fileUploading: 'Wgrywanie...',
      fileUploadFailed: 'Nie udało się wgrać pliku',
      fileRemove: 'Usuń',
      stepBack: 'Wstecz',
      stepNext: 'Dalej',
      stepSummary: 'Podsumowanie',
      step: 'Krok',
      of: 'z',
      zoomThumb: 'Kliknij, aby powiększyć',
    },
    en: {
      loading: 'Loading...',
      notFound: 'Product not found',
      required: '*',
      selectPlaceholder: 'Select...',
      addedToCart: 'Added to cart',
      addError: 'Failed to add to cart',
      defaultHeading: 'Configure your product',
      defaultButton: 'Add to cart',
      defaultTotal: 'Total:',
      fillRequired: 'Please fill in required options',
      filePickButton: 'Pick files',
      fileDropHint: 'or drag and drop',
      fileInvalidExt: 'File {name} has a disallowed extension',
      fileTooLarge: 'File {name} is larger than {max} KB',
      fileTooMany: 'Maximum {count} files',
      fileUploading: 'Uploading...',
      fileUploadFailed: 'Upload failed',
      fileRemove: 'Remove',
      stepBack: 'Back',
      stepNext: 'Next',
      stepSummary: 'Summary',
      step: 'Step',
      of: 'of',
      zoomThumb: 'Click to zoom',
    },
  }
  let value = dict[lang]?.[key] || dict.pl[key] || key
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
    }
  }
  return value
}

const headingText = computed(() =>
  extractValue(heading.value.text) || t('defaultHeading')
)
const headingTag = computed(() => heading.value.tag || 'h3')
const buttonText = computed(() =>
  extractValue(addToCartButton.value.text) || t('defaultButton')
)
const totalLabelText = computed(() =>
  extractValue(priceSummary.value.label_text) || t('defaultTotal')
)

// Sort groups by sort_order and filter out inactive ones
const allGroups = computed<StorefrontProductOptionGroup[]>(() => {
  const p = effectiveProduct.value
  if (!p?.option_groups?.length) return []
  return [...p.option_groups].sort((a, b) => a.sort_order - b.sort_order)
})

// Selected option state: group_uuid -> option_uuid (for select/radio/swatches)
const selectedOptions = ref<Record<string, string>>({})
// Free-form value state: group_uuid -> string/number/boolean (text/numeric/checkbox groups)
const customValues = ref<Record<string, string | number | boolean>>({})
// File-upload state: group_uuid -> list of uploaded files
const fileUploads = ref<Record<string, StorefrontOptionUpload[]>>({})
// Per-group upload progress / error
const fileUploadStatus = ref<Record<string, { uploading: boolean; error: string | null }>>({})

// Wizard-mode navigation state. Only used when displayMode = 'wizard'; flat
// and grouped modes ignore these refs entirely. We keep the same selection/
// upload/customValue state shapes — wizard just paginates over visibleGroups.
const currentStep = ref(0)
const showSummary = ref(false)

// Persisted-state TTL: long enough to survive an auth round-trip (register
// flow can take several minutes if the user fumbles email confirmation,
// password rules, etc.) but short enough that returning to the page hours
// later doesn't surprise the user with stale selections.
const PERSISTED_STATE_TTL_MS = 30 * 60 * 1000
function persistedStateKey(productUuid: string) {
  return `lcms-pc-state:${productUuid}`
}

function loadPersistedState(productUuid: string): {
  selectedOptions: Record<string, string>
  customValues: Record<string, string | number | boolean>
  fileUploads: Record<string, StorefrontOptionUpload[]>
  pendingBehavior: boolean
} | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(persistedStateKey(productUuid))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    if (typeof parsed.savedAt !== 'number' || Date.now() - parsed.savedAt > PERSISTED_STATE_TTL_MS) {
      window.localStorage.removeItem(persistedStateKey(productUuid))
      return null
    }
    return {
      selectedOptions: parsed.selectedOptions || {},
      customValues: parsed.customValues || {},
      fileUploads: parsed.fileUploads || {},
      pendingBehavior: !!parsed.pendingBehavior,
    }
  } catch {
    return null
  }
}

// pendingBehavior signals "user clicked the behavior CTA but got bounced to
// login first" — after login + state restore the configurator should fire
// the CTA again automatically instead of forcing the user to click twice.
function savePersistedState(productUuid: string, options: { pendingBehavior?: boolean } = {}) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(persistedStateKey(productUuid), JSON.stringify({
      savedAt: Date.now(),
      selectedOptions: selectedOptions.value,
      customValues: customValues.value,
      fileUploads: fileUploads.value,
      pendingBehavior: !!options.pendingBehavior,
    }))
  } catch {
    /* quota exceeded or storage disabled — silent fail, user just loses state */
  }
}

function clearPersistedState(productUuid: string) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(persistedStateKey(productUuid))
  } catch {
    /* noop */
  }
}

// Strip `lcms_pending_action=1` from the current URL and notify any
// listener (e.g. app.vue) that the redirect overlay should be dismissed.
// Used after a successful or failed auto-fire on return from login: the
// marker is single-use and a stale value would keep the overlay forever.
function dismissPendingActionMarker() {
  if (typeof window === 'undefined') return
  try {
    const url = new URL(window.location.href)
    if (url.searchParams.has('lcms_pending_action')) {
      url.searchParams.delete('lcms_pending_action')
      const next = url.pathname + (url.search || '') + (url.hash || '')
      window.history.replaceState(null, '', next)
    }
    window.dispatchEvent(new Event('lcms:redirect-action-done'))
  } catch {
    /* noop */
  }
}

// Tracks the productUuid we've already initialized defaults+restore for.
// Without this, any re-evaluation of `allGroups` (e.g. a re-render that
// produces a new sorted array reference) would re-run the watcher, find
// no persisted state (cleared on the first run) and wipe the user's
// in-progress selections back to defaults. The auth-gated CTA round-trip
// was the visible failure case: state restored fine, then a second
// watcher fire reset it to defaults before the user saw anything.
const initializedForProductUuid = ref<string | null>(null)

// Apply default selections when product loads, then overlay any persisted
// selections from a previous session of this same product. The persistence
// path matters for the auth-gated plugin CTA flow: clicking the CTA while
// logged out navigates to /konto, and without persistence the user comes
// back to an empty configurator after register.
watch(
  allGroups,
  (groups) => {
    const currentProductUuid = effectiveProduct.value?.uuid || null
    if (currentProductUuid && initializedForProductUuid.value === currentProductUuid) {
      return
    }

    const nextSelected: Record<string, string> = {}
    const nextCustom: Record<string, string | number | boolean> = {}
    const nextFiles: Record<string, StorefrontOptionUpload[]> = {}
    for (const group of groups) {
      if (group.display_type === 'numeric') {
        nextCustom[group.uuid] = group.numeric_min ?? 0
      } else if (isTextType(group)) {
        nextCustom[group.uuid] = ''
      } else if (group.display_type === 'checkbox') {
        nextCustom[group.uuid] = false
      } else if (group.display_type === 'file') {
        nextFiles[group.uuid] = fileUploads.value[group.uuid] || []
      } else {
        // For <select> always sync state with what the browser displays
        // (first option when no is_default is set) — otherwise `isGroupVisible`
        // for conditional groups misses the implicit first-option selection.
        const defaultOpt = group.options.find((o) => o.is_default)
          || (group.display_type === 'select' ? group.options[0] : null)
        if (defaultOpt) nextSelected[group.uuid] = defaultOpt.uuid
      }
    }

    // Overlay persisted state on top of defaults. We only restore values for
    // groups that still exist on the product (in case the product was edited
    // server-side since the state was saved). The persisted file uploads keep
    // their server-side UUIDs, so the BE-side OptionUpload claim survives.
    const productUuid = effectiveProduct.value?.uuid
    const persisted = productUuid ? loadPersistedState(productUuid) : null
    if (persisted) {
      const validGroupUuids = new Set(groups.map((g) => g.uuid))
      for (const [uuid, optUuid] of Object.entries(persisted.selectedOptions)) {
        if (validGroupUuids.has(uuid)) nextSelected[uuid] = optUuid
      }
      for (const [uuid, val] of Object.entries(persisted.customValues)) {
        if (validGroupUuids.has(uuid)) nextCustom[uuid] = val
      }
      for (const [uuid, files] of Object.entries(persisted.fileUploads)) {
        if (validGroupUuids.has(uuid)) nextFiles[uuid] = files
      }
      // Clear after restore — if the user reloads later we don't want to
      // re-apply stale selections that they explicitly cleared.
      if (productUuid) clearPersistedState(productUuid)
    }

    selectedOptions.value = nextSelected
    customValues.value = nextCustom
    fileUploads.value = nextFiles
    currentStep.value = 0
    showSummary.value = false
    // Only lock the watcher to this productUuid once the product is fully
    // loaded (has option groups). An early fire with `{uuid, option_groups: []}`
    // would otherwise prevent a later fire-with-groups from running the
    // restore path.
    if (currentProductUuid && groups.length > 0) {
      initializedForProductUuid.value = currentProductUuid
    }

    // If the persisted state was saved while bouncing the user to login for
    // a behavior CTA, resume that CTA now that they're back. Without this
    // the user has to click "Zaprojektuj u nas" twice — once before login,
    // once after — which is what `proces zakupowy jest dalej zjebany`
    // looked like end-user side.
    if (persisted?.pendingBehavior && typeof window !== 'undefined') {
      void (async () => {
        try {
          await customer.init()
          if (customer.isAuthenticated.value) {
            await handleBehaviorAction()
          }
        } finally {
          // If we didn't navigate away (auth failed, API error, missing
          // required option after restore), drop the redirect overlay so
          // the user can see the configurator UI again. Same handler also
          // covers the no-op case: configurator hydrated, no pending
          // behavior left, but URL still carries the marker.
          dismissPendingActionMarker()
        }
      })()
    } else if (typeof window !== 'undefined') {
      // No pending behavior to fire — if the URL still has the marker
      // (stale tab, manual refresh after the overlay was dismissed once,
      // etc.), drop it so the overlay disappears immediately.
      dismissPendingActionMarker()
    }
  },
  { immediate: true }
)

// Conditional visibility: empty `visible_when_option_uuids` = always visible.
// Otherwise the group shows when ANY of the listed option UUIDs is currently
// selected (OR semantics — matches the admin UI which lets users pick multiple
// trigger options across the parent group).
//
// We must walk groups in sort_order and only count selections from groups that
// are themselves visible. Otherwise a hidden parent's auto-selected first
// `<select>` option would still satisfy a child group's condition and leak it
// into the UI (e.g. "Sposób dostarczenia plików" is hidden but its default
// "Zalamo Event" selection would falsely reveal "Link do albumu").
// Visible options of a group, filtered by per-option visibility rule against
// the running selection set. Hidden options are dropped from the rendered list.
function visibleOptionsOf(
  group: StorefrontProductOptionGroup,
  selected: Set<string>,
): StorefrontProductOption[] {
  return (group.options || []).filter((opt) => isVisible(opt as any, selected))
}

// Synthetic UUIDs for non-options group types, used by visibility rules.
// Convention shared with useRuleGraph.flattenOptions in lesscommerce/fe so
// the rule editor's chip UUIDs round-trip into the runtime evaluator.
//   checkbox          → ${uuid}__yes / ${uuid}__no
//   numeric|text|file → ${uuid}__set / ${uuid}__unset
function syntheticVisibilityIdFor(group: StorefrontProductOptionGroup): string | null {
  if (group.display_type === 'checkbox') {
    return `${group.uuid}__${customValues.value[group.uuid] === true ? 'yes' : 'no'}`
  }
  if (group.display_type === 'numeric') {
    const v = Number(customValues.value[group.uuid] ?? NaN)
    return `${group.uuid}__${Number.isFinite(v) && v !== 0 ? 'set' : 'unset'}`
  }
  if (isTextType(group) || group.display_type === 'file') {
    const filled = !!String(customValues.value[group.uuid] ?? '').trim()
    return `${group.uuid}__${filled ? 'set' : 'unset'}`
  }
  return null
}

// Visibility resolves via fixed-point iteration so a group's rule can reference
// any other group regardless of sort_order. Previous incremental build only let
// rules reference earlier groups, which silently broke setups like "Kolor
// koszyczka" gated on a later "Pudełko Woodenbox › TAK" checkbox. Caps at 8
// passes — way more than any realistic dependency chain.
const visibleGroups = computed<StorefrontProductOptionGroup[]>(() => {
  let prevVisible = new Set<string>(allGroups.value.map((g) => g.uuid))
  let result: StorefrontProductOptionGroup[] = []
  for (let pass = 0; pass < 8; pass++) {
    const selections = new Set<string>()
    for (const group of allGroups.value) {
      if (!prevVisible.has(group.uuid)) continue
      const sel = selectedOptions.value[group.uuid]
      if (sel) selections.add(sel)
      const synth = syntheticVisibilityIdFor(group)
      if (synth) selections.add(synth)
    }
    result = []
    const nextVisible = new Set<string>()
    for (const group of allGroups.value) {
      if (!isVisible(group as any, selections)) continue
      result.push(group)
      nextVisible.add(group.uuid)
    }
    if (nextVisible.size === prevVisible.size && [...nextVisible].every((u) => prevVisible.has(u))) {
      break
    }
    prevVisible = nextVisible
  }
  return result
})

// Selection set built from currently-visible groups — used by per-option rules.
// Non-options groups contribute their synthetic UUID (see syntheticVisibilityIdFor).
const selectedSet = computed(() => {
  const set = new Set<string>()
  for (const g of visibleGroups.value) {
    const s = selectedOptions.value[g.uuid]
    if (s) set.add(s)
    const synth = syntheticVisibilityIdFor(g)
    if (synth) set.add(synth)
  }
  return set
})

// --- Wizard navigation -----------------------------------------------------
// Wizard step structure lives w konfiguratorze (commerce): grupa może mieć
// `wizard_step` (etykietę) — grupy z tą samą etykietą zlepione są w jeden krok
// w kolejności pojawienia się w `visibleGroups` (czyli wg sort_order). Grupa
// bez wizard_step idzie jako osobny krok (legacy behavior — 1 group = 1 step).

interface EffectiveStep {
  /** Etykieta kroku — null jeśli krok to "samotna" grupa bez wizard_step. */
  label: string | null
  groups: StorefrontProductOptionGroup[]
}

const effectiveSteps = computed<EffectiveStep[]>(() => {
  const steps: EffectiveStep[] = []
  const labelToIndex = new Map<string, number>()
  for (const g of visibleGroups.value) {
    const rawLabel = g.wizard_step
    const label = typeof rawLabel === 'string' && rawLabel.trim() ? rawLabel.trim() : null
    if (label !== null && labelToIndex.has(label)) {
      steps[labelToIndex.get(label)!].groups.push(g)
    } else {
      const idx = steps.push({ label, groups: [g] }) - 1
      if (label !== null) labelToIndex.set(label, idx)
    }
  }
  return steps
})

const totalSteps = computed(() => effectiveSteps.value.length)
const currentStepData = computed<EffectiveStep | null>(
  () => effectiveSteps.value[currentStep.value] || null
)
const currentStepGroups = computed<StorefrontProductOptionGroup[]>(
  () => currentStepData.value?.groups || []
)
const isFirstStep = computed(() => currentStep.value === 0)
const isLastStep = computed(() => currentStep.value >= totalSteps.value - 1)
const progressPercent = computed(() => {
  if (totalSteps.value === 0) return 0
  if (showSummary.value) return 100
  return Math.round(((currentStep.value + 1) / totalSteps.value) * 100)
})

watch(effectiveSteps, (steps) => {
  if (currentStep.value > steps.length - 1) {
    currentStep.value = Math.max(0, steps.length - 1)
  }
})

function isGroupValid(g: StorefrontProductOptionGroup): boolean {
  if (!g.is_required) return true
  if (isTextType(g)) {
    return !!String(customValues.value[g.uuid] ?? '').trim()
  }
  if (g.display_type === 'numeric') {
    const v = Number(customValues.value[g.uuid] ?? NaN)
    return !isNaN(v) && (g.numeric_min == null || v >= g.numeric_min)
  }
  if (g.display_type === 'file') {
    return (fileUploads.value[g.uuid] || []).length > 0
  }
  if (g.display_type === 'checkbox') {
    return customValues.value[g.uuid] === true
  }
  return !!selectedOptions.value[g.uuid]
}

// After a step change the viewport can be left far below the (now shorter)
// step — mostly on mobile, where a long step pushes "Dalej" way down. Snap
// back to the top of the configurator, but only when it's scrolled out of
// view so desktop users mid-viewport don't get yanked around.
const rootEl = ref<HTMLElement | null>(null)

function scrollToConfiguratorTop() {
  if (typeof window === 'undefined') return
  nextTick(() => {
    const el = rootEl.value
    if (!el) return
    if (el.getBoundingClientRect().top < 0) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  })
}

function goNextStep() {
  for (const g of currentStepGroups.value) {
    if (!isGroupValid(g)) {
      toast.error(t('fillRequired'))
      return
    }
  }
  if (isLastStep.value) {
    showSummary.value = true
    scrollToConfiguratorTop()
    return
  }
  currentStep.value += 1
  scrollToConfiguratorTop()
}

function goPrevStep() {
  if (showSummary.value) {
    showSummary.value = false
    scrollToConfiguratorTop()
    return
  }
  if (currentStep.value > 0) {
    currentStep.value -= 1
    scrollToConfiguratorTop()
  }
}

// What the loop renders. Wizard step view shows the current step's groups;
// classic and wizard summary both show the full list (summary just hides the
// inputs via a separate v-if branch in the template).
const groupsToShow = computed<StorefrontProductOptionGroup[]>(() => {
  if (wizardMode.value && !showSummary.value) {
    return currentStepGroups.value
  }
  return visibleGroups.value
})

// For visual option groups (image/color swatches, or any select-type whose
// chosen option carries a thumbnail/color), expose the visual so the wizard
// summary can render a small clickable preview alongside the option name.
// Returns null for non-visual or unselected groups so the template falls back
// to plain text rendering.
function groupSummaryVisual(g: StorefrontProductOptionGroup): { thumbnail: string | null; color_hex: string | null; name: string } | null {
  if (isTextType(g) || g.display_type === 'numeric' || g.display_type === 'checkbox' || g.display_type === 'file') {
    return null
  }
  const sel = selectedOptions.value[g.uuid]
  if (!sel) return null
  const opt = g.options.find((o) => o.uuid === sel)
  if (!opt) return null
  if (!opt.thumbnail && !opt.color_hex) return null
  return { thumbnail: opt.thumbnail, color_hex: opt.color_hex, name: opt.name }
}

// Lightbox state for summary thumbnails. Holds either a thumbnail URL or a
// `color:#hex` sentinel — the overlay template branches on the prefix.
const lightbox = ref<string | null>(null)
// Thumbnails come through the image-proxy as ?w=200 — swap to the w=1200
// preset for the lightbox so the enlarged image is sharp, not an upscale.
function openLightboxImage(url: string) {
  lightbox.value = url.replace(/([?&])w=\d+/, '$1w=1200')
}
function openLightboxColor(hex: string) { lightbox.value = `color:${hex}` }
function closeLightbox() { lightbox.value = null }

// Resolves the human-readable summary text for a group based on current state.
// Used by the wizard summary list.
function groupSummaryValue(g: StorefrontProductOptionGroup): string {
  if (isTextType(g)) return String(customValues.value[g.uuid] ?? '') || '—'
  if (g.display_type === 'numeric') {
    const v = customValues.value[g.uuid]
    return v === undefined || v === null || v === '' ? '—' : String(v)
  }
  if (g.display_type === 'checkbox') {
    return customValues.value[g.uuid] === true ? (g.checkbox_label || 'TAK') : '—'
  }
  if (g.display_type === 'file') {
    const ups = fileUploads.value[g.uuid] || []
    if (!ups.length) return '—'
    return ups.map((u) => u.original_filename).join(', ')
  }
  const sel = selectedOptions.value[g.uuid]
  if (!sel) return '—'
  return g.options.find((o) => o.uuid === sel)?.name || '—'
}

// Per-option surcharge — walk price_modifier_overrides top-to-bottom, first
// whose `when` matches the current selection wins (empty conditions / empty
// AND row = always matches). When no rule matches, the scalar
// price_modifier_value applies as the default — that's the contract promised
// by the admin UI ("first matching rule wins, otherwise the default").
// Percent rules resolve against the product base price.
// (`price_modifier_type` was dropped in BE migration 2026_05_05; the scalar
// value alone is additive, negative = subtract.)
function effectiveOptionModifier(option: StorefrontProductOption): number {
  const overrides = option.price_modifier_overrides || []
  const sel = selectedSet.value
  for (const ov of overrides) {
    const andGroups = ov?.when?.and_groups || []
    const matches = andGroups.length === 0
      ? true
      : andGroups.every((row) => row.length === 0 || row.some((uuid) => sel.has(uuid)))
    if (!matches) continue
    return applyOverride(0, Number(ov.value) || 0, ov.type, basePrice.value)
  }
  const v = option.price_modifier_value
  if (v === null || v === undefined) return 0
  return Number(v) || 0
}

const basePrice = computed(() => {
  const p = effectiveProduct.value
  return p ? Number(p.price) || 0 : 0
})

// Apply a price-override row to a base value. Shared by numeric per-unit
// resolution and checkbox surcharge resolution. Override types:
//   - add / subtract: fixed amount applied to `base`
//   - absolute: replace base entirely
//   - add_percent / subtract_percent: percent of `percentBase`
//
// `percentBase` decouples the percent reference from the additive base — for
// checkbox surcharges the user expects "subtract 50%" to mean 50% of the
// product price, not 50% of the (often zero) checkbox surcharge default.
// For numeric per-unit rate the percent base stays the unit price itself.
function applyOverride(base: number, value: number, type: string | undefined, percentBase: number): number {
  switch (type) {
    case 'add': return base + value
    case 'subtract': return base - value
    case 'add_percent': return base + (percentBase * value / 100)
    case 'subtract_percent': return base - (percentBase * value / 100)
    case 'absolute':
    default: return value // fallback treats undefined as absolute (legacy shape)
  }
}

// Walk price_per_unit_overrides top-to-bottom; first whose `when` matches
// (or has no conditions = always matches) wins. Pure rules model — admin
// adds at minimum one catch-all rule for the base rate. Legacy back-compat:
// when no overrides[] exist at all, fall back to scalar group.price_per_unit
// so shops mid-migration keep working until they convert to rules.
function effectivePricePerUnit(group: StorefrontProductOptionGroup): number {
  const overrides = group.price_per_unit_overrides || []
  if (!overrides.length) return Number(group.price_per_unit ?? 0) || 0
  const sel = selectedSet.value
  for (const ov of overrides) {
    const andGroups = ov?.when?.and_groups || []
    const matches = andGroups.length === 0
      ? true
      : andGroups.every((row) => row.length === 0 || row.some((uuid) => sel.has(uuid)))
    if (!matches) continue
    // Rules operate on 0, not the legacy scalar. "Add 100" means +100 PLN,
    // not scalar + 100 — otherwise old shops with leftover scalar=50 would
    // see surprise math when adding their first rule.
    return applyOverride(0, Number(ov.value) || 0, ov.type, 0)
  }
  return 0
}

// Numeric: ile jednostek faktycznie naliczamy. Pierwsze `price_free_units`
// są wliczone w cenę bazową (gratis); płatna jest tylko nadwyżka.
// Brak/0 = naliczaj od pierwszej jednostki (zachowanie sprzed progu).
function billableQty(group: StorefrontProductOptionGroup, qty: number): number {
  const free = Math.max(0, Number(group.price_free_units ?? 0) || 0)
  return Math.max(0, qty - free)
}

// Krótka adnotacja „N w cenie" przy stawce, gdy część jednostek jest gratis.
function freeUnitsHint(group: StorefrontProductOptionGroup): string {
  const free = Math.max(0, Number(group.price_free_units ?? 0) || 0)
  return free > 0 ? `${free} w cenie` : ''
}

// First override row whose `when.and_groups` matches the current selection.
// Empty conditions count as a match (acts as the catch-all / "always" rule).
// Returns the matched override row, or null when none of the rules match.
function matchedCheckboxOverride(group: StorefrontProductOptionGroup): any | null {
  const overrides = group.checkbox_price_overrides || []
  if (!overrides.length) return null
  const sel = selectedSet.value
  for (const ov of overrides) {
    const andGroups = ov?.when?.and_groups || []
    const matches = andGroups.length === 0
      ? true
      : andGroups.every((row) => row.length === 0 || row.some((uuid) => sel.has(uuid)))
    if (!matches) continue
    return ov
  }
  return null
}

// Non-percent contribution of a checkbox group — used when computing the
// percentBase for other percent-based modifiers, to break the recursion
// "% off everything" ↔ "everything includes the other %". Percent overrides
// collapse to 0 (their effect lives in the percent reference, not here).
//
// Rules-only mode: no scalar base; checkbox surcharge comes purely from the
// matched override. Legacy back-compat: when no overrides[] exist at all,
// fall back to scalar group.checkbox_price_modifier.
function staticCheckboxModifier(group: StorefrontProductOptionGroup): number {
  const overrides = group.checkbox_price_overrides || []
  if (!overrides.length) return Number(group.checkbox_price_modifier ?? 0) || 0
  const ov = matchedCheckboxOverride(group)
  if (!ov) return 0
  if (ov.type === 'subtract_percent' || ov.type === 'add_percent') return 0
  return applyOverride(0, Number(ov.value) || 0, ov.type, basePrice.value)
}

// Configured subtotal with one checkbox group's contribution removed. Used
// as the percentBase for that group's own percent rule so "subtract 50%"
// means "half off the rest of the configured value", not half off the bare
// product price. Other checkboxes contribute their *static* modifier so a
// second percent rule doesn't recurse.
function subtotalExcludingCheckbox(excludeUuid: string): number {
  let total = basePrice.value
  for (const g of visibleGroups.value) {
    if (g.uuid === excludeUuid) continue
    if (g.display_type === 'numeric') {
      const qty = Number(customValues.value[g.uuid] ?? 0)
      const rate = effectivePricePerUnit(g)
      const billable = billableQty(g, qty)
      if (billable > 0 && rate) total += billable * rate
      continue
    }
    if (isTextType(g) || g.display_type === 'file') continue
    if (g.display_type === 'checkbox') {
      if (customValues.value[g.uuid] === true) total += staticCheckboxModifier(g)
      continue
    }
    const selectedUuid = selectedOptions.value[g.uuid]
    if (!selectedUuid) continue
    const option = g.options.find((o) => o.uuid === selectedUuid)
    if (!option) continue
    total += effectiveOptionModifier(option)
  }
  return total
}

// Effective surcharge for a checkbox group when the box is ticked. Walks
// Rules-only effective surcharge: first matching checkbox_price_overrides
// row wins (empty conditions = always). Legacy back-compat: when no
// overrides[] exist, fall back to scalar group.checkbox_price_modifier.
// Percent overrides resolve against the configured subtotal of all other
// groups so "subtract 50%" means half off the whole configured price.
function effectiveCheckboxModifier(group: StorefrontProductOptionGroup): number {
  const overrides = group.checkbox_price_overrides || []
  if (!overrides.length) return Number(group.checkbox_price_modifier ?? 0) || 0
  const ov = matchedCheckboxOverride(group)
  if (!ov) return 0
  const percentBase = (ov.type === 'subtract_percent' || ov.type === 'add_percent')
    ? subtotalExcludingCheckbox(group.uuid)
    : basePrice.value
  return applyOverride(0, Number(ov.value) || 0, ov.type, percentBase)
}

const totalPrice = computed(() => {
  let total = basePrice.value
  for (const group of visibleGroups.value) {
    if (group.display_type === 'numeric') {
      const qty = Number(customValues.value[group.uuid] ?? 0)
      const rate = effectivePricePerUnit(group)
      const billable = billableQty(group, qty)
      if (billable > 0 && rate) {
        total += billable * rate
      }
      continue
    }
    if (isTextType(group)) continue
    if (group.display_type === 'file') continue
    if (group.display_type === 'checkbox') {
      if (customValues.value[group.uuid] === true) {
        total += effectiveCheckboxModifier(group)
      }
      continue
    }
    const selectedUuid = selectedOptions.value[group.uuid]
    if (!selectedUuid) continue
    const option = group.options.find((o) => o.uuid === selectedUuid)
    if (!option) continue
    total += effectiveOptionModifier(option)
  }
  return total
})

// All required groups must have a valid value before add-to-cart enables
const missingRequired = computed(() =>
  visibleGroups.value.filter((g) => g.is_required).some((g) => {
    if (isTextType(g)) {
      return !String(customValues.value[g.uuid] ?? '').trim()
    }
    if (g.display_type === 'numeric') {
      const v = Number(customValues.value[g.uuid] ?? NaN)
      return isNaN(v) || (g.numeric_min != null && v < g.numeric_min)
    }
    if (g.display_type === 'file') {
      return (fileUploads.value[g.uuid] || []).length === 0
    }
    if (g.display_type === 'checkbox') {
      return customValues.value[g.uuid] !== true
    }
    return !selectedOptions.value[g.uuid]
  })
)

const canAddToCart = computed(() => {
  if (!effectiveProduct.value) return false
  if (isAdding.value) return false
  return !missingRequired.value
})

// Plugin behaviors let LessCommerce plugins (e.g. photo-albums) replace the
// default "Add to cart" button with a plugin-driven CTA when the customer
// selects a specific option combination. Matched by (group_uuid, option_uuid).
const pluginBehaviors = computed<StorefrontPluginBehavior[]>(() =>
  effectiveProduct.value?.plugin_behaviors ?? []
)

const activeBehavior = computed<StorefrontPluginBehavior | null>(() => {
  if (!pluginBehaviors.value.length) return null
  for (const behavior of pluginBehaviors.value) {
    if (selectedOptions.value[behavior.group_uuid] === behavior.option_uuid) {
      return behavior
    }
  }
  return null
})

const behaviorButtonText = computed(() => activeBehavior.value?.cta.label || '')

// Plugin flow CTA — a plugin's product.render hook (e.g. photo-albums
// print-studio) marks the product with a `flow` block whose `url` points at
// the plugin's bridge page. Unlike plugin_behaviors (bound to a selected
// option), the flow CTA applies to the whole product: purchase happens on
// the bridge page (photo upload / external designer), so it replaces the
// add-to-cart button entirely. An option-bound behavior, when active,
// still wins — it's the more specific instruction.
const productFlow = computed<StorefrontProductFlow | null>(() => {
  const flow = effectiveProduct.value?.flow
  if (!flow?.url || !flow?.button_label) return null
  return flow
})

const canRunFlow = computed(() => {
  if (!productFlow.value) return false
  if (isAdding.value) return false
  return !missingRequired.value
})

function handleFlowAction() {
  const flow = productFlow.value
  if (!flow?.url) return
  if (missingRequired.value) {
    toast.error(t('fillRequired'))
    return
  }
  // Plain navigation — the bridge page owns auth-gating (redirects to the
  // login page with ?return=<bridge> itself), token exchange and embedding.
  if (typeof window !== 'undefined') {
    window.location.href = flow.url
  }
}

const canRunBehavior = computed(() => {
  if (!activeBehavior.value) return false
  if (isAdding.value) return false
  return !missingRequired.value
})

async function handleBehaviorAction() {
  const behavior = activeBehavior.value
  const p = effectiveProduct.value
  if (!behavior || !p) return
  if (missingRequired.value) {
    toast.error(t('fillRequired'))
    return
  }

  const cta = behavior.cta

  // Generic auth gate — any plugin behavior may set `requires_auth: true`
  // on its CTA. Core doesn't know which plugin; if the flag is on and the
  // customer isn't logged in, save the configurator state (with a
  // `pendingBehavior: true` marker), then redirect to the login URL with
  // `?return=<here>`. After login the configurator restores the state AND
  // auto-fires this behavior so the customer ends up where they wanted to
  // go — on the album designer — instead of needing to click the CTA twice.
  //
  // await customer.init() first — without it, a customer who's already
  // logged in (token in localStorage) but whose store hasn't hydrated yet
  // would be falsely sent to /konto. init() is idempotent.
  if (cta.requires_auth) {
    await customer.init()
  }
  if (cta.requires_auth && !customer.isAuthenticated.value) {
    if (p?.uuid) savePersistedState(p.uuid, { pendingBehavior: true })
    const loginUrl = projectConfig?.value?.commerce?.routes?.account || '/konto'
    const sep = loginUrl.includes('?') ? '&' : '?'
    if (typeof window !== 'undefined') {
      // Append `lcms_pending_action=1` to the return URL so the destination
      // page can render a full-screen redirect overlay from the very first
      // SSR paint — without this marker, the user briefly sees the product
      // page they came from while the configurator's auto-fire is in
      // flight on the way to the album designer.
      const returnUrlObj = new URL(window.location.href)
      returnUrlObj.searchParams.set('lcms_pending_action', '1')
      const returnTo = returnUrlObj.toString()
      window.location.href = `${loginUrl}${sep}return=${encodeURIComponent(returnTo)}`
    }
    return
  }

  if (cta.type === 'link') {
    if (!cta.url) return
    if (typeof window !== 'undefined') {
      window.location.href = cta.url
    }
    return
  }

  if (cta.type === 'create_album_flow') {
    if (!cta.post_url || !client.value) return
    if (missingRequired.value) {
      toast.error(t('fillRequired'))
      return
    }
    isAdding.value = true
    try {
      // No cart.addItem here. The plugin's own return page
      // (Pages/AlbumReturn.vue in photo-albums) does the add after the
      // customer finishes designing — adding here too produces a
      // duplicate cart line.
      const returnUrl = typeof window !== 'undefined' ? window.location.href : ''
      // Snapshot the configurator so the plugin can persist it on the album and
      // the post-designer cart line carries the right price + every selected
      // option (cover material, color, finish, engraving, …). Without this the
      // plugin only sees pages_count + page size from album.studio and the cart
      // falls back to product->price = 0.00 zł for configurator parents.
      const snapshot = buildConfiguredCartMetadata()
      // Hint which group is "ilość stron / rozkładówek" (pages) and which is
      // "rozmiar" so the reconciliation can compare album.studio's actual
      // pages/size to what the customer picked and flag mismatches.
      const pagesGroup = visibleGroups.value.find((g) =>
        g.display_type === 'numeric' && /stron|rozkładówek|rozkladow/i.test(`${g.code} ${g.name}`)
      ) || visibleGroups.value.find((g) =>
        /stron|liczba-stron|rozkładówek|rozkladow/i.test(`${g.code} ${g.name}`)
      )
      const sizeGroup = visibleGroups.value.find((g) =>
        /rozmiar/i.test(g.code) || /rozmiar/i.test(g.name)
      )
      const response = await client.value.callPluginEndpoint<{
        data?: { redirect_url?: string; designer_url?: string }
        designer_url?: string
        redirect_url?: string
      }>(cta.post_url, {
        body: {
          product_id: p.uuid,
          return_url: returnUrl,
          configured_options: snapshot.configured_options,
          configured_total: snapshot.configured_total,
          configured_pages_group_uuid: pagesGroup?.uuid,
          configured_size_group_uuid: sizeGroup?.uuid,
        },
      })
      const redirect =
        response?.data?.redirect_url ||
        response?.data?.designer_url ||
        response?.redirect_url ||
        response?.designer_url
      if (redirect && typeof window !== 'undefined') {
        window.location.href = redirect
      } else {
        toast.error(t('addError'))
      }
    } catch (err: any) {
      toast.error(err?.message || t('addError'))
    } finally {
      isAdding.value = false
    }
  }
}

function selectOption(groupUuid: string, optionUuid: string) {
  const next = { ...selectedOptions.value }
  if (next[groupUuid] === optionUuid) {
    // Click on the already-selected swatch/chip deselects it. Only reachable
    // from @click handlers — a checked radio / same <select> value never
    // re-fires @change, so those keep native single-select semantics.
    delete next[groupUuid]
  } else {
    next[groupUuid] = optionUuid
  }
  selectedOptions.value = next
}

function setCustomValue(groupUuid: string, value: string | number | boolean) {
  customValues.value = { ...customValues.value, [groupUuid]: value }
}

// 'textarea' is 'text' with a multiline input — identical value/validation
// semantics everywhere except the rendered control.
function isTextType(g: StorefrontProductOptionGroup): boolean {
  return g.display_type === 'text' || g.display_type === 'textarea'
}

// Numeric stepper helpers — clamp to numeric_min/numeric_max bounds, fall back
// to numeric_min when current value is empty / NaN so the first +/- click
// produces a sensible starting number.
function stepNumeric(group: StorefrontProductOptionGroup, delta: number) {
  const step = Number(group.numeric_step ?? 1) || 1
  const min = group.numeric_min ?? null
  const max = group.numeric_max ?? null
  const current = Number(customValues.value[group.uuid] ?? NaN)
  let next = isNaN(current) ? (min ?? 0) : current + delta * step
  if (min != null && next < min) next = min
  if (max != null && next > max) next = max
  setCustomValue(group.uuid, next)
}

function canDecrement(group: StorefrontProductOptionGroup): boolean {
  const min = group.numeric_min ?? null
  const current = Number(customValues.value[group.uuid] ?? NaN)
  if (isNaN(current)) return true
  if (min == null) return true
  return current > min
}

function canIncrement(group: StorefrontProductOptionGroup): boolean {
  const max = group.numeric_max ?? null
  const current = Number(customValues.value[group.uuid] ?? NaN)
  if (isNaN(current)) return true
  if (max == null) return true
  return current < max
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function validateFileForGroup(group: StorefrontProductOptionGroup, file: File): string | null {
  const ext = (file.name.split('.').pop() || '').toLowerCase()
  const allowed = (group.file_allowed_extensions || []).map((e) => e.toLowerCase())
  if (allowed.length > 0 && !allowed.includes(ext)) {
    return t('fileInvalidExt', { name: file.name })
  }
  if (group.file_max_size_kb && file.size > group.file_max_size_kb * 1024) {
    return t('fileTooLarge', { name: file.name, max: group.file_max_size_kb })
  }
  return null
}

async function handleFileSelect(group: StorefrontProductOptionGroup, ev: Event) {
  const input = ev.target as HTMLInputElement
  if (!input.files || !input.files.length || !client.value) return

  const maxCount = group.file_max_count || 1
  const current = fileUploads.value[group.uuid] || []
  const remaining = Math.max(0, maxCount - current.length)
  if (remaining === 0) {
    toast.error(t('fileTooMany', { count: maxCount }))
    input.value = ''
    return
  }

  const filesToUpload = Array.from(input.files).slice(0, remaining)
  fileUploadStatus.value = {
    ...fileUploadStatus.value,
    [group.uuid]: { uploading: true, error: null },
  }

  try {
    const cartUuid = await cart.ensureCart()
    for (const file of filesToUpload) {
      const validationError = validateFileForGroup(group, file)
      if (validationError) {
        toast.error(validationError)
        continue
      }
      try {
        const res = await client.value.uploadOptionFile(cartUuid, group.uuid, file)
        fileUploads.value = {
          ...fileUploads.value,
          [group.uuid]: [...(fileUploads.value[group.uuid] || []), res.data],
        }
      } catch (err: any) {
        toast.error(err?.message || t('fileUploadFailed'))
      }
    }
  } finally {
    fileUploadStatus.value = {
      ...fileUploadStatus.value,
      [group.uuid]: { uploading: false, error: null },
    }
    input.value = ''
  }
}

async function removeFileUpload(groupUuid: string, uploadUuid: string) {
  if (!client.value) return
  try {
    await client.value.deleteOptionUpload(uploadUuid)
  } catch {
    // Even on delete failure clear local state — server retention will handle orphans.
  }
  fileUploads.value = {
    ...fileUploads.value,
    [groupUuid]: (fileUploads.value[groupUuid] || []).filter((u) => u.uuid !== uploadUuid),
  }
}

// Effective grid column count for an image_swatches group: clamps the user's
// `swatch_columns` to the number of visible image options so a group with
// fewer items doesn't render a half-empty row.
function imageSwatchGridStyle(group: StorefrontProductOptionGroup): Record<string, string> {
  const opts = visibleOptionsOf(group, selectedSet.value)
  const visibleImages = opts.filter((o) => !!o.thumbnail).length
  if (visibleImages === 0) return {}
  const cols = Math.max(1, Math.min(swatchColumns.value, visibleImages))
  // Same contract as radioGridStyle: minmax(0, 1fr) so captions can't blow
  // the track past the viewport, CSS var so mobile caps the column count.
  return {
    display: 'grid',
    '--lcms-pc-grid-cols': String(cols),
    gridTemplateColumns: 'repeat(var(--lcms-pc-grid-cols), minmax(0, 1fr))',
  }
}

function optionPriceDeltaText(option: StorefrontProductOption): string {
  const delta = effectiveOptionModifier(option)
  if (!delta) return ''
  const sign = delta > 0 ? '+' : '−'
  return `${sign}${formatPrice(Math.abs(delta), currency.value)}`
}

function checkboxPriceDeltaText(group: StorefrontProductOptionGroup): string {
  // For percent-based rules, show the rule itself ("−50%") instead of the
  // złoty amount — the amount depends on every other selection and changes
  // as the user picks options, which is more noise than signal in the
  // checkbox label. Static (złoty) modifiers keep showing the amount.
  const ov = matchedCheckboxOverride(group)
  if (ov && (ov.type === 'subtract_percent' || ov.type === 'add_percent')) {
    const v = Number(ov.value) || 0
    if (!v) return ''
    const sign = ov.type === 'subtract_percent' ? '−' : '+'
    return `${sign}${v}%`
  }
  const delta = effectiveCheckboxModifier(group)
  if (!delta) return ''
  const sign = delta > 0 ? '+' : '−'
  return `${sign}${formatPrice(Math.abs(delta), currency.value)}`
}

async function fetchProduct() {
  if (!client.value || !resolvedSlug.value) return
  isLoading.value = true
  fetchError.value = null
  try {
    const response = await client.value.getProduct(resolvedSlug.value)
    product.value = response.data || null
  } catch (err: any) {
    fetchError.value = err.message || t('notFound')
    product.value = null
  } finally {
    isLoading.value = false
  }
}

// Build the cart-item metadata payload from the current configurator state.
// Shared by handleAddToCart and handleBehaviorAction so a plugin CTA can also
// drop the configured product into the cart before redirecting off-site —
// without that the user comes back from the external designer to an empty
// cart and has to configure all over again.
function buildConfiguredCartMetadata(): { configured_options: Array<Record<string, unknown>>; configured_total: number } {
  const configuredOptions: Array<Record<string, unknown>> = []
  for (const g of visibleGroups.value) {
    if (isTextType(g)) {
      const value = String(customValues.value[g.uuid] ?? '').trim()
      if (!value) continue
      configuredOptions.push({
        group_uuid: g.uuid,
        group_name: g.name,
        type: 'text',
        value,
        price_delta: 0,
      })
    } else if (g.display_type === 'checkbox') {
      if (customValues.value[g.uuid] !== true) continue
      const delta = effectiveCheckboxModifier(g)
      configuredOptions.push({
        group_uuid: g.uuid,
        group_name: g.name,
        type: 'checkbox',
        value: true,
        checkbox_label: g.checkbox_label || 'TAK',
        price_delta: delta,
      })
    } else if (g.display_type === 'file') {
      const uploads = fileUploads.value[g.uuid] || []
      if (uploads.length === 0) continue
      configuredOptions.push({
        group_uuid: g.uuid,
        group_name: g.name,
        type: 'file',
        value: uploads.map((u) => u.uuid),
        files_meta: uploads.map((u) => ({
          uuid: u.uuid,
          name: u.original_filename,
          url: u.public_url,
          size: u.size,
        })),
        price_delta: 0,
      })
    } else if (g.display_type === 'numeric') {
      const qty = Number(customValues.value[g.uuid] ?? 0)
      if (!qty) continue
      const rate = effectivePricePerUnit(g)
      const delta = rate ? qty * rate : 0
      configuredOptions.push({
        group_uuid: g.uuid,
        group_name: g.name,
        type: 'numeric',
        value: qty,
        price_delta: delta,
      })
    } else {
      const selUuid = selectedOptions.value[g.uuid]
      if (!selUuid) continue
      const opt = g.options.find((o) => o.uuid === selUuid)
      if (!opt) continue
      configuredOptions.push({
        group_uuid: g.uuid,
        group_name: g.name,
        type: 'option',
        option_uuid: opt.uuid,
        option_name: opt.name,
        price_delta: effectiveOptionModifier(opt),
      })
    }
  }

  return {
    configured_options: configuredOptions,
    configured_total: totalPrice.value,
  }
}

async function handleAddToCart() {
  const p = effectiveProduct.value
  if (!p) return
  if (missingRequired.value) {
    toast.error(t('fillRequired'))
    return
  }

  const metadata = buildConfiguredCartMetadata()

  isAdding.value = true
  try {
    await cart.addItem(p.uuid, 1, metadata)
    toast.success(t('addedToCart'), {
      action: {
        label: props.language === 'en' ? 'View cart' : 'Zobacz koszyk',
        href: projectConfig?.value?.commerce?.routes?.cart || '/koszyk',
      },
    })
  } catch (err: any) {
    toast.error(err.message || t('addError'))
  } finally {
    isAdding.value = false
  }
}

onMounted(() => {
  if (injectedProduct?.value) return
  if (isAvailable.value) fetchProduct()
})

watch([resolvedSlug, isAvailable], () => {
  if (injectedProduct?.value) return
  if (isAvailable.value) fetchProduct()
})

// CSS vars for styling — map to scoped selectors.
// Every configurable color gets a var so the user's choices reactively reflow
// through the component. Button colors live on global .lcms-button__link--*
// classes, so no vars needed for the button itself.
//
// Empty entries are dropped: an empty custom property (`--foo:;`) is defined-
// as-empty, which makes `var(--foo, fallback)` resolve to empty and breaks the
// fallback chain (e.g. `border: 2px solid ` → invalid → initial value). On
// SSR that produced a stray default border that "fixed itself" only after the
// first click re-patched inline styles via setProperty('', '') (which removes
// the property in CSSOM).
const cssVars = computed(() => {
  const raw: Record<string, string | null | undefined> = {
    '--lcms-pc-heading-color': resolveColor(heading.value.color),
    '--lcms-pc-group-label-color': resolveColor(groupLabel.value.color),
    '--lcms-pc-required-color': resolveColor(groupLabel.value.required_color),
    '--lcms-pc-option-bg': resolveColor(optionStyle.value.background),
    '--lcms-pc-option-bg-hover': resolveColor(optionStyle.value['background:hover']),
    '--lcms-pc-option-border': resolveColor(optionStyle.value.border_color),
    '--lcms-pc-option-border-hover': resolveColor(optionStyle.value['border_color:hover']),
    '--lcms-pc-option-selected-bg': resolveColor(optionStyle.value.selected_background),
    '--lcms-pc-option-selected-border': resolveColor(optionStyle.value.selected_border_color),
    '--lcms-pc-option-text': resolveColor(optionStyle.value.text_color),
    '--lcms-pc-option-text-hover': resolveColor(optionStyle.value['text_color:hover']),
    '--lcms-pc-summary-color': resolveColor(priceSummary.value.color),
    '--lcms-pc-summary-amount-color': resolveColor(priceSummary.value.amount_color),
  }
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(raw)) {
    if (v) out[k] = v
  }
  return out
})
</script>

<template>
  <div ref="rootEl" class="lcms-product-configurator" :style="[cssVars, inputFocusVars]">
    <div v-if="isLoading && !effectiveProduct" class="lcms-product-configurator__status">
      {{ t('loading') }}
    </div>

    <div v-else-if="!effectiveProduct" class="lcms-product-configurator__status">
      {{ fetchError || t('notFound') }}
    </div>

    <template v-else>
      <component
        :is="headingTag"
        v-if="showHeading"
        class="lcms-product-configurator__heading"
      >
        {{ headingText }}
      </component>

      <!-- Products without option groups render no empty-state note — the
           price row + add-to-cart below are all the user needs. -->

      <!-- Wizard progress bar -->
      <div
        v-if="wizardMode && showProgress && totalSteps > 0"
        class="lcms-product-configurator__progress"
      >
        <div class="lcms-product-configurator__progress-bar">
          <div
            class="lcms-product-configurator__progress-fill"
            :style="{ width: progressPercent + '%' }"
          />
        </div>
        <div v-if="showStepCount" class="lcms-product-configurator__progress-label">
          <span v-if="!showSummary">{{ t('step') }} {{ currentStep + 1 }} {{ t('of') }} {{ totalSteps }}</span>
          <span v-else>{{ t('stepSummary') }}</span>
          <span class="lcms-product-configurator__progress-percent">{{ progressPercent }}%</span>
        </div>
      </div>

      <!-- Wizard summary (shown after last step). The "Podsumowanie" label
           is already rendered next to the progress bar above, so we don't
           repeat it as a heading inside the list. -->
      <div
        v-if="wizardMode && showSummary"
        class="lcms-product-configurator__summary-list"
      >
        <ul>
          <li v-for="g in visibleGroups" :key="g.uuid">
            <strong>{{ g.name }}:</strong>
            <span class="lcms-product-configurator__summary-value">
              <template v-if="groupSummaryVisual(g)">
                <button
                  v-if="groupSummaryVisual(g)!.thumbnail"
                  type="button"
                  class="lcms-product-configurator__summary-thumb"
                  :title="t('zoomThumb')"
                  @click="openLightboxImage(groupSummaryVisual(g)!.thumbnail!)"
                >
                  <img :src="groupSummaryVisual(g)!.thumbnail!" :alt="groupSummaryVisual(g)!.name">
                </button>
                <button
                  v-else-if="groupSummaryVisual(g)!.color_hex"
                  type="button"
                  class="lcms-product-configurator__summary-thumb lcms-product-configurator__summary-thumb--color"
                  :title="t('zoomThumb')"
                  :style="{ backgroundColor: groupSummaryVisual(g)!.color_hex! }"
                  :aria-label="groupSummaryVisual(g)!.name"
                  @click="openLightboxColor(groupSummaryVisual(g)!.color_hex!)"
                />
                <span>{{ groupSummaryVisual(g)!.name }}</span>
              </template>
              <template v-else>{{ groupSummaryValue(g) }}</template>
            </span>
          </li>
        </ul>
      </div>

      <!-- Option-input groups. When the wizard summary is showing this is
           hidden so the user sees only the recap, not the editable form. -->
      <div
        v-else-if="allGroups.length > 0"
        class="lcms-product-configurator__groups"
        :class="{
          'lcms-product-configurator__groups--wizard': wizardMode,
          'lcms-product-configurator__groups--flat': displayMode === 'flat',
        }"
      >
        <!-- Step title — etykieta kroku gdy w wizardzie kilka grup zostało
             scalonych w jeden krok (wizard_step na grupie w configuratorze).
             Pojedyncza grupa na krok = brak labela = nie renderujemy
             (nagłówki grup już wystarczają). -->
        <div
          v-if="wizardMode && !showSummary && currentStepData?.label && currentStepGroups.length > 0"
          class="lcms-product-configurator__step-title"
        >
          {{ currentStepData.label }}
        </div>

        <div
          v-for="group in groupsToShow"
          :key="group.uuid"
          class="lcms-product-configurator__group"
          :class="`lcms-product-configurator__group--swatch-${swatchSize}`"
        >
          <div class="lcms-product-configurator__group-head">
            <div class="lcms-product-configurator__group-label">
              <span class="lcms-product-configurator__group-name">{{ group.name }}</span>
              <span
                v-if="showRequiredBadge && group.is_required"
                class="lcms-product-configurator__required"
                :aria-label="'wymagane'"
              >{{ t('required') }}</span>
            </div>
            <div
              v-if="group.description"
              class="lcms-product-configurator__group-description"
            >{{ group.description }}</div>
          </div>

          <!-- select display -->
          <select
            v-if="group.display_type === 'select'"
            :value="selectedOptions[group.uuid] || ''"
            class="lcms-product-configurator__select"
            :style="inputInlineStyle"
            @change="selectOption(group.uuid, ($event.target as HTMLSelectElement).value)"
          >
            <option value="" disabled>{{ t('selectPlaceholder') }}</option>
            <option
              v-for="opt in visibleOptionsOf(group, selectedSet)"
              :key="opt.uuid"
              :value="opt.uuid"
            >
              {{ opt.name }}<template v-if="optionPriceDeltaText(opt)"> ({{ optionPriceDeltaText(opt) }})</template>
            </option>
          </select>

          <!-- radio display -->
          <div
            v-else-if="group.display_type === 'radio'"
            class="lcms-product-configurator__radio-group"
            :style="radioGridStyle(group)"
          >
            <label
              v-for="opt in visibleOptionsOf(group, selectedSet)"
              :key="opt.uuid"
              class="lcms-product-configurator__radio"
              :class="{ 'lcms-product-configurator__radio--selected': selectedOptions[group.uuid] === opt.uuid }"
            >
              <input
                type="radio"
                :name="`pc-group-${group.uuid}`"
                :value="opt.uuid"
                :checked="selectedOptions[group.uuid] === opt.uuid"
                @change="selectOption(group.uuid, opt.uuid)"
              />
              <span class="lcms-product-configurator__radio-label">{{ opt.name }}</span>
              <span
                v-if="optionPriceDeltaText(opt)"
                class="lcms-product-configurator__price-delta"
              >{{ optionPriceDeltaText(opt) }}</span>
            </label>
          </div>

          <!-- color swatches display -->
          <div
            v-else-if="group.display_type === 'color_swatches'"
            class="lcms-product-configurator__swatches"
          >
            <template v-for="opt in visibleOptionsOf(group, selectedSet)" :key="opt.uuid">
              <div
                v-if="opt.color_hex"
                class="lcms-product-configurator__swatch-cell"
              >
                <button
                  type="button"
                  class="lcms-product-configurator__swatch lcms-product-configurator__swatch--color"
                  :class="{ 'lcms-product-configurator__swatch--selected': selectedOptions[group.uuid] === opt.uuid }"
                  :title="opt.name + (optionPriceDeltaText(opt) ? ` (${optionPriceDeltaText(opt)})` : '')"
                  :style="{ backgroundColor: opt.color_hex }"
                  :aria-label="opt.name"
                  @click="selectOption(group.uuid, opt.uuid)"
                />
                <span
                  v-if="showOptionPrices && optionPriceDeltaText(opt)"
                  class="lcms-product-configurator__swatch-price"
                >{{ optionPriceDeltaText(opt) }}</span>
              </div>
              <button
                v-else
                type="button"
                class="lcms-product-configurator__chip"
                :class="{ 'lcms-product-configurator__chip--selected': selectedOptions[group.uuid] === opt.uuid }"
                @click="selectOption(group.uuid, opt.uuid)"
              >
                {{ opt.name }}<template v-if="optionPriceDeltaText(opt)"> ({{ optionPriceDeltaText(opt) }})</template>
              </button>
            </template>
          </div>

          <!-- image swatches display -->
          <div
            v-else-if="group.display_type === 'image_swatches'"
            class="lcms-product-configurator__swatches lcms-product-configurator__swatches--grid"
            :style="imageSwatchGridStyle(group)"
          >
            <template v-for="opt in visibleOptionsOf(group, selectedSet)" :key="opt.uuid">
              <div
                v-if="opt.thumbnail"
                class="lcms-product-configurator__swatch-cell"
              >
                <div class="lcms-product-configurator__swatch-imgwrap">
                  <button
                    type="button"
                    class="lcms-product-configurator__swatch lcms-product-configurator__swatch--image"
                    :class="{ 'lcms-product-configurator__swatch--selected': selectedOptions[group.uuid] === opt.uuid }"
                    :style="swatchImgButtonStyle"
                    :title="opt.name + (optionPriceDeltaText(opt) ? ` (${optionPriceDeltaText(opt)})` : '')"
                    :aria-label="opt.name"
                    @click="selectOption(group.uuid, opt.uuid)"
                  >
                    <img :src="opt.thumbnail" :alt="opt.name" :style="swatchImgStyle" />
                  </button>
                  <button
                    type="button"
                    class="lcms-product-configurator__swatch-zoom"
                    :title="t('zoomThumb')"
                    :aria-label="t('zoomThumb')"
                    @click.stop="openLightboxImage(opt.thumbnail!)"
                  >
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <circle cx="11" cy="11" r="7" />
                      <line x1="21" y1="21" x2="16" y2="16" />
                      <line x1="11" y1="8" x2="11" y2="14" />
                      <line x1="8" y1="11" x2="14" y2="11" />
                    </svg>
                  </button>
                </div>
                <span
                  v-if="showOptionPrices"
                  class="lcms-product-configurator__swatch-caption"
                >
                  <span class="lcms-product-configurator__swatch-name">{{ opt.name }}</span>
                  <span
                    v-if="optionPriceDeltaText(opt)"
                    class="lcms-product-configurator__swatch-price"
                  >{{ optionPriceDeltaText(opt) }}</span>
                </span>
              </div>
              <button
                v-else
                type="button"
                class="lcms-product-configurator__chip"
                :class="{ 'lcms-product-configurator__chip--selected': selectedOptions[group.uuid] === opt.uuid }"
                @click="selectOption(group.uuid, opt.uuid)"
              >
                {{ opt.name }}<template v-if="optionPriceDeltaText(opt)"> ({{ optionPriceDeltaText(opt) }})</template>
              </button>
            </template>
          </div>

          <!-- text input display -->
          <input
            v-else-if="group.display_type === 'text'"
            type="text"
            class="lcms-product-configurator__text-input"
            :style="inputInlineStyle"
            :value="customValues[group.uuid] || ''"
            :placeholder="group.name"
            :maxlength="group.text_max_length || undefined"
            @input="setCustomValue(group.uuid, ($event.target as HTMLInputElement).value)"
          />

          <!-- multiline text display (plain textarea, no markup) -->
          <div
            v-else-if="group.display_type === 'textarea'"
            class="lcms-product-configurator__textarea-wrap"
          >
            <textarea
              class="lcms-product-configurator__text-input lcms-product-configurator__textarea"
              :style="inputInlineStyle"
              :value="String(customValues[group.uuid] || '')"
              :placeholder="group.name"
              :rows="group.text_rows || 4"
              :maxlength="group.text_max_length || undefined"
              @input="setCustomValue(group.uuid, ($event.target as HTMLTextAreaElement).value)"
            />
            <div
              v-if="group.text_max_length"
              class="lcms-product-configurator__char-counter"
            >
              {{ String(customValues[group.uuid] || '').length }} / {{ group.text_max_length }}
            </div>
          </div>

          <!-- numeric input display — stepper with explicit -/+ buttons.
               Native browser spinners are tiny on most stylesheets; users on
               touch can't reliably hit them either. -->
          <div
            v-else-if="group.display_type === 'numeric'"
            class="lcms-product-configurator__numeric"
          >
            <div class="lcms-product-configurator__stepper">
              <button
                type="button"
                class="lcms-product-configurator__stepper-btn"
                :disabled="!canDecrement(group)"
                aria-label="Zmniejsz"
                @click="stepNumeric(group, -1)"
              >−</button>
              <input
                type="number"
                class="lcms-product-configurator__stepper-input"
                :style="inputInlineStyle"
                :value="customValues[group.uuid] ?? ''"
                :min="group.numeric_min ?? undefined"
                :max="group.numeric_max ?? undefined"
                :step="group.numeric_step ?? 1"
                @input="setCustomValue(group.uuid, Number(($event.target as HTMLInputElement).value))"
              />
              <button
                type="button"
                class="lcms-product-configurator__stepper-btn"
                :disabled="!canIncrement(group)"
                aria-label="Zwiększ"
                @click="stepNumeric(group, 1)"
              >+</button>
            </div>
            <span
              v-if="effectivePricePerUnit(group)"
              class="lcms-product-configurator__numeric-rate"
            >× {{ formatPrice(effectivePricePerUnit(group), currency) }}<span
              v-if="freeUnitsHint(group)"
              class="lcms-product-configurator__numeric-free"
            > · {{ freeUnitsHint(group) }}</span></span>
          </div>

          <!-- checkbox (yes/no toggle with optional price modifier + preview image) -->
          <label
            v-else-if="group.display_type === 'checkbox'"
            class="lcms-product-configurator__checkbox"
            :class="{ 'lcms-product-configurator__checkbox--checked': customValues[group.uuid] === true }"
          >
            <input
              type="checkbox"
              :checked="customValues[group.uuid] === true"
              @change="setCustomValue(group.uuid, ($event.target as HTMLInputElement).checked)"
            />
            <img
              v-if="group.checkbox_image"
              :src="group.checkbox_image"
              class="lcms-product-configurator__checkbox-image"
              alt=""
              loading="lazy"
            />
            <span class="lcms-product-configurator__checkbox-label">{{ group.checkbox_label || 'TAK' }}</span>
            <span
              v-if="checkboxPriceDeltaText(group)"
              class="lcms-product-configurator__checkbox-price"
            >({{ checkboxPriceDeltaText(group) }})</span>
          </label>

          <!-- file upload display -->
          <div
            v-else-if="group.display_type === 'file'"
            class="lcms-product-configurator__file"
          >
            <ul
              v-if="(fileUploads[group.uuid] || []).length > 0"
              class="lcms-product-configurator__file-list"
            >
              <li
                v-for="upload in fileUploads[group.uuid]"
                :key="upload.uuid"
                class="lcms-product-configurator__file-item"
              >
                <i class="bx bx-file" />
                <span class="lcms-product-configurator__file-name">{{ upload.original_filename }}</span>
                <span class="lcms-product-configurator__file-size">{{ formatFileSize(upload.size) }}</span>
                <button
                  type="button"
                  class="lcms-product-configurator__file-remove"
                  :title="t('fileRemove')"
                  @click="removeFileUpload(group.uuid, upload.uuid)"
                >
                  <i class="bx bx-x" />
                </button>
              </li>
            </ul>
            <label
              v-if="(fileUploads[group.uuid] || []).length < (group.file_max_count || 1)"
              class="lcms-product-configurator__file-trigger"
              :class="{ 'is-uploading': fileUploadStatus[group.uuid]?.uploading }"
            >
              <input
                type="file"
                hidden
                :multiple="(group.file_max_count || 1) > 1"
                :accept="(group.file_allowed_extensions || []).map((e) => '.' + e).join(',')"
                :disabled="fileUploadStatus[group.uuid]?.uploading"
                @change="handleFileSelect(group, $event)"
              />
              <i class="bx bx-cloud-upload" />
              <span v-if="fileUploadStatus[group.uuid]?.uploading">{{ t('fileUploading') }}</span>
              <span v-else>{{ t('filePickButton') }}</span>
            </label>
            <div
              v-if="group.file_allowed_extensions?.length || group.file_max_size_kb"
              class="lcms-product-configurator__file-hint"
            >
              <span v-if="group.file_allowed_extensions?.length">
                {{ group.file_allowed_extensions.map((e) => '.' + e).join(', ') }}
              </span>
              <span v-if="group.file_max_size_kb"> · max {{ group.file_max_size_kb }} KB</span>
              <span v-if="(group.file_max_count || 1) > 1"> · do {{ group.file_max_count }} plików</span>
            </div>
          </div>

          <!-- Fallback for unknown display_type. Renders the group as a
               checkbox so the user can still toggle a TAK/NIE answer. Without
               this, an option group with a missing or unrecognised display_type
               vanishes silently — exactly the bug the user reported with
               "Album pokazowy DEMO". -->
          <label
            v-else
            class="lcms-product-configurator__checkbox"
            :class="{ 'lcms-product-configurator__checkbox--checked': customValues[group.uuid] === true }"
          >
            <input
              type="checkbox"
              :checked="customValues[group.uuid] === true"
              @change="setCustomValue(group.uuid, ($event.target as HTMLInputElement).checked)"
            />
            <img
              v-if="group.checkbox_image"
              :src="group.checkbox_image"
              class="lcms-product-configurator__checkbox-image"
              alt=""
              loading="lazy"
            />
            <span class="lcms-product-configurator__checkbox-label">{{ group.checkbox_label || 'TAK' }}</span>
          </label>
        </div>
      </div>

      <!-- Lightbox overlay for summary thumbnails. Sits outside the
           summary/groups v-if/v-else-if chain so it can open over either.
           Click outside the image (or press Esc) closes. -->
      <div
        v-if="lightbox"
        class="lcms-product-configurator__lightbox"
        role="dialog"
        aria-modal="true"
        tabindex="-1"
        @click="closeLightbox"
        @keydown.esc="closeLightbox"
      >
        <img
          v-if="!lightbox.startsWith('color:')"
          :src="lightbox"
          alt=""
          class="lcms-product-configurator__lightbox-image"
          @click.stop
        >
        <div
          v-else
          class="lcms-product-configurator__lightbox-color"
          :style="{ backgroundColor: lightbox.slice(6) }"
          @click.stop
        />
      </div>

      <!-- Price summary: always shown when enabled. In wizard mode the live
           total updates as the user steps through, so they always see how
           their selections affect the price. Hidden for flow products —
           their price is determined inside the external flow (per-photo
           formats etc.), so the configurator's total would be a misleading
           "0,00 zł". -->
      <div
        v-if="showPriceSummary && !productFlow"
        class="lcms-product-configurator__summary"
      >
        <span class="lcms-product-configurator__summary-label">{{ totalLabelText }}</span>
        <span class="lcms-product-configurator__summary-amount">
          {{ formatPrice(totalPrice, currency) }}
        </span>
      </div>

      <!-- Wizard nav (prev/next on a step; on summary step we render
           the regular add-to-cart / behavior button below). -->
      <div
        v-if="wizardMode && !showSummary && totalSteps > 0"
        class="lcms-product-configurator__wizard-nav"
      >
        <button
          type="button"
          class="lcms-product-configurator__nav-btn lcms-product-configurator__nav-btn--secondary"
          :disabled="isFirstStep"
          @click="goPrevStep"
        >
          {{ t('stepBack') }}
        </button>
        <button
          type="button"
          class="lcms-product-configurator__nav-btn lcms-product-configurator__nav-btn--primary"
          @click="goNextStep"
        >
          {{ isLastStep ? t('stepSummary') : t('stepNext') }}
        </button>
      </div>

      <!-- Add-to-cart / plugin-behavior / plugin-flow button. In wizard mode
           shown only on the summary step — except when the product has no
           option groups at all: there are no steps then, so the summary
           never arrives and without this carve-out the CTA would never
           render. On summary the "Back" button sits in the same row so the
           two visually match the wizard's prev/next pair on earlier steps
           rather than a small floating link above a giant full-width CTA. -->
      <template v-if="!wizardMode || showSummary || allGroups.length === 0">
        <div
          :class="{ 'lcms-product-configurator__summary-actions': wizardMode && showSummary }"
        >
          <button
            v-if="wizardMode && showSummary"
            type="button"
            :class="backButtonClass"
            :style="buttonInlineStyle"
            @click="goPrevStep"
          >
            {{ t('stepBack') }}
          </button>
          <button
            v-if="activeBehavior"
            type="button"
            :class="buttonClass"
            :style="buttonInlineStyle"
            :disabled="!canRunBehavior"
            @click="handleBehaviorAction"
          >
            <span v-if="isAdding" class="lcms-product-configurator__spinner" />
            {{ behaviorButtonText }}
          </button>
          <button
            v-else-if="productFlow"
            type="button"
            :class="buttonClass"
            :style="buttonInlineStyle"
            :disabled="!canRunFlow"
            @click="handleFlowAction"
          >
            <span v-if="isAdding" class="lcms-product-configurator__spinner" />
            {{ productFlow.button_label }}
          </button>
          <button
            v-else
            type="button"
            :class="buttonClass"
            :style="buttonInlineStyle"
            :disabled="!canAddToCart"
            @click="handleAddToCart"
          >
            <span v-if="isAdding" class="lcms-product-configurator__spinner" />
            <i v-else-if="buttonIcon && buttonIconPosition === 'left'" :class="buttonIcon" style="margin-right: 6px;" />
            {{ buttonText }}
            <i v-if="buttonIcon && buttonIconPosition === 'right'" :class="buttonIcon" style="margin-left: 6px;" />
          </button>
        </div>
        <p
          v-if="!activeBehavior && productFlow?.description"
          class="lcms-product-configurator__flow-description"
        >
          {{ productFlow.description }}
        </p>
      </template>
    </template>
  </div>
</template>

<style scoped>
.lcms-product-configurator {
  font-family: var(--lcms-font-body, system-ui, sans-serif);
  color: var(--lcms-color-text, #1f2937);
  /* Keep the wizard's scroll-anchor below any sticky shop header. */
  scroll-margin-top: 90px;
}

.lcms-product-configurator__status {
  text-align: center;
  padding: 2rem 1rem;
  color: var(--lcms-color-muted, #6b7280);
}

.lcms-product-configurator__flow-description {
  margin: 0.75rem 0 0;
  color: var(--lcms-color-muted, #6b7280);
  font-size: 0.9rem;
}

.lcms-product-configurator__heading {
  font-family: var(--lcms-font-heading, var(--lcms-font-body));
  color: var(--lcms-pc-heading-color, var(--lcms-color-text, #1f2937));
  margin: 0 0 1.25rem;
}

.lcms-product-configurator__groups {
  display: flex;
  flex-direction: column;
  /* Per-group padding + top border handles inter-group spacing now;
   * gap on top would double the rhythm. */
  gap: 0;
}

/* Two-column row per group: label on the left (~1/4), control on the right
 * (~3/4). On narrow screens we stack — same flex-column behaviour as before
 * the layout change.
 *
 * `min-width: 0` on the control side prevents inner grids/flex from blowing
 * the column out wider than 3fr would imply (Firefox/Chrome both default
 * grid items to `min-width: auto`, which is the *content* min-content size). */
.lcms-product-configurator__group {
  display: grid;
  grid-template-columns: minmax(140px, 1fr) minmax(0, 3fr);
  gap: 0.75rem 1.5rem;
  align-items: start;
  padding: 1.5rem 0;
}
.lcms-product-configurator__group + .lcms-product-configurator__group {
  border-top: 1px solid var(--lcms-pc-divider, rgba(0, 0, 0, 0.06));
}
@media (max-width: 600px) {
  .lcms-product-configurator__group {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
}

.lcms-product-configurator__group-label {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  font-size: 0.9375rem;
  font-weight: 600;
  padding-top: 0.5rem;
  color: var(--lcms-pc-group-label-color, var(--lcms-color-text, #1f2937));
}

/* Opcjonalny podpis pod etykietą grupy (np. wyjaśnienie wymiarów albumu). */
.lcms-product-configurator__group-description {
  font-size: 0.8125rem;
  font-weight: 400;
  line-height: 1.45;
  margin-top: 0.25rem;
  color: var(--lcms-color-text-muted, #6b7280);
}

/* Flat mode: drop group headings so all groups read as one continuous list.
   Group order (and option order within each) stays as the configurator
   defined it; only the visual section separator is suppressed. */
.lcms-product-configurator__groups--flat .lcms-product-configurator__group-head {
  display: none;
}

.lcms-product-configurator__required {
  font-size: 1.125rem;
  font-weight: 700;
  line-height: 1;
  color: var(--lcms-pc-required-color, var(--lcms-color-danger, #ef4444));
}

.lcms-product-configurator__select {
  width: 100%;
  padding: 0.625rem 0.875rem;
  font-size: 1rem;
  border: 1px solid var(--lcms-pc-option-border, var(--lcms-color-border, #d1d5db));
  background-color: var(--lcms-pc-option-bg, var(--lcms-color-background, #fff));
  color: var(--lcms-pc-option-text, var(--lcms-color-text, #1f2937));
  border-radius: var(--lcms-border-radius, 0.375rem);
  cursor: pointer;

  /* Native <select> on macOS/Safari ignores padding-top/bottom for the
   * collapsed state — browser chrome fixes the element height to font-size
   * + line-height. Without `appearance: none` any user `input_padding`
   * from project Styles silently clips and the select stays tight.
   * We also swap the native dropdown arrow for an inline SVG so the
   * styled select looks right with the larger padding. */
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8' fill='none' stroke='%236b7280' stroke-width='1.5'%3E%3Cpath d='M1 1.5l5 5 5-5'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.875rem center;
  background-size: 12px 8px;
  padding-right: 2.25rem;
}

.lcms-product-configurator__select:hover {
  border-color: var(--lcms-pc-option-border-hover, var(--lcms-color-primary, #3b82f6));
  background: var(--lcms-pc-option-bg-hover, var(--lcms-pc-option-bg, var(--lcms-color-background, #fff)));
}

.lcms-product-configurator__radio-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
/* Grid mode kicks in via inline style from radioGridStyle(group) when
 * radio_columns > 1. The flex-column above is the "stacked full-width"
 * fallback (radio_columns=1 default). */

/* Mobile: cap option grids at 2 columns regardless of the configured count.
 * The inline template reads the count from --lcms-pc-grid-cols, and
 * !important on a custom property is the only thing that outranks an inline
 * style — plain media-query rules would lose. Groups without grid mode have
 * no inline template, so the var is inert there. */
@media (max-width: 640px) {
  .lcms-product-configurator__radio-group,
  .lcms-product-configurator__swatches--grid {
    --lcms-pc-grid-cols: 2 !important;
  }
}

.lcms-product-configurator__radio {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1.125rem;
  border: 1px solid var(--lcms-pc-option-border, var(--lcms-color-border, #d1d5db));
  /* Unselected default = no fill so the project's body background shows through.
   * Filling here from --lcms-color-background made every row read as "selected"
   * when the project bg differs from white. Use --lcms-pc-option-bg ONLY when
   * the user explicitly sets it in the widget config. */
  background: var(--lcms-pc-option-bg, transparent);
  color: var(--lcms-pc-option-text, var(--lcms-color-text, #1f2937));
  border-radius: 0.75rem;
  cursor: pointer;
  transition: background-color 0.15s, border-color 0.15s, color 0.15s, box-shadow 0.15s;
}

.lcms-product-configurator__radio:hover {
  background: var(--lcms-pc-option-bg-hover, rgba(0, 0, 0, 0.02));
  border-color: var(--lcms-pc-option-border-hover, var(--lcms-color-primary, #3b82f6));
  color: var(--lcms-pc-option-text-hover, var(--lcms-pc-option-text, var(--lcms-color-text, #1f2937)));
}

.lcms-product-configurator__radio--selected {
  background: var(--lcms-pc-option-selected-bg, rgba(59, 130, 246, 0.08));
  border-color: var(--lcms-pc-option-selected-border, var(--lcms-color-primary, #3b82f6));
  font-weight: 600;
}
/* Selected check on the trailing edge — replaces the native radio circle as
 * the selected indicator. Drawn with currentColor so it inherits any text
 * colour the project set on selected rows. */
.lcms-product-configurator__radio--selected::after {
  content: '';
  width: 0.75rem;
  height: 0.5rem;
  margin-left: auto;
  border-left: 2px solid var(--lcms-pc-option-selected-border, var(--lcms-color-primary, #3b82f6));
  border-bottom: 2px solid var(--lcms-pc-option-selected-border, var(--lcms-color-primary, #3b82f6));
  transform: rotate(-45deg) translateY(-2px);
  flex-shrink: 0;
}

/* Visually hide the native input but keep it focusable for keyboard / a11y.
 * Selection is now communicated by the chip background + check ::after. */
.lcms-product-configurator__radio input {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: 0;
  padding: 0;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  overflow: hidden;
  white-space: nowrap;
}
.lcms-product-configurator__radio:focus-within {
  box-shadow: 0 0 0 3px var(--lcms-pc-option-selected-ring, rgba(59, 130, 246, 0.22));
}

.lcms-product-configurator__radio-label {
  flex: 1;
}

.lcms-product-configurator__price-delta {
  font-size: 0.875rem;
  color: var(--lcms-color-muted, #6b7280);
  font-weight: 500;
}

.lcms-product-configurator__swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

/* Wraps each swatch + its caption (name + price). Layout = column so caption
 * sits below the swatch. Cells centre horizontally so the swatch + label sit
 * in the middle of their grid track regardless of column width. */
.lcms-product-configurator__swatch-cell {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
  text-align: center;
}

/* Wrapper sized to the swatch image so the magnifier anchors to the IMAGE
   corner, not the (wider, centered) grid cell — otherwise it floats out in
   the margin next to the swatch. */
.lcms-product-configurator__swatch-imgwrap {
  position: relative;
  display: inline-block;
  line-height: 0;
}

/* Magnifier tucked into the swatch's top-right corner. Hidden until the
   swatch is hovered (desktop); on touch it stays faintly visible so the
   zoom is still reachable. Opens the option image in the lightbox without
   selecting the option. */
.lcms-product-configurator__swatch-zoom {
  position: absolute;
  top: 5px;
  right: 5px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.92);
  color: var(--lcms-pc-option-text, var(--lcms-color-text, #1f2937));
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
  cursor: zoom-in;
  opacity: 0;
  transition: opacity 0.12s ease;
  z-index: 1;
}

.lcms-product-configurator__swatch-imgwrap:hover .lcms-product-configurator__swatch-zoom,
.lcms-product-configurator__swatch-zoom:focus-visible {
  opacity: 1;
}

/* Touch devices have no hover — keep the magnifier faintly visible there. */
@media (hover: none) {
  .lcms-product-configurator__swatch-zoom {
    opacity: 0.7;
  }
}

.lcms-product-configurator__swatch {
  /* Default size = md. Per-group size class on parent overrides. */
  width: 4.5rem;
  height: 4.5rem;
  border: 2px solid var(--lcms-pc-option-border, var(--lcms-color-border, #d1d5db));
  border-radius: var(--lcms-border-radius, 0.375rem);
  cursor: pointer;
  padding: 0;
  overflow: hidden;
  background: var(--lcms-pc-option-bg, transparent);
  /* No transition on border-color: hover should feel instant. The 1.03 scale
   * pop also gone — it caused the perceived "lag" the user reported because
   * transform animations stack on top of the border colour shift. */
}

.lcms-product-configurator__swatch:hover {
  border-color: var(--lcms-pc-option-border-hover, var(--lcms-color-primary, #3b82f6));
}

.lcms-product-configurator__swatch--selected {
  border-color: var(--lcms-pc-option-selected-border, var(--lcms-color-primary, #3b82f6));
  box-shadow: 0 0 0 2px var(--lcms-pc-option-selected-bg, rgba(59, 130, 246, 0.2));
}

.lcms-product-configurator__swatch--image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* Per-group swatch sizing — small / medium / large. Applied via the wrapping
 * group div so all swatches in a group share the same dimensions. */
.lcms-product-configurator__group--swatch-sm .lcms-product-configurator__swatch {
  width: 2.75rem;
  height: 2.75rem;
}
.lcms-product-configurator__group--swatch-md .lcms-product-configurator__swatch {
  width: 4.5rem;
  height: 4.5rem;
}
.lcms-product-configurator__group--swatch-lg .lcms-product-configurator__swatch {
  width: 6.5rem;
  height: 6.5rem;
}

/* Grid layout for image swatches: cells stretch to column width, swatch fills
 * its cell, aspect-ratio keeps the image square. The fixed width/height from
 * .lcms-product-configurator__swatch--image is overridden so grid sizing wins.
 * Color swatches stay flex (small dots, flex-wrap is fine). */
.lcms-product-configurator__swatches--grid {
  gap: 0.75rem;
}
.lcms-product-configurator__swatches--grid .lcms-product-configurator__swatch-cell {
  width: auto;
}
.lcms-product-configurator__swatches--grid .lcms-product-configurator__swatch--image {
  width: 100%;
  height: auto;
  aspect-ratio: 1 / 1;
}
.lcms-product-configurator__swatches--grid .lcms-product-configurator__swatch-caption {
  max-width: none;
}

.lcms-product-configurator__swatch-caption {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.125rem;
  line-height: 1.2;
  max-width: 100%;
}

.lcms-product-configurator__swatch-name {
  font-weight: 500;
  color: var(--lcms-color-text, #1f2937);
  word-break: break-word;
}

.lcms-product-configurator__swatch-price {
  font-weight: 600;
  color: var(--lcms-color-muted, #6b7280);
  font-size: 0.8125rem;
}

.lcms-product-configurator__chip {
  padding: 0.5rem 0.875rem;
  font-size: 0.9375rem;
  border: 1px solid var(--lcms-pc-option-border, var(--lcms-color-border, #d1d5db));
  background: var(--lcms-pc-option-bg, transparent);
  color: var(--lcms-pc-option-text, var(--lcms-color-text, #1f2937));
  border-radius: var(--lcms-border-radius, 0.375rem);
  cursor: pointer;
  transition: background-color 0.15s, border-color 0.15s, color 0.15s;
}

.lcms-product-configurator__chip:hover {
  background: var(--lcms-pc-option-bg-hover, rgba(0, 0, 0, 0.02));
  border-color: var(--lcms-pc-option-border-hover, var(--lcms-color-primary, #3b82f6));
  color: var(--lcms-pc-option-text-hover, var(--lcms-pc-option-text, var(--lcms-color-text, #1f2937)));
}

.lcms-product-configurator__chip--selected {
  background: var(--lcms-pc-option-selected-bg, rgba(59, 130, 246, 0.08));
  border-color: var(--lcms-pc-option-selected-border, var(--lcms-color-primary, #3b82f6));
}

.lcms-product-configurator__swatch-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: var(--lcms-color-background-alt, #f3f4f6);
  color: var(--lcms-color-muted, #6b7280);
  font-weight: 600;
  font-size: 0.875rem;
}

.lcms-product-configurator__text-input,
.lcms-product-configurator__numeric-input {
  width: 100%;
  padding: 0.625rem 0.875rem;
  font-size: 1rem;
  border: 1px solid var(--lcms-pc-option-border, var(--lcms-color-border, #d1d5db));
  background: var(--lcms-pc-option-bg, var(--lcms-color-background, #fff));
  color: var(--lcms-pc-option-text, var(--lcms-color-text, #1f2937));
  border-radius: var(--lcms-border-radius, 0.375rem);
}

.lcms-product-configurator__text-input:focus,
.lcms-product-configurator__numeric-input:focus,
.lcms-product-configurator__select:focus {
  outline: none;
  border-color: var(
    --lcms-pc-input-focus,
    var(--lcms-pc-option-selected-border, var(--lcms-color-primary, #3b82f6))
  );
}

.lcms-product-configurator__text-input::placeholder,
.lcms-product-configurator__numeric-input::placeholder {
  color: var(--lcms-pc-input-placeholder, var(--lcms-color-muted, #9ca3af));
}

.lcms-product-configurator__textarea-wrap {
  width: 100%;
}

.lcms-product-configurator__textarea {
  display: block;
  font-family: inherit;
  line-height: 1.5;
  resize: vertical;
  min-height: 2.5rem;
}

.lcms-product-configurator__char-counter {
  margin-top: 0.25rem;
  text-align: right;
  font-size: 0.75rem;
  color: var(--lcms-pc-input-placeholder, var(--lcms-color-muted, #9ca3af));
}

.lcms-product-configurator__numeric {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.lcms-product-configurator__numeric-input {
  width: 8rem;
}

/* Stepper: -/+ buttons flank a centered numeric input. Buttons share the same
 * border/colors as the option swatches so theming flows consistently. */
.lcms-product-configurator__stepper {
  display: inline-flex;
  align-items: stretch;
  border: 1px solid var(--lcms-pc-option-border, var(--lcms-color-border, #d1d5db));
  border-radius: var(--lcms-border-radius, 0.375rem);
  overflow: hidden;
  height: 2.75rem;
}
.lcms-product-configurator__stepper-btn {
  width: 2.75rem;
  border: 0;
  background: var(--lcms-pc-option-bg, transparent);
  color: var(--lcms-pc-option-text, var(--lcms-color-text, #1f2937));
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}
.lcms-product-configurator__stepper-btn:hover:not(:disabled) {
  background: var(--lcms-pc-option-bg-hover, rgba(0, 0, 0, 0.04));
  color: var(--lcms-pc-option-text-hover, var(--lcms-color-primary, #3b82f6));
}
.lcms-product-configurator__stepper-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.lcms-product-configurator__stepper-input {
  width: 5rem;
  border: 0;
  border-left: 1px solid var(--lcms-pc-option-border, var(--lcms-color-border, #d1d5db));
  border-right: 1px solid var(--lcms-pc-option-border, var(--lcms-color-border, #d1d5db));
  background: var(--lcms-pc-option-bg, transparent);
  color: var(--lcms-pc-option-text, var(--lcms-color-text, #1f2937));
  text-align: center;
  font-size: 1rem;
  -moz-appearance: textfield;
}
/* Hide the native spinner — we have explicit buttons. */
.lcms-product-configurator__stepper-input::-webkit-outer-spin-button,
.lcms-product-configurator__stepper-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.lcms-product-configurator__stepper-input:focus {
  outline: none;
}

.lcms-product-configurator__numeric-rate {
  font-size: 0.875rem;
  color: var(--lcms-color-muted, #6b7280);
}

.lcms-product-configurator__numeric-free {
  font-size: 0.8125rem;
  opacity: 0.85;
}

.lcms-product-configurator__summary {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 1rem 0;
  margin: 1.5rem 0;
  border-top: 1px solid var(--lcms-color-border, #e5e7eb);
  border-bottom: 1px solid var(--lcms-color-border, #e5e7eb);
  color: var(--lcms-pc-summary-color, var(--lcms-color-text, #1f2937));
}

.lcms-product-configurator__summary-label {
  font-size: 1rem;
  font-weight: 500;
}

.lcms-product-configurator__summary-amount {
  font-size: 1.5rem;
  font-weight: 700;
  /* Inherit typography color unless user explicitly sets amount_color */
  color: var(--lcms-pc-summary-amount-color, inherit);
}

/* Button styling is delegated to the global .lcms-button__link--{variant}
 * classes (defined in styles/widgets.css). Only layout-specific overrides
 * stay here: full width, disabled state. */
.lcms-product-configurator__button {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.lcms-product-configurator__button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.lcms-product-configurator__spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: currentColor;
  border-radius: 50%;
  animation: lcms-pc-spin 0.8s linear infinite;
}

@keyframes lcms-pc-spin {
  to { transform: rotate(360deg); }
}

/* Checkbox group — beefed up so the YES toggle is unmistakable. Renders as
 * a clickable card that visibly highlights when checked, instead of the prior
 * tight inline label that disappeared on a busy product page. */
.lcms-product-configurator__checkbox {
  display: inline-flex;
  align-items: center;
  gap: 0.625rem;
  cursor: pointer;
  font-size: 1rem;
  user-select: none;
  padding: 0.625rem 0.875rem;
  border: 1px solid var(--lcms-pc-option-border, var(--lcms-color-border, #d1d5db));
  border-radius: var(--lcms-border-radius, 0.375rem);
  background: var(--lcms-pc-option-bg, transparent);
  color: var(--lcms-pc-option-text, var(--lcms-color-text, #1f2937));
  align-self: flex-start;
}
.lcms-product-configurator__checkbox:hover {
  border-color: var(--lcms-pc-option-border-hover, var(--lcms-color-primary, #3b82f6));
}
.lcms-product-configurator__checkbox--checked {
  background: var(--lcms-pc-option-selected-bg, rgba(59, 130, 246, 0.08));
  border-color: var(--lcms-pc-option-selected-border, var(--lcms-color-primary, #3b82f6));
}
.lcms-product-configurator__checkbox input[type="checkbox"] {
  width: 22px;
  height: 22px;
  cursor: pointer;
  accent-color: var(--lcms-color-primary, #50a5f1);
  margin: 0;
}
.lcms-product-configurator__checkbox-label {
  font-weight: 600;
  letter-spacing: 0.3px;
}
.lcms-product-configurator__checkbox-price {
  color: var(--lcms-color-muted, #74788d);
  font-size: 0.9em;
}
/* Optional preview thumbnail right of the checkbox box, before the label.
   Constrained height so it doesn't dominate the row regardless of source aspect. */
.lcms-product-configurator__checkbox-image {
  height: 44px;
  width: auto;
  max-width: 64px;
  object-fit: contain;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.03);
}

/* --- Wizard mode -------------------------------------------------------- */
.lcms-product-configurator__progress {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  margin-bottom: 1.25rem;
}
.lcms-product-configurator__progress-bar {
  height: 8px;
  background: var(--lcms-color-background-alt, #f3f4f6);
  border-radius: 9999px;
  overflow: hidden;
}
.lcms-product-configurator__progress-fill {
  height: 100%;
  background: var(--lcms-color-primary, #3b82f6);
  transition: width 0.3s ease;
}
.lcms-product-configurator__progress-label {
  display: flex;
  justify-content: space-between;
  font-size: 0.8125rem;
  color: var(--lcms-color-muted, #6b7280);
}
.lcms-product-configurator__progress-percent {
  font-weight: 600;
  color: var(--lcms-color-text, #1f2937);
}

.lcms-product-configurator__summary-list {
  border: 1px solid var(--lcms-color-border, #e5e7eb);
  border-radius: var(--lcms-border-radius, 0.5rem);
  padding: 1rem 1.25rem;
  background: var(--lcms-color-background, #fff);
  margin-bottom: 1rem;
}
.lcms-product-configurator__summary-title {
  margin: 0 0 0.75rem 0;
  font-size: 1.125rem;
  font-weight: 600;
}
.lcms-product-configurator__summary-list ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.lcms-product-configurator__summary-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px dashed var(--lcms-color-border, #e5e7eb);
}
.lcms-product-configurator__summary-list li:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}

.lcms-product-configurator__summary-value {
  display: inline-flex;
  align-items: center;
  gap: 0.625rem;
  /* Match the 32px thumbnail height so text-only rows are just as tall */
  min-height: 32px;
  text-align: right;
}

.lcms-product-configurator__summary-thumb {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border: 1px solid var(--lcms-color-border, #d1d5db);
  border-radius: 0.25rem;
  background: #fff;
  padding: 0;
  cursor: zoom-in;
  overflow: hidden;
  transition: transform 0.12s ease, border-color 0.12s ease;
}

.lcms-product-configurator__summary-thumb:hover {
  transform: scale(1.08);
  border-color: var(--lcms-color-primary, #3b82f6);
}

.lcms-product-configurator__summary-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.lcms-product-configurator__summary-thumb--color {
  background-clip: padding-box;
}

.lcms-product-configurator__lightbox {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.78);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 2rem;
  cursor: zoom-out;
}

.lcms-product-configurator__lightbox-image {
  max-width: min(90vw, 1200px);
  max-height: 90vh;
  object-fit: contain;
  border-radius: 0.5rem;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.5);
  cursor: default;
}

.lcms-product-configurator__lightbox-color {
  width: min(60vw, 400px);
  height: min(60vw, 400px);
  border-radius: 0.5rem;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.5);
  cursor: default;
}

.lcms-product-configurator__wizard-nav {
  display: flex;
  gap: 0.5rem;
  justify-content: space-between;
  margin-top: 1.25rem;
}
.lcms-product-configurator__nav-btn {
  flex: 1;
  padding: 0.75rem 1rem;
  border-radius: var(--lcms-btn-border-radius, 0.375rem);
  border: 1px solid transparent;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}
.lcms-product-configurator__nav-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.lcms-product-configurator__nav-btn--primary {
  background: var(--lcms-color-primary, #3b82f6);
  color: var(--lcms-color-white, #fff);
}
.lcms-product-configurator__nav-btn--secondary {
  background: var(--lcms-color-background, #fff);
  color: var(--lcms-color-text, #1f2937);
  border-color: var(--lcms-color-border, #d1d5db);
}
.lcms-product-configurator__summary-actions {
  display: flex;
  gap: 0.5rem;
  align-items: stretch;
  margin-top: 1.25rem;
}
/* CTA in the row takes remaining space. Override the standalone width:100%
 * (used outside summary mode) so flex can distribute width across both
 * buttons instead of forcing the CTA to consume the full container width. */
.lcms-product-configurator__summary-actions > .lcms-product-configurator__button {
  flex: 1 1 0;
  width: auto;
}
/* Back button stays narrow on the left as a secondary outline, height
 * inherited from the matching `lcms-button__link--size-{x}` class. */
.lcms-product-configurator__back-btn {
  flex: 0 0 auto;
  min-width: 7rem;
}

.lcms-product-configurator__step-label {
  font-family: var(--lcms-font-heading, var(--lcms-font-body));
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 0.75rem 0;
  color: var(--lcms-pc-heading-color, var(--lcms-color-text, #1f2937));
}

.lcms-product-configurator__step-title {
  font-family: var(--lcms-font-heading, var(--lcms-font-body));
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 1rem 0;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--lcms-color-border, #e5e7eb);
  color: var(--lcms-pc-heading-color, var(--lcms-color-text, #1f2937));
}

.lcms-product-configurator__file {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.lcms-product-configurator__file-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.lcms-product-configurator__file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border: 1px solid var(--lcms-color-border, #dee2e6);
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.02);
  font-size: 0.875rem;
}
.lcms-product-configurator__file-item > i:first-child {
  color: var(--lcms-color-muted, #74788d);
  font-size: 18px;
}
.lcms-product-configurator__file-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.lcms-product-configurator__file-size {
  color: var(--lcms-color-muted, #74788d);
  font-size: 0.75rem;
  flex-shrink: 0;
}
.lcms-product-configurator__file-remove {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--lcms-color-muted, #adb5bd);
  font-size: 18px;
  line-height: 1;
  padding: 0;
  transition: color 0.15s ease;
}
.lcms-product-configurator__file-remove:hover {
  color: var(--lcms-color-danger, #dc3545);
}
.lcms-product-configurator__file-trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1px dashed var(--lcms-color-border, #ced4da);
  border-radius: 6px;
  cursor: pointer;
  color: var(--lcms-color-muted, #74788d);
  font-size: 0.875rem;
  transition: border-color 0.15s ease, color 0.15s ease, background-color 0.15s ease;
  align-self: flex-start;
}
.lcms-product-configurator__file-trigger:hover {
  border-color: var(--lcms-color-primary, #50a5f1);
  color: var(--lcms-color-primary, #50a5f1);
  background: rgba(80, 165, 241, 0.05);
}
.lcms-product-configurator__file-trigger.is-uploading {
  pointer-events: none;
  opacity: 0.7;
}
.lcms-product-configurator__file-hint {
  font-size: 0.75rem;
  color: var(--lcms-color-muted, #74788d);
}
</style>
