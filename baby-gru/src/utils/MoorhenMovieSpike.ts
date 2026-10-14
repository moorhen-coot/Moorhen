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
import { MovieSample, Movie, movieDuration, sampleMovie } from "./cameraPath";
import { holdCameraForMovie } from "./movieCamera";
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
    /**
     * How opaque the panel covering the page is while rendering, 0 to 1.
     *
     * Solid by default. Lowering it is for judging whether the live canvas behaves itself during
     * an export - it used to lurch, because the camera was being fought over, and seeing that is
     * the only way to tell whether it still does.
     */
    coverOpacity?: number;
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

    // The camera is held for the duration and handed back however this ends.
    const hold = holdCameraForMovie(gl);
    // A plain spin rather than a sampled Movie, so this turns the quaternion itself and hands each
    // result to the camera. Its own copy, because the camera's array is the camera's.
    const spinning = quat4.clone(gl.cameraController.state.quat as unknown as quat4.quat);
    const step = createYQuatFromDY(degreesPerFrame);
    let finalised = false;
    const cover = showCover("Rendering spin", options.coverOpacity ?? 1);

    try {
        const frameDuration = 1 / fps;

        for (let i = 0; i < frames; i++) {
            quat4.multiply(spinning, spinning, step);
            hold.set({ quat: [spinning[0], spinning[1], spinning[2], spinning[3]] });
            gl.drawScene();
            cover.update(i + 1, frames);

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
        hold.release();
        gl.drawScene();
        // After the restoring draw, so the cover never lifts on a frame from the movie.
        cover.remove();
        // An output left started holds its encoder and its buffers; cancel releases them.
        if (!finalised) await output.cancel().catch(() => { /* already failing; do not mask it */ });
    }
}


/**
 * Render a movie at a fixed cadence and encode it.
 *
 * The same machinery as the spin export, but the camera for each frame comes from sampleMovie
 * rather than from a rotation applied to a held view. Everything that made the spin work -
 * timestamps chosen rather than observed, the drawing buffer sized to the output - applies here
 * unchanged, which is the point of having kept them separate.
 */
