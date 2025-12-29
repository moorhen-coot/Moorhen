import * as vec3 from 'gl-matrix/vec3';
import { guid } from '../utils/utils';
import { setHoverSize, setLabelBuffers, setTexturedShapes } from "../store/glRefSlice"
import { NormalizeVec3, vec3Cross, vec3Create  } from './mgMaths.js';
import { DisplayBuffer } from './displayBuffer'
import { TexturedShape } from './texturedShape'
import { createWebGLBuffers } from './createWebGLBuffers'
import { MoorhenReduxStoreType, RootState } from '../store/MoorhenReduxStore';

export const appendOtherData = (jsondata: any, store: MoorhenReduxStoreType, skipRebuild?: boolean, name?: string) : any => {

        const theseBuffers = [];
        const theseTexturedShapes = [];
        const theseLabelBuffers = [];
        const gl = store.getState().glRef.glCtx
        if(!gl) return theseBuffers
        const labelBuffers = store.getState().glRef.labelBuffers
        const texturedShapes = store.getState().glRef.texturedShapes
        const GLLabelsFontFamily = store.getState().labelSettings.GLLabelsFontFamily
        const GLLabelsFontSize = store.getState().labelSettings.GLLabelsFontSize

        let deviceScale = 1
        if(window.devicePixelRatio) deviceScale = window.devicePixelRatio
        const glTextFont = ""+GLLabelsFontSize*deviceScale+"px "+GLLabelsFontFamily;

        if(jsondata.image_data){
            if(jsondata.width && jsondata.height && jsondata.x_size && jsondata.y_size){
                const uuid =  guid();
                const texturedShape = new TexturedShape(jsondata,gl,uuid);
                theseTexturedShapes.push(texturedShape)
                theseBuffers.push({texturedShapes:texturedShape,uuid:uuid});
            }
            console.log("Probably textureAsFloatsJS, ignore for now!");
            if (typeof (skipRebuild) !== "undefined" && skipRebuild) {
                return theseBuffers;
            }
            return theseBuffers;
        }

        for (let idat = 0; idat < jsondata.norm_tri.length; idat++) {
            if(jsondata.prim_types){
                if(jsondata.prim_types[idat].length>0){
                    if(jsondata.prim_types[idat][0]==="TEXTLABELS"){
                        const labels = []
                        for(let ilabel=0;ilabel<jsondata.idx_tri[idat].length;ilabel++){
                            const t = jsondata.label_tri[idat][ilabel];
                            const x = jsondata.vert_tri[idat][ilabel*3];
                            const y = jsondata.vert_tri[idat][ilabel*3+1];
                            const z = jsondata.vert_tri[idat][ilabel*3+2];
                            const label = {font:glTextFont,x:x,y:y,z:z,text:t};
                            labels.push(label);
                        }
                        const uuid =  guid();
                        labels.forEach(label => {
                            theseLabelBuffers.push({label:{font:label.font,text:label.text,x:label.x,y:label.y,z:label.z},uuid:uuid})
                        })
                        theseBuffers.push({labels:labels,uuid:uuid});
                        continue
                    }
                }
            }

            const theBuffer = createWebGLBuffers(jsondata,idat, gl)
            theseBuffers.push(theBuffer);

            const displayBuffers = store.getState().glRef.displayBuffers
            if(jsondata.isHoverBuffer){
                theBuffer.isHoverBuffer = jsondata.isHoverBuffer;
                let maxSize = 0.27;
                for (let idx = 0; idx < displayBuffers.length; idx++) {
                    if (displayBuffers[idx].hasOwnProperty("atoms") && displayBuffers[idx].atoms.length > 0) {
                        for(let ibuf2=0;ibuf2<displayBuffers[idx].bufferTypes.length;ibuf2++){
                            if(displayBuffers[idx].bufferTypes[ibuf2]==="PERFECT_SPHERES"){
                                if(displayBuffers[idx].triangleInstanceSizes[ibuf2][0]>0.27&&!displayBuffers[idx].isHoverBuffer&&displayBuffers[idx].visible){
                                    let nhits = 0
                                    theseBuffers[0].atoms.forEach(bufatom => {
                                        displayBuffers[idx].atoms.forEach(atom => {
                                            if(Math.abs(bufatom.x-atom.x)<1e-4&&Math.abs(bufatom.y-atom.y)<1e-4&&Math.abs(bufatom.z-atom.z)<1e-4){
                                                nhits++;
                                            }
                                        })
                                    })
                                    if(theseBuffers[0].atoms.length===nhits){
                                        maxSize = Math.max(displayBuffers[idx].triangleInstanceSizes[ibuf2][0],maxSize);
                                    }
                                }
                            }
                        }
                    }
                }
                store.dispatch(setHoverSize(maxSize))
            }
        }

        theseBuffers.forEach(buffer => {
            if("bufferTypes" in buffer){
                for(let ibuf=0;ibuf<buffer.bufferTypes.length;ibuf++){
                    if(buffer.bufferTypes[ibuf]==="PERFECT_SPHERES"&&!jsondata.clickTol){
                        buffer.clickTol = 2.0 * buffer.triangleInstanceSizes[ibuf][0] + 0.45;
                    }
                }
            }
        })

        //Could, maybe should do same with displayBuffers ...
        store.dispatch(setLabelBuffers([...labelBuffers,...theseLabelBuffers]))
        store.dispatch(setTexturedShapes([...texturedShapes,...theseTexturedShapes]))

        return theseBuffers;
}


