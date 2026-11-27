/**
 * The smooth surface benchmark: how fast this machine draws molecular surfaces in the WebGPU main
 * view, shaded per vertex and per pixel, for a tester to paste back (the Dev menu's "Surface
 * benchmark").
 *
 * On the structures loaded, with their molecular surfaces (or, if none is shown, the first
 * molecule's, shown for the run), it times frames of each way of shading - per vertex (the split
 * surface), normals per pixel from the field, normals and colour per pixel - opaque and half
 * transparent (depth peeled), with the whole molecule in view and close up (the surface over the
 * whole canvas: the per-pixel cost at its largest). Everything is put back as it was afterwards:
 * the settings, the opacities, the camera, the surfaces.
 *
 * The run is here; the text in surfaceBenchmarkReport.ts, without the browser, so that it can be tested.
 */
import { formatRendererReport } from "../WebGPUComponents/rendererReport";
import { smoothSurfaceSetting } from "./smoothSurface";
import { M2T_SURFACE_REPRESENTATIONS } from "./enums";
import { setDoClip, setOrigin, setQuat, setUseSmoothSurface, setZoom } from "../store";
import type { MoorhenInstance } from "../InstanceManager/MoorhenInstance";
import type { MoorhenMolecule } from "./MoorhenMolecule";
import { SURFACE_MODES, type SurfaceBenchmarkCase, type SurfaceBenchmarkFacts, type SurfaceMode } from "./surfaceBenchmarkReport";

export { formatSurfaceBenchmark } from "./surfaceBenchmarkReport";
export type { SurfaceBenchmarkCase, SurfaceBenchmarkFacts, SurfaceMode } from "./surfaceBenchmarkReport";

/** Waits `n` animation frames. */
const frames = async (n: number) => {
    for (let i = 0; i < n; i++) await new Promise(resolve => requestAnimationFrame(resolve));
};

/** The close-up's zoom, of the whole molecule's: the surface over the whole canvas. */
const CLOSE_UP = 0.4;

/** The settings each mode is drawn with: per vertex on the split surface, per pixel on the whole one. */
const MODE_SETTINGS: Record<SurfaceMode, { fieldShading: boolean; pixelColours: boolean; refine: boolean }> = {
    "per vertex": { fieldShading: false, pixelColours: false, refine: true },
    "pixel normals": { fieldShading: true, pixelColours: false, refine: false },
    "pixel normals+colour": { fieldShading: true, pixelColours: true, refine: false },
};

export interface SurfaceBenchmarkOptions {
    /** Frames timed one an animation frame, and drawn to idle, a case (defaults 40 and 15). */
    frames?: number;
    idleFrames?: number;
    /** Most time either loop runs a case, ms (default 3000): a slow machine finishes too. */
    maxMs?: number;
    /** Told what is being measured, as it goes. */
    onProgress?: (text: string) => void;
}

type SurfaceRepresentation = MoorhenMolecule["representations"][number];

/**
 * Runs the benchmark and returns what it found. Rejects if the WebGPU main view is not drawing or
 * nothing is loaded; puts back what it changed either way.
 */
export async function runSurfaceBenchmark(instance: MoorhenInstance, options: SurfaceBenchmarkOptions = {}): Promise<SurfaceBenchmarkFacts> {
    if (running) throw new Error("it is already running");
    running = true;
    try {
        return await run(instance, options);
    } finally {
        running = false;
    }
}

/** One run at a time: a second would change the settings the first is measuring. */
let running = false;

