/**
 * HSX Widgets Snippet - Host page bootstrapper for embedding widgets.
 *
 * Include this script on any page to auto-initialize HSX widget embeds.
 * It scans for elements with `data-hsx-uri` attributes and replaces them
 * with lazy-loaded iframes pointing to the embed handler.
 *
 * Usage on host page:
 * ```html
 * <div data-hsx-uri="https://yourapp.com/embed/hsx-greeting?name=World"></div>
 * <script src="https://yourapp.com/static/hsx/snippet.js"></script>
 * ```
 *
 * @module snippet
 */

// This file is meant to be compiled standalone and served as a static asset.
// It has zero dependencies.

(function hsxSnippet() {
  const ATTR = "data-hsx-uri";

  function initWidget(el: Element): void {
    const uri = el.getAttribute(ATTR);
    if (!uri) return;

    const iframe = document.createElement("iframe");
    iframe.src = uri;
    iframe.style.cssText = "border:0;width:100%;overflow:hidden;display:block";
    iframe.setAttribute("loading", "lazy");
    iframe.setAttribute("sandbox", "allow-scripts allow-same-origin");
    iframe.title = "HSX Widget";

    el.replaceWith(iframe);
  }

  function handleResize(event: MessageEvent): void {
    if (
      typeof event.data !== "object" ||
      event.data === null ||
      event.data.type !== "hsx-resize"
    ) return;

    const { height } = event.data as { height: number };
    if (typeof height !== "number" || height <= 0) return;

    // Find the iframe that sent this message
    const iframes = document.querySelectorAll<HTMLIFrameElement>("iframe");
    for (const iframe of iframes) {
      if (iframe.contentWindow === event.source) {
        iframe.style.height = `${height}px`;
        break;
      }
    }
  }

  // Initialize all widgets on page
  const elements = document.querySelectorAll(`[${ATTR}]`);
  for (const el of elements) {
    initWidget(el);
  }

  // Listen for height negotiation messages from embedded widgets
  window.addEventListener("message", handleResize);
})();
