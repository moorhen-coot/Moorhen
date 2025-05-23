import * as vec3 from 'gl-matrix/vec3';
import * as quat4 from 'gl-matrix/quat';
import { quatToMat4, quat4Inverse } from '../WebGLgComponents/quatToMat4.js';
import { webGL } from "../types/mgWebGL.js";
import { moorhen } from '../types/moorhen.js';
import store from '../store/MoorhenReduxStore'
import { setOrigin, setRequestDrawScene, setRequestBuildBuffers } from "../store/glRefSlice"

export class MoorhenScreenRecorder implements moorhen.ScreenRecorder {

    rec: MediaRecorder;
    chunks: Blob[];
    glRef: React.RefObject<webGL.MGWebGL>;
    canvasRef: React.RefObject<HTMLCanvasElement>;
    _isRecording: boolean;

    constructor(glRef: React.RefObject<webGL.MGWebGL>){
        this.glRef = glRef
        this.chunks = [];
        this.canvasRef = this.glRef.current.canvasRef
        const stream = this.canvasRef.current.captureStream(30)

        let options = {
          videoBitsPerSecond: 25000000000 // 2.5Mbps
        }

        this.rec = new MediaRecorder(stream,options)
        this._isRecording = false;
    }

    stopRecording = () => {
        if (this._isRecording) {
            this.rec.stop();
            this._isRecording = false;
        } else {
            console.warn('Attempted to stop screen recorder that was not recording...')
        }
    }

    isRecording = () => {
        return this._isRecording;
    }

    startRecording = () => {
        if (this._isRecording) {
            console.warn('Screen recording already taking place!')
            return
        } 
        this.chunks = [];
        this.rec.ondataavailable = (e) => {
            this.chunks.push(e.data);
        }
        // only when the recorder stops, we construct a complete Blob from all the chunks
        this.rec.onstop = (e) =>
            this.downloadVideo(new Blob(this.chunks, { type: "video/webm;codecs=h264" }));
        this._isRecording = true;
        this.rec.start();
    }

    downloadVideo = async (blob: Blob) => {
        let url = URL.createObjectURL(blob);
        let link: any = document.getElementById('download_video_link');
        if (!link) {
            link = document.createElement('a');
            link.id = 'download_video_link';
            link.download = "moorhen.webm";
            document.body.appendChild(link);
        }
        link.href = url;
        link.click();
    }

