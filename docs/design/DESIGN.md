---
name: Technical Precision System
colors:
  surface: '#f8f9fb'
  surface-dim: '#d9dadc'
  surface-bright: '#f8f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f6'
  surface-container: '#edeef0'
  surface-container-high: '#e7e8ea'
  surface-container-highest: '#e1e2e4'
  on-surface: '#191c1e'
  on-surface-variant: '#434654'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f3'
  outline: '#737685'
  outline-variant: '#c3c6d6'
  surface-tint: '#0c56d0'
  primary: '#003d9b'
  on-primary: '#ffffff'
  primary-container: '#0052cc'
  on-primary-container: '#c4d2ff'
  inverse-primary: '#b2c5ff'
  secondary: '#4c616c'
  on-secondary: '#ffffff'
  secondary-container: '#cfe6f2'
  on-secondary-container: '#526772'
  tertiary: '#7b2600'
  on-tertiary: '#ffffff'
  tertiary-container: '#a33500'
  on-tertiary-container: '#ffc6b2'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2ff'
  primary-fixed-dim: '#b2c5ff'
  on-primary-fixed: '#001848'
  on-primary-fixed-variant: '#0040a2'
  secondary-fixed: '#cfe6f2'
  secondary-fixed-dim: '#b4cad6'
  on-secondary-fixed: '#071e27'
  on-secondary-fixed-variant: '#354a53'
  tertiary-fixed: '#ffdbcf'
  tertiary-fixed-dim: '#ffb59b'
  on-tertiary-fixed: '#380d00'
  on-tertiary-fixed-variant: '#812800'
  background: '#f8f9fb'
  on-background: '#191c1e'
  surface-variant: '#e1e2e4'
typography:
  h1:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  h2:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  h3:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
  mono-data:
    fontFamily: monospace
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  gutter: 12px
  margin: 16px
---

## Brand & Style

This design system is engineered for high-performance environments where information density and clarity are paramount. The brand personality is rooted in **Corporate Modernism** with a heavy emphasis on **Minimalism** to ensure that the UI never competes with complex engineering data. 

The aesthetic evokes a sense of "instrumentation"—it is cold, precise, and highly structured. It targets professional engineers and data analysts who require a tool that feels like a reliable piece of laboratory equipment. The emotional response is one of confidence and control, achieved through rigorous alignment, subtle tonal shifts, and the removal of all decorative non-essentials.

## Colors

The palette is anchored by "Technical Blue" to represent stability and intelligence. A range of cool-toned grays provides the structural framework for the high-density layout.

- **Primary:** A deep, high-contrast blue used for primary actions and active states.
- **Secondary:** A slate gray used for auxiliary information and iconography.
- **Functional Accents:** Highly saturated Green, Yellow, and Red are reserved strictly for status indicators (Success, Warning, Error) to ensure they stand out immediately against the neutral backdrop.
- **Backgrounds:** A tiered system of very light grays (Slate 50 through 200) creates subtle containment without the visual weight of heavy borders.

## Typography

This design system utilizes **Inter** for its exceptional legibility at small sizes and its neutral, systematic character. 

The type hierarchy is compressed to support high-density layouts. We introduce a `mono-data` style specifically for coordinates, measurements, and technical values to ensure vertical alignment in tables. `label-caps` is used for non-interactive headers within sidebars and utility panels to provide clear sectioning without requiring large font sizes.

## Layout & Spacing

This design system employs a **4px baseline grid** to achieve maximum density while maintaining mathematical harmony. 

The layout follows a **Fluid Grid** model with strict column constraints for sidebars and property panels. 
- **Navigation/Sidebars:** Fixed width (e.g., 240px or 64px collapsed).
- **Work Area:** Fluid, maximizing the viewport for 3D models or data visualizations.
- **Property Panels:** Fixed width (300px) anchored to the right.

Internal component spacing (padding) should favor horizontal breathing room over vertical height to allow for more rows of data to be visible on a single screen.

## Elevation & Depth

To maintain a "system" aesthetic, elevation is communicated through **Tonal Layers** and **Low-Contrast Outlines** rather than heavy shadows. 

The interface is predominantly flat. Depth is created by "stepping" the background colors:
- **Level 0 (Base):** Lightest gray (#F4F5F7) for the main application background.
- **Level 1 (Panels):** Pure white (#FFFFFF) for cards, sidebars, and workspaces.
- **Level 2 (Popovers/Modals):** Pure white with a very fine, 1px neutral border (#DADCE0) and a minimal, high-diffusion shadow (8px blur, 4% opacity) to provide just enough separation from the underlying content.

## Shapes

The shape language is "Soft" (0.25rem / 4px). This subtle rounding takes the edge off the technical rigidity while maintaining a professional, engineered look. 

- **Interactive Elements:** Buttons and inputs use a consistent 4px radius.
- **Structural Elements:** Large containers and panels also use a 4px radius, creating a cohesive "nested" appearance.
- **Status Pills:** Small chips or status indicators may use a fully rounded (pill) shape to distinguish them from interactive buttons.

## Components

### Buttons
Buttons are compact (32px height for standard, 24px for dense). Primary buttons use a solid fill; secondary and tertiary buttons use "Ghost" styles with borders only appearing on hover to reduce visual noise in data-heavy toolbars.

### Input Fields
Inputs use a 1px border (#DADCE0) and a white background. Labels are always top-aligned and use the `label-caps` or `body-sm` bold style. Validation states change the border color to the functional accent colors.

### Data Tables
The core of the engineering experience. Rows are 32px high with 1px bottom borders. Hover states use a subtle blue tint (#F0F7FF). Use `mono-data` for all numerical values to ensure readability.

### Chips & Tags
Used for displaying metadata or active filters. They feature a neutral background and a "close" icon. They should be significantly smaller than buttons to avoid hierarchy confusion.

### Tree View / Navigators
Essential for engineering hierarchies. Use chevron icons for expansion. Indentation should be a strict 12px per level to maintain the grid.

### Progress & Status
Linear progress bars for long-running calculations. Status dots (8px circles) use functional colors to indicate "Healthy," "Warning," or "Error" at a glance.