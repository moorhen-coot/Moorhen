# WebGPU in Moorhen

Everything WebGPU lives here. WebGPU draws the main view wherever the browser offers it
(`components/webMG/MoorhenWebGPUMainView.tsx`), and makes a new device if the old one is lost;
WebGL is the fallback, and still takes the input (mouse, keyboard, touch) and runs the frame loop.
While WebGPU draws, maps are contoured here on the GPU instead of by Coot.

```
gpu/            shared infrastructure: the device, flag constants, compute helpers, scan, timer
previewRenderer.ts, previewScene.ts, previewShaders.ts
                the WebGPU renderer (the names are from when it was a preview)
depthPeel.ts, effectPasses.ts, shadowMap.ts, depthBlur.ts, anaglyphCombine.ts
                its passes: transparency, ambient occlusion and edges, shadows, depth blur, anaglyph
textLayer.ts, overlayLines.ts, texturedShapes.ts, surfaceTextures.ts, snapshotTiles.ts
                labels, overlays, textured shapes, mesh textures, tiled snapshots
instanceApi.ts, rendererReport.ts, buildMode.ts
                `moorhenInstance.webGPU`: who draws the main view, snapshots, the renderer report
mapContour/     map contours made and drawn on the GPU (a worked example of a compute module)
metaballs/      MetaBalls surfaces made on the GPU, read back for the normal draw path
```

Tests: CPU-side logic in `tests/__tests__` (Jest); GPU work in `tests/gpu` (Playwright, real
WebGPU; `npm run test:gpu`). See "Testing" below.

## The device: `gpu/context.ts`

There is **one** device per page. Get it with `await getGpuContext()`, never with
`requestAdapter`/`requestDevice` of your own. GPU buffers cannot move between devices, so a mesh
made on any other device could not be drawn by the renderer without a trip through the CPU.

The context asks for the adapter's largest `maxBufferSize` and `maxStorageBufferBindingSize`, and
for `timestamp-query` when offered. If you need another limit or
feature, add it there, conditionally on the adapter having it, and handle its absence.

If the device is lost, `context.lost` settles and the next `getGpuContext()` makes a new one. A
module that keeps GPU objects between calls should listen to `lost` and drop them (see
`sharedGpuMetaBalls` in `metaballs/index.ts`). Never call `device.destroy()`.

## Writing a compute module

Use `mapContour/` as the model. It is small, it is checked against a CPU reference in
`tests/gpu`, and it shows input from Coot, output that stays on the GPU, and no waiting.

1. **Kernels.** WGSL in TypeScript template strings, tagged `/* wgsl */` (the "WGSL Literal" VS
   Code extension highlights them). Share snippets by concatenation (`COMMON + FIELD_AT + ...`),
   and export each finished kernel as a constant whose name ends in `_WGSL`. The compilation test
   picks it up (add the module to `SOURCES` in `tests/gpu/cases/shaders.case.ts` once).
2. **Compile** with `ComputeKernel.create(device, { label, code, workgroupSize })`, in parallel
   (`Promise.all`), once per device, and keep the kernels.
3. **Dispatch** with `kernel.dispatch(encoder, { groups: [[params], [buf0, buf1, ...]], items })`:
   one thread per item, workgroups folded into rows past 65535. In WGSL, take the item number
   from `itemIndexWgsl(workgroupSize)` and **return if it is past the item count**: a folded
   dispatch runs a few extra workgroups. With `layout: "auto"` a bind group holds only the
   bindings the entry point actually uses, so pass exactly those, in binding order.
4. **Offsets.** Count, scan (`GpuScan`), emit: the usual way to write variable-length output
   without atomics, deterministic and in order. `mapContour` scans per-thread runs of 8 items to
   cut the scan by 8.
5. **Buffers.** `createBuffer(device, label, bytes, usage, data?)`; usage flags from
   `gpu/constants.ts` (`BufferUsage.STORAGE | ...`). Grow work buffers by a margin (×1.25) and
   keep them between calls.

### The rules

These are the things that have cost time so far.

- **Do not wait on the GPU in the middle of work.** Every `mapAsync` or `onSubmittedWorkDone`
  waits until the GPU is idle, and Firefox only checks every 100 ms. Size outputs by estimate,
  keep running totals on the GPU, and read sizes back *after* (in the background), remaking
  the work if the estimate was short. `mapContour` and `metaballs` both do this.
