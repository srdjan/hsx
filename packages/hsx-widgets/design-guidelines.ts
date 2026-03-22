/**
 * Design Guidelines - AI-readable design system constraints.
 *
 * Converts hsx-styles design tokens and custom rules into a structured
 * format that can be included in AI system prompts or loaded on-demand
 * (similar to Claude's read_me tool pattern).
 *
 * @module design-guidelines
 */

// =============================================================================
// Types
// =============================================================================

/** Structured design guidelines for AI consumption. */
export type DesignGuidelines = {
  readonly colors: string;
  readonly typography: string;
  readonly spacing: string;
  readonly components: string;
  readonly constraints: string;
};

// =============================================================================
// Defaults
// =============================================================================

const DEFAULT_COLORS = `Use CSS custom properties for all colors:
- --color-text-primary: Main text color
- --color-text-secondary: Secondary/muted text
- --color-background-primary: Main background
- --color-background-secondary: Card/surface background
- --color-border: Default border color
- --color-accent: Primary accent/action color
All colors must work in both light and dark modes.
Maximum 2-3 color accents per widget.`;

const DEFAULT_TYPOGRAPHY = `Font: system-ui, -apple-system, sans-serif
Weights: 400 (normal), 500 (medium) only. Never use 600 or 700.
Casing: Sentence case everywhere. Never Title Case or ALL CAPS.
Sizes: Use rem units. Base is 1rem (16px).`;

const DEFAULT_SPACING = `Use consistent spacing scale:
- xs: 0.25rem (4px)
- sm: 0.5rem (8px)
- md: 0.75rem (12px)
- lg: 1rem (16px)
- xl: 1.5rem (24px)
- 2xl: 2rem (32px)
- 3xl: 3rem (48px)`;

const DEFAULT_COMPONENTS = `Cards: background var(--color-background-secondary), 1px border, border-radius 0.5rem, padding 1rem 1.25rem
Buttons: padding 0.5rem 1rem, border-radius 0.375rem, include hover/active states
Tables: border-collapse, header row with background, alternating row colors optional`;

const DEFAULT_CONSTRAINTS = `Streaming-safe: No gradients, box-shadows, or blur - they flash during DOM updates.
No HTML comments - they waste tokens.
Structure order: <style> first, then HTML content.
Keep widget output compact - server-side rendering means large output increases latency.`;

// =============================================================================
// Public API
// =============================================================================

/**
 * Create design guidelines from optional overrides.
 *
 * Any section not provided uses sensible defaults based on
 * common UI patterns and streaming-safe constraints.
 */
export function createDesignGuidelines(
  overrides?: Partial<DesignGuidelines>,
): DesignGuidelines {
  return {
    colors: overrides?.colors ?? DEFAULT_COLORS,
    typography: overrides?.typography ?? DEFAULT_TYPOGRAPHY,
    spacing: overrides?.spacing ?? DEFAULT_SPACING,
    components: overrides?.components ?? DEFAULT_COMPONENTS,
    constraints: overrides?.constraints ?? DEFAULT_CONSTRAINTS,
  };
}

/**
 * Format design guidelines as a single AI-readable string.
 *
 * Suitable for inclusion in system prompts or as the response
 * to a "read_me" style tool call.
 */
export function formatForAI(guidelines: DesignGuidelines): string {
  return [
    "# Design System Guidelines",
    "",
    "## Colors",
    guidelines.colors,
    "",
    "## Typography",
    guidelines.typography,
    "",
    "## Spacing",
    guidelines.spacing,
    "",
    "## Component Patterns",
    guidelines.components,
    "",
    "## Constraints",
    guidelines.constraints,
  ].join("\n");
}
