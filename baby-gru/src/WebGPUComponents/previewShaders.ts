/**
 * WGSL for the WebGPU preview: lit, fogged triangles, plain and instanced, and thick lines.
 *
 * A transcription of the parts of webgl-2/triangle-vertex-shader.js,
 * triangle-instanced-vertex-shader.js and triangle-fragment-shader.js that apply with shadows,
 * SSAO, edge detection, textures, hover highlighting and depth peeling all off. Keep the lighting
 * in step with the fragment shader there, or the two views will drift apart in ways that look
 * like bugs in whichever one is newer.
 *
 * Thick lines follow thick-lines-vertex-shader.js (unlit, with lines-fragment-shader.js) and
 * thick-lines-normal-vertex-shader.js (lit), but build their quads in the vertex shader from the
 * GPU's own buffers, where WebGL has them built on the CPU (linesToThickLinesWithIndices).
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
    params: vec4f,       // alpha multiplier (an object fade), thick lines' half width (Å), unused x2
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

fn lit(base: vec4f, normal: vec3f) -> vec4f {
    let n = normalize(normal);
    let L = frame.lightDir.xyz;
    let E = frame.eyeDir.xyz;
    let R = normalize(-reflect(L, n));
    let diffuse = frame.diffuse * max(dot(n, L), 0.0);
    let specular = frame.specular * pow(max(dot(R, E), 0.0), frame.params.z);
    return 1.5 * base * frame.ambient + 1.2 * base * diffuse + specular;
}

fn fogged(colour: vec4f, alpha: f32, eyeDistance: f32) -> vec4f {
    let fogStart = frame.params.x;
    let fogEnd = frame.params.y;
    let fogFactor = 1.0 - clamp((fogEnd - eyeDistance) / (fogEnd - fogStart), 0.0, 1.0);
    var out = mix(colour, frame.fogColour, fogFactor);
    out.a = alpha * draw.params.x;
    return out;
}

@fragment
fn fs_main(in: VOut, @builtin(front_facing) frontFacing: bool) -> @location(0) vec4f {
    // Back faces are drawn flat in their own colour, as in WebGL.
    let colour = select(in.colour, lit(in.colour, in.normal), frontFacing);
    return fogged(colour, in.colour.a, in.eyeDistance);
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
    let eye = frame.view * vec4f(p, 1.0);
    out.eyeDistance = abs(eye.z / eye.w);
    return out;
}

@vertex
fn vs_thick_line(@builtin(vertex_index) vertex: u32) -> VOut {
    return thickLine(vertex);
}

@fragment
fn fs_line(in: VOut) -> @location(0) vec4f {
    return fogged(in.colour, in.colour.a, in.eyeDistance);
}

@fragment
fn fs_lit_line(in: VOut) -> @location(0) vec4f {
    return fogged(lit(in.colour, in.normal), in.colour.a, in.eyeDistance);
}
`;
