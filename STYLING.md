# LessCMS Widget Styling Standard

This document defines the HTML/CSS structure standard for LessCMS widgets. Following this standard ensures that:

1. **Frontend apps render identically to the Content Builder preview**
2. **Custom styles work bidirectionally** - style once, works everywhere
3. **Themes can be applied consistently** across all LessCMS-powered sites

---

## AI Instructions

When implementing styles for LessCMS widgets, you MUST follow this exact structure. The HTML output from this library must match the Content Builder's preview rendering.

---

## 1. Page Structure Hierarchy

```
Page
└── Section (row)
    └── Column (cell within grid)
        └── Widget (content element)
```

### HTML Structure

```html
<div class="lcms-page" data-page-code="home">
  <section class="lcms-section lcms-section--grid-1-1" data-section-id="abc123" data-grid-type="1-1">
    <div class="lcms-section__grid">
      <div class="lcms-section__column" data-column-index="0">
        <div class="lcms-widget lcms-widget--heading" data-widget-type="heading" data-widget-id="w1">
          <!-- Widget content -->
        </div>
      </div>
      <div class="lcms-section__column" data-column-index="1">
        <div class="lcms-widget lcms-widget--text" data-widget-type="text" data-widget-id="w2">
          <!-- Widget content -->
        </div>
      </div>
    </div>
  </section>
</div>
```

---

## 2. Grid System

Sections use CSS Grid. The `grid_type` field defines column proportions.

### Grid Types

| grid_type | CSS grid-template-columns | Description |
|-----------|---------------------------|-------------|
| `1` | `1fr` | Single column (100%) |
| `1-1` | `1fr 1fr` | Two equal columns (50/50) |
| `1-1-1` | `1fr 1fr 1fr` | Three equal columns (33/33/33) |
| `1-1-1-1` | `1fr 1fr 1fr 1fr` | Four equal columns (25/25/25/25) |
| `2-1` | `2fr 1fr` | Two columns (66/33) |
| `1-2` | `1fr 2fr` | Two columns (33/66) |
| `1-2-1` | `1fr 2fr 1fr` | Three columns (25/50/25) |
| `1-1-2` | `1fr 1fr 2fr` | Three columns (25/25/50) |
| `2-1-1` | `2fr 1fr 1fr` | Three columns (50/25/25) |
| `3-1` | `3fr 1fr` | Two columns (75/25) |
| `1-3` | `1fr 3fr` | Two columns (25/75) |

### CSS Implementation

```css
.lcms-section__grid {
  display: grid;
  gap: var(--lcms-spacing-6); /* 1.5rem default */
}

/* Grid type modifiers - applied via inline style or class */
.lcms-section--grid-1 .lcms-section__grid { grid-template-columns: 1fr; }
.lcms-section--grid-1-1 .lcms-section__grid { grid-template-columns: 1fr 1fr; }
.lcms-section--grid-1-1-1 .lcms-section__grid { grid-template-columns: 1fr 1fr 1fr; }
.lcms-section--grid-2-1 .lcms-section__grid { grid-template-columns: 2fr 1fr; }
/* ... etc */
```

### Responsive Behavior

On mobile (< 768px), all grids collapse to single column:

```css
@media (max-width: 768px) {
  .lcms-section__grid {
    grid-template-columns: 1fr !important;
  }
}
```

---

## 3. BEM Naming Convention

All classes follow BEM (Block Element Modifier):

```
.lcms-{block}
.lcms-{block}__{element}
.lcms-{block}--{modifier}
.lcms-{block}__{element}--{modifier}
```

### Prefix

All classes MUST use the `lcms-` prefix to avoid conflicts.

### Examples

```css
/* Block */
.lcms-button { }

/* Element */
.lcms-button__link { }
.lcms-button__icon { }

/* Modifier */
.lcms-button--large { }
.lcms-button__link--primary { }
.lcms-button__link--secondary { }
```

---

## 4. Widget HTML Standards

Each widget type has a specific HTML structure that MUST be followed.

### 4.1 Button Widget

```html
<div class="lcms-button lcms-button--align-left">
  <a href="#" class="lcms-button__link lcms-button__link--primary lcms-button__link--size-md">
    <i class="lcms-button__icon fa-solid fa-arrow-right"></i>
    <span class="lcms-button__text">Click Me</span>
  </a>
</div>
```

**Modifiers:**
- Variants: `--primary`, `--secondary`, `--success`, `--danger`, `--warning`, `--info`
- Sizes: `--size-sm`, `--size-md`, `--size-lg`
- Alignment: `--align-left`, `--align-center`, `--align-right`

