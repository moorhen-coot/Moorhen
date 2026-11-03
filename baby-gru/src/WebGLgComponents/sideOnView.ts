/**
 * The clip, fog and blur widget's side-on view of the scene, drawn by WebGL into the widget's own
 * canvas (MoorhenSlidersSettings): meshes, instanced meshes, perfect spheres, and LINES and
 * NORMALLINES as plain one-pixel GL lines.
 *
 * The widget's context cannot use the main view's buffers (WebGL contexts share nothing), so it
 * keeps its own copy of what it draws: per sub-buffer, made the first time the sub-buffer is drawn
 * and again only when its data changes (the buffer's dataVersion, or a replaced array), as the
 * WebGPU renderer keeps its own (previewRenderer.ts syncResources). Copies of buffers that have
 * left the scene are deleted. What to draw, and how each sub-buffer is coloured, is planPreview's
 * reading of the buffers, which is drawCore's.
 *
 * It used to clone every buffer and run buildBuffers on the clones whenever the store's buffer list
 * was replaced - for any change, a map contoured again included - which built thick lines on the
 * CPU for every LINES buffer it then did not draw, and left the old copies to the garbage
 * collector. What it still does not draw: symmetry copies, textures, transforms, and text.
 */
import * as mat4 from "gl-matrix/mat4";
import type { DisplayBuffer } from "./displayBuffer";
import { getShader, initSideOnShaders, initSideOnShadersInstanced, initSideOnSphereShaders } from "./mgWebGLShaders";
import { triangle_side_on_view_instanced_vertex_shader_source } from "./webgl-2/triangle-side-on-view-instanced-vertex-shader.js";
import { triangle_side_on_view_vertex_shader_source } from "./webgl-2/triangle-side-on-view-vertex-shader.js";
import { triangle_side_on_view_fragment_shader_source } from "./webgl-2/triangle-side-on-view-fragment-shader.js";
import { twod_side_on_view_vertex_shader_source } from "./webgl-2/twodshapes-side-on-view-vertex-shader.js";
import { perfect_sphere_side_on_view_fragment_shader_source } from "./webgl-2/perfect-sphere-side-on-view-fragment-shader.js";
import { lines_side_on_view_fragment_shader_source, lines_side_on_view_vertex_shader_source } from "./webgl-2/lines-side-on-view-shaders.js";
import { type PreviewDraw, planPreview } from "../WebGPUComponents/previewScene";

type GL = WebGL2RenderingContext;
// The programs carry their attribute and uniform locations, as mgWebGLShaders sets them.
type Program = WebGLProgram & Record<string, number | WebGLUniformLocation>;

/** One sub-buffer's copy in the widget's context. */
interface SubCopy {
    dataVersion: number;
    sources: unknown[];
    buffers: WebGLBuffer[];
    position: WebGLBuffer | null;
    normal: WebGLBuffer | null;
    colour: WebGLBuffer | null;
    index: WebGLBuffer | null;
    origin: WebGLBuffer | null;
    size: WebGLBuffer | null;
    orientation: WebGLBuffer | null;
}

const asFloat32 = (data: ArrayLike<number>): Float32Array => (data instanceof Float32Array ? data : Float32Array.from(data));
const asUint32 = (data: ArrayLike<number>): Uint32Array => (data instanceof Uint32Array ? data : Uint32Array.from(data));

/** What a sub-buffer's copy is made from: a different array, or a different reading of it, is a new copy. */
function sourcesOf(item: PreviewDraw): unknown[] {
    const b = item.buffer, j = item.index;
    return [
        item.primitive, item.colourSource, item.instanced, item.indexCount,
        b.triangleVertices?.[j], b.triangleNormals?.[j], b.triangleColours?.[j], b.triangleIndexs?.[j],
        b.triangleInstanceOrigins?.[j], b.triangleInstanceSizes?.[j], b.triangleInstanceOrientations?.[j],
    ];
}

export class SideOnWebGLView {
    private readonly triangles: Program;
    private readonly instanced: Program;
    private readonly spheres: Program;
    private readonly lines: Program;
    /** The sphere impostor's square, as a fan about its centre. */
    private readonly disk: { position: WebGLBuffer; normal: WebGLBuffer; texture: WebGLBuffer; index: WebGLBuffer; count: number };
    private readonly copies = new Map<DisplayBuffer, (SubCopy | undefined)[]>();

