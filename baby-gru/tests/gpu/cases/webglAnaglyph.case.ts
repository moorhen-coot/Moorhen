/**
 * WebGL's anaglyph grey (drawCore's anaglyph block, setAnaglyphGrey): the scene's fragment
 * shaders, given anaglyphGrey, turn each colour grey - its brightest channel, at most 1 - before
 * the fog, so that an eye drawn into its channels (colorMask) is what the WebGPU renderer's
 * combine makes of it: grey on the background, fogged into the background's own channel.
 *
 * Every changed program links and has the uniform; and a triangle drawn with the lines program
 * comes out its colour without the grey, its brightest channel with it, fogged into the clear
 * colour, and in the masked channels only.
 */
import { lines_vertex_shader_source } from "../../../src/WebGLgComponents/webgl-2/lines-vertex-shader.js";
import { lines_fragment_shader_source } from "../../../src/WebGLgComponents/webgl-2/lines-fragment-shader.js";
import { triangle_vertex_shader_source } from "../../../src/WebGLgComponents/webgl-2/triangle-vertex-shader.js";
import { triangle_fragment_shader_source, triangle_fragment_shader_source_fast } from "../../../src/WebGLgComponents/webgl-2/triangle-fragment-shader.js";
import { triangle_instanced_vertex_shader_source } from "../../../src/WebGLgComponents/webgl-2/triangle-instanced-vertex-shader.js";
import { thick_lines_vertex_shader_source } from "../../../src/WebGLgComponents/webgl-2/thick-lines-vertex-shader.js";
import { thick_lines_normal_vertex_shader_source } from "../../../src/WebGLgComponents/webgl-2/thick-lines-normal-vertex-shader.js";
import { pointspheres_vertex_shader_source } from "../../../src/WebGLgComponents/webgl-2/pointspheres-vertex-shader.js";
import { pointspheres_fragment_shader_source } from "../../../src/WebGLgComponents/webgl-2/pointspheres-fragment-shader.js";
import { twod_vertex_shader_source } from "../../../src/WebGLgComponents/webgl-2/twodshapes-vertex-shader.js";
import { twod_fragment_shader_source } from "../../../src/WebGLgComponents/webgl-2/twodshapes-fragment-shader.js";
import { perfect_sphere_fragment_shader_source } from "../../../src/WebGLgComponents/webgl-2/perfect-sphere-fragment-shader.js";
import { triangle_texture_vertex_shader_source } from "../../../src/WebGLgComponents/webgl-2/triangle-texture-vertex-shader.js";
import { triangle_texture_fragment_shader_source } from "../../../src/WebGLgComponents/webgl-2/triangle-texture-fragment-shader.js";
import { fxaa_shader_source } from "../../../src/WebGLgComponents/webgl-2/fxaa.js";

const SIZE = 8;

