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

export interface ProjectConfig {
  fonts: string[]
  custom_css_url: string | null
  available_widgets: string[]
  available_fonts: string[]
  google_fonts_url: string | null
  styles?: ProjectStyles
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
  colorStart?: string
  colorEnd?: string
  angle?: number
}

export interface BaseSettings {
  // Background
  backgroundColor?: string
  backgroundOpacity?: number
  backgroundImage?: string
  backgroundSize?: string
  backgroundPosition?: string
  backgroundImageOpacity?: number
  backgroundImageSource?: string
  backgroundImageField?: string

  // Gradient (new API format)
  gradient?: GradientSettings

  // Gradient (legacy format)
  useGradient?: boolean
  gradientType?: 'linear' | 'radial'
  gradientAngle?: number
  gradientColorStart?: string
  gradientColorEnd?: string

  // Height mode
  heightMode?: 'auto' | 'fixed' | 'full'

  // Spacing (in pixels)
  paddingTop?: number
  paddingRight?: number
  paddingBottom?: number
  paddingLeft?: number
  marginTop?: number
  marginRight?: number
  marginBottom?: number
  marginLeft?: number

  // Border
  borderRadius?: number
  borderWidth?: number
  borderColor?: string
  borderStyle?: string
  boxShadow?: string

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
  cssClass?: string
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
  fullHeight?: boolean
  sectionHeight?: number | null
  contentWidth?: string
  customWidth?: number
  columnGap?: number
  minHeight?: number

  // Stacking
  stackOnTablet?: boolean
  stackOnMobile?: boolean
}

export interface ColumnSettings extends BaseSettings {
  // Size
  columnHeight?: number | null
  minHeight?: number | null

  // Alignment
  verticalAlign?: 'flex-start' | 'center' | 'flex-end'
  horizontalAlign?: 'flex-start' | 'center' | 'flex-end' | 'stretch'
}

export interface WidgetSettings extends BaseSettings {
  // Size
  height?: number
  minHeight?: number
  autoHeight?: boolean
  fullHeight?: boolean

  // Alignment
  verticalAlign?: string
  horizontalAlign?: string
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

export interface SeoData {
  title?: string
  description?: string
  og_title?: string
  og_description?: string
  og_image?: string
}

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

export interface RouteCollectionItem {
  code: string
  entry_url_pattern: string | null
  entry_url_field: string | null
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
  data?: Record<string, any>
  config?: Record<string, any>
  settings?: WidgetSettings
}
