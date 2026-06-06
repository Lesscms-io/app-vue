<script setup lang="ts">
/**
 * Gallery tile — renders a single gallery item as either an image or a video.
 * Video tiles show the first frame (preload="metadata") with a play overlay;
 * actual playback happens in the lightbox. Used across every gallery layout
 * (grid, mosaic, carousel) so the image-vs-video branch lives in one place.
 */
defineProps<{
  item: any
  imgClass?: string
  sizes?: string
  /** Use the full-resolution url instead of the optimized thumbnail src (carousel/coverflow). */
  preferFull?: boolean
}>()
</script>

<template>
  <div
    v-if="item.type === 'video'"
    class="lcms-gallery__video"
  >
    <video
      :src="item.url"
      :poster="item.poster || undefined"
      preload="metadata"
      muted
      playsinline
      :class="imgClass"
    />
    <span
      class="lcms-gallery__play"
      aria-hidden="true"
    >
      <i class="fa-solid fa-play" />
    </span>
  </div>
  <img
    v-else
    :src="preferFull ? item.url : (item.src || item.url)"
    :srcset="item.srcset"
    :sizes="sizes || item.sizes"
    :alt="item.alt || ''"
    loading="lazy"
    decoding="async"
    :class="imgClass"
  >
</template>
