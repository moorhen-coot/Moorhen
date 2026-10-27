/**
 * WGSL for the WebGPU preview: lit, fogged triangles, plain and instanced, and thick lines.
 *
 * A transcription of the parts of webgl-2/triangle-vertex-shader.js,
 * triangle-instanced-vertex-shader.js and triangle-fragment-shader.js that apply with shadows,
 * SSAO, edge detection, hover highlighting and depth peeling all off. Textured meshes (base
 * colour, normal and metallic-roughness maps) have entry points of their own: fs_textured. Keep the lighting
 * in step with the fragment shader there, or the two views will drift apart in ways that look
 * like bugs in whichever one is newer.
 *
 * Perfect spheres follow twodshapes-vertex-shader.js and perfect-sphere-fragment-shader.js: a
 * quad per sphere facing the viewer, shaded and given the depth of a sphere in the fragment
 * shader. Their lighting is not the triangles': see fs_sphere.
 *
 * Thick lines follow thick-lines-vertex-shader.js (unlit, with lines-fragment-shader.js) and
 * thick-lines-normal-vertex-shader.js (lit), but build their quads in the vertex shader from the
 * GPU's own buffers, where WebGL has them built on the CPU (linesToThickLinesWithIndices).
 *
 * Text (TEXT_WGSL) follows text-vertex-shader.js and text-fragment-shader.js.
 *
 * Depth peeling (depthPeel.ts) draws the transparent geometry through *_peel entry points: the
 * same colour, kept only if it is in front of the opaque scene at one of its samples at least and
 * behind the previous layer (peelKeep).
 *
 * Frame must match the packing in previewScene.ts (frameUniforms, FRAME_FLOATS).
 */

/** The per-frame uniforms, at group 0, shared by every pipeline the renderer draws a frame with. */
export const FRAME_WGSL = /* wgsl */ `
struct Frame {
    projection: mat4x4f,
    view: mat4x4f,
    lightDir: vec4f,     // model space, normalised
    eyeDir: vec4f,       // model space
    ambient: vec4f,
    diffuse: vec4f,
    specular: vec4f,
    fogColour: vec4f,
    params: vec4f,       // fog start, fog end, specular power, sphere clip caps (1 or 0)
    rightDir: vec4f,     // the screen's right, in model space
    upDir: vec4f,        // the screen's up, in model space
    clipPlane0: vec4f,   // front clip plane, eye space
    clipPlane1: vec4f,   // back clip plane, eye space
    effects: vec4f,      // 1 where the frame has them: ambient occlusion, edges, shadows; edge map texels a pixel
    effectsArea: vec4f,  // where this target's pixels are in the effects maps (x, y), and 1 / the maps' size
    shadowMatrix: mat4x4f, // model space to the shadow map: x, y in 0..1 (rows down), z the depth
    shadowParams: vec4f, // the map's texel size (x, y), the depth bias, 1 for the 8 x 8 soft lookup
    fog: vec4f,          // x: 1 to fade into nothing with distance rather than into fogColour (a
                         // transparent snapshot: the picture is premultiplied, on nothing)
};

@group(0) @binding(0) var<uniform> frame: Frame;
`;

