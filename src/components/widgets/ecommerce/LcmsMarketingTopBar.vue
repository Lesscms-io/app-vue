<script setup lang="ts">
/**
 * Marketing Top Bar Widget
 *
 * Renders one top bar from an active campaign. Without `config.campaign_id`,
 * picks the highest-priority eligible top bar across all active campaigns
 * (matches the legacy behaviour). With `config.campaign_id`, locks to that
 * campaign so an editor can place several top bars on a layout, each tied
 * to a specific campaign — only the one with an active campaign renders.
 *
 * Eligibility (campaign window, is_active flags) is fully resolved on the
 * BE. This widget reads from the shared active-campaigns store, so all
 * marketing widgets on the page share a single batch fetch.
 */

import { ref, computed, onMounted, onServerPrefetch } from 'vue'
import { useActiveCampaigns } from '../../../composables/useActiveCampaigns'
import { useEditorMode } from '../../../composables/useEditorMode'
import { useLanguage } from '../../../composables/useLanguage'
import { resolveColor } from '../../../utils/resolveColor'

defineOptions({ inheritAttrs: false })

interface Props {
  data: Record<string, any>
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const { ensureLoaded, topBarFor } = useActiveCampaigns()
const editorMode = useEditorMode()
const { extractValue } = useLanguage(props.language)

const dismissed = ref(false)

const config = computed(() => props.data?.config || {})
const campaignId = computed<string | undefined>(() => config.value.campaign_id || undefined)
const dismissible = computed(() => config.value.dismissible === true)
const overrideBackground = computed(() => resolveColor(config.value.background_color_override) || null)
const overrideTextColor = computed(() => resolveColor(config.value.text_color_override) || null)

const topbar = computed(() => topBarFor(campaignId.value).value)

const visible = computed(() => {
  if (dismissed.value) return false
  if (topbar.value) return true
  return editorMode.value
})

const isPlaceholder = computed(() => topbar.value === null && editorMode.value)

const text = computed(() => {
  if (!topbar.value) return isPlaceholder.value ? '— top bar kampanii (nieaktywna)' : ''
  const tr = topbar.value.text_translation
  if (tr) return extractValue(tr) || topbar.value.text
  return topbar.value.text
})

const linkText = computed(() => {
  if (!topbar.value?.link_text) return ''
  const tr = topbar.value.link_text_translation
  if (tr) return extractValue(tr) || topbar.value.link_text
  return topbar.value.link_text
})

const backgroundStyle = computed(() => {
  const fromTopbar = resolveColor(topbar.value?.background_color)
  return overrideBackground.value || fromTopbar || null
})

const textStyle = computed(() => {
  const fromTopbar = resolveColor(topbar.value?.text_color)
  return overrideTextColor.value || fromTopbar || null
})

function dismiss() {
  dismissed.value = true
}

onServerPrefetch(() => ensureLoaded())
onMounted(() => ensureLoaded())
</script>

<template>
  <div
    v-if="visible"
    class="lcms-marketing-topbar"
    :class="{ 'lcms-marketing-topbar--placeholder': isPlaceholder }"
    :style="{
      backgroundColor: backgroundStyle || undefined,
      color: textStyle || undefined,
    }"
  >
    <div class="lcms-marketing-topbar__inner">
      <span class="lcms-marketing-topbar__text">{{ text }}</span>
      <a
        v-if="topbar?.link_url && linkText"
        :href="topbar.link_url"
        class="lcms-marketing-topbar__link"
        :style="{ color: textStyle || undefined }"
      >
        {{ linkText }} →
      </a>
      <button
        v-if="dismissible && !isPlaceholder"
        type="button"
        class="lcms-marketing-topbar__close"
        :style="{ color: textStyle || undefined }"
        :aria-label="'Close'"
        @click="dismiss"
      >
        ×
      </button>
    </div>
  </div>
</template>

<style scoped>
.lcms-marketing-topbar {
  width: 100%;
}

.lcms-marketing-topbar--placeholder {
  background: repeating-linear-gradient(
    45deg,
    rgba(0, 0, 0, 0.04),
    rgba(0, 0, 0, 0.04) 8px,
    rgba(0, 0, 0, 0.08) 8px,
    rgba(0, 0, 0, 0.08) 16px
  );
  color: #6c757d;
  font-style: italic;
}

.lcms-marketing-topbar__inner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 0.5rem 1rem;
  text-align: center;
  font-size: 0.875rem;
  line-height: 1.4;
  position: relative;
}

.lcms-marketing-topbar__text {
  font-weight: 500;
}

.lcms-marketing-topbar__link {
  text-decoration: underline;
  font-weight: 600;
}

.lcms-marketing-topbar__link:hover {
  opacity: 0.85;
}

.lcms-marketing-topbar__close {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: 0;
  font-size: 1.25rem;
  line-height: 1;
  cursor: pointer;
  opacity: 0.7;
}

.lcms-marketing-topbar__close:hover {
  opacity: 1;
}
</style>
