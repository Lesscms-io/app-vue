/**
 * Widget Data Types
 */

import type { MultilingualValue } from '../api/types'

// ============================================
// Base Widget
// ============================================

export interface BaseWidgetData {
  [key: string]: any
}

// ============================================
// Basic Widgets
// ============================================

export interface ButtonTextGroup {
  text?: MultilingualValue
}

export interface ButtonConfigGroup {
  style?: string
  size?: string
  border_radius?: string
  padding?: string
  icon?: string
  icon_position?: string
}

export interface ButtonLinkGroup {
  url?: string
  link_type?: string
  page_id?: string | null
  collection_code?: string | null
  entry_id?: string | null
  route_uuid?: string | null
  target_blank?: boolean
}

export interface ButtonWidgetData extends BaseWidgetData {
  text?: ButtonTextGroup
  config?: ButtonConfigGroup
  link?: ButtonLinkGroup
}

export interface IconWidgetData extends BaseWidgetData {
  icon: string // FontAwesome class
  size?: string // 24, 32, 48, 64
  color?: string
}

export interface DividerLineGroup {
  line_style?: 'solid' | 'dashed' | 'dotted'
  color?: string
  'color:hover'?: string | null
  width?: string // 1, 2, 3
}

export interface DividerWidgetData extends BaseWidgetData {
  line?: DividerLineGroup
  // Legacy flat fields (backward compat)
  style?: 'solid' | 'dashed' | 'dotted'
  color?: string
  width?: string
}

export interface SpacerWidgetData extends BaseWidgetData {
  height?: number
}

export interface PillWidgetData extends BaseWidgetData {
  text: MultilingualValue
  variant?: 'filled' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  background_color?: string
  text_color?: string
  uppercase?: boolean
}

export interface LinkWidgetData extends BaseWidgetData {
  text: MultilingualValue
  url?: string
  icon?: string
  icon_position?: 'left' | 'right' | 'none'
  animation?: 'none' | 'slide' | 'fade' | 'underline'
  color?: string
  target_blank?: boolean
}

export interface StarRatingWidgetData extends BaseWidgetData {
  rating: number
  max_stars?: number
  color?: string
}

// ============================================
// Text Widgets
// ============================================

export interface TextWidgetData extends BaseWidgetData {
  content: MultilingualValue // HTML from TipTap
}

export interface HeadingWidgetData extends BaseWidgetData {
  text: MultilingualValue
  level?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  align?: 'left' | 'center' | 'right'
}

export interface BlockquoteWidgetData extends BaseWidgetData {
  quote: {
    text: MultilingualValue
    color?: string
    'color:hover'?: string
  }
  author?: {
    text: MultilingualValue
  }
  source?: {
    text: MultilingualValue
  }
  config?: {
    blockquote_style?: 'simple' | 'bordered' | 'filled'
  }
}

export interface IconListItem {
  icon: string
  text: MultilingualValue
}

export interface IconListWidgetData extends BaseWidgetData {
  items: IconListItem[]
}

// ============================================
// Media Widgets
// ============================================

export interface ImageWidgetData extends BaseWidgetData {
  image: string
  alt?: MultilingualValue
  image_style?: 'none' | 'rounded' | 'rounded-lg' | 'circle' | 'shadow-sm' | 'shadow-lg' | 'rounded-shadow' | 'border' | 'border-rounded'
}

export interface GalleryImage {
  url: string
  alt?: string
}

export interface GalleryWidgetData extends BaseWidgetData {
  images: (string | GalleryImage)[]
  type?: 'grid' | 'carousel'
  columns?: number
  gap?: number
  aspect?: 'square' | 'landscape' | 'portrait' | 'auto'
  // Carousel options
  carouselStyle?: 'default' | 'coverflow' | 'fade'
  autoplay?: boolean
  interval?: number
  showArrows?: boolean
  showDots?: boolean
  loop?: boolean
}

export interface VideoWidgetData extends BaseWidgetData {
  source: 'youtube' | 'vimeo' | 'url'
  url: string
  autoplay?: boolean
  loop?: boolean
  muted?: boolean
}