export interface WebGLAnaglyphReport {
    unavailable?: string;
    /** Program name -> link log, for those that failed. */
    linkErrors: Record<string, string>;
    /** Programs without an anaglyphGrey uniform. */
    missingUniform: string[];
    /** RGBA of the centre pixel: plain colour; grey, all channels; grey, red only; grey, fogged half, red only. */
    plain: number[];
    grey: number[];
    redOnly: number[];
    fogged: number[];
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

const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

export default async (): Promise<{ result: WebGLAnaglyphReport; gpuErrors: string[] }> => {
    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const gl = canvas.getContext("webgl2", { antialias: false, preserveDrawingBuffer: true });
    if (!gl) return { result: { unavailable: "no WebGL2", linkErrors: {}, missingUniform: [], plain: [], grey: [], redOnly: [], fogged: [], glErrors: [] }, gpuErrors: [] };

    // As initializeShaders pairs them.
    const pairs: Record<string, [string, string]> = {
        triangle: [triangle_vertex_shader_source, triangle_fragment_shader_source + fxaa_shader_source],
        triangleFast: [triangle_vertex_shader_source, triangle_fragment_shader_source_fast + fxaa_shader_source],
        instanced: [triangle_instanced_vertex_shader_source, triangle_fragment_shader_source + fxaa_shader_source],
        thickLinesNormal: [thick_lines_normal_vertex_shader_source, triangle_fragment_shader_source + fxaa_shader_source],
        thickLines: [thick_lines_vertex_shader_source, lines_fragment_shader_source],
        lines: [lines_vertex_shader_source, lines_fragment_shader_source],
        pointSpheres: [pointspheres_vertex_shader_source, pointspheres_fragment_shader_source],
        twoDShapes: [twod_vertex_shader_source, twod_fragment_shader_source],
        perfectSpheres: [twod_vertex_shader_source, perfect_sphere_fragment_shader_source + fxaa_shader_source],
        textured: [triangle_texture_vertex_shader_source, triangle_texture_fragment_shader_source],
    };
    const linkErrors: Record<string, string> = {};
    const missingUniform: string[] = [];
    for (const [name, [vertex, fragment]] of Object.entries(pairs)) {
        const { program, log } = compile(gl, vertex, fragment);
        if (!program) { linkErrors[name] = log; continue; }
        if (!gl.getUniformLocation(program, "anaglyphGrey")) missingUniform.push(name);
        gl.deleteProgram(program);
    }

    // A triangle over the whole canvas with the lines program, colour (0.2, 0.6, 0.4), at eye z 0.
    const { program } = compile(gl, lines_vertex_shader_source, lines_fragment_shader_source);
    const positions = gl.createBuffer(), colours = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positions);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, colours);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0.2, 0.6, 0.4, 1, 0.2, 0.6, 0.4, 1, 0.2, 0.6, 0.4, 1]), gl.STATIC_DRAW);
    gl.useProgram(program);
    const attribute = (name: string, buffer: WebGLBuffer, size: number) => {
        const location = gl.getAttribLocation(program, name);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
    };
    attribute("aVertexPosition", positions, 3);
    attribute("aVertexColour", colours, 4);
    for (const m of ["uMVMatrix", "uMVINVMatrix", "uPMatrix"]) gl.uniformMatrix4fv(gl.getUniformLocation(program, m), false, IDENTITY);
    gl.uniform4fv(gl.getUniformLocation(program, "clipPlane0"), [0, 0, 0, 1]);
    gl.uniform4fv(gl.getUniformLocation(program, "clipPlane1"), [0, 0, 0, 1]);
    gl.uniform4fv(gl.getUniformLocation(program, "fogColour"), [0.1, 0.2, 0.3, 1]);
    const grey = gl.getUniformLocation(program, "anaglyphGrey");
    const draw = (greyOn: boolean, mask: [boolean, boolean, boolean], fogHalf: boolean): number[] => {
        // fogFactor = 1 - clamp((end - 0) / (end - start)): 0 with the fog far off, a half with it round the eye.
        gl.uniform1f(gl.getUniformLocation(program, "fog_start"), fogHalf ? -1 : 10);
        gl.uniform1f(gl.getUniformLocation(program, "fog_end"), fogHalf ? 1 : 20);
        gl.uniform1f(grey, greyOn ? 1 : 0);
        gl.colorMask(true, true, true, true);
        gl.clearColor(0.1, 0.2, 0.3, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.colorMask(mask[0], mask[1], mask[2], false);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.colorMask(true, true, true, true);
        const pixel = new Uint8Array(4);
        gl.readPixels(SIZE / 2, SIZE / 2, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
        return Array.from(pixel);
    };
    const result: WebGLAnaglyphReport = {
        linkErrors, missingUniform,
        plain: draw(false, [true, true, true], false),
        grey: draw(true, [true, true, true], false),
        redOnly: draw(true, [true, false, false], false),
        fogged: draw(true, [true, false, false], true),
        glErrors: [],
    };
    for (let e = gl.getError(); e !== gl.NO_ERROR; e = gl.getError()) result.glErrors.push(e);
    gl.deleteBuffer(positions);
    gl.deleteBuffer(colours);
    return { result, gpuErrors: [] };
};
