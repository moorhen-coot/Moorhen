import { useEffect, useState, useRef, useCallback } from 'react'
import { DamageRegion, chromeDamageRegions, regionsToClear } from "../../utils/chromeDamageRegions";
import { useDispatch, useSelector, useStore } from 'react-redux'
import * as quat4 from 'gl-matrix/quat';
import * as vec3 from 'gl-matrix/vec3';
import { moorhen } from "../../types/moorhen"
import { get_grid } from "../../utils/utils"
import { addImageOverlay, addTextOverlay, addSvgPathOverlay, addFracPathOverlay, emptyOverlays } from "../../store/overlaysSlice"
import { quatToMat4, quat4Inverse } from '../../WebGLgComponents/quatToMat4.js';
import { getMathJaxSVG } from '../../utils/mathJaxUtils';
import {  RootState } from '../../store/MoorhenReduxStore';
import { Store } from '@reduxjs/toolkit';
import { MoorhenStack } from "../interface-base";
import "./UoY-legal.css"

interface ImageFrac2D {
    x: number
    y: number
    width: number
    height: number
    img: HTMLImageElement
    zIndex: number;
}

const stereoQuats = []
let yForward = null
let xForward = null
let zForward = null

const createStereoQuats = () => {
        const yaxis = vec3.create();
        vec3.set(yaxis, 0.0, -1.0, 0.0)

        const angle = 3./180.*Math.PI;

        const dval3_p = Math.cos(angle / 2.0);
        const dval0_y_p = yaxis[0] * Math.sin(angle / 2.0);
        const dval1_y_p = yaxis[1] * Math.sin(angle / 2.0);
        const dval2_y_p = yaxis[2] * Math.sin(angle / 2.0);

        const dval3_m = Math.cos(-angle / 2.0);
        const dval0_y_m = yaxis[0] * Math.sin(-angle / 2.0);
        const dval1_y_m = yaxis[1] * Math.sin(-angle / 2.0);
        const dval2_y_m = yaxis[2] * Math.sin(-angle / 2.0);

        const rotY_p = quat4.create();
        const rotY_m = quat4.create();

        quat4.set(rotY_p, dval0_y_p, dval1_y_p, dval2_y_p, dval3_p);
        quat4.set(rotY_m, dval0_y_m, dval1_y_m, dval2_y_m, dval3_m);

        stereoQuats.push(rotY_p)
        stereoQuats.push(rotY_m)
}

const createThreeWayQuats = () => {
        const xaxis = vec3.create();
        vec3.set(xaxis, 1.0, 0.0, 0.0)
        const yaxis = vec3.create();
        vec3.set(yaxis, 0.0, -1.0, 0.0)

        const zaxis = vec3.create();
        vec3.set(zaxis, 0.0, 0.0, 1.0)

        const angle = -Math.PI/2.;

        const dval3 = Math.cos(angle / 2.0);

        const dval0_x = xaxis[0] * Math.sin(angle / 2.0);
        const dval1_x = xaxis[1] * Math.sin(angle / 2.0);
        const dval2_x = xaxis[2] * Math.sin(angle / 2.0);

        const dval0_y = yaxis[0] * Math.sin(angle / 2.0);
        const dval1_y = yaxis[1] * Math.sin(angle / 2.0);
        const dval2_y = yaxis[2] * Math.sin(angle / 2.0);

        const dval0_z_p = zaxis[0] * Math.sin(angle / 2.0);
        const dval1_z_p = zaxis[1] * Math.sin(angle / 2.0);
        const dval2_z_p = zaxis[2] * Math.sin(angle / 2.0);
        const dval3_z_p = Math.cos(angle / 2.0);

        const dval0_z_m = zaxis[0] * Math.sin(-angle / 2.0);
        const dval1_z_m = zaxis[1] * Math.sin(-angle / 2.0);
        const dval2_z_m = zaxis[2] * Math.sin(-angle / 2.0);
        const dval3_z_m = Math.cos(-angle / 2.0);

        yForward = quat4.create();
        xForward = quat4.create();
        zForward = quat4.create();

        const zPlus = quat4.create();
        const zMinus = quat4.create();

        quat4.set(zForward, 0, 0, 0, -1);
        quat4.set(yForward, dval0_x, dval1_x, dval2_x, dval3);
        quat4.set(xForward, dval0_y, dval1_y, dval2_y, dval3);

        quat4.set(zPlus, dval0_z_p, dval1_z_p, dval2_z_p, dval3_z_p);
        quat4.set(zMinus, dval0_z_m, dval1_z_m, dval2_z_m, dval3_z_p);

        quat4.multiply(xForward, xForward, zMinus);
        quat4.multiply(yForward, yForward, zPlus);


}

function drawArrow(ctx, fromx, fromy, tox, toy, arrowWidth, color, scale){

    const headLength = 10*scale;
    const angle = Math.atan2(toy-fromy,tox-fromx);

    ctx.save();
    ctx.strokeStyle = color;

    ctx.beginPath();
    ctx.moveTo(fromx, fromy);
    ctx.lineTo(tox, toy);
    ctx.lineWidth = arrowWidth*scale;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(tox-headLength*Math.cos(angle-Math.PI/6),
               toy-headLength*Math.sin(angle-Math.PI/6));
    ctx.lineTo(tox, toy);
    ctx.lineTo(tox-headLength*Math.cos(angle+Math.PI/6),
               toy-headLength*Math.sin(angle+Math.PI/6));

    ctx.stroke();
    ctx.restore();
}