### 4.2 Heading Widget

```html
<div class="lcms-heading lcms-heading--align-left">
  <h2 class="lcms-heading__text">Heading Text</h2>
</div>
```

**Modifiers:**
- Alignment: `--align-left`, `--align-center`, `--align-right`

### 4.3 Text Widget

```html
<div class="lcms-text">
  <div class="lcms-text__content">
    <p>Rich text content...</p>
  </div>
</div>
```

### 4.4 Image Widget

```html
<figure class="lcms-image lcms-image--align-center">
  <a href="#" class="lcms-image__link">
    <img src="..." alt="..." class="lcms-image__img">
  </a>
  <figcaption class="lcms-image__caption">Caption text</figcaption>
</figure>
```

### 4.5 Divider Widget

```html
<div class="lcms-divider">
  <hr class="lcms-divider__line lcms-divider__line--solid">
</div>
```

**Modifiers:**
- Style: `--solid`, `--dashed`, `--dotted`

### 4.6 Spacer Widget

```html
<div class="lcms-spacer" style="height: 40px;"></div>
```

### 4.7 Icon Widget

```html
<div class="lcms-icon lcms-icon--align-center">
  <i class="lcms-icon__icon fa-solid fa-star" style="font-size: 2rem; color: #f1b44c;"></i>
</div>
```

### 4.8 Blockquote Widget

```html
<blockquote class="lcms-blockquote">
  <p class="lcms-blockquote__text">Quote text...</p>
  <cite class="lcms-blockquote__author">— Author Name</cite>
</blockquote>
```

### 4.9 Icon List Widget

```html
<ul class="lcms-icon-list">
  <li class="lcms-icon-list__item">
    <span class="lcms-icon-list__icon">
      <i class="fa-solid fa-check"></i>
    </span>
    <span class="lcms-icon-list__text">List item text</span>
  </li>
</ul>
```

### 4.10 Gallery Widget

```html
<div class="lcms-gallery">
  <div class="lcms-gallery__grid" style="grid-template-columns: repeat(3, 1fr);">
    <figure class="lcms-gallery__item">
      <img src="..." alt="..." class="lcms-gallery__image">
    </figure>
  </div>
</div>
```

### 4.11 Video Widget

```html
<!-- YouTube/Vimeo -->
<div class="lcms-video lcms-video--responsive">
  <iframe src="..." class="lcms-video__iframe"></iframe>
</div>

<!-- Native -->
<div class="lcms-video">
  <video src="..." class="lcms-video__native" controls></video>
</div>
```

### 4.12 Image Carousel Widget

```html
<div class="lcms-image-carousel">
  <div class="lcms-image-carousel__viewport">
    <div class="lcms-image-carousel__track">
      <div class="lcms-image-carousel__slide lcms-image-carousel__slide--active">
        <img src="..." alt="..." class="lcms-image-carousel__image">
      </div>
    </div>
  </div>
  <button class="lcms-image-carousel__arrow lcms-image-carousel__arrow--prev">
    <i class="fa-solid fa-chevron-left"></i>
  </button>
  <button class="lcms-image-carousel__arrow lcms-image-carousel__arrow--next">
    <i class="fa-solid fa-chevron-right"></i>
  </button>
  <div class="lcms-image-carousel__dots">
    <button class="lcms-image-carousel__dot lcms-image-carousel__dot--active"></button>
    <button class="lcms-image-carousel__dot"></button>
  </div>
</div>
```

### 4.13 Hero Widget

```html
<section class="lcms-hero" style="background-image: url(...);">
  <div class="lcms-hero__overlay" style="background-color: rgba(0,0,0,0.5);"></div>
  <div class="lcms-hero__content">
    <h1 class="lcms-hero__title">Hero Title</h1>
    <p class="lcms-hero__subtitle">Subtitle text</p>
    <a href="#" class="lcms-hero__button">CTA Button</a>
  </div>
</section>
```

### 4.14 Toggle Widget (Accordion)

```html
<div class="lcms-toggle lcms-toggle--open">
  <div class="lcms-toggle__header">
    <h3 class="lcms-toggle__title">Toggle Title</h3>
    <span class="lcms-toggle__icon">
      <i class="fa-solid fa-chevron-down"></i>
    </span>
  </div>
  <div class="lcms-toggle__content">
    <p>Content inside toggle...</p>
  </div>
</div>
```

### 4.15 Countdown Widget

