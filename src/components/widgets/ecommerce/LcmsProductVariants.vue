<script setup lang="ts">
/**
 * Product Variants Widget (E-commerce)
 *
 * Renders a picker for variants of the current configurable product.
 * Works when injected product is the parent (has_children / is_container).
 * Clicking an option navigates to that variant's slug URL.
 */

import { computed, inject, type Ref } from 'vue'
import { resolveColor } from '../../../utils/resolveColor'

defineOptions({ inheritAttrs: false })

interface Props {
  data: Record<string, any>
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const product = inject<Ref<any> | null>('lcms-product', null)
const projectConfig = inject<Ref<any> | null>('lesscms-project-config', null)

const data = computed(() => props.data || {})
const config = computed(() => data.value.config || {})

const displayType = computed(() => config.value.display_type || 'buttons')
const labelSource = computed(() => config.value.label_source || 'binding_value')
const labelAttributeCode = computed(() => config.value.label_attribute_code || '')
const showGroupLabels = computed(() => config.value.show_group_labels !== false)
const hideIfSingle = computed(() => config.value.hide_if_single !== false)

const lang = computed(() => props.language || 'pl')
function extractText(v: any): string {
  if (v == null) return ''
  if (typeof v === 'object') return v[lang.value] || v.pl || ''
  return String(v)
}

const headingText = computed(() => extractText(data.value?.heading?.text))

const variants = computed<any[]>(() => {
  const p = product?.value
  if (!p) return []
  return Array.isArray(p.children) ? p.children.filter((c: any) => c.status !== 'inactive') : []
})

const templateAttributes = computed<any[]>(() => {
  const p = product?.value
  return Array.isArray(p?.template_attributes) ? p.template_attributes : []
})

const bindingAttributes = computed<any[]>(() =>
  templateAttributes.value.filter((a: any) => a?.is_variant)
)

// Resolve display text for one variant based on label_source setting
function variantLabel(variant: any): string {
  if (labelSource.value === 'variant_name') {
    return variant?.name || ''
  }
  if (labelSource.value === 'custom_attribute') {
    const code = labelAttributeCode.value
    if (!code) return variant?.name || ''
    const val = variant?.attributes?.[code]
    return extractText(val)
  }
  // binding_value (default)
  const binding = variant?.variant_binding_values || {}
  const parts: string[] = []
  for (const attr of bindingAttributes.value) {
    const code = attr.code
    const optionCode = binding[code]
    if (!optionCode) continue
    const option = (attr.options || []).find((o: any) => o.code === optionCode)
    parts.push(option?.value || optionCode)
  }
  return parts.join(' / ') || variant?.name || ''
}

function variantSwatchColor(variant: any): string | null {
  // Try to find a color_hex on any binding option matching this variant
  const binding = variant?.variant_binding_values || {}
  for (const attr of bindingAttributes.value) {
    const code = attr.code
    const optionCode = binding[code]
    if (!optionCode) continue
    const option = (attr.options || []).find((o: any) => o.code === optionCode)
    if (option?.color_hex) return option.color_hex
  }
  return null
}

function variantSwatchImage(variant: any): string | null {
  return variant?.image || null
}

const currentSlug = computed(() => product?.value?.slug || '')

function variantUrl(variant: any): string {
  const route = projectConfig?.value?.commerce?.routes?.product || '/produkt/:slug'
  return route.replace(':slug', variant.slug || variant.sku || variant.uuid)
}

const shouldRender = computed(() => {
  if (!variants.value.length) return false
  if (hideIfSingle.value && variants.value.length < 2) return false
  return true
})

// Group label text — first binding attribute's name, else generic fallback
const groupLabel = computed(() => {
  if (bindingAttributes.value.length) {
    return bindingAttributes.value[0]?.name || ''
  }
  return lang.value === 'en' ? 'Variant' : 'Wariant'
})

// Styles from element-groups resolved through project palette
const groupLabelColor = computed(() => resolveColor(data.value?.group_label?.color, projectConfig?.value))
const groupLabelStyle = computed<Record<string, string>>(() => {
  const out: Record<string, string> = {}
  if (groupLabelColor.value) out.color = groupLabelColor.value
  const fw = data.value?.group_label?.font_weight
  if (fw) out.fontWeight = String(fw)
  return out
})

const optionBg = computed(() => resolveColor(data.value?.option?.background, projectConfig?.value))
const optionFg = computed(() => resolveColor(data.value?.option?.color, projectConfig?.value))
const optionBorder = computed(() => resolveColor(data.value?.option?.border_color, projectConfig?.value))
const optionBgHover = computed(() => resolveColor(data.value?.option?.['background:hover'], projectConfig?.value))
const optionFgHover = computed(() => resolveColor(data.value?.option?.['color:hover'], projectConfig?.value))

const selectedBg = computed(() => resolveColor(data.value?.selected?.background, projectConfig?.value))
const selectedFg = computed(() => resolveColor(data.value?.selected?.color, projectConfig?.value))
const selectedBorder = computed(() => resolveColor(data.value?.selected?.border_color, projectConfig?.value))

const cssVars = computed<Record<string, string>>(() => ({
  '--pv-option-bg': optionBg.value || 'transparent',
  '--pv-option-fg': optionFg.value || 'var(--lcms-color-text, #1f2937)',
  '--pv-option-border': optionBorder.value || 'var(--lcms-color-border, #e5e7eb)',
  '--pv-option-bg-hover': optionBgHover.value || 'var(--lcms-color-background-alt, #f9fafb)',
  '--pv-option-fg-hover': optionFgHover.value || 'var(--pv-option-fg)',
  '--pv-selected-bg': selectedBg.value || 'var(--lcms-color-primary, #50a5f1)',
  '--pv-selected-fg': selectedFg.value || '#ffffff',
  '--pv-selected-border': selectedBorder.value || 'var(--pv-selected-bg)'
}))

function isSelected(variant: any): boolean {
  return variant?.slug === currentSlug.value
}
</script>

<template>
  <div
    v-if="shouldRender"
    class="lcms-product-variants"
    :style="cssVars"
  >
    <h4
      v-if="headingText"
      class="lcms-product-variants__heading"
    >
      {{ headingText }}
    </h4>

