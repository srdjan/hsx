/**
 * HSX Default Styles - Optional stylesheet for HSX applications.
 *
 * Provides a default light theme and a dark theme variant. Examples can
 * override colors via `:root` custom property overrides.
 *
 * @example
 * ```tsx
 * import { hsxStyles, HSX_STYLES_PATH } from "@srdjan/hsx/styles";
 *
 * // Serve the stylesheet
 * if (url.pathname === HSX_STYLES_PATH) {
 *   return new Response(hsxStyles, {
 *     headers: { "content-type": "text/css; charset=utf-8" }
 *   });
 * }
 *
 * // In JSX <head>
 * <link rel="stylesheet" href={HSX_STYLES_PATH} />
 *
 * // Optional: override theme colors
 * <style>{`:root { --hsx-accent: #10b981; }`}</style>
 * ```
 *
 * @module
 */

/** Default path for serving HSX styles */
export const HSX_STYLES_PATH = "/static/hsx.css";

/** Default theme (light, indigo accent) */
export const hsxStyles = `/* HSX Default Styles - Light Theme */
@layer reset, tokens, base, layout, components, utilities, animations;

@layer reset {
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  ul, ol, menu { list-style: none; }
}

@layer tokens {
  :root {
    /* Colors - Default indigo/slate theme */
    --hsx-accent: #4f46e5;
    --hsx-accent-hover: #4338ca;
    --hsx-bg: #f8fafc;
    --hsx-surface: #fff;
    --hsx-border: #e2e8f0;
    --hsx-text: #1e293b;
    --hsx-muted: #64748b;
    --hsx-error: #dc2626;
    --hsx-success: #16a34a;
    /* Spacing */
    --hsx-space-xs: 0.25rem;
    --hsx-space-sm: 0.5rem;
    --hsx-space-md: 1rem;
    --hsx-space-lg: 1.5rem;
    --hsx-space-xl: 2rem;
    /* Typography */
    --hsx-font-sans: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    --hsx-font-size-sm: 0.875rem;
    --hsx-font-size-base: 1rem;
    --hsx-font-size-lg: 1.25rem;
    --hsx-font-size-xl: 1.5rem;
    --hsx-font-size-2xl: 2rem;
    /* Radius */
    --hsx-radius-sm: 4px;
    --hsx-radius-md: 8px;
    --hsx-radius-lg: 12px;
    /* Shadows */
    --hsx-shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
    --hsx-shadow-md: 0 4px 12px rgba(0,0,0,0.08);
    --hsx-shadow-lg: 0 8px 24px rgba(0,0,0,0.12);
    /* Transitions */
    --hsx-transition-fast: 150ms ease;
    --hsx-transition-base: 250ms ease;
  }
}

@layer base {
  html {
    font-family: var(--hsx-font-sans);
    font-size: var(--hsx-font-size-base);
    line-height: 1.6;
    color: var(--hsx-text);
    background: var(--hsx-bg);
    -webkit-font-smoothing: antialiased;
  }
  body {
    min-height: 100dvh;
    padding: var(--hsx-space-xl);
  }
  ::selection {
    background: var(--hsx-accent);
    color: white;
  }
  :focus-visible {
    outline: 2px solid var(--hsx-accent);
    outline-offset: 2px;
  }
}

@layer layout {
  main {
    max-width: 40rem;
    margin-inline: auto;
  }
  h1 {
    font-weight: 300;
    margin-bottom: var(--hsx-space-lg);
    color: var(--hsx-muted);
  }
  .subtitle {
    color: var(--hsx-muted);
    margin-bottom: var(--hsx-space-xl);
  }
  .subtitle p { margin: 0; }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
    gap: var(--hsx-space-lg);
    margin-bottom: var(--hsx-space-lg);
  }
  .card-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--hsx-space-md);
  }
}

@layer components {
  /* Card */
  .card {
    background: var(--hsx-surface);
    border-radius: var(--hsx-radius-lg);
    padding: var(--hsx-space-lg);
    box-shadow: var(--hsx-shadow-md);
  }
  .card h2 {
    font-size: var(--hsx-font-size-sm);
    color: var(--hsx-muted);
    margin-bottom: var(--hsx-space-sm);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .card h3 {
    font-size: var(--hsx-font-size-sm);
    color: var(--hsx-muted);
    margin-bottom: var(--hsx-space-sm);
  }
  .card p {
    font-size: var(--hsx-font-size-lg);
    font-weight: 600;
  }

  /* Buttons */
  .btn {
    padding: var(--hsx-space-sm) var(--hsx-space-md);
    border-radius: var(--hsx-radius-md);
    border: none;
    font: inherit;
    cursor: pointer;
    transition: all var(--hsx-transition-fast);
  }
  .btn-primary {
    background: var(--hsx-accent);
    color: #fff;
  }
  .btn-primary:hover { background: var(--hsx-accent-hover); }
  .btn-secondary {
    background: var(--hsx-border);
    color: var(--hsx-text);
  }
  .btn-danger {
    background: var(--hsx-error);
    color: #fff;
  }
  .btn-group {
    display: flex;
    gap: var(--hsx-space-sm);
    margin-top: var(--hsx-space-md);
  }
  button {
    padding: var(--hsx-space-sm) var(--hsx-space-md);
    background: var(--hsx-accent);
    color: white;
    border: none;
    border-radius: var(--hsx-radius-sm);
    cursor: pointer;
    font-size: var(--hsx-font-size-base);
    transition: opacity var(--hsx-transition-fast);
  }
  button:hover { opacity: 0.9; }
  button:disabled {
    background: var(--hsx-border);
    cursor: not-allowed;
  }

  /* Forms */
  form {
    display: flex;
    gap: var(--hsx-space-sm);
    margin-bottom: var(--hsx-space-md);
  }
  input[type="text"] {
    flex: 1;
    padding: var(--hsx-space-sm);
    border: 2px solid var(--hsx-border);
    border-radius: var(--hsx-radius-sm);
    font-size: var(--hsx-font-size-base);
    transition: border-color var(--hsx-transition-fast);
  }
  input[type="text"]:focus {
    outline: none;
    border-color: var(--hsx-accent);
  }
  .form-group {
    margin-bottom: var(--hsx-space-lg);
  }
  .form-group label {
    display: block;
    font-weight: 500;
    margin-bottom: var(--hsx-space-sm);
  }
  .form-group input {
    width: 100%;
    padding: 0.75rem var(--hsx-space-md);
    font: inherit;
    border: 2px solid var(--hsx-border);
    border-radius: var(--hsx-radius-md);
    transition: border-color var(--hsx-transition-fast);
  }
  .form-group input:focus {
    outline: none;
    border-color: var(--hsx-accent);
  }
  .form-group input.is-valid { border-color: var(--hsx-success); }
  .form-group input.is-invalid { border-color: var(--hsx-error); }
  .field-feedback {
    min-height: 1.5rem;
    font-size: var(--hsx-font-size-sm);
    margin-top: var(--hsx-space-xs);
  }
  .error-msg {
    color: var(--hsx-error);
    display: flex;
    align-items: center;
    gap: var(--hsx-space-xs);
  }
  .success-msg {
    color: var(--hsx-success);
    display: flex;
    align-items: center;
    gap: var(--hsx-space-xs);
  }
  .password-strength {
    display: flex;
    gap: var(--hsx-space-xs);
    margin-top: var(--hsx-space-sm);
  }
  .strength-bar {
    height: 4px;
    flex: 1;
    border-radius: 2px;
    background: var(--hsx-border);
  }
  .strength-bar.weak { background: var(--hsx-error); }
  .strength-bar.medium { background: #f59e0b; }
  .strength-bar.strong { background: var(--hsx-success); }
  .result {
    margin-top: var(--hsx-space-md);
    padding: var(--hsx-space-md);
    border-radius: var(--hsx-radius-md);
    text-align: center;
  }
  .result.success { background: #dcfce7; color: var(--hsx-success); }
  .result.error { background: #fee2e2; color: var(--hsx-error); }

  /* Search */
  .search-form {
    position: relative;
    margin-bottom: var(--hsx-space-md);
  }
  .search-form input {
    width: 100%;
    padding: 0.75rem var(--hsx-space-md) 0.75rem 2.5rem;
    font-size: var(--hsx-font-size-base);
    border: 2px solid var(--hsx-border);
    border-radius: var(--hsx-radius-md);
    transition: border-color var(--hsx-transition-fast);
  }
  .search-form input:focus {
    outline: none;
    border-color: var(--hsx-accent);
  }
  .search-icon {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--hsx-muted);
  }

  /* Tables */
  table {
    width: 100%;
    background: var(--hsx-surface);
    border-radius: var(--hsx-radius-md);
    border-collapse: collapse;
    box-shadow: var(--hsx-shadow-sm);
  }
  th, td {
    padding: 0.75rem var(--hsx-space-md);
    text-align: left;
    border-bottom: 1px solid var(--hsx-border);
  }
  th {
    font-weight: 600;
    color: var(--hsx-muted);
    font-size: var(--hsx-font-size-sm);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: var(--hsx-bg); }
  .no-results {
    padding: var(--hsx-space-xl);
    text-align: center;
    color: var(--hsx-muted);
  }
  mark {
    background: #fef08a;
    padding: 0.1em 0.2em;
    border-radius: 2px;
  }

  /* Tabs */
  .tabs {
    display: flex;
    border-bottom: 2px solid var(--hsx-border);
    margin-bottom: var(--hsx-space-md);
  }
  .tab {
    padding: 0.75rem var(--hsx-space-lg);
    background: none;
    border: none;
    font: inherit;
    color: var(--hsx-muted);
    cursor: pointer;
    border-bottom: 2px solid transparent;
    margin-bottom: -2px;
    transition: all var(--hsx-transition-fast);
  }
  .tab:hover { color: var(--hsx-accent); }
  .tab[aria-selected="true"] {
    color: var(--hsx-accent);
    border-bottom-color: var(--hsx-accent);
    font-weight: 500;
  }
  .tab-content {
    background: var(--hsx-surface);
    padding: var(--hsx-space-lg);
    border-radius: 0 0 var(--hsx-radius-lg) var(--hsx-radius-lg);
    box-shadow: var(--hsx-shadow-sm);
    min-height: 200px;
  }

  /* Modal */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn var(--hsx-transition-fast);
  }
  .modal {
    background: var(--hsx-surface);
    border-radius: var(--hsx-radius-lg);
    padding: var(--hsx-space-lg);
    max-width: 400px;
    width: 90%;
    box-shadow: var(--hsx-shadow-lg);
  }
  .modal h2 { margin-bottom: var(--hsx-space-md); }
  .modal p {
    color: var(--hsx-muted);
    margin-bottom: var(--hsx-space-md);
  }
  .notification {
    position: fixed;
    bottom: var(--hsx-space-md);
    right: var(--hsx-space-md);
    background: var(--hsx-success);
    color: #fff;
    padding: var(--hsx-space-md) var(--hsx-space-lg);
    border-radius: var(--hsx-radius-md);
  }

  /* Stats */
  .stats {
    display: flex;
    gap: var(--hsx-space-xl);
  }
  .stat { text-align: center; }
  .stat-value {
    font-size: var(--hsx-font-size-2xl);
    font-weight: 700;
    color: var(--hsx-accent);
    font-variant-numeric: tabular-nums;
  }
  .stat-label {
    font-size: var(--hsx-font-size-sm);
    color: var(--hsx-muted);
  }
  .stat-change {
    font-size: 0.75rem;
    padding: 0.125rem var(--hsx-space-sm);
    border-radius: 99px;
    display: inline-block;
    margin-top: var(--hsx-space-xs);
  }
  .stat-change.up { background: #dcfce7; color: var(--hsx-success); }
  .stat-change.down { background: #fee2e2; color: var(--hsx-error); }

  /* Feed */
  .feed { list-style: none; padding: 0; margin: 0; }
  .feed-item {
    display: flex;
    gap: 0.75rem;
    padding: 0.75rem 0;
    border-bottom: 1px solid var(--hsx-border);
  }
  .feed-item:last-child { border-bottom: none; }
  .feed-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--hsx-accent);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: var(--hsx-font-size-sm);
    flex-shrink: 0;
  }
  .feed-content { flex: 1; }
  .feed-text { font-size: var(--hsx-font-size-sm); }
  .feed-time {
    font-size: 0.75rem;
    color: var(--hsx-muted);
  }

  /* Status */
  .status {
    display: flex;
    align-items: center;
    gap: var(--hsx-space-sm);
    font-size: var(--hsx-font-size-sm);
  }
  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    animation: pulse 2s infinite;
  }
  .status-dot.online { background: #22c55e; }
  .status-dot.processing { background: #f59e0b; }
  .status-dot.complete { background: #3b82f6; animation: none; }

  /* Progress */
  .progress {
    height: 8px;
    background: var(--hsx-border);
    border-radius: var(--hsx-radius-sm);
    overflow: hidden;
    margin-top: var(--hsx-space-sm);
  }
  .progress-bar {
    height: 100%;
    background: var(--hsx-accent);
    transition: width 0.5s ease;
  }

  /* User list */
  .user-list ul { list-style: none; padding: 0; margin: 0; }
  .user-list li { padding: 0; margin: 0; }
  .user-row {
    display: flex;
    align-items: center;
    gap: var(--hsx-space-md);
    padding: 0.75rem 0;
    border-bottom: 1px solid var(--hsx-border);
  }
  .user-row:last-child { border-bottom: none; }
  .avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--hsx-accent);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-weight: 600;
  }
  .user-info { flex: 1; }
  .user-name { font-weight: 500; }
  .user-email {
    font-size: var(--hsx-font-size-sm);
    color: var(--hsx-muted);
  }
  .load-more {
    text-align: center;
    padding: var(--hsx-space-md);
    color: var(--hsx-muted);
  }

  /* Chart placeholder */
  .chart {
    display: flex;
    align-items: flex-end;
    gap: var(--hsx-space-sm);
    height: 120px;
  }
  .bar {
    background: var(--hsx-accent);
    border-radius: var(--hsx-radius-sm) var(--hsx-radius-sm) 0 0;
    flex: 1;
    transition: height 0.3s;
  }

  /* Lists */
  ul { list-style: none; }
  li {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 0;
    border-bottom: 1px solid var(--hsx-border);
  }
  li:last-child { border-bottom: none; }
  .done {
    text-decoration: line-through;
    color: var(--hsx-muted);
  }
  .toggle {
    width: 1.25rem;
    height: 1.25rem;
    cursor: pointer;
  }
  .delete {
    margin-left: auto;
    color: var(--hsx-muted);
    background: none;
    padding: var(--hsx-space-xs) var(--hsx-space-sm);
    font-size: var(--hsx-font-size-sm);
  }
  .delete:hover { color: var(--hsx-error); }
  .count {
    margin-top: var(--hsx-space-md);
    font-size: var(--hsx-font-size-sm);
    color: var(--hsx-muted);
    text-align: center;
  }

  /* Toggle/checkbox group */
  .toggle { display: flex; align-items: center; gap: var(--hsx-space-sm); }
  .toggle input { width: auto; }
  .paragraph p { margin-bottom: var(--hsx-space-md); }
  .bullets ul { margin-top: var(--hsx-space-md); padding-left: var(--hsx-space-lg); }
}

@layer utilities {
  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  .loading { color: var(--hsx-muted); }
  .indicator {
    display: none;
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
  }
  .htmx-request .indicator { display: inline-block; }
  .htmx-request .btn { opacity: 0.7; pointer-events: none; }
}

@layer animations {
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
  }
  .spinner {
    width: 1.25rem;
    height: 1.25rem;
    border: 2px solid var(--hsx-border);
    border-top-color: var(--hsx-accent);
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }
  .skeleton {
    background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: var(--hsx-radius-sm);
  }
  .skeleton-text { height: 1rem; width: 60%; margin-bottom: var(--hsx-space-sm); }
  .skeleton-stat { height: 2.5rem; width: 40%; }
  .skeleton-chart { height: 120px; width: 100%; }
}
`;