export const PREVIEW_WGSL = FRAME_WGSL + /* wgsl */ `
struct Draw {
    colour: vec4f,       // used when the colour comes from a uniform (customColour)
    params: vec4f,       // alpha multiplier (an object fade), thick lines' half width (Å) or
                         // every sphere's radius (a hover highlight; 0 for their own),
                         // 1 to colour everything copyColour (a grey symmetry copy),
                         // segments' colour: 0 their first vertex's, 1 each end's own, 2 draw.colour
    copyColour: vec4f,
    model: mat4x4f,      // where this copy goes: a symmetry operator, or identity for the original
                         // (or, while it is dragged, its drag)
    ambient: vec4f,      // w = 1: this ambient light instead of the frame's (the drag's pulse)
    output: vec4f,       // x: 1 where the pipeline writes its colour as it is (opaque), 0 where it
                         // blends it over what is there (transparent, or into a peel layer)
};

fn ambientLight() -> vec4f {
    return select(frame.ambient, vec4f(draw.ambient.xyz, 1.0), draw.ambient.w > 0.5);
}

@group(1) @binding(0) var<uniform> draw: Draw;

// The effects maps (effectPasses.ts), read at the fragment's pixel; 1 x 1 white stand-ins when the
// frame has none, and the flags in frame.effects say so too. For a tile of a snapshot the maps
// cover the tile and a margin round it, so the pixel is offset into them.
@group(0) @binding(1) var aoMap: texture_2d<f32>;
@group(0) @binding(2) var edgeMap: texture_2d<f32>;
@group(0) @binding(3) var effectSampler: sampler;
@group(0) @binding(4) var shadowMap: texture_depth_2d;
@group(0) @binding(5) var shadowSampler: sampler_comparison;

// How lit a point is by the light, 0 to 1, from where it lands in the shadow map: the lookup in
// triangle-fragment-shader.js, one 2 x 2 compare, or (snapshots, as WebGL's screenshots) 64 of
// them a texel apart. 1 without shadows.
fn shadowAt(p: vec4f) -> f32 {
    if (frame.effects.z < 0.5) { return 1.0; }
    let depth = p.z - frame.shadowParams.z;
    if (frame.shadowParams.w < 0.5) {
        return textureSampleCompareLevel(shadowMap, shadowSampler, p.xy, depth);
    }
    var lit = 0.0;
    for (var y = -3.5; y <= 3.5; y += 1.0) {
        for (var x = -3.5; x <= 3.5; x += 1.0) {
            lit += textureSampleCompareLevel(shadowMap, shadowSampler, p.xy + vec2f(x, y) * frame.shadowParams.xy, depth);
        }
    }
    return lit / 64.0;
}

// WebGL's use of it: in shadow (under a half), the light is dimmed to the shadow plus a half and
// the highlight dropped; otherwise the highlight is added. A back face, flat, is just scaled.
fn shaded(light: vec4f, specular: vec4f, shadow: f32) -> vec4f {
    return select(light + specular, light * min(shadow + 0.5, 1.0), shadow < 0.5);
}

fn backShade(shadow: f32) -> f32 {
    return select(shadow, min(shadow + 0.5, 1.0), shadow < 0.5);
}

// Depth peeling (depthPeel.ts): the opaque scene's depth, multisampled as it was drawn, and the
// depth of the layer before this one (cleared to 0 for the first). 1 x 1 stand-ins otherwise.
@group(0) @binding(6) var opaqueDepth: texture_depth_multisampled_2d;
@group(0) @binding(7) var previousLayer: texture_depth_2d;

// Whether a transparent fragment at this depth belongs in this layer, as the peel test in
// triangle-fragment-shader.js decides it: not behind the opaque scene - here, not behind it at
// every one of its samples, so a fragment at an opaque silhouette is kept for the samples it shows
// in, and the composite sorts out which - and not at or in front of the previous layer.
fn peelKeep(fragCoord: vec4f, depth: f32) -> bool {
    let p = vec2i(fragCoord.xy);
    let z = clamp(depth, 0.0, 1.0);
    var farthest = 0.0;
    for (var i = 0u; i < textureNumSamples(opaqueDepth); i++) {
        farthest = max(farthest, textureLoad(opaqueDepth, p, i));
    }
    if (z >= farthest) { return false; }
    let previous = textureLoad(previousLayer, p, 0);
    return !(z <= previous || abs(z - previous) < 1e-6);
}

// Ambient occlusion at this pixel: what triangle-fragment-shader.js multiplies its ambient and
// diffuse light by (SSAOMap). 1 without it.
fn occlusionAt(fragCoord: vec4f) -> f32 {
    if (frame.effects.x < 0.5) { return 1.0; }
    // Half size: a texel for every 2 x 2 pixels, from the corner.
    let uv = (fragCoord.xy + frame.effectsArea.xy) * 0.5 / vec2f(textureDimensions(aoMap));
    return textureSampleLevel(aoMap, effectSampler, uv, 0.0).r;
}

// The edge map, bilinearly, at a point in pixels of the effects area. The map has frame.effects.w
// texels a pixel (2 for an ordinary view: effectPasses.ts), so at a pixel's centre this is the
// average of the 2 x 2 texels under it - WebGL's finer edges filtered down, as WebGL reads its own.
// Worked out from texel positions rather than sampled at a 0..1 coordinate: every pixel centre
// falls exactly between texels, where a coordinate rounded differently in another tile of a
// snapshot would tip the weights, and the tiles would not join.
fn edgeMapAt(pos: vec2f) -> f32 {
    let size = vec2i(textureDimensions(edgeMap));
    let t = pos * frame.effects.w - 0.5;
    let i = vec2i(floor(t));
    let f = t - floor(t);
    let a = textureLoad(edgeMap, clamp(i, vec2i(0), size - 1), 0).r;
    let b = textureLoad(edgeMap, clamp(i + vec2i(1, 0), vec2i(0), size - 1), 0).r;
    let c = textureLoad(edgeMap, clamp(i + vec2i(0, 1), vec2i(0), size - 1), 0).r;
    let d = textureLoad(edgeMap, clamp(i + vec2i(1, 1), vec2i(0), size - 1), 0).r;
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// The edge factor at this pixel, 0 on an edge and 1 elsewhere, antialiased as WebGL reads its edge
// map: through the FXAA filter of fxaa.js, on one channel. 1 without edges.
fn edgeAt(fragCoord: vec4f) -> f32 {
    if (frame.effects.y < 0.5) { return 1.0; }
    let p = fragCoord.xy + frame.effectsArea.xy;
    let nw = edgeMapAt(p + vec2f(-1.0, -1.0));
    let ne = edgeMapAt(p + vec2f(1.0, -1.0));
    let sw = edgeMapAt(p + vec2f(-1.0, 1.0));
    let se = edgeMapAt(p + vec2f(1.0, 1.0));
    let m = edgeMapAt(p);
    // Luma of a grey is the grey.
    let lumaMin = min(m, min(min(nw, ne), min(sw, se)));
    let lumaMax = max(m, max(max(nw, ne), max(sw, se)));
    // Along the edge: perpendicular to the gradient, whichever way y runs.
    var dir = vec2f(-((nw + ne) - (sw + se)), (nw + sw) - (ne + se));
    let dirReduce = max((nw + ne + sw + se) * (0.25 / 8.0), 1.0 / 128.0);
    let rcpDirMin = 1.0 / (min(abs(dir.x), abs(dir.y)) + dirReduce);
    dir = clamp(dir * rcpDirMin, vec2f(-8.0), vec2f(8.0));
    let a = 0.5 * (edgeMapAt(p + dir * (1.0 / 3.0 - 0.5)) + edgeMapAt(p + dir * (2.0 / 3.0 - 0.5)));
    let b = a * 0.5 + 0.25 * (edgeMapAt(p - dir * 0.5) + edgeMapAt(p + dir * 0.5));
    return select(b, a, b < lumaMin || b > lumaMax);
}

struct VOut {
    @builtin(position) position: vec4f,
    @location(0) colour: vec4f,
    @location(1) normal: vec3f,
    @location(2) eyeDistance: f32,
    // Where this is in the shadow map (shadowAt).
    @location(5) shadowPos: vec4f,
};

fn finish(world: vec4f, normal: vec3f, colour: vec4f) -> VOut {
    var out: VOut;
    // A symmetry copy is lit as if the operator had moved the mesh, as applySymmetryMatrix does
    // by turning the light and eye into the copy's frame.
    let eye = frame.view * (draw.model * world);
    out.position = frame.projection * eye;
    out.colour = select(colour, draw.copyColour, draw.params.z > 0.5);
    out.normal = (draw.model * vec4f(normal, 0.0)).xyz;
    out.eyeDistance = abs(eye.z / eye.w);
    out.shadowPos = frame.shadowMatrix * (draw.model * world);
    return out;
}

@vertex
fn vs_mesh_vertex_colour(@location(0) position: vec3f, @location(1) normal: vec3f,
                         @location(2) colour: vec4f) -> VOut {
    return finish(vec4f(position, 1.0), normal, colour);
}

@vertex
fn vs_mesh_uniform_colour(@location(0) position: vec3f, @location(1) normal: vec3f) -> VOut {
    return finish(vec4f(position, 1.0), normal, draw.colour);
}

// As the WebGL instanced shader: the orientation is applied to the scaled vertex with w = 1 and
// the result's w forced back to 1, and the normal is rotated with w = 1 too.
fn instanceWorld(position: vec3f, origin: vec3f, size: vec3f, o0: vec4f, o1: vec4f, o2: vec4f, o3: vec4f) -> vec4f {
    var world = vec4f(origin, 1.0) + mat4x4f(o0, o1, o2, o3) * vec4f(size * position, 1.0);
    world.w = 1.0;
    return world;
}

fn instanceNormal(normal: vec3f, o0: vec4f, o1: vec4f, o2: vec4f, o3: vec4f) -> vec3f {
    return (mat4x4f(o0, o1, o2, o3) * vec4f(normal, 1.0)).xyz;
}

fn placeInstance(position: vec3f, normal: vec3f, origin: vec3f, size: vec3f,
                 o0: vec4f, o1: vec4f, o2: vec4f, o3: vec4f, colour: vec4f) -> VOut {
    return finish(instanceWorld(position, origin, size, o0, o1, o2, o3), instanceNormal(normal, o0, o1, o2, o3), colour);
}

// Used for both per-vertex and per-instance colours: the pipeline's step mode is the difference.
@vertex
fn vs_instanced_attribute_colour(@location(0) position: vec3f, @location(1) normal: vec3f,
                                 @location(2) colour: vec4f,
                                 @location(3) origin: vec3f, @location(4) size: vec3f,
                                 @location(5) o0: vec4f, @location(6) o1: vec4f,
                                 @location(7) o2: vec4f, @location(8) o3: vec4f) -> VOut {
    return placeInstance(position, normal, origin, size, o0, o1, o2, o3, colour);
}

@vertex
fn vs_instanced_uniform_colour(@location(0) position: vec3f, @location(1) normal: vec3f,
                               @location(3) origin: vec3f, @location(4) size: vec3f,
                               @location(5) o0: vec4f, @location(6) o1: vec4f,
                               @location(7) o2: vec4f, @location(8) o3: vec4f) -> VOut {
    return placeInstance(position, normal, origin, size, o0, o1, o2, o3, draw.colour);
}

// occ: the ambient occlusion here, which darkens the ambient and diffuse light but not the
// highlight, as in triangle-fragment-shader.js.
fn lit(base: vec4f, normal: vec3f, occ: f32, shadow: f32) -> vec4f {
    let n = normalize(normal);
    let L = frame.lightDir.xyz;
    let E = frame.eyeDir.xyz;
    let R = normalize(-reflect(L, n));
    let diffuse = frame.diffuse * max(dot(n, L), 0.0);
    let specular = frame.specular * pow(max(dot(R, E), 0.0), frame.params.z);
    return shaded((1.5 * base * ambientLight() + 1.2 * base * diffuse) * occ, specular, shadow);
}

// Fogged as triangle-fragment-shader.js: mixed towards the fog colour with distance. For a
// transparent snapshot (frame.fog.x), faded into nothing instead - the colour kept, the alpha
// taken down by the same amount - so that over the fog colour it is the same picture, and over
// anything else the distance fades into that. The picture is premultiplied then: what an opaque
// pipeline writes as it is must be premultiplied too; what is blended goes in straight, and the
// blend premultiplies it.
fn fogged(colour: vec4f, alpha: f32, eyeDistance: f32) -> vec4f {
    let fogStart = frame.params.x;
    let fogEnd = frame.params.y;
    let fogFactor = 1.0 - clamp((fogEnd - eyeDistance) / (fogEnd - fogStart), 0.0, 1.0);
    if (frame.fog.x > 0.5) {
        let a = alpha * draw.params.x * (1.0 - fogFactor);
        return select(vec4f(colour.rgb, a), vec4f(colour.rgb * a, a), draw.output.x > 0.5);
    }
    var out = mix(colour, frame.fogColour, fogFactor);
    out.a = alpha * draw.params.x;
    return out;
}

// The edge factor scales everything, back faces too; the occlusion only the lit front.
fn meshColour(in: VOut, frontFacing: bool) -> vec4f {
    // Back faces are drawn flat in their own colour, as in WebGL.
    let shadow = shadowAt(in.shadowPos);
    let colour = select(in.colour * backShade(shadow), lit(in.colour, in.normal, occlusionAt(in.position), shadow), frontFacing);
    return fogged(colour * edgeAt(in.position), in.colour.a, in.eyeDistance);
}

@fragment
fn fs_main(in: VOut, @builtin(front_facing) frontFacing: bool) -> @location(0) vec4f {
    return meshColour(in, frontFacing);
}

// The peel entry points shade first and discard after, so that anything taking derivatives does
// so in uniform control flow.
@fragment
fn fs_main_peel(in: VOut, @builtin(front_facing) frontFacing: bool) -> @location(0) vec4f {
    let colour = meshColour(in, frontFacing);
    if (!peelKeep(in.position, in.position.z)) { discard; }
    return colour;
}

// The g-buffer (effectPasses.ts): the surface's normal in eye space, w = 1 where anything is drawn.
// Depth is the depth attachment's. Facing as the mesh says, as WebGL's g-buffer has it, so a back
// face's normal points away from the viewer.
@fragment
fn fs_gbuffer(in: VOut) -> @location(0) vec4f {
    return vec4f(normalize((frame.view * vec4f(in.normal, 0.0)).xyz), 1.0);
}

// Textured meshes: a sub-buffer with a BufferMaterial (textureRegistry.ts) and a texture
// coordinate per vertex, as triangle-fragment-shader.js draws them - the base colour multiplied
// into the vertex colour, a tangent-space normal map, and a metallic-roughness map that reshapes
// the highlight. Separate entry points and pipelines, so that the untextured meshes - nearly
// everything - go through fs_main exactly as before.
struct Material {
    flags: vec4f,        // 1 where there is a base colour, a normal map, a metallic-roughness map
    factors: vec4f,      // normal scale, metallic factor, roughness factor
};

@group(2) @binding(7) var<uniform> material: Material;
@group(2) @binding(8) var materialSampler: sampler;
@group(2) @binding(9) var baseColourMap: texture_2d<f32>;
@group(2) @binding(10) var normalMap: texture_2d<f32>;
@group(2) @binding(11) var metallicRoughnessMap: texture_2d<f32>;

struct TexturedOut {
    @builtin(position) position: vec4f,
    @location(0) colour: vec4f,
    @location(1) normal: vec3f,
    @location(2) eyeDistance: f32,
    @location(3) uv: vec2f,
    // Where the vertex is, in the frame the normal is in, for the normal map's tangent frame.
    @location(4) world: vec3f,
    @location(5) shadowPos: vec4f,
};

fn textured(world: vec4f, normal: vec3f, colour: vec4f, uv: vec2f) -> TexturedOut {
    let v = finish(world, normal, colour);
    var out: TexturedOut;
    out.position = v.position;
    out.colour = v.colour;
    out.normal = v.normal;
    out.eyeDistance = v.eyeDistance;
    out.uv = uv;
    out.world = (draw.model * world).xyz;
    out.shadowPos = v.shadowPos;
    return out;
}

@vertex
fn vs_mesh_vertex_colour_textured(@location(0) position: vec3f, @location(1) normal: vec3f,
                                  @location(2) colour: vec4f, @location(9) uv: vec2f) -> TexturedOut {
    return textured(vec4f(position, 1.0), normal, colour, uv);
}

@vertex
fn vs_mesh_uniform_colour_textured(@location(0) position: vec3f, @location(1) normal: vec3f,
                                   @location(9) uv: vec2f) -> TexturedOut {
    return textured(vec4f(position, 1.0), normal, draw.colour, uv);
}

@vertex
fn vs_instanced_attribute_colour_textured(@location(0) position: vec3f, @location(1) normal: vec3f,
                                          @location(2) colour: vec4f,
                                          @location(3) origin: vec3f, @location(4) size: vec3f,
                                          @location(5) o0: vec4f, @location(6) o1: vec4f,
                                          @location(7) o2: vec4f, @location(8) o3: vec4f,
                                          @location(9) uv: vec2f) -> TexturedOut {
    return textured(instanceWorld(position, origin, size, o0, o1, o2, o3), instanceNormal(normal, o0, o1, o2, o3), colour, uv);
}

@vertex
fn vs_instanced_uniform_colour_textured(@location(0) position: vec3f, @location(1) normal: vec3f,
                                        @location(3) origin: vec3f, @location(4) size: vec3f,
                                        @location(5) o0: vec4f, @location(6) o1: vec4f,
                                        @location(7) o2: vec4f, @location(8) o3: vec4f,
                                        @location(9) uv: vec2f) -> TexturedOut {
    return textured(instanceWorld(position, origin, size, o0, o1, o2, o3), instanceNormal(normal, o0, o1, o2, o3), draw.colour, uv);
}

// metalReflection in triangle-fragment-shader.js: what a metal shows in place of diffuse light, a
// reflection of a plain studio, bright towards the light, blurred towards the normal's view of
// the light as the metal gets rougher.
fn metalReflection(N: vec3f, E: vec3f, L: vec3f, roughness: f32) -> f32 {
    let Rv = reflect(-E, N);
    let t = mix(dot(Rv, L), dot(N, L), roughness);
    let w = 0.25 + 0.75 * roughness;
    return mix(0.2, 1.0, smoothstep(-w, w, t));
}

// lit, with what a metallic-roughness map changes: the highlight's exponent and colour, and the
// diffuse light traded for a metal's reflection.
fn litSurface(base: vec4f, n: vec3f, shininess: f32, specularTint: vec4f, metallic: f32, roughness: f32, occ: f32, shadow: f32) -> vec4f {
    let L = frame.lightDir.xyz;
    let E = frame.eyeDir.xyz;
    let R = normalize(-reflect(L, n));
    let diffuse = frame.diffuse * (max(dot(n, L), 0.0) * (1.0 - metallic) + metallic * metalReflection(n, E, L, roughness));
    let specular = specularTint * frame.specular * pow(max(dot(R, E), 0.0), shininess);
    return shaded((1.5 * base * ambientLight() + 1.2 * base * diffuse) * occ, specular, shadow);
}

// The normal map's normal, as mappedNormal in triangle-fragment-shader.js: the directions in
// which u and v increase along the surface, solved for from the screen-space derivatives of
// position and coordinate (so independent of which way the screen's y runs - WebGPU's is down,
// WebGL's up), made perpendicular to the interpolated normal; glTF's +Y is up the image, minus v.
fn mappedNormal(N: vec3f, sampled: vec3f, dp1: vec3f, dp2: vec3f, duv1: vec2f, duv2: vec2f) -> vec3f {
    let m = vec3f((sampled.xy * 2.0 - 1.0) * material.factors.x, sampled.z * 2.0 - 1.0);
    let det = duv1.x * duv2.y - duv1.y * duv2.x;
    var t = dp1 * duv2.y - dp2 * duv1.y;
    var b = dp2 * duv1.x - dp1 * duv2.x;
    t -= N * dot(N, t);
    b -= N * dot(N, b);
    if (abs(det) < 1e-20 || dot(t, t) < 1e-20 || dot(b, b) < 1e-20) { return N; }
    let handed = select(1.0, -1.0, det < 0.0);
    return normalize(handed * (normalize(t) * m.x - normalize(b) * m.y) + N * m.z);
}

fn texturedColour(in: TexturedOut, frontFacing: bool) -> vec4f {
    // Everything that takes derivatives first, while control flow is still uniform. A map the
    // material does not have is a 1 x 1 stand-in, so sampling it costs next to nothing.
    let baseSample = textureSample(baseColourMap, materialSampler, in.uv);
    let normalSample = textureSample(normalMap, materialSampler, in.uv).xyz;
    let mrSample = textureSample(metallicRoughnessMap, materialSampler, in.uv);
    let dp1 = dpdx(in.world);
    let dp2 = dpdy(in.world);
    let duv1 = dpdx(in.uv);
    let duv2 = dpdy(in.uv);

    var colour = in.colour;
    if (material.flags.x > 0.5) { colour = vec4f(colour.rgb * baseSample.rgb, colour.a); }
    var n = normalize(in.normal);
    if (material.flags.y > 0.5) { n = mappedNormal(n, normalSample, dp1, dp2, duv1, duv2); }
    var shininess = frame.params.z;
    var specularTint = vec4f(1.0);
    var metallic = 0.0;
    var roughness = 1.0;
    if (material.flags.z > 0.5) {
        roughness = clamp(mrSample.g * material.factors.z, 0.05, 1.0);
        metallic = clamp(mrSample.b * material.factors.y, 0.0, 1.0);
        let r2 = roughness * roughness;
        shininess = clamp((2.0 / (r2 * r2) - 2.0) / 4.0, 1.0, 1024.0);
        specularTint = vec4f(mix(vec3f(1.0), colour.rgb, metallic) * (1.0 - roughness), 1.0);
    }
    // Back faces flat in their (textured) colour, as fs_main.
    let shadow = shadowAt(in.shadowPos);
    let surface = select(colour * backShade(shadow),
        litSurface(colour, n, shininess, specularTint, metallic, roughness, occlusionAt(in.position), shadow), frontFacing);
    return fogged(surface * edgeAt(in.position), in.colour.a, in.eyeDistance);
}

@fragment
fn fs_textured(in: TexturedOut, @builtin(front_facing) frontFacing: bool) -> @location(0) vec4f {
    return texturedColour(in, frontFacing);
}

@fragment
fn fs_textured_peel(in: TexturedOut, @builtin(front_facing) frontFacing: bool) -> @location(0) vec4f {
    let colour = texturedColour(in, frontFacing);
    if (!peelKeep(in.position, in.position.z)) { discard; }
    return colour;
}

// Thick lines, drawn from a triangle mesh's own buffers: each edge of each triangle is a quad
// facing the viewer, two triangles, six vertices, so a draw of 18 vertices per triangle needs no
// index or vertex buffers. Positions and normals are packed vec3s, as for the vertex buffers.
@group(2) @binding(0) var<storage, read> linePositions: array<f32>;
@group(2) @binding(1) var<storage, read> lineNormals: array<f32>;
@group(2) @binding(2) var<storage, read> lineTriangles: array<u32>;

// The six corners in the order linesToThickLinesWithIndices draws them (its indices 0, 2, 1, 3,
// 4, 5): which end of the edge, and which side of it.
const LINE_CORNER_END = array<u32, 6>(0u, 1u, 0u, 0u, 1u, 1u);
const LINE_CORNER_SIDE = array<f32, 6>(1.0, -1.0, -1.0, 1.0, 1.0, -1.0);

fn thickLine(vertex: u32) -> VOut {
    let edge = vertex / 6u;
    let corner = vertex - 6u * edge;
    let triangle = edge / 3u;
    let k = edge - 3u * triangle;
    let a = lineTriangles[3u * triangle + k];
    let b = lineTriangles[3u * triangle + (k + 1u) % 3u];
    let i = select(a, b, LINE_CORNER_END[corner] == 1u);
    let p = vec3f(linePositions[3u * i], linePositions[3u * i + 1u], linePositions[3u * i + 2u]);
    let pa = vec3f(linePositions[3u * a], linePositions[3u * a + 1u], linePositions[3u * a + 2u]);
    let pb = vec3f(linePositions[3u * b], linePositions[3u * b + 1u], linePositions[3u * b + 2u]);
    // Across the edge and across the line of sight, in model space (eyeDir is WebGL's screenZ). A
    // degenerate edge - a dropped triangle's, all vertex 0 - has no across, and draws nothing.
    let across = cross(pb - pa, frame.eyeDir.xyz);
    let len = length(across);
    let offset = select(vec3f(0.0), across / len, len > 1e-20) * (draw.params.y * LINE_CORNER_SIDE[corner]);
    // Lit lines are lit as if they faced the viewer, whichever way the surface faces.
    var n = vec3f(lineNormals[3u * i], lineNormals[3u * i + 1u], lineNormals[3u * i + 2u]);
    if (dot(n, frame.eyeDir.xyz) < 0.0) { n = -n; }
    var out = finish(vec4f(p + offset, 1.0), n, draw.colour);
    // Fog by the line's own depth, not the offset corner's, as WebGL does.
    let eye = frame.view * (draw.model * vec4f(p, 1.0));
    out.eyeDistance = abs(eye.z / eye.w);
    return out;
}

@vertex
fn vs_thick_line(@builtin(vertex_index) vertex: u32) -> VOut {
    return thickLine(vertex);
}

// Thick lines from a DisplayBuffer's LINES or NORMALLINES: a quad per segment, six vertices,
// between the vertices an index pair names (or consecutive vertices, given indices 0 1 2 3 ...).
// The same quads as above, built as linesToThickLines builds them on the CPU for WebGL.
@group(2) @binding(3) var<storage, read> segPositions: array<f32>;
@group(2) @binding(4) var<storage, read> segNormals: array<f32>;
@group(2) @binding(5) var<storage, read> segColours: array<f32>;
@group(2) @binding(6) var<storage, read> segments: array<u32>;

fn segPosition(i: u32) -> vec3f { return vec3f(segPositions[3u * i], segPositions[3u * i + 1u], segPositions[3u * i + 2u]); }
fn segColour(i: u32) -> vec4f { return vec4f(segColours[4u * i], segColours[4u * i + 1u], segColours[4u * i + 2u], segColours[4u * i + 3u]); }

fn segmentCorner(vertex: u32, lit: bool) -> VOut {
    let s = vertex / 6u;
    let corner = vertex - 6u * s;
    let a = segments[2u * s];
    let b = segments[2u * s + 1u];
    let i = select(a, b, LINE_CORNER_END[corner] == 1u);
    let p = segPosition(i);
    let along = segPosition(b) - segPosition(a);
    // Across the line of sight as the segment's own frame sees it - turned with a drag, as
    // drawTransformMatrixInteractivePMV turns screenZ - so it is as wide wherever it is moved.
    let eyeLocal = (transpose(draw.model) * vec4f(frame.eyeDir.xyz, 0.0)).xyz;
    let across = cross(along, eyeLocal);
    let len = length(across);
    let offset = select(vec3f(0.0), across / len, len > 1e-20) * (draw.params.y * LINE_CORNER_SIDE[corner]);
    var n = vec3f(0.0, 0.0, 1.0);
    if (lit) {
        n = vec3f(segNormals[3u * i], segNormals[3u * i + 1u], segNormals[3u * i + 2u]);
        if (dot(n, eyeLocal) < 0.0) { n = -n; }
    }
    // linesToThickLinesWithIndices colours a segment by its first vertex; linesToThickLines
    // colours each end its own.
    let mode = draw.params.w;
    let colour = select(select(segColour(a), segColour(i), mode > 0.5), draw.colour, mode > 1.5);
    var out = finish(vec4f(p + offset, 1.0), n, colour);
    let eye = frame.view * (draw.model * vec4f(p, 1.0));
    out.eyeDistance = abs(eye.z / eye.w);
    return out;
}

@vertex
fn vs_segment(@builtin(vertex_index) vertex: u32) -> VOut {
    return segmentCorner(vertex, false);
}

@vertex
fn vs_lit_segment(@builtin(vertex_index) vertex: u32) -> VOut {
    return segmentCorner(vertex, true);
}

@fragment
fn fs_line(in: VOut) -> @location(0) vec4f {
    return fogged(in.colour, in.colour.a, in.eyeDistance);
}

@fragment
fn fs_line_peel(in: VOut) -> @location(0) vec4f {
    if (!peelKeep(in.position, in.position.z)) { discard; }
    return fogged(in.colour, in.colour.a, in.eyeDistance);
}

// Lit lines are drawn with the triangle shader in WebGL, so occlusion and edges darken them too.
fn litLineColour(in: VOut) -> vec4f {
    // Not shadowed: WebGL never tells the lines program about shadows. They do cast them.
    return fogged(lit(in.colour, in.normal, occlusionAt(in.position), 1.0) * edgeAt(in.position), in.colour.a, in.eyeDistance);
}

@fragment
fn fs_lit_line(in: VOut) -> @location(0) vec4f {
    return litLineColour(in);
}

@fragment
fn fs_lit_line_peel(in: VOut) -> @location(0) vec4f {
    let colour = litLineColour(in);
    if (!peelKeep(in.position, in.position.z)) { discard; }
    return colour;
}

// Perfect spheres: impostors. Each sphere is a square of side 2r centred on it, facing the
// viewer, drawn as two triangles from the per-instance origin, size and colour alone. The
// fragment shader cuts the disc out of it and gives each pixel the depth and normal of the
// sphere's front surface there.
struct SphereOut {
    @builtin(position) position: vec4f,
    @location(0) colour: vec4f,
    // Where on the square, -1 to 1 each way: x right, y up.
    @location(1) quad: vec2f,
    // The square's point in eye space, at the depth of the sphere's centre.
    @location(2) eye: vec4f,
    @location(3) @interpolate(flat) radius: f32,
    // The centre, in model space (placed), for where the surface is in the shadow map.
    @location(4) @interpolate(flat) centre: vec3f,
};

const SPHERE_CORNERS = array<vec2f, 6>(
    vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0),
    vec2f(-1.0, -1.0), vec2f(1.0, 1.0), vec2f(-1.0, 1.0));

@vertex
fn vs_sphere(@builtin(vertex_index) vertex: u32, @location(0) origin: vec3f, @location(1) size: vec3f,
             @location(2) colour: vec4f) -> SphereOut {
    let corner = SPHERE_CORNERS[vertex];
    // As twodshapes-vertex-shader.js: its unit-radius quad, scaled by sqrt(2) * size, has corners
    // size along the screen's axes; drawCore turns them to face the screen.
    let r = select(size.x, draw.params.y, draw.params.y > 0.0);
    let centre = (draw.model * vec4f(origin, 1.0)).xyz;
    let world = vec4f(centre + r * (corner.x * frame.rightDir.xyz + corner.y * frame.upDir.xyz), 1.0);
    var out: SphereOut;
    out.eye = frame.view * world;
    out.position = frame.projection * out.eye;
    out.colour = select(colour, draw.copyColour, draw.params.z > 0.5);
    out.quad = corner;
    out.radius = r;
    out.centre = centre;
    return out;
}

struct SphereFragment {
    @location(0) colour: vec4f,
    @builtin(frag_depth) depth: f32,
};

fn sphereFragment(in: SphereOut) -> SphereFragment {
    let x = in.quad.x;
    let y = in.quad.y;
    let zz = 1.0 - x * x - y * y;
    // The same edge as WebGL's: a little inside the true silhouette.
    if (zz <= 0.06) { discard; }
    // The back plane is tested at the square, so a sphere beyond it goes whole, not sliced.
    if (dot(in.eye, frame.clipPlane1) < 0.0) { discard; }
    let capped = frame.params.w > 0.5;
    // So is the front plane, without clip caps.
    if (!capped && dot(in.eye, frame.clipPlane0) < 0.0) { discard; }
    let z = sqrt(zz);

    var out: SphereFragment;
    // The front surface's depth: the square's point brought forward by z r, in eye space.
    var surface = in.eye;
    surface.z += z * in.radius;
    let clip = frame.projection * surface;
    out.depth = clip.z / clip.w;

    // perfect-sphere-fragment-shader.js lights in eye space, with the light direction as given
    // and the normal (x, y, z); here both are in model space, which gives the same products.
    // Its specular term is not the triangles': pow(N.L), not a reflection.
    let n = x * frame.rightDir.xyz + y * frame.upDir.xyz + z * frame.eyeDir.xyz;
    let nl = max(dot(n, frame.lightDir.xyz), 0.0);
    let base = in.colour;
    let occ = occlusionAt(in.position);
    // Shadowed at the surface point itself, where WebGL looks up the square's point: the same away
    // from the sphere's own edge, and it does not shadow itself.
    let shadow = shadowAt(frame.shadowMatrix * vec4f(in.centre + in.radius * n, 1.0));
    let lit = shaded((1.5 * base * ambientLight() + 1.2 * base * (frame.diffuse * nl)) * occ, frame.specular * pow(nl, frame.params.z), shadow);
    let eyeDistance = abs(in.eye.z / in.eye.w);
    out.colour = fogged(lit * edgeAt(in.position), base.a, eyeDistance);

    // Clip caps, as perfect-sphere-fragment-shader.js fakes them: where the front surface is
    // beyond the front plane, the sphere shows its flat, unlit colour, as if cut there; where the
    // back surface is too, so that the whole chord is beyond it, nothing. The cap is the plane's
    // whole cut through the sphere and meets the lit surface where front = 0.
    if (capped) {
        let front = dot(surface, frame.clipPlane0);
        var backPlane = frame.clipPlane0;
        backPlane.w += z * in.radius;
        let back = dot(in.eye, backPlane);
        if (front < 0.0) { out.colour = fogged(base, base.a, eyeDistance); }
        if (back < 0.0) { discard; }
    }
    return out;
}

@fragment
fn fs_sphere(in: SphereOut) -> SphereFragment {
    return sphereFragment(in);
}

// Peeled at the depth the sphere gives itself, not the square's.
@fragment
fn fs_sphere_peel(in: SphereOut) -> SphereFragment {
    let out = sphereFragment(in);
    if (!peelKeep(in.position, out.depth)) { discard; }
    return out;
}

// A sphere in the shadow map: the light's camera is the frame's, so the square faces the light and
// this is the surface the light sees. WebGL's shadow pass draws the square flat, at the centre.
@fragment
fn fs_sphere_shadow(in: SphereOut) -> @builtin(frag_depth) f32 {
    let x = in.quad.x;
    let y = in.quad.y;
    let zz = 1.0 - x * x - y * y;
    if (zz <= 0.06) { discard; }
    var surface = in.eye;
    surface.z += sqrt(zz) * in.radius;
    let clip = frame.projection * surface;
    return clip.z / clip.w;
}

struct SphereGBuffer {
    @location(0) normal: vec4f,
    @builtin(frag_depth) depth: f32,
};

// A sphere in the g-buffer, as perfect-sphere-gbuffer-fragment-shader.js: the same cut and depth,
// both clip planes tested at the square (no caps), and the eye-space normal (x, y, z).
@fragment
fn fs_sphere_gbuffer(in: SphereOut) -> SphereGBuffer {
    let x = in.quad.x;
    let y = in.quad.y;
    let zz = 1.0 - x * x - y * y;
    if (zz <= 0.06) { discard; }
    if (dot(in.eye, frame.clipPlane1) < 0.0 || dot(in.eye, frame.clipPlane0) < 0.0) { discard; }
    let z = sqrt(zz);
    var surface = in.eye;
    surface.z += z * in.radius;
    let clip = frame.projection * surface;
    var out: SphereGBuffer;
    out.depth = clip.z / clip.w;
    out.normal = vec4f(x, y, z, 1.0);
    return out;
}
`;

