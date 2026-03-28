<script setup lang="ts">
/**
 * Team Member Widget
 *
 * Renders a team member card with photo, name, position, bio and social links.
 * Element-group architecture: member, image, social, config groups.
 */

import { computed } from 'vue'
import { useLanguage } from '@/composables/useLanguage'
import { getImageSrc, getImageSrcset } from '@/composables/useImageOptimization'

defineOptions({
  inheritAttrs: false
})

interface Props {
  data: Record<string, any>
  language?: string
  settings?: Record<string, any>
}

const props = defineProps<Props>()

const { extractValue } = useLanguage(props.language)

// Element-group computed refs
const memberGroup = computed(() => props.data.member || {})
const imageGroup = computed(() => props.data.image || {})
const socialGroup = computed(() => props.data.social || {})
const configGroup = computed(() => props.data.config || {})

// Element-group reads
const name = computed(() => extractValue(memberGroup.value.name_html || memberGroup.value.name))
const position = computed(() => extractValue(memberGroup.value.position_html || memberGroup.value.position))
const bio = computed(() => extractValue(memberGroup.value.bio_html || memberGroup.value.bio))
const rawPhoto = computed(() => imageGroup.value.image || null)
const photo = computed(() => getImageSrc(rawPhoto.value))
const photoSrcset = computed(() => getImageSrcset(rawPhoto.value))
const socialLinks = computed(() => socialGroup.value.social_links || [])
const teamMemberStyle = computed(() => configGroup.value.team_member_style || 'card')
const accentColor = computed(() => configGroup.value.accent_color || null)
const accentColorHover = computed(() => configGroup.value['accent_color:hover'] || null)

function resolveColor(val: string | null | undefined): string | null {
  if (!val) return null
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

const resolvedAccentColor = computed(() => resolveColor(accentColor.value))
const resolvedAccentColorHover = computed(() => resolveColor(accentColorHover.value))
const hasHover = computed(() => !!resolvedAccentColorHover.value)

const containerStyle = computed(() => {
  const style: Record<string, string> = {}
  if (resolvedAccentColor.value) style['--accent-color'] = resolvedAccentColor.value
  if (resolvedAccentColorHover.value) style['--hover-accent-color'] = resolvedAccentColorHover.value
  return style
})

const socialIcons: Record<string, string> = {
  linkedin: 'fab fa-linkedin',
  twitter: 'fab fa-x-twitter',
  facebook: 'fab fa-facebook',
  instagram: 'fab fa-instagram',
  github: 'fab fa-github',
  email: 'fas fa-envelope'
}

function getSocialUrl(link: { platform: string; url: string }) {
  if (link.platform === 'email' && link.url && !link.url.startsWith('mailto:')) {
    return `mailto:${link.url}`
  }
  return link.url || '#'
}
</script>

<template>
  <div
    class="lcms-team-member"
    :class="[`lcms-team-member--${teamMemberStyle}`, { 'has-hover': hasHover }]"
    :style="containerStyle"
  >
    <div v-if="photo" class="lcms-team-member__image-wrap">
      <img :src="photo" :srcset="photoSrcset" sizes="(max-width: 768px) 100vw, 300px" :alt="name" loading="lazy" decoding="async" class="lcms-team-member__image" />
    </div>
    <div class="lcms-team-member__info">
      <h3 v-if="name" class="lcms-team-member__name">{{ name }}</h3>
      <p
        v-if="position"
        class="lcms-team-member__position"
        :style="resolvedAccentColor ? { color: resolvedAccentColor } : {}"
      >{{ position }}</p>
      <p v-if="bio" class="lcms-team-member__bio">{{ bio }}</p>
      <div v-if="socialLinks.length" class="lcms-team-member__social">
        <a
          v-for="(link, idx) in socialLinks"
          :key="idx"
          :href="getSocialUrl(link)"
          target="_blank"
          rel="noopener noreferrer"
          class="lcms-team-member__social-link"
          :style="resolvedAccentColor ? { color: resolvedAccentColor } : {}"
        >
          <i :class="socialIcons[link.platform] || 'fas fa-link'" />
        </a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lcms-team-member {
  --accent-color: #50a5f1;
  text-align: center;
}

.lcms-team-member--card {
  background: #fff;
  border-radius: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.lcms-team-member.has-hover:hover {
  --accent-color: var(--hover-accent-color);
}

.lcms-team-member__image-wrap {
  width: 100%;
  aspect-ratio: 1;
  overflow: hidden;
}

.lcms-team-member__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.lcms-team-member__info {
  padding: 1.5rem;
}

.lcms-team-member__name {
  font-size: 1.125rem;
  font-weight: 700;
  margin: 0 0 0.25rem 0;
}

.lcms-team-member__position {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--accent-color, #50a5f1);
  margin: 0 0 0.75rem 0;
}

.lcms-team-member__bio {
  font-size: 0.875rem;
  line-height: 1.6;
  color: #6c757d;
  margin: 0 0 1rem 0;
}

.lcms-team-member__social {
  display: flex;
  justify-content: center;
  gap: 0.75rem;
}

.lcms-team-member__social-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  color: #6c757d;
  font-size: 1rem;
  text-decoration: none;
  transition: color 0.2s ease;
}

.lcms-team-member__social-link:hover {
  opacity: 0.8;
}

/* Minimal style */
.lcms-team-member--minimal .lcms-team-member__image-wrap {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  margin: 0 auto 1rem;
}

/* Overlay style */
.lcms-team-member--overlay {
  position: relative;
}

.lcms-team-member--overlay .lcms-team-member__info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
  color: #fff;
  padding: 2rem 1.5rem 1.5rem;
}

.lcms-team-member--overlay .lcms-team-member__position {
  color: rgba(255, 255, 255, 0.8);
}

.lcms-team-member--overlay .lcms-team-member__bio {
  color: rgba(255, 255, 255, 0.7);
}

.lcms-team-member--overlay .lcms-team-member__social-link {
  color: #fff;
}
</style>
