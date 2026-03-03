<template>
  <div class="lcms-google-maps">
    <div
      v-if="hasConfig"
      ref="mapContainer"
      class="lcms-google-maps__container"
      :style="{ minHeight: height + 'px' }"
    ></div>
    <div v-else class="lcms-google-maps__placeholder">
      <i class="fas fa-map-marker-alt"></i>
      <span>Google Maps</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useLanguage } from '@/composables/useLanguage'

const props = defineProps<{
  data: {
    widget_type: string
    config: {
      api_key?: string
      location_source?: string
      address?: string | Record<string, string>
      lat?: number | null
      lng?: number | null
      zoom?: number | string
      map_type?: string
      show_marker?: boolean
      street_view_control?: boolean
      zoom_control?: boolean
      fullscreen_control?: boolean
      map_type_control?: boolean
      scroll_wheel?: boolean
      draggable?: boolean
      height?: number | string
    }
    settings?: Record<string, unknown>
  }
  language?: string
}>()

const { extractValue } = useLanguage(props.language)

const config = computed(() => props.data.config || props.data || {})
const mapContainer = ref<HTMLElement | null>(null)
let mapInstance: any = null
let markerInstance: any = null

const apiKey = computed(() => config.value.api_key || '')
const locationSource = computed(() => config.value.location_source || 'address')
const address = computed(() => {
  const addr = config.value.address
  if (!addr) return ''
  if (typeof addr === 'object') return extractValue(addr)
  return addr
})
const lat = computed(() => config.value.lat ?? null)
const lng = computed(() => config.value.lng ?? null)
const zoom = computed(() => Number(config.value.zoom) || 14)
const mapType = computed(() => config.value.map_type || 'roadmap')
const showMarker = computed(() => config.value.show_marker !== false)
const height = computed(() => Number(config.value.height) || 400)

// Controls
const streetViewControl = computed(() => config.value.street_view_control === true)
const zoomControl = computed(() => config.value.zoom_control !== false)
const fullscreenControl = computed(() => config.value.fullscreen_control !== false)
const mapTypeControl = computed(() => config.value.map_type_control === true)
const scrollWheel = computed(() => config.value.scroll_wheel === true)
const mapDraggable = computed(() => config.value.draggable !== false)

const hasConfig = computed(() => {
  if (!apiKey.value) return false
  if (locationSource.value === 'coordinates') {
    return lat.value !== null && lng.value !== null
  }
  return !!address.value
})

function isGoogleLoaded(): boolean {
  return typeof window !== 'undefined' && !!(window as any).google?.maps
}

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (isGoogleLoaded()) { resolve(); return }

    const existing = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')
    if (existing) {
      const check = setInterval(() => {
        if (isGoogleLoaded()) { clearInterval(check); resolve() }
      }, 100)
      setTimeout(() => { clearInterval(check); isGoogleLoaded() ? resolve() : reject(new Error('timeout')) }, 10000)
      return
    }

    const cbName = `initGoogleMaps_${Date.now()}`
    ;(window as any)[cbName] = () => { delete (window as any)[cbName]; resolve() }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey.value}&callback=${cbName}`
    script.async = true
    script.defer = true
    script.onerror = () => reject(new Error('Failed to load Google Maps script'))
    document.head.appendChild(script)
  })
}

async function initMap() {
  if (!hasConfig.value || !mapContainer.value) return

  try {
    await loadScript()
    if (!isGoogleLoaded()) return

    const google = (window as any).google

    mapInstance = new google.maps.Map(mapContainer.value, {
      zoom: zoom.value,
      mapTypeId: mapType.value,
      center: { lat: 0, lng: 0 },
      streetViewControl: streetViewControl.value,
      zoomControl: zoomControl.value,
      fullscreenControl: fullscreenControl.value,
      mapTypeControl: mapTypeControl.value,
      scrollwheel: scrollWheel.value,
      draggable: mapDraggable.value,
      gestureHandling: scrollWheel.value ? 'greedy' : 'cooperative'
    })

    if (locationSource.value === 'coordinates' && lat.value !== null && lng.value !== null) {
      const pos = { lat: lat.value, lng: lng.value }
      mapInstance.setCenter(pos)
      if (showMarker.value) {
        markerInstance = new google.maps.Marker({ map: mapInstance, position: pos })
      }
    } else if (locationSource.value === 'address' && address.value) {
      const geocoder = new google.maps.Geocoder()
      geocoder.geocode({ address: address.value }, (results: any, status: string) => {
        if (status === 'OK' && results[0]) {
          const location = results[0].geometry.location
          mapInstance.setCenter(location)
          if (showMarker.value) {
            markerInstance = new google.maps.Marker({ map: mapInstance, position: location })
          }
        }
      })
    }
  } catch (e) {
    console.error('Error initializing Google Maps:', e)
  }
}

onMounted(() => {
  if (hasConfig.value) initMap()
})

watch(hasConfig, (val) => {
  if (val && !mapInstance) initMap()
})

onBeforeUnmount(() => {
  mapInstance = null
  markerInstance = null
})
</script>

<style scoped>
.lcms-google-maps {
  width: 100%;
}

.lcms-google-maps__container {
  width: 100%;
  border-radius: 4px;
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
