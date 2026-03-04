<template>
  <div class="lcms-openstreetmap">
    <div
      v-if="hasConfig"
      ref="mapContainer"
      class="lcms-openstreetmap__container"
      :style="{ minHeight: '400px' }"
    ></div>
    <div v-else class="lcms-openstreetmap__placeholder">
      <i class="fas fa-map-pin"></i>
      <span>OpenStreetMap</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, watch } from 'vue'

const props = defineProps<{
  data: {
    widget_type: string
    config: {
      lat?: number | null
      lng?: number | null
      zoom?: number | string
      tile_style?: string
      show_marker?: boolean
      scroll_wheel_zoom?: boolean
      zoom_control?: boolean
      draggable?: boolean
    }
    settings?: Record<string, unknown>
  }
  language?: string
}>()

const config = computed(() => props.data.widget || props.data || {})
const mapContainer = ref<HTMLElement | null>(null)
let mapInstance: any = null
let markerInstance: any = null

const lat = computed(() => config.value.lat ?? null)
const lng = computed(() => config.value.lng ?? null)
const zoom = computed(() => Number(config.value.zoom) || 14)
const tileStyle = computed(() => config.value.tile_style || 'standard')
const showMarker = computed(() => config.value.show_marker !== false)
const scrollWheelZoom = computed(() => config.value.scroll_wheel_zoom === true)
const zoomControl = computed(() => config.value.zoom_control !== false)
const draggable = computed(() => config.value.draggable !== false)

const hasConfig = computed(() => lat.value !== null && lng.value !== null)

const TILE_PROVIDERS: Record<string, { url: string; attribution: string }> = {
  standard: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  },
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
  }
}

function loadLeaflet(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).L) { resolve(); return }

    if (!document.querySelector('link[href*="leaflet"]')) {
      const css = document.createElement('link')
      css.rel = 'stylesheet'
      css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(css)
    }

    if (!document.querySelector('script[src*="leaflet"]')) {
      const script = document.createElement('script')
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Failed to load Leaflet'))
      document.head.appendChild(script)
    } else {
      const check = setInterval(() => {
        if ((window as any).L) { clearInterval(check); resolve() }
      }, 100)
      setTimeout(() => { clearInterval(check); (window as any).L ? resolve() : reject(new Error('timeout')) }, 10000)
    }
  })
}

async function initMap() {
  if (!hasConfig.value || !mapContainer.value) return

  try {
    await loadLeaflet()
    const L = (window as any).L

    if (mapInstance) {
      mapInstance.remove()
      mapInstance = null
      markerInstance = null
    }

    mapInstance = L.map(mapContainer.value, {
      center: [lat.value, lng.value],
      zoom: zoom.value,
      scrollWheelZoom: scrollWheelZoom.value,
      zoomControl: zoomControl.value,
      dragging: draggable.value
    })

    const provider = TILE_PROVIDERS[tileStyle.value] || TILE_PROVIDERS.standard
    L.tileLayer(provider.url, {
      attribution: provider.attribution
    }).addTo(mapInstance)

    if (showMarker.value) {
      markerInstance = L.marker([lat.value, lng.value]).addTo(mapInstance)
    }
  } catch (e) {
    console.error('Error initializing Leaflet map:', e)
  }
}

onMounted(() => {
  if (hasConfig.value) initMap()
})

watch(hasConfig, (val) => {
  if (val && !mapInstance) initMap()
})

onBeforeUnmount(() => {
  if (mapInstance) {
    mapInstance.remove()
    mapInstance = null
    markerInstance = null
  }
})
</script>

<style scoped>
.lcms-openstreetmap {
  width: 100%;
}

.lcms-openstreetmap__container {
  width: 100%;
  border-radius: 4px;
}

.lcms-openstreetmap__placeholder {
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

.lcms-openstreetmap__placeholder i {
  font-size: 3rem;
}
</style>
