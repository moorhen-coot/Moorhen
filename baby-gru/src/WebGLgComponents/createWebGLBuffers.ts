import { guid } from '../utils/utils';
import { store } from '../store/MoorhenReduxStore'
import { DisplayBuffer } from './displayBuffer'
import { getEncodedData } from './encodedData'

const createInstanceOriginsBuffer = (tri,theBuffer,gl) => {
    theBuffer.triangleInstanceOriginBuffer.push(gl.createBuffer());
    theBuffer.triangleInstanceOriginBuffer[theBuffer.triangleInstanceOriginBuffer.length - 1].numItems = 0;
    theBuffer.triangleInstanceOrigins.push([]);
    for (let j = 0; j < tri.length; j++) {
        theBuffer.triangleInstanceOrigins[theBuffer.triangleInstanceOrigins.length - 1].push(parseFloat(tri[j]));
        theBuffer.triangleInstanceOriginBuffer[theBuffer.triangleInstanceOriginBuffer.length - 1].numItems++;
    }
    theBuffer.triangleInstanceOriginBuffer[theBuffer.triangleInstanceOriginBuffer.length - 1].numItems /= 3;
}

const createInstanceOrientationsBuffer = (tri,theBuffer,gl) => {
    theBuffer.triangleInstanceOrientationBuffer.push(gl.createBuffer());
    theBuffer.triangleInstanceOrientationBuffer[theBuffer.triangleInstanceOrientationBuffer.length - 1].numItems = 0;
    theBuffer.triangleInstanceOrientations.push([]);
    for (let j = 0; j < tri.length; j++) {
        theBuffer.triangleInstanceOrientations[theBuffer.triangleInstanceOrientations.length - 1].push(parseFloat(tri[j]));
        theBuffer.triangleInstanceOrientationBuffer[theBuffer.triangleInstanceOrientationBuffer.length - 1].numItems++;
    }
    theBuffer.triangleInstanceOrientationBuffer[theBuffer.triangleInstanceOrientationBuffer.length - 1].numItems /= 16;
}

const createInstanceSizesBuffer = (tri,theBuffer,gl) => {
    theBuffer.triangleInstanceSizeBuffer.push(gl.createBuffer());
    theBuffer.triangleInstanceSizeBuffer[theBuffer.triangleInstanceSizeBuffer.length - 1].numItems = 0;
    theBuffer.triangleInstanceSizes.push([]);
    for (let j = 0; j < tri.length; j++) {
        theBuffer.triangleInstanceSizes[theBuffer.triangleInstanceSizes.length - 1].push(parseFloat(tri[j]));
        theBuffer.triangleInstanceSizeBuffer[theBuffer.triangleInstanceSizeBuffer.length - 1].numItems++;
    }
    theBuffer.triangleInstanceSizeBuffer[theBuffer.triangleInstanceSizeBuffer.length - 1].numItems /= 3;
}

const createVertexBuffer = (tri,theBuffer,gl) => {
    theBuffer.triangleVertexPositionBuffer.push(gl.createBuffer());
    theBuffer.triangleVertexPositionBuffer[theBuffer.triangleVertexPositionBuffer.length - 1].numItems = 0;
    theBuffer.triangleVertices.push([]);
    for (let j = 0; j < tri.length; j++) {
        theBuffer.triangleVertices[theBuffer.triangleVertices.length - 1].push(parseFloat(tri[j]));
        theBuffer.triangleVertexPositionBuffer[theBuffer.triangleVertexPositionBuffer.length - 1].numItems++;
    }
    theBuffer.triangleVertexPositionBuffer[theBuffer.triangleVertexPositionBuffer.length - 1].numItems /= 3;
}

const createRealNormalBuffer = (tri,theBuffer,gl) => { //Where "Real" is open to intepretation ...
    theBuffer.triangleVertexRealNormalBuffer.push(gl.createBuffer());
    theBuffer.triangleVertexRealNormalBuffer[theBuffer.triangleVertexRealNormalBuffer.length - 1].numItems = 0;
}

const createNormalBuffer = (norm,theBuffer,gl) => {
    theBuffer.triangleNormals.push([]);
    theBuffer.triangleVertexNormalBuffer.push(gl.createBuffer());
    theBuffer.triangleVertexNormalBuffer[theBuffer.triangleVertexNormalBuffer.length - 1].numItems = 0;
    for (let j = 0; j < norm.length; j++) {
        theBuffer.triangleNormals[theBuffer.triangleNormals.length - 1].push(parseFloat(norm[j]));
        theBuffer.triangleVertexNormalBuffer[theBuffer.triangleVertexNormalBuffer.length - 1].numItems++;
    }
    theBuffer.triangleVertexNormalBuffer[theBuffer.triangleVertexNormalBuffer.length - 1].numItems /= 3;
}

const createColourBuffer = (colour,theBuffer,gl) => {
    theBuffer.triangleColourBuffer.push(gl.createBuffer());
    theBuffer.triangleColourBuffer[theBuffer.triangleColourBuffer.length - 1].numItems = 0;
    theBuffer.triangleColours.push([]);
    if (Math.abs(parseFloat(colour[3])) < 0.99) {
        //console.log("This is transparent");
        theBuffer.transparent = true;
    }
    for (let j = 0; j < colour.length; j++) {
        theBuffer.triangleColours[theBuffer.triangleColours.length - 1].push(parseFloat(colour[j]));
        theBuffer.triangleColourBuffer[theBuffer.triangleColourBuffer.length - 1].numItems++;
    }
    theBuffer.triangleColourBuffer[theBuffer.triangleColourBuffer.length - 1].numItems /= 4;
}

