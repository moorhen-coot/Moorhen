/**
 * The smooth surface code as the Coot worker loads it: bundled by esbuild into
 * public/MoorhenAssets/wasm/SmoothSurface.js (npm run build-smooth-surface-worker) as the global
 * MoorhenSmoothSurface, which CootWorker.ts imports with importScripts. CootWorker.ts is compiled
 * on its own by tsc, without a bundler, so it cannot import this module directly.
 */
export {
    assembleSmoothMesh, contourOnCpu, logSmoothing, m2tShell, smoothAttributes, smoothFieldStage, smoothM2tSurfaceSync,
    smoothMeshFromContour, smoothedMeshTransferables, unpackAtoms,
} from "./smoothSurface";
