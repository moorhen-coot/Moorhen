/**
 * The WebGL side of mesh textures: the programs built from the triangle fragment shader, and what
 * it draws with a base colour, a normal map and a metallic-roughness map - against the same
 * references as surfaceTextures.case.ts checks the WebGPU renderer with, so the two renderers
 * agree by agreeing with the same thing.
 *
 * WebGL2 rather than WebGPU, in the same blank page. The programs are linked here exactly as
 * mgWebGL pairs them (the triangle, instanced and thick-lines-normal vertex shaders, each with the
 * full and the fast fragment shader), since a fragment input one of the three vertex shaders does
 * not write is a link failure that only shows in that program. The drawing uses the triangle
 * program with the uniforms set by hand: what drawCore sets for a plain lit mesh, and the
 * textures uploaded by glTextureFor, as drawCore uploads them.
 */
import { triangle_vertex_shader_source } from "../../../src/WebGLgComponents/webgl-2/triangle-vertex-shader.js";
import { triangle_instanced_vertex_shader_source } from "../../../src/WebGLgComponents/webgl-2/triangle-instanced-vertex-shader.js";
import { thick_lines_normal_vertex_shader_source } from "../../../src/WebGLgComponents/webgl-2/thick-lines-normal-vertex-shader.js";
import { triangle_fragment_shader_source, triangle_fragment_shader_source_fast } from "../../../src/WebGLgComponents/webgl-2/triangle-fragment-shader.js";
import { fxaa_shader_source } from "../../../src/WebGLgComponents/webgl-2/fxaa.js";
import { glTextureFor, registerTexture } from "../../../src/WebGLgComponents/textureRegistry";
import {
    type Lights, METALLIC_ROUGHNESS_CASES, NORMAL_MAP_CASES, type Quad, decodedNormal, emptyQuad, encodeNormal, fineChecker,
    litWithMetallicRoughness, nearHighlight, rectangle, solidImage, texelCells, texelColours, TEXELS_ACROSS, TEXELS_DOWN, unit,
} from "../reference/surfaceLighting";

const WIDTH = 240, HEIGHT = 160;
/** Pixels per angstrom; the view is 24 x 16 A about the origin. */
const PPA = 10;
const HALF_W = 8, HALF_H = 6;

const LIGHTS: Lights = {
    L: unit([25, 25, 50]), E: [0, 0, 1],
    ambient: [0.2, 0.2, 0.2], diffuse: [0.6, 0.6, 0.6], specular: [0.4, 0.4, 0.4],
};

interface Material {
    baseColourTexture?: string;
    normalTexture?: string;
    normalScale?: number;
    metallicRoughnessTexture?: string;
    metallicFactor?: number;
    roughnessFactor?: number;
}

export interface WebGLSurfaceMapsReport {
    /** Why there is no WebGL2 here, if there is none. */
    unavailable?: string;
    /** Program name -> link log, for those that failed to compile or link. */
    linkErrors: Record<string, string>;
    baseColour: { worst: number; drawn: number; compared: number };
    normalMaps: { name: string; worst: number; drawn: number; compared: number; flat: number }[];
    metallicRoughness: { name: string; worst: number; got: number[]; expected: number[] }[];
    mipmapped: { worst: number; drawn: number; compared: number };
    glErrors: number[];
}

function compile(gl: WebGL2RenderingContext, vertex: string, fragment: string): { program: WebGLProgram | null; log: string } {
    const shader = (type: number, source: string) => {
        const s = gl.createShader(type);
        gl.shaderSource(s, source);
        gl.compileShader(s);
        return s;
    };
    const vs = shader(gl.VERTEX_SHADER, vertex), fs = shader(gl.FRAGMENT_SHADER, fragment);
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (gl.getProgramParameter(program, gl.LINK_STATUS)) return { program, log: "" };
    return { program: null, log: [gl.getShaderInfoLog(vs), gl.getShaderInfoLog(fs), gl.getProgramInfoLog(program)].filter(Boolean).join("\n") };
}

const ortho = (l: number, r: number, b: number, t: number, n: number, f: number): number[] => [
    2 / (r - l), 0, 0, 0, 0, 2 / (t - b), 0, 0, 0, 0, -2 / (f - n), 0,
    -(r + l) / (r - l), -(t + b) / (t - b), -(f + n) / (f - n), 1,
];

