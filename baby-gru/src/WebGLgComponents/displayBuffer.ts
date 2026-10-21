import { vec3, mat4 } from 'gl-matrix';
//import * as quat4 from 'gl-matrix/quat';
//import * as mat4 from 'gl-matrix';
//import * as mat3 from 'gl-matrix/mat3';
import { moorhen } from '../types/moorhen';
import { vec3Create  } from './mgMaths.js';
import type { BufferMaterial } from './textureRegistry';
import { clampFade, isFaded } from './objectFade';
import type { MGWebGLBuffer, PendingInfluence } from './glResources';

/**
 * Per-vertex data for one sub-buffer.
 *
 * Ingestion (createWebGLBuffers) always stores typed arrays now. Plain arrays are still allowed
 * because a few producers build buffers by hand; anything reading these should index them rather
 * than use Array methods.
 */
export type VertexData = Float32Array | number[];
/** Indices for one sub-buffer. See VertexData. */
export type IndexData = Uint32Array | number[];

export class DisplayBuffer {
    // pick_point_instances maps a pick_points index back to the instance that owns it, for
    // instanced geometry where one instance may offer several pick points. Absent means one point
    // per instance, so the two indices coincide.
    //
    // pick_point_sections and section_ranges are the finer-grained pair: a mesh whose parts are
    // separately hoverable maps the picked index to a section, and the section to the half-open
    // range of vertex ids that the shader lights. Present only for a mesh that is the sole
    // instance of itself, since a vertex id says nothing about which instance is being drawn.
    //
    // instance_tags names whole instances rather than sections - a separate channel with its own
    // kind, so a mesh can answer both "which piece is this" and "which thing is it part of" in
    // two different schemes at once.
    //
    // section_level_ranges and section_level_points are coarser readings of the same sections,
    // each indexed by section exactly as section_ranges is, so a consumer swaps one level's
    // array in and its existing section index still means something. Level 0 repeats the finest.
    pick_info: {influence_weights_width?:number,influence_index_offsets_width?:number,influence_point_indexes_width?:number,influence_weights_texture?:number,influence_index_offsets_texture?:number,influence_point_indexes_texture?:number,pick_points?:[], point_triangles?:number[][], pick_point_instances?:number[], pick_point_sections?:number[], section_ranges?:number[][], section_level_ranges?:number[][][], section_level_points?:number[][][], pick_spans?:number[][], pick_radius?:number, pick_point_tags?:string[], pick_tag_kind?:string, instance_tags?:string[], instance_tag_kind?:string, claims_pointer?:boolean, pick_priority?:number, highlight_whole?:boolean, pick_exact?:boolean, pick_bounds?:{low:[number,number,number],high:[number,number,number]}, pending_influence?:PendingInfluence}
    origin: number[];
    visible: boolean;
    name_label: string;
    display_class: string;
    transparent: boolean;
    /**
     * A fade applied to the whole buffer, from 0 to 1, multiplied into the fragment alpha.
     *
     * Distinct from the vertex colours' own alpha, which says what the object is made of. This
     * says how much of it is there at this moment, which is a movie's business and changes per
     * frame - so it is a uniform rather than a rewrite of every vertex. See objectFade.
     *
     * Ignored on a WebGL1 context, where the uniform is not registered and objects stay solid.
     */
    alphaMultiplier: number;
    alphaChanged: boolean;
    atoms: moorhen.AtomInfo[];
    symmetryAtoms: {chain_id: string, has_altloc: boolean, mol_name: string, serial: number, res_no:string, res_name:string, name: string, charge: number, tempFactor: number, pos: vec3, element: string}[][];
    symmetryMatrices: number[];
    changeColourWithSymmetry: boolean;
    triangleVertexRealNormalBuffer: MGWebGLBuffer[];
    triangleVertexNormalBuffer: MGWebGLBuffer[];
    triangleVertexPositionBuffer: MGWebGLBuffer[];
    triangleVertexIndexBuffer: MGWebGLBuffer[];
    triangleVertexTextureBuffer: MGWebGLBuffer[];
    triangleInstanceOriginBuffer: MGWebGLBuffer[];
    triangleInstanceOrientationBuffer: MGWebGLBuffer[];
    triangleInstanceSizeBuffer: MGWebGLBuffer[];
    triangleColourBuffer: MGWebGLBuffer[];
    triangleIndexs: IndexData[];
    triangleVertices: VertexData[];
    triangleInstanceOrigins: VertexData[];
    triangleInstanceSizes: VertexData[];
    triangleInstanceOrientations: VertexData[];
    triangleColours: VertexData[];
    triangleNormals: VertexData[];
    /**
     * Flat u,v per vertex, one array per sub-buffer.
     *
     * The GL buffer for these (triangleVertexTextureBuffer) and the attribute they feed
     * (aVertexTexture, bound to location 3) both long predate anything filling them.
     */
    triangleTextureCoords: VertexData[];
    /**
     * What each sub-buffer is drawn with, beyond its vertex colours.
     *
     * Per sub-buffer rather than per buffer because that is the grain a material has: a glTF
     * primitive carries exactly one, and a file with several becomes several sub-buffers of one
     * object. Sparse - most sub-buffers have no entry, and that means "vertex colours alone".
     */
    materials: (BufferMaterial | undefined)[];
    primitiveSizes: number[][];
    bufferTypes: string[];
    customColour: [number,number,number,number] | null;
    transformMatrix: number[];
    transformMatrixInteractive: number[];
    transformOriginInteractive: number[];
    symopnums: number[];
    supplementary: any;
    /**
     * Counts the times this buffer has been marked dirty: bumped by every `isDirty = true`.
     *
     * isDirty itself belongs to the WebGL renderer, which clears it once it has uploaded the new
     * data, so anything else drawing the same buffers cannot tell from it that the data changed.
     * This lets it: keep the number you last uploaded at, and upload again when it moves.
     */
    dataVersion = 0;
    private _isDirty = true;
    get isDirty(): boolean { return this._isDirty; }
    set isDirty(dirty: boolean) {
        if (dirty) this.dataVersion++;
        this._isDirty = dirty;
    }
    textNormalBuffer: MGWebGLBuffer[] | null;
    textPositionBuffer: MGWebGLBuffer[] | null;
    textColourBuffer: MGWebGLBuffer[] | null;
    textTexCoordBuffer: MGWebGLBuffer[] | null;
    textIndexesBuffer: MGWebGLBuffer[] | null;
    clickLinePositionBuffer: MGWebGLBuffer[] | null;
    clickLineColourBuffer: MGWebGLBuffer[] | null;
    clickLineIndexesBuffer: MGWebGLBuffer[] | null;
    textNormals: number[];
    textColours: number[];
    isHoverBuffer: boolean;
    id: string;
    /**
     * What made this buffer, for attributing a frame's cost back to a representation.
     *
     * Descriptive only: nothing in the renderer branches on it, and a buffer without one is
     * still drawn exactly the same. It exists because the draw loop sees a flat list of
     * buffers and cannot say which of them is the ribbons, so "1.1M triangles" is a number
     * with nowhere to go. Set where buffers are produced rather than derived at draw time,
     * since that is the only place that still knows.
     */
    statsLabel?: string;
    multiViewGroup: number;
    clickTol: number;
    doStencil: boolean;
    // uses gl.depthRange
    alwaysOnTop: boolean;

