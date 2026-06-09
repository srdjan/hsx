/**
 * Shared widget wrapping logic for SSR and catalog rendering.
 *
 * @module widget-wrapper
 */

import type { Renderable } from "@srdjan/hsx/core";
import { jsx } from "hsx/jsx-runtime";

/**
 * Wrap widget content in a scoped container with optional styles.
 *
 * Light DOM: `<div data-widget="tag">` with inline `<style>`
 * Shadow DOM: `<tag data-widget="tag">` with `<template shadowrootmode="...">`
 */
export function wrapWidgetContent(
  tag: string,
  content: Renderable,
  styles: string,
  options: {
    shadow?: "open" | "closed" | "none";
    hoistStyles?: boolean;
  } = {},
): Renderable {
  const shadowMode = options.shadow ?? "none";
  const hoistStyles = options.hoistStyles ?? false;

  const children: Renderable[] = [];

  // Include styles when: non-empty AND (shadow DOM mode OR not hoisted)
  const includeStyles = styles.length > 0 &&
    (shadowMode !== "none" || !hoistStyles);
  if (includeStyles) {
    children.push(jsx("style", { children: styles }));
  }

  children.push(content);

  if (shadowMode !== "none") {
    return jsx(tag, {
      "data-widget": tag,
      children: jsx("template", {
        shadowrootmode: shadowMode,
        children,
      }),
    });
  }

  return jsx("div", {
    "data-widget": tag,
    children,
  });
}
