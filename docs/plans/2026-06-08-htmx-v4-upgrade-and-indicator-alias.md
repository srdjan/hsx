# Plan: Upgrade vendored HTMX to v4 (beta4) and make the loading-indicator mechanism reachable

Status: complete (all three workstreams) Date: 2026-06-08 Owner: srdjan

## Update 2026-06-09: Workstream C done

Example audit was clean: no example used the removed `hx-trigger` `queue:`
modifier, SSE, `hx-disabled-elt`, or parent->child attribute inheritance. The
only defect was two examples (`todos`, `hsx-components`) using `<s>` inside
`hsxPage`, which the validator rejected. Fixed at the source by adding `s` to
`NON_SEMANTIC_TAGS` (`hsx-page.ts`) - a legitimate HTML5 text-level element that
was simply missing alongside `strong`/`em`/`small`/`mark`. Added a regression
test. All 12 examples now boot and render 200.

The `active-search` spinner needed no code change. Verified end-to-end with a
real browser (Playwright): during a live search the input receives
`htmx-request` automatically (beta4 behavior), and the existing CSS
`.htmx-request + .indicator` resolves the indicator to opacity 1
(deterministically confirmed). The beta4 upgrade alone revives it.

Final: `deno task check` green; full suite 219 passed / 0 failed.

## Update 2026-06-09: Workstream B done

Added seven v4 aliases to `HSX_NON_VERB_ATTRS` (`hsx-normalize.ts`) and the
matching props to `HsxAttrs` (`jsx-runtime.ts`): `indicator`, `disable`, `sync`,
`confirm`, `select`, `pushUrl`, `swapOob`. `normalizeNonVerb` now coerces
boolean alias values to their string form so `pushUrl={true}` emits
`hx-push-url="true"` rather than a bare (HTMX-falsy) attribute. 12 new unit
tests in `render.test.ts`; full suite 218 passed / 0 failed; `deno task check`
green. Docs table and a "Loading indicators in HTMX 4" note added to
`docs/HTMX_INTEGRATION.md`.

## Update 2026-06-09: Workstream A done, A.2 gate resolved

The vendored HTMX is now `4.0.0-beta4` (`vendor/htmx/htmx.js`). The A.2 gate
flagged below resolved with a decisive finding: **beta4 reverted the alpha3
indicator-gating regression.** In beta4 `#showIndicators(elt)`
(`vendor/htmx/htmx.js:1658`), when `hx-indicator` is absent the element list is
`[elt]`, so the triggering element receives `htmx-request` automatically again,
matching HTMX 2. The "structurally unreachable" defect was therefore an
alpha3-only regression, and the upgrade alone revives the dead `active-search`
spinner.

This reframes the remaining work: the `indicator` alias (workstream B) is no
longer the sole fix but an enhancement for pointing `htmx-request` at a specific
element rather than the trigger. Workstream C's active-search fix may reduce to
verification, since the existing CSS should now light up unchanged. Also
confirmed in beta4: `implicitInheritance: false` (explicit inheritance is the v4
baseline, unchanged from alpha3) and `hx-swap-oob` still works (now alongside
new `<hx-partial>`/`<hx-oob>` tags), so the `swapOob` alias remains valid.

Verification done for A: `deno task check` passes (4 packages + 12 examples);
10/12 examples boot, render 200, and serve `4.0.0-beta4` at `/static/htmx.js`.
The 2 that 500 (`todos`, `hsx-components`) are pre-existing and unrelated: both
throw `Element <s> is not allowed in hsxPage`, and reproduce identically on the
original alpha3 file. Tracked as a separate finding for the workstream C audit.

## Problem

Two coupled defects make HTMX loading states structurally impossible in this
repo today.

First, hsx 1.3.0 has no `indicator` alias. The non-verb alias map in
`packages/hsx/hsx-normalize.ts:21` (`HSX_NON_VERB_ATTRS`) covers only
`target, swap, trigger, vals, headers, ext, sseConnect, sseSwap`. Writing
`indicator="#spinner"` in JSX therefore falls straight through as a dead,
literal `indicator` HTML attribute that neither the browser nor HTMX reads.
Writing the raw `hx-indicator` form instead hits `assertNoManualHxProps`
(`packages/hsx/render.ts:139`) and throws, because manual `hx-*` props are
disallowed by design. There is no supported path to emit `hx-indicator`.

Second, the vendored HTMX is `4.0.0-alpha3` (`vendor/htmx/htmx.js`), and HTMX 4
changed how the `htmx-request` class is applied. In v2 the triggering element
always received `htmx-request` for the duration of a request. In v4,
`#showIndicators` (`vendor/htmx/htmx.js:1634`) only adds the class when
`hx-indicator` is set on the element: if the indicator selector is empty,
`indicatorElements` is `[]` and nothing is marked. So with no `indicator` alias,
`htmx-request` is never applied anywhere.