    constructor() {
        this.visible = true;
        this.name_label = "";
        this.display_class = "NONE";
        this.transparent = false;
        this.alphaMultiplier = 1.0;
        this.alphaChanged = false;
        this.atoms = [];
        this.symmetryMatrices = [];
        this.clearBuffers();
        this.symmetryAtoms = []
        this.changeColourWithSymmetry = true;
        this.isHoverBuffer = false;
        this.id = "";
    }

    setCustomColour(col) {
        this.customColour = col;
        if(col[3]<0.99)
            this.transparent = true
        else
            this.transparent = false
    }

    /**
     * Fade the whole buffer.
     *
     * A faded buffer has to be drawn as a transparent one, or it writes depth as though solid and
     * everything behind it disappears instead of showing through. That is why this touches
     * `transparent` rather than only storing a number.
     */
    setAlphaMultiplier(alphaMultiplier: number) {
        this.alphaMultiplier = clampFade(alphaMultiplier);
        if (isFaded(this.alphaMultiplier)) this.transparent = true;
        else if (!this.customColour || this.customColour[3] >= 0.99) this.transparent = false;
    }

    updateSymmetryAtoms() {
        this.symmetryAtoms = []
        this.symmetryMatrices.forEach(mat =>{
                const symt = mat4.create();
                mat4.set(symt,
                        mat[0], mat[1], mat[2], mat[3],
                        mat[4], mat[5], mat[6], mat[7],
                        mat[8], mat[9], mat[10], mat[11],
                        mat[12], mat[13], mat[14], mat[15]);
                const theseSymmAtoms = []
                for (let j = 0; j < this.atoms.length; j++) {
                    const atx = this.atoms[j].x;
                    const aty = this.atoms[j].y;
                    const atz = this.atoms[j].z;
                    const p = vec3Create([atx, aty, atz]);
                    const atPosTrans = vec3Create([0, 0, 0]);
                    vec3.transformMat4(atPosTrans, p, symt);
                    const symmAt = {
                        charge: this.atoms[j].charge,
                        tempFactor: this.atoms[j].tempFactor,
                        element: this.atoms[j].element,
                        name:this.atoms[j].name,
                        res_name:this.atoms[j].res_name,
                        res_no:this.atoms[j].res_no,
                        mol_name:this.atoms[j].mol_name,
                        serial:this.atoms[j].serial,
                        has_altloc:this.atoms[j].has_altloc,
                        chain_id:this.atoms[j].chain_id,
                        pos: atPosTrans
                    }
                    theseSymmAtoms.push(symmAt)
                }
                this.symmetryAtoms.push(theseSymmAtoms)
        })
    }

