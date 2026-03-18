<script setup lang="ts">
/**
 * Social Icons Widget
 *
 * Renders social media icon links.
 */

import { computed } from 'vue'
import type { SocialIconsWidgetData } from '@/types/widgets'
import { resolveColor } from '@/utils/resolveColor'

defineOptions({
  inheritAttrs: false
})

interface Props {
  data: SocialIconsWidgetData
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const config = computed(() => props.data.widget || props.data || {})

const items = computed(() => config.value.items || [])
const size = computed(() => config.value.size || 'md')
const iconStyle = computed(() => config.value.icon_style || config.value.style || 'default')
const colorMode = computed(() => config.value.color_mode || 'brand')
const customColor = computed(() => config.value.icon_color || '')

// Platform to FontAwesome icon mapping
const platformIcons: Record<string, string> = {
  facebook: 'fa-brands fa-facebook-f',
  twitter: 'fa-brands fa-x-twitter',
  instagram: 'fa-brands fa-instagram',
  linkedin: 'fa-brands fa-linkedin-in',
  youtube: 'fa-brands fa-youtube',
  tiktok: 'fa-brands fa-tiktok',
  pinterest: 'fa-brands fa-pinterest-p',
  github: 'fa-brands fa-github',
  dribbble: 'fa-brands fa-dribbble',
  behance: 'fa-brands fa-behance',
  whatsapp: 'fa-brands fa-whatsapp',
  telegram: 'fa-brands fa-telegram',
  discord: 'fa-brands fa-discord',
  twitch: 'fa-brands fa-twitch',
  spotify: 'fa-brands fa-spotify',
}

// Platform to brand color mapping
const platformColors: Record<string, string> = {
  facebook: '#1877f2',
  twitter: '#000000',
  instagram: '#e4405f',
  linkedin: '#0a66c2',
  youtube: '#ff0000',
  tiktok: '#000000',
  pinterest: '#bd081c',
  github: '#181717',
  dribbble: '#ea4c89',
  behance: '#1769ff',
  whatsapp: '#25d366',
  telegram: '#26a5e4',
  discord: '#5865f2',
  twitch: '#9146ff',
  spotify: '#1db954',
}

function getIcon(platform: string): string {
  return platformIcons[platform.toLowerCase()] || 'fa-solid fa-link'
}

function getColor(platform: string): string {
  if (colorMode.value === 'custom' && customColor.value) return resolveColor(customColor.value)
  return platformColors[platform.toLowerCase()] || '#6c757d'
}
</script>

<template>
  <div
    class="lcms-social-icons"
    :class="[
      `lcms-social-icons--${size}`,
      `lcms-social-icons--${iconStyle}`
    ]"
  >
    <a
      v-for="(item, index) in items"
      :key="index"
      :href="item.url"
      class="lcms-social-icons__link"
      :class="`lcms-social-icons__link--${item.platform.toLowerCase()}`"
      :style="{ '--platform-color': getColor(item.platform) }"
      target="_blank"
      rel="noopener noreferrer"
      :aria-label="item.platform"
    >
      <i :class="getIcon(item.platform)" />
    </a>
  </div>
</template>