The combination is visible in `examples/active-search/server.tsx:116-118`, whose
CSS (`.htmx-request + .indicator`, `.htmx-request .indicator`,
`.indicator.htmx-request`) can never match. The spinner is permanently hidden.

## Goals

1. Upgrade the vendored HTMX from `4.0.0-alpha3` to the latest v4 release,
   `4.0.0-beta4` (released 2026-05-22).
2. Add an `indicator` HSX alias (-> `hx-indicator`) so the `htmx-request`
   mechanism becomes reachable through the supported attribute path.
3. Extend the alias map to the broader set of v4 request-state attributes that
   currently have no HSX alias: `disable`, `sync`, `confirm`, `select`,
   `pushUrl`, `swapOob`.
4. Fix the `active-search` example so its loading indicator actually shows, and
   audit the other examples for v4 regressions.

## Non-goals

- Implementing v4's explicit attribute-inheritance modifier (`hx-*:inherited`).
  v4 makes inheritance opt-in; the aliases here emit element-scoped attributes,
  which is the common case. Inheritance support is deferred (YAGNI) and only
  documented.
- Migrating the public hsx API surface beyond adding the seven new aliases.
- Changing the HTMX script-injection or static-serving mechanism.

## Background facts established during research

The exact v4 attribute names matter because the "fetchening" renamed several.
These were verified against the vendored alpha3 source and the v4 migration
guide (https://four.htmx.org/docs/get-started/migration):

| HSX alias   | v4 attribute   | Verified at    | Notes                                                                                                                                                  |
| ----------- | -------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `indicator` | `hx-indicator` | `htmx.js:455`  | The core fix. Element-scoped selector, mirrors `target`.                                                                                               |
| `disable`   | `hx-disable`   | `htmx.js:457`  | v4 RENAME of v2's `hx-disabled-elt`. Disables listed elements during the request. (v2's old `hx-disable` "skip processing" role moved to `hx-ignore`.) |
| `sync`      | `hx-sync`      | core read      | v4 uses this for request queuing; the `queue` modifier on `hx-trigger` was removed.                                                                    |
| `confirm`   | `hx-confirm`   | `htmx.js` core | Unchanged semantics; inheritance now explicit.                                                                                                         |
| `select`    | `hx-select`    | `htmx.js` core | Unchanged; inheritance now explicit.                                                                                                                   |
| `pushUrl`   | `hx-push-url`  | `htmx.js` core | Unchanged.                                                                                                                                             |
| `swapOob`   | `hx-swap-oob`  | `htmx.js:1155` | Response-fragment side. Read during swap, not on the request element. v4 swaps main content first, OOB after.                                          |

Naming decision: the user picked "disabledElt" in scoping, but v4 renamed the
attribute to `hx-disable`. hsx aliases follow a strict convention (drop `hx-`,
camelCase the remainder: `hx-push-url` -> `pushUrl`). The consistent alias is
therefore `disable`, documented as "v4's replacement for v2 `hx-disabled-elt`."
`disable` (verb) does not collide with the HTML `disabled` boolean attribute.

Single source of truth for the upgrade: every example serves HTMX from
`../../vendor/htmx/htmx.js` (e.g. `examples/active-search/server.tsx:271`), so
replacing the one vendored file upgrades all examples at once.

## Workstream A: vendor HTMX 4.0.0-beta4

Files: `vendor/htmx/htmx.js`, `vendor/htmx/htmx.d.ts`.

1. Fetch the `4.0.0-beta4` distribution (npm `htmx.org@4.0.0-beta4` dist build,
   or the tagged artifact from the bigskysoftware/htmx `four` branch). Confirm
   the version banner reads `4.0.0-beta4` before vendoring.
2. Diff alpha3 -> beta4 for behavior that touches hsx assumptions, in priority
   order:
   - `#showIndicators`: confirm `htmx-request` is still gated on `hx-indicator`.
     This is the load-bearing assumption for goal 2. If beta4 reverted to
     always-mark, the `indicator` alias is still correct and the fix still
     works, but the "structurally unreachable" framing in docs should soften.
   - `config.implicitInheritance` default and the `:inherited` reading path
     (`#attributeValue`). Confirm element-scoped attributes still apply without
     a modifier (they do in alpha3).
   - `hx-disable` request-time semantics and OOB swap ordering.
3. Replace both vendor files. Update `vendor/htmx/htmx.d.ts` to the beta4 types
   if the release ships updated typings; otherwise leave the hand-written shim.
