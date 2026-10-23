/**
 * WGSL for the WebGPU preview: lit, fogged triangles, plain and instanced, and thick lines.
 *
 * A transcription of the parts of webgl-2/triangle-vertex-shader.js,
 * triangle-instanced-vertex-shader.js and triangle-fragment-shader.js that apply with shadows,
 * SSAO, edge detection, textures, hover highlighting and depth peeling all off. Keep the lighting
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
    params: vec4f,       // fog start, fog end, specular power, sphere clip caps (1 or 0)
    rightDir: vec4f,     // the screen's right, in model space
    upDir: vec4f,        // the screen's up, in model space
    clipPlane0: vec4f,   // front clip plane, eye space
    clipPlane1: vec4f,   // back clip plane, eye space
};

struct Draw {
    colour: vec4f,       // used when the colour comes from a uniform (customColour)
    params: vec4f,       // alpha multiplier (an object fade), thick lines' half width (Å) or
                         // every sphere's radius (a hover highlight; 0 for their own),
                         // 1 to colour everything copyColour (a grey symmetry copy),
                         // segments' colour: 0 their first vertex's, 1 each end's own, 2 draw.colour
    copyColour: vec4f,
    model: mat4x4f,      // where this copy goes: a symmetry operator, or identity for the original
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
    // A symmetry copy is lit as if the operator had moved the mesh, as applySymmetryMatrix does
    // by turning the light and eye into the copy's frame.
    let eye = frame.view * (draw.model * world);
    out.position = frame.projection * eye;
    out.colour = select(colour, draw.copyColour, draw.params.z > 0.5);
    out.normal = (draw.model * vec4f(normal, 0.0)).xyz;
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
    let across = cross(along, frame.eyeDir.xyz);
    let len = length(across);
    let offset = select(vec3f(0.0), across / len, len > 1e-20) * (draw.params.y * LINE_CORNER_SIDE[corner]);
    var n = vec3f(0.0, 0.0, 1.0);
    if (lit) {
        n = vec3f(segNormals[3u * i], segNormals[3u * i + 1u], segNormals[3u * i + 2u]);
        if (dot(n, frame.eyeDir.xyz) < 0.0) { n = -n; }
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
fn fs_lit_line(in: VOut) -> @location(0) vec4f {
    return fogged(lit(in.colour, in.normal), in.colour.a, in.eyeDistance);
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
    return out;
}

struct SphereFragment {
    @location(0) colour: vec4f,
    @builtin(frag_depth) depth: f32,
};

@fragment
fn fs_sphere(in: SphereOut) -> SphereFragment {
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
    let lit = 1.5 * base * frame.ambient + 1.2 * base * (frame.diffuse * nl) + frame.specular * pow(nl, frame.params.z);
    let eyeDistance = abs(in.eye.z / in.eye.w);
    out.colour = fogged(lit, base.a, eyeDistance);

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
`;
