<script setup lang="ts">
/**
 * Product Configurator Wizard Widget
 *
 * Same data + visibility model as LcmsProductConfigurator, but renders one
 * group per step with prev/next navigation and a progress bar.
 *
 * Skipping rules: groups whose visibility_rule (or legacy
 * visible_when_option_uuids) is not satisfied are filtered out before stepping.
 * If the user goes back and changes a choice that hides previously-visited
 * groups, the wizard auto-snaps to a still-visible step.
 */

import { computed, ref, onMounted, watch, inject, type Ref } from 'vue'
import { useLanguage } from '../../../composables/useLanguage'
import { useStorefront } from '../../../composables/useStorefront'
import { useCart } from '../../../composables/useCart'
import { useToast } from '../../../composables/useToast'
import { formatPrice } from '../../../utils/currency'
import { isVisible } from '../../../utils/visibility'
import type {
  StorefrontProduct,
  StorefrontProductOptionGroup,
  StorefrontProductOption,
} from '../../../api/storefront'

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
const toast = useToast()
const projectConfig = inject<Ref<any> | null>('lesscms-project-config', null)
const resolvedRoute = inject<Ref<ResolvedRoute | null> | null>('routeParams', null)
const injectedProduct = inject<Ref<any> | null>('lcms-product', null)

const config = computed(() => props.data?.config || {})
const heading = computed(() => props.data?.heading || {})
const addToCartButton = computed(() => props.data?.add_to_cart_button || {})

const slugSource = computed(() => config.value.slug_source || 'url')
const slugUrlSegment = computed(() => Number(config.value.slug_url_segment ?? 2))
const staticSlug = computed(() => config.value.slug || '')
const showProgress = computed(() => config.value.show_progress !== false)
const showStepCount = computed(() => config.value.show_step_count !== false)

const currency = computed(() => projectConfig?.value?.commerce?.currency || 'PLN')

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

const t = (key: string) => {
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
      back: 'Wstecz',
      next: 'Dalej',
      step: 'Krok',
      of: 'z',
      summary: 'Podsumowanie',
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
      back: 'Back',
      next: 'Next',
      step: 'Step',
      of: 'of',
      summary: 'Summary',
    },
  }
  return dict[lang]?.[key] || dict.pl[key] || key
}

const headingText = computed(() => extractValue(heading.value.text) || t('defaultHeading'))
const headingTag = computed(() => heading.value.tag || 'h3')
const buttonText = computed(() => extractValue(addToCartButton.value.text) || t('defaultButton'))

const allGroups = computed<StorefrontProductOptionGroup[]>(() => {
  const p = effectiveProduct.value
  if (!p?.option_groups?.length) return []
  return [...p.option_groups].sort((a, b) => a.sort_order - b.sort_order)
})

// State
const selectedOptions = ref<Record<string, string>>({})
const customValues = ref<Record<string, string | number>>({})
const currentStep = ref(0)
const showSummary = ref(false)

watch(
  allGroups,
  (groups) => {
    const nextSelected: Record<string, string> = {}
    const nextCustom: Record<string, string | number> = {}
    for (const group of groups) {
      if (group.display_type === 'numeric') {
        nextCustom[group.uuid] = group.numeric_min ?? 0
      } else if (group.display_type === 'text') {
        nextCustom[group.uuid] = ''
      } else {
        const defaultOpt = group.options.find((o) => o.is_default) || null
        if (defaultOpt) nextSelected[group.uuid] = defaultOpt.uuid
      }
    }
    selectedOptions.value = nextSelected
    customValues.value = nextCustom
    currentStep.value = 0
    showSummary.value = false
  },
  { immediate: true }
)

// Compute visible groups walking sort_order — only count selections from already-visible groups.
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

const selectedSet = computed(() => {
  const set = new Set<string>()
  for (const g of visibleGroups.value) {
    const s = selectedOptions.value[g.uuid]
    if (s) set.add(s)
  }
  return set
})

function visibleOptionsOf(group: StorefrontProductOptionGroup): StorefrontProductOption[] {
  return (group.options || []).filter((opt) => isVisible(opt as any, selectedSet.value))
}

// Snap currentStep into bounds when visible groups change.
watch(visibleGroups, (groups) => {
  if (currentStep.value > groups.length - 1) {
    currentStep.value = Math.max(0, groups.length - 1)
  }
})