/**
 * Text: labels from the WebGL renderer's glyph atlases (TextCanvasTexture), one quad per label,
 * facing the screen and a fixed number of pixels big, as text-vertex-shader.js draws them. Each
 * atlas is a texture at group 1 with its pixel zoom; the labels are instances.
 */
export const TEXT_WGSL = FRAME_WGSL + /* wgsl */ `
struct Text {
    params: vec4f,       // pixel zoom (zoom x atlas height / image height), unused x3
};

@group(1) @binding(0) var<uniform> text: Text;
@group(1) @binding(1) var atlas: texture_2d<f32>;
@group(1) @binding(2) var atlasSampler: sampler;

struct TextOut {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
    @location(1) eye: vec4f,
};

// The quad as TextCanvasTexture builds it: corners (0,0) (1,0) (1,1) (0,1), indices 0 1 2 0 2 3,
// and the atlas row 0 at the top, so the quad's bottom samples the label's bottom.
const TEXT_CORNERS = array<vec2f, 6>(vec2f(0.0, 0.0), vec2f(1.0, 0.0), vec2f(1.0, 1.0),
                                     vec2f(0.0, 0.0), vec2f(1.0, 1.0), vec2f(0.0, 1.0));

@vertex
fn vs_text(@builtin(vertex_index) vertex: u32, @location(0) offset: vec3f, @location(1) size: vec3f,
           @location(2) texOffsets: vec4f, @location(3) screenOffset: vec4f) -> TextOut {
    let corner = TEXT_CORNERS[vertex];
    var textOffset = size * vec3f(corner, 0.0);
    // Placed beside a world-space vector rather than at the point: across it on the screen.
    if (screenOffset.w != 0.0) {
        let toClip = frame.projection * frame.view;
        let originClip = toClip * vec4f(offset, 1.0);
        let targetClip = toClip * vec4f(offset + screenOffset.xyz, 1.0);
        let screenDir = targetClip.xy / targetClip.w - originClip.xy / originClip.w;
        let perpendicular = select(vec2f(1.0, 0.0), normalize(vec2f(-screenDir.y, screenDir.x)), length(screenDir) > 0.0001);
        let halfExtent = 0.5 * (abs(perpendicular.x) * size.x + abs(perpendicular.y) * size.y);
        textOffset = size * (vec3f(corner, 0.0) - vec3f(0.5, 0.5, 0.0));
        textOffset = vec3f(textOffset.xy + perpendicular * (screenOffset.w + halfExtent), textOffset.z);
    }
    // uMVINVMatrix (the inverse view rotation) times the offset: screen axes in model space.
    let p = text.params.x * textOffset;
    let world = vec4f(offset + p.x * frame.rightDir.xyz + p.y * frame.upDir.xyz + p.z * frame.eyeDir.xyz, 1.0);
    var out: TextOut;
    out.eye = frame.view * world;
    out.position = frame.projection * out.eye;
    out.uv = vec2f(texOffsets.x + corner.x * texOffsets.y, texOffsets.z + (1.0 - corner.y) * texOffsets.w);
    return out;
}

@fragment
fn fs_text(in: TextOut) -> @location(0) vec4f {
    // Sampled first: textureSample needs uniform control flow, which a discard ahead of it breaks.
    let colour = textureSample(atlas, atlasSampler, in.uv);
    if (dot(in.eye, frame.clipPlane0) < 0.0 || dot(in.eye, frame.clipPlane1) < 0.0) { discard; }
    return colour;
}
`;