    constructor(private readonly gl: GL) {
        const fragment = getShader(gl, triangle_side_on_view_fragment_shader_source, "fragment");
        this.triangles = initSideOnShaders(getShader(gl, triangle_side_on_view_vertex_shader_source, "vertex"), fragment, gl);
        this.instanced = initSideOnShadersInstanced(getShader(gl, triangle_side_on_view_instanced_vertex_shader_source, "vertex"), fragment, gl);
        this.spheres = initSideOnSphereShaders(getShader(gl, twod_side_on_view_vertex_shader_source, "vertex"),
            getShader(gl, perfect_sphere_side_on_view_fragment_shader_source, "fragment"), gl);
        this.lines = this.lineProgram();
        this.disk = this.diskBuffers();
    }

    /**
     * Draw the visible buffers with these matrices (column-major, WebGL's), over a cleared
     * `width` x `height` viewport in `background`. Returns how many sub-buffers were copied anew.
     */
    draw(displayBuffers: readonly DisplayBuffer[], projection: mat4.mat4, modelView: mat4.mat4,
         width: number, height: number, background: [number, number, number, number]): number {
        const gl = this.gl;
        const { draws } = planPreview(displayBuffers);
        const copied = this.sync(displayBuffers, draws);

        gl.enable(gl.DEPTH_TEST);
        gl.clearColor(...background);
        gl.viewport(0, 0, width, height);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        for (const item of draws) {
            const copy = this.copies.get(item.buffer)?.[item.index];
            if (!copy) continue;
            this.resetAttributes();
            if (item.primitive === "spheres") this.drawSpheres(item, copy, projection, modelView);
            else if (item.primitive === "triangles") this.drawTriangles(item, copy, projection, modelView);
            else this.drawLines(item, copy, projection, modelView);
        }
        this.resetAttributes();
        return copied;
    }

    /** Delete every copy and program. */
    destroy(): void {
        const gl = this.gl;
        this.copies.forEach(subs => subs.forEach(sub => sub?.buffers.forEach(b => gl.deleteBuffer(b))));
        this.copies.clear();
        [this.disk.position, this.disk.normal, this.disk.texture, this.disk.index].forEach(b => gl.deleteBuffer(b));
        [this.triangles, this.instanced, this.spheres, this.lines].forEach(p => gl.deleteProgram(p));
    }

    /** Copy what has changed, and delete the copies of buffers that have gone. */
    private sync(displayBuffers: readonly DisplayBuffer[], draws: readonly PreviewDraw[]): number {
        const gl = this.gl;
        const present = new Set(displayBuffers);
        for (const [buffer, subs] of this.copies) {
            if (present.has(buffer)) continue;
            subs.forEach(sub => sub?.buffers.forEach(b => gl.deleteBuffer(b)));
            this.copies.delete(buffer);
        }
        let copied = 0;
        for (const item of draws) {
            let subs = this.copies.get(item.buffer);
            if (!subs) {
                subs = [];
                this.copies.set(item.buffer, subs);
            }
            const existing = subs[item.index];
            const sources = sourcesOf(item);
            if (existing && existing.dataVersion === item.buffer.dataVersion && existing.sources.every((s, i) => s === sources[i])) continue;
            existing?.buffers.forEach(b => gl.deleteBuffer(b));
            subs[item.index] = this.copy(item, sources);
            copied++;
        }
        return copied;
    }

