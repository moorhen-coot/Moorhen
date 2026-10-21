/**
 * WGSL for the WebGPU preview: lit, fogged triangles, plain and instanced.
 *
 * A transcription of the parts of webgl-2/triangle-vertex-shader.js,
 * triangle-instanced-vertex-shader.js and triangle-fragment-shader.js that apply with shadows,
 * SSAO, edge detection, textures, hover highlighting and depth peeling all off. Keep the lighting
 * in step with the fragment shader there, or the two views will drift apart in ways that look
 * like bugs in whichever one is newer.
 *
 * Frame must match the packing in previewScene.ts (frameUniforms, FRAME_FLOATS).
 */
export const PREVIEW_WGSL = /* wgsl */ `
struct Frame {
    projection: mat4x4f,
    view: mat4x4f,
    lightDir: vec4f,     // model space, normalised
    eyeDir: vec4f,       // model space
    ambient: vec4f,
    diffuse: vec4f,
    specular: vec4f,
    fogColour: vec4f,
    params: vec4f,       // fog start, fog end, specular power, unused
};

struct Draw {
    colour: vec4f,       // used when the colour comes from a uniform (customColour)
    params: vec4f,       // alpha multiplier (an object fade), unused x3
};

@group(0) @binding(0) var<uniform> frame: Frame;
@group(1) @binding(0) var<uniform> draw: Draw;

struct VOut {
    @builtin(position) position: vec4f,
    @location(0) colour: vec4f,
    @location(1) normal: vec3f,
    @location(2) eyeDistance: f32,
};

fn finish(world: vec4f, normal: vec3f, colour: vec4f) -> VOut {
    var out: VOut;
    let eye = frame.view * world;
    out.position = frame.projection * eye;
    out.colour = colour;
    out.normal = normal;
    out.eyeDistance = abs(eye.z / eye.w);
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
fn placeInstance(position: vec3f, normal: vec3f, origin: vec3f, size: vec3f,
                 o0: vec4f, o1: vec4f, o2: vec4f, o3: vec4f, colour: vec4f) -> VOut {
    let orientation = mat4x4f(o0, o1, o2, o3);
    var world = vec4f(origin, 1.0) + orientation * vec4f(size * position, 1.0);
    world.w = 1.0;
    return finish(world, (orientation * vec4f(normal, 1.0)).xyz, colour);
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

@fragment
fn fs_main(in: VOut, @builtin(front_facing) frontFacing: bool) -> @location(0) vec4f {
    let base = in.colour;
    var lit: vec4f;
    if (frontFacing) {
        let n = normalize(in.normal);
        let L = frame.lightDir.xyz;
        let E = frame.eyeDir.xyz;
        let R = normalize(-reflect(L, n));
        let diffuse = frame.diffuse * max(dot(n, L), 0.0);
        let specular = frame.specular * pow(max(dot(R, E), 0.0), frame.params.z);
        lit = 1.5 * base * frame.ambient + 1.2 * base * diffuse + specular;
    } else {
        // Back faces are drawn flat in their own colour, as in WebGL.
        lit = base;
    }
    let fogStart = frame.params.x;
    let fogEnd = frame.params.y;
    let fogFactor = 1.0 - clamp((fogEnd - in.eyeDistance) / (fogEnd - fogStart), 0.0, 1.0);
    var colour = mix(lit, frame.fogColour, fogFactor);
    colour.a = base.a * draw.params.x;
    return colour;
}
`;
