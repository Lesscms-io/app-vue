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

import { computed, ref, onMounted, watch, inject, type Ref } from 'vue'
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
      noOptions: 'Ten produkt nie ma opcji do skonfigurowania.',
      required: 'wymagane',
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
    },
    en: {
      loading: 'Loading...',
      notFound: 'Product not found',
      noOptions: 'This product has no configurable options.',
      required: 'required',
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
// Free-form value state: group_uuid -> string/number (for text/numeric groups)
const customValues = ref<Record<string, string | number>>({})
// File-upload state: group_uuid -> list of uploaded files
const fileUploads = ref<Record<string, StorefrontOptionUpload[]>>({})
// Per-group upload progress / error
const fileUploadStatus = ref<Record<string, { uploading: boolean; error: string | null }>>({})

// Apply default selections when product loads
watch(
  allGroups,
  (groups) => {
    const nextSelected: Record<string, string> = {}
    const nextCustom: Record<string, string | number> = {}
    const nextFiles: Record<string, StorefrontOptionUpload[]> = {}
    for (const group of groups) {
      if (group.display_type === 'numeric') {
        nextCustom[group.uuid] = group.numeric_min ?? 0
      } else if (group.display_type === 'text') {
        nextCustom[group.uuid] = ''
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
    selectedOptions.value = nextSelected
    customValues.value = nextCustom
    fileUploads.value = nextFiles
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

const visibleGroups = computed<StorefrontProductOptionGroup[]>(() => {
  const result: StorefrontProductOptionGroup[] = []
  const visibleSelections = new Set<string>()
  for (const group of allGroups.value) {
    if (!isVisible(group as any, visibleSelections)) continue
    result.push(group)
    const sel = selectedOptions.value[group.uuid]
    if (sel) visibleSelections.add(sel)
  }
  return result
})

// Selection set built from currently-visible groups — used by per-option rules.
const selectedSet = computed(() => {
  const set = new Set<string>()
  for (const g of visibleGroups.value) {
    const s = selectedOptions.value[g.uuid]
    if (s) set.add(s)
  }
  return set
})

// Price calculation — base + sum of modifiers from selected options
function applyModifier(base: number, option: StorefrontProductOption): number {
  if (!option.price_modifier_type || option.price_modifier_value === null) return 0
  if (option.price_modifier_type === 'percentage') {
    return base * (option.price_modifier_value / 100)
  }
  return option.price_modifier_value
}

const basePrice = computed(() => {
  const p = effectiveProduct.value
  return p ? Number(p.price) || 0 : 0
})

const totalPrice = computed(() => {
  let total = basePrice.value
  for (const group of visibleGroups.value) {
    if (group.display_type === 'numeric') {
      const qty = Number(customValues.value[group.uuid] ?? 0)
      if (qty > 0 && group.price_per_unit) {
        total += qty * group.price_per_unit
      }
      continue
    }
    if (group.display_type === 'text') continue
    const selectedUuid = selectedOptions.value[group.uuid]
    if (!selectedUuid) continue
    const option = group.options.find((o) => o.uuid === selectedUuid)
    if (!option) continue
    total += applyModifier(basePrice.value, option)
  }
  return total
})

// All required groups must have a valid value before add-to-cart enables
const missingRequired = computed(() =>
  visibleGroups.value.filter((g) => g.is_required).some((g) => {
    if (g.display_type === 'text') {
      return !String(customValues.value[g.uuid] ?? '').trim()
    }
    if (g.display_type === 'numeric') {
      const v = Number(customValues.value[g.uuid] ?? NaN)
      return isNaN(v) || (g.numeric_min != null && v < g.numeric_min)
    }
    if (g.display_type === 'file') {
      return (fileUploads.value[g.uuid] || []).length === 0
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
  // customer isn't logged in, redirect to the login URL with `?return=<here>`
  // so they land back on this product page.
  if (cta.requires_auth && !customer.isAuthenticated.value) {
    const loginUrl = projectConfig?.value?.commerce?.routes?.account || '/konto'
    const returnTo = typeof window !== 'undefined' ? window.location.href : ''
    const sep = loginUrl.includes('?') ? '&' : '?'
    if (typeof window !== 'undefined') {
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
    isAdding.value = true
    try {
      const returnUrl = typeof window !== 'undefined' ? window.location.href : ''
      const response = await client.value.callPluginEndpoint<{
        data?: { redirect_url?: string; designer_url?: string }
        designer_url?: string
        redirect_url?: string
      }>(cta.post_url, {
        body: {
          product_id: p.uuid,
          return_url: returnUrl,
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
  selectedOptions.value = { ...selectedOptions.value, [groupUuid]: optionUuid }
}

function setCustomValue(groupUuid: string, value: string | number) {
  customValues.value = { ...customValues.value, [groupUuid]: value }
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

function optionPriceDeltaText(option: StorefrontProductOption): string {
  const delta = applyModifier(basePrice.value, option)
  if (!delta) return ''
  const sign = delta > 0 ? '+' : ''
  return `${sign}${formatPrice(delta, currency.value)}`
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

async function handleAddToCart() {
  const p = effectiveProduct.value
  if (!p) return
  if (missingRequired.value) {
    toast.error(t('fillRequired'))
    return
  }

  // Build metadata payload: selected options with their resolved names and prices
  const configuredOptions: Array<Record<string, unknown>> = []
  for (const g of visibleGroups.value) {
    if (g.display_type === 'text') {
      const value = String(customValues.value[g.uuid] ?? '').trim()
      if (!value) continue
      configuredOptions.push({
        group_uuid: g.uuid,
        group_name: g.name,
        type: 'text',
        value,
        price_delta: 0,
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
      const delta = g.price_per_unit ? qty * g.price_per_unit : 0
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
        price_delta: applyModifier(basePrice.value, opt),
      })
    }
  }

  const metadata = {
    configured_options: configuredOptions,
    configured_total: totalPrice.value,
  }

  isAdding.value = true
  try {
    await cart.addItem(p.uuid, 1, metadata)
    toast.success(t('addedToCart'))
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
const cssVars = computed(() => ({
  '--lcms-pc-heading-color': heading.value.color || '',
  '--lcms-pc-group-label-color': groupLabel.value.color || '',
  '--lcms-pc-required-color': groupLabel.value.required_color || '',
  '--lcms-pc-option-bg': optionStyle.value.background || '',
  '--lcms-pc-option-bg-hover': optionStyle.value['background:hover'] || '',
  '--lcms-pc-option-border': optionStyle.value.border_color || '',
  '--lcms-pc-option-border-hover': optionStyle.value['border_color:hover'] || '',
  '--lcms-pc-option-selected-bg': optionStyle.value.selected_background || '',
  '--lcms-pc-option-selected-border': optionStyle.value.selected_border_color || '',
  '--lcms-pc-option-text': optionStyle.value.text_color || '',
  '--lcms-pc-option-text-hover': optionStyle.value['text_color:hover'] || '',
  '--lcms-pc-summary-color': priceSummary.value.color || '',
  '--lcms-pc-summary-amount-color': priceSummary.value.amount_color || '',
}))
</script>

<template>
  <div class="lcms-product-configurator" :style="[cssVars, inputFocusVars]">
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

      <div v-if="allGroups.length === 0" class="lcms-product-configurator__empty">
        {{ t('noOptions') }}
      </div>

      <div v-else class="lcms-product-configurator__groups">
        <div
          v-for="group in visibleGroups"
          :key="group.uuid"
          class="lcms-product-configurator__group"
        >
          <div class="lcms-product-configurator__group-label">
            <span class="lcms-product-configurator__group-name">{{ group.name }}</span>
            <span
              v-if="showRequiredBadge && group.is_required"
              class="lcms-product-configurator__required"
            >{{ t('required') }}</span>
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
              <button
                v-if="opt.color_hex"
                type="button"
                class="lcms-product-configurator__swatch lcms-product-configurator__swatch--color"
                :class="{ 'lcms-product-configurator__swatch--selected': selectedOptions[group.uuid] === opt.uuid }"
                :title="opt.name + (optionPriceDeltaText(opt) ? ` (${optionPriceDeltaText(opt)})` : '')"
                :style="{ backgroundColor: opt.color_hex }"
                :aria-label="opt.name"
                @click="selectOption(group.uuid, opt.uuid)"
              />
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
            class="lcms-product-configurator__swatches"
          >
            <template v-for="opt in visibleOptionsOf(group, selectedSet)" :key="opt.uuid">
              <button
                v-if="opt.thumbnail"
                type="button"
                class="lcms-product-configurator__swatch lcms-product-configurator__swatch--image"
                :class="{ 'lcms-product-configurator__swatch--selected': selectedOptions[group.uuid] === opt.uuid }"
                :title="opt.name + (optionPriceDeltaText(opt) ? ` (${optionPriceDeltaText(opt)})` : '')"
                :aria-label="opt.name"
                @click="selectOption(group.uuid, opt.uuid)"
              >
                <img :src="opt.thumbnail" :alt="opt.name" />
              </button>
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
            @input="setCustomValue(group.uuid, ($event.target as HTMLInputElement).value)"
          />

          <!-- numeric input display -->
          <div
            v-else-if="group.display_type === 'numeric'"
            class="lcms-product-configurator__numeric"
          >
            <input
              type="number"
              class="lcms-product-configurator__numeric-input"
              :style="inputInlineStyle"
              :value="customValues[group.uuid] ?? ''"
              :min="group.numeric_min ?? undefined"
              :max="group.numeric_max ?? undefined"
              :step="group.numeric_step ?? 1"
              @input="setCustomValue(group.uuid, Number(($event.target as HTMLInputElement).value))"
            />
            <span
              v-if="group.price_per_unit"
              class="lcms-product-configurator__numeric-rate"
            >× {{ formatPrice(group.price_per_unit, currency) }}</span>
          </div>

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
        </div>
      </div>

      <div v-if="showPriceSummary" class="lcms-product-configurator__summary">
        <span class="lcms-product-configurator__summary-label">{{ totalLabelText }}</span>
        <span class="lcms-product-configurator__summary-amount">
          {{ formatPrice(totalPrice, currency) }}
        </span>
      </div>

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
    </template>
  </div>
</template>

<style scoped>
.lcms-product-configurator {
  font-family: var(--lcms-font-body, system-ui, sans-serif);
  color: var(--lcms-color-text, #1f2937);
}

.lcms-product-configurator__status,
.lcms-product-configurator__empty {
  text-align: center;
  padding: 2rem 1rem;
  color: var(--lcms-color-muted, #6b7280);
}

.lcms-product-configurator__heading {
  font-family: var(--lcms-font-heading, var(--lcms-font-body));
  color: var(--lcms-pc-heading-color, var(--lcms-color-text, #1f2937));
  margin: 0 0 1.25rem;
}

.lcms-product-configurator__groups {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.lcms-product-configurator__group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.lcms-product-configurator__group-label {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--lcms-pc-group-label-color, var(--lcms-color-text, #1f2937));
}

.lcms-product-configurator__required {
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
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

.lcms-product-configurator__radio {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 0.875rem;
  border: 1px solid var(--lcms-pc-option-border, var(--lcms-color-border, #d1d5db));
  background: var(--lcms-pc-option-bg, var(--lcms-color-background, #fff));
  color: var(--lcms-pc-option-text, var(--lcms-color-text, #1f2937));
  border-radius: var(--lcms-border-radius, 0.375rem);
  cursor: pointer;
  transition: background-color 0.15s, border-color 0.15s, color 0.15s;
}

.lcms-product-configurator__radio:hover {
  background: var(--lcms-pc-option-bg-hover, var(--lcms-pc-option-bg, var(--lcms-color-background, #fff)));
  border-color: var(--lcms-pc-option-border-hover, var(--lcms-color-primary, #3b82f6));
  color: var(--lcms-pc-option-text-hover, var(--lcms-pc-option-text, var(--lcms-color-text, #1f2937)));
}

.lcms-product-configurator__radio--selected {
  background: var(--lcms-pc-option-selected-bg, rgba(59, 130, 246, 0.08));
  border-color: var(--lcms-pc-option-selected-border, var(--lcms-color-primary, #3b82f6));
}

.lcms-product-configurator__radio input {
  margin: 0;
  accent-color: var(--lcms-color-primary, #3b82f6);
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
  gap: 0.5rem;
}

.lcms-product-configurator__swatch {
  width: 2.75rem;
  height: 2.75rem;
  border: 2px solid var(--lcms-pc-option-border, var(--lcms-color-border, #d1d5db));
  border-radius: var(--lcms-border-radius, 0.375rem);
  cursor: pointer;
  padding: 0;
  overflow: hidden;
  transition: border-color 0.15s, transform 0.1s;
}

.lcms-product-configurator__swatch:hover {
  border-color: var(--lcms-pc-option-border-hover, var(--lcms-color-primary, #3b82f6));
  transform: scale(1.03);
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

.lcms-product-configurator__chip {
  padding: 0.5rem 0.875rem;
  font-size: 0.9375rem;
  border: 1px solid var(--lcms-pc-option-border, var(--lcms-color-border, #d1d5db));
  background: var(--lcms-pc-option-bg, var(--lcms-color-background, #fff));
  color: var(--lcms-pc-option-text, var(--lcms-color-text, #1f2937));
  border-radius: var(--lcms-border-radius, 0.375rem);
  cursor: pointer;
  transition: background-color 0.15s, border-color 0.15s, color 0.15s;
}

.lcms-product-configurator__chip:hover {
  background: var(--lcms-pc-option-bg-hover, var(--lcms-pc-option-bg, var(--lcms-color-background, #fff)));
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

.lcms-product-configurator__numeric {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.lcms-product-configurator__numeric-input {
  width: 8rem;
}

.lcms-product-configurator__numeric-rate {
  font-size: 0.875rem;
  color: var(--lcms-color-muted, #6b7280);
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
