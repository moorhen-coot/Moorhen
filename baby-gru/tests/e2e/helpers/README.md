# E2E Helpers Refactoring - Module Structure

The 823-line `webcomponent.ts` file has been split into focused, maintainable modules:

## Module Organization

### `types.ts` (78 lines)
**Centralized type definitions** for the entire test harness

- `CanvasScreenshotBaselineOptions` — Canvas-only screenshot options
- `PageScreenshotBaselineOptions` — Full-page screenshot with canvas crop & subfolder support
- `WebGLCanvasStats` — WebGL canvas state metrics
- `MoorhenStartedSession` — Main test harness interface
- `WebGLSettleOptions` — WebGL render settling configuration
- `SceneSettingsSnapshot` — Scene settings state

---

### `screenshots.ts` (225 lines)
**Screenshot capture and baseline comparison logic**

**Functions:**
- `getScreenshotComparisonPolicy()` — Determine strict vs. relaxed comparison mode
- `withBrowserSpecificSuffix()` — Add chromium/firefox suffixes to snapshot names
- `assertCanvasScreenshotBaseline()` — Canvas-only pixel regression testing
- `assertPageScreenshotBaseline()` — Full-page/canvas pixel regression with:
  - Center crop support (`centerCrop: {width, height}`)
  - Snapshot subfolder organization (`snapshotSubfolder: "path"`)
  - Canvas isolation for UI-free capture
  - Genuine WebGL canvas hiding (`hideWebGLCanvas: true`) to ignore an unstable canvas
    (only the canvas is hidden — overlays on top stay visible)

---

### `webglCanvas.ts` (216 lines)
**WebGL canvas utilities and diagnostics**

**Functions:**
- `getWebGLCanvasLocator()` — Locate the WebGL canvas in shadow DOM
- `setCanvasCaptureIsolation()` — Hide/show UI overlays for clean canvas capture
- `getWebGLCanvasStats()` — Collect comprehensive WebGL state metrics:
  - Drawing buffer dimensions
  - Pixel sampling and color analysis
  - Canvas readiness and rendering state
  - Display buffer count and frame signatures

---

### `setup.ts` (51 lines)
**Web component initialization and basic navigation**

**Functions:**
- `gotoWebComponentPage()` — Navigate to webcomponent.html
- `waitForMoorhenReady()` — Wait for Moorhen initialization complete
- `openMainMenu()` — Open the main navigation menu
- `openSearchBar()` — Open the search interface

---

### `moorhenInstance.ts`
**Remote proxy over the live MoorhenInstance + render settling**

**Exports:**
- `getMoorhenInstance()` — Return a thenable + callable + async-iterable proxy typed as the real `MoorhenInstance`, so tests drive the application API directly:
  - `await mi.getMoleculeList()[0].getNumberOfAtoms()` — method chains
  - `await mol.molNo` — property reads
  - `for await (const mol of mi.getMoleculeList()) { ... }` — iteration
  - `const loaded = await mi.files.loadFiles([...])` — JSON-serializable results
- `waitForWebGLRenderSettle()` — Wait for WebGL rendering to stabilize after changes

---

### `index.ts` (110 lines)
**Main entry point and re-exports**

**Primary export:**
- `startAndGetInstance()` — Start the web component and return a minimal harness:
  - `getInstance()` — the remote instance proxy (see `moorhenInstance.ts`)
  - `buttonClick(ariaLabel)` — click a shadow-DOM button by aria-label

**Re-exports:** All types and standalone utilities (screenshots, WebGL stats/settle, page setup) for convenience

---

## Key Benefits of Refactoring

| Aspect | Before | After |
|--------|--------|-------|
| **File Size** | 823 lines | 6 focused files: 51–225 lines each |
| **Discoverability** | Scroll through monolithic file | Clear module names indicate purpose |
| **Maintenance** | Changes scattered across file | Isolated, testable modules |
| **Reusability** | Less clear boundaries | Each module has single responsibility |
| **Testing** | Hard to mock dependencies | Can test/stub individual modules |
| **IDE Navigation** | Single namespace | Organized by functionality |

---

## Import Examples

**Before (old webcomponent.ts):**
```typescript
import {
  startAndGetInstance,
  getWebGLCanvasStats,
  assertPageScreenshotBaseline,
  gotoWebComponentPage,
  waitForMoorhenReady,
} from "./helpers/webcomponent";
```

**After (new modular structure):**
```typescript
// All imports work from the same place via index.ts re-exports
import {
  startAndGetInstance,
  getWebGLCanvasStats,
  assertPageScreenshotBaseline,
  gotoWebComponentPage,
  waitForMoorhenReady,
} from "./helpers";

// Or import specific submodules if you prefer:
import { getWebGLCanvasStats } from "./helpers/webglCanvas";
import { assertPageScreenshotBaseline } from "./helpers/screenshots";
import type { WebGLCanvasStats } from "./helpers/types";
```

---

## Files Updated

All test files updated to import from `"./helpers"` instead of `"./helpers/webcomponent"`:
- ✅ `tests/e2e/load-files.spec.ts`
- ✅ `tests/e2e/scene-settings.spec.ts`
- ✅ `tests/e2e/webcomponent-smoke.spec.ts`
- ✅ `tests/e2e/base-interface.spec.ts`

All test files compile without TypeScript errors.

---

## Backward Compatibility

The refactored code maintains **100% API compatibility**. All exported functions and types have identical signatures. Test files only required import statement changes (which are automatically resolved via `index.ts` re-exports).