/**
 * Line overlays drawn in a frame of their own (the FPS meter, the on-screen measuring lines):
 * segments as vertex pairs with a colour per vertex, made thick across `screenZ` as
 * thick-lines-vertex-shader.js does, and put on screen by one matrix, over everything.
 */
export const OVERLAY_LINES_WGSL = /* wgsl */ `
struct Overlay {
    clip: mat4x4f,       // the overlay's whole transform, to WebGPU clip space
    screenZ: vec4f,      // the direction lines are widened across, in the overlay's space
    params: vec4f,       // half width, unused x3
};

@group(1) @binding(0) var<uniform> overlay: Overlay;
@group(1) @binding(1) var<storage, read> overlayPositions: array<f32>;
@group(1) @binding(2) var<storage, read> overlayColours: array<f32>;

struct OverlayOut {
    @builtin(position) position: vec4f,
    @location(0) colour: vec4f,
};

// As LINE_CORNER_END and LINE_CORNER_SIDE in PREVIEW_WGSL.
const OVERLAY_CORNER_END = array<u32, 6>(0u, 1u, 0u, 0u, 1u, 1u);
const OVERLAY_CORNER_SIDE = array<f32, 6>(1.0, -1.0, -1.0, 1.0, 1.0, -1.0);

fn overlayPosition(i: u32) -> vec3f {
    return vec3f(overlayPositions[3u * i], overlayPositions[3u * i + 1u], overlayPositions[3u * i + 2u]);
}

@vertex
fn vs_overlay_line(@builtin(vertex_index) vertex: u32) -> OverlayOut {
    let s = vertex / 6u;
    let corner = vertex - 6u * s;
    let i = 2u * s + OVERLAY_CORNER_END[corner];
    let along = overlayPosition(2u * s + 1u) - overlayPosition(2u * s);
    let across = cross(along, overlay.screenZ.xyz);
    let len = length(across);
    let offset = select(vec3f(0.0), across / len, len > 1e-20) * (overlay.params.x * OVERLAY_CORNER_SIDE[corner]);
    var out: OverlayOut;
    out.position = overlay.clip * vec4f(overlayPosition(i) + offset, 1.0);
    // linesToThickLines colours each end its own.
    out.colour = vec4f(overlayColours[4u * i], overlayColours[4u * i + 1u], overlayColours[4u * i + 2u], overlayColours[4u * i + 3u]);
    return out;
}

@fragment
fn fs_overlay_line(in: OverlayOut) -> @location(0) vec4f {
    return in.colour;
}
`;