export const drawOn2DContext = (canvas2D_ctx: CanvasRenderingContext2D, width: number, height: number, scale: number, helpText: string[], images: ImageFrac2D[], drawQuat: quat4, zIndex: number, store: Store<RootState>) => {

    if(!canvas2D_ctx) return

    const backgroundColor = store.getState().sceneSettings.backgroundColor

    const imageOverlays = store.getState().overlays.imageOverlayList
    const textOverlays = store.getState().overlays.textOverlayList
    const svgPathOverlays = store.getState().overlays.svgPathOverlayList
    const fracPathOverlays = store.getState().overlays.fracPathOverlayList
    const callbacks = store.getState().overlays.callBacks
    const zoom = store.getState().sceneSettings.zoom
    const quat = drawQuat
    const doDrawAxes = store.getState().sceneSettings.drawAxes
    const drawScaleBar = store.getState().sceneSettings.drawScaleBar
    const drawCrosshairs = store.getState().sceneSettings.drawCrosshairs
    const doSideBySideStereo = store.getState().sceneSettings.doSideBySideStereo
    const threeWayViewOrder = store.getState().sceneSettings.threeWayViewOrder
    const doCrossEyedStereo = store.getState().sceneSettings.doCrossEyedStereo
    const doThreeWayView = store.getState().sceneSettings.doThreeWayView
    const doMultiView = store.getState().sceneSettings.doMultiView
    const specifyMultiViewRowsColumns = store.getState().sceneSettings.specifyMultiViewRowsColumns
    const multiViewRows = store.getState().sceneSettings.multiViewRows
    const multiViewColumns = store.getState().sceneSettings.multiViewColumns
    const molecules = store.getState().molecules.moleculeList

    const bright_y = backgroundColor[0] * 0.299 + backgroundColor[1] * 0.587 + backgroundColor[2] * 0.114

    let help_y = 90 // This is a bit bigger than the bird hopefully
    canvas2D_ctx.font = "12px helvetica"
    const textMetric = canvas2D_ctx.measureText("Mgq!^(){}|'\"~`√∫Å");
    const actualHeight = textMetric.fontBoundingBoxAscent + textMetric.fontBoundingBoxDescent;

    canvas2D_ctx.lineWidth = scale

    helpText.toReversed().forEach(t => {
        canvas2D_ctx.save()
        if(bright_y<0.5)
           canvas2D_ctx.fillStyle = "white"
        else
           canvas2D_ctx.fillStyle = "black"
        canvas2D_ctx.fillText(t,10,help_y)
        help_y += actualHeight
        canvas2D_ctx.restore()
    })

    textOverlays.forEach(t => {
        if((!t.zIndex&&zIndex===0)||(t.zIndex===zIndex)){
        canvas2D_ctx.save()
        canvas2D_ctx.beginPath()
        if(t.lineWidth) canvas2D_ctx.lineWidth = t.lineWidth * scale
        canvas2D_ctx.font = Math.floor(t.fontPixelSize*scale) +"px "+t.fontFamily
        if(t.drawStyle==="stroke"){
            if(t.strokeStyle){
                canvas2D_ctx.strokeStyle = t.strokeStyle
            } else {
                if(bright_y<0.5)
                    canvas2D_ctx.strokeStyle = "white"
                else
                    canvas2D_ctx.strokeStyle = "black"
            }
            canvas2D_ctx.strokeText(t.text,t.x*width,t.y*height)
        } else {
            if(t.fillStyle){
                canvas2D_ctx.fillStyle = t.fillStyle
            } else {
                if(bright_y<0.5)
                    canvas2D_ctx.fillStyle = "white"
                else
                    canvas2D_ctx.fillStyle = "black"
            }
            canvas2D_ctx.fillText(t.text,t.x*width,t.y*height)
        }
        canvas2D_ctx.restore()
        }
    })

    canvas2D_ctx.lineWidth = 1.0
    canvas2D_ctx.scale(scale, scale);

    svgPathOverlays.forEach(t => {
        if((!t.zIndex&&zIndex===0)||(t.zIndex===zIndex)){
        canvas2D_ctx.save()
        const p = new Path2D(t.path)
        if(t.lineWidth) canvas2D_ctx.lineWidth = t.lineWidth
        else canvas2D_ctx.lineWidth = 1.0
        if(t.drawStyle==="stroke"){
            if(t.strokeStyle){
                canvas2D_ctx.strokeStyle = t.strokeStyle
            } else {
                if(bright_y<0.5)
                    canvas2D_ctx.strokeStyle = "white"
                else
                    canvas2D_ctx.strokeStyle = "black"
            }
            canvas2D_ctx.stroke(p)
        } else {
            if(t.fillStyle&&t.drawStyle!=="gradient"){
                canvas2D_ctx.fillStyle = t.fillStyle
            } else if(t.drawStyle==="gradient"){
                const grad_x0 = t.gradientBoundary[0]
                const grad_y0 = t.gradientBoundary[1]
                const grad_x1 = t.gradientBoundary[2]
                const grad_y1 = t.gradientBoundary[3]
                const grad=canvas2D_ctx.createLinearGradient(grad_x0,grad_y0,grad_x1,grad_y1)
                t.gradientStops.forEach(stop => {
                    grad.addColorStop(stop.stop, stop.colour)
                })
                canvas2D_ctx.fillStyle = grad
            } else {
                if(bright_y<0.5)
                    canvas2D_ctx.fillStyle = "white"
                else
                    canvas2D_ctx.fillStyle = "black"
            }
            canvas2D_ctx.fill(p)
        }
        canvas2D_ctx.restore()
        }
    })

    canvas2D_ctx.scale(1.0/scale, 1.0/scale);

    images.forEach(img => {
        if((!img.zIndex&&zIndex===0)||(img.zIndex===zIndex)){
            if(img.img){
                try {
                    canvas2D_ctx.drawImage(img.img,width*img.x,height*img.y,img.width*scale,img.height*scale)
                } catch(e) {
                    console.log("Failed to draw image")
                }
            }
        }
    })

    canvas2D_ctx.lineWidth = scale

    fracPathOverlays.forEach(t => {
        if((!t.zIndex&&zIndex===0)||(t.zIndex===zIndex)){
        canvas2D_ctx.save()
        canvas2D_ctx.beginPath()
        if(t.lineWidth) canvas2D_ctx.lineWidth = t.lineWidth * scale
        else canvas2D_ctx.lineWidth = scale
        if(t.drawStyle==="stroke"){
            if(t.strokeStyle){
                canvas2D_ctx.strokeStyle = t.strokeStyle
            } else {
                if(bright_y<0.5)
                    canvas2D_ctx.strokeStyle = "white"
                else
                    canvas2D_ctx.strokeStyle = "black"
            }
        } else {
            if(t.fillStyle&&t.drawStyle!=="gradient"){
                canvas2D_ctx.fillStyle = t.fillStyle
            } else if(t.drawStyle==="gradient"){
                const grad_x0 = width*t.gradientBoundary[0]
                const grad_y0 = height*t.gradientBoundary[1]
                const grad_x1 = width*t.gradientBoundary[2]
                const grad_y1 = height*t.gradientBoundary[3]
                const grad=canvas2D_ctx.createLinearGradient(grad_x0,grad_y0,grad_x1,grad_y1)
                t.gradientStops.forEach(stop => {
                    grad.addColorStop(Math.max(Math.min(stop.stop,1.0),0.0), stop.colour)
                })
                canvas2D_ctx.fillStyle = grad
            } else {
                if(bright_y<0.5)
                    canvas2D_ctx.fillStyle = "white"
                else
                    canvas2D_ctx.fillStyle = "black"
            }
        }
        canvas2D_ctx.moveTo(width*t.path[0][0],height*t.path[0][1])
        for(let i=0;i<t.path.length;i++){
            canvas2D_ctx.lineTo(width*t.path[i][0],height*t.path[i][1])
        }
        if(t.drawStyle==="stroke"){
            canvas2D_ctx.stroke()
        } else {
            canvas2D_ctx.fill()
        }
        canvas2D_ctx.restore()
        }
    })

    callbacks.forEach(f => {
        canvas2D_ctx.save()
        f(canvas2D_ctx,backgroundColor,width,height,scale)
        canvas2D_ctx.restore()
    })

    if(drawScaleBar&&zIndex===4) {

        canvas2D_ctx.save()
        if(bright_y<0.5) {
            canvas2D_ctx.strokeStyle = "white"
            canvas2D_ctx.fillStyle = "white"
        } else {
            canvas2D_ctx.strokeStyle = "black"
            canvas2D_ctx.fillStyle = "black"
        }

        canvas2D_ctx.lineWidth = Math.floor(2*scale)

        let viewMult = 1.0
        if(doThreeWayView) viewMult = 2.0

        if(doMultiView) {
            if(specifyMultiViewRowsColumns){
                viewMult = multiViewColumns
            } else {
                const grid = get_grid(molecules.length)
                viewMult = grid[1]
            }
        }

        const scale_fac = 10*zoom* width / height *viewMult
        let scale_pow = Math.pow(10,Math.floor(Math.log(scale_fac)/Math.log(10)))

        let scale_length_fac = scale_pow / scale_fac
        if(scale_length_fac<0.5) {scale_length_fac *=2; scale_pow *= 2}
        if(scale_length_fac<0.5) {scale_length_fac *=2.5; scale_pow *= 2.5}

        if(bright_y<0.5) {
            canvas2D_ctx.strokeStyle = "white"
            canvas2D_ctx.fillStyle = "white"
        } else {
            canvas2D_ctx.strokeStyle = "black"
            canvas2D_ctx.fillStyle = "black"
        }

        canvas2D_ctx.lineWidth = Math.floor(2*scale)

        const end = width - 60*scale

        const wh_ratio = 1.0 * width / height
        const l = 0.21 * width

        const vpos = 30*scale

        canvas2D_ctx.beginPath()
        canvas2D_ctx.moveTo(end,height-vpos)
        canvas2D_ctx.lineTo(end-l*scale_length_fac,height-vpos)
        canvas2D_ctx.stroke()
        canvas2D_ctx.beginPath()
        canvas2D_ctx.moveTo(end,height-vpos-8*scale)
        canvas2D_ctx.lineTo(end,height-vpos+8*scale)
        canvas2D_ctx.stroke()
        canvas2D_ctx.beginPath()
        canvas2D_ctx.moveTo(end-l*scale_length_fac,height-vpos-8*scale)
        canvas2D_ctx.lineTo(end-l*scale_length_fac,height-vpos+8*scale)
        canvas2D_ctx.stroke()

        canvas2D_ctx.font =  Math.floor(22*scale) + "px helvetica"
        canvas2D_ctx.fillText(scale_pow+"Å",end+4*scale,height-vpos+8*scale)

        canvas2D_ctx.restore()
    }

    if(drawCrosshairs&&zIndex===4){
        canvas2D_ctx.save()
        if(bright_y<0.5) {
            canvas2D_ctx.strokeStyle = "white"
            canvas2D_ctx.fillStyle = "white"
        } else {
            canvas2D_ctx.strokeStyle = "black"
            canvas2D_ctx.fillStyle = "black"
        }

        canvas2D_ctx.lineWidth = 1
        if(!doThreeWayView&&!doCrossEyedStereo&&!doSideBySideStereo&&!doMultiView){
            canvas2D_ctx.beginPath()
            canvas2D_ctx.moveTo(width*.5-5,height*.5)
            canvas2D_ctx.lineTo(width*.5+5,height*.5)
            canvas2D_ctx.stroke()
            canvas2D_ctx.beginPath()
            canvas2D_ctx.moveTo(width*.5,height*.5-5)
            canvas2D_ctx.lineTo(width*.5,height*.5+5)
            canvas2D_ctx.stroke()
        }
        if(doCrossEyedStereo||doSideBySideStereo){
            canvas2D_ctx.beginPath()
            canvas2D_ctx.moveTo(width*.25-5,height*.5)
            canvas2D_ctx.lineTo(width*.25+5,height*.5)
            canvas2D_ctx.stroke()
            canvas2D_ctx.beginPath()
            canvas2D_ctx.moveTo(width*.25,height*.5-5)
            canvas2D_ctx.lineTo(width*.25,height*.5+5)
            canvas2D_ctx.stroke()
            canvas2D_ctx.beginPath()
            canvas2D_ctx.moveTo(width*.75-5,height*.5)
            canvas2D_ctx.lineTo(width*.75+5,height*.5)
            canvas2D_ctx.stroke()
            canvas2D_ctx.beginPath()
            canvas2D_ctx.moveTo(width*.75,height*.5-5)
            canvas2D_ctx.lineTo(width*.75,height*.5+5)
            canvas2D_ctx.stroke()
        }
        if(doThreeWayView){
            if(threeWayViewOrder.length==0){
                canvas2D_ctx.beginPath()
                canvas2D_ctx.moveTo(width*.25-5,height*.25)
                canvas2D_ctx.lineTo(width*.25+5,height*.25)
                canvas2D_ctx.stroke()
                canvas2D_ctx.beginPath()
                canvas2D_ctx.moveTo(width*.25,height*.25-5)
                canvas2D_ctx.lineTo(width*.25,height*.25+5)
                canvas2D_ctx.stroke()
                canvas2D_ctx.beginPath()
                canvas2D_ctx.moveTo(width*.75-5,height*.25)
                canvas2D_ctx.lineTo(width*.75+5,height*.25)
                canvas2D_ctx.stroke()
                canvas2D_ctx.beginPath()
                canvas2D_ctx.moveTo(width*.75,height*.25-5)
                canvas2D_ctx.lineTo(width*.75,height*.25+5)
                canvas2D_ctx.stroke()
                canvas2D_ctx.beginPath()
                canvas2D_ctx.moveTo(width*.25-5,height*.75)
                canvas2D_ctx.lineTo(width*.25+5,height*.75)
                canvas2D_ctx.stroke()
                canvas2D_ctx.beginPath()
                canvas2D_ctx.moveTo(width*.25,height*.75-5)
                canvas2D_ctx.lineTo(width*.25,height*.75+5)
                canvas2D_ctx.stroke()
            }
            if(threeWayViewOrder.length===4){
                if(threeWayViewOrder[0]!==" "){
                    canvas2D_ctx.beginPath()
                    canvas2D_ctx.moveTo(width*.25-5,height*.25)
                    canvas2D_ctx.lineTo(width*.25+5,height*.25)
                    canvas2D_ctx.stroke()
                    canvas2D_ctx.beginPath()
                    canvas2D_ctx.moveTo(width*.25,height*.25-5)
                    canvas2D_ctx.lineTo(width*.25,height*.25+5)
                    canvas2D_ctx.stroke()
                }
                if(threeWayViewOrder[1]!==" "){
                    canvas2D_ctx.beginPath()
                    canvas2D_ctx.moveTo(width*.75-5,height*.25)
                    canvas2D_ctx.lineTo(width*.75+5,height*.25)
                    canvas2D_ctx.stroke()
                    canvas2D_ctx.beginPath()
                    canvas2D_ctx.moveTo(width*.75,height*.25-5)
                    canvas2D_ctx.lineTo(width*.75,height*.25+5)
                    canvas2D_ctx.stroke()
                }
                if(threeWayViewOrder[2]!==" "){
                    canvas2D_ctx.beginPath()
                    canvas2D_ctx.moveTo(width*.25-5,height*.75)
                    canvas2D_ctx.lineTo(width*.25+5,height*.75)
                    canvas2D_ctx.stroke()
                    canvas2D_ctx.beginPath()
                    canvas2D_ctx.moveTo(width*.25,height*.75-5)
                    canvas2D_ctx.lineTo(width*.25,height*.75+5)
                    canvas2D_ctx.stroke()
                }
                if(threeWayViewOrder[3]!==" "){
                    canvas2D_ctx.beginPath()
                    canvas2D_ctx.moveTo(width*.75-5,height*.75)
                    canvas2D_ctx.lineTo(width*.75+5,height*.75)
                    canvas2D_ctx.stroke()
                    canvas2D_ctx.beginPath()
                    canvas2D_ctx.moveTo(width*.75,height*.75-5)
                    canvas2D_ctx.lineTo(width*.75,height*.75+5)
                    canvas2D_ctx.stroke()
                }
            }
        }
        if(doMultiView){
            let rows
            let columns
            if(specifyMultiViewRowsColumns){
                rows = multiViewRows
                columns = multiViewColumns
            } else {
                const grid = get_grid(molecules.length)
                rows = grid[0]
                columns = grid[1]
            }
            for(let irow=0;irow<rows;irow++){
                const row_frac = irow/rows + 0.5/rows
                for(let icol=0;icol<columns;icol++){
                    const col_frac = icol/columns + 0.5/columns
                    canvas2D_ctx.beginPath()
                    canvas2D_ctx.moveTo(width*col_frac-5,height*row_frac)
                    canvas2D_ctx.lineTo(width*col_frac+5,height*row_frac)
                    canvas2D_ctx.stroke()
                    canvas2D_ctx.beginPath()
                    canvas2D_ctx.moveTo(width*col_frac,height*row_frac-5)
                    canvas2D_ctx.lineTo(width*col_frac,height*row_frac+5)
                    canvas2D_ctx.stroke()
                }
            }
        }
        canvas2D_ctx.restore()
    }

    if(doDrawAxes&&zIndex===4){
        canvas2D_ctx.save()
        if(bright_y<0.5) {
            canvas2D_ctx.strokeStyle = "white"
            canvas2D_ctx.fillStyle = "white"
        } else {
            canvas2D_ctx.strokeStyle = "black"
            canvas2D_ctx.fillStyle = "black"
        }

        canvas2D_ctx.lineWidth = Math.floor(2*scale)
        canvas2D_ctx.font =  Math.floor(22*scale) + "px helvetica"
        const drawAxes = (theQuat,base_x,base_y,multiScale) => {
            const theMatrix = quatToMat4(theQuat);
            const x_axis = vec3.create();
            const y_axis = vec3.create();
            const z_axis = vec3.create();
            vec3.set(x_axis, 1.0, 0.0, 0.0);
            vec3.set(y_axis, 0.0, 1.0, 0.0);
            vec3.set(z_axis, 0.0, 0.0, 1.0);
            vec3.transformMat4(x_axis, x_axis, theMatrix);
            vec3.transformMat4(y_axis, y_axis, theMatrix);
            vec3.transformMat4(z_axis, z_axis, theMatrix);

            const arrow_length = multiScale*scale*40

            if(Math.abs(x_axis[0])>2e-1||Math.abs(x_axis[1])>2e-1)
                drawArrow(canvas2D_ctx, base_x,base_y, base_x+x_axis[0]*arrow_length,base_y-x_axis[1]*arrow_length, 2.0, "red",multiScale*scale)
            if(Math.abs(y_axis[0])>2e-1||Math.abs(y_axis[1])>2e-1)
                drawArrow(canvas2D_ctx, base_x,base_y, base_x+y_axis[0]*arrow_length,base_y-y_axis[1]*arrow_length, 2.0, "#00ff00",multiScale*scale)
            if(Math.abs(z_axis[0])>2e-1||Math.abs(z_axis[1])>2e-1)
                 drawArrow(canvas2D_ctx, base_x,base_y, base_x+z_axis[0]*arrow_length,base_y-z_axis[1]*arrow_length, 2.0, "blue",multiScale*scale)

            canvas2D_ctx.fillText("x",base_x+x_axis[0]*(arrow_length+5*multiScale*scale),base_y-x_axis[1]*(arrow_length+5*multiScale*scale))
            canvas2D_ctx.fillText("y",base_x+y_axis[0]*(arrow_length+5*multiScale*scale),base_y-y_axis[1]*(arrow_length+5*multiScale*scale))
            canvas2D_ctx.fillText("z",base_x+z_axis[0]*(arrow_length+5*multiScale*scale),base_y-z_axis[1]*(arrow_length+5*multiScale*scale))
        }

        if(doCrossEyedStereo||doSideBySideStereo){
            if(stereoQuats.length===0) createStereoQuats()
            const newQuat_p = quat4.clone(quat);
            quat4.multiply(newQuat_p, newQuat_p, stereoQuats[0]);
            let base_x = width*.46
            let base_y = height*.125
            drawAxes(newQuat_p,base_x,base_y,1.0)
            const newQuat_m = quat4.clone(quat);
            quat4.multiply(newQuat_m, newQuat_m, stereoQuats[1]);
            base_x = width*.96
            base_y = height*.125
            drawAxes(newQuat_m,base_x,base_y,1.0)
        } else if(doThreeWayView){
            if(xForward===null) createThreeWayQuats()
            const newQuat_x = quat4.clone(quat);
            quat4.multiply(newQuat_x, newQuat_x, xForward);
            const newQuat_y = quat4.clone(quat);
            quat4.multiply(newQuat_y, newQuat_y, yForward);
            if(threeWayViewOrder.length===0||threeWayViewOrder==="ZXY "){
                let base_x = width*.46
                let base_y = height*.075
                drawAxes(quat,base_x,base_y,0.75)
                base_x = width*.96
                base_y = height*.075
                drawAxes(newQuat_x,base_x,base_y,0.75)
                base_x = width*.46
                base_y = height*.575
                drawAxes(newQuat_y,base_x,base_y,0.75)
            } else {
                if(threeWayViewOrder[0]!==" ") {
                    const base_x = width*.46
                    const base_y = height*.075
                    const newQuat = quat4.clone(quat)
                    if(threeWayViewOrder[0]==="Y")
                        quat4.multiply(newQuat, newQuat, yForward);
                    else if(threeWayViewOrder[0]==="X")
                        quat4.multiply(newQuat, newQuat, xForward);
                    drawAxes(newQuat,base_x,base_y,0.55)
                }
                if(threeWayViewOrder[1]!==" ") {
                    console.log(threeWayViewOrder[1])
                    const base_x = width*.96
                    const base_y = height*.075
                    const newQuat = quat4.clone(quat)
                    if(threeWayViewOrder[1]==="Y")
                        quat4.multiply(newQuat, newQuat, yForward);
                    else if(threeWayViewOrder[1]==="X")
                    quat4.multiply(newQuat, newQuat, xForward);
                    drawAxes(newQuat,base_x,base_y,0.55)
                }
                if(threeWayViewOrder[2]!==" ") {
                    const base_x = width*.46
                    const base_y = height*.575
                    const newQuat = quat4.clone(quat)
                    if(threeWayViewOrder[2]==="Y")
                        quat4.multiply(newQuat, newQuat, yForward);
                    else if(threeWayViewOrder[2]==="X")
                    quat4.multiply(newQuat, newQuat, xForward);
                    drawAxes(newQuat,base_x,base_y,0.55)
                }
                if(threeWayViewOrder[3]!==" ") {
                    const base_x = width*.96
                    const base_y = height*.575
                    const newQuat = quat4.clone(quat)
                    if(threeWayViewOrder[3]==="Y")
                        quat4.multiply(newQuat, newQuat, yForward);
                    else if(threeWayViewOrder[3]==="X")
                    quat4.multiply(newQuat, newQuat, xForward);
                    drawAxes(newQuat,base_x,base_y,0.55)
                }
            }
        } else {
            const base_x = width*.92
            const base_y = height*.125
            drawAxes(quat,base_x,base_y,1.0)
        }
        canvas2D_ctx.restore()
    }
}