const addSupplementaryInfo = (info,name,theBuffer) => {
    if (typeof (theBuffer.supplementary[name]) === "undefined") {
        theBuffer.supplementary[name] = [info];
    } else {
        theBuffer.supplementary[name].push(info);
    }
}

const createIndexBuffer = (idx,theBuffer,gl) => {
    theBuffer.triangleVertexIndexBuffer.push(gl.createBuffer());
    theBuffer.triangleVertexIndexBuffer[theBuffer.triangleVertexIndexBuffer.length - 1].numItems = 0;
    theBuffer.triangleIndexs.push([]);
    for (let j = 0; j < idx.length; j++) {
        theBuffer.triangleIndexs[theBuffer.triangleIndexs.length - 1].push(parseFloat(idx[j]));
        theBuffer.triangleVertexIndexBuffer[theBuffer.triangleVertexIndexBuffer.length - 1].numItems++;
    }
}

const createSizeBuffer = (idx,theBuffer) => {
    theBuffer.primitiveSizes.push([]);
    for (let j = 0; j < idx.length; j++) {
        theBuffer.primitiveSizes[theBuffer.primitiveSizes.length - 1].push(parseFloat(idx[j]));
    }
}

export const createWebGLBuffers = (jsondata: any, idat: number): DisplayBuffer => {

    const theBuffer = new DisplayBuffer()
    const gl = store.getState().glRef.glCtx

    if (jsondata.instance_origins) {
        const rssentries = jsondata.instance_origins[idat];
        if(rssentries){
            const instance_origins = rssentries;
            for (let i = 0; i < instance_origins.length; i++) {
                createInstanceOriginsBuffer(instance_origins[i],theBuffer,gl);
            }
        }
    }

    if (jsondata.instance_sizes) {
        const rssentries = jsondata.instance_sizes[idat];
        if(rssentries){
            const instance_sizes = rssentries;
            for (let i = 0; i < instance_sizes.length; i++) {
                createInstanceSizesBuffer(instance_sizes[i],theBuffer,gl);
            }
        }
    }

    if (jsondata.instance_orientations) {
        const rssentries = jsondata.instance_orientations[idat];
        if(rssentries){
            const instance_orientations = rssentries;
            for (let i = 0; i < instance_orientations.length; i++) {
                createInstanceOrientationsBuffer(instance_orientations[i],theBuffer,gl);
            }
        }
    }

    if (jsondata.additional_norm_tri) {
        const rssentries = jsondata.additional_norm_tri[idat];
        const add_norms = rssentries;
        for (let i = 0; i < add_norms.length; i++) {
            createRealNormalBuffer(add_norms[i],theBuffer,gl); //This is dummy data. It will be blatted.
        }
    }

    if (jsondata.vert_tri) {
        const rssentries = jsondata.vert_tri[idat];
        const tris = rssentries;

        for (let i = 0; i < tris.length; i++) {
            createVertexBuffer(tris[i],theBuffer,gl);
        }
    }

    if (jsondata.idx_tri) {
        const rssentries = jsondata.idx_tri[idat];
        const idxs = rssentries;

        for (let i = 0; i < idxs.length; i++) {
            for (let j = 0; j < idxs[i].length; j++) {
            }
            createIndexBuffer(idxs[i],theBuffer,gl);
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
            createColourBuffer(colours[i],theBuffer,gl);
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

    if(jsondata.norm_tri){
        const rssentries = jsondata.norm_tri[idat];
        const norms = rssentries;
        for (let i = 0; i < norms.length; i++) {
            createNormalBuffer(norms[i],theBuffer,gl);
        }
    }

    if (jsondata.instance_origins) {
        const rssentries = jsondata.instance_origins[idat];
        if(rssentries){
            const instance_origins = rssentries;
            for (let i = 0; i < instance_origins.length; i++) {
                createInstanceOriginsBuffer(instance_origins[i],theBuffer,gl);
            }
        }
    }

    if (jsondata.instance_sizes) {
        const rssentries = jsondata.instance_sizes[idat];
        if(rssentries){
            const instance_sizes = rssentries;
            for (let i = 0; i < instance_sizes.length; i++) {
                createInstanceSizesBuffer(instance_sizes[i],theBuffer,gl);
            }
        }
    }

    if (jsondata.instance_orientations) {
        const rssentries = jsondata.instance_orientations[idat];
        if(rssentries){
            const instance_orientations = rssentries;
            for (let i = 0; i < instance_orientations.length; i++) {
                createInstanceOrientationsBuffer(instance_orientations[i],theBuffer,gl);
            }
        }
    }

    if (jsondata.additional_norm_tri) {
        const rssentries = jsondata.additional_norm_tri[idat];
        const add_norms = rssentries;
        for (let i = 0; i < add_norms.length; i++) {
            createRealNormalBuffer(add_norms[i],theBuffer,gl); //This is dummy data. It will be blatted.
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

    if(jsondata.clickTol){
        theBuffer.clickTol = jsondata.clickTol;
    }
    if(jsondata.doStencil){
        theBuffer.doStencil = jsondata.doStencil;
    }

    return theBuffer
}