/**
 * Textured shapes (TexturedShape: a plane of values from Coot, coloured through a ramp), as
 * triangle-texture-vertex-shader.js and triangle-texture-fragment-shader.js draw them: a
 * rectangle x_size by y_size at z, in world coordinates; each pixel's value, nearest texel, picks
 * the nearest colour of the ramp; fogged.
 */
export const TEXTURED_WGSL = FRAME_WGSL + /* wgsl */ `
struct Shape {
    size: vec4f,         // x_size, y_size, z_position, unused
};

@group(1) @binding(0) var<uniform> shape: Shape;
@group(1) @binding(1) var shapeValues: texture_2d<f32>;
@group(1) @binding(2) var shapeRamp: texture_2d<f32>;

struct ShapeOut {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
    @location(1) eye: vec4f,
};

// TexturedShape's two triangles: (0,0) (x,0) (x,y), (0,0) (x,y) (0,y), texture coordinates alike.
const SHAPE_CORNERS = array<vec2f, 6>(vec2f(0.0, 0.0), vec2f(1.0, 0.0), vec2f(1.0, 1.0),
                                      vec2f(0.0, 0.0), vec2f(1.0, 1.0), vec2f(0.0, 1.0));

@vertex
fn vs_shape(@builtin(vertex_index) vertex: u32) -> ShapeOut {
    let corner = SHAPE_CORNERS[vertex];
    var out: ShapeOut;
    out.eye = frame.view * vec4f(corner.x * shape.size.x, corner.y * shape.size.y, shape.size.z, 1.0);
    out.position = frame.projection * out.eye;
    out.uv = corner;
    return out;
}

@fragment
fn fs_shape(in: ShapeOut) -> @location(0) vec4f {
    if (dot(in.eye, frame.clipPlane0) < 0.0 || dot(in.eye, frame.clipPlane1) < 0.0) { discard; }
    // NEAREST sampling, clamped to the edge, done by hand: 32-bit float textures need not filter.
    let size = vec2i(textureDimensions(shapeValues));
    let texel = clamp(vec2i(floor(in.uv * vec2f(size))), vec2i(0), size - 1);
    let value = textureLoad(shapeValues, texel, 0).x;
    let rampSize = i32(textureDimensions(shapeRamp).x);
    let colour = textureLoad(shapeRamp, vec2i(clamp(i32(floor(value * f32(rampSize))), 0, rampSize - 1), 0), 0);
    let fogStart = frame.params.x;
    let fogEnd = frame.params.y;
    let fogFactor = 1.0 - clamp((fogEnd - abs(in.eye.z / in.eye.w)) / (fogEnd - fogStart), 0.0, 1.0);
    // Faded rather than fogged in a transparent snapshot, as fogged() does; blended, so straight.
    if (frame.fog.x > 0.5) { return vec4f(colour.rgb, colour.a * (1.0 - fogFactor)); }
    return mix(colour, frame.fogColour, fogFactor);
}
`;
