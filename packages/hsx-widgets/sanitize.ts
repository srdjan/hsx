/**
 * HTML Sanitizer - Allowlist-based sanitization for AI-generated content.
 *
 * Strips disallowed tags, event handler attributes, and dangerous URI schemes.
 * Keeps only structural/presentational HTML safe for Shadow DOM rendering.
 *
 * @module sanitize
 */

// =============================================================================
// Allowlists
// =============================================================================

const ALLOWED_TAGS = new Set([
  // Structure
  "div", "span", "p", "br", "hr", "pre", "code", "blockquote",
  // Headings
  "h1", "h2", "h3", "h4", "h5", "h6",
  // Lists
  "ul", "ol", "li", "dl", "dt", "dd",
  // Tables
  "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption", "colgroup", "col",
  // Inline
  "strong", "em", "b", "i", "u", "s", "sub", "sup", "mark", "small",
  // Links and media
  "a", "img",
  // Figures
  "figure", "figcaption",
  // Interactive
  "details", "summary",
  // SVG (structural only)
  "svg", "g", "path", "circle", "rect", "ellipse", "line",
  "polyline", "polygon", "text", "tspan", "defs", "use",
  // CSS (Shadow DOM isolates it)
  "style",
]);

/** Tags whose content (not just the tags) must be stripped entirely. */
const STRIP_CONTENT_TAGS = new Set([
  "script", "iframe", "object", "embed", "applet",
]);

/** Attributes that take URIs and need scheme validation. */
const URI_ATTRS = new Set(["href", "src", "action", "formaction"]);

const DANGEROUS_URI_RE = /^\s*(javascript|data|vbscript)\s*:/i;

// =============================================================================
// Pre-processing: Strip dangerous tags with their content
// =============================================================================

/** Pre-compiled regexes for stripping dangerous tags (avoid per-call compilation). */
const DANGEROUS_BLOCK_RES = [...STRIP_CONTENT_TAGS].map((tag) => ({
  block: new RegExp(
    `<${tag}\\b[^<]*(?:(?!<\\/${tag}>)<[^<]*)*<\\/${tag}>`,
    "gi",
  ),
  selfClose: new RegExp(
    `<${tag}\\b(?:[^>"']|"[^"]*"|'[^']*')*\\/?>`,
    "gi",
  ),
}));

function stripDangerousBlocks(html: string): string {
  for (const { block, selfClose } of DANGEROUS_BLOCK_RES) {
    html = html.replace(block, "");
    html = html.replace(selfClose, "");
  }
  return html;
}

// =============================================================================
// Tag/Attribute Parsing
// =============================================================================

/**
 * Regex matching an HTML tag. Handles `>` inside quoted attribute values.
 *
 * Captures:
 * - Group 1: optional `/` for closing tags
 * - Group 2: tag name
 * - Group 3: attributes string
 */
const TAG_RE = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:\s+(?:[^>"']*|"[^"]*"|'[^']*')*)?)\/?\s*>/g;

/**
 * Regex matching individual attributes within a tag.
 * Handles: name="value", name='value', name=value, name (boolean)
 */
const ATTR_RE = /([a-zA-Z_][\w-]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|(\S+)))?/g;

// =============================================================================
// Public API
// =============================================================================

/**
 * Sanitize HTML by allowlisting tags and attributes.
 *
 * - Strips `<script>`, `<iframe>`, `<object>`, `<embed>` with their content
 * - Removes other disallowed tags (preserves their text content)
 * - Strips all `on*` event handler attributes
 * - Strips URI attributes with `javascript:`, `data:`, or `vbscript:` schemes
 * - Preserves `<style>` tags (CSS is isolated by Shadow DOM)
 */
export function sanitizeHtml(html: string): string {
  // First pass: strip dangerous tags and their content
  html = stripDangerousBlocks(html);

  // Second pass: filter remaining tags and attributes
  return html.replace(TAG_RE, (_match, slash, tagName, attrsStr) => {
    const tag = tagName.toLowerCase();

    if (!ALLOWED_TAGS.has(tag)) {
      return "";
    }

    if (slash === "/") {
      return `</${tag}>`;
    }

    const cleanAttrs = sanitizeAttributes(attrsStr);
    return `<${tag}${cleanAttrs}>`;
  });
}

function sanitizeAttributes(attrsStr: string): string {
  if (!attrsStr || !attrsStr.trim()) return "";

  const parts: string[] = [];
  ATTR_RE.lastIndex = 0;

  let attrMatch: RegExpExecArray | null;
  while ((attrMatch = ATTR_RE.exec(attrsStr)) !== null) {
    const name = attrMatch[1].toLowerCase();
    const value = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? "";

    // Strip event handlers
    if (name.startsWith("on")) continue;

    // Strip dangerous URI schemes
    if (URI_ATTRS.has(name) && DANGEROUS_URI_RE.test(value)) continue;

    // Keep the attribute
    if (value || attrMatch[0].includes("=")) {
      parts.push(`${name}="${value}"`);
    } else {
      parts.push(name);
    }
  }

  return parts.length > 0 ? " " + parts.join(" ") : "";
}
