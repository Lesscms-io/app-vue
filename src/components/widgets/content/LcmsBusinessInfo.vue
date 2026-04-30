<script setup lang="ts">
/**
 * Business Info widget — pulls NAP (Name/Address/Phone), email, hours,
 * and tax id straight from the project's `settings.business` so editors
 * configure the company once and reuse everywhere (footer, contact
 * sections, side columns). Single source of truth: when the phone or
 * NIP changes, every widget updates.
 *
 * Visibility flags (`show_phone`, `show_email`, `show_address`,
 * `show_hours`, `show_tax_id`) let editors choose what to surface in a
 * given placement — e.g. footer wants full NAP, mini-card wants phone
 * only.
 */
import { computed, inject, type Ref } from 'vue'
import { useWidgetContainerStyle } from '../../../composables/useWidgetContainerStyle'

interface BusinessInfo {
  type?: string
  name?: string
  description?: string
  phone?: string
  email?: string
  url?: string
  logo?: string
  street?: string
  city?: string
  region?: string
  postal_code?: string
  country?: string
  latitude?: number | string
  longitude?: number | string
  opening_hours?: string[]
  area_served?: string[]
  rating_value?: number | string
  rating_count?: number | string
  social_profiles?: string[]
  tax_id?: string
}

interface BusinessInfoConfig {
  show_name?: boolean
  show_phone?: boolean
  show_email?: boolean
  show_address?: boolean
  show_hours?: boolean
  show_tax_id?: boolean
  show_social?: boolean
  layout?: 'stacked' | 'inline' | 'grid'
  label_phone?: string
  label_email?: string
  label_address?: string
  label_hours?: string
  label_tax_id?: string
}

interface Props {
  data: {
    widget?: BusinessInfoConfig
    config?: BusinessInfoConfig
    style?: Record<string, any>
  }
  language?: string
  currentBreakpoint?: string
  project?: any
}

const props = defineProps<Props>()

const config = computed<BusinessInfoConfig>(() =>
  props.data?.widget || props.data?.config || {},
)

const projectConfig = inject<Ref<any> | any>('lesscms-project-config', null)
const business = computed<BusinessInfo>(() => {
  const pc = (projectConfig as any)?.value || projectConfig || null
  return (pc?.business as BusinessInfo) || {}
})

// Strip a phone number to digits-only for tel: links. Country prefix is
// preserved (the leading + survives encodeURI). Whitespace, dashes,
// parens, dots all get scrubbed.
function telHref(phone: string): string {
  if (!phone) return ''
  const cleaned = phone.replace(/[^\d+]/g, '')
  return cleaned ? `tel:${cleaned}` : ''
}

const fullAddress = computed(() => {
  const b = business.value
  const lines: string[] = []
  if (b.street) lines.push(b.street)
  const cityLine = [b.postal_code, b.city].filter(Boolean).join(' ')
  if (cityLine) lines.push(cityLine)
  if (b.region && b.region !== b.city) lines.push(b.region)
  if (b.country) lines.push(b.country)
  return lines
})

// Defaults skew toward "show everything" — most placements (footer,
// contact section) want the full NAP. Editors flip individual flags off
// for compact placements via the settings panel.
const showName = computed(() => config.value.show_name ?? true)
const showPhone = computed(() => config.value.show_phone ?? true)
const showEmail = computed(() => config.value.show_email ?? true)
const showAddress = computed(() => config.value.show_address ?? true)
const showHours = computed(() => config.value.show_hours ?? true)
const showTaxId = computed(() => config.value.show_tax_id ?? false)
const showSocial = computed(() => config.value.show_social ?? false)
const layout = computed(() => config.value.layout || 'stacked')

const { containerStyle } = useWidgetContainerStyle(
  computed(() => props.data?.style),
  computed(() => props.currentBreakpoint || 'desktop'),
  props.project,
)

const hasAnything = computed(() => {
  const b = business.value
  if (showName.value && b.name) return true
  if (showPhone.value && b.phone) return true
  if (showEmail.value && b.email) return true
  if (showAddress.value && fullAddress.value.length) return true
  if (showHours.value && b.opening_hours?.length) return true
  if (showTaxId.value && b.tax_id) return true
  if (showSocial.value && b.social_profiles?.length) return true
  return false
})
</script>

