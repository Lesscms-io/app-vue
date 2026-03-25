/**
 * LessCMS API Response Types
 */

// Multilingual value - can be a direct value or object with language keys
export type MultilingualValue<T = string> = T | Record<string, T>

// ============================================
// Configuration
// ============================================

export interface LessCMSConfig {
  baseUrl: string
  apiKey: string
  workspaceCode: string
  projectCode: string
  language?: string
}

export interface ColorVariable {
  code: string
  label: string
  value: string
}

export interface ProjectConfig {
  fonts: string[]
  custom_css_url: string | null
  custom_css_urls: string[]
  custom_css: string | null
  available_widgets: string[]
  available_fonts: string[]
  google_fonts_url: string | null
  styles?: ProjectStyles
  page_route_schema: string
  collection_route_schema: string
  homepage_uuid: string | null
  color_variables: ColorVariable[]
  languages: string[]
  default_language: string
}

export interface ProjectStyles {
  primary_color?: string
  secondary_color?: string
  text_color?: string
  background_color?: string
  link_color?: string
  font_heading?: string
  font_body?: string
  font_size_base?: number
  line_height?: number
  border_radius?: number
  container_max_width?: number
}

export interface ProjectConfigResponse {
  data: ProjectConfig
}

// ============================================
// Common Settings (shared by section, column, widget)
// ============================================

export interface GradientSettings {
  type?: 'linear' | 'radial'
  color_start?: string
  color_end?: string
  angle?: number
}

export interface BaseSettings {
  // Background
  background_color?: string
  background_opacity?: number
  background_image?: string
  background_size?: string
  background_position?: string
  background_image_opacity?: number
  background_image_source?: string
  background_image_field?: string

  // Gradient (new API format)
  gradient?: GradientSettings

  // Gradient (legacy format)
  use_gradient?: boolean
  gradient_type?: 'linear' | 'radial'
  gradient_angle?: number
  gradient_color_start?: string
  gradient_color_end?: string

  // Height mode
  height_mode?: 'auto' | 'fixed' | 'full'

  // Spacing (in pixels)
  padding_top?: number
  padding_right?: number
  padding_bottom?: number
  padding_left?: number
  margin_top?: number
  margin_right?: number
  margin_bottom?: number
  margin_left?: number

  // Border
  border_radius?: number
  border_width?: number
  border_color?: string
  border_style?: string
  box_shadow?: string

  // Visibility
  hidden?: boolean

  // Responsive
  responsive?: {
    tablet?: Partial<BaseSettings>
    mobile?: Partial<BaseSettings>
  }

  // Link
  link?: LinkSettings

  // Custom CSS class
  css_class?: string
}

export interface LinkSettings {
  enabled?: boolean
  type?: 'custom' | 'page' | 'collection' | 'route'
  url?: string
  page_id?: string | null
  collection_code?: string | null
  entry_id?: string | null
  route_uuid?: string | null
  target_blank?: boolean
}

// ============================================
// Page API
// ============================================

export interface PageResponse {
  data: {
    content: PageSection[]
    metadata: PageMetadata
    seo?: SeoData
  }
}

export interface PageSection {
  id: string
  order: number
  columns_count: number
  columns: PageColumn[]
  is_custom?: boolean
  settings?: SectionSettings
}

export interface PageColumn {
  id: string
  order: number
  width: number
  content: WidgetContent[]
  settings?: ColumnSettings
}

export interface WidgetContent {
  field_code: string
  type?: string
  value: any
  value_translation?: Record<string, any>
  settings?: WidgetSettings
}

export interface SectionSettings extends BaseSettings {
  // Size & Layout
  full_height?: boolean
  sectionHeight?: number | null
  content_width?: string
  customWidth?: number
  column_gap?: number
  min_height?: number

  // Stacking
  stack_on_tablet?: boolean
  stack_on_mobile?: boolean