async function run(instance: MoorhenInstance, options: SurfaceBenchmarkOptions): Promise<SurfaceBenchmarkFacts> {
    const started = performance.now();
    const progress = options.onProgress ?? (() => {});
    const main = instance.webGPU.mainView();
    if (!main.drawing) {
        throw new Error(`the WebGPU main view is not drawing (${main.webGLReason ?? "switched off or unavailable"}): per-pixel shading is WebGPU's`);
    }
    const molecules = instance.getMoleculeList();
    if (molecules.length === 0) throw new Error("no structure loaded: load one (a large one shows the most), then run it again");

    const store = instance.store;
    const state = store.getState();
    const saved = {
        smooth: state.generalStates.useSmoothSurface,
        settings: {
            gpu: smoothSurfaceSetting.gpu, fieldShading: smoothSurfaceSetting.fieldShading, pixelColours: smoothSurfaceSetting.pixelColours,
            refine: smoothSurfaceSetting.refine,
        },
        origin: [...state.sceneSettings.origin] as [number, number, number],
        zoom: state.sceneSettings.zoom,
        quat: [...state.glRef.quat],
        clip: state.sceneSettings.doClip,
    };
    const surfaces = () => molecules.flatMap(molecule => molecule.representations
        .filter(r => M2T_SURFACE_REPRESENTATIONS.includes(r.style) && r.visible));
    let added: SurfaceRepresentation | null = null;
    const opacities = new Map<SurfaceRepresentation, number>();
    // The surfaces' own triangles (the scene's other meshes left out).
    const surfaceTriangles = () => surfaces().reduce((sum, r) => sum + (r.buffers ?? []).reduce((n, b) =>
        n + (b.triangleIndexs ?? []).reduce((m, indices, j) => m + (b.bufferTypes?.[j] === "TRIANGLES" ? (indices?.length ?? 0) / 3 : 0), 0), 0), 0);
    const redrawAll = async () => {
        for (const representation of surfaces()) await representation.redraw();
    };
    const cases: SurfaceBenchmarkCase[] = [];
    let surfaceCount = 0;
    try {
        if (!saved.smooth) store.dispatch(setUseSmoothSurface(true));
        // Nothing clipped: the whole surface in the whole view, and close up the surface over the
        // canvas rather than the slab the clip planes would cut from it.
        store.dispatch(setDoClip(false));
        smoothSurfaceSetting.gpu = true;
        if (surfaces().length === 0) {
            progress(`showing ${molecules[0].name}'s molecular surface`);
            added = await molecules[0].show("MolecularSurface");
        }
        surfaces().forEach(r => opacities.set(r, r.nonCustomOpacity));
        surfaceCount = opacities.size;
        const fitted = async () => {
            await molecules[0].centreOn("/*/*/*/*", false, true);
            return store.getState().sceneSettings.zoom;
        };
        const wholeZoom = await fitted();
        for (const mode of SURFACE_MODES) {
            progress(`${mode}: making the surfaces`);
            Object.assign(smoothSurfaceSetting, MODE_SETTINGS[mode]);
            await redrawAll();
            const buffers = surfaces().flatMap(r => r.buffers ?? []);
            // A surface keeps its field however it is drawn: what is drawn is the settings' say.
            const pixelNormals = smoothSurfaceSetting.fieldShading && buffers.some(b => !!b.fieldShading?.[0]);
            const applied = {
                pixelNormals,
                pixelColour: pixelNormals && smoothSurfaceSetting.pixelColours && buffers.some(b => !!b.fieldShading?.[0]?.colouring),
            };
            for (const opacity of [1, 0.5]) {
                surfaces().forEach(r => r.setNonCustomOpacity(opacity));
                for (const view of ["whole", "close-up"] as const) {
                    progress(`${mode}, ${opacity === 1 ? "opaque" : "half transparent"}, ${view}`);
                    store.dispatch(setZoom(view === "whole" ? wholeZoom : wholeZoom * CLOSE_UP));
                    await frames(3);
                    const timing = await instance.webGPU.timeFrames({
                        frames: options.frames ?? 40, idleFrames: options.idleFrames ?? 15, maxMs: options.maxMs ?? 3000,
                    });
                    const last = instance.webGPU.mainView().lastFrame;
                    cases.push({ mode, view, opacity, applied, triangles: surfaceTriangles(), peelLayers: last?.peelLayers ?? 0, timing });
                }
            }
        }
    } finally {
        progress("putting things back");
        Object.assign(smoothSurfaceSetting, saved.settings);
        opacities.forEach((opacity, representation) => representation.setNonCustomOpacity(opacity));
        if (added) added.hide();
        if (!saved.smooth) store.dispatch(setUseSmoothSurface(false));
        await redrawAll();
        store.dispatch(setOrigin(saved.origin));
        store.dispatch(setZoom(saved.zoom));
        store.dispatch(setQuat(saved.quat));
        store.dispatch(setDoClip(saved.clip));
    }
    const atoms = await Promise.all(molecules.map(async molecule => {
        try {
            return await molecule.getNumberOfAtoms();
        } catch {
            return null;
        }
    }));
    const machine = await instance.webGPU.reportFacts({ frames: 0, mapWalk: 0 });
    return {
        machine: formatRendererReport(machine),
        molecules: molecules.map((molecule, i) => ({ name: molecule.name, atoms: atoms[i] })),
        surfaces: surfaceCount,
        surfaceAdded: !!added,
        canvas: machine.canvas,
        cases,
        seconds: (performance.now() - started) / 1000,
    };
}
