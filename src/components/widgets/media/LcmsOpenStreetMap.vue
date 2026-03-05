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
import { useApiOptional } from '@/composables/useApi'

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
      geojson_source?: string
      geojson_file?: string
      collection_code?: string
      entry_source?: string
      entry_id?: string
      entry_url_segment?: number
      geojson_field_code?: string
      geojson_fill_color?: string
      geojson_stroke_color?: string
      geojson_fill_opacity?: string
    }
    settings?: Record<string, unknown>
  }
  language?: string
}>()

const api = useApiOptional()

const config = computed(() => props.data.widget || props.data || {})
const mapContainer = ref<HTMLElement | null>(null)
let mapInstance: any = null
let markerInstance: any = null
let geojsonLayer: any = null

const lat = computed(() => config.value.lat ?? null)
const lng = computed(() => config.value.lng ?? null)
const zoom = computed(() => Number(config.value.zoom) || 14)
const tileStyle = computed(() => config.value.tile_style || 'standard')
const showMarker = computed(() => config.value.show_marker !== false)
const scrollWheelZoom = computed(() => config.value.scroll_wheel_zoom === true)
const zoomControl = computed(() => config.value.zoom_control !== false)
const draggable = computed(() => config.value.draggable !== false)

// GeoJSON computed
const geojsonSource = computed(() => config.value.geojson_source || 'static')
const geojsonFileUrl = computed(() => config.value.geojson_file || '')
const collectionCode = computed(() => config.value.collection_code || '')
const entrySource = computed(() => config.value.entry_source || 'static')
const entryUrlSegment = computed(() => Number(config.value.entry_url_segment) || 1)
const geojsonFieldCode = computed(() => config.value.geojson_field_code || '')
const geojsonFillColor = computed(() => config.value.geojson_fill_color || '#3388ff')
const geojsonStrokeColor = computed(() => config.value.geojson_stroke_color || '#3388ff')
const geojsonFillOpacity = computed(() => parseFloat(config.value.geojson_fill_opacity || '0.2') || 0.2)

const hasConfig = computed(() => lat.value !== null && lng.value !== null)

// GeoJSON data
const geojsonRawData = ref<any>(null)

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

function getGeojsonStyle() {
  return {
    fillColor: geojsonFillColor.value,
    color: geojsonStrokeColor.value,
    fillOpacity: geojsonFillOpacity.value,
    weight: 2
  }
}

function renderGeojsonLayer() {
  if (!mapInstance) return
  const L = (window as any).L
  if (!L) return

  // Remove existing layer
  if (geojsonLayer) {
    mapInstance.removeLayer(geojsonLayer)
    geojsonLayer = null
  }

  if (!geojsonRawData.value) return

  try {
    const style = getGeojsonStyle()
    geojsonLayer = L.geoJSON(geojsonRawData.value, {
      style: () => style,
      pointToLayer: (_feature: any, latlng: any) => {
        return L.circleMarker(latlng, { ...style, radius: 8 })
      }
    }).addTo(mapInstance)

    // Fit bounds to GeoJSON data
    const bounds = geojsonLayer.getBounds()
    if (bounds.isValid()) {
      mapInstance.fitBounds(bounds, { padding: [20, 20] })
    }
  } catch (e) {
    console.error('Error rendering GeoJSON layer:', e)
  }
}

function getEntryId(): string {
  if (entrySource.value === 'url') {
    const path = window.location.pathname
    const segments = path.split('/').filter((s: string) => s)
    const segmentIndex = entryUrlSegment.value - 1
    return segments[segmentIndex] || ''
  }
  return config.value.entry_id || ''
}

async function fetchGeoJSON() {
  if (geojsonSource.value === 'static') {
    if (!geojsonFileUrl.value) {
      geojsonRawData.value = null
      return
    }
    try {
      const response = await fetch(geojsonFileUrl.value)
      geojsonRawData.value = await response.json()
    } catch (e) {
      console.error('Error fetching GeoJSON file:', e)
      geojsonRawData.value = null
    }
  } else if (geojsonSource.value === 'dynamic') {
    const resolvedEntryId = getEntryId()
    if (!collectionCode.value || !resolvedEntryId || !geojsonFieldCode.value || !api) {
      geojsonRawData.value = null
      return
    }
    try {
      const response = await api.getCollectionEntry(collectionCode.value, resolvedEntryId)
      const entry = (response as any).data || response
      const fieldValue = entry?.data?.[geojsonFieldCode.value]
      if (!fieldValue) {
        geojsonRawData.value = null
        return
      }
      // Resolve multilingual field
      let rawValue = fieldValue
      if (typeof fieldValue === 'object' && !Array.isArray(fieldValue) && !fieldValue.type) {
        rawValue = fieldValue[props.language || 'pl'] || Object.values(fieldValue)[0] || ''
      }
      // Parse if string
      if (typeof rawValue === 'string') {
        geojsonRawData.value = JSON.parse(rawValue)
      } else {
        geojsonRawData.value = rawValue
      }
    } catch (e) {
      console.error('Error fetching dynamic GeoJSON:', e)
      geojsonRawData.value = null
    }
  }
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
      geojsonLayer = null
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

    // Render GeoJSON if available
    if (geojsonRawData.value) {
      renderGeojsonLayer()
    }
  } catch (e) {
    console.error('Error initializing Leaflet map:', e)
  }
}

// Watch GeoJSON data changes
watch(geojsonRawData, () => {
  renderGeojsonLayer()
})

onMounted(async () => {
  await fetchGeoJSON()
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
    geojsonLayer = null
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
