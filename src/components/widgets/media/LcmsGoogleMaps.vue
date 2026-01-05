<template>
  <div class="lcms-google-maps">
    <iframe
      v-if="embedUrl"
      :src="embedUrl"
      width="100%"
      :height="height"
      style="border:0;"
      allowfullscreen=""
      loading="lazy"
      referrerpolicy="no-referrer-when-downgrade"
    ></iframe>
    <div v-else class="lcms-google-maps__placeholder">
      <i class="fas fa-map-marker-alt"></i>
      <span>Google Maps</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  data: {
    widget_type: string
    config: {
      api_key?: string
      address?: string
      zoom?: number | string
      map_type?: string
      height?: number | string
    }
    settings?: Record<string, unknown>
  }
}>()

const config = computed(() => props.data.config || {})

const apiKey = computed(() => config.value.api_key || '')
const address = computed(() => config.value.address || '')
const zoom = computed(() => config.value.zoom || 14)
const mapType = computed(() => config.value.map_type || 'roadmap')
const height = computed(() => config.value.height || 400)

const embedUrl = computed(() => {
  if (!apiKey.value || !address.value) return ''

  const params = new URLSearchParams({
    key: apiKey.value,
    q: address.value,
    zoom: String(zoom.value),
    maptype: mapType.value
  })

  return `https://www.google.com/maps/embed/v1/place?${params.toString()}`
})
</script>

<style scoped>
.lcms-google-maps {
  width: 100%;
}

.lcms-google-maps iframe {
  display: block;
}

.lcms-google-maps__placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 2rem;
  background: #f5f5f5;
  color: #999;
  min-height: 200px;
}

.lcms-google-maps__placeholder i {
  font-size: 3rem;
}
</style>
