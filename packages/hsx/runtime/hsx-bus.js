// @ts-nocheck
/**
 * HSX client event bus - HSX's one small, optional authored client runtime.
 *
 * Compiled from element attributes (emit/on/act/... -> data-hsx-*):
 *   emit      publish a DOM CustomEvent on <body> so HTMX `trigger="evt from:body"`
 *             reacts on the server for free; detail comes from emitDetail (JSON).
 *   on + act  run fixed declarative verbs in the browser, no round-trip.
 *
 * Verbs: toggle-class|add-class|remove-class <cls>, set-attr n=v, remove-attr n,
 * set-text <text>, show, hide, remove, clone-template #id into <sel> [as append|prepend].
 * The only dynamism is a shallow `$detail.<key>` token - intentionally not a language.
 * A cloned node carrying data-hsx-ttl="<ms>" is auto-removed after that delay.
 *
 * Safe: never eval; detail is JSON.parse'd in try/catch; set-text uses textContent;
 * clone-template clones a server-rendered <template>, never HTML from strings.
 */
(() => {
  "use strict";

  const run = () => {
    const meta = document.querySelector('meta[name="hsx-bus-config"]');
    const cfg = { root: "body", debug: false };
    try {
      const p = JSON.parse(meta?.getAttribute("content") || "{}");
      if (typeof p.root === "string") cfg.root = p.root;
      if (typeof p.debug === "boolean") cfg.debug = p.debug;
    } catch { /* keep defaults */ }

    const root = document.querySelector(cfg.root) || document.body;
    const seen = new Set(); // event names with a registered listener
    const isField = (el) => /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName);
    const log = (...a) => cfg.debug && console.debug("[hsx-bus]", ...a);

    // ---- Publish --------------------------------------------------------

    const triggerFor = (el) =>
      el.tagName === "FORM" ? "submit" : isField(el) ? "change" : "click";

    const ownsRequest = (el) =>
      ["hx-get", "hx-post", "hx-put", "hx-patch", "hx-delete", "action"]
        .some((a) => el.hasAttribute(a));

    const publish = (el, ev) => {
      const name = el.getAttribute("data-hsx-emit");
      if (!name) return;
      let detail = {};
      try {
        const p = JSON.parse(el.getAttribute("data-hsx-detail") || "{}");
        if (p && typeof p === "object") detail = p;
      } catch { /* {} */ }
      // Form controls publish their current value unless the payload set one.
      if (detail.value === undefined && isField(el)) detail.value = el.value;
      // An emit-only form would navigate; stop it. When HTMX owns the form,
      // let HTMX run its request and just emit alongside.
      if (el.tagName === "FORM" && !ownsRequest(el)) ev.preventDefault();
      log("emit", name, detail);
      root.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }));
    };

    const onTrigger = (ev) => {
      const el = ev.target?.closest?.("[data-hsx-emit]");
      const want = el &&
        (el.getAttribute("data-hsx-trigger") || triggerFor(el));
      if (want === ev.type) publish(el, ev);
    };

    const publishTypes = new Set(["click", "submit", "change"]);
    publishTypes.forEach((t) => root.addEventListener(t, onTrigger));
    const addCustomTriggers = () => {
      for (const el of document.querySelectorAll("[data-hsx-trigger]")) {
        const t = el.getAttribute("data-hsx-trigger");
        if (t && !publishTypes.has(t)) {
          publishTypes.add(t);
          root.addEventListener(t, onTrigger);
        }
      }
    };

    // ---- Subscribe ------------------------------------------------------

    const resolve = (tok, detail) => {
      if (!tok.startsWith("$detail")) return tok;
      if (tok === "$detail") return String(detail);
      const v = detail?.[tok.slice(8)]; // "$detail." is 8 chars
      return v == null ? "" : String(v);
    };

    const cloneTemplate = (tokens, detail) => {
      const tpl = document.getElementById((tokens[1] || "").replace(/^#/, ""));
      if (!tpl || !("content" in tpl)) return;
      const sel = tokens[tokens.indexOf("into") + 1];
      const prepend = tokens.includes("as") &&
        tokens[tokens.indexOf("as") + 1] === "prepend";
      for (const dest of document.querySelectorAll(sel)) {
        const frag = tpl.content.cloneNode(true);
        for (const slot of frag.querySelectorAll("[data-hsx-slot]")) {
          const v = detail?.[slot.getAttribute("data-hsx-slot")];
          slot.textContent = v == null ? "" : String(v);
        }
        const inserted = [...frag.children];
        prepend && dest.prepend ? dest.prepend(frag) : dest.appendChild(frag);
        for (const node of inserted) {
          const ttl = parseInt(node.getAttribute?.("data-hsx-ttl"), 10);
          if (ttl > 0) setTimeout(() => node.remove(), ttl);
        }
      }
    };

    const runAct = (act, self, detail) => {
      let tokens = act.trim().split(/\s+/);
      const verb = tokens[0];
      if (!verb) return;
      if (verb === "clone-template") return cloneTemplate(tokens, detail);

      // Optional trailing "on <selector>" targets other elements (default: self).
      let sel = null;
      if (tokens.length >= 2 && tokens[tokens.length - 2] === "on") {
        sel = tokens[tokens.length - 1];
        tokens = tokens.slice(0, -2);
      }
      const args = tokens.slice(1);
      for (const el of sel ? document.querySelectorAll(sel) : [self]) {
        if (!el) continue;
        switch (verb) {
          case "toggle-class":
            args[0] && el.classList.toggle(args[0]);
            break;
          case "add-class":
            args[0] && el.classList.add(args[0]);
            break;
          case "remove-class":
            args[0] && el.classList.remove(args[0]);
            break;
          case "set-attr": {
            const i = (args[0] || "").indexOf("=");
            if (i > 0) {
              el.setAttribute(
                args[0].slice(0, i),
                resolve(args[0].slice(i + 1), detail),
              );
            }
            break;
          }
          case "remove-attr":
            args[0] && el.removeAttribute(args[0]);
            break;
          case "set-text":
            el.textContent = resolve(args.join(" "), detail);
            break;
          case "show":
            el.classList.remove("hsx-hidden");
            el.removeAttribute("hidden");
            break;
          case "hide":
            el.classList.add("hsx-hidden");
            break;
          case "remove":
            el.remove();
            break;
          default:
            log("unknown verb", verb);
        }
      }
    };

    const onBusEvent = (ev) => {
      const subs = document.querySelectorAll(`[data-hsx-on~="${ev.type}"]`);
      log("recv", ev.type, subs.length);
      for (const sub of subs) {
        const act = sub.getAttribute("data-hsx-act");
        if (act) {
          act.split(";").forEach((a) =>
            a.trim() && runAct(a, sub, ev.detail || {})
          );
        }
      }
    };

    const register = () => {
      for (const el of document.querySelectorAll("[data-hsx-on]")) {
        for (const name of el.getAttribute("data-hsx-on").split(/\s+/)) {
          if (name && !seen.has(name)) {
            seen.add(name);
            root.addEventListener(name, onBusEvent);
          }
        }
      }
    };

    addCustomTriggers();
    register();
    // HTMX may swap in subscribers/emitters with new event names; re-scan.
    document.body.addEventListener("htmx:afterSettle", () => {
      addCustomTriggers();
      register();
    });
    log("ready", cfg.root);
  };

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", run)
    : run();
})();