  // Sticky
  sticky?: boolean
  overlay?: boolean
  sticky_top?: number
  sticky_z_index?: number
  scrolled_bg?: string
  scrolled_shadow?: 'none' | 'sm' | 'md' | 'lg'
}

export interface ColumnSettings extends BaseSettings {
  // Size
  columnHeight?: number | null
  column_height?: number | null
  min_height?: number | null

  // Alignment
  vertical_align?: 'flex-start' | 'center' | 'flex-end'
  horizontal_align?: 'flex-start' | 'center' | 'flex-end' | 'stretch'

  // Sticky
  sticky?: boolean
  sticky_top?: number
  sticky_z_index?: number

  // Hover
  hover?: Record<string, any>
}

export interface WidgetSettings extends BaseSettings {
  // Size
  height?: number
  min_height?: number
  auto_height?: boolean
  full_height?: boolean

  // Alignment
  vertical_align?: string
  horizontal_align?: string
}

export interface PageMetadata {
  code: string
  page_uuid: string
  schema_name?: string
  schema_code?: string
  schema_name_translation?: Record<string, string>
  is_public: boolean
  entry_id?: string
  in_sitemap?: boolean
  custom_route?: string
  url: string
  created_at: string
  updated_at: string
}

export interface SeoRobotsData {
  index?: boolean
  follow?: boolean
  max_snippet?: number
  max_image_preview?: 'none' | 'standard' | 'large'
  max_video_preview?: number
}

export interface SeoOgImageData {
  url?: string
  alt?: string
  width?: number
  height?: number
}

export interface SeoOgData {
  title?: string
  description?: string
  type?: 'website' | 'article' | 'product' | 'event'
  url?: string
  image?: SeoOgImageData
  site_name?: string
  locale?: string
}

export interface SeoTwitterData {
  card?: 'summary' | 'summary_large_image'
  title?: string
  description?: string
  image?: string
}

export interface SeoCustomMeta {
  property: string
  content: string
}

export interface SeoLanguageData {
  title?: string
  meta_description?: string
  canonical_url?: string
  robots?: SeoRobotsData
  og?: SeoOgData
  twitter?: SeoTwitterData
  custom_meta?: SeoCustomMeta[]
}

// SEO data is keyed by language code
export type SeoData = Record<string, SeoLanguageData>

// ============================================
// Collection API
// ============================================

export interface CollectionResponse {
  data: CollectionEntry[]
  meta: CollectionMeta
}

export interface CollectionEntry {
  content: Record<string, any>
  metadata: EntryMetadata
  seo?: SeoData
}

export interface EntryMetadata {
  code: string
  collection_uuid: string
  entry_id?: string
  is_public: boolean
  custom_route?: string
  url: string
  created_at: string
  updated_at: string
}

export interface CollectionMeta {
  total: number
  page: number
  pageSize: number
  totalPages: number
  format?: string
}

export interface CollectionParams {
  page?: number
  pageSize?: number
  exclude_entry_id?: string
  // Note: order_by and order_dir are NOT supported by the API yet
  // They would be treated as field filters
  [key: string]: any // Field filters
}

// ============================================
// Collection Template API
// ============================================

export interface CollectionTemplateResponse {
  data: CollectionTemplate
}

export interface CollectionTemplate {
  uuid: string
  name: string
  type: string
  sections: TemplateSection[]
}

export interface TemplateSection {
  uuid: string
  settings?: SectionSettings
  columnsCount: number
  columns: TemplateColumn[]
}

export interface TemplateColumn {
  uuid: string | null
  settings?: ColumnSettings
  content: TemplateWidget[]
  span: number
}

export interface TemplateWidget {
  widget_type: string
  uuid: string
  config: CollectionFieldConfig
  settings?: WidgetSettings
}