    clearBuffers() {
        this.triangleVertexRealNormalBuffer = []; // This is for lit lines.
        this.triangleVertexNormalBuffer = [];
        this.triangleVertexPositionBuffer = [];
        this.triangleVertexIndexBuffer = [];
        this.triangleVertexTextureBuffer = [];
        this.triangleInstanceOriginBuffer = [];
        this.triangleInstanceOrientationBuffer = [];
        this.triangleInstanceSizeBuffer = [];
        this.triangleColourBuffer = [];
        this.triangleIndexs = [];
        this.triangleVertices = [];
        this.triangleInstanceOrigins = [];
        this.triangleInstanceSizes = [];
        this.triangleInstanceOrientations = [];
        this.triangleColours = [];
        this.triangleNormals = [];
        this.triangleTextureCoords = [];
        this.materials = [];
        this.primitiveSizes = [];
        this.bufferTypes = [];
        this.customColour = null;
        this.transformMatrix = null;
        this.transformMatrixInteractive = null;
        this.transformOriginInteractive = [0, 0, 0];
        this.symopnums = [];
        this.supplementary = {};
        this.isDirty = true;
        this.textNormalBuffer = null;
        this.textPositionBuffer = null;
        this.textColourBuffer = null;
        this.textTexCoordBuffer = null;
        this.textIndexesBuffer = null;
        this.clickLinePositionBuffer = null;
        this.clickLineColourBuffer = null;
        this.clickLineIndexesBuffer = null;
        this.textNormals = [];
        this.textColours = [];
        this.atoms = [];
        this.clickTol = null;
        this.doStencil = false;
        this.alwaysOnTop = false;
    }

    setTransformMatrix(transformMatrix) {
        this.transformMatrix = transformMatrix;
    }

}
