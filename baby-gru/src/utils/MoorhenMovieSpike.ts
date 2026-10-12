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
import { CameraSample, Movie, movieDuration, sampleMovie } from "./cameraPath";
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

    // Put the view back exactly as it was, however this ends.
    const originalQuat = quat4.clone(gl.myQuat);
    const step = createYQuatFromDY(degreesPerFrame);
    let finalised = false;
    const cover = showCover("Rendering spin", options.coverOpacity ?? 1);

    try {
        const frameDuration = 1 / fps;

        for (let i = 0; i < frames; i++) {
            gl.animating = true;   // see applyCamera: keeps the reconciling effect out of the way
            quat4.multiply(gl.myQuat, gl.myQuat, step);
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
        quat4.copy(gl.myQuat, originalQuat);
        gl.animating = false;
        gl.drawScene();
        // After the restoring draw, so the cover never lifts on a frame from the movie.
        cover.remove();
        // An output left started holds its encoder and its buffers; cancel releases them.
        if (!finalised) await output.cancel().catch(() => { /* already failing; do not mask it */ });
    }
}

/**
 * Put a sampled camera onto the renderer.
 *
 * These are the fields the existing animation drivers in cameraAnimations.ts write directly, so a
 * movie frame sets them the same way. Clip and fog go through their setters because those store
 * absolute distances from the eye and have their own arithmetic.
 */
const applyCamera = (gl: webGL.MGWebGL, sample: CameraSample) => {
    // Claim the camera.
    //
    // MoorhenWebMG has an effect on [zoom, quat, originState] that keeps the renderer agreeing
    // with the store, closing any gap with setOriginOrientationAndZoomAnimated. Writing the camera
    // directly, as a movie must, opens exactly such a gap - and the resulting animation ends by
    // calling handleOriginUpdated, which pushes the renderer's origin back into the store, which
    // re-runs the effect, which finds we have moved on again. Fifteen frames each, back to back,
    // for as long as the movie lasts, with its interpolated camera interleaved with ours.
    //
    // That entry point already declines to start while `animating` is set, so saying so is enough.
    // It is re-asserted every frame because an animation already in flight clears it on the way
    // out, which would otherwise let the next one in.
    gl.animating = true;

    quat4.copy(gl.myQuat, sample.quat);
    gl.origin = [...sample.origin] as [number, number, number];
    gl.zoom = sample.zoom;
    gl.set_clip_range(-sample.clipStart, sample.clipEnd);
    gl.set_fog_range(sample.fogStart, sample.fogEnd);
};

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

    // The view is borrowed for the duration and handed back as it was.
    const originalQuat = quat4.clone(gl.myQuat);
    const originalOrigin = [...gl.origin] as [number, number, number];
    const originalZoom = gl.zoom;
    let finalised = false;
    const cover = showCover("Rendering movie", options.coverOpacity ?? 1);

    try {
        const frameDuration = 1 / fps;
        for (let i = 0; i < frames; i++) {
            applyCamera(gl, sampleMovie(movie, i * frameDuration));
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
        quat4.copy(gl.myQuat, originalQuat);
        gl.origin = originalOrigin;
        gl.zoom = originalZoom;
        gl.animating = false;
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

    // The view is borrowed and handed back, as the export does.
    const originalQuat = quat4.clone(gl.myQuat);
    const originalOrigin = [...gl.origin] as [number, number, number];
    const originalZoom = gl.zoom;

    let drawnFrames = 0;
    let request = 0;
    let settle: (result: { drawnFrames: number; elapsedSeconds: number; stopped: boolean }) => void;
    const finished = new Promise<{ drawnFrames: number; elapsedSeconds: number; stopped: boolean }>(
        resolve => { settle = resolve; });

    const restore = () => {
        writingOurselves = true;
        quat4.copy(gl.myQuat, originalQuat);
        gl.origin = originalOrigin;
        gl.zoom = originalZoom;
        writingOurselves = false;
        // Hand the camera back before drawing, so the store and the renderer agree again and
        // MoorhenWebMG's reconciling effect has nothing to correct.
        gl.animating = false;
        gl.drawScene();
    };

    let done = false;
    const end = (stopped: boolean) => {
        if (done) return;
        done = true;
        if (request) cancelAnimationFrame(request);
        unshadow();
        console.log(`[movie spike] preview drew ${drawnFrames} frames; the camera was changed by `
            + `something else between ${interference} of them${firstInterference ? ` (first: ${firstInterference})` : ""}`);
        restore();
        settle({ drawnFrames, elapsedSeconds: (performance.now() - startedAt) / 1000, stopped });
    };

    // Diagnostic: did anything move the camera between our frames?
    //
    // A preview that bounces while the exported file is smooth means the frames we draw are right
    // and something else is drawing in between with a different camera. Comparing what we left
    // behind against what we find says so, but not who did it - so for the duration of a preview
    // the zoom accessor is shadowed with one that logs a stack trace whenever it is written by
    // anyone other than us. The shadow is an own property, so deleting it uncovers the prototype's
    // accessor again and leaves no trace.
    let appliedZoom: number | null = null;
    let interference = 0;
    let firstInterference = "";

    let writingOurselves = false;
    let foreignWrites = 0;
    const accessor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(gl), "zoom");
    if (accessor?.get && accessor?.set) {
        Object.defineProperty(gl, "zoom", {
            configurable: true,
            get: () => accessor.get.call(gl),
            set: (value: number) => {
                if (!writingOurselves && foreignWrites < 3) {
                    foreignWrites++;
                    console.log(`[movie spike] zoom set to ${value} by something else:\n`
                        + new Error().stack);
                }
                accessor.set.call(gl, value);
            },
        });
    }
    const unshadow = () => {
        if (accessor?.get && accessor?.set) delete (gl as unknown as Record<string, unknown>).zoom;
    };

    const tick = () => {
        if (done) return;

        if (appliedZoom !== null && Math.abs(gl.zoom - appliedZoom) > 1e-9) {
            interference++;
            if (!firstInterference) {
                firstInterference = `left zoom ${appliedZoom.toFixed(4)}, found ${gl.zoom.toFixed(4)}`;
            }
        }

        const elapsed = (performance.now() - startedAt) / 1000;
        // Where the camera should be at this instant, not at the next frame in sequence. That is
        // what makes it drop frames rather than fall behind.
        const sample = sampleMovie(movie, Math.min(elapsed, total));
        writingOurselves = true;
        applyCamera(gl, sample);
        writingOurselves = false;
        appliedZoom = sample.zoom;
        gl.drawScene();
        drawnFrames++;
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
