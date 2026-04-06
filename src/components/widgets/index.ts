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
import LcmsIconBox from './content/LcmsIconBox.vue'
import LcmsNumberedBox from './basic/LcmsNumberedBox.vue'
import LcmsServiceCard from './basic/LcmsServiceCard.vue'
import LcmsLink from './basic/LcmsLink.vue'
import LcmsPill from './basic/LcmsPill.vue'
import LcmsTeamMember from './basic/LcmsTeamMember.vue'
import LcmsPricingTable from './basic/LcmsPricingTable.vue'
import LcmsCtaBox from './basic/LcmsCtaBox.vue'
import LcmsFeatureList from './basic/LcmsFeatureList.vue'
import LcmsIconList from './basic/LcmsIconList.vue'

// Text widgets
import LcmsText from './text/LcmsText.vue'
import LcmsHeading from './text/LcmsHeading.vue'
import LcmsBlockquote from './text/LcmsBlockquote.vue'
import LcmsTable from './text/LcmsTable.vue'

// Media widgets
import LcmsImage from './media/LcmsImage.vue'
import LcmsGallery from './media/LcmsGallery.vue'
import LcmsVideo from './media/LcmsVideo.vue'
import LcmsPdfViewer from './media/LcmsPdfViewer.vue'
import LcmsGoogleMaps from './media/LcmsGoogleMaps.vue'
import LcmsOpenStreetMap from './media/LcmsOpenStreetMap.vue'

// Layout widgets
import LcmsHero from './layout/LcmsHero.vue'
import LcmsGrid from './layout/LcmsGrid.vue'

// Interactive widgets
import LcmsCountdown from './interactive/LcmsCountdown.vue'
import LcmsCounter from './interactive/LcmsCounter.vue'
import LcmsProgressBar from './interactive/LcmsProgressBar.vue'
import LcmsTestimonial from './interactive/LcmsTestimonial.vue'
import LcmsAlert from './interactive/LcmsAlert.vue'
import LcmsAccordion from './interactive/LcmsAccordion.vue'
import LcmsTabs from './interactive/LcmsTabs.vue'
import LcmsEmbed from './interactive/LcmsEmbed.vue'
import LcmsTimeline from './interactive/LcmsTimeline.vue'
import LcmsCookieConsent from './interactive/LcmsCookieConsent.vue'
import LcmsGoogleReviews from './interactive/LcmsGoogleReviews.vue'

// Navigation widgets
import LcmsMenu from './navigation/LcmsMenu.vue'
import LcmsSocialIcons from './navigation/LcmsSocialIcons.vue'
import LcmsBreadcrumbs from './navigation/LcmsBreadcrumbs.vue'
import LcmsToc from './navigation/LcmsToc.vue'

// Interactive widgets (forms)
import LcmsForm from './interactive/LcmsForm.vue'

// Content widgets
import LcmsBlockContent from './content/LcmsBlockContent.vue'

// Collection widgets
import LcmsCollectionGrid from './collections/LcmsCollectionGrid.vue'
import LcmsCollectionCarousel from './collections/LcmsCollectionCarousel.vue'
import LcmsCollectionSingle from './collections/LcmsCollectionSingle.vue'
import LcmsCollectionField from './collections/LcmsCollectionField.vue'
import LcmsValueList from './collections/LcmsValueList.vue'
import LcmsCollectionGrouped from './collections/LcmsCollectionGrouped.vue'

// E-commerce widgets
import LcmsMiniCart from './ecommerce/LcmsMiniCart.vue'
import LcmsAccountIcon from './ecommerce/LcmsAccountIcon.vue'
import LcmsProductGrid from './ecommerce/LcmsProductGrid.vue'
import LcmsCategoryGrid from './ecommerce/LcmsCategoryGrid.vue'
import LcmsSearchBar from './ecommerce/LcmsSearchBar.vue'
import LcmsProductCarousel from './ecommerce/LcmsProductCarousel.vue'
import LcmsLoginForm from './ecommerce/LcmsLoginForm.vue'
import LcmsRegisterForm from './ecommerce/LcmsRegisterForm.vue'
import LcmsCart from './ecommerce/LcmsCart.vue'
import LcmsCheckout from './ecommerce/LcmsCheckout.vue'
import LcmsCustomerAccount from './ecommerce/LcmsCustomerAccount.vue'
import LcmsProductDetail from './ecommerce/LcmsProductDetail.vue'
import LcmsCategoryHeader from './ecommerce/LcmsCategoryHeader.vue'

/**
 * Widget type to component mapping
 */