const totalSteps = computed(() => visibleGroups.value.length)
const currentGroup = computed<StorefrontProductOptionGroup | null>(() =>
  visibleGroups.value[currentStep.value] || null,
)
const isLastStep = computed(() => currentStep.value >= totalSteps.value - 1)
const isFirstStep = computed(() => currentStep.value === 0)
const progressPercent = computed(() => {
  if (totalSteps.value === 0) return 0
  if (showSummary.value) return 100
  return Math.round(((currentStep.value + 1) / totalSteps.value) * 100)
})

function isCurrentStepValid(): boolean {
  const g = currentGroup.value
  if (!g || !g.is_required) return true
  if (g.display_type === 'text') {
    return !!String(customValues.value[g.uuid] ?? '').trim()
  }
  if (g.display_type === 'numeric') {
    const v = Number(customValues.value[g.uuid] ?? NaN)
    return !isNaN(v) && (g.numeric_min == null || v >= g.numeric_min)
  }
  return !!selectedOptions.value[g.uuid]
}

function selectOption(groupUuid: string, optionUuid: string) {
  selectedOptions.value = { ...selectedOptions.value, [groupUuid]: optionUuid }
}

function setCustomValue(groupUuid: string, value: string | number) {
  customValues.value = { ...customValues.value, [groupUuid]: value }
}

function goNext() {
  if (!isCurrentStepValid()) {
    toast.error(t('fillRequired'))
    return
  }
  if (isLastStep.value) {
    showSummary.value = true
    return
  }
  currentStep.value += 1
}

function goPrev() {
  if (showSummary.value) {
    showSummary.value = false
    return
  }
  if (currentStep.value > 0) currentStep.value -= 1
}

