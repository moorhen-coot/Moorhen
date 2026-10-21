import { guid } from '../utils/utils';
import { DisplayBuffer } from './displayBuffer'
import { getEncodedData } from './encodedData'
import { pendingGLBuffer } from './glResources'

/**
 * Turning one object of worker output (vert_tri, idx_tri, col_tri, ... indexed [idat][subBuffer])
 * into a DisplayBuffer.
 *
 * Despite the name, nothing here touches WebGL any more. Each handle slot gets a placeholder
 * (see glResources.ts) and buildBuffers creates the real buffer at first upload, so a
 * DisplayBuffer can exist, and be read by any renderer, without a WebGL context.
 *
 * The per-vertex data is kept as typed arrays. The worker already produces Float32Array and
 * Uint32Array; this used to unpack them into plain arrays one parseFloat at a time, only for
 * buildBuffers to pack them back into typed arrays for upload - two copies of every map contour
 * on the main thread. The data is still copied rather than referenced, as before, so a buffer
 * never shares storage with the jsondata it came from or with a sibling built from the same
 * object. Plain arrays from other producers are converted once here.
 */

/** A Float32Array copy of `data`, whatever it arrived as. Number() matches the old parseFloat for numeric strings. */
const asFloat32 = (data: ArrayLike<number | string>): Float32Array =>
    data instanceof Float32Array ? data.slice() : Float32Array.from(data as ArrayLike<number>, Number);

/** As asFloat32, for indices. */
const asUint32 = (data: ArrayLike<number | string>): Uint32Array =>
    data instanceof Uint32Array ? data.slice() : Uint32Array.from(data as ArrayLike<number>, Number);

const createInstanceOriginsBuffer = (tri,theBuffer) => {
    const data = asFloat32(tri);
    theBuffer.triangleInstanceOrigins.push(data);
    theBuffer.triangleInstanceOriginBuffer.push(pendingGLBuffer(data.length / 3));
}

const createInstanceOrientationsBuffer = (tri,theBuffer) => {
    const data = asFloat32(tri);
    theBuffer.triangleInstanceOrientations.push(data);
    theBuffer.triangleInstanceOrientationBuffer.push(pendingGLBuffer(data.length / 16));
}

const createInstanceSizesBuffer = (tri,theBuffer) => {
    const data = asFloat32(tri);
    theBuffer.triangleInstanceSizes.push(data);
    theBuffer.triangleInstanceSizeBuffer.push(pendingGLBuffer(data.length / 3));
}

const createVertexBuffer = (tri,theBuffer) => {
    const data = asFloat32(tri);
    theBuffer.triangleVertices.push(data);
    theBuffer.triangleVertexPositionBuffer.push(pendingGLBuffer(data.length / 3));
}

// The data is ignored: buildBuffers fills this slot with the normals it computes for thick lines.
const createRealNormalBuffer = (_tri,theBuffer) => { //Where "Real" is open to intepretation ...
    theBuffer.triangleVertexRealNormalBuffer.push(pendingGLBuffer(0));
}

/**
 * Texture coordinates for one sub-buffer.
 *
 * Copied rather than referenced, and counted in pairs, matching how the normal and colour
 * buffers are built next door. numItems is the vertex count so that it can be compared with the
 * position buffer's - a mismatch means the file disagrees with itself and the attribute is left
 * unfed rather than read short.
 */
const createTextureCoordBuffer = (tex,theBuffer) => {
    const data = asFloat32(tex);
    theBuffer.triangleTextureCoords.push(data);
    theBuffer.triangleVertexTextureBuffer.push(pendingGLBuffer(data.length / 2));
}

const createNormalBuffer = (norm,theBuffer) => {
    const data = asFloat32(norm);
    theBuffer.triangleNormals.push(data);
    theBuffer.triangleVertexNormalBuffer.push(pendingGLBuffer(data.length / 3));
}

const createColourBuffer = (colour,theBuffer) => {
    const data = asFloat32(colour);
    // Judged on the first vertex alone, as it always has been.
    if (Math.abs(data[3]) < 0.99) {
        theBuffer.transparent = true;
    }
    theBuffer.triangleColours.push(data);
    theBuffer.triangleColourBuffer.push(pendingGLBuffer(data.length / 4));
}

const addSupplementaryInfo = (info,name,theBuffer) => {
    if (typeof (theBuffer.supplementary[name]) === "undefined") {
        theBuffer.supplementary[name] = [info];
    } else {
        theBuffer.supplementary[name].push(info);
    }
}

// numItems is the index count, not a vertex count.
const createIndexBuffer = (idx,theBuffer) => {
    const data = asUint32(idx);
    theBuffer.triangleIndexs.push(data);
    theBuffer.triangleVertexIndexBuffer.push(pendingGLBuffer(data.length));
}

