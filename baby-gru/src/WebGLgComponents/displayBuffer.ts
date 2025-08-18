import { vec3, mat4 } from 'gl-matrix';
//import * as quat4 from 'gl-matrix/quat';
//import * as mat4 from 'gl-matrix';
//import * as mat3 from 'gl-matrix/mat3';
import { vec3Create  } from './mgMaths.js';

interface MGWebGLBuffer {
    itemSize: number;
    numItems: number;
}

export class DisplayBuffer {
    origin: number[];
    visible: boolean;
    name_label: string;
    display_class: string;
    transparent: boolean;
    alphaChanged: boolean;
    atoms: {chain_id: string, has_altloc: boolean, mol_name: string, serial: number, res_no:string, res_name:string, name: string, charge: number, tempFactor: number, x: number, y: number, z: number, element: string}[];
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
    triangleIndexs: number[][];
    triangleVertices: number[][];
    triangleInstanceOrigins: number[][];
    triangleInstanceSizes: number[][];
    triangleInstanceOrientations: number[][];
    triangleColours: number[][];
    triangleNormals: number[][];
    primitiveSizes: number[][];
    bufferTypes: string[];
    customColour: [number,number,number,number] | null;
    transformMatrix: number[];
    transformMatrixInteractive: number[];
    transformOriginInteractive: number[];
    symopnums: number[];
    supplementary: any;
    isDirty: boolean;
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
    multiViewGroup: number;
    clickTol: number;
    doStencil: boolean;

    constructor() {
        this.visible = true;
        this.name_label = "";
        this.display_class = "NONE";
        this.transparent = false;
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
    }

    setTransformMatrix(transformMatrix) {
        this.transformMatrix = transformMatrix;
    }

}
