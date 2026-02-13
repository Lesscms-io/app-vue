<template>
  <div class="lcms-service-card" :style="cardStyles">
    <!-- Badge -->
    <div v-if="badge" class="lcms-service-card__badge" :style="badgeStyles">
      {{ badge }}
    </div>

    <!-- Icon -->
    <div v-if="icon" class="lcms-service-card__icon" :style="iconStyles">
      <i :class="icon"></i>
    </div>

    <!-- Title -->
    <h3 v-if="title" class="lcms-service-card__title">
      {{ title }}
    </h3>

    <!-- Description -->
    <p v-if="description" class="lcms-service-card__description">
      {{ description }}
    </p>

    <!-- Link -->
    <a v-if="linkText && linkUrl" :href="linkUrl" class="lcms-service-card__link">
      {{ linkText }} <span class="lcms-service-card__arrow">→</span>
    </a>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  data: {
    widget_type: string
    config: {
      badge?: string
      icon?: string
      title?: string
      description?: string
      link_text?: string
      link_url?: string
      icon_color?: string
      icon_background?: string
      badge_color?: string
      badge_background?: string
      text_color?: string
      background_color?: string
    }
    settings?: Record<string, unknown>
  }
}>()

const config = computed(() => props.data.config || {})

const badge = computed(() => config.value.badge || '')
const icon = computed(() => config.value.icon || '')
const title = computed(() => config.value.title || '')
const description = computed(() => config.value.description || '')
const linkText = computed(() => config.value.link_text || '')
const linkUrl = computed(() => config.value.link_url || '')

const cardStyles = computed(() => {
  const styles: Record<string, string> = {}
  if (config.value.background_color) {
    styles.backgroundColor = config.value.background_color
  }
  if (config.value.text_color) {
    styles.color = config.value.text_color
  }
  return styles
})

const iconStyles = computed(() => {
  const styles: Record<string, string> = {}
  if (config.value.icon_color) {
    styles.color = config.value.icon_color
  }
  if (config.value.icon_background) {
    styles.backgroundColor = config.value.icon_background
  }
  return styles
})

const badgeStyles = computed(() => {
  const styles: Record<string, string> = {}
  if (config.value.badge_color) {
    styles.color = config.value.badge_color
  }
  if (config.value.badge_background) {
    styles.backgroundColor = config.value.badge_background
  }
  return styles
})
</script>

<style scoped>
.lcms-service-card {
  display: flex;
  flex-direction: column;
  padding: 2rem;
  background: #fff;
  border-radius: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  position: relative;
  transition: box-shadow 0.2s ease;
}

.lcms-service-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.lcms-service-card__badge {
  position: absolute;
  top: 1rem;
  right: 1rem;
  padding: 0.375rem 0.75rem;
  background: #4ade80;
  color: #1a4d3e;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  border-radius: 9999px;
  letter-spacing: 0.025em;
}

.lcms-service-card__icon {
  width: 3.5rem;
  height: 3.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e8f5e9;
  color: #2e7d32;
  border-radius: 0.75rem;
  font-size: 1.5rem;
  margin-bottom: 1.25rem;
}

.lcms-service-card__title {
  font-size: 1.25rem;
  font-weight: 700;
  color: inherit;
  margin: 0 0 0.75rem 0;
}

.lcms-service-card__description {
  font-size: 0.9375rem;
  line-height: 1.6;
  color: inherit;
  opacity: 0.75;
  margin: 0 0 1.5rem 0;
  flex: 1;
}

.lcms-service-card__link {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.9375rem;
  font-weight: 500;
  color: inherit;
  text-decoration: none;
  transition: gap 0.2s ease;
}

.lcms-service-card__link:hover {
  gap: 0.625rem;
}

.lcms-service-card__arrow {
  transition: transform 0.2s ease;
}

.lcms-service-card__link:hover .lcms-service-card__arrow {
  transform: translateX(2px);
}
</style>