const linesToThickLinesWithIndicesAndNormals = (axesVertices, axesNormals, axesColours, axesIndices, size, doColour, isWebGL2) => {
        return linesToThickLinesWithIndices(axesVertices, axesColours, axesIndices, size, axesNormals, doColour, isWebGL2)
    }

const linesToThickLinesWithIndices = (axesVertices: number[], axesColours: number[], axesIndices: number[], size: number, axesNormals_old? : number[], doColour=false, isWebGL2=true) => {

        //FIXME - This could all be pushed upstairs into the C++ -> JS mesh conversions
        const print_timing = false;
        const index_length = axesIndices.length;

        const t1 = performance.now()
        const axesNormals = new Float32Array(index_length * 9);
        let axesNormals_new;
        if (axesNormals_old) {
            axesNormals_new = new Float32Array(index_length * 9);
        }
        const axesVertices_new = new Float32Array(index_length * 9);
        let axesColours_new;
        let axesIndexs_new;
        if (isWebGL2) {
             axesIndexs_new =  new Uint32Array(index_length * 3)
        } else {
             //FIXME - major problem here. The test should be for Uint32 indices
             //      - not WebGL2. But we are using C++/emscripten  trickery
             //      - to always return Float32 and Uint32 types
             axesIndexs_new =  new Uint32Array(index_length * 3)
        }
        const t2 = performance.now()
        if(print_timing) console.log("create buffer in linesToThickLines",t2-t1)

        if(doColour){
            axesColours_new = new Float32Array(index_length * 12);
            for (let idx = 0; idx < index_length; idx += 2) {

                const il = 3 * axesIndices[idx];
                const idx12 = idx*12;
                const il43 = il*4/3;

                const r = axesColours[il43]
                const g = axesColours[il43 + 1]
                const b = axesColours[il43 + 2]
                const a = axesColours[il43 + 3]

                axesColours_new[idx12]     = r
                axesColours_new[idx12 + 1] = g
                axesColours_new[idx12 + 2] = b
                axesColours_new[idx12 + 3] = a

                axesColours_new[idx12 + 4] = r
                axesColours_new[idx12 + 5] = g
                axesColours_new[idx12 + 6] = b
                axesColours_new[idx12 + 7] = a

                axesColours_new[idx12 + 8]  = r
                axesColours_new[idx12 + 9]  = g
                axesColours_new[idx12 + 10] = b
                axesColours_new[idx12 + 11] = a

                axesColours_new[idx12 + 12] = r
                axesColours_new[idx12 + 13] = g
                axesColours_new[idx12 + 14] = b
                axesColours_new[idx12 + 15] = a

                axesColours_new[idx12 + 16] = r
                axesColours_new[idx12 + 17] = g
                axesColours_new[idx12 + 18] = b
                axesColours_new[idx12 + 19] = a

                axesColours_new[idx12 + 20] = r
                axesColours_new[idx12 + 21] = g
                axesColours_new[idx12 + 22] = b
                axesColours_new[idx12 + 23] = a

            }
        }

        const t3 = performance.now()
        if(print_timing) console.log("do colours in linesToThickLines",t3-t2)

        for (let idx = 0; idx < index_length; idx += 2) {

            const il = 3 * axesIndices[idx];
            const il2 = 3 * axesIndices[idx + 1];

            const idx9 = idx*9;

            const x = axesVertices[il]
            const y = axesVertices[il+1]
            const z = axesVertices[il+2]

            const x2 = axesVertices[il2]
            const y2 = axesVertices[il2+1]
            const z2 = axesVertices[il2+2]

            axesVertices_new[idx9]     = x
            axesVertices_new[idx9 + 1] = y
            axesVertices_new[idx9 + 2] = z

            axesVertices_new[idx9 + 3] = x
            axesVertices_new[idx9 + 4] = y
            axesVertices_new[idx9 + 5] = z

            axesVertices_new[idx9 + 6] = x2
            axesVertices_new[idx9 + 7] = y2
            axesVertices_new[idx9 + 8] = z2

            axesVertices_new[idx9 + 9]  = x
            axesVertices_new[idx9 + 10] = y
            axesVertices_new[idx9 + 11] = z

            axesVertices_new[idx9 + 12] = x2
            axesVertices_new[idx9 + 13] = y2
            axesVertices_new[idx9 + 14] = z2

            axesVertices_new[idx9 + 15] = x2
            axesVertices_new[idx9 + 16] = y2
            axesVertices_new[idx9 + 17] = z2

            if (axesNormals_old) {
                const nx = axesNormals_old[il]
                const ny = axesNormals_old[il+1]
                const nz = axesNormals_old[il+2]

                const nx2 = axesNormals_old[il2]
                const ny2 = axesNormals_old[il2+1]
                const nz2 = axesNormals_old[il2+2]

                axesNormals_new[idx9]     = nx
                axesNormals_new[idx9 + 1] = ny
                axesNormals_new[idx9 + 2] = nz

                axesNormals_new[idx9 + 3] = nx
                axesNormals_new[idx9 + 4] = ny
                axesNormals_new[idx9 + 5] = nz

                axesNormals_new[idx9 + 6] = nx2
                axesNormals_new[idx9 + 7] = ny2
                axesNormals_new[idx9 + 8] = nz2

                axesNormals_new[idx9 + 9]  = nx
                axesNormals_new[idx9 + 10] = ny
                axesNormals_new[idx9 + 11] = nz

                axesNormals_new[idx9 + 12] = nx2
                axesNormals_new[idx9 + 13] = ny2
                axesNormals_new[idx9 + 14] = nz2

                axesNormals_new[idx9 + 15] = nx2
                axesNormals_new[idx9 + 16] = ny2
                axesNormals_new[idx9 + 17] = nz2

            }

            let dx = x2 - x
            let dy = y2 - y
            let dz = z2 - z

            const d = Math.sqrt(dx*dx + dy*dy + dz*dz);
            if (d > 1e-8) {
                dx *= size/d
                dy *= size/d
                dz *= size/d
            }

            axesNormals[idx9]     = dx
            axesNormals[idx9 + 1] = dy
            axesNormals[idx9 + 2] = dz

            axesNormals[idx9 + 3] = -dx
            axesNormals[idx9 + 4] = -dy
            axesNormals[idx9 + 5] = -dz

            axesNormals[idx9 + 6] = -dx
            axesNormals[idx9 + 7] = -dy
            axesNormals[idx9 + 8] = -dz

            axesNormals[idx9 + 9]  = dx
            axesNormals[idx9 + 10] = dy
            axesNormals[idx9 + 11] = dz

            axesNormals[idx9 + 12] = dx
            axesNormals[idx9 + 13] = dy
            axesNormals[idx9 + 14] = dz

            axesNormals[idx9 + 15] = -dx
            axesNormals[idx9 + 16] = -dy
            axesNormals[idx9 + 17] = -dz

        }

        const t4 = performance.now()
        if(print_timing) console.log("do main loop in linesToThickLines",t4-t3)

        let axesIdx_new = 0;
        for (let idx = 0; idx < index_length; idx += 2) {
            const axesIdx_old = axesIdx_new;
            const idx3 = idx*3;
            axesIndexs_new[idx3]     = axesIdx_old;
            axesIndexs_new[idx3 +1 ] = axesIdx_old+2;
            axesIndexs_new[idx3 +2 ] = axesIdx_old+1;
            axesIndexs_new[idx3 +3 ] = axesIdx_old+3;
            axesIndexs_new[idx3 +4 ] = axesIdx_old+4;
            axesIndexs_new[idx3 +5 ] = axesIdx_old+5;
            axesIdx_new += 6;
        }

        const t5 = performance.now()
        if(print_timing) console.log("do index loop in linesToThickLines",t5-t4)

        const ret = {};
        ret["vertices"] = axesVertices_new;
        ret["indices"] = axesIndexs_new;
        ret["normals"] = axesNormals;
        ret["colours"] = axesColours_new;
        ret["realNormals"] = axesNormals_new;

        const t6 = performance.now()
        if(print_timing) console.log("make object in linesToThickLines",t6-t5)

        return ret;

    }

