# GPU tests

WebGPU kernels and the WebGPU renderer, tested in a browser with real WebGPU, against CPU
references. Playwright, but no app server: each test bundles one *case* module with esbuild and
runs it on a blank page.

```
npm run test:gpu                              # every project
npm run test:gpu -- --project=gpu-chromium    # Chromium only
npm run test:gpu -- -g "map contour"          # by title
```

Browsers come from `npm run test:e2e:install`. Their WebGPU settings are in
`tests/webgpuBrowsers.ts`, shared with the WebGPU e2e tests (`tests/e2e/webgpu-*.spec.ts`,
projects `chromium-webgpu` and `firefox-webgpu`).

- **Chromium** uses the machine's GPU, except on Linux, where it uses SwiftShader, a software GPU
  that any Linux box or CI runner has. `MOORHEN_GPU_SWIFTSHADER=1` (or `=0`) overrides that.
  `MOORHEN_GPU_CHROMIUM=/path/to/chrome` runs a particular build.
- **Firefox:** Playwright's Firefox usually has no WebGPU, so its tests are *skipped*, with the
  reason, rather than failed. Shaders must still work in Firefox (its compiler, naga, is stricter
  than Chrome's), so check in a real Firefox when you change WGSL: load a structure (WebGPU draws
  the main view there by default), or run a case page by hand.

## When the browsers will not start

Both projects are preceded by nothing except `gpu-firefox-probe`, a single test asking whether
Firefox starts at all. The Firefox project depends on it, so a browser that cannot launch costs
one failure rather than one per test — Playwright retries a failed launch *per test*, not per
worker, which with thirty-odd tests at a thirty second launch timeout is a quarter of an hour of
the same message. If the probe fails, nothing about the Firefox tests themselves is being said.

**On macOS, give your terminal Full Disk Access** (System Settings → Privacy & Security), then
restart it. Playwright launches Firefox with a throwaway profile under `$TMPDIR`; without that
permission Firefox cannot read the profile, puts up a modal saying so, and never connects. What
you see is a launch timeout, and the browser's own log blames graphics —

```
sandbox_extension_issue_file_to_process failed for …/plugin-container.app: 1 (Operation not permitted)
Crash Annotation GraphicsCriticalError: RenderCompositorSWGL failed mapping default framebuffer
```

— which is a red herring: the compositor is failing because the browser is already failing. The
giveaway is `--headed`, where the real dialog is visible ("Your Firefox profile cannot be
loaded"). Chromium is unaffected, so a run where only Firefox fails to launch points here.

The launch timeout is `MOORHEN_GPU_LAUNCH_TIMEOUT` (30s), the per-test timeout `MOORHEN_GPU_TIMEOUT`
(30s locally, 180s on CI, where a software GPU is tens of times slower), and the whole run is
bounded by `MOORHEN_GPU_GLOBAL_TIMEOUT`.

## Layout

```
*.gpu.spec.ts      the tests (Node side): run a case, check its report
cases/*.case.ts    the cases (browser side): do the GPU work, compare with the reference there,
                   return a small report (counts, worst errors), not whole meshes
reference/         CPU references used by cases
helpers/           gpuPage.ts (bundle, serve, run; Node) and browserCase.ts (defineCase; browser)
data/              reference data, served to cases under /data/
```

## Writing a case

```ts
// cases/myThing.case.ts
import { defineCase } from "../helpers/browserCase";

export default defineCase(async (device: GPUDevice, args: { n: number }) => {
    // ... make GPU work on `device` (the shared device, as Moorhen uses), read results back
    // (readBuffer from src/WebGPUComponents/gpu), compare with a CPU reference ...
    return { worstError, count };
});
```

```ts
// myThing.gpu.spec.ts
import { expect, test } from "@playwright/test";
import { resultOrSkip, runGpuCase } from "./helpers/gpuPage";

test("my thing matches the CPU", async ({ page }) => {
    const r = resultOrSkip(await runGpuCase<{ worstError: number; count: number }>(page, "myThing.case.ts", { n: 1000 }));
    expect(r.worstError).toBeLessThan(1e-5);
});
```

`resultOrSkip` skips where there is no WebGPU, and fails if WebGPU reported any error outside an
error scope while the case ran.

Keep inputs small: the tests must run in seconds on a software GPU. Then break the kernel on
purpose once and check that the test notices.

## Reference data

`data/metaballs-1df7-first16.cpp.bin.gz` is the mesh Moorhen's C++ (`metaballs/metaballs.cc`,
`GenerateMeshFromPoints`, grid 0.2 Å, iso level 1.8, one thread) makes from the first 16
non-water atoms of `tests/test_data/1df7.pdb`. Each atom has radius 0.67 × size / 1.7 in float32,
with sizes C 1.7, N 1.55, O 1.52, S 1.8 and colours as in `cases/metaballs.case.ts`.

The file holds, little-endian:
- `u32` vertex count, index count and influence count;
- positions (`f32` ×3), normals (×3) and colours (×4) per vertex;
- `u32` indices;
- the influences as CSR: `u32` end offset per vertex, then `u32` atoms and `f32` weights.

If `metaballs.cc` changes on purpose, regenerate it from `baby-gru` with the programs in
`reference/metaballs-cpp`:

```
c++ -O2 -std=c++17 -I ../metaballs -o /tmp/metaballsReference \
    tests/gpu/reference/metaballs-cpp/metaballsReference.cc ../metaballs/metaballs.cc -lpthread
node tests/gpu/reference/metaballs-cpp/makePoints.mjs tests/test_data/1df7.pdb 16 /tmp/points.bin
/tmp/metaballsReference /tmp/points.bin /tmp/mesh.bin
gzip -9 -c /tmp/mesh.bin > tests/gpu/data/metaballs-1df7-first16.cpp.bin.gz
```
