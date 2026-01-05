# @lesscms/vue-widgets

Vue 3 widget renderer library for LessCMS. Render content builder widgets from your LessCMS project with full TypeScript support.

## Installation

```bash
npm install @lesscms/vue-widgets
# or
yarn add @lesscms/vue-widgets
```

## Quick Start

### Direct Mode (API key in browser)

```vue
<script setup>
import { LessCMSProvider, PageRenderer } from '@lesscms/vue-widgets'
import '@lesscms/vue-widgets/styles/variables.css'
import '@lesscms/vue-widgets/styles/widgets.css'
</script>

<template>
  <LessCMSProvider
    base-url="https://api.lesscms.io"
    api-key="your-api-key"
    workspace-code="your-workspace"
    project-code="your-project"
    default-language="en"
  >
    <PageRenderer code="home" />
  </LessCMSProvider>
</template>
```

### Proxy Mode (API key hidden server-side) - Recommended for production

```vue
<script setup>
import { LessCMSProvider, PageRenderer } from '@lesscms/vue-widgets'
import '@lesscms/vue-widgets/styles/variables.css'
import '@lesscms/vue-widgets/styles/widgets.css'
</script>

<template>
  <LessCMSProvider
    base-url="http://localhost:3001"
    proxy-mode
    default-language="en"
  >
    <PageRenderer code="home" />
  </LessCMSProvider>
</template>
```

## Features

- **25 Widgets**: All content builder widgets supported
- **TypeScript**: Full type definitions included
- **Vue 3**: Composition API with `<script setup>`
- **Multilingual**: Automatic language extraction with fallbacks
- **BEM CSS**: Easily customizable styles
- **CSS Variables**: Theme with custom properties
- **Vue Router**: Optional routing integration

## Widgets

### Basic
- `LcmsButton` - Buttons with variants and icons
- `LcmsDivider` - Horizontal rules
- `LcmsSpacer` - Vertical spacing
- `LcmsIconBox` - Icon with content box

### Text
- `LcmsText` - Rich text content
- `LcmsHeading` - H1-H6 headings

### Media
- `LcmsImage` - Responsive images
- `LcmsGallery` - Image grids
- `LcmsVideo` - YouTube/Vimeo/native video

### Layout
- `LcmsGrid` - Multi-column grid layout

### Interactive
- `LcmsHero` - Hero sections with background
- `LcmsCountdown` - Countdown timers
- `LcmsCounter` - Animated counters
- `LcmsProgressBar` - Progress indicators
- `LcmsTestimonial` - Testimonial cards
- `LcmsAlert` - Alert messages

### Navigation
- `LcmsMenu` - Navigation menus (fetches from API)

### Integrations
- `LcmsGoogleMaps` - Google Maps embed
- `LcmsSocialIcons` - Social media links

### Collections
- `LcmsCollectionGrid` - Grid/list of entries
- `LcmsCollectionCarousel` - Entry carousel
- `LcmsCollectionSingle` - Single entry display
- `LcmsCollectionGrouped` - Grouped entries (accordion/tabs)
- `LcmsValueList` - Unique values from collection field
- `LcmsCollectionField` - Single field from entry (data-field)

## Components

### LessCMSProvider

Wraps your app and provides API configuration:

```vue
<LessCMSProvider
  base-url="https://api.lesscms.io"
  api-key="your-api-key"
  workspace-code="your-workspace"
  project-code="your-project"
  default-language="pl"
>
  <!-- Your app -->
</LessCMSProvider>
```

### PageRenderer

Fetches and renders a complete page:

```vue
<PageRenderer
  code="home"
  language="en"
  @loaded="onPageLoaded"
  @error="onPageError"
/>
```

### SectionRenderer

Renders a single section with columns:

```vue
<SectionRenderer :section="sectionData" language="en" />
```

### WidgetRenderer

Dynamically renders any widget:

```vue
<WidgetRenderer :widget="widgetData" language="en" />
```

## Composables

### useLanguage

Extract multilingual values:

```ts
const { extractValue, language } = useLanguage('en')

// { en: "Hello", pl: "Cześć" } → "Hello"
const text = extractValue(multilingualValue)
```

### usePage

Fetch page data:

```ts
const { page, sections, loading, error } = usePage(computed(() => 'home'))
```

### useCollection

Fetch collection entries:

```ts
const { entries, loading, error, totalPages, refetch } = useCollection(
  computed(() => 'blog'),
  { pageSize: 10 }
)
```

### useMenu

Fetch navigation menu:

```ts
const { items, loading, error } = useMenu(computed(() => 'main-menu'))
```

## Routing

### Using the built-in router

```ts
import { createLessCMSRouter } from '@lesscms/vue-widgets'

const router = createLessCMSRouter({
  base: '/',
  homePageCode: 'home',
})

app.use(router)
```

### Custom routes

```ts
import { getLessCMSRoutes, PageRenderer } from '@lesscms/vue-widgets'

const routes = [
  ...getLessCMSRoutes({ homePageCode: 'landing' }),
  // Your custom routes
]
```

## Styling

### CSS Variables

Override in your CSS:

```css
:root {
  --lcms-color-primary: #3498db;
  --lcms-font-family: 'Inter', sans-serif;
  --lcms-spacing-md: 20px;
}
```

### BEM Classes

All widgets use BEM naming:

```css
.lcms-button { }
.lcms-button__link { }
.lcms-button__link--primary { }
.lcms-button__link--size-lg { }
```

## Proxy Server

The library includes a proxy server to hide API keys from the browser.

### Setup

```bash
# Navigate to proxy folder
cd proxy

# Install dependencies
npm install

# Copy and configure environment
cp .env.example .env
# Edit .env with your API credentials

# Run proxy server
npm start
```

### Proxy Environment Variables

```env
PROXY_PORT=3001
LESSCMS_API_URL=https://api.lesscms.io
LESSCMS_API_KEY=your-api-key
LESSCMS_WORKSPACE=your-workspace
LESSCMS_PROJECT=your-project
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

### How it works

1. Vue app makes requests to `http://localhost:3001/api/*`
2. Proxy server adds `x-api-key` header and forwards to LessCMS API
3. API key never leaves the server, not visible in browser DevTools

## Development

```bash
# Install dependencies
npm install

# Run demo app
npm run demo

# Run proxy server (in separate terminal)
cd proxy && npm start

# Build library
npm run build

# Type check
npm run type-check
```

## Demo

The demo app showcases all widgets with sample data:

```bash
npm run demo
```

Then open http://localhost:3000

## Styling Standard

See [STYLING.md](./STYLING.md) for the complete HTML/CSS structure standard.

This document is essential for:
- **Theme developers** creating custom styles
- **AI assistants** implementing widget styles
- **Ensuring compatibility** between Content Builder preview and frontend apps

## For AI Agents

**If you are an AI agent** (Claude, ChatGPT, Cursor, Copilot, etc.) helping a user with LessCMS Vue frontend, please read [AI.md](./AI.md) first.

This repository is a **complete, ready-to-use rendering engine** - you do NOT need to generate a new frontend engine from scratch. The AI.md file explains what resources are available and how to customize the engine.

## License

MIT
