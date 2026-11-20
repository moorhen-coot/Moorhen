/**
 * The smooth surface benchmark's report (surfaceBenchmark.ts runs it): what was measured, and the
 * text a tester pastes back. Without the browser, so that it can be tested.
 */
import type { FrameTiming } from "../WebGPUComponents/instanceApi";

/** The ways of shading a smooth surface, cheapest first. */
export const SURFACE_MODES = ["per vertex", "pixel normals", "pixel normals+colour"] as const;
export type SurfaceMode = (typeof SURFACE_MODES)[number];

export interface SurfaceBenchmarkCase {
    mode: SurfaceMode;
    /** The whole molecule in view, or close up: the surface over the whole canvas. */
    view: "whole" | "close-up";
    opacity: number;
    /** What the surfaces were actually drawn with: a mode can be refused (no GPU finish, say). */
    applied: { pixelNormals: boolean; pixelColour: boolean };
    triangles: number;
    peelLayers: number;
    timing: FrameTiming;
}

export interface SurfaceBenchmarkFacts {
    /** The renderer report's line (rendererReport.ts): browser, OS, adapter, canvas. */
    machine: string;
    molecules: { name: string; atoms: number | null }[];
    surfaces: number;
    /** A surface was shown for the run, none being shown. */
    surfaceAdded: boolean;
    canvas: { width: number; height: number };
    cases: SurfaceBenchmarkCase[];
    seconds: number;
}

const ms = (t: number | null): string => t === null ? "-" : t.toFixed(1);
const pad = (text: string, width: number): string => text.length >= width ? text : text + " ".repeat(width - text.length);
const padLeft = (text: string, width: number): string => text.length >= width ? text : " ".repeat(width - text.length) + text;
const count = (n: number): string => n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(0)}k` : `${n}`;

/** A case's cost: the GPU's time where it was timed, else the time to the GPU being idle. */
export const caseCost = (c: SurfaceBenchmarkCase): number | null => c.timing.gpuMs ?? c.timing.idleMs;

/** The report, as plain text to paste: a header, then a table, one row a case. */
export function formatSurfaceBenchmark(f: SurfaceBenchmarkFacts): string {
    const lines = [
        "Moorhen smooth surface benchmark",
        f.machine,
        `Structures: ${f.molecules.map(m => m.atoms === null ? m.name : `${m.name} (${m.atoms} atoms)`).join(", ") || "none"}; `
            + `${f.surfaces} surface${f.surfaces === 1 ? "" : "s"}${f.surfaceAdded ? " (shown for the run)" : ""}; `
            + `canvas ${f.canvas.width}x${f.canvas.height}; ${Math.round(f.seconds)} s`,
        "frame: between frames as shown (capped by the display); GPU: timestamp queries; to idle: drawn and waited for; "
            + "cost: GPU (or to idle) against per vertex in the same view and opacity",
        "",
    ];
    const header = [pad("mode", 21), pad("view", 9), pad("opacity", 8), padLeft("tris", 6), padLeft("peel", 5),
        padLeft("frame ms", 9), padLeft("worst", 6), padLeft("GPU ms", 7), padLeft("to idle", 8), padLeft("cost", 6)];
    lines.push(header.join(" "));
    for (const c of f.cases) {
        const base = f.cases.find(b => b.mode === "per vertex" && b.view === c.view && b.opacity === c.opacity);
        const cost = caseCost(c), baseCost = base ? caseCost(base) : null;
        const relative = c.mode === "per vertex" ? "1x" : cost !== null && baseCost ? `${(cost / baseCost).toFixed(1)}x` : "-";
        const refused = (c.mode !== "per vertex" && !c.applied.pixelNormals) || (c.mode === "pixel normals+colour" && !c.applied.pixelColour);
        lines.push([
            pad(c.mode + (refused ? "*" : ""), 21), pad(c.view, 9), pad(c.opacity === 1 ? "opaque" : String(c.opacity), 8),
            padLeft(count(c.triangles), 6), padLeft(String(c.peelLayers), 5),
            padLeft(ms(c.timing.medianMs), 9), padLeft(ms(c.timing.worstMs), 6), padLeft(ms(c.timing.gpuMs), 7),
            padLeft(ms(c.timing.idleMs), 8), padLeft(relative, 6),
        ].join(" "));
    }
    if (f.cases.some(c => (c.mode !== "per vertex" && !c.applied.pixelNormals) || (c.mode === "pixel normals+colour" && !c.applied.pixelColour))) {
        lines.push("", "* not drawn that way here (no GPU finish, a software adapter, or a colouring per-pixel colour does not do): per vertex instead");
    }
    return lines.join("\n");
}