```html
<div class="lcms-countdown">
  <div class="lcms-countdown__unit">
    <span class="lcms-countdown__value">30</span>
    <span class="lcms-countdown__label">Days</span>
  </div>
  <div class="lcms-countdown__unit">
    <span class="lcms-countdown__value">12</span>
    <span class="lcms-countdown__label">Hours</span>
  </div>
  <div class="lcms-countdown__unit">
    <span class="lcms-countdown__value">45</span>
    <span class="lcms-countdown__label">Minutes</span>
  </div>
  <div class="lcms-countdown__unit">
    <span class="lcms-countdown__value">30</span>
    <span class="lcms-countdown__label">Seconds</span>
  </div>
</div>
```

### 4.16 Counter Widget

```html
<div class="lcms-counter">
  <span class="lcms-counter__prefix">$</span>
  <span class="lcms-counter__value">1,250</span>
  <span class="lcms-counter__suffix">+</span>
  <p class="lcms-counter__title">Happy Customers</p>
</div>
```

### 4.17 Progress Bar Widget

```html
<div class="lcms-progress-bar">
  <div class="lcms-progress-bar__label">
    <span class="lcms-progress-bar__title">Progress</span>
    <span class="lcms-progress-bar__percentage">75%</span>
  </div>
  <div class="lcms-progress-bar__track">
    <div class="lcms-progress-bar__fill" style="width: 75%;"></div>
  </div>
</div>
```

### 4.18 Testimonial Widget

```html
<div class="lcms-testimonial">
  <blockquote class="lcms-testimonial__quote">
    "Quote text..."
  </blockquote>
  <div class="lcms-testimonial__author">
    <img src="..." alt="..." class="lcms-testimonial__avatar">
    <div class="lcms-testimonial__info">
      <span class="lcms-testimonial__name">John Smith</span>
      <span class="lcms-testimonial__position">CEO at Company</span>
    </div>
  </div>
  <div class="lcms-testimonial__rating">
    <i class="fa-solid fa-star"></i>
    <i class="fa-solid fa-star"></i>
    <i class="fa-solid fa-star"></i>
    <i class="fa-solid fa-star"></i>
    <i class="fa-solid fa-star"></i>
  </div>
</div>
```

### 4.19 Alert Widget

```html
<div class="lcms-alert lcms-alert--info">
  <span class="lcms-alert__icon">
    <i class="fa-solid fa-info-circle"></i>
  </span>
  <div class="lcms-alert__content">
    <h4 class="lcms-alert__title">Alert Title</h4>
    <p class="lcms-alert__message">Alert message...</p>
  </div>
  <button class="lcms-alert__close">
    <i class="fa-solid fa-times"></i>
  </button>
</div>
```

**Modifiers:**
- Type: `--info`, `--success`, `--warning`, `--danger`

### 4.20 Star Rating Widget

```html
<div class="lcms-star-rating">
  <span class="lcms-star-rating__star lcms-star-rating__star--filled">
    <i class="fa-solid fa-star"></i>
  </span>
  <span class="lcms-star-rating__star lcms-star-rating__star--filled">
    <i class="fa-solid fa-star"></i>
  </span>
  <span class="lcms-star-rating__star lcms-star-rating__star--half">
    <i class="fa-solid fa-star-half-stroke"></i>
  </span>
  <span class="lcms-star-rating__star">
    <i class="fa-regular fa-star"></i>
  </span>
  <span class="lcms-star-rating__star">
    <i class="fa-regular fa-star"></i>
  </span>
</div>
```

### 4.21 Menu Widget

```html
<nav class="lcms-menu lcms-menu--horizontal">
  <ul class="lcms-menu__list">
    <li class="lcms-menu__item lcms-menu__item--has-children">
      <a href="#" class="lcms-menu__link">Menu Item</a>
      <ul class="lcms-menu__submenu">
        <li class="lcms-menu__subitem">
          <a href="#" class="lcms-menu__sublink">Submenu Item</a>
        </li>
      </ul>
    </li>
  </ul>
</nav>
```

**Modifiers:**
- Layout: `--horizontal`, `--vertical`

### 4.22 Social Icons Widget

```html
<div class="lcms-social-icons lcms-social-icons--md lcms-social-icons--default">
  <a href="#" class="lcms-social-icons__link lcms-social-icons__link--facebook"
     style="--platform-color: #1877f2;" target="_blank" rel="noopener noreferrer">
    <i class="fa-brands fa-facebook-f"></i>
  </a>
  <a href="#" class="lcms-social-icons__link lcms-social-icons__link--twitter"
     style="--platform-color: #000000;" target="_blank" rel="noopener noreferrer">
    <i class="fa-brands fa-x-twitter"></i>
  </a>
</div>
```

