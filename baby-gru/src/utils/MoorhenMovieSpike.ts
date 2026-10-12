/**
 * SPIKE - fixed-cadence MP4 export, to find out whether authored-timing video works in the browser.
 *
 * Not a feature. It exists to answer one question on real machines: can WebCodecs encode Moorhen's
 * canvas into a smooth MP4 whose frames are spaced exactly 1/fps apart, however long each frame
 * took to render?
 *
 * WHY THIS IS NOT HOW THE EXISTING RECORDER WORKS
 *
 * File -> Record a video uses canvas.captureStream(30) into a MediaRecorder, which samples the
 * canvas on the browser's own clock. Nothing says "this is frame 7". If a ribosome frame takes
 * 400ms, that frame occupies 400ms of the video. Here each frame is handed to the encoder with a
 * timestamp we choose, so render time and playback time are unrelated - which is the whole point
 * of a movie feature and the thing MediaRecorder cannot do at all.
 *
 * KNOWN LIMITATIONS OF THE SPIKE
 *
 * - Only the WebGL canvas is captured. The axes, scale bar and other 2D chrome live on separate
 *   overlay canvases stacked above it, and takeScreenShot composites them by hand. A real feature
 *   would have to do the same; this deliberately does not, to keep the question narrow.
 * - Everything is held in memory until the end, so a long movie at a large canvas size will be
 *   unhappy. ArrayBufferTarget is the simplest target; StreamTarget exists for later.
 * WHAT MEDIABUNNY TOOK OVER
 *
 * The first version of this drove WebCodecs directly: a VideoEncoder, a VideoFrame per frame with
 * an explicit microsecond timestamp, manual close() to release GPU memory, a loop watching
 * encodeQueueSize for backpressure, and mp4-muxer to assemble the file. Mediabunny's CanvasSource
 * does all of that behind one call - `add(timestampInSeconds, durationInSeconds)`, whose returned
 * promise is the backpressure signal. Timestamps are seconds here, not microseconds.
 *
 * What is lost is the explicit codec string: mediabunny takes 'avc' and chooses the profile and
 * level itself. That matters because Chrome refused H.264 Main and Baseline at 2826 pixels wide
 * while accepting High - a level ceiling, not a missing codec - so onEncoderConfig is logged below
 * to show what it actually picked.
 */

import * as quat4 from "gl-matrix/quat";
import { BufferTarget, CanvasSource, Mp4OutputFormat, Output, VideoCodec, canEncodeVideo } from "mediabunny";
import { createYQuatFromDY } from "../WebGLgComponents/quatUtils";
import type { webGL } from "../types/mgWebGL";

export interface SpinMovieOptions {
    /** Frames per second of the finished file. */
    fps?: number;
    /** How many frames to render. The default is one degree per frame, so a full turn. */
    frames?: number;
    /** Degrees of rotation per frame. */
    degreesPerFrame?: number;
    /** Encoder bitrate in bits per second. */
    bitrate?: number;
    /**
     * Which codec family to encode with. 'avc' is H.264, which is the only one supported on every
     * browser tested so far - Safari refuses av1 - and the only one that plays in PowerPoint.
     */
    codec?: VideoCodec;
    /**
     * Output size. Defaults to the canvas, which is whatever size the window happens to be.
     *
     * Setting it makes the movie independent of the window, which is what a real feature wants:
     * nobody should get a different resolution because they had their browser arranged
     * differently. Mediabunny scales the frames, so asking for more pixels than the canvas has
     * will not invent detail - rendering offscreen at the target size would, and is the better
     * answer eventually.
     */
    width?: number;
    height?: number;
    /** Called after each frame, for a progress bar or a console log. */
    onProgress?: (framesDone: number, framesTotal: number) => void;
}

export interface SpinMovieResult {
    blob: Blob;
    width: number;
    height: number;
    frames: number;
    fps: number;
    codec: string;
    /** Wall-clock seconds the whole export took, which is not the length of the movie. */
    elapsedSeconds: number;
}

const DEFAULTS = {
    fps: 30,
    frames: 360,
    degreesPerFrame: 1,
    bitrate: 12_000_000,
    codec: "avc" as VideoCodec,
};

/**
 * H.264 encodes in 16x16 macroblocks and encoders commonly refuse odd dimensions outright.
 * A Moorhen canvas is whatever the window happens to be, so the frame is cropped rather than
 * scaled - losing at most one row and one column, which is invisible and keeps it sharp.
 */
const evenDown = (value: number): number => Math.max(2, value - (value % 2));

export const webCodecsAvailable = (): boolean => typeof VideoEncoder !== "undefined";

/**
 * Whether this machine will encode at this size.
 *
 * Worth calling before anything else: support depends on the hardware encoder and the OS, not just
 * the browser, so a compatibility table cannot answer it and neither can I.
 */