    takeScreenShot = (filename: string, doTransparentBackground: boolean = false) => {
        this.glRef.current.setDoTransparentScreenshotBackground(doTransparentBackground)
        const oldOrigin = [this.glRef.current.origin[0], this.glRef.current.origin[1], this.glRef.current.origin[2]];

        // Getting up and right for doing tiling (in future?)
        const invQuat = quat4.create();
        quat4Inverse(this.glRef.current.myQuat, invQuat);

        const invMat = quatToMat4(invQuat);

        const right = vec3.create();
        vec3.set(right, 1.0, 0.0, 0.0);
        const up = vec3.create();
        vec3.set(up, 0.0, 1.0, 0.0);

        vec3.transformMat4(up, up, invMat);
        vec3.transformMat4(right, right, invMat);


        let target_w: number;
        let target_h: number;
        let target_xoff: number;
        let target_yoff: number;

        const saveCanvas = document.createElement("canvas");

        if(!this.glRef.current.screenshotBuffersReady)
            this.glRef.current.initTextureFramebuffer();
        const w = this.glRef.current.rttFramebuffer.width;
        const h = this.glRef.current.rttFramebuffer.height;
        
        let imgData: ImageData;
        let pixels: Uint8Array;
        let ctx: CanvasRenderingContext2D;

        const isWebGL2 = store.getState().glRef.isWebGL2

        if(!isWebGL2){
            const mag = 1; //FIXME This doesn't work for mag>1

            const ncells_x = mag;
            const ncells_y = mag;
            saveCanvas.width = this.glRef.current.canvas.width * ncells_x;
            saveCanvas.height = this.glRef.current.canvas.height * ncells_y;
            ctx = saveCanvas.getContext("2d");

            let newZoom = this.glRef.current.zoom / ncells_x;
            this.glRef.current.setZoom(newZoom);

            const ratio = 1.0 * this.glRef.current.gl.viewportWidth / this.glRef.current.gl.viewportHeight;
            let jj = 0;
            for (let j = Math.floor(-ncells_y / 2); j < Math.floor(ncells_y / 2); j++) {
                let ii = 0;
                for (let i = Math.floor(-ncells_x / 2); i < Math.floor(ncells_x / 2); i++) {
                    const x_off = ratio * (2.0 * i + 1 + ncells_x % 2);
                    const y_off = (2.0 * j + 1 + ncells_y % 2);

                    this.glRef.current.origin = [oldOrigin[0], oldOrigin[1], oldOrigin[2]];
                    this.glRef.current.origin[0] += this.glRef.current.zoom * right[0] * 24.0 * x_off + this.glRef.current.zoom * up[0] * 24.0 * y_off;
                    this.glRef.current.origin[1] += this.glRef.current.zoom * right[1] * 24.0 * x_off + this.glRef.current.zoom * up[1] * 24.0 * y_off;
                    this.glRef.current.origin[2] += this.glRef.current.zoom * right[2] * 24.0 * x_off + this.glRef.current.zoom * up[2] * 24.0 * y_off;

                    this.glRef.current.save_pixel_data = true;
                    //FIXME Now this does not seem to lend itself obviously to using react state - the pixels are needed synchronously
                    this.glRef.current.drawScene();
                    pixels = this.glRef.current.pixel_data;

                    imgData = ctx.createImageData(this.glRef.current.canvas.width, this.glRef.current.canvas.height);
                    const data = imgData.data;

                    for (let pixi = 0; pixi < this.glRef.current.canvas.height; pixi++) {
                        for (let pixj = 0; pixj < this.glRef.current.canvas.width * 4; pixj++) {
                            data[(this.glRef.current.canvas.height - pixi - 1) * this.glRef.current.canvas.width * 4 + pixj] = pixels[pixi * this.glRef.current.canvas.width * 4 + pixj];
                        }
                    }
                    ctx.putImageData(imgData, (ncells_x - ii - 1) * this.glRef.current.canvas.width, jj * this.glRef.current.canvas.height);
                    ii++;
                }
                jj++;
            }

            newZoom = this.glRef.current.zoom * ncells_x;
            this.glRef.current.setZoom(newZoom);

            this.glRef.current.origin = [oldOrigin[0], oldOrigin[1], oldOrigin[2]];
            this.glRef.current.save_pixel_data = false;
            this.glRef.current.drawScene();
            target_w = w;
            target_h = h;
            target_xoff = 0;
            target_yoff = 0;
        } else {

            this.glRef.current.renderToTexture = true;
            this.glRef.current.drawScene();
            const ratio = 1.0 * this.glRef.current.gl.viewportWidth / this.glRef.current.gl.viewportHeight;

            if(this.glRef.current.gl.viewportWidth>this.glRef.current.gl.viewportHeight){
                target_w = w;
                target_h = Math.floor(h / ratio);
                target_xoff = 0;
                target_yoff = Math.floor(0.5*this.glRef.current.rttFramebuffer.height - 0.5 / ratio * this.glRef.current.rttFramebuffer.height);
            } else {
                target_w = Math.floor(w * ratio);
                target_h = h;
                target_xoff = Math.floor(0.5*this.glRef.current.rttFramebuffer.width - 0.5 * ratio * this.glRef.current.rttFramebuffer.width);
                target_yoff = 0;
            }
            saveCanvas.width = target_w;
            saveCanvas.height = target_h;

            ctx = saveCanvas.getContext("2d");
            pixels = this.glRef.current.pixel_data;

            if(this.glRef.current.gl.viewportWidth>this.glRef.current.gl.viewportHeight){
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
            this.glRef.current.renderToTexture = false;
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
}