**Modifiers:**
- Size: `--sm`, `--md`, `--lg`
- Style: `--default`, `--colored`, `--outlined`

### 4.23 Collection Widgets

```html
<!-- Collection Grid -->
<div class="lcms-collection-grid lcms-collection-grid--grid">
  <div class="lcms-collection-grid__items" style="grid-template-columns: repeat(3, 1fr);">
    <article class="lcms-collection-grid__item">
      <a href="#" class="lcms-collection-grid__image-link">
        <img src="..." alt="..." class="lcms-collection-grid__image">
      </a>
      <div class="lcms-collection-grid__content">
        <h3 class="lcms-collection-grid__title">
          <a href="#">Entry Title</a>
        </h3>
        <time class="lcms-collection-grid__date">January 1, 2025</time>
        <p class="lcms-collection-grid__excerpt">Excerpt text...</p>
        <a href="#" class="lcms-collection-grid__read-more">Read more</a>
      </div>
    </article>
  </div>
</div>
```

**Modifiers:**
- Layout: `--grid`, `--list`, `--cards`

---

## 5. CSS Variables

All styles should use CSS custom properties for theming:

```css
:root {
  /* Colors */
  --lcms-color-primary: #50a5f1;
  --lcms-color-secondary: #74788d;
  --lcms-color-success: #34c38f;
  --lcms-color-warning: #f1b44c;
  --lcms-color-danger: #f46a6a;
  --lcms-color-info: #50a5f1;

  /* Typography */
  --lcms-font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --lcms-font-size-base: 16px;

  /* Spacing */
  --lcms-spacing-1: 0.25rem;
  --lcms-spacing-2: 0.5rem;
  --lcms-spacing-3: 0.75rem;
  --lcms-spacing-4: 1rem;
  --lcms-spacing-6: 1.5rem;
  --lcms-spacing-8: 2rem;

  /* Border Radius */
  --lcms-radius-sm: 0.125rem;
  --lcms-radius-md: 0.25rem;
  --lcms-radius-lg: 0.5rem;
  --lcms-radius-full: 9999px;

  /* Shadows */
  --lcms-shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --lcms-shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --lcms-shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);

  /* Transitions */
  --lcms-transition-fast: 150ms ease-in-out;
  --lcms-transition-normal: 250ms ease-in-out;
}
```

---

## 6. Data Attributes

Every rendered element includes data attributes for debugging and JavaScript hooks:

| Attribute | Location | Purpose |
|-----------|----------|---------|
| `data-page-code` | `.lcms-page` | Page identifier |
| `data-section-id` | `.lcms-section` | Section UUID |
| `data-grid-type` | `.lcms-section` | Grid configuration |
| `data-column-index` | `.lcms-section__column` | Column position (0-based) |
| `data-widget-type` | `.lcms-widget` | Widget type name |
| `data-widget-id` | `.lcms-widget` | Widget UUID |

---

## 7. Icon System

All icons use **FontAwesome 6**:

- Solid: `fa-solid fa-{name}`
- Regular: `fa-regular fa-{name}`
- Brands: `fa-brands fa-{name}`

Include FontAwesome in your project:

```html
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
```

---

## 8. Checklist for AI Implementation

When styling LessCMS widgets, verify:

- [ ] All classes use `lcms-` prefix
- [ ] BEM naming convention followed exactly
- [ ] Grid system matches `grid_type` values
- [ ] Data attributes present on all elements
- [ ] CSS variables used for theming values
- [ ] Responsive breakpoint at 768px collapses grid
- [ ] FontAwesome 6 classes used for icons
- [ ] Modifiers applied correctly (`--primary`, `--size-lg`, etc.)
- [ ] HTML structure matches templates above exactly

---

## 9. Synchronization with Content Builder

The Content Builder in the LessCMS admin panel (`/fe/src/components/content-builder/`) renders widgets using the same structure. When implementing custom themes:

1. **Test in Content Builder** - Build a page with all widget types
2. **Export HTML** - View the rendered output
3. **Compare structures** - Ensure your styles match the class names
4. **Apply CSS** - Your styles will work in both preview and frontend

This bidirectional compatibility means:
- Styles written for frontend apps work in Content Builder preview
- Styles written for Content Builder preview work in frontend apps
