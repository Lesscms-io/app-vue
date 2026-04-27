<script setup lang="ts">
/**
 * Campaign Banner Widget
 *
 * Renders a single banner from an active marketing campaign, scoped to a
 * placement (hero, category_strip, cart_drawer, thank_you). The editor
 * configures *which* placement this widget shows and optionally locks it
 * to a specific campaign; the BE owns eligibility (active window + flags).
 *
 * In editor mode the widget shows a placeholder when no banner matches,
 * so the page builder always has something to position. Production renderer
 * leaves the widget invisible when there's nothing to show.
 */

import { computed, onMounted, onServerPrefetch } from 'vue'
import { useActiveCampaigns } from '../../../composables/useActiveCampaigns'
import { useEditorMode } from '../../../composables/useEditorMode'
import { useLanguage } from '../../../composables/useLanguage'
import type { StorefrontBannerPlacement } from '../../../api/storefront'

defineOptions({ inheritAttrs: false })

interface Props {
  data: Record<string, any>
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const { ensureLoaded, bannersFor } = useActiveCampaigns()
const editorMode = useEditorMode()
const { extractValue } = useLanguage(props.language)

const config = computed(() => props.data?.config || {})
const placement = computed<StorefrontBannerPlacement>(
  () => (config.value.placement || 'hero') as StorefrontBannerPlacement,
)
const campaignId = computed<string | undefined>(() => config.value.campaign_id || undefined)
const showTitle = computed(() => config.value.show_title !== false)
const showSubtitle = computed(() => config.value.show_subtitle !== false)
const showCta = computed(() => config.value.show_cta !== false)

const banner = computed(() => bannersFor(placement.value, campaignId.value).value[0] ?? null)

const visible = computed(() => banner.value !== null || editorMode.value)
const isPlaceholder = computed(() => banner.value === null && editorMode.value)

const altText = computed(() => {
  if (!banner.value) return ''
  const tr = banner.value.alt_text_translation
  if (tr) return extractValue(tr) || banner.value.alt_text || ''
  return banner.value.alt_text || ''
})

const title = computed(() => {
  if (!banner.value) return ''
  const tr = banner.value.title_translation
  if (tr) return extractValue(tr) || banner.value.title || ''
  return banner.value.title || ''
})

const subtitle = computed(() => {
  if (!banner.value) return ''
  const tr = banner.value.subtitle_translation
  if (tr) return extractValue(tr) || banner.value.subtitle || ''
  return banner.value.subtitle || ''
})

const ctaText = computed(() => {
  if (!banner.value) return ''
  const tr = banner.value.cta_text_translation
  if (tr) return extractValue(tr) || banner.value.cta_text || ''
  return banner.value.cta_text || ''
})

onServerPrefetch(() => ensureLoaded())
onMounted(() => ensureLoaded())
</script>

<template>
  <div
    v-if="visible"
    class="lcms-campaign-banner"
    :class="[
      `lcms-campaign-banner--${placement}`,
      { 'lcms-campaign-banner--placeholder': isPlaceholder },
    ]"
  >
    <template v-if="isPlaceholder">
      <div class="lcms-campaign-banner__placeholder">
        <span>Banner kampanii — placement: <strong>{{ placement }}</strong></span>
        <span class="lcms-campaign-banner__placeholder-hint">
          {{ campaignId ? 'Kampania nieaktywna — banner nie pojawi się na storefroncie.' : 'Brak aktywnej kampanii z bannerem dla tego placementu.' }}
        </span>
      </div>
    </template>
    <template v-else-if="banner">
      <a
        v-if="banner.cta_url"
        :href="banner.cta_url"
        class="lcms-campaign-banner__link"
        :aria-label="title || altText"
      >
        <picture>
          <source
            v-if="banner.image_url_mobile"
            media="(max-width: 768px)"
            :srcset="banner.image_url_mobile"
          >
          <img
            v-if="banner.image_url"
            :src="banner.image_url"
            :alt="altText"
            class="lcms-campaign-banner__image"
            loading="lazy"
          >
        </picture>
      </a>
      <picture v-else>
        <source
          v-if="banner.image_url_mobile"
          media="(max-width: 768px)"
          :srcset="banner.image_url_mobile"
        >
        <img
          v-if="banner.image_url"
          :src="banner.image_url"
          :alt="altText"
          class="lcms-campaign-banner__image"
          loading="lazy"
        >
      </picture>

      <div
        v-if="(showTitle && title) || (showSubtitle && subtitle) || (showCta && ctaText && banner.cta_url)"
        class="lcms-campaign-banner__overlay"
      >
        <h3 v-if="showTitle && title" class="lcms-campaign-banner__title">{{ title }}</h3>
        <p v-if="showSubtitle && subtitle" class="lcms-campaign-banner__subtitle">{{ subtitle }}</p>
        <a
          v-if="showCta && ctaText && banner.cta_url"
          :href="banner.cta_url"
          class="lcms-campaign-banner__cta"
        >
          {{ ctaText }}
        </a>
      </div>
    </template>
  </div>
</template>

<style scoped>
.lcms-campaign-banner {
  position: relative;
  width: 100%;
  overflow: hidden;
}

.lcms-campaign-banner__link {
  display: block;
  width: 100%;
}

.lcms-campaign-banner__image {
  display: block;
  width: 100%;
  height: auto;
}

.lcms-campaign-banner__overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  padding: 2rem;
  color: #fff;
  background: linear-gradient(to right, rgba(0, 0, 0, 0.5), transparent 60%);
  pointer-events: none;
}

.lcms-campaign-banner__title {
  font-size: clamp(1.25rem, 2.5vw, 2rem);
  margin: 0 0 0.5rem 0;
  font-weight: 700;
}

.lcms-campaign-banner__subtitle {
  font-size: clamp(0.875rem, 1.5vw, 1.125rem);
  margin: 0 0 1rem 0;
}

.lcms-campaign-banner__cta {
  pointer-events: auto;
  display: inline-block;
  padding: 0.5rem 1.25rem;
  background: #fff;
  color: #111;
  border-radius: 4px;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.875rem;
}

.lcms-campaign-banner__cta:hover {
  background: #f1f1f1;
}

.lcms-campaign-banner--placeholder {
  background: repeating-linear-gradient(
    45deg,
    rgba(0, 0, 0, 0.04),
    rgba(0, 0, 0, 0.04) 10px,
    rgba(0, 0, 0, 0.08) 10px,
    rgba(0, 0, 0, 0.08) 20px
  );
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lcms-campaign-banner__placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  color: #495057;
  font-size: 0.875rem;
  text-align: center;
  padding: 1rem;
}

.lcms-campaign-banner__placeholder-hint {
  color: #6c757d;
  font-size: 0.75rem;
  font-style: italic;
}
</style>