    private copy(item: PreviewDraw, sources: unknown[]): SubCopy {
        const gl = this.gl;
        const b = item.buffer, j = item.index;
        const buffers: WebGLBuffer[] = [];
        const upload = (target: number, data: ArrayBufferView): WebGLBuffer => {
            const buffer = gl.createBuffer();
            gl.bindBuffer(target, buffer);
            gl.bufferData(target, data, gl.STATIC_DRAW);
            buffers.push(buffer);
            return buffer;
        };
        const floats = (data: ArrayLike<number> | undefined) => (data ? upload(gl.ARRAY_BUFFER, asFloat32(data)) : null);
        const copy: SubCopy = {
            dataVersion: b.dataVersion, sources, buffers,
            position: null, normal: null, colour: null, index: null, origin: null, size: null, orientation: null,
        };
        if (item.colourSource !== "uniform") copy.colour = floats(b.triangleColours?.[j]);
        if (item.primitive === "spheres") {
            copy.origin = floats(b.triangleInstanceOrigins[j]);
            copy.size = floats(b.triangleInstanceSizes[j]);
            return copy;
        }
        copy.position = floats(b.triangleVertices[j]);
        if (item.indexCount > 0) copy.index = upload(gl.ELEMENT_ARRAY_BUFFER, asUint32(b.triangleIndexs[j]));
        if (item.primitive !== "triangles") return copy;
        copy.normal = floats(b.triangleNormals[j]);
        if (item.instanced) {
            const n = item.instanceCount;
            copy.origin = floats(b.triangleInstanceOrigins[j]);
            // A missing size or orientation is unit size and no turn, as the WebGPU renderer takes them.
            const sizes = b.triangleInstanceSizes?.[j];
            copy.size = floats(sizes && sizes.length >= 3 * n ? sizes : new Float32Array(3 * n).fill(1));
            const turns = b.triangleInstanceOrientations?.[j];
            let orientation: ArrayLike<number> = turns;
            if (!turns || turns.length < 16 * n) {
                const identity = new Float32Array(16 * n);
                for (let i = 0; i < n; i++) identity.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], 16 * i);
                orientation = identity;
            }
            copy.orientation = floats(orientation);
        }
        return copy;
    }

    private resetAttributes(): void {
        const gl = this.gl;
        for (let i = 0; i < 16; i++) {
            gl.disableVertexAttribArray(i);
            gl.vertexAttribDivisor(i, 0);
        }
    }

    /** A vertex attribute from `buffer`, `size` floats a vertex (or an instance, with divisor 1). */
    private attribute(location: number, buffer: WebGLBuffer, size: number, divisor = 0): void {
        const gl = this.gl;
        if (location < 0) return;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
        gl.vertexAttribDivisor(location, divisor);
    }

    /** The colour: per vertex, per instance, or the buffer's customColour for all of it. */
    private colour(location: number, item: PreviewDraw, copy: SubCopy, divisor: number): void {
        if (location < 0) return;
        if (copy.colour) {
            this.attribute(location, copy.colour, 4, divisor);
        } else {
            const c = item.buffer.customColour ?? [1, 1, 1, 1];
            this.gl.vertexAttrib4f(location, c[0], c[1], c[2], c[3] ?? 1);
        }
    }

    private matrices(program: Program, projection: mat4.mat4, modelView: mat4.mat4): void {
        const gl = this.gl;
        gl.useProgram(program);
        gl.uniformMatrix4fv(program.pMatrixUniform as WebGLUniformLocation, false, projection);
        gl.uniformMatrix4fv(program.mvMatrixUniform as WebGLUniformLocation, false, modelView);
        if (program.screenZ) gl.uniform3fv(program.screenZ as WebGLUniformLocation, [0, 0, 1]);
    }

    private drawTriangles(item: PreviewDraw, copy: SubCopy, projection: mat4.mat4, modelView: mat4.mat4): void {
        const gl = this.gl;
        const p = item.instanced ? this.instanced : this.triangles;
        this.matrices(p, projection, modelView);
        this.attribute(p.vertexPositionAttribute as number, copy.position, 3);
        this.attribute(p.vertexNormalAttribute as number, copy.normal, 3);
        this.colour(p.vertexColourAttribute as number, item, copy, item.colourSource === "instance" ? 1 : 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, copy.index);
        if (!item.instanced) {
            gl.drawElements(gl.TRIANGLES, item.indexCount, gl.UNSIGNED_INT, 0);
            return;
        }
        this.attribute(p.vertexInstanceOriginAttribute as number, copy.origin, 3, 1);
        this.attribute(p.vertexInstanceSizeAttribute as number, copy.size, 3, 1);
        const turn = p.vertexInstanceOrientationAttribute as number;
        gl.bindBuffer(gl.ARRAY_BUFFER, copy.orientation);
        for (let column = 0; column < 4; column++) {
            gl.enableVertexAttribArray(turn + column);
            gl.vertexAttribPointer(turn + column, 4, gl.FLOAT, false, 64, 16 * column);
            gl.vertexAttribDivisor(turn + column, 1);
        }
        gl.drawElementsInstanced(gl.TRIANGLES, item.indexCount, gl.UNSIGNED_INT, 0, item.instanceCount);
    }

    private drawSpheres(item: PreviewDraw, copy: SubCopy, projection: mat4.mat4, modelView: mat4.mat4): void {
        const gl = this.gl;
        const p = this.spheres;
        this.matrices(p, projection, modelView);
        // The square faces the viewer: the view's rotation undone.
        const rotation = mat4.fromValues(
            modelView[0], modelView[1], modelView[2], 0, modelView[4], modelView[5], modelView[6], 0,
            modelView[8], modelView[9], modelView[10], 0, 0, 0, 0, 1);
        gl.uniformMatrix4fv(p.mvInvMatrixUniform as WebGLUniformLocation, false, mat4.invert(mat4.create(), rotation));
        this.attribute(p.vertexPositionAttribute as number, this.disk.position, 3);
        this.attribute(p.vertexNormalAttribute as number, this.disk.normal, 3);
        this.attribute(p.vertexTextureAttribute as number, this.disk.texture, 2);
        this.attribute(p.offsetAttribute as number, copy.origin, 3, 1);
        this.attribute(p.sizeAttribute as number, copy.size, 3, 1);
        this.colour(p.vertexColourAttribute as number, item, copy, 1);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.disk.index);
        gl.drawElementsInstanced(gl.TRIANGLE_FAN, this.disk.count, gl.UNSIGNED_INT, 0, item.instanceCount);
    }

    private drawLines(item: PreviewDraw, copy: SubCopy, projection: mat4.mat4, modelView: mat4.mat4): void {
        const gl = this.gl;
        const p = this.lines;
        this.matrices(p, projection, modelView);
        this.attribute(p.vertexPositionAttribute as number, copy.position, 3);
        this.colour(p.vertexColourAttribute as number, item, copy, 0);
        if (copy.index) {
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, copy.index);
            gl.drawElements(gl.LINES, item.indexCount, gl.UNSIGNED_INT, 0);
        } else {
            gl.drawArrays(gl.LINES, 0, item.vertexCount);
        }
    }

    private lineProgram(): Program {
        const gl = this.gl;
        const program = gl.createProgram() as Program;
        gl.attachShader(program, getShader(gl, lines_side_on_view_vertex_shader_source, "vertex"));
        gl.attachShader(program, getShader(gl, lines_side_on_view_fragment_shader_source, "fragment"));
        gl.bindAttribLocation(program, 0, "aVertexPosition");
        gl.bindAttribLocation(program, 1, "aVertexColour");
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) console.warn("Side-on view lines:", gl.getProgramInfoLog(program));
        program.vertexPositionAttribute = gl.getAttribLocation(program, "aVertexPosition");
        program.vertexColourAttribute = gl.getAttribLocation(program, "aVertexColour");
        program.pMatrixUniform = gl.getUniformLocation(program, "uPMatrix");
        program.mvMatrixUniform = gl.getUniformLocation(program, "uMVMatrix");
        return program;
    }

    /** A unit square about the origin as a fan from its centre, with texture coordinates. */
    private diskBuffers(): SideOnWebGLView["disk"] {
        const gl = this.gl;
        const positions = [0, 0, 0];
        for (let theta = 45; theta <= 405; theta += 90) {
            const t = (Math.PI * theta) / 180;
            positions.push(Math.cos(t), -Math.sin(t), 0);
        }
        const count = positions.length / 3;
        const normals = new Float32Array(3 * count);
        for (let i = 0; i < count; i++) normals[3 * i + 2] = -1;
        const make = (target: number, data: ArrayBufferView) => {
            const buffer = gl.createBuffer();
            gl.bindBuffer(target, buffer);
            gl.bufferData(target, data, gl.STATIC_DRAW);
            return buffer;
        };
        return {
            position: make(gl.ARRAY_BUFFER, new Float32Array(positions)),
            normal: make(gl.ARRAY_BUFFER, normals),
            texture: make(gl.ARRAY_BUFFER, new Float32Array([0.5, 0.5, 1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0])),
            index: make(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(Array.from({ length: count }, (_, i) => i))),
            count,
        };
    }
}