export async function recordMovieToMp4(
    glRef: React.RefObject<webGL.MGWebGL>,
    movie: Movie,
    options: SpinMovieOptions = {},
): Promise<SpinMovieResult> {

    const { fps, bitrate, codec } = { ...DEFAULTS, ...options };

    const gl = glRef?.current;
    if (!gl) throw new Error("No WebGL component to record from");
    if (!webCodecsAvailable()) throw new Error("WebCodecs is not available in this browser");

    const canvas = gl.getCanvasRef()?.current;
    if (!canvas) throw new Error("No canvas to record from");

    const width = evenDown(options.width ?? canvas.width);
    const height = evenDown(options.height ?? canvas.height);
    const resizing = options.width !== undefined || options.height !== undefined;

    const frames = Math.max(1, Math.round(movieDuration(movie) * fps));

    const support = await describeEncoderSupport(width, height, codec, fps, bitrate);
    if (!support.supported) throw new Error(`This machine will not encode that: ${support.detail}`);

    const started = performance.now();

    const originalBufferWidth = canvas.width;
    const originalBufferHeight = canvas.height;
    if (resizing) gl.setDrawingBufferSize(width, height);

    const output = new Output({
        format: new Mp4OutputFormat({ fastStart: "in-memory" }),
        target: new BufferTarget(),
    });
    const source = new CanvasSource(canvas, {
        codec,
        bitrate,
        keyFrameInterval: 1,
        onEncoderConfig: config => console.log("[movie spike] encoder config", config),
    });
    output.addVideoTrack(source);
    await output.start();

    // The camera is borrowed for the duration and handed back as it was, with the slab policy put
    // in manual so the movie's own clip and fog survive. See movieCamera.
    const hold = holdCameraForMovie(gl);
    hold.play(movie);
    let finalised = false;
    const cover = showCover("Rendering movie", options.coverOpacity ?? 1);

    try {
        const frameDuration = 1 / fps;
        for (let i = 0; i < frames; i++) {
            // The camera reads this rather than the wall clock, so every frame is kept and the
            // file runs at its authored speed however long rendering took. drawScene advances the
            // camera to it; nothing here touches myQuat, origin or zoom.
            gl.cameraTime = i * frameDuration;
            gl.drawScene();
            await source.add(i * frameDuration, frameDuration);
            cover.update(i + 1, frames);
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
        if (resizing) gl.setDrawingBufferSize(originalBufferWidth, originalBufferHeight);
        // Back to the wall clock before the camera is handed back, or the restoring draw would
        // advance it to the last frame's time instead of now.
        gl.cameraTime = null;
        hold.release();
        gl.drawScene();
        // After the restoring draw, so the cover never lifts on a frame from the movie.
        cover.remove();
        if (!finalised) await output.cancel().catch(() => { /* already failing; do not mask it */ });
    }
}

/**
 * Cover the page while a movie renders.
 *
 * The frames have to be drawn to the visible canvas - that is what makes capture free, and reading
 * back from an off-screen buffer instead measured ten times slower - so during an export the
 * canvas shows the movie's camera lurching about at whatever rate the encoder allows. It is
 * accurate and deeply unsettling to watch.
 *
 * Covering it is the usual answer, and costs nothing: the canvas carries on rendering underneath,
 * and CanvasSource reads the drawing buffer rather than the composited page, so nothing about the
 * capture is affected by what is drawn on top.
 */
const showCover = (title: string, opacity = 1): { update: (done: number, total: number) => void; remove: () => void } => {
    // Fully opaque, not nearly: at 96% the camera still showed through as a flicker, which is
    // worse than either hiding it or not. Matched to the system colour scheme so it does not
    // flash white over a dark setup.
    const dark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;
    const background = dark ? `rgba(27,27,27,${opacity})` : `rgba(247,247,247,${opacity})`;
    const ink = dark ? "#e8e8e8" : "#303030";

    const cover = document.createElement("div");
    cover.style.cssText = [
        "position:fixed", "inset:0", "z-index:2147483646",
        "display:flex", "flex-direction:column", "gap:1rem",
        "align-items:center", "justify-content:center",
        `background:${background}`, `color:${ink}`,
        "font:500 1.05rem/1.6 system-ui,sans-serif", "text-align:center",
        // The canvas underneath is still being drawn to and must keep receiving no interaction.
        "cursor:progress", "user-select:none",
    ].join(";");

    const heading = document.createElement("div");
    heading.textContent = title;

    const track = document.createElement("div");
    track.style.cssText = `width:min(26rem,60vw);height:0.4rem;border-radius:0.2rem;background:${dark ? "#333" : "#e0e0e0"}`;
    const bar = document.createElement("div");
    bar.style.cssText = "width:0%;height:100%;border-radius:0.2rem;background:#6c63ff;transition:width 0.1s linear";
    track.appendChild(bar);

    const detail = document.createElement("div");
    detail.style.cssText = `font-size:0.85rem;opacity:0.7`;

    cover.append(heading, track, detail);
    document.body.appendChild(cover);

    return {
        update: (done, total) => {
            bar.style.width = `${total > 0 ? (done / total) * 100 : 0}%`;
            detail.textContent = `frame ${done} of ${total}`;
        },
        remove: () => cover.remove(),
    };
};

export interface PreviewHandle {
    /** Stop early. Safe to call after it has finished by itself. */
    stop: () => void;
    /** Resolves when the movie ends or is stopped, with what actually got drawn. */
    finished: Promise<{ drawnFrames: number; elapsedSeconds: number; stopped: boolean }>;
}

/**
 * Play a movie on screen, in real time.
 *
 * The opposite trade from the export, and deliberately so. Export keeps every frame and ignores
 * the clock: frame i is stamped at i/fps however long it took to draw, so the file is smooth even
 * when rendering is slower than playback. Preview keeps the clock and drops frames: it asks where
 * the camera should be *now* and draws that, so a scene too heavy to render at speed looks
 * stuttery - which is honest, because it tells you about your machine rather than about the movie.
 *
 * The two disagreeing is the point. Preview answers "does this look right"; export answers "is
 * every frame there".
 *
 * Driven by requestAnimationFrame so the browser's refresh sets the pace. There is no cover here,
 * for the obvious reason.
 */
export function previewMovie(
    glRef: React.RefObject<webGL.MGWebGL>,
    movie: Movie,
    options: { onProgress?: (seconds: number, total: number) => void } = {},
): PreviewHandle {

    const gl = glRef?.current;
    if (!gl) throw new Error("No WebGL component to preview in");

    const total = movieDuration(movie);
    const startedAt = performance.now();

    // The camera is held for the duration, which is what used to need a flag and a diagnostic.
    //
    // A long-standing puzzle lived here: the preview bounced in and out while the exported file of
    // the same movie was perfectly smooth. The cause was that nothing owned the camera, so a store
    // effect could centre it between our frames; the apparatus that found it - a shadowed `zoom`
    // accessor logging stack traces on foreign writes, and a count of frames where the camera had
    // moved behind our back - is gone, because a driver makes the thing it was looking for
    // impossible rather than merely unlikely. Reconciliation now defers, by construction.
    const hold = holdCameraForMovie(gl);
    hold.play(movie);

    let drawnFrames = 0;
    let request = 0;
    let settle: (result: { drawnFrames: number; elapsedSeconds: number; stopped: boolean }) => void;
    const finished = new Promise<{ drawnFrames: number; elapsedSeconds: number; stopped: boolean }>(
        resolve => { settle = resolve; });

    let done = false;
    const end = (stopped: boolean) => {
        if (done) return;
        done = true;
        if (request) cancelAnimationFrame(request);
        hold.release();
        gl.drawScene();
        settle({ drawnFrames, elapsedSeconds: (performance.now() - startedAt) / 1000, stopped });
    };

    const tick = () => {
        if (done) return;

        // No camera arithmetic here at all. drawScene advances the camera to the wall clock, the
        // movie's sampler says where that is, and this loop only decides when to draw - which is
        // the whole difference between preview and export.
        gl.drawScene();
        drawnFrames++;

        const elapsed = (performance.now() - startedAt) / 1000;
        options.onProgress?.(Math.min(elapsed, total), total);

        if (elapsed >= total) end(false);
        else request = requestAnimationFrame(tick);
    };

    request = requestAnimationFrame(tick);

    return { stop: () => end(true), finished };
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
