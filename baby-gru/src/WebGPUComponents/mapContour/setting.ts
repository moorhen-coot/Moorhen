/**
 * The dev-menu switch for map contours made on the GPU. Its own module so that MoorhenMap can read
 * it without pulling in any GPU code.
 *
 * On: Coot is not asked to contour maps and nothing is drawn for them in the WebGL view; the
 * WebGPU preview contours and draws them instead, from each map's whole unit cell held on the GPU.
 */
export const gpuMapContourSetting = { enabled: false };