export const describeEncoderSupport = async (
    width: number, height: number, codec: VideoCodec = DEFAULTS.codec,
    fps = DEFAULTS.fps, bitrate = DEFAULTS.bitrate,
): Promise<{ supported: boolean; detail: string }> => {
    if (!webCodecsAvailable()) return { supported: false, detail: "WebCodecs is not available in this browser" };
    try {
        const supported = await canEncodeVideo(codec, {
            width: evenDown(width), height: evenDown(height), bitrate, frameRate: fps,
        });
        return {
            supported,
            detail: `${codec} ${evenDown(width)}x${evenDown(height)} @${fps} ${(bitrate / 1e6).toFixed(1)}Mbps -> ${supported ? "supported" : "not supported"}`,
        };
    } catch (err) {
        return { supported: false, detail: `${codec}: canEncodeVideo threw: ${err}` };
    }
};

/**
 * Render a spin and encode it at a fixed cadence.
 *
 * The orientation is restored afterwards, so running this leaves the view where it found it.
 */
export async function recordSpinToMp4(
    glRef: React.RefObject<webGL.MGWebGL>,
    options: SpinMovieOptions = {},
): Promise<SpinMovieResult> {

    const { fps, frames, degreesPerFrame, bitrate, codec } = { ...DEFAULTS, ...options };

    const gl = glRef?.current;
    if (!gl) throw new Error("No WebGL component to record from");
    if (!webCodecsAvailable()) throw new Error("WebCodecs VideoEncoder is not available in this browser");

    const canvas = gl.getCanvasRef()?.current;
    if (!canvas) throw new Error("No canvas to record from");

    // A canvas is whatever size the window is, and H.264 encoders commonly refuse odd dimensions.
    const width = evenDown(options.width ?? canvas.width);
    const height = evenDown(options.height ?? canvas.height);

    // Asking for a size renders at that size by changing the drawing buffer, leaving the canvas
    // the same size on the page. Scaling window-shaped frames instead would have to letterbox,
    // crop or distort, none of which preserves what was composed.
    //
    // The first attempt at this rendered into the render-to-texture buffer and read the pixels
    // back. It worked and was ten times slower - 3.1 frames per second against 32.7 - because that
    // buffer is multisampled at the hardware maximum, getPixelData draws the scene twice, and the
    // pixels went GPU to CPU and back again to be encoded. Resizing the drawing buffer has none of
    // those costs: one draw, no read back, and frames captured straight off the canvas.
    const resizing = options.width !== undefined || options.height !== undefined;

    const support = await describeEncoderSupport(width, height, codec, fps, bitrate);
    if (!support.supported) throw new Error(`This machine will not encode that: ${support.detail}`);

    const started = performance.now();

    const output = new Output({
        // Metadata at the front so the file plays without being fully fetched. 'in-memory' keeps
        // every chunk until finalize, which is fine for a short movie and is the thing to revisit
        // first when a long one runs out of memory - 'fragmented' streams instead.
        format: new Mp4OutputFormat({ fastStart: "in-memory" }),
        target: new BufferTarget(),
    });

    // The drawing buffer has to be the output size before the source is created: mediabunny takes
    // the frame dimensions from the canvas, and a later change would be a size change mid-track.
    const originalBufferWidth = canvas.width;
    const originalBufferHeight = canvas.height;
    if (resizing) gl.setDrawingBufferSize(width, height);

    const source = new CanvasSource(canvas, {
        codec,
        bitrate,
        // One key frame a second: enough for scrubbing without inflating the file.
        keyFrameInterval: 1,
        // Mediabunny picks the profile and level itself, and that choice is what differs between
        // machines, so say which one it made.
        onEncoderConfig: config => console.log("[movie spike] encoder config", config),
    });
    output.addVideoTrack(source);
    await output.start();

    // Put the view back exactly as it was, however this ends.
    const originalQuat = quat4.clone(gl.myQuat);
    const step = createYQuatFromDY(degreesPerFrame);
    let finalised = false;

    try {
        const frameDuration = 1 / fps;

        for (let i = 0; i < frames; i++) {
            quat4.multiply(gl.myQuat, gl.myQuat, step);
            gl.drawScene();

            // Must be the same task as the draw: the context is created without
            // preserveDrawingBuffer, so the drawing buffer is cleared the moment we yield to the
            // browser. CanvasSource.add captures synchronously before its promise settles, which
            // is why awaiting it afterwards is safe.
            //
            // Timestamps are seconds, and they are the whole point: frame i sits at i/fps however
            // long it took to render.
            await source.add(i * frameDuration, frameDuration);

            options.onProgress?.(i + 1, frames);
        }

        await output.finalize();
        finalised = true;

        return {
            blob: new Blob([output.target.buffer], { type: "video/mp4" }),
            width, height, frames, fps, codec,
            elapsedSeconds: (performance.now() - started) / 1000,
        };
    } finally {
        // Back to the window's own resolution before anything else draws.
        if (resizing) gl.setDrawingBufferSize(originalBufferWidth, originalBufferHeight);
        quat4.copy(gl.myQuat, originalQuat);
        gl.drawScene();
        // An output left started holds its encoder and its buffers; cancel releases them.
        if (!finalised) await output.cancel().catch(() => { /* already failing; do not mask it */ });
    }
}

/** Hand the finished file to the browser's downloader. */
export const downloadMovie = (blob: Blob, filename = "moorhen_spin.mp4") => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = filename;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    link.remove();
    // The blob can be large; do not keep it alive once the download has started.
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
};