export const widgetComponents: Record<string, Component> = {
  // Basic
  button: LcmsButton,
  divider: LcmsDivider,
  spacer: LcmsSpacer,
  'icon-box': LcmsIconBox,
  'numbered-box': LcmsNumberedBox,
  'service-card': LcmsServiceCard,
  link: LcmsLink,
  pill: LcmsPill,
  'team-member': LcmsTeamMember,
  'pricing-table': LcmsPricingTable,
  'cta-box': LcmsCtaBox,
  'feature-list': LcmsFeatureList,
  'icon-list': LcmsIconList,

  // Text
  text: LcmsText,
  heading: LcmsHeading,
  blockquote: LcmsBlockquote,
  table: LcmsTable,

  // Media
  image: LcmsImage,
  gallery: LcmsGallery,
  video: LcmsVideo,
  'pdf-viewer': LcmsPdfViewer,
  'google-maps': LcmsGoogleMaps,
  openstreetmap: LcmsOpenStreetMap,

  // Layout
  hero: LcmsHero,
  grid: LcmsGrid,

  // Interactive
  countdown: LcmsCountdown,
  counter: LcmsCounter,
  'progress-bar': LcmsProgressBar,
  testimonial: LcmsTestimonial,
  alert: LcmsAlert,
  accordion: LcmsAccordion,
  tabs: LcmsTabs,
  embed: LcmsEmbed,
  timeline: LcmsTimeline,
  'cookie-consent': LcmsCookieConsent,
  'google-reviews': LcmsGoogleReviews,

  // Navigation
  menu: LcmsMenu,
  'social-icons': LcmsSocialIcons,
  breadcrumbs: LcmsBreadcrumbs,
  toc: LcmsToc,

  // Forms
  form: LcmsForm,

  // Content
  'block-content': LcmsBlockContent,

  // Collections
  'collection-grid': LcmsCollectionGrid,
  'collection-carousel': LcmsCollectionCarousel,
  'collection-single': LcmsCollectionSingle,
  'data-field': LcmsCollectionField,
  'value-list': LcmsValueList,
  'collection-grouped': LcmsCollectionGrouped,

  // E-commerce
  'mini-cart': LcmsMiniCart,
  'account-icon': LcmsAccountIcon,
  'product-grid': LcmsProductGrid,
  'category-grid': LcmsCategoryGrid,
  'search-bar': LcmsSearchBar,
  'product-carousel': LcmsProductCarousel,
  'login-form': LcmsLoginForm,
  'register-form': LcmsRegisterForm,
  cart: LcmsCart,
  checkout: LcmsCheckout,
  'customer-account': LcmsCustomerAccount,
  'product-detail': LcmsProductDetail,
  'category-header': LcmsCategoryHeader,
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
  LcmsNumberedBox,
  LcmsServiceCard,
  LcmsLink,
  LcmsPill,
  LcmsTeamMember,
  LcmsPricingTable,
  LcmsCtaBox,
  LcmsFeatureList,
  LcmsIconList,
  // Text
  LcmsText,
  LcmsHeading,
  LcmsBlockquote,
  LcmsTable,
  // Media
  LcmsImage,
  LcmsGallery,
  LcmsVideo,
  LcmsPdfViewer,
  LcmsGoogleMaps,
  LcmsOpenStreetMap,
  // Layout
  LcmsHero,
  LcmsGrid,
  // Interactive
  LcmsCountdown,
  LcmsCounter,
  LcmsProgressBar,
  LcmsTestimonial,
  LcmsAlert,
  LcmsAccordion,
  LcmsTabs,
  LcmsEmbed,
  LcmsTimeline,
  LcmsCookieConsent,
  LcmsGoogleReviews,
  // Navigation
  LcmsMenu,
  LcmsSocialIcons,
  LcmsBreadcrumbs,
  LcmsToc,
  // Forms
  LcmsForm,
  // Content
  LcmsBlockContent,
  // Collections
  LcmsCollectionGrid,
  LcmsCollectionCarousel,
  LcmsCollectionSingle,
  LcmsCollectionField,
  LcmsValueList,
  LcmsCollectionGrouped,
  // E-commerce
  LcmsMiniCart,
  LcmsAccountIcon,
  LcmsProductGrid,
  LcmsCategoryGrid,
  LcmsSearchBar,
  LcmsProductCarousel,
  LcmsLoginForm,
  LcmsRegisterForm,
  LcmsCart,
  LcmsCheckout,
  LcmsCustomerAccount,
  LcmsProductDetail,
  LcmsCategoryHeader,
}
