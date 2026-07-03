---
name: Velocity Logistics
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f3'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1a1c1c'
  on-surface-variant: '#603e39'
  inverse-surface: '#2f3131'
  inverse-on-surface: '#f1f1f1'
  outline: '#956d67'
  outline-variant: '#ebbbb4'
  surface-tint: '#c00100'
  primary: '#bc0100'
  on-primary: '#ffffff'
  primary-container: '#eb0000'
  on-primary-container: '#fffbff'
  inverse-primary: '#ffb4a8'
  secondary: '#585f68'
  on-secondary: '#ffffff'
  secondary-container: '#d9e0eb'
  on-secondary-container: '#5c636d'
  tertiary: '#0059ba'
  on-tertiary: '#ffffff'
  tertiary-container: '#0071e8'
  on-tertiary-container: '#fefcff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad4'
  primary-fixed-dim: '#ffb4a8'
  on-primary-fixed: '#410000'
  on-primary-fixed-variant: '#930100'
  secondary-fixed: '#dce3ee'
  secondary-fixed-dim: '#c0c7d2'
  on-secondary-fixed: '#151c24'
  on-secondary-fixed-variant: '#404750'
  tertiary-fixed: '#d7e2ff'
  tertiary-fixed-dim: '#acc7ff'
  on-tertiary-fixed: '#001a40'
  on-tertiary-fixed-variant: '#004491'
  background: '#f9f9f9'
  on-background: '#1a1c1c'
  surface-variant: '#e2e2e2'
  logistics-red: '#FF0000'
  deep-onyx: '#161D25'
  cloud-gray: '#F4F4F4'
  pure-white: '#FFFFFF'
typography:
  display-lg:
    fontFamily: Montserrat
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Montserrat
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Montserrat
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-lg:
    fontFamily: Montserrat
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Montserrat
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  button:
    fontFamily: Montserrat
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 20px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 8px
  container-max: 1280px
  gutter-desktop: 24px
  gutter-mobile: 16px
  margin-desktop: 40px
  margin-mobile: 20px
---

## Brand & Style
The brand personality is defined by efficiency, reliability, and modern logistics excellence. This design system focuses on a **Corporate / Modern** aesthetic that balances high-energy action with professional stability. The target audience includes individual shippers, e-commerce entrepreneurs, and enterprise partners who require clarity and speed.

The visual narrative uses heavy whitespace and a restricted color palette to ensure critical logistical information is never obscured. It adopts a "precision-first" approach, utilizing clean lines and structured layouts to evoke a sense of organized movement and technological sophistication in the shipping industry.

## Colors
The palette is anchored by a high-intensity "Logistics Red," used strategically for primary actions, tracking status indicators, and brand markers. This is balanced against "Deep Onyx," which provides a grounded, professional contrast for typography and dark-mode surfaces.

"Cloud Gray" serves as the primary background surface color to reduce eye strain compared to pure white, while "Pure White" is reserved for high-elevation cards and input fields. Functional colors for success, warning, and error should be derived from the primary red's saturation but adjusted toward green and amber hues respectively to maintain semantic clarity.

## Typography
The system utilizes **Montserrat** across all levels to maintain a clean, geometric, and authoritative voice. Bold weights are used aggressively for headlines and navigation to guide the user's eye toward key information like tracking numbers and service types.

For data-heavy logistical tables, use `label-md` with medium weights to ensure legibility at small sizes. All button text should be rendered in `button` style with uppercase transformation to emphasize the call-to-action.

## Layout & Spacing
This design system employs a **12-column fluid grid** for desktop and a **4-column grid** for mobile. The spacing rhythm is based on a strict 8px baseline grid to ensure vertical harmony.

On desktop, content is centered within a maximum width container to maintain focus. Tablet layouts transition to 8 columns with reduced margins. Layouts should prioritize "scanning" patterns, placing critical tracking inputs in prominent, centralized positions. Padding within cards and containers should scale proportionally to the component's importance in the user flow.

## Elevation & Depth
Depth is conveyed through **Tonal Layers** supplemented by subtle **Ambient Shadows**. The background layer uses `cloud-gray`, while interactive content containers use `pure-white` to pop forward.

Shadows must be extremely soft, using the `deep-onyx` color at 5-8% opacity with a large blur radius to avoid a "heavy" look. For complex data sets, use **Low-contrast outlines** (1px solid borders in a lightened version of the neutral color) instead of shadows to maintain a clean, grid-like professional appearance.

## Shapes
The shape language is **Soft** (0.25rem), reflecting a professional balance between modern friendliness and industrial precision. Large containers like service cards or hero sections may use `rounded-lg` (0.5rem) to soften the overall visual impact, but interactive elements like inputs and buttons remain at the base soft setting to feel more "tool-like" and efficient.

## Components
- **Buttons:** Primary buttons use a solid `logistics-red` fill with white text. Secondary buttons use a `deep-onyx` outline with matching text. Hover states should involve a slight darkening of the fill or a subtle lift shadow.
- **Inputs:** Tracking inputs should be oversized with a 1px border. Focus states must use a 2px `logistics-red` border to clearly indicate active status.
- **Chips:** Status chips (e.g., "In Transit", "Delivered") use low-saturation background tints of the semantic status color with high-contrast text for maximum readability.
- **Cards:** Shipping service cards should feature a `pure-white` background, a subtle bottom-heavy shadow, and a `logistics-red` accent bar on the left or top to denote priority.
- **Progress Steppers:** Tracking timelines should use vertical lines in `deep-onyx` with `logistics-red` nodes for the current status and gray nodes for pending steps.