    <div
      v-if="showGroupLabels && groupLabel"
      class="lcms-product-variants__label"
      :style="groupLabelStyle"
    >
      {{ groupLabel }}:
    </div>

    <select
      v-if="displayType === 'dropdown'"
      class="lcms-product-variants__dropdown"
      @change="(e) => { const target = e.target as HTMLSelectElement; if (target.value) window.location.href = target.value }"
    >
      <option
        v-for="variant in variants"
        :key="variant.uuid"
        :value="variantUrl(variant)"
        :selected="isSelected(variant)"
      >
        {{ variantLabel(variant) }}
      </option>
    </select>

    <div
      v-else-if="displayType === 'swatches'"
      class="lcms-product-variants__swatches"
    >
      <a
        v-for="variant in variants"
        :key="variant.uuid"
        :href="variantUrl(variant)"
        :title="variantLabel(variant)"
        class="lcms-product-variants__swatch"
        :class="{ 'lcms-product-variants__swatch--selected': isSelected(variant) }"
        :style="{
          background: variantSwatchColor(variant) || undefined,
          backgroundImage: !variantSwatchColor(variant) && variantSwatchImage(variant) ? `url(${variantSwatchImage(variant)})` : undefined
        }"
      >
        <span
          v-if="!variantSwatchColor(variant) && !variantSwatchImage(variant)"
          class="lcms-product-variants__swatch-text"
        >
          {{ variantLabel(variant) }}
        </span>
      </a>
    </div>

    <div
      v-else
      class="lcms-product-variants__buttons"
    >
      <a
        v-for="variant in variants"
        :key="variant.uuid"
        :href="variantUrl(variant)"
        class="lcms-product-variants__button"
        :class="{ 'lcms-product-variants__button--selected': isSelected(variant) }"
      >
        {{ variantLabel(variant) }}
      </a>
    </div>
  </div>
</template>

<style scoped>
.lcms-product-variants {
  margin: 1rem 0;
  font-family: var(--lcms-font-body, system-ui, sans-serif);
}

.lcms-product-variants__heading {
  font-size: 1rem;
  font-weight: 700;
  margin: 0 0 0.5rem 0;
  color: var(--lcms-color-text, #1f2937);
}

.lcms-product-variants__label {
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
  color: var(--lcms-color-text, #1f2937);
}

.lcms-product-variants__dropdown {
  width: 100%;
  max-width: 320px;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--pv-option-border);
  border-radius: 6px;
  font-size: 0.9375rem;
  background: #fff;
  color: var(--pv-option-fg);
}

.lcms-product-variants__buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.lcms-product-variants__button {
  padding: 0.5rem 1rem;
  border: 1px solid var(--pv-option-border);
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  background: var(--pv-option-bg);
  color: var(--pv-option-fg);
  text-decoration: none;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
  cursor: pointer;
}

.lcms-product-variants__button:hover {
  background: var(--pv-option-bg-hover);
  color: var(--pv-option-fg-hover);
}

.lcms-product-variants__button--selected,
.lcms-product-variants__button--selected:hover {
  background: var(--pv-selected-bg);
  color: var(--pv-selected-fg);
  border-color: var(--pv-selected-border);
}

.lcms-product-variants__swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.lcms-product-variants__swatch {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid var(--pv-option-border);
  background-size: cover;
  background-position: center;
  cursor: pointer;
  transition: border-color 0.15s, transform 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  color: var(--pv-option-fg);
  font-size: 0.75rem;
}

.lcms-product-variants__swatch:hover {
  border-color: var(--pv-selected-border);
}

.lcms-product-variants__swatch--selected {
  border-color: var(--pv-selected-border);
  transform: scale(1.08);
  box-shadow: 0 0 0 2px rgba(80, 165, 241, 0.25);
}

.lcms-product-variants__swatch-text {
  background: rgba(255, 255, 255, 0.8);
  padding: 0 4px;
  border-radius: 3px;
}
</style>