- **Indirect draws** (`drawIndexedIndirect`/`drawIndirect`) let a kernel set the draw's size, so
  the CPU never needs to know it.
- **Guard every write.** Out-of-bounds writes in WGSL are not dropped; they may be clamped onto
  the last element. Check against the room you allocated (`P.caps` in `mapContour`).
- **Workgroup memory and barriers cost more than they seem.** WebGPU zeroes workgroup memory
  when each workgroup starts, and Firefox appears to do it with one thread. Use few workgroups
  that loop (`GpuScan`), or none. Software GPUs (SwiftShader, the tests' GPU on Linux) pay heavily
  for barriers.
- **Integer division and remainder are slow** on GPUs. Avoid them in inner loops.
- **float32 only.** Coot works in double; compare with tolerances, not equality.
- **Atomics make output order nondeterministic.** Fine for a fixed-point sum, awkward for output
  you want to compare with a reference.
- **Errors.** Wrap work whose failure you will handle in `withErrorScope` (or push and pop scopes
  yourself, as `metaballs` does), and fall back. Errors outside scopes are logged by the context.
- **Timing.** `GpuSpanTimer` (timestamp queries) gives GPU time for a span of passes, read in the
  background. Timestamps are quantised (Chrome: 0.1 ms) and work from separate submissions can
  overlap, so read means of many, not single values.

## What a producer hands over

There are two ways a mesh can leave a compute module. Choose by who needs the mesh.

| | Arrays → `DisplayBuffer` | GPU-resident → `PreviewGpuDraw` |
|---|---|---|
| Example | `metaballs/` | `mapContour/` |
| Drawn by | both renderers | the WebGPU renderer only |
| Picking, export | yes (CPU-side) | not yet (needs a read-back) |
| Cost | one read-back per mesh | none |

Arrays: `Float32Array` positions and normals (xyz per vertex), colours (rgba), `Uint32Array`
triangle indices. Wound and with normals the way the worker's `PickableMeshPerm` conversion
leaves them (front faces lit, normals outwards); see `metaballs/metaballsMeshData.ts`.

GPU-resident: on the shared device, buffers with `STORAGE` plus the usage the draw needs:
- positions and normals packed `vec3<f32>` (12 bytes a vertex; `VERTEX`);
- `u32` triangle indices (`INDEX`);
- for the line styles, `u32` pairs of vertex indices, one pair per edge of the surface (`lines`),
  read by the thick-line shader;
- the draw arguments in a buffer with `INDIRECT`: `drawIndexedIndirect`'s five words for the
  surface, and `drawIndirect`'s four for thick lines (6 vertices per line).

See `PreviewGpuDraw` in `previewRenderer.ts` and `GpuContourBuffers` in `mapContour/`.

## Getting data from Coot

Without touching C++ (all through the Coot worker, `commandCentre.cootCommand`):
- **A map's whole unit cell:** `shim_get_map_unit_cell_grid` → `{ nu, nv, nw, orth, isEM, data }`
  (see `mapContour/gpuMapLayer.ts`). Coot recalculates updating maps lazily; `MoorhenMap`
  makes it catch up before a fetch (`bringUpdatingMapsUpToDate`).
- **Atoms as spheres** (position, radius, colour): what MetaBalls uses
  (`metaballs/metaballsMeshData.ts`, `metaballsInputFromSpheres`).
- **Coordinates** via gemmi in the browser, for anything else.

A new kind of data means a wrapper in `wasm_src/moorhen-wrappers-helpers.h` and a WASM rebuild:
Moorhen's own wrappers, not Coot's internals.

## Testing

- **CPU-side logic** (grids, boxes, layouts, hand-over of arrays) in `tests/__tests__/*.test.ts`,
  run by Jest with everything else.
- **GPU work** in `tests/gpu`: each test runs a small *case* module in a real browser with real
  WebGPU and compares with a CPU reference, in the page. `npm run test:gpu`. See
  `tests/gpu/README.md` for how cases work and how to add one.

A new compute module should come with a case comparing it with a plain CPU implementation of the
same thing, on input small enough to run in seconds on a software GPU. Then break your kernel on
purpose once and check that the test notices.