export const linesToThickLines = (axesVertices, axesColours, size) => {
        const axesNormals = [];
        const axesVertices_new = [];
        const axesColours_new = [];
        const axesIndexs_new = [];
        let axesIdx_new = 0;

        for (let il = 0; il < axesVertices.length; il += 6) {
            axesColours_new.push(axesColours[4 * il / 3]);
            axesColours_new.push(axesColours[4 * il / 3 + 1]);
            axesColours_new.push(axesColours[4 * il / 3 + 2]);
            axesColours_new.push(axesColours[4 * il / 3 + 3]);
            axesColours_new.push(axesColours[4 * il / 3]);
            axesColours_new.push(axesColours[4 * il / 3 + 1]);
            axesColours_new.push(axesColours[4 * il / 3 + 2]);
            axesColours_new.push(axesColours[4 * il / 3 + 3]);
            axesColours_new.push(axesColours[4 * il / 3 + 4]);
            axesColours_new.push(axesColours[4 * il / 3 + 5]);
            axesColours_new.push(axesColours[4 * il / 3 + 6]);
            axesColours_new.push(axesColours[4 * il / 3 + 7]);
            axesColours_new.push(axesColours[4 * il / 3]);
            axesColours_new.push(axesColours[4 * il / 3 + 1]);
            axesColours_new.push(axesColours[4 * il / 3 + 2]);
            axesColours_new.push(axesColours[4 * il / 3 + 3]);
            axesColours_new.push(axesColours[4 * il / 3 + 4]);
            axesColours_new.push(axesColours[4 * il / 3 + 5]);
            axesColours_new.push(axesColours[4 * il / 3 + 6]);
            axesColours_new.push(axesColours[4 * il / 3 + 7]);
            axesColours_new.push(axesColours[4 * il / 3 + 4]);
            axesColours_new.push(axesColours[4 * il / 3 + 5]);
            axesColours_new.push(axesColours[4 * il / 3 + 6]);
            axesColours_new.push(axesColours[4 * il / 3 + 7]);

            axesVertices_new.push(axesVertices[il]);
            axesVertices_new.push(axesVertices[il + 1]);
            axesVertices_new.push(axesVertices[il + 2]);
            axesVertices_new.push(axesVertices[il]);
            axesVertices_new.push(axesVertices[il + 1]);
            axesVertices_new.push(axesVertices[il + 2]);
            axesVertices_new.push(axesVertices[il + 3]);
            axesVertices_new.push(axesVertices[il + 4]);
            axesVertices_new.push(axesVertices[il + 5]);
            axesNormals.push(axesVertices[il + 3] - axesVertices[il]);
            axesNormals.push(axesVertices[il + 4] - axesVertices[il + 1]);
            axesNormals.push(axesVertices[il + 5] - axesVertices[il + 2]);
            const d = Math.sqrt(axesNormals[axesNormals.length - 1 - 2] * axesNormals[axesNormals.length - 1 - 2] + axesNormals[axesNormals.length - 1 - 1] * axesNormals[axesNormals.length - 1 - 1] + axesNormals[axesNormals.length - 1 - 0] * axesNormals[axesNormals.length - 1 - 0]);
            if (d > 1e-8) {
                axesNormals[axesNormals.length - 1 - 2] *= size / d;
                axesNormals[axesNormals.length - 1 - 1] *= size / d;
                axesNormals[axesNormals.length - 1] *= size / d;
            }

            axesNormals.push(-(axesVertices[il + 3] - axesVertices[il]));
            axesNormals.push(-(axesVertices[il + 4] - axesVertices[il + 1]));
            axesNormals.push(-(axesVertices[il + 5] - axesVertices[il + 2]));
            if (d > 1e-8) {
                axesNormals[axesNormals.length - 1 - 2] *= size / d;
                axesNormals[axesNormals.length - 1 - 1] *= size / d;
                axesNormals[axesNormals.length - 1] *= size / d;
            }
            axesNormals.push(-(axesVertices[il + 3] - axesVertices[il]));
            axesNormals.push(-(axesVertices[il + 4] - axesVertices[il + 1]));
            axesNormals.push(-(axesVertices[il + 5] - axesVertices[il + 2]));
            if (d > 1e-8) {
                axesNormals[axesNormals.length - 1 - 2] *= size / d;
                axesNormals[axesNormals.length - 1 - 1] *= size / d;
                axesNormals[axesNormals.length - 1] *= size / d;
            }
            axesVertices_new.push(axesVertices[il]);
            axesVertices_new.push(axesVertices[il + 1]);
            axesVertices_new.push(axesVertices[il + 2]);
            axesVertices_new.push(axesVertices[il + 3]);
            axesVertices_new.push(axesVertices[il + 4]);
            axesVertices_new.push(axesVertices[il + 5]);
            axesVertices_new.push(axesVertices[il + 3]);
            axesVertices_new.push(axesVertices[il + 4]);
            axesVertices_new.push(axesVertices[il + 5]);
            axesNormals.push(axesVertices[il + 3] - axesVertices[il]);
            axesNormals.push(axesVertices[il + 4] - axesVertices[il + 1]);
            axesNormals.push(axesVertices[il + 5] - axesVertices[il + 2]);
            if (d > 1e-8) {
                axesNormals[axesNormals.length - 1 - 2] *= size / d;
                axesNormals[axesNormals.length - 1 - 1] *= size / d;
                axesNormals[axesNormals.length - 1] *= size / d;
            }
            axesNormals.push(axesVertices[il + 3] - axesVertices[il]);
            axesNormals.push(axesVertices[il + 4] - axesVertices[il + 1]);
            axesNormals.push(axesVertices[il + 5] - axesVertices[il + 2]);
            if (d > 1e-8) {
                axesNormals[axesNormals.length - 1 - 2] *= size / d;
                axesNormals[axesNormals.length - 1 - 1] *= size / d;
                axesNormals[axesNormals.length - 1] *= size / d;
            }
            axesNormals.push(-(axesVertices[il + 3] - axesVertices[il]));
            axesNormals.push(-(axesVertices[il + 4] - axesVertices[il + 1]));
            axesNormals.push(-(axesVertices[il + 5] - axesVertices[il + 2]));
            if (d > 1e-8) {
                axesNormals[axesNormals.length - 1 - 2] *= size / d;
                axesNormals[axesNormals.length - 1 - 1] *= size / d;
                axesNormals[axesNormals.length - 1] *= size / d;
            }
            axesIndexs_new.push(axesIdx_new++);
            axesIndexs_new.push(axesIdx_new++);
            axesIndexs_new.push(axesIdx_new++);
            axesIndexs_new.push(axesIdx_new++);
            axesIndexs_new.push(axesIdx_new++);
            axesIndexs_new.push(axesIdx_new++);
        }

        const ret = {};
        ret["vertices"] = axesVertices_new;
        ret["indices"] = axesIndexs_new;
        ret["normals"] = axesNormals;
        ret["colours"] = axesColours_new;
        return ret;

    }

