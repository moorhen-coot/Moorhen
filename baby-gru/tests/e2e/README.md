# Playwright E2E (Web Component First)

See the full strict baseline process in:

- SNAPSHOT_BASELINE_GUIDE.md

This suite targets the standalone web component page in `webcomponent.html`.

## Why this target

- It tests the public `<moorhen-web-component>` integration path directly.
- The component emits a `moorhenReady` window event and exposes `element.ready`, which provides a robust app-ready gate for E2E tests.

## Run locally

1. Install browsers once:
   - `npm run test:e2e:install`
2. Run all E2E tests:
   - `npm run test:e2e`
3. Useful variants:
   - `npm run test:e2e:headed` (uses a small screenshot tolerance for local headed rendering variance)
   - `npm run test:e2e:ui`
   - `npm run test:e2e:debug`

## Optimization

- Playwright now starts the server with `start:webcomponent:e2e`, which runs a lightweight prep phase.
- Worker and protobuf generation are skipped when generated files already exist.
- For fastest local iteration, prewarm once in terminal A:
   - `npm run start:webcomponent:e2e`
- Then run tests in terminal B (Playwright will reuse the existing server):
   - `npm run test:e2e:headed`

## Notes

- The Playwright `webServer` command starts `start:webcomponent:e2e`.
- Smoke tests in `webcomponent-smoke.spec.ts` cover ready state, search interaction, and WebGL pipeline health.
- File-loading workflow tests in `load-files.spec.ts` cover molecule+map loading via `moorhenInstance.files.loadFiles` and post-load WebGL drawability checks.
- The first app load can take longer due to WASM and worker initialization.

## Strict Pixel Baseline Mode (Default)

The load workflow now enforces strict pixel-to-pixel canvas baseline checks by default:

- Normal run (strict baseline enabled):
   - `npm run test:e2e`
- Create or update baseline snapshots:
   - `npm run test:e2e:update-snapshots`
- Create/update only Chromium snapshots:
   - `npm run test:e2e:update-snapshots:chromium`
- Create/update only Firefox snapshots:
   - `npm run test:e2e:update-snapshots:firefox`
- Temporary opt-out (for local troubleshooting only):
   - `MOORHEN_E2E_DISABLE_STRICT_CANVAS_BASELINE=1 npm run test:e2e`

Details:

- Baseline files are Playwright image snapshots under `tests/e2e/*-snapshots/`.
- The strict check waits for render settling, then compares a full-window viewport screenshot (not just canvas) with exact diff settings (`maxDiffPixels: 0`, `threshold: 0`).
- Headed runs (`npm run test:e2e:headed`) intentionally use a small tolerance (`maxDiffPixelRatio=0.01`, `threshold=0.2`) to reduce false positives from compositor/antialiasing differences.
- Keep your runner/browser setup stable to avoid churn in strict image baselines.