<template>
  <div
    v-if="hasAnything"
    class="lcms-business-info"
    :class="`lcms-business-info--${layout}`"
    :style="containerStyle"
  >
    <div
      v-if="showName && business.name"
      class="lcms-business-info__name"
    >
      {{ business.name }}
    </div>

    <div
      v-if="showAddress && fullAddress.length"
      class="lcms-business-info__row lcms-business-info__address"
    >
      <span
        v-if="config.label_address"
        class="lcms-business-info__label"
      >{{ config.label_address }}</span>
      <address class="lcms-business-info__value">
        <span
          v-for="(line, idx) in fullAddress"
          :key="`addr-${idx}`"
          class="lcms-business-info__address-line"
        >{{ line }}</span>
      </address>
    </div>

    <div
      v-if="showPhone && business.phone"
      class="lcms-business-info__row lcms-business-info__phone"
    >
      <span
        v-if="config.label_phone"
        class="lcms-business-info__label"
      >{{ config.label_phone }}</span>
      <a
        :href="telHref(business.phone)"
        class="lcms-business-info__value lcms-business-info__link"
      >{{ business.phone }}</a>
    </div>

    <div
      v-if="showEmail && business.email"
      class="lcms-business-info__row lcms-business-info__email"
    >
      <span
        v-if="config.label_email"
        class="lcms-business-info__label"
      >{{ config.label_email }}</span>
      <a
        :href="`mailto:${business.email}`"
        class="lcms-business-info__value lcms-business-info__link"
      >{{ business.email }}</a>
    </div>

    <div
      v-if="showHours && business.opening_hours?.length"
      class="lcms-business-info__row lcms-business-info__hours"
    >
      <span
        v-if="config.label_hours"
        class="lcms-business-info__label"
      >{{ config.label_hours }}</span>
      <div class="lcms-business-info__value">
        <div
          v-for="(line, idx) in business.opening_hours"
          :key="`hours-${idx}`"
          class="lcms-business-info__hours-line"
        >
          {{ line }}
        </div>
      </div>
    </div>

    <div
      v-if="showTaxId && business.tax_id"
      class="lcms-business-info__row lcms-business-info__tax-id"
    >
      <span
        v-if="config.label_tax_id"
        class="lcms-business-info__label"
      >{{ config.label_tax_id }}</span>
      <span class="lcms-business-info__value">{{ business.tax_id }}</span>
    </div>

    <div
      v-if="showSocial && business.social_profiles?.length"
      class="lcms-business-info__row lcms-business-info__social"
    >
      <a
        v-for="url in business.social_profiles"
        :key="url"
        :href="url"
        target="_blank"
        rel="noopener noreferrer"
        class="lcms-business-info__social-link"
      >{{ url }}</a>
    </div>
  </div>
</template>

<style scoped>
.lcms-business-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  color: inherit;
}

.lcms-business-info--inline {
  flex-direction: row;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: baseline;
}

.lcms-business-info--grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.lcms-business-info__name {
  font-weight: 600;
  font-size: 1.05em;
}

.lcms-business-info__row {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.lcms-business-info--inline .lcms-business-info__row {
  flex-direction: row;
  align-items: baseline;
  gap: 0.25rem;
}

.lcms-business-info__label {
  font-weight: 600;
  opacity: 0.75;
  font-size: 0.875em;
}

.lcms-business-info__value {
  font-style: normal;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.lcms-business-info__address-line {
  display: block;
}

.lcms-business-info__link {
  color: var(--lcms-color-link, inherit);
  text-decoration: none;
}

.lcms-business-info__link:hover {
  text-decoration: underline;
}

.lcms-business-info__hours-line {
  display: block;
}

.lcms-business-info__social {
  flex-direction: row;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.lcms-business-info__social-link {
  color: var(--lcms-color-link, inherit);
  text-decoration: none;
}
</style>
