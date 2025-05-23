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

        ctx = saveCanvas.getContext("2d");

        const isWebGL2 = store.getState().glRef.isWebGL2

        if(!isWebGL2){
            saveCanvas.width = this.glRef.current.canvas.width
            saveCanvas.height = this.glRef.current.canvas.height

            this.glRef.current.save_pixel_data = true;
            this.glRef.current.drawScene();
            pixels = this.glRef.current.pixel_data;

            imgData = ctx.createImageData(this.glRef.current.canvas.width, this.glRef.current.canvas.height);
            const data = imgData.data;

            for (let pixi = 0; pixi < this.glRef.current.canvas.height; pixi++) {
                for (let pixj = 0; pixj < this.glRef.current.canvas.width * 4; pixj++) {
                    data[(this.glRef.current.canvas.height - pixi - 1) * this.glRef.current.canvas.width * 4 + pixj] = pixels[pixi * this.glRef.current.canvas.width * 4 + pixj];
                }
            }
            ctx.putImageData(imgData, 0,0);

            this.glRef.current.save_pixel_data = false;
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

            pixels = this.glRef.current.pixel_data;

            imgData = ctx.createImageData(saveCanvas.width,saveCanvas.height);

            const data = imgData.data;
            for (let pixi = 0; pixi < saveCanvas.height; pixi++) {
                for (let pixj = 0; pixj < saveCanvas.width * 4; pixj++) {
                    data[(saveCanvas.height - pixi - 1) * saveCanvas.width * 4 + pixj] = pixels[(pixi+target_yoff) * w * 4 + pixj+target_xoff*4];
                }
            }
            ctx.putImageData(imgData, 0,0);
            this.glRef.current.renderToTexture = false;
        }

        this.glRef.current.drawScene();

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