/** Dark theme variant (for hsx-page example) */
export const hsxStylesDark = `/* HSX Dark Theme */
@layer reset, tokens, base, layout, components;

@layer reset {
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  ul, ol, menu { list-style: none; }
}

@layer tokens {
  :root {
    --hsx-bg: #0b1021;
    --hsx-surface: #11172d;
    --hsx-text: #e6edf7;
    --hsx-muted: #9fb1d0;
    --hsx-accent: #6ee7ff;
    --hsx-border: rgba(255,255,255,0.06);
  }
}

@layer base {
  html {
    font-family: "Inter", system-ui, -apple-system, sans-serif;
    color: var(--hsx-text);
  }
  body {
    background: radial-gradient(circle at 20% 20%, #122040 0, #0b1021 40%), #0b1021;
    margin: 0;
    min-height: 100vh;
  }
}

@layer layout {
  .shell {
    max-width: 960px;
    margin: 0 auto;
    padding: 2.5rem 1.5rem 3.5rem;
  }
}

@layer components {
  .card {
    background: linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01));
    border: 1px solid var(--hsx-border);
    border-radius: 16px;
    padding: 1.5rem;
    box-shadow: 0 20px 50px rgba(0,0,0,0.35);
  }
  h2 { margin: 0 0 1rem; font-weight: 600; }
  form { display: flex; gap: 0.75rem; margin-bottom: 1rem; }
  input[type="text"] {
    flex: 1;
    padding: 0.65rem 0.9rem;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,0.15);
    background: rgba(255,255,255,0.04);
    color: var(--hsx-text);
  }
  button {
    padding: 0.65rem 1rem;
    border-radius: 10px;
    border: none;
    background: var(--hsx-accent);
    color: #0b1021;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 10px 30px rgba(110,231,255,0.25);
  }
  button:hover { transform: translateY(-1px); }
  ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.5rem; }
  li {
    padding: 0.65rem 0.75rem;
    border-radius: 10px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.05);
  }
  label { display: flex; gap: 0.5rem; align-items: center; }
  footer { margin-top: 2rem; color: var(--hsx-muted); }
}
`;
