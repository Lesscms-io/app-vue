<script setup lang="ts">
/**
 * Gallery tile — renders a single gallery item as either an image or a video.
 * Video tiles show the first frame (preload="metadata") with a play overlay;
 * actual playback happens in the lightbox. Used across every gallery layout
 * (grid, mosaic, carousel) so the image-vs-video branch lives in one place.
 *
 * Optional `caption` renders as a bottom gradient overlay — overlay (instead
 * of a block below the image) keeps every layout's aspect-ratio/masonry
 * geometry untouched.
 */
defineProps<{
  item: any
  imgClass?: string
  sizes?: string
  /** Use the full-resolution url instead of the optimized thumbnail src (carousel/coverflow). */
  preferFull?: boolean
  /** Caption text rendered over the bottom edge. Empty = no overlay. */
  caption?: string
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
    <span
      v-if="caption"
      class="lcms-gallery__tile-caption"
    >{{ caption }}</span>
  </div>
  <div
    v-else-if="caption"
    class="lcms-gallery__tile"
  >
    <img
      :src="preferFull ? item.url : (item.src || item.url)"
      :srcset="item.srcset"
      :sizes="sizes || item.sizes"
      :alt="item.alt || ''"
      loading="lazy"
      decoding="async"
      :class="imgClass"
    >
    <span class="lcms-gallery__tile-caption">{{ caption }}</span>
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

<style scoped>
.lcms-gallery__tile {
  position: relative;
  width: 100%;
  height: 100%;
}

.lcms-gallery__tile-caption {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 1.25rem 0.75rem 0.5rem;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.65), transparent);
  color: #fff;
  font-size: 0.8125rem;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  pointer-events: none;
}
</style>
