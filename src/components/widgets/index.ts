/**
 * Widget Registry
 *
 * Maps widget type strings to their Vue components.
 */

import type { Component } from 'vue'

// Basic widgets
import LcmsButton from './basic/LcmsButton.vue'
import LcmsDivider from './basic/LcmsDivider.vue'
import LcmsSpacer from './basic/LcmsSpacer.vue'
import LcmsIconBox from './basic/LcmsIconBox.vue'
import LcmsServiceCard from './basic/LcmsServiceCard.vue'
import LcmsLink from './basic/LcmsLink.vue'
import LcmsPill from './basic/LcmsPill.vue'

// Text widgets
import LcmsText from './text/LcmsText.vue'
import LcmsHeading from './text/LcmsHeading.vue'

// Media widgets
import LcmsImage from './media/LcmsImage.vue'
import LcmsGallery from './media/LcmsGallery.vue'
import LcmsVideo from './media/LcmsVideo.vue'
import LcmsPdfViewer from './media/LcmsPdfViewer.vue'
import LcmsGoogleMaps from './media/LcmsGoogleMaps.vue'

// Layout widgets
import LcmsHero from './layout/LcmsHero.vue'
import LcmsGrid from './layout/LcmsGrid.vue'

// Interactive widgets
import LcmsCountdown from './interactive/LcmsCountdown.vue'
import LcmsCounter from './interactive/LcmsCounter.vue'
import LcmsProgressBar from './interactive/LcmsProgressBar.vue'
import LcmsTestimonial from './interactive/LcmsTestimonial.vue'
import LcmsAlert from './interactive/LcmsAlert.vue'

// Navigation widgets
import LcmsMenu from './navigation/LcmsMenu.vue'
import LcmsSocialIcons from './navigation/LcmsSocialIcons.vue'
import LcmsBreadcrumbs from './navigation/LcmsBreadcrumbs.vue'

// Interactive widgets (forms)
import LcmsForm from './interactive/LcmsForm.vue'

// Collection widgets
import LcmsCollectionGrid from './collections/LcmsCollectionGrid.vue'
import LcmsCollectionCarousel from './collections/LcmsCollectionCarousel.vue'
import LcmsCollectionSingle from './collections/LcmsCollectionSingle.vue'
import LcmsCollectionField from './collections/LcmsCollectionField.vue'
import LcmsValueList from './collections/LcmsValueList.vue'
import LcmsCollectionGrouped from './collections/LcmsCollectionGrouped.vue'

/**
 * Widget type to component mapping
 */
export const widgetComponents: Record<string, Component> = {
  // Basic
  button: LcmsButton,
  divider: LcmsDivider,
  spacer: LcmsSpacer,
  'icon-box': LcmsIconBox,
  'service-card': LcmsServiceCard,
  link: LcmsLink,
  pill: LcmsPill,

  // Text
  text: LcmsText,
  heading: LcmsHeading,

  // Media
  image: LcmsImage,
  gallery: LcmsGallery,
  video: LcmsVideo,
  'pdf-viewer': LcmsPdfViewer,
  'google-maps': LcmsGoogleMaps,

  // Layout
  hero: LcmsHero,
  grid: LcmsGrid,

  // Interactive
  countdown: LcmsCountdown,
  counter: LcmsCounter,
  'progress-bar': LcmsProgressBar,
  testimonial: LcmsTestimonial,
  alert: LcmsAlert,

  // Navigation
  menu: LcmsMenu,
  'social-icons': LcmsSocialIcons,
  breadcrumbs: LcmsBreadcrumbs,

  // Forms
  form: LcmsForm,

  // Collections
  'collection-grid': LcmsCollectionGrid,
  'collection-carousel': LcmsCollectionCarousel,
  'collection-single': LcmsCollectionSingle,
  'data-field': LcmsCollectionField,
  'value-list': LcmsValueList,
  'collection-grouped': LcmsCollectionGrouped,
}

/**
 * Get widget component by type
 */
export function getWidgetComponent(type: string): Component | null {
  return widgetComponents[type] || null
}

/**
 * Check if widget type is supported
 */
export function isWidgetSupported(type: string): boolean {
  return type in widgetComponents
}

/**
 * Get all supported widget types
 */
export function getSupportedWidgetTypes(): string[] {
  return Object.keys(widgetComponents)
}

// Re-export all widget components for direct import
export {
  // Basic
  LcmsButton,
  LcmsDivider,
  LcmsSpacer,
  LcmsIconBox,
  LcmsServiceCard,
  LcmsLink,
  LcmsPill,
  // Text
  LcmsText,
  LcmsHeading,
  // Media
  LcmsImage,
  LcmsGallery,
  LcmsVideo,
  LcmsPdfViewer,
  LcmsGoogleMaps,
  // Layout
  LcmsHero,
  LcmsGrid,
  // Interactive
  LcmsCountdown,
  LcmsCounter,
  LcmsProgressBar,
  LcmsTestimonial,
  LcmsAlert,
  // Navigation
  LcmsMenu,
  LcmsSocialIcons,
  LcmsBreadcrumbs,
  // Forms
  LcmsForm,
  // Collections
  LcmsCollectionGrid,
  LcmsCollectionCarousel,
  LcmsCollectionSingle,
  LcmsCollectionField,
  LcmsValueList,
  LcmsCollectionGrouped,
}