export interface CollectionFieldConfig {
  collection_code?: string | null
  field_code: string
  field_type: string
  display_as?: string
  entry_source?: 'static' | 'url' | 'context'
  entry_id?: string | null
  entry_url_segment?: number
  label?: Record<string, string>
  label_position?: 'hidden' | 'above' | 'inline'
  label_color?: string | null
  label_background?: string | null
  label_padding?: number
  label_font_size?: string | null
  label_font_weight?: string | null
  value_color?: string | null
  value_background?: string | null
  value_padding?: number
  date_format?: string
  show_time?: boolean
  custom_date_format?: string | null
  link_text?: Record<string, string>
  button_style?: string
  button_size?: string
  show_icon?: boolean
  icon?: string | null
  icon_position?: 'left' | 'right'
  icon_size?: string
  icon_color?: string
  icon_background?: string
  icon_padding?: string
  icon_border_radius?: string
  icon_gap?: string
}

// ============================================
// Menu API
// ============================================

export interface MenuResponse {
  data: {
    content: MenuItem[]
    metadata: MenuMetadata
  }
}

export interface MenuItem {
  id: string
  label: MultilingualValue
  fields?: Record<string, any>
  custom?: Record<string, any>
  children?: MenuItem[]
  metadata?: MenuItemMetadata
}

export interface MenuItemMetadata {
  url?: string
  link_type?: 'page' | 'entry' | 'collection' | 'external'
  link_target?: string
  is_public?: boolean
  target?: '_blank' | '_self'
}

export interface MenuMetadata {
  code: string
  menu_uuid: string
  created_at: string
  updated_at: string
}

// ============================================
// Block API
// ============================================

export interface BlockResponse {
  data: {
    content: Record<string, any>
    metadata: BlockMetadata
  }
}

export interface BlockMetadata {
  code: string
  block_uuid: string
  is_public: boolean
  created_at: string
  updated_at: string
}

// ============================================
// Element API
// ============================================

export interface ElementResponse {
  data: {
    content: PageSection[]
    content_flat?: Record<string, any>
    metadata: ElementMetadata
  }
}

export interface ElementMetadata {
  code: string
  element_uuid: string
  is_public: boolean
  url: string
  created_at: string
  updated_at: string
}

// ============================================
// Pages List API
// ============================================

export interface PagesListResponse {
  data: PageListItem[]
}

export interface PageListItem {
  code: string
  page_uuid: string
  schema_name?: string
  url: string
  is_public: boolean
  created_at: string
  updated_at: string
}

// ============================================
// Routes API
// ============================================

export interface RoutesResponse {
  data: {
    homepage: {
      code: string
      url: string
      page_uuid: string
    } | null
    pages: RoutePageItem[]
    collections: RouteCollectionItem[]
  }
}

export interface RoutePageItem {
  code: string
  url: string
  pattern: string | null
  page_uuid: string
}

export interface RouteCollectionRoute {
  url_pattern: string
  url_pattern_translation?: Record<string, string>
  filter_rules?: any
  page_code: string
  name?: string
  sort_order?: number
}

export interface RouteCollectionItem {
  code: string
  name?: string
  name_translation?: Record<string, string>
  routes: RouteCollectionRoute[]
  entry_url_pattern?: string | null
  entry_url_field?: string | null
}

// ============================================
// Redirects API
// ============================================

export interface Redirect {
  source_path: string
  target_path: string
  status_code: number
  is_active: boolean
}

export interface RedirectsResponse {
  data: Redirect[]
}

// ============================================
// Renderer Types (for WidgetRenderer, SectionRenderer)
// ============================================

export interface Section {
  id?: string
  uuid?: string
  order: number
  grid_type: string
  columns: Column[]
  settings?: SectionSettings
}

export interface Column {
  id?: string
  order: number
  width?: number
  widgets: Widget[]
  content?: WidgetContent[]
  settings?: ColumnSettings
}

export interface Widget {
  id?: string
  uuid?: string
  type?: string
  widget_type?: string
  widget?: Record<string, any>
  data?: Record<string, any>
  config?: Record<string, any>
  settings?: WidgetSettings
}