// Price calc — type column dropped in BE migration 2026_05_05; value is now
// purely additive (negative = subtract).
function applyModifier(_base: number, option: StorefrontProductOption): number {
  const v = option.price_modifier_value
  if (v === null || v === undefined) return 0
  return Number(v) || 0
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
      if (qty > 0 && group.price_per_unit) total += qty * group.price_per_unit
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

function optionPriceDeltaText(opt: StorefrontProductOption): string {
  const v = Number(opt.price_modifier_value ?? 0)
  if (!v) return ''
  const sign = v > 0 ? '+' : '-'
  return `${sign}${formatPrice(Math.abs(v), currency.value)}`
}

const missingRequired = computed(() =>
  visibleGroups.value.filter((g) => g.is_required).some((g) => {
    if (g.display_type === 'text') return !String(customValues.value[g.uuid] ?? '').trim()
    if (g.display_type === 'numeric') {
      const v = Number(customValues.value[g.uuid] ?? NaN)
      return isNaN(v) || (g.numeric_min != null && v < g.numeric_min)
    }
    return !selectedOptions.value[g.uuid]
  }),
)

const canAddToCart = computed(() => !!effectiveProduct.value && !isAdding.value && !missingRequired.value)

async function fetchProduct() {
  if (!isAvailable.value || !client.value) return
  if (injectedProduct?.value) return
  const slug = resolvedSlug.value
  if (!slug) return
  isLoading.value = true
  fetchError.value = null
  try {
    const r = await client.value.getProduct(slug)
    product.value = r.data
  } catch {
    fetchError.value = t('notFound')
  } finally {
    isLoading.value = false
  }
}

async function addToCart() {
  if (!canAddToCart.value || !effectiveProduct.value) return
  isAdding.value = true
  try {
    const metadata: Record<string, any> = { selected_options: {}, custom_values: {} }
    for (const group of visibleGroups.value) {
      if (group.display_type === 'numeric' || group.display_type === 'text') {
        metadata.custom_values[group.code || group.uuid] = customValues.value[group.uuid]
      } else {
        const sel = selectedOptions.value[group.uuid]
        if (sel) {
          const opt = group.options.find((o) => o.uuid === sel)
          metadata.selected_options[group.code || group.uuid] = opt?.code || opt?.name || sel
        }
      }
    }
    await cart.addItem(effectiveProduct.value.uuid, 1, metadata)
    toast.success(t('addedToCart'))
  } catch {
    toast.error(t('addError'))
  } finally {
    isAdding.value = false
  }
}

onMounted(fetchProduct)
</script>

<template>
  <div class="lcms-product-configurator-wizard">
    <component :is="headingTag" v-if="headingText" class="lcms-pcw__heading">
      {{ headingText }}
    </component>

    <div v-if="isLoading" class="lcms-pcw__state">{{ t('loading') }}</div>
    <div v-else-if="fetchError" class="lcms-pcw__state lcms-pcw__state--error">{{ fetchError }}</div>
    <div v-else-if="!effectiveProduct" class="lcms-pcw__state">{{ t('notFound') }}</div>
    <div v-else-if="totalSteps === 0" class="lcms-pcw__state">{{ t('noOptions') }}</div>

    <div v-else class="lcms-pcw__shell">
      <!-- Progress -->
      <div v-if="showProgress" class="lcms-pcw__progress">
        <div class="lcms-pcw__progress-bar">
          <div class="lcms-pcw__progress-fill" :style="{ width: progressPercent + '%' }" />
        </div>
        <div v-if="showStepCount" class="lcms-pcw__progress-label">
          <span v-if="!showSummary">{{ t('step') }} {{ currentStep + 1 }} {{ t('of') }} {{ totalSteps }}</span>
          <span v-else>{{ t('summary') }}</span>
          <span class="lcms-pcw__progress-percent">{{ progressPercent }}%</span>
        </div>
      </div>

      <!-- Step body -->
      <div v-if="!showSummary && currentGroup" class="lcms-pcw__step">
        <div class="lcms-pcw__step-header">
          <h4 class="lcms-pcw__step-title">{{ currentGroup.name }}</h4>
          <span v-if="currentGroup.is_required" class="lcms-pcw__required">{{ t('required') }}</span>
        </div>

        <!-- select -->
        <select
          v-if="currentGroup.display_type === 'select'"
          :value="selectedOptions[currentGroup.uuid] || ''"
          class="lcms-pcw__select"
          @change="selectOption(currentGroup.uuid, ($event.target as HTMLSelectElement).value)"
        >
          <option value="" disabled>{{ t('selectPlaceholder') }}</option>
          <option v-for="opt in visibleOptionsOf(currentGroup)" :key="opt.uuid" :value="opt.uuid">
            {{ opt.name }}<template v-if="optionPriceDeltaText(opt)"> ({{ optionPriceDeltaText(opt) }})</template>
          </option>
        </select>

        <!-- radio -->
        <div v-else-if="currentGroup.display_type === 'radio'" class="lcms-pcw__radio-group">
          <label
            v-for="opt in visibleOptionsOf(currentGroup)"
            :key="opt.uuid"
            class="lcms-pcw__radio"
            :class="{ 'lcms-pcw__radio--selected': selectedOptions[currentGroup.uuid] === opt.uuid }"
          >
            <input
              type="radio"
              :name="`pcw-${currentGroup.uuid}`"
              :value="opt.uuid"
              :checked="selectedOptions[currentGroup.uuid] === opt.uuid"
              @change="selectOption(currentGroup.uuid, opt.uuid)"
            >
            <span class="lcms-pcw__radio-label">{{ opt.name }}</span>
            <span v-if="optionPriceDeltaText(opt)" class="lcms-pcw__price-delta">{{ optionPriceDeltaText(opt) }}</span>
          </label>
        </div>

        <!-- color swatches -->
        <div v-else-if="currentGroup.display_type === 'color_swatches'" class="lcms-pcw__swatches">
          <template v-for="opt in visibleOptionsOf(currentGroup)" :key="opt.uuid">
            <button
              v-if="opt.color_hex"
              type="button"
              class="lcms-pcw__swatch lcms-pcw__swatch--color"
              :class="{ 'lcms-pcw__swatch--selected': selectedOptions[currentGroup.uuid] === opt.uuid }"
              :title="opt.name + (optionPriceDeltaText(opt) ? ` (${optionPriceDeltaText(opt)})` : '')"
              :style="{ backgroundColor: opt.color_hex }"
              :aria-label="opt.name"
              @click="selectOption(currentGroup.uuid, opt.uuid)"
            />
            <button
              v-else
              type="button"
              class="lcms-pcw__chip"
              :class="{ 'lcms-pcw__chip--selected': selectedOptions[currentGroup.uuid] === opt.uuid }"
              @click="selectOption(currentGroup.uuid, opt.uuid)"
            >
              {{ opt.name }}<template v-if="optionPriceDeltaText(opt)"> ({{ optionPriceDeltaText(opt) }})</template>
            </button>
          </template>
        </div>

        <!-- image swatches -->
        <div v-else-if="currentGroup.display_type === 'image_swatches'" class="lcms-pcw__swatches">
          <template v-for="opt in visibleOptionsOf(currentGroup)" :key="opt.uuid">
            <button
              v-if="opt.thumbnail"
              type="button"
              class="lcms-pcw__swatch lcms-pcw__swatch--image"
              :class="{ 'lcms-pcw__swatch--selected': selectedOptions[currentGroup.uuid] === opt.uuid }"
              :title="opt.name + (optionPriceDeltaText(opt) ? ` (${optionPriceDeltaText(opt)})` : '')"
              :aria-label="opt.name"
              @click="selectOption(currentGroup.uuid, opt.uuid)"
            >
              <img :src="opt.thumbnail" :alt="opt.name">
            </button>
            <button
              v-else
              type="button"
              class="lcms-pcw__chip"
              :class="{ 'lcms-pcw__chip--selected': selectedOptions[currentGroup.uuid] === opt.uuid }"
              @click="selectOption(currentGroup.uuid, opt.uuid)"
            >
              {{ opt.name }}<template v-if="optionPriceDeltaText(opt)"> ({{ optionPriceDeltaText(opt) }})</template>
            </button>
          </template>
        </div>

        <!-- numeric -->
        <input
          v-else-if="currentGroup.display_type === 'numeric'"
          type="number"
          :value="customValues[currentGroup.uuid]"
          :min="currentGroup.numeric_min ?? undefined"
          :max="currentGroup.numeric_max ?? undefined"
          :step="currentGroup.numeric_step ?? 1"
          class="lcms-pcw__select"
          @input="setCustomValue(currentGroup.uuid, ($event.target as HTMLInputElement).value)"
        >

        <!-- text -->
        <input
          v-else-if="currentGroup.display_type === 'text'"
          type="text"
          :value="customValues[currentGroup.uuid]"
          class="lcms-pcw__select"
          @input="setCustomValue(currentGroup.uuid, ($event.target as HTMLInputElement).value)"
        >
      </div>

      <!-- Summary step (final) -->
      <div v-else-if="showSummary" class="lcms-pcw__summary">
        <h4 class="lcms-pcw__step-title">{{ t('summary') }}</h4>
        <ul class="lcms-pcw__summary-list">
          <li v-for="g in visibleGroups" :key="g.uuid">
            <strong>{{ g.name }}:</strong>
            <template v-if="g.display_type === 'numeric' || g.display_type === 'text'">
              {{ customValues[g.uuid] || '—' }}
            </template>
            <template v-else>
              {{ g.options.find((o) => o.uuid === selectedOptions[g.uuid])?.name || '—' }}
            </template>
          </li>
        </ul>
        <div class="lcms-pcw__total">
          <span>{{ t('defaultTotal') }}</span>
          <strong>{{ formatPrice(totalPrice, currency) }}</strong>
        </div>
      </div>

      <!-- Nav -->
      <div class="lcms-pcw__nav">
        <button
          type="button"
          class="lcms-pcw__btn lcms-pcw__btn--secondary"
          :disabled="isFirstStep && !showSummary"
          @click="goPrev"
        >
          {{ t('back') }}
        </button>
        <button
          v-if="!showSummary"
          type="button"
          class="lcms-pcw__btn lcms-pcw__btn--primary"
          @click="goNext"
        >
          {{ isLastStep ? t('summary') : t('next') }}
        </button>
        <button
          v-else
          type="button"
          class="lcms-pcw__btn lcms-pcw__btn--primary"
          :disabled="!canAddToCart"
          @click="addToCart"
        >
          <span v-if="isAdding" class="lcms-pcw__spinner" />
          {{ buttonText }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lcms-product-configurator-wizard {
  font-family: var(--lcms-font-body, system-ui, sans-serif);
  color: var(--lcms-color-text, #1f2937);
}

.lcms-pcw__heading {
  margin: 0 0 1.25rem 0;
  font-family: var(--lcms-font-heading, var(--lcms-font-body));
}

.lcms-pcw__state {
  padding: 2rem 1rem;
  text-align: center;
  color: var(--lcms-color-muted, #6b7280);
}

.lcms-pcw__state--error {
  color: var(--lcms-color-danger, #dc2626);
}

.lcms-pcw__shell {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.lcms-pcw__progress {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.lcms-pcw__progress-bar {
  height: 8px;
  background: var(--lcms-color-background-alt, #f3f4f6);
  border-radius: 9999px;
  overflow: hidden;
}

.lcms-pcw__progress-fill {
  height: 100%;
  background: var(--lcms-color-primary, #3b82f6);
  transition: width 0.3s ease;
}

.lcms-pcw__progress-label {
  display: flex;
  justify-content: space-between;
  font-size: 0.8125rem;
  color: var(--lcms-color-muted, #6b7280);
}

.lcms-pcw__progress-percent {
  font-weight: 600;
  color: var(--lcms-color-text, #1f2937);
}

.lcms-pcw__step,
.lcms-pcw__summary {
  padding: 1.25rem;
  border: 1px solid var(--lcms-color-border, #e5e7eb);
  border-radius: var(--lcms-border-radius, 0.5rem);
  background: var(--lcms-color-background, #ffffff);
}

.lcms-pcw__step-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.875rem;
}

.lcms-pcw__step-title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
}

.lcms-pcw__required {
  font-size: 0.75rem;
  color: var(--lcms-color-danger, #dc2626);
  font-weight: 500;
}

.lcms-pcw__select {
  width: 100%;
  padding: 0.625rem 0.875rem;
  border: 1px solid var(--lcms-color-border, #d1d5db);
  border-radius: var(--lcms-border-radius, 0.375rem);
  background: #fff;
  font: inherit;
  color: inherit;
}

.lcms-pcw__radio-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.lcms-pcw__radio {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.75rem;
  border: 1px solid var(--lcms-color-border, #e5e7eb);
  border-radius: var(--lcms-border-radius, 0.375rem);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.lcms-pcw__radio--selected {
  border-color: var(--lcms-color-primary, #3b82f6);
  background: var(--lcms-color-background-alt, #eff6ff);
}

.lcms-pcw__radio-label {
  flex: 1;
}

.lcms-pcw__price-delta {
  color: var(--lcms-color-muted, #6b7280);
  font-size: 0.875rem;
}

.lcms-pcw__swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.lcms-pcw__swatch {
  width: 44px;
  height: 44px;
  border-radius: var(--lcms-border-radius, 0.375rem);
  border: 2px solid transparent;
  cursor: pointer;
  padding: 0;
  background: transparent;
  overflow: hidden;
}

.lcms-pcw__swatch--color {
  border-color: var(--lcms-color-border, #d1d5db);
}

.lcms-pcw__swatch--image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.lcms-pcw__swatch--selected {
  border-color: var(--lcms-color-primary, #3b82f6);
}

.lcms-pcw__chip {
  padding: 0.5rem 0.875rem;
  border: 1px solid var(--lcms-color-border, #d1d5db);
  border-radius: var(--lcms-border-radius, 0.375rem);
  background: #fff;
  cursor: pointer;
  font: inherit;
  color: inherit;
}

.lcms-pcw__chip--selected {
  border-color: var(--lcms-color-primary, #3b82f6);
  background: var(--lcms-color-background-alt, #eff6ff);
}

.lcms-pcw__summary-list {
  list-style: none;
  padding: 0;
  margin: 0 0 1rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.lcms-pcw__summary-list li {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--lcms-color-border, #e5e7eb);
}

.lcms-pcw__total {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding-top: 0.75rem;
  font-size: 1.125rem;
}

.lcms-pcw__nav {
  display: flex;
  gap: 0.5rem;
  justify-content: space-between;
}

.lcms-pcw__btn {
  flex: 1;
  padding: 0.75rem 1rem;
  border-radius: var(--lcms-btn-border-radius, 0.375rem);
  border: 1px solid transparent;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.lcms-pcw__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.lcms-pcw__btn--primary {
  background: var(--lcms-color-primary, #3b82f6);
  color: var(--lcms-color-white, #fff);
}

.lcms-pcw__btn--secondary {
  background: #fff;
  color: var(--lcms-color-text, #1f2937);
  border-color: var(--lcms-color-border, #d1d5db);
}

.lcms-pcw__spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: lcms-pcw-spin 0.6s linear infinite;
  margin-right: 0.5rem;
  vertical-align: middle;
}

@keyframes lcms-pcw-spin {
  to { transform: rotate(360deg); }
}
</style>