4. Verify: each example boots (`deno task example:*`), and `GET /static/htmx.js`
   serves a file whose banner is `4.0.0-beta4`.

Verify: HTMX upgrade is observable in the served asset and no example throws on
boot.

## Workstream B: HSX v4 alias coverage

Files: `packages/hsx/hsx-normalize.ts`, `packages/hsx/jsx-runtime.ts`,
`docs/HTMX_INTEGRATION.md`, plus new tests under `packages/hsx/`.

1. Extend `HSX_NON_VERB_ATTRS` (`hsx-normalize.ts:21`) with the seven mappings
   from the table. No other normalize logic changes: `needsHsxNormalization` and
   `normalizeNonVerb` already iterate this array, so detection, the `usesHtmx`
   flag (which drives script injection), and the "don't overwrite an existing
   target" guard all extend automatically.
2. Add the seven optional props to the `HsxAttrs` interface in `jsx-runtime.ts`
   (around lines 50-70) so JSX type-checks:
   - `indicator?: Id<string> | string` (selector, mirrors `target`)
   - `disable?: Id<string> | string`
   - `select?: Id<string> | string`
   - `sync?: string`
   - `confirm?: string`
   - `pushUrl?: boolean | string`
   - `swapOob?: boolean | string` Confirm these flow into the intrinsic elements
     that already spread `& HsxAttrs` (button, a, form, div, input, textarea,
     ...). `swapOob` must be available on the elements used in returned
     fragments.
3. Tests (`packages/hsx/*_test.ts`): for each alias, assert the rendered output
   contains the correct `hx-*` attribute and value; assert the raw `hx-*` form
   still throws via `assertNoManualHxProps`; assert that using any alias flips
   `usesHtmx` so the script is injected. Keep each test under a second.
4. Docs: add the seven rows to the mapping table in `docs/HTMX_INTEGRATION.md`,
   and add a short "Loading indicators in HTMX 4" subsection stating that
   `htmx-request` is only applied to elements named by `indicator`, so a visible
   loading state requires `indicator` on the triggering element (or a target it
   points at).

Verify: `deno task check` passes (all packages + examples type-check), and
`deno task test` passes including the new alias tests.

## Workstream C: fix active-search and audit the rest

Files: `examples/active-search/server.tsx`; read-only audit of the other 11
examples.

1. Add `indicator={...}` to the search `<input>` so `hx-indicator` is emitted.
   Because `#showIndicators` always marks the triggering element itself once any
   indicator selector is present, the input receives `htmx-request` and the
   existing sibling CSS (`.htmx-request + .indicator`) lights up. During
   implementation, confirm against beta4 whether pointing the selector directly
   at the spinner (a sibling, not a descendant) is needed or whether marking the
   input alone suffices for the current CSS; adjust the selector to match.
2. Manually verify (or drive via Playwright) that the spinner is visible while a
   search request is in flight and hidden otherwise.
3. Audit the other examples. The grep sweep shows only `active-search`
   references `htmx-request`/`indicator`/version-sensitive attributes, so the
   audit is mostly confirming the others rely on none of: implicit
   `htmx-request`, `hx-disabled-elt` (renamed), `hx-disable` old meaning, or
   `hx-trigger` `queue` modifier (removed in v4). Note any finding; fix only
   genuine regressions, per the repo's surgical-change rule.

Verify: spinner visibly toggles in `active-search`; no other example regresses.

## Sequence

A (vendor beta4) and B (aliases) are independent and can land in either order,
but doing A first lets B's tests run against the real target runtime. C depends
on both. Suggested order: A, then B, then C, each committed separately on `main`
with its own verification green.

## Risks and open questions

- beta4 may further change `#showIndicators` or the inheritance defaults. Step
  A.2 is the gate; resolve before writing docs that assert the gating behavior.
- `hx-indicator` extended-selector semantics for a sibling indicator in
  active-search need a concrete check in beta4 (step C.1). Low risk because the
  triggering element is always marked.
- Explicit inheritance: if any example or downstream consumer relied on a parent
  `hx-*` cascading to children, v4 breaks that silently. The audit (C.3) is the
  detection mechanism; full inheritance support remains out of scope.

## Definition of done

- `vendor/htmx/htmx.js` banner reads `4.0.0-beta4`.
- The seven aliases emit the correct `hx-*` attributes, covered by passing unit
  tests; raw `hx-*` still throws.
- `active-search` shows a working loading indicator.
- `deno task check` and `deno task test` are green; no example regresses.
- `docs/HTMX_INTEGRATION.md` documents the new aliases and the v4 indicator
  requirement.