export interface AudioTrack {
  url: string
  title?: string
}

export interface AudioWidgetData extends BaseWidgetData {
  tracks: (string | AudioTrack)[]
  show_playlist?: boolean
  autoplay?: boolean
  loop?: boolean
}

export interface ImageCarouselWidgetData extends BaseWidgetData {
  images: (string | GalleryImage)[]
  autoplay?: boolean
  interval?: number
  show_dots?: boolean
  show_arrows?: boolean
}

// ============================================
// Layout Widgets
// ============================================

export interface HeroWidgetData extends BaseWidgetData {
  title: MultilingualValue
  subtitle?: MultilingualValue
  background?: string
  button_text?: MultilingualValue
  button_link?: string
  button_style?: string
  button_size?: string
}

export interface ToggleWidgetData extends BaseWidgetData {
  title: MultilingualValue
  content: MultilingualValue // HTML
  default_open?: boolean
}

// ============================================
// Interactive Widgets
// ============================================

export interface CountdownWidgetData extends BaseWidgetData {
  config?: {
    target_date?: string // ISO datetime
    show_days?: boolean
    show_hours?: boolean
    show_minutes?: boolean
    show_seconds?: boolean
    separator?: string
  }
  value?: {
    color?: string | null
    'color:hover'?: string | null
  }
  label?: {
    color?: string | null
    'color:hover'?: string | null
  }
  item?: {
    background?: string | null
    'background:hover'?: string | null
  }
}

export interface CounterWidgetData extends BaseWidgetData {
  number: number
  prefix?: MultilingualValue
  suffix?: MultilingualValue
  title?: MultilingualValue
  duration?: number // milliseconds
}

export interface ProgressBarWidgetData extends BaseWidgetData {
  title?: MultilingualValue
  percentage: number
  color?: string
  show_percentage?: boolean
}

export interface TestimonialWidgetData extends BaseWidgetData {
  quote: MultilingualValue
  author: MultilingualValue
  position?: MultilingualValue
  image?: string
  rating?: number
}

export interface AlertWidgetData extends BaseWidgetData {
  title?: MultilingualValue
  content: MultilingualValue
  type?: 'info' | 'success' | 'warning' | 'danger'
  dismissible?: boolean
}

export interface AccordionItem {
  title: MultilingualValue
  content: MultilingualValue
}

export interface AccordionWidgetData extends BaseWidgetData {
  items: AccordionItem[]
  icon_color?: string
  border_color?: string
  allow_multiple?: boolean
  first_open?: boolean
}

export interface TabsItem {
  title: MultilingualValue
  content: MultilingualValue
}

export interface TabsWidgetData extends BaseWidgetData {
  items: TabsItem[]
  active_color?: string
  border_color?: string
  style?: 'underline' | 'pills' | 'boxed'
  alignment?: 'left' | 'center' | 'right' | 'stretch'
}

export interface TableHeader {
  text: MultilingualValue
}

export interface TableWidgetData extends BaseWidgetData {
  headers: TableHeader[]
  rows: any[][]
  header_bg?: string
  header_text?: 'light' | 'dark'
  striped?: boolean
  bordered?: boolean
}

export interface EmbedWidgetData extends BaseWidgetData {
  code: string
  height?: number | string
}

export interface CtaBoxWidgetData extends BaseWidgetData {
  title: MultilingualValue
  subtitle?: MultilingualValue
  button_text?: MultilingualValue
  button_url?: string
  background_color?: string
  button_color?: string
  text_color?: 'light' | 'dark'
  alignment?: 'left' | 'center' | 'right'
}

export interface FeatureListItem {
  text: MultilingualValue
  included: boolean
}

export interface FeatureListWidgetData extends BaseWidgetData {
  items: FeatureListItem[]
  icon_included?: string
  icon_excluded?: string
  color_included?: string
  color_excluded?: string
  columns?: number | string
}

export interface TimelineItem {
  date: MultilingualValue
  title: MultilingualValue
  content: MultilingualValue
}

