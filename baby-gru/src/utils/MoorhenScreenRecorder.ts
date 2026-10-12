import { webGL } from "../types/mgWebGL";
import { drawOn2DContext } from "../components/webMG/Moorhen2DOverlay"
import { getMathJaxSVG } from '../utils/mathJaxUtils';
import { RootState } from "../store/MoorhenReduxStore";
import { Store } from "redux";

export interface ImageFrac2D {
    x: number
    y: number
    width: number
    height: number
    img: HTMLImageElement
    zIndex: number;
}

/** Frames per second requested from the canvas. */
const CAPTURE_FPS = 30;

/**
 * Bits spent per pixel per frame, from which the bitrate is derived.
 *
 * A fixed bitrate cannot suit both a small window and a 4K one: the same number is wasteful for
 * the first and blocky for the second. This is about right for VP8/VP9 on the kind of content
 * Moorhen draws - large areas of flat shading with sharp edges, which compresses well.
 *
 * It replaces a literal 25000000000 carrying the comment "2.5Mbps". That was ten thousand times
 * its stated intent; browsers clamp the request, so it had been harmless, but nobody reading it
 * could tell what was meant.
 */
const BITS_PER_PIXEL_PER_FRAME = 0.12;

const MIN_BITRATE = 2_000_000;
const MAX_BITRATE = 40_000_000;

/**
 * Container and codec, in order of preference, filtered by what the browser admits to.
 *
 * The recorder used to be constructed with no mimeType at all, so it encoded with whatever the
 * browser defaults to - VP8 or VP9 - while the resulting Blob was labelled h264. Nothing checked
 * that any of it was supported.
 */
const PREFERRED_MIME_TYPES = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4",
];

export class ScreenRecorder  {

    rec: MediaRecorder | null = null;
    chunks: Blob[];
    canvasRef: React.RefObject<HTMLCanvasElement>;
    glRef: React.RefObject<webGL.MGWebGL>;
    store: Store<RootState>;
    _isRecording: boolean;
    videoName = "moorhen_video";
    private recordedMimeType = "";

    constructor(glRef: React.RefObject<webGL.MGWebGL>, canvasRef:React.RefObject<HTMLCanvasElement>, store: Store<RootState>){
        this.glRef = glRef; // BUG FIX: assign glRef
        this.chunks = [];
        this.store = store;
        this.canvasRef = canvasRef
        this._isRecording = false;
    }

