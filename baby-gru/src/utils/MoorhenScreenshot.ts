import * as vec3 from 'gl-matrix/vec3';
import * as quat4 from 'gl-matrix/quat';
import { quatToMat4, quat4Inverse } from '../WebGLgComponents/quatToMat4.js';
import { webGL } from "../types/mgWebGL";

interface CanvasElement extends HTMLCanvasElement {
  captureStream(frameRate?: number): MediaStream;
}

export const startRecording = (glRef: React.RefObject<webGL.MGWebGL>) => {
    const canvas : CanvasElement = <CanvasElement> glRef.current.canvasRef.current;
    const chunks = []; // here we will store our recorded media chunks (Blobs)
    const stream = canvas.captureStream(30); // grab our canvas MediaStream
    const rec = new MediaRecorder(stream); // init the recorder
    // every time the recorder has new data, we will store it in our array
    rec.ondataavailable = (e) => {
        chunks.push(e.data);
    }
    // only when the recorder stops, we construct a complete Blob from all the chunks
    rec.onstop = (e) =>
        downloadVideo(new Blob(chunks, { type: "video/webm;codecs=h264" }));
    rec.start();
    setTimeout(() => {
        rec.stop();
    }, 6000); // stop recording in 6s
}

const downloadVideo = async (blob) => {
    var url = URL.createObjectURL(blob);
    let link: any = document.getElementById('download_video_link');
    if (!link) {
        link = document.createElement('a');
        link.id = 'download_video_link';
        link.download = "moorhen.webm";
        document.body.appendChild(link);
    }
    const saveCanvas = document.createElement("canvas");
    link.href = url;
    link.click();
}

export const screenShot = (glRef: React.RefObject<webGL.MGWebGL>,filename: string|null) => {
        const oldOrigin = [glRef.current.origin[0], glRef.current.origin[1], glRef.current.origin[2]];

        // Getting up and right for doing tiling (in future?)
        const invQuat = quat4.create();
        quat4Inverse(glRef.current.myQuat, invQuat);

        const invMat = quatToMat4(invQuat);

        const right = vec3.create();
        vec3.set(right, 1.0, 0.0, 0.0);
        const up = vec3.create();
        vec3.set(up, 0.0, 1.0, 0.0);

        vec3.transformMat4(up, up, invMat);
        vec3.transformMat4(right, right, invMat);


        let target_w;
        let target_h;
        let target_xoff;
        let target_yoff;

        const saveCanvas = document.createElement("canvas");

        if(!glRef.current.screenshotBuffersReady)
            glRef.current.initTextureFramebuffer();
        const w = glRef.current.rttFramebuffer.width;
        const h = glRef.current.rttFramebuffer.height;
        let imgData;
        let pixels;
        let ctx;

        if(!glRef.current.WEBGL2){
            const mag = 1; //FIXME This doesn't work for mag>1

            const ncells_x = mag;
            const ncells_y = mag;
            saveCanvas.width = glRef.current.canvas.width * ncells_x;
            saveCanvas.height = glRef.current.canvas.height * ncells_y;
            ctx = saveCanvas.getContext("2d");

            let newZoom = glRef.current.zoom / ncells_x;
            glRef.current.setZoom(newZoom);

            const ratio = 1.0 * glRef.current.gl.viewportWidth / glRef.current.gl.viewportHeight;
            let jj = 0;
            for (let j = Math.floor(-ncells_y / 2); j < Math.floor(ncells_y / 2); j++) {
                let ii = 0;
                for (let i = Math.floor(-ncells_x / 2); i < Math.floor(ncells_x / 2); i++) {
                    const x_off = ratio * (2.0 * i + 1 + ncells_x % 2);
                    const y_off = (2.0 * j + 1 + ncells_y % 2);

                    glRef.current.origin = [oldOrigin[0], oldOrigin[1], oldOrigin[2]];
                    glRef.current.origin[0] += glRef.current.zoom * right[0] * 24.0 * x_off + glRef.current.zoom * up[0] * 24.0 * y_off;
                    glRef.current.origin[1] += glRef.current.zoom * right[1] * 24.0 * x_off + glRef.current.zoom * up[1] * 24.0 * y_off;
                    glRef.current.origin[2] += glRef.current.zoom * right[2] * 24.0 * x_off + glRef.current.zoom * up[2] * 24.0 * y_off;

                    glRef.current.save_pixel_data = true;
                    glRef.current.drawScene();
                    pixels = glRef.current.pixel_data;

                    imgData = ctx.createImageData(glRef.current.canvas.width, glRef.current.canvas.height);
                    const data = imgData.data;

                    for (let pixi = 0; pixi < glRef.current.canvas.height; pixi++) {
                        for (let pixj = 0; pixj < glRef.current.canvas.width * 4; pixj++) {
                            data[(glRef.current.canvas.height - pixi - 1) * glRef.current.canvas.width * 4 + pixj] = pixels[pixi * glRef.current.canvas.width * 4 + pixj];
                        }
                    }
                    ctx.putImageData(imgData, (ncells_x - ii - 1) * glRef.current.canvas.width, jj * glRef.current.canvas.height);
                    ii++;
                }
                jj++;
            }

            newZoom = glRef.current.zoom * ncells_x;
            glRef.current.setZoom(newZoom);

            glRef.current.origin = [oldOrigin[0], oldOrigin[1], oldOrigin[2]];
            glRef.current.save_pixel_data = false;
            glRef.current.drawScene();
            target_w = w;
            target_h = h;
            target_xoff = 0;
            target_yoff = 0;
        } else {

            glRef.current.renderToTexture = true;
            glRef.current.drawScene();
            const ratio = 1.0 * glRef.current.gl.viewportWidth / glRef.current.gl.viewportHeight;

            if(glRef.current.gl.viewportWidth>glRef.current.gl.viewportHeight){
                target_w = w;
                target_h = Math.floor(h / ratio);
                target_xoff = 0;
                target_yoff = Math.floor(0.5*glRef.current.rttFramebuffer.height - 0.5 / ratio * glRef.current.rttFramebuffer.height);
            } else {
                target_w = Math.floor(w * ratio);
                target_h = h;
                target_xoff = Math.floor(0.5*glRef.current.rttFramebuffer.width - 0.5 * ratio * glRef.current.rttFramebuffer.width);
                target_yoff = 0;
            }
            saveCanvas.width = target_w;
            saveCanvas.height = target_h;

            ctx = saveCanvas.getContext("2d");
            pixels = glRef.current.pixel_data;

            if(glRef.current.gl.viewportWidth>glRef.current.gl.viewportHeight){
                imgData = ctx.createImageData(saveCanvas.width,saveCanvas.height);
            } else {
                imgData = ctx.createImageData(saveCanvas.width,saveCanvas.height);
            }

            const data = imgData.data;
            for (let pixi = 0; pixi < saveCanvas.height; pixi++) {
                for (let pixj = 0; pixj < saveCanvas.width * 4; pixj++) {
                    data[(saveCanvas.height - pixi - 1) * saveCanvas.width * 4 + pixj] = pixels[(pixi+target_yoff) * w * 4 + pixj+target_xoff*4];
                }
            }
            ctx.putImageData(imgData, 0,0);
            glRef.current.renderToTexture = false;
        }


        let link: any = document.getElementById('download_image_link');
        if (!link) {
            link = document.createElement('a');
            link.id = 'download_image_link';
            link.download = filename;
            document.body.appendChild(link);
        }
        link.href = saveCanvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
        link.click();
}
