/**
 * Whether maps are contoured on the GPU. Its own module so that MoorhenMap can read it without
 * pulling in any GPU code.
 *
 * Maps are contoured on the GPU exactly while WebGPU draws the main view and its GPU map layer is
 * working (`active`, set by MoorhenWebGPUMainView), unless the dev menu says not to (`wanted`).
 * Then Coot is not asked to contour maps and nothing is drawn for them in the WebGL view;
 * WebGPU contours and draws them instead, from each map's whole unit cell held on the GPU. At any
 * other time - WebGL drawing, for good or for a moment (the shadow map debug view, a recording of
 * the WebGL canvas, a lost device being replaced) - Coot contours them, as before.
 *
 * `enabled` is the outcome, which MoorhenMap and the GPU map layer read.
 */
export const gpuMapContourSetting = { enabled: false, active: false, wanted: true };

/** The map contour settings that decide a map's style (state.mapContourSettings). */
export interface MapStyleSettings {
    mapStyles?: readonly { molNo: number; style: string }[];
    defaultMapLitLines?: boolean;
    defaultMapSurface?: boolean;
}

/** How a map is drawn: its own style if it has one, else the default, as MoorhenMapManager decides. */
export function mapStyleOf(settings: MapStyleSettings | undefined, molNo: number): string {
    return settings?.mapStyles?.find(item => item.molNo === molNo)?.style
        ?? (settings?.defaultMapLitLines ? "lit-lines" : settings?.defaultMapSurface ? "solid" : "lines");
}

const modeListeners = new Set<() => void>();

/**
 * Bring `enabled` in line with `active` and `wanted` after either changed, and tell the listeners
 * (onGpuMapContoursChanged) if it changed: the map display driver then takes Coot's contours off
 * when maps move to the GPU, and has Coot contour the visible maps again when they move back.
 */
export function applyGpuMapContours(): void {
    const enabled = gpuMapContourSetting.active && gpuMapContourSetting.wanted;
    if (enabled === gpuMapContourSetting.enabled) return;
    gpuMapContourSetting.enabled = enabled;
    modeListeners.forEach(listener => listener());
}

/** Be told when `gpuMapContourSetting.enabled` changes. Returns the unsubscribe. */
export function onGpuMapContoursChanged(listener: () => void): () => void {
    modeListeners.add(listener);
    return () => { modeListeners.delete(listener); };
}

const dataListeners = new Set<() => void>();

/**
 * Called by MoorhenMap.markDataChanged: some map's data may have changed in Coot, so a GPU copy
 * of it is out of date. The GPU contours check each map's dataRevision on their next frame; this
 * only makes sure there is one.
 */
export function notifyMapDataChanged(): void {
    dataListeners.forEach(listener => listener());
}

/** Be told of notifyMapDataChanged. Returns the unsubscribe. */
export function onMapDataChanged(listener: () => void): () => void {
    dataListeners.add(listener);
    return () => { dataListeners.delete(listener); };
}
