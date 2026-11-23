/**
 * How finely shadows are resolved, named the way the mesh settings are.
 *
 * Measured on 1ibm drawn as ribbons, with GPU timer queries in Chrome: 9.1 ms a frame at 2048,
 * 10.5 at 4096, 17.6 at 8192. The step to 4096 is nearly free because the shadow pass is still
 * dominated by vertex work; by 8192 fill has taken over and the cost is close to linear in
 * texels. 16384 measured 75.8 ms - eight times coarse, for no visible gain over 8192 - so it is
 * deliberately not offered.
 */
export type ShadowMapQuality = "coarse" | "nice" | "smooth";

/** Edge length of the shadow map for each quality. Still bounded by what the hardware allows. */
export const SHADOW_MAP_TEXELS: Record<ShadowMapQuality, number> = {
    coarse: 2048,
    nice: 4096,
    smooth: 8192,
};