export const buildBuffers = (displayBuffers:DisplayBuffer[], store: MoorhenReduxStoreType) : void => {
        const print_timing = false

        const mapLineWidth = store.getState().mapContourSettings.mapLineWidth
        const isWebGL2 = store.getState().glRef.isWebGL2
        const gl = store.getState().glRef.glCtx

        const tbb1 = performance.now()
        const xaxis = vec3Create([1.0, 0.0, 0.0]);
        const yaxis = vec3Create([0.0, 1.0, 0.0]);
        const zaxis = vec3Create([0.0, 0.0, 1.0]);
        const Q = vec3.create();
        const R = vec3.create();

        // FIXME - These need to be global preferences or properties of primitive.
        // spline_accu = 4 is OK for 5kcr on QtWebKit, 8 runs out of memory.
        const accuStep = 20;

        const thisdisplayBufferslength = displayBuffers.length;
        //console.log(thisdisplayBufferslength+" buffers to build");

        for (let idx = 0; idx < thisdisplayBufferslength; idx++) {
            if (!displayBuffers[idx].isDirty) {
                continue;
            }
            for (let j = 0; j < displayBuffers[idx].triangleVertexIndexBuffer.length; j++) {
                displayBuffers[idx].isDirty = false;
                if (displayBuffers[idx].bufferTypes[j] === "PERFECT_SPHERES" || displayBuffers[idx].bufferTypes[j] === "IMAGES" || displayBuffers[idx].bufferTypes[j] === "TEXT") {
                    if(displayBuffers[idx].triangleInstanceOriginBuffer[j]){
                        displayBuffers[idx].triangleInstanceOriginBuffer[j].itemSize = 3;
                        gl.bindBuffer(gl.ARRAY_BUFFER, displayBuffers[idx].triangleInstanceOriginBuffer[j]);
                        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(displayBuffers[idx].triangleInstanceOrigins[j]), gl.STATIC_DRAW);
                    }
                    if(displayBuffers[idx].triangleInstanceSizeBuffer[j]){
                        gl.bindBuffer(gl.ARRAY_BUFFER, displayBuffers[idx].triangleInstanceSizeBuffer[j]);
                        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(displayBuffers[idx].triangleInstanceSizes[j]), gl.STATIC_DRAW);
                        displayBuffers[idx].triangleInstanceSizeBuffer[j].itemSize = 3;
                    }
                    if(!displayBuffers[idx].customColour || displayBuffers[idx].customColour.length!==4){
                        if(displayBuffers[idx].triangleColourBuffer[j]){
                            gl.bindBuffer(gl.ARRAY_BUFFER, displayBuffers[idx].triangleColourBuffer[j]);
                            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(displayBuffers[idx].triangleColours[j]), gl.STATIC_DRAW);
                            displayBuffers[idx].triangleColourBuffer[j].itemSize = 4;
                        }
                    }
                } else if (displayBuffers[idx].bufferTypes[j] === "NORMALLINES") {
                    const size = mapLineWidth;
                    const useIndices = displayBuffers[idx].supplementary["useIndices"];
                    let thickLines;
                    const t1 = performance.now()
                    let doColour = false;
                    if(!displayBuffers[idx].customColour || displayBuffers[idx].customColour.length!==4){
                        doColour = true;
                    }
                    if (useIndices) {
                        thickLines = linesToThickLinesWithIndicesAndNormals(displayBuffers[idx].triangleVertices[j], displayBuffers[idx].triangleNormals[j], displayBuffers[idx].triangleColours[j], displayBuffers[idx].triangleIndexs[j], size, doColour, isWebGL2);
                    } else {
                        console.log("************************************************************");
                        console.log("************************************************************");
                        console.log("RETURNING BECAUSE NO INDICES");
                        console.log("************************************************************");
                        console.log("************************************************************");
                        return;
                    }
                    const t2 = performance.now()
                    if(print_timing) console.log("linesToThickLines",t2-t1)
                    const Normals_new = thickLines["normals"];
                    const RealNormals_new = thickLines["realNormals"];
                    const Vertices_new = thickLines["vertices"];
                    const Colours_new = thickLines["colours"];
                    const Indexs_new = thickLines["indices"];
                    const tsa = performance.now()
                    const RealNormals_new_array =  RealNormals_new
                    const Normals_new_array =  Normals_new
                    const Vertices_new_array =  Vertices_new
                    const Colours_new_array =  Colours_new
                    const Indexs_new_array = Indexs_new
                    const tea = performance.now()
                    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, displayBuffers[idx].triangleVertexIndexBuffer[j]);
                    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, Indexs_new_array, gl.DYNAMIC_DRAW);
                    displayBuffers[idx].triangleVertexIndexBuffer[j].itemSize = 1;
                    gl.bindBuffer(gl.ARRAY_BUFFER, displayBuffers[idx].triangleVertexRealNormalBuffer[j]);
                    gl.bufferData(gl.ARRAY_BUFFER, RealNormals_new_array, gl.DYNAMIC_DRAW);
                    displayBuffers[idx].triangleVertexRealNormalBuffer[j].itemSize = 3;
                    gl.bindBuffer(gl.ARRAY_BUFFER, displayBuffers[idx].triangleVertexNormalBuffer[j]);
                    gl.bufferData(gl.ARRAY_BUFFER, Normals_new_array, gl.DYNAMIC_DRAW);
                    displayBuffers[idx].triangleVertexNormalBuffer[j].itemSize = 3;
                    gl.bindBuffer(gl.ARRAY_BUFFER, displayBuffers[idx].triangleVertexPositionBuffer[j]);
                    gl.bufferData(gl.ARRAY_BUFFER, Vertices_new_array, gl.DYNAMIC_DRAW);
                    displayBuffers[idx].triangleVertexPositionBuffer[j].itemSize = 3;
                    if(doColour){
                        gl.bindBuffer(gl.ARRAY_BUFFER, displayBuffers[idx].triangleColourBuffer[j]);
                        gl.bufferData(gl.ARRAY_BUFFER, Colours_new_array, gl.STATIC_DRAW);
                        displayBuffers[idx].triangleColourBuffer[j].itemSize = 4;
                        displayBuffers[idx].triangleColourBuffer[j].numItems = Colours_new.length / 4;
                    }
                    const teb = performance.now()
                    if(print_timing) console.log("make typed arrays",tea-tsa)
                    if(print_timing) console.log("buffer arrays",teb-tea)

                    displayBuffers[idx].triangleVertexIndexBuffer[j].numItems = Indexs_new.length;
                    displayBuffers[idx].triangleVertexNormalBuffer[j].numItems = Normals_new.length / 3;
                    displayBuffers[idx].triangleVertexRealNormalBuffer[j].numItems = RealNormals_new.length / 3;
                    displayBuffers[idx].triangleVertexPositionBuffer[j].numItems = Vertices_new.length / 3;
                    const t3 = performance.now()
                    if(print_timing) console.log("buffering",t3-t2,j)

                } else if (displayBuffers[idx].bufferTypes[j] === "LINES") {
                    const size = mapLineWidth;
                    const useIndices = displayBuffers[idx].supplementary["useIndices"][0];
                    let thickLines;

                    let doColour = false;
                    if(!displayBuffers[idx].customColour || displayBuffers[idx].customColour.length!==4){
                        doColour = true;
                    }

                    const t1 = performance.now()
                    if (useIndices) {
                        thickLines = linesToThickLinesWithIndices(displayBuffers[idx].triangleVertices[j], displayBuffers[idx].triangleColours[j], displayBuffers[idx].triangleIndexs[j], size, null, doColour, isWebGL2);
                    } else {
                        thickLines = linesToThickLines(displayBuffers[idx].triangleVertices[j], displayBuffers[idx].triangleColours[j], size);
                    }
                    const t2 = performance.now()
                    if(print_timing) console.log("linesToThickLines",t2-t1)

                    const Normals_new = thickLines["normals"];
                    const Vertices_new = thickLines["vertices"];
                    const Colours_new = thickLines["colours"];
                    const Indexs_new = thickLines["indices"];

                    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, displayBuffers[idx].triangleVertexIndexBuffer[j]);
                    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, Indexs_new, gl.STATIC_DRAW);
                    displayBuffers[idx].triangleVertexIndexBuffer[j].itemSize = 1;
                    gl.bindBuffer(gl.ARRAY_BUFFER, displayBuffers[idx].triangleVertexNormalBuffer[j]);
                    gl.bufferData(gl.ARRAY_BUFFER, Normals_new, gl.STATIC_DRAW);
                    displayBuffers[idx].triangleVertexNormalBuffer[j].itemSize = 3;
                    gl.bindBuffer(gl.ARRAY_BUFFER, displayBuffers[idx].triangleVertexPositionBuffer[j]);
                    gl.bufferData(gl.ARRAY_BUFFER, Vertices_new, gl.STATIC_DRAW);
                    displayBuffers[idx].triangleVertexPositionBuffer[j].itemSize = 3;
                    if(doColour){
                        gl.bindBuffer(gl.ARRAY_BUFFER, displayBuffers[idx].triangleColourBuffer[j]);
                        gl.bufferData(gl.ARRAY_BUFFER, Colours_new, gl.STATIC_DRAW);
                        displayBuffers[idx].triangleColourBuffer[j].itemSize = 4;
                        displayBuffers[idx].triangleColourBuffer[j].numItems = Colours_new.length / 4;
                    }

                    displayBuffers[idx].triangleVertexIndexBuffer[j].numItems = Indexs_new.length;
                    displayBuffers[idx].triangleVertexNormalBuffer[j].numItems = Normals_new.length / 3;
                    displayBuffers[idx].triangleVertexPositionBuffer[j].numItems = Vertices_new.length / 3;

                } else {

                    let triangleNormals
                    let triangleColours
                    let triangleVertices
                    let triangleIndexs

                    let doColour = false;
                    if(!displayBuffers[idx].customColour || displayBuffers[idx].customColour.length!==4){
                        doColour = true;
                    }
                    //console.log("DEBUG: buildBuffers normals", displayBuffers[idx].triangleNormals[j])
                    //console.log("DEBUG: buildBuffers colours", displayBuffers[idx].triangleColours[j])
                    //console.log("DEBUG: buildBuffers positions", displayBuffers[idx].triangleVertices[j])
                    //console.log("DEBUG: buildBuffers indices", displayBuffers[idx].triangleIndexs[j])
                    //console.log("DEBUG: buildBuffers doColour", doColour,displayBuffers[idx].customColour)

                    if(ArrayBuffer.isView(displayBuffers[idx].triangleNormals[j])){
                        triangleNormals = displayBuffers[idx].triangleNormals[j]
                    } else {
                        triangleNormals = new Float32Array(displayBuffers[idx].triangleNormals[j])
                    }
                    if(ArrayBuffer.isView(displayBuffers[idx].triangleVertices[j])){
                        triangleVertices = displayBuffers[idx].triangleVertices[j]
                    } else {
                        triangleVertices = new Float32Array(displayBuffers[idx].triangleVertices[j])
                    }
                    if(ArrayBuffer.isView(displayBuffers[idx].triangleColours[j])){
                        triangleColours = displayBuffers[idx].triangleColours[j]
                    } else if(doColour) {
                        triangleColours = new Float32Array(displayBuffers[idx].triangleColours[j])
                    }
                    if(ArrayBuffer.isView(displayBuffers[idx].triangleIndexs[j])){
                        triangleIndexs = displayBuffers[idx].triangleIndexs[j]
                    } else {
                        triangleIndexs = new Uint32Array(displayBuffers[idx].triangleIndexs[j])
                    }

                    displayBuffers[idx].triangleVertexNormalBuffer[j].numItems = triangleNormals.length / 3;
                    displayBuffers[idx].triangleVertexPositionBuffer[j].numItems = triangleVertices.length / 3;
                    if(doColour) displayBuffers[idx].triangleColourBuffer[j].numItems = triangleColours.length / 4;
                    displayBuffers[idx].triangleVertexIndexBuffer[j].numItems = triangleIndexs.length;

                    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, displayBuffers[idx].triangleVertexIndexBuffer[j]);
                    if (isWebGL2) {
                        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, triangleIndexs, gl.STATIC_DRAW);
                    } else {
                        //FIXME - major problem here. The test should be for Uint32 indices
                        //      - not WebGL2. But we are using C++/emscripten  trickery
                        //      - to always return Float32 and Uint32 types
                        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, triangleIndexs, gl.STATIC_DRAW);
                    }
                    displayBuffers[idx].triangleVertexIndexBuffer[j].itemSize = 1;
                    if (displayBuffers[idx].bufferTypes[j] !== "NORMALLINES" && displayBuffers[idx].bufferTypes[j] !== "LINES" && displayBuffers[idx].bufferTypes[j] !== "LINE_LOOP" && displayBuffers[idx].bufferTypes[j] !== "LINE_STRIP" && displayBuffers[idx].bufferTypes[j] !== "POINTS" && displayBuffers[idx].bufferTypes[j] !== "POINTS_SPHERES" && displayBuffers[idx].bufferTypes[j] !== "CAPCYLINDERS" && displayBuffers[idx].bufferTypes[j] !== "SPHEROIDS" && displayBuffers[idx].bufferTypes[j] !== "TORUSES" && displayBuffers[idx].bufferTypes[j] !== "CIRCLES") {
                        gl.bindBuffer(gl.ARRAY_BUFFER, displayBuffers[idx].triangleVertexNormalBuffer[j]);
                        gl.bufferData(gl.ARRAY_BUFFER, triangleNormals, gl.STATIC_DRAW);
                        displayBuffers[idx].triangleVertexNormalBuffer[j].itemSize = 3;
                    }
                    gl.bindBuffer(gl.ARRAY_BUFFER, displayBuffers[idx].triangleVertexPositionBuffer[j]);
                    gl.bufferData(gl.ARRAY_BUFFER, triangleVertices, gl.STATIC_DRAW);
                    displayBuffers[idx].triangleVertexPositionBuffer[j].itemSize = 3;
                    if(doColour){
                        gl.bindBuffer(gl.ARRAY_BUFFER, displayBuffers[idx].triangleColourBuffer[j]);
                        gl.bufferData(gl.ARRAY_BUFFER, triangleColours, gl.STATIC_DRAW);
                        displayBuffers[idx].triangleColourBuffer[j].itemSize = 4;
                    }
                    if(displayBuffers[idx].triangleInstanceSizeBuffer[j]){
                        gl.bindBuffer(gl.ARRAY_BUFFER, displayBuffers[idx].triangleInstanceSizeBuffer[j]);
                        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(displayBuffers[idx].triangleInstanceSizes[j]), gl.STATIC_DRAW);
                        displayBuffers[idx].triangleInstanceSizeBuffer[j].itemSize = 3;
                    }
                    if(displayBuffers[idx].triangleInstanceOriginBuffer[j]){
                        gl.bindBuffer(gl.ARRAY_BUFFER, displayBuffers[idx].triangleInstanceOriginBuffer[j]);
                        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(displayBuffers[idx].triangleInstanceOrigins[j]), gl.STATIC_DRAW);
                        displayBuffers[idx].triangleInstanceOriginBuffer[j].itemSize = 3;
                    }
                    if(displayBuffers[idx].triangleInstanceOrientationBuffer[j]){
                        gl.bindBuffer(gl.ARRAY_BUFFER, displayBuffers[idx].triangleInstanceOrientationBuffer[j]);
                        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(displayBuffers[idx].triangleInstanceOrientations[j]), gl.STATIC_DRAW);
                        displayBuffers[idx].triangleInstanceOrientationBuffer[j].itemSize = 16;
                    }
                }
            }
            const tl = performance.now()
            if(print_timing) console.log("Time at end of loop",tl-tbb1);
        }
        //console.log("Time to build buffers: "+(new Date().getTime()-start));

        const tbb2 = performance.now()
        if(print_timing) console.log("Time in buidBuffers",tbb2-tbb1)
    }
