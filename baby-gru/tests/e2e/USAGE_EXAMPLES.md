# Canvas Screenshot Baseline Features

## New Options for `assertPageScreenshotBaseline`

### 1. Center Crop for Canvas Screenshots

Capture only the center portion of the canvas to reduce image size and storage:

```typescript
import { assertPageScreenshotBaseline, startAndGetInstance } from './helpers';

await assertPageScreenshotBaseline(page, {
    snapshotName: 'webgl-scene-default',
    canvasOnly: true,
    centerCrop: {
        width: 512,   // pixels
        height: 512,  // pixels
    },
});
```

**How it works:**
- Calculates the center of the canvas bounding box
- Crops to the specified dimensions centered on that point
- Captures only the cropped region for comparison
- Helps reduce storage when testing many scene settings variations

**Example use case:** Testing 100+ WebGL scene settings options. Instead of 100 full-size images (often 1920×1080), store 100 cropped 512×512 images.

---

### 2. Snapshot Subfolder Organization

Organize snapshots into subdirectories to keep the snapshots folder clean:

```typescript
await assertPageScreenshotBaseline(page, {
    snapshotName: 'settings-backgroundColor-blue',
    canvasOnly: true,
    snapshotSubfolder: 'scene-settings-variants',
});
```

This creates:
```
tests/e2e/snapshots/scene-settings-variants/settings-backgroundColor-blue-chromium.png
tests/e2e/snapshots/scene-settings-variants/settings-backgroundColor-blue-firefox.png
```

**Nested subfolders are supported:**
```typescript
snapshotSubfolder: 'scene-settings/backgroundColor'
// Creates: snapshots/scene-settings/backgroundColor/snapshot-name-chromium.png
```

---

### 3. Combined: Crop + Subfolder

For comprehensive WebGL testing with organized storage:

```typescript
// Test all scene settings variations
import { assertPageScreenshotBaseline, waitForWebGLRenderSettle } from './helpers';

const testSceneSettings = async (page: Page) => {
    await waitForWebGLRenderSettle(page);

    await assertPageScreenshotBaseline(page, {
        snapshotName: 'scene-axes-on',
        canvasOnly: true,
        snapshotSubfolder: 'scene-settings-variants',
        centerCrop: { width: 600, height: 600 },
    });
};
```

Result: Clean snapshot organization with reduced image storage:
```
snapshots/
  scene-settings-variants/
    scene-axes-on-chromium.png        (600×600, ~50KB)
    scene-axes-on-firefox.png         (600×600, ~50KB)
    scene-outline-on-chromium.png     (600×600, ~50KB)
    scene-outline-on-firefox.png      (600×600, ~50KB)
    scene-bg-red-chromium.png         (600×600, ~50KB)
    scene-bg-red-firefox.png          (600×600, ~50KB)
    ... (hundreds more without bloat)
```

---

## Type Definition

```typescript
export type PageScreenshotBaselineOptions = {
    snapshotName: string | string[];
    fullPage?: boolean;
    canvasOnly?: boolean;
    canvasSelector?: string;
    webComponentId?: string;
    isolateCanvas?: boolean;
    snapshotSubfolder?: string;           // NEW: organize into subfolders
    centerCrop?: {                        // NEW: crop canvas to center region
        width: number;
        height: number;
    };
};
```

---

## Notes

- **Browser-specific naming:** Both `chromium` and `firefox` browser suffixes are always applied automatically
- **Canvas isolation still works:** `isolateCanvas: true` hides React overlays, even with cropping enabled
- **Error screenshots:** When a comparison fails, the error screenshot also uses the crop region if specified
- **Subfolder path normalization:** Paths with multiple `/` are preserved and converted to proper directory structures