export interface TimelineWidgetData extends BaseWidgetData {
  items: TimelineItem[]
  layout?: 'left' | 'right' | 'alternate'
  line_color?: string
  dot_color?: string
}

export interface PdfViewerWidgetData extends BaseWidgetData {
  file?: string
  height?: number | string
  height_mode?: 'fixed' | 'container'
  page_mode?: 'single' | 'double'
  show_controls?: boolean
  show_thumbnails?: boolean
  show_outline?: boolean
  show_fullscreen?: boolean
  show_download?: boolean
  background_color?: string
}

// ============================================
// Navigation Widgets
// ============================================

export interface MenuWidgetData extends BaseWidgetData {
  menu_code: string
  layout?: 'horizontal' | 'vertical'
  hamburger_breakpoint?: 'never' | 'mobile' | 'tablet'
  dropdown_bg?: string
  dropdown_border_radius?: 'none' | 'sm' | 'md' | 'lg'
  dropdown_shadow?: 'none' | 'sm' | 'md' | 'lg'
}

export interface SocialIconItem {
  platform: string
  url: string
}

export interface SocialIconsWidgetData extends BaseWidgetData {
  items: SocialIconItem[]
  size?: 'sm' | 'md' | 'lg'
  style?: 'default' | 'colored' | 'outlined' | 'circle' | 'square'
  color_mode?: 'brand' | 'custom'
  colorMode?: 'brand' | 'custom'
  icon_color?: string
  iconColor?: string
}

// ============================================
// Collection Widgets
// ============================================

export interface CollectionGridWidgetData extends BaseWidgetData {
  collection_code: string
  layout?: 'grid' | 'list' | 'cards'
  columns?: number | string
  posts_count?: number
  order_by?: 'created_at' | 'title' | 'random'
  order_dir?: 'asc' | 'desc'
  exclude_current_entry?: boolean
  title_field?: string
  title_limit?: number
  excerpt_field?: string
  excerpt_limit?: number
  image_field?: string
  date_field?: string
  show_title?: boolean
  show_excerpt?: boolean
  show_image?: boolean
  show_date?: boolean
  show_read_more?: boolean
  read_more_text?: MultilingualValue
}

export interface CollectionCarouselWidgetData extends BaseWidgetData {
  collection_code: string
  posts_count?: number
  slides_per_view?: number | string
  autoplay?: boolean
  autoplay_interval?: number
  show_arrows?: boolean
  show_dots?: boolean
  exclude_current_entry?: boolean
  title_field?: string
  excerpt_field?: string
  image_field?: string
  show_title?: boolean
  show_excerpt?: boolean
}

export interface CollectionSingleWidgetData extends BaseWidgetData {
  collection_code: string
  entry_id: string
  layout?: 'standard' | 'card' | 'full'
  title_field?: string
  content_field?: string
  image_field?: string
  show_title?: boolean
  show_content?: boolean
  show_image?: boolean
}

// ============================================
// Widget Type Union
// ============================================

export type WidgetData =
  | ButtonWidgetData
  | IconWidgetData
  | DividerWidgetData
  | SpacerWidgetData
  | PillWidgetData
  | LinkWidgetData
  | StarRatingWidgetData
  | TextWidgetData
  | HeadingWidgetData
  | BlockquoteWidgetData
  | IconListWidgetData
  | ImageWidgetData
  | GalleryWidgetData
  | VideoWidgetData
  | AudioWidgetData
  | ImageCarouselWidgetData
  | HeroWidgetData
  | ToggleWidgetData
  | CountdownWidgetData
  | CounterWidgetData
  | ProgressBarWidgetData
  | TestimonialWidgetData
  | AlertWidgetData
  | AccordionWidgetData
  | TabsWidgetData
  | TableWidgetData
  | EmbedWidgetData
  | CtaBoxWidgetData
  | FeatureListWidgetData
  | TimelineWidgetData
  | PdfViewerWidgetData
  | MenuWidgetData
  | SocialIconsWidgetData
  | CollectionGridWidgetData
  | CollectionCarouselWidgetData
  | CollectionSingleWidgetData
  | BaseWidgetData
