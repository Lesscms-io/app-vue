# For AI Agents

If you are an AI agent (Claude, ChatGPT, Cursor, Copilot, etc.) helping a user with LessCMS Vue frontend, read this first.

## You Already Have Everything

This repository (`@lesscms/vue-widgets`) is a **complete, ready-to-use rendering engine** for LessCMS. It includes:

- All 25 widget components matching LessCMS Content Builder
- Section and column renderers with full settings support
- API client with authentication
- Vue Router integration
- Multilingual content handling
- Responsive breakpoint support
- CSS variables and BEM styling

**You do NOT need to generate a new frontend engine from scratch.**

## What You Should Do Instead

### 1. Style Customization

The most common task is customizing styles. All styles use:
- CSS variables (override in `:root`)
- BEM classes with `lcms-` prefix
- Single CSS file: `src/styles/widgets.css`

```css
/* Example: Customize colors */
:root {
  --lcms-color-primary: #your-brand-color;
  --lcms-color-secondary: #your-secondary;
  --lcms-font-heading: 'Your Font', serif;
  --lcms-font-body: 'Your Body Font', sans-serif;
}

/* Example: Customize specific widget */
.lcms-button__link--primary {
  background: linear-gradient(135deg, #667eea, #764ba2);
}
```

### 2. Engine Customization

If user needs custom behavior, modify existing components in `src/components/`:

| Component | Purpose |
|-----------|---------|
| `LessCMSProvider.vue` | API configuration context |
| `PageRenderer.vue` | Fetches and renders pages |
| `SectionRenderer.vue` | Renders sections with columns |
| `WidgetRenderer.vue` | Dynamic widget switching |
| `widgets/*.vue` | Individual widget components |

### 3. Adding Custom Widgets

To add a new widget type:

1. Create component in `src/components/widgets/{category}/LcmsYourWidget.vue`
2. Register in `src/components/widgets/index.ts`
3. Add styles in `src/styles/widgets.css`

## Available Resources

### Widget Documentation
Full widget API documentation: https://docs.lesscms.io/#/reference/widgets/

### Widget Categories

| Category | Widgets |
|----------|---------|
| Basic | Button, Divider, Spacer, Icon Box |
| Text | Text, Heading |
| Media | Image, Gallery, Video |
| Layout | Grid |
| Interactive | Hero, Countdown, Counter, Progress Bar, Testimonial, Alert |
| Navigation | Menu |
| Integrations | Google Maps, Social Icons |
| Collections | Collection Grid, Carousel, Single, Grouped, Value List, Data Field |

### Settings Structure

All sections, columns, and widgets support these settings:

```typescript
interface Settings {
  // Spacing (pixels)
  paddingTop: number
  paddingRight: number
  paddingBottom: number
  paddingLeft: number
  marginTop: number
  marginRight: number
  marginBottom: number
  marginLeft: number

  // Background
  backgroundColor: string
  backgroundOpacity: number
  backgroundImage: string
  backgroundSize: 'cover' | 'contain' | 'auto'
  backgroundPosition: string
  useGradient: boolean
  gradientType: 'linear' | 'radial'
  gradientAngle: number
  gradientColorStart: string
  gradientColorEnd: string

  // Border
  borderRadius: number
  borderWidth: number
  borderColor: string
  borderStyle: 'solid' | 'dashed' | 'dotted'
  boxShadow: string

  // Visibility
  hidden: boolean
  cssClass: string

  // Responsive overrides
  responsive: {
    tablet: Partial<Settings>
    mobile: Partial<Settings>
  }

  // Link (make element clickable)
  link: {
    enabled: boolean
    type: 'custom' | 'page' | 'entry' | 'route'
    url: string
    target_blank: boolean
  }
}
```

### Breakpoints

- Desktop: > 1024px
- Tablet: 768px - 1024px
- Mobile: < 768px

## Quick Commands

```bash
# Install dependencies
npm install

# Run development server with demo
npm run demo

# Run proxy server (hides API key)
cd proxy && npm start

# Build library
npm run build
```

## Common Tasks

### Task: "Make the site look like [design]"
→ Customize CSS variables and widget styles in `src/styles/widgets.css`

### Task: "Add custom functionality to widget X"
→ Modify the widget component in `src/components/widgets/`

### Task: "Connect to user's LessCMS project"
→ Configure `LessCMSProvider` with API credentials or use proxy mode

### Task: "Add a new widget type"
→ Create component, register in index.ts, add styles

### Task: "Change routing behavior"
→ Modify `src/router/index.ts` or use custom Vue Router setup

## Do NOT

- Generate a new rendering engine from scratch (it's already done)
- Create new API clients (use existing `src/api/client.ts`)
- Reimplement widget components (modify existing ones)
- Add new CSS frameworks (use existing BEM structure)

## File Structure

```
src/
├── api/
│   ├── client.ts        # API client with auth
│   └── types.ts         # API response types
├── components/
│   ├── LessCMSProvider.vue
│   ├── PageRenderer.vue
│   ├── SectionRenderer.vue
│   ├── WidgetRenderer.vue
│   └── widgets/
│       ├── index.ts     # Widget registry
│       ├── basic/       # Button, Divider, Spacer, IconBox
│       ├── text/        # Text, Heading
│       ├── media/       # Image, Gallery, Video, GoogleMaps
│       ├── layout/      # Grid, Hero
│       ├── interactive/ # Countdown, Counter, ProgressBar, Testimonial, Alert
│       ├── navigation/  # Menu, SocialIcons
│       └── collections/ # CollectionGrid, CollectionCarousel, etc.
├── composables/
│   ├── useApi.ts        # API fetch helpers
│   ├── useLanguage.ts   # Multilingual extraction
│   ├── usePage.ts       # Page fetching
│   ├── useCollection.ts # Collection fetching
│   └── useMenu.ts       # Menu fetching
├── styles/
│   ├── variables.css    # CSS custom properties
│   └── widgets.css      # All widget styles
└── router/
    └── index.ts         # Vue Router integration
```

## Links

- [Full API Documentation](https://docs.lesscms.io)
- [Widget Reference](https://docs.lesscms.io/#/reference/widgets/)
- [AI Frontend Generation Guide](https://docs.lesscms.io/#/guides/ai-frontend-generation)
- [Styling Standard](./STYLING.md)