export const Moorhen2DOverlay = ((props) => {

    const store = useStore<RootState>()

    const [ isLegalVisible, setIsLegalVisible ] = useState(window.location.hostname==="moorhen.hosted.york.ac.uk" ? true : false)
    
    const width = useSelector((state: moorhen.State) => state.sceneSettings.GlViewportWidth)
    const height = useSelector((state: moorhen.State) => state.sceneSettings.GlViewportHeight)
    const backgroundColor = useSelector((state: moorhen.State) => state.sceneSettings.backgroundColor)

    const imageOverlays = useSelector((state: moorhen.State) => state.overlays.imageOverlayList)
    const latexOverlays = useSelector((state: moorhen.State) => state.overlays.latexOverlayList)
    const textOverlays = useSelector((state: moorhen.State) => state.overlays.textOverlayList)
    const svgPathOverlays = useSelector((state: moorhen.State) => state.overlays.svgPathOverlayList)
    const fracPathOverlays = useSelector((state: moorhen.State) => state.overlays.fracPathOverlayList)
    const callbacks = useSelector((state: moorhen.State) => state.overlays.callBacks)

    const helpText = useSelector((state: moorhen.State) => state.glRef.shortCutHelp)

    /** Which layers had something on them last frame, so an emptied one is cleared exactly once. */
    const layersDrawnRef = useRef<boolean[]>([true,true,true,true,true])

    /** Last frame's drawing inputs, so a frame that only rotated the view can be skipped. */
    const drawSignatureRef = useRef<unknown[] | null>(null)

    /**
     * Last frame's chrome boxes, so a partial clear also wipes where the chrome *used* to be.
     *
     * Clearing only where chrome is about to be drawn is not enough: switch the axes off and their
     * box leaves the list, nothing clears it, and drawOn2DContext does not draw over it either, so
     * the gizmo stays on screen until something forces a full clear.
     */
    const chromeRegionsRef = useRef<DamageRegion[] | null>(null)

    const canvas2DRef0 = useRef<HTMLCanvasElement>(null)
    const canvas2DRef1 = useRef<HTMLCanvasElement>(null)
    const canvas2DRef2 = useRef<HTMLCanvasElement>(null)
    const canvas2DRef3 = useRef<HTMLCanvasElement>(null)
    const canvas2DRef4 = useRef<HTMLCanvasElement>(null)

    const [images, setImages] = useState<ImageFrac2D[]>([])

    let ratio = 1.0
    if(window.devicePixelRatio) ratio = Math.ceil(window.devicePixelRatio);

    // remove from dom after 5s
    useEffect(() => {
        if (isLegalVisible) {
            const hideTimeout = setTimeout(() => {
                setIsLegalVisible(false);
            }, 5000);
            
            return () => {
                clearTimeout(hideTimeout);
            };
        }
    }, []);


    useEffect(() => {
        const new_images = []
        const buildLatexImages = async() => {
            for(let ilo=0;ilo<latexOverlays.length;ilo++){
                const mathJaxInfo = await getMathJaxSVG(latexOverlays[ilo].text)
                if(mathJaxInfo.whratio>0){
                    const img = new window.Image()
                    const wh_ratio = mathJaxInfo.whratio
                    const svg_height = latexOverlays[ilo].height
                    const svg = mathJaxInfo.svg
                    const blob = new Blob([svg], {type: 'image/svg+xml'})
                    const blobUrl = URL.createObjectURL(blob)
                    img.src = blobUrl
                    img.crossOrigin = "Anonymous"
                    const img_frac:ImageFrac2D = {x:latexOverlays[ilo].x,y:latexOverlays[ilo].y,img,width:svg_height*wh_ratio,height:svg_height,zIndex:latexOverlays[ilo].zIndex}
                    new_images.push(img_frac)
                }
            }
        }
        buildLatexImages()
        imageOverlays.forEach(imgSrc => {
            const img = new window.Image()
            if(imgSrc.src.length>0){
                if(imgSrc.src.startsWith("<svg")){
                    const svg = imgSrc.src
                    const blob = new Blob([svg], {type: 'image/svg+xml'})
                    const blobUrl = URL.createObjectURL(blob)
                    img.src = blobUrl
                    img.crossOrigin = "Anonymous"
                    const img_frac:ImageFrac2D = {x:imgSrc.x,y:imgSrc.y,img,width:imgSrc.width,height:imgSrc.height,zIndex:imgSrc.zIndex}
                    new_images.push(img_frac)
                } else if(imgSrc.src.startsWith("data:image")){
                    if(imgSrc.src.indexOf(";")>10){
                        const mimeType = imgSrc.src.substring(5,imgSrc.src.indexOf(";"))
                        img.src = imgSrc.src
                        img.crossOrigin = "Anonymous"
                        const img_frac:ImageFrac2D = {x:imgSrc.x,y:imgSrc.y,img,width:imgSrc.width,height:imgSrc.height,zIndex:imgSrc.zIndex}
                        new_images.push(img_frac)
                    }
                } else {
                    img.src = imgSrc.src
                    img.crossOrigin = "Anonymous"
                    const img_frac:ImageFrac2D = {x:imgSrc.x,y:imgSrc.y,img,width:imgSrc.width,height:imgSrc.height,zIndex:imgSrc.zIndex}
                    new_images.push(img_frac)
                }
            }
        })
        setImages(new_images)
    }, [latexOverlays,imageOverlays])

    const getContexts = useCallback(() => {
        const contexts = []
        const refs = [canvas2DRef0,canvas2DRef1,canvas2DRef2,canvas2DRef3,canvas2DRef4]
        refs.forEach((ref) => {
            if(ref&&ref.current){
                contexts.push(ref.current.getContext('2d', { alpha: true }))
            } else {
                contexts.push(null)
            }
        })
        return contexts
    }, [canvas2DRef0,canvas2DRef1,canvas2DRef2,canvas2DRef3,canvas2DRef4])

    const draw2D = () => {

        const refs = [canvas2DRef0,canvas2DRef1,canvas2DRef2,canvas2DRef3,canvas2DRef4]
        const contexts = getContexts()

        // Size only when the size actually changed.
        //
        // Assigning to canvas.width or canvas.height resets the canvas even when the value is the
        // one already there, so this avoided five pointless resets a frame. Measured on Firefox it
        // bought nothing, which says the reset is lazy rather than an eager reallocation - the cost
        // of an untouched frame turned out to be the clearRect below, not this. Kept because it is
        // still work that need not happen, but do not expect it to show up in a timing.
        //
        // Truncated, not rounded: canvas.width is an unsigned long, so assigning a fraction
        // truncates towards zero. Rounding here would read back as a different number on any
        // fractional device pixel ratio, the guard would never match, and the reallocation would
        // quietly continue every frame while looking fixed.
        const pixelWidth = Math.trunc(width * ratio)
        const pixelHeight = Math.trunc(height * ratio)

        // Whether layer i will draw anything at all.
        //
        // Clearing a full-screen 2D canvas is a solid rect fill, and Firefox does it on the CPU -
        // a profile of an empty spinning scene put neon::rect_memset32, under skcpu::Draw::drawRect,
        // at the top of everything that was not idle. Five of these run every frame, and in the
        // common case four of them have nothing on them: layers 0 to 3 carry only overlays, and
        // layer 4 carries the scale bar, crosshairs and axes.
        //
        // helpText and the callbacks are not filtered by zIndex, so either makes every layer live.
        const state = store.getState()
        const sceneSettings = state.sceneSettings
        const chromeOnTop = sceneSettings.drawScaleBar || sceneSettings.drawCrosshairs || sceneSettings.drawAxes

        // Whether anything other than the view rotation changed since the last call.
        //
        // This effect fires on every frame, because drawScene pushes a new drawQuat each time. But
        // the rotation is used by exactly one thing in drawOn2DContext - the axes, which are gated
        // to layer 4 - so on a spin with the axes off there is nothing for any layer to redraw.
        //
        // That matters more than it sounds. These canvases are software surfaces in Firefox, as the
        // earlier skcpu::Draw frames showed, so every redraw has to be copied and format-converted
        // up to the compositor: _platform_memmove and gfx Swizzle were the largest remaining cost
        // in the profile after the empty layers were dealt with.
        //
        // The slices are compared by reference rather than the twenty individual values
        // drawOn2DContext reads out of them. Coarser, so an unrelated change to sceneSettings
        // causes a redundant redraw - but it cannot go stale, which the enumerated version would
        // the first time someone read one more value in there.
        const signature = [state.sceneSettings, state.overlays, state.molecules,
                           width, height, ratio, helpText, images]
        const previous = drawSignatureRef.current
        const onlyRotationChanged = previous !== null
            && previous.length === signature.length
            && previous.every((value, i) => value === signature[i])
        drawSignatureRef.current = signature

        // Callbacks get no quat, but nothing stops one reading the rotation out of the store, so
        // they are treated as rotation-sensitive rather than assumed not to be.
        const usesRotation = (i: number) => (i === 4 && sceneSettings.drawAxes) || callbacks.length > 0
        // Overlays are unbounded - they can be anywhere - so a layer carrying one always needs a
        // full clear. The chrome is the only thing whose extent is known.
        const hasOverlayContent = (i: number) => {
            if(helpText.length > 0 || callbacks.length > 0) return true
            const onLayer = (z?: number) => (!z && i === 0) || z === i
            if(textOverlays.some(t => onLayer(t.zIndex))) return true
            if(svgPathOverlays.some(t => onLayer(t.zIndex))) return true
            if(fracPathOverlays.some(t => onLayer(t.zIndex))) return true
            return images.some(img => onLayer(img.zIndex))
        }
        const layerHasContent = (i: number) => hasOverlayContent(i) || (i === 4 && chromeOnTop)

        const simpleLayout = !sceneSettings.doSideBySideStereo && !sceneSettings.doCrossEyedStereo
            && !sceneSettings.doThreeWayView && !sceneSettings.doMultiView
        const chromeRegions = chromeDamageRegions(width, height, 1.0, {
            drawAxes: sceneSettings.drawAxes,
            drawScaleBar: sceneSettings.drawScaleBar,
            drawCrosshairs: sceneSettings.drawCrosshairs,
            simpleLayout,
        })

        /**
         * Layer 4 carrying only chrome in a simple layout: clear where it draws, not everywhere.
         *
         * Both this frame's boxes and last frame's have to be known, since the clear has to cover
         * where the chrome was as well as where it is going. A layout change either way - into or
         * out of stereo or multi-view - falls back to a full clear for one frame.
         */
        const clearRegions = regionsToClear(chromeRegionsRef.current, chromeRegions)
        const damageOnly = (i: number) => i === 4 && clearRegions !== null && !hasOverlayContent(4)

        contexts.forEach((ctx,i) => {
            const canvas = refs[i] ? refs[i].current : null
            if(canvas){
                if(canvas.width !== pixelWidth) canvas.width = pixelWidth
                if(canvas.height !== pixelHeight) canvas.height = pixelHeight
                const cssWidth = `${width}px`
                const cssHeight = `${height}px`
                if(canvas.style.width !== cssWidth) canvas.style.width = cssWidth
                if(canvas.style.height !== cssHeight) canvas.style.height = cssHeight
            }

            // A layer that has just become empty still needs one last clear to remove what it was
            // showing; after that it is left alone until something arrives on it again.
            const hasContent = layerHasContent(i)
            if(!hasContent && !layersDrawnRef.current[i]) return
            if(onlyRotationChanged && !usesRotation(i)) return
            layersDrawnRef.current[i] = hasContent

            if(ctx){
                ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

                // Resizing the canvas used to reset every context property as a side effect, and
                // the drawing below has always been free to rely on starting from the defaults.
                // Now that the canvas is only resized when its size changed, put them back
                // explicitly so nothing carries over from the previous frame.
                ctx.fillStyle = "#000000"
                ctx.strokeStyle = "#000000"
                ctx.lineWidth = 1
                ctx.globalAlpha = 1
                ctx.font = "10px sans-serif"
                ctx.textAlign = "start"
                ctx.textBaseline = "alphabetic"

                if(damageOnly(i)){
                    for(const region of clearRegions) ctx.clearRect(region.x, region.y, region.w, region.h)
                } else {
                    ctx.clearRect(0,0,width,height)
                }
                drawOn2DContext(ctx, width, height, 1.0, helpText, images, props.drawQuat, i, store)
            }
        })

        chromeRegionsRef.current = chromeRegions
    }

    useEffect(() => {
        draw2D()
    }, [draw2D,textOverlays,imageOverlays,svgPathOverlays,fracPathOverlays,callbacks,props.drawQuat])

    return  <>
           <canvas style={{zIndex:0, pointerEvents: "none", position: "absolute", top: 0, left:0}} ref={canvas2DRef0} height={width} width={height} />
           <canvas style={{zIndex:1, pointerEvents: "none", position: "absolute", top: 0, left:0}} ref={canvas2DRef1} height={width} width={height} />
           <canvas style={{zIndex:2, pointerEvents: "none", position: "absolute", top: 0, left:0}} ref={canvas2DRef2} height={width} width={height} />
           <canvas style={{zIndex:3, pointerEvents: "none", position: "absolute", top: 0, left:0}} ref={canvas2DRef3} height={width} width={height} />
           <canvas style={{zIndex:4, pointerEvents: "none", position: "absolute", top: 0, left:0}} ref={canvas2DRef4} height={width} width={height} />
           { isLegalVisible && <div className="moorhen-legal-statements" >
                Hosted by the University of York, please see Help-&gt;About for Legal Statements.
                <MoorhenStack direction="line" gap={"1rem"}>
                    <img style={{height:"4rem"}} src={`${props.urlPrefix}/pixmaps/UOY-Logo-Stacked-shield-Black.png`} alt="Moorhen logo"/>
                    <img style={{height:"4rem"}} src={`${props.urlPrefix}/pixmaps/Medical_Research_Council_logo.svg`} alt="Moorhen logo"/>
                    <img style={{height:"4rem"}} src={`${props.urlPrefix}/pixmaps/ccp4-big-logo2-transparent.png`} alt="Moorhen logo"/>
                </MoorhenStack>
           </div>}
            </>
});