const createSizeBuffer = (idx,theBuffer) => {
    theBuffer.primitiveSizes.push([]);
    for (let j = 0; j < idx.length; j++) {
        theBuffer.primitiveSizes[theBuffer.primitiveSizes.length - 1].push(parseFloat(idx[j]));
    }
}

export const createWebGLBuffers = (jsondata: any, idat: number): DisplayBuffer => {

    const theBuffer = new DisplayBuffer()

    if (jsondata.instance_origins) {
        const rssentries = jsondata.instance_origins[idat];
        if(rssentries){
            const instance_origins = rssentries;
            for (let i = 0; i < instance_origins.length; i++) {
                createInstanceOriginsBuffer(instance_origins[i],theBuffer);
            }
        }
    }

    if (jsondata.instance_sizes) {
        const rssentries = jsondata.instance_sizes[idat];
        if(rssentries){
            const instance_sizes = rssentries;
            for (let i = 0; i < instance_sizes.length; i++) {
                createInstanceSizesBuffer(instance_sizes[i],theBuffer);
            }
        }
    }

    if (jsondata.instance_orientations) {
        const rssentries = jsondata.instance_orientations[idat];
        if(rssentries){
            const instance_orientations = rssentries;
            for (let i = 0; i < instance_orientations.length; i++) {
                createInstanceOrientationsBuffer(instance_orientations[i],theBuffer);
            }
        }
    }

    if (jsondata.additional_norm_tri) {
        const rssentries = jsondata.additional_norm_tri[idat];
        const add_norms = rssentries;
        for (let i = 0; i < add_norms.length; i++) {
            createRealNormalBuffer(add_norms[i],theBuffer); //This is dummy data. It will be blatted.
        }
    }

    if (jsondata.vert_tri) {
        const rssentries = jsondata.vert_tri[idat];
        const tris = rssentries;

        for (let i = 0; i < tris.length; i++) {
            createVertexBuffer(tris[i],theBuffer);
        }
    }

    if (jsondata.idx_tri) {
        const rssentries = jsondata.idx_tri[idat];
        const idxs = rssentries;

        for (let i = 0; i < idxs.length; i++) {
            createIndexBuffer(idxs[i],theBuffer);
        }
    }

    if (typeof (jsondata.instance_use_colors) !== "undefined") {
        if (typeof (jsondata.instance_use_colors[idat]) !== "undefined") {
            const rssentries = jsondata.instance_use_colors[idat];
            if(rssentries){
                for (let i = 0; i < rssentries.length; i++) {
                    addSupplementaryInfo(rssentries[i], "instance_use_colors",theBuffer);
                }
            }
        }
    }

    if (typeof (jsondata.useIndices) !== "undefined") {
        if (typeof (jsondata.useIndices[idat]) !== "undefined") {
            const rssentries = getEncodedData(jsondata.useIndices[idat]);
            for (let i = 0; i < rssentries.length; i++) {
                addSupplementaryInfo(rssentries[i], "useIndices",theBuffer);
            }
        }
    }

    if (typeof (jsondata.radii) !== "undefined") {
        if (typeof (jsondata.radii[idat]) !== "undefined") {
            const rssentries = jsondata.radii[idat];
            for (let i = 0; i < rssentries.length; i++) {
                addSupplementaryInfo(rssentries[i], "radii",theBuffer);
            }
        }
    }

    if (typeof (jsondata.scale_matrices) !== "undefined") {
        if (typeof (jsondata.scale_matrices[idat]) !== "undefined") {
            const rssentries = jsondata.scale_matrices[idat];
            for (let i = 0; i < rssentries.length; i++) {
                addSupplementaryInfo(rssentries[i], "scale_matrices",theBuffer);
            }
        }
    }

    if (typeof (jsondata.customSplineNormals) !== "undefined") {
        if (typeof (jsondata.customSplineNormals[idat]) !== "undefined") {
            const rssentries = jsondata.customSplineNormals[idat];
            for (let i = 0; i < rssentries.length; i++) {
                addSupplementaryInfo(rssentries[i], "customSplineNormals",theBuffer);
            }
        }
    }

    if (typeof (jsondata.spline_accu) !== "undefined") {
        if (typeof (jsondata.spline_accu[idat]) !== "undefined") {
            const rssentries = jsondata.spline_accu[idat];
            for (let i = 0; i < rssentries.length; i++) {
                addSupplementaryInfo(rssentries[i], "spline_accu",theBuffer);
            }
        }
    }

    if (typeof (jsondata.accu) !== "undefined") {
        if (typeof (jsondata.accu[idat]) !== "undefined") {
            const rssentries = jsondata.accu[idat];
            for (let i = 0; i < rssentries.length; i++) {
                addSupplementaryInfo(rssentries[i], "accu",theBuffer);
            }
        }
    }

    if (typeof (jsondata.arrow) !== "undefined") {
        if (typeof (jsondata.arrow[idat]) !== "undefined") {
            const rssentries = jsondata.arrow[idat];
            for (let i = 0; i < rssentries.length; i++) {
                addSupplementaryInfo(rssentries[i], "arrow",theBuffer);
            }
        }
    }

    if (typeof (jsondata.vert_tri_2d) !== "undefined") {
        if (typeof (jsondata.vert_tri_2d[idat]) !== "undefined") {
            const rssentries = jsondata.vert_tri_2d[idat];
            for (let i = 0; i < rssentries.length; i++) {
                addSupplementaryInfo(rssentries[i], "vert_tri_2d",theBuffer);
            }
        }
    }

    if (typeof (jsondata.font) !== "undefined") {
        if (typeof (jsondata.font[idat]) !== "undefined") {
            const rssentries = jsondata.font[idat];
            for (let i = 0; i < rssentries.length; i++) {
                addSupplementaryInfo(rssentries[i], "font",theBuffer);
            }
        }
    }

    if (typeof (jsondata.imgsrc) !== "undefined") {
        if (typeof (jsondata.imgsrc[idat]) !== "undefined") {
            const rssentries = jsondata.imgsrc[idat];
            for (let i = 0; i < rssentries.length; i++) {
                addSupplementaryInfo(rssentries[i], "imgsrc",theBuffer);
            }
        }
    }

    if (typeof (jsondata.sizes) !== "undefined") {
        if (typeof (jsondata.sizes[idat]) !== "undefined") {
            const rssentries = jsondata.sizes[idat];
            for (let i = 0; i < rssentries.length; i++) {
                createSizeBuffer(rssentries[i],theBuffer);
            }
        }
    }

    if (jsondata.col_tri) {
        const rssentries = jsondata.col_tri[idat];
        const colours = rssentries;

        for (let i = 0; i < colours.length; i++) {
            createColourBuffer(colours[i],theBuffer);
        }
    }

    if (jsondata.prim_types) {
        const rssentries = jsondata.prim_types[idat];
        for (let i = 0; i < rssentries.length; i++) {
            theBuffer.bufferTypes.push(rssentries[i]);
        }
    }

    if (typeof (jsondata.visibility) !== "undefined") {
        if (typeof (jsondata.visibility[idat]) !== "undefined") {
            const thisVis = jsondata.visibility[idat];
            theBuffer.visible = thisVis;
        }
    } else {
        // Don't know when this can be triggered ...
        const thisVis = true;
        if (!thisVis) {
            theBuffer.visible = false;
        }
    }

    theBuffer.name_label = "foo";
    theBuffer.id = guid();

    if (typeof (jsondata.atoms) !== "undefined") {
        theBuffer.atoms = jsondata.atoms[idat][0];
    } else {
        theBuffer.atoms = [];
    }

    if(jsondata.clickTol){
        theBuffer.clickTol = jsondata.clickTol;
    }
    if(jsondata.doStencil){
        theBuffer.doStencil = jsondata.doStencil;
    }
    if(jsondata.alwaysOnTop){
        theBuffer.alwaysOnTop = jsondata.alwaysOnTop;
    }

    if(jsondata.norm_tri){
        const rssentries = jsondata.norm_tri[idat];
        const norms = rssentries;
        for (let i = 0; i < norms.length; i++) {
            createNormalBuffer(norms[i],theBuffer);
        }
    }

    // Texture coordinates, one array per sub-buffer, in the same [[...]] shape as the rest. The
    // GL buffer and the attribute have been in place for years with nothing feeding them; this is
    // the feed. Absent for everything that is not textured, which is almost everything.
    if(jsondata.tex_tri){
        const rssentries = jsondata.tex_tri[idat];
        if(rssentries){
            for (let i = 0; i < rssentries.length; i++) {
                createTextureCoordBuffer(rssentries[i],theBuffer);
            }
        }
    }

    // Materials are per sub-buffer and sparse: an entry of undefined, or no entry at all, means
    // "vertex colours alone". Stored by index so that it lines up with bufferTypes.
    if(jsondata.materials){
        const rssentries = jsondata.materials[idat];
        if(rssentries){
            for (let i = 0; i < rssentries.length; i++) {
                theBuffer.materials[i] = rssentries[i];
            }
        }
    }

    if(jsondata.pick_info){
        if(jsondata.pick_info.influence_weights && jsondata.pick_info.influence_point_indexes && jsondata.pick_info.influence_index_offsets && jsondata.pick_info.pick_points){
            // The influence data becomes three textures, made by realiseGLResources once there
            // is a context. Until then the buffer still picks by pick_points alone.
            theBuffer.pick_info = {
                pick_points: jsondata.pick_info.pick_points,
                pending_influence: {
                    weights: jsondata.pick_info.influence_weights,
                    point_indexes: jsondata.pick_info.influence_point_indexes,
                    index_offsets: jsondata.pick_info.influence_index_offsets,
                },
            }
        } else {
            theBuffer.pick_info = jsondata.pick_info
        }
    }

    return theBuffer
}
