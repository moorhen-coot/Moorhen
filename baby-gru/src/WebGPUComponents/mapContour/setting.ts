/**
 * The dev-menu switch for map contours made on the GPU. Its own module so that MoorhenMap can read
 * it without pulling in any GPU code.
 *
 * On: Coot is not asked to contour maps and nothing is drawn for them in the WebGL view; the
 * WebGPU preview contours and draws them instead, from each map's whole unit cell held on the GPU.
 */
export const gpuMapContourSetting = { enabled: false };

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