    /** The first preferred type this browser will actually record, or "" to let it choose. */
    private pickMimeType = (): string => {
        if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) return "";
        return PREFERRED_MIME_TYPES.find(type => MediaRecorder.isTypeSupported(type)) ?? "";
    }

    /** The file extension matching whatever was actually recorded. */
    private extensionForMimeType = (mimeType: string): string =>
        mimeType.startsWith("video/mp4") ? "mp4" : "webm";

    /**
     * Build a recorder around the canvas as it is now.
     *
     * Done per recording rather than once at construction. captureStream binds to the canvas at
     * the size it has when called, and the canvas is resized whenever the window is - so a
     * recorder built on mount was working from a stale track for every recording after the first
     * resize, which browsers handle anywhere between gracefully and a truncated file.
     *
     * Resizing *during* a recording is still not survivable: the track changes size underneath an
     * encoder that has already written a header. Only a resize between recordings is fixed here.
     */
    private createRecorder = (): MediaRecorder | null => {
        const canvas = this.canvasRef?.current;
        if (!canvas) {
            console.warn("Attempted to record the screen before the canvas existed...");
            return null;
        }

        const stream = canvas.captureStream(CAPTURE_FPS);
        const pixels = Math.max(1, canvas.width * canvas.height);
        const bitrate = Math.round(
            Math.min(MAX_BITRATE, Math.max(MIN_BITRATE, pixels * CAPTURE_FPS * BITS_PER_PIXEL_PER_FRAME)));

        // isTypeSupported saying yes does not guarantee the constructor will accept it at this
        // resolution and bitrate, so a refusal falls back to letting the browser choose rather
        // than failing the recording. Not doing that would be a regression: before any of this
        // negotiation existed, a recorder was always constructed.
        const mimeType = this.pickMimeType();
        const attempts: MediaRecorderOptions[] = mimeType
            ? [{ mimeType, videoBitsPerSecond: bitrate }, { videoBitsPerSecond: bitrate }, {}]
            : [{ videoBitsPerSecond: bitrate }, {}];

        for (const options of attempts) {
            try {
                const recorder = new MediaRecorder(stream, options);
                // What the browser settled on, which is not always what was asked for.
                this.recordedMimeType = recorder.mimeType || options.mimeType || "";
                return recorder;
            } catch (err) {
                console.warn("Video recorder rejected", options, err);
            }
        }

        console.warn("Could not start a video recorder for this canvas");
        return null;
    }

    stopRecording = () => {
        if (this._isRecording && this.rec) {
            this.rec.stop();
            this._isRecording = false;
        } else {
            console.warn('Attempted to stop screen recorder that was not recording...')
        }
    }

    loadLatexImage = async(latexObject) => {
        const mathJaxInfo = await getMathJaxSVG(latexObject.text)
        const wh_ratio = mathJaxInfo.whratio
        const img = new Image()
        const svg = mathJaxInfo.svg
        const svg_height = latexObject.height
        const blob = new Blob([svg], {type: 'image/svg+xml'})
        const blobUrl = URL.createObjectURL(blob)
        img.src = blobUrl
        img.crossOrigin = "Anonymous"
        const img_frac:ImageFrac2D = {x:latexObject.x,y:latexObject.y,img,width:svg_height*wh_ratio,height:svg_height,zIndex:latexObject.zIndex}
        return img_frac
    }

    loadImage = (url) => new Promise((resolve, reject) => {
        const img = new Image();
        img.addEventListener('load', () => resolve(img));
        img.addEventListener('error', (err) => reject(err));
        img.src = url;
    })

    isRecording = () => {
        return this._isRecording;
    }

    startRecording = () => {
        if (this._isRecording) {
            console.warn('Screen recording already taking place!')
            return
        }

        const recorder = this.createRecorder();
        if (!recorder) return;
        this.rec = recorder;

        this.chunks = [];
        this.rec.ondataavailable = (e) => {
            this.chunks.push(e.data);
        }
        // only when the recorder stops, we construct a complete Blob from all the chunks
        this.rec.onstop = () =>
            this.downloadVideo(new Blob(this.chunks, { type: this.recordedMimeType || undefined }));
        this._isRecording = true;
        this.rec.start();
    }

    setVideoName = (name: string) => {
        this.videoName = name;
    }

    /** So the popup can show the name the file will actually be given. */
    getVideoName = () => this.videoName;

    downloadVideo = async (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        let link: any = document.getElementById('download_video_link');
        if (!link) {
            link = document.createElement('a');
            link.id = 'download_video_link';
            document.body.appendChild(link);
        }
        link.download = `${this.videoName}.${this.extensionForMimeType(this.recordedMimeType)}`;
        link.href = url;
        link.click();
    }

    takeScreenShot = async(filename: string, doTransparentBackground: boolean = false) => {

        let target_w: number;
        let target_h: number;
        let target_xoff: number;
        let target_yoff: number;

        const saveCanvas = document.createElement("canvas");

        let imgData: ImageData;
        let pixels: Uint8Array;
        let ctx: CanvasRenderingContext2D;

        ctx = saveCanvas.getContext("2d");

        const isWebGL2 = this.store.getState().glRef.isWebGL2
        const canvasSize = this.store.getState().glRef.canvasSize
        const quat = this.store.getState().glRef.quat

        const canvasWidth = canvasSize[0]
        const canvasHeight = canvasSize[1]

        //Transparent backgound currently only works with WebGL2
        pixels = this.glRef.current.getPixelData(doTransparentBackground)

        if(!isWebGL2){

            saveCanvas.width = canvasWidth
            saveCanvas.height = canvasHeight

            imgData = ctx.createImageData(canvasWidth,canvasHeight);

            const data = imgData.data;
            for (let pixi = 0; pixi < canvasHeight; pixi++) {
                for (let pixj = 0; pixj < canvasWidth * 4; pixj++) {
                    data[(canvasHeight - pixi - 1) * canvasWidth * 4 + pixj] = pixels[pixi * canvasWidth * 4 + pixj];
                }
            }
        } else {

            const fbSize = this.store.getState().glRef.rttFramebufferSize
            const w = fbSize[0]
            const h = fbSize[1]

            const ratio = 1.0 * canvasWidth / canvasHeight;

            if(canvasWidth>canvasHeight){
                target_w = w;
                target_h = Math.floor(h / ratio);
                target_xoff = 0;
                target_yoff = Math.floor(0.5*h - 0.5 / ratio * h);
            } else {
                target_w = Math.floor(w * ratio);
                target_h = h;
                target_xoff = Math.floor(0.5*w - 0.5 * ratio * w);
                target_yoff = 0;
            }
            saveCanvas.width = target_w;
            saveCanvas.height = target_h;

            imgData = ctx.createImageData(saveCanvas.width,saveCanvas.height);

            const data = imgData.data;
            for (let pixi = 0; pixi < saveCanvas.height; pixi++) {
                for (let pixj = 0; pixj < saveCanvas.width * 4; pixj++) {
                    data[(saveCanvas.height - pixi - 1) * saveCanvas.width * 4 + pixj] = pixels[(pixi+target_yoff) * w * 4 + pixj+target_xoff*4];
                }
            }
        }

        ctx.putImageData(imgData, 0,0);
        const imageOverlays = this.store.getState().overlays.imageOverlayList
        const latexOverlays = this.store.getState().overlays.latexOverlayList

        const promises = []
        const imgFracs = []

        imageOverlays.forEach(img => {
            const p = this.loadImage(img.src)
            promises.push(p)
        })

        const loadLatexThings = async() => {
            for(let ilat=0;ilat<latexOverlays.length;ilat++){
               const p = await this.loadLatexImage(latexOverlays[ilat])
               imgFracs.push(p)
            }
        }
        await loadLatexThings()

        Promise.all(promises).then(images => {
            for(let i_img=0;i_img<images.length;i_img++){
                const img_frac = {x:imageOverlays[i_img].x,y:imageOverlays[i_img].y,img:images[i_img],width:imageOverlays[i_img].width,height:imageOverlays[i_img].height,zIndex:imageOverlays[i_img].zIndex}
                imgFracs.push(img_frac)
            }

            drawOn2DContext(ctx,saveCanvas.width,saveCanvas.height,saveCanvas.width/window.visualViewport.width,[],imgFracs,quat,0, this.store)
            drawOn2DContext(ctx,saveCanvas.width,saveCanvas.height,saveCanvas.width/window.visualViewport.width,[],imgFracs,quat,1, this.store)
            drawOn2DContext(ctx,saveCanvas.width,saveCanvas.height,saveCanvas.width/window.visualViewport.width,[],imgFracs,quat,2, this.store)
            drawOn2DContext(ctx,saveCanvas.width,saveCanvas.height,saveCanvas.width/window.visualViewport.width,[],imgFracs,quat,3, this.store)
            drawOn2DContext(ctx,saveCanvas.width,saveCanvas.height,saveCanvas.width/window.visualViewport.width,[],imgFracs,quat,4, this.store)

            let link: any = document.getElementById('download_image_link');
            if (!link) {
                link = document.createElement('a');
                link.id = 'download_image_link';
                document.body.appendChild(link);
            }
            link.download = filename;
            link.href = saveCanvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
            link.click();
        })
    }
}
