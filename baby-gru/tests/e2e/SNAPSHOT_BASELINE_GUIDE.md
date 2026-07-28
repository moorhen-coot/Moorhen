# Snapshot Baseline Guide (Human + Agent)

This document defines how strict snapshot testing works in this repository and how to maintain it safely.

## Scope

Strict baseline checks are currently enforced in the file-loading workflow test:

- tests/e2e/load-files.spec.ts

The check runs after:

1. Web component is ready.
2. Molecule and map are loaded through moorhenInstance.files.loadFiles.
3. WebGL render settles.

## What Is Captured

The strict baseline captures the full window viewport (page screenshot), not only the canvas element.

Implementation detail:

- The helper calls Playwright `toHaveScreenshot` on the page object.
- Current strict baseline uses viewport capture (`fullPage: false`).

Relevant helper:

- tests/e2e/helpers/webcomponent.ts
- Function: assertPageScreenshotBaseline

## Why Full Window

Full-window capture validates not only WebGL output, but also surrounding UI expected to react to workflows (for example, sequence viewer and other panels).

## Default Behavior

Strict baseline comparison is enabled by default in tests/e2e/load-files.spec.ts.

Headless/non-headed runs stay fully strict (`maxDiffPixels: 0`, `threshold: 0`).

Snapshots are always browser-specific. Chromium and Firefox each maintain their own baseline image files.

Headed runs through `npm run test:e2e:headed` enable a tiny tolerance to avoid false positives from local compositor differences:

- `MOORHEN_E2E_HEADED_SCREENSHOT_TOLERANCE=1`
- default `MOORHEN_E2E_HEADED_MAX_DIFF_PIXEL_RATIO=0.01`
- default `MOORHEN_E2E_HEADED_THRESHOLD=0.2`

Optional overrides for local experimentation:

- `MOORHEN_E2E_HEADED_MAX_DIFF_PIXEL_RATIO`
- `MOORHEN_E2E_HEADED_THRESHOLD`

To temporarily disable strict baseline checks:

- MOORHEN_E2E_DISABLE_STRICT_CANVAS_BASELINE=1 npm run test:e2e

Use this only for troubleshooting.

## Updating Baselines

Update all browser baselines:

- npm run test:e2e:update-snapshots

Update Chromium only:

- npm run test:e2e:update-snapshots:chromium

Update Firefox only:

- npm run test:e2e:update-snapshots:firefox

Generated snapshots are stored in a single folder:

- tests/e2e/snapshots/

## Agent Workflow (Required)

When modifying rendering-related behavior, an agent should follow this sequence:

1. Run strict tests without updates.
2. If mismatch is expected, run update-snapshots for the targeted browser.
3. Re-run strict tests without updates.
4. Confirm that only intended snapshot files changed.

## Render Settle Requirement

Snapshot capture must happen after rendering settles.

Current mechanism:

- waitForWebGLRenderSettle in tests/e2e/helpers/webcomponent.ts

This waits for a short stable period and drawable WebGL state before screenshot capture, reducing transient mismatches.

## Troubleshooting

If snapshots are unexpectedly black/empty:

1. Verify files actually loaded (molecule and map counts increased).
2. Verify waitForWebGLRenderSettle completed.
3. Run headed mode for local diagnosis:
   - npm run test:e2e:headed
4. Recreate snapshots on a stable machine/runner.

If diffs are noisy between machines:

1. Prefer per-browser updates (chromium vs firefox scripts).
2. Keep GPU/driver/browser versions stable in CI.
3. Avoid updating baselines from heterogeneous environments unless intended.

## Notes for Future Expansion

If you need additional strict baselines (other workflows), reuse assertPageScreenshotBaseline by default. Use element-level baselines only when you intentionally want a narrower regression target.