export default async (): Promise<{ result: WebGLSurfaceMapsReport; gpuErrors: string[] }> => {
    const canvas = document.createElement("canvas");
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const gl = canvas.getContext("webgl2", { antialias: false, preserveDrawingBuffer: true });
    const empty = { worst: 0, drawn: 0, compared: 0 };
    if (!gl) {
        return { result: { unavailable: "no WebGL2", linkErrors: {}, baseColour: empty, normalMaps: [], metallicRoughness: [], mipmapped: empty, glErrors: [] }, gpuErrors: [] };
    }

    const fragments = { full: triangle_fragment_shader_source + fxaa_shader_source, fast: triangle_fragment_shader_source_fast + fxaa_shader_source };
    const vertices = { triangle: triangle_vertex_shader_source, instanced: triangle_instanced_vertex_shader_source, thickLinesNormal: thick_lines_normal_vertex_shader_source };
    const linkErrors: Record<string, string> = {};
    let program: WebGLProgram | null = null;
    for (const [v, vertex] of Object.entries(vertices)) for (const [f, fragment] of Object.entries(fragments)) {
        const linked = compile(gl, vertex, fragment);
        if (!linked.program) linkErrors[`${v} + ${f}`] = linked.log;
        if (v === "triangle" && f === "fast") program = linked.program;
    }
    if (!program) {
        return { result: { linkErrors, baseColour: empty, normalMaps: [], metallicRoughness: [], mipmapped: empty, glErrors: [] }, gpuErrors: [] };
    }

    gl.useProgram(program);
    const u = (name: string) => gl.getUniformLocation(program, name);
    const set = (name: string, f: (location: WebGLUniformLocation) => void) => {
        const location = u(name);
        if (location) f(location);
    };
    const view = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, -250, 1];
    const inverse = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 250, 1];
    set("uPMatrix", l => gl.uniformMatrix4fv(l, false, ortho(-WIDTH / PPA / 2, WIDTH / PPA / 2, -HEIGHT / PPA / 2, HEIGHT / PPA / 2, 200, 300)));
    set("uMVMatrix", l => gl.uniformMatrix4fv(l, false, view));
    set("uMVINVMatrix", l => gl.uniformMatrix4fv(l, false, inverse));
    set("TextureMatrix", l => gl.uniformMatrix4fv(l, false, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]));
    set("outlineSize", l => gl.uniform3f(l, 0, 0, 0));
    set("uHoveredPoint", l => gl.uniform1ui(l, 0xFFFFFFFF));
    set("alphaMultiplier", l => gl.uniform1f(l, 1));
    set("light_positions", l => gl.uniform4f(l, LIGHTS.L[0], LIGHTS.L[1], LIGHTS.L[2], 1));
    set("light_colours_ambient", l => gl.uniform4f(l, ...LIGHTS.ambient as [number, number, number], 1));
    set("light_colours_diffuse", l => gl.uniform4f(l, ...LIGHTS.diffuse as [number, number, number], 1));
    set("light_colours_specular", l => gl.uniform4f(l, ...LIGHTS.specular as [number, number, number], 1));
    set("specularPower", l => gl.uniform1f(l, 32));
    set("screenZFrag", l => gl.uniform3f(l, 0, 0, 1));
    set("fog_start", l => gl.uniform1f(l, 1000));
    set("fog_end", l => gl.uniform1f(l, 1001));
    // Every sampler on a unit of its own, as drawCore keeps them: samplers of different types on
    // one unit fail every draw.
    const units: Record<string, number> = {
        SSAOMap: 1, edgeDetectMap: 2, depthPeelSamplers: 3, baseColourTexture: 4, opaqueDepthSampler: 5, ShadowMap: 6,
        uPointTex: 7, uWeightTex: 8, uOffsetTex: 9, normalTexture: 10, metallicRoughnessTexture: 11,
    };
    for (const [name, unitNumber] of Object.entries(units)) set(name, l => gl.uniform1i(l, unitNumber));

    const attribute = (name: string) => gl.getAttribLocation(program, name);
    const buffers: WebGLBuffer[] = [];
    const draw = (q: Quad, material: Material | null): Uint8Array => {
        gl.viewport(0, 0, WIDTH, HEIGHT);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        for (let i = 0; i < 16; i++) gl.disableVertexAttribArray(i);
        const feed = (name: string, data: number[], size: number) => {
            const location = attribute(name);
            if (location < 0) return;
            const buffer = gl.createBuffer();
            buffers.push(buffer);
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
            gl.enableVertexAttribArray(location);
            gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
        };
        feed("aVertexPosition", q.positions, 3);
        feed("aVertexNormal", q.normals, 3);
        feed("aVertexColour", q.colours, 4);
        feed("aVertexTexture", q.uvs, 2);
        // As drawCore: each map bound on its unit, and its flag, only if it resolves.
        const bind = (id: string | undefined, unitNumber: number, flag: string): boolean => {
            const texture = id ? glTextureFor(gl, id) : null;
            if (texture) {
                gl.activeTexture(gl.TEXTURE0 + unitNumber);
                gl.bindTexture(gl.TEXTURE_2D, texture);
                gl.activeTexture(gl.TEXTURE0);
            }
            set(flag, l => gl.uniform1i(l, texture ? 1 : 0));
            return !!texture;
        };
        bind(material?.baseColourTexture, 4, "hasBaseColourTexture");
        if (bind(material?.normalTexture, 10, "hasNormalTexture")) set("normalScale", l => gl.uniform1f(l, material.normalScale ?? 1));
        if (bind(material?.metallicRoughnessTexture, 11, "hasMetallicRoughnessTexture")) {
            set("metallicRoughnessFactors", l => gl.uniform2f(l, material.metallicFactor ?? 1, material.roughnessFactor ?? 1));
        }
        const index = gl.createBuffer();
        buffers.push(index);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(q.indices), gl.STATIC_DRAW);
        gl.drawElements(gl.TRIANGLES, q.indices.length, gl.UNSIGNED_INT, 0);
        const pixels = new Uint8Array(WIDTH * HEIGHT * 4);
        gl.readPixels(0, 0, WIDTH, HEIGHT, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        return pixels;
    };
    // readPixels' row 0 is the bottom.
    const pixel = (data: Uint8Array, x: number, y: number): number[] => {
        const px = Math.floor(WIDTH / 2 + x * PPA), py = Math.floor(HEIGHT / 2 + y * PPA);
        const at = (py * WIDTH + px) * 4;
        return [data[at], data[at + 1], data[at + 2]];
    };
    const compare = (a: Uint8Array, b: Uint8Array, points: [number, number][]) => {
        let worst = 0, drawn = 0;
        for (const [x, y] of points) {
            const p = pixel(a, x, y), q = pixel(b, x, y);
            if (p[0] + p[1] + p[2] > 0) drawn++;
            worst = Math.max(worst, ...p.map((c, i) => Math.abs(c - q[i])));
        }
        return { worst, drawn, compared: points.length };
    };
    const whole = (normal: number[], colour: number[], mirrored = false): Quad => {
        const q = emptyQuad();
        rectangle(q, -HALF_W, -HALF_H, HALF_W, HALF_H, normal, colour, mirrored ? 1 : 0, mirrored ? 0 : 1);
        return q;
    };
    const samplePoints: [number, number][] = [];
    for (let i = -3; i <= 3; i++) for (let j = -2; j <= 2; j++) samplePoints.push([i * 2, j * 2]);

    const image = registerTexture({ width: TEXELS_ACROSS, height: TEXELS_DOWN, rgba: new Uint8Array(texelColours().flat()) });
    const tint = [0.9, 1, 0.7, 1];
    const cells = texelCells(-HALF_W, -HALF_H, HALF_W, HALF_H, tint);
    const baseColour = compare(draw(whole([0, 0, 1], tint), { baseColourTexture: image }), draw(cells.quad, null), cells.centres);

    const grey = [0.8, 0.8, 0.8, 1];
    const flat = draw(whole([0, 0, 1], grey), null);
    const normalMaps = NORMAL_MAP_CASES.map(c => {
        const bytes = encodeNormal(c.tangent);
        const map = registerTexture(solidImage(bytes));
        const got = draw(whole([0, 0, 1], grey, c.mirrored), { normalTexture: map, normalScale: c.scale });
        const expected = draw(whole(c.world(decodedNormal(bytes, c.scale ?? 1)), grey), null);
        return { name: c.name, ...compare(got, expected, samplePoints), flat: compare(got, flat, samplePoints).worst };
    });

    const base = [0.7, 0.5, 0.3, 1];
    const normal = nearHighlight(LIGHTS);
    const metallicRoughness = METALLIC_ROUGHNESS_CASES.map(c => {
        const map = registerTexture(solidImage([0, c.g, c.b, 255]));
        const got = pixel(draw(whole(normal, base), {
            metallicRoughnessTexture: map, metallicFactor: c.metallicFactor, roughnessFactor: c.roughnessFactor,
        }), 0, 0);
        const expected = litWithMetallicRoughness(LIGHTS, normal, base, c.b / 255 * c.metallicFactor, c.g / 255 * c.roughnessFactor);
        return { name: c.name, got, expected, worst: Math.max(...got.map((v, i) => Math.abs(v - expected[i]))) };
    });

    const checker = registerTexture(fineChecker(1024));
    const mipmapped = compare(draw(whole([0, 0, 1], [1, 1, 1, 1]), { baseColourTexture: checker }),
        draw(whole([0, 0, 1], [0.5, 0.5, 0.5, 1]), null), samplePoints);

    const glErrors: number[] = [];
    for (let e = gl.getError(); e !== gl.NO_ERROR; e = gl.getError()) glErrors.push(e);
    buffers.forEach(b => gl.deleteBuffer(b));
    return { result: { linkErrors, baseColour, normalMaps, metallicRoughness, mipmapped, glErrors }, gpuErrors: [] };
};
