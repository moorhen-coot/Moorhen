/**
 * Playing a movie - to the screen, or to a file.
 *
 * Both are the same traversal of the same movie at two different clocks, and keeping that true is
 * what makes a preview worth trusting. previewMovie runs on the wall clock and draws whatever
 * frames it can; recordMovieToMp4 steps the clock by 1/fps and draws every one. Neither computes
 * a camera: the movie's sampler says where the camera is at a given second, the camera controller
 * is handed that second, and drawScene does the rest.
 *
 * WHY NOT THE EXISTING RECORDER
 *
 * File -> Record the screen uses canvas.captureStream(30) into a MediaRecorder, which samples the
 * canvas on the browser's own clock. Nothing says "this is frame 7". If a ribosome frame takes
 * 400ms, that frame occupies 400ms of the video, and a heavy scene produces a lurching file that
 * no amount of patience fixes. Here each frame is handed to the encoder with a timestamp chosen
 * in advance, so render time and playback time are unrelated. That is the whole point of having a
 * movie feature rather than a screen recorder, and it is the one thing MediaRecorder cannot do.
 *
 * KNOWN LIMITATIONS
 *
 * - Only the WebGL canvas is captured. The axes, scale bar and other 2D chrome live on separate
 *   overlay canvases stacked above it, which takeScreenShot composites by hand; this does not.
 * - Everything is held in memory until the end, so a long movie at a large output size will be
 *   unhappy. ArrayBufferTarget is the simplest target; StreamTarget exists for later.
 *
 * WHAT MEDIABUNNY TOOK OVER
 *
 * The first version drove WebCodecs directly: a VideoEncoder, a VideoFrame per frame with an
 * explicit microsecond timestamp, manual close() to release GPU memory, a loop watching
 * encodeQueueSize for backpressure, and mp4-muxer to assemble the file. Mediabunny's CanvasSource
 * does all of that behind one call - `add(timestampInSeconds, durationInSeconds)`, whose returned
 * promise is the backpressure signal. Timestamps are seconds here, not microseconds.
 *
 * What is lost is the explicit codec string: mediabunny takes 'avc' and chooses the profile and
 * level itself. That matters because Chrome refused H.264 Main and Baseline at 2826 pixels wide
 * while accepting High - a level ceiling, not a missing codec - so onEncoderConfig is logged below
 * to show what it actually picked.
 */

import { BufferTarget, CanvasSource, Mp4OutputFormat, Output, VideoCodec, canEncodeVideo } from "mediabunny";
import { Movie, MovieSample, movieDuration } from "./cameraPath";
import { holdCameraForMovie } from "./movieCamera";
import { DEFAULT_QUALITY, bitrateFor } from "./videoBitrate";
import type { VideoQuality } from "./videoBitrate";
import type { webGL } from "../types/mgWebGL";

export interface MovieRenderOptions {
    /**
     * Called with each sampled frame, for everything that is not the camera. The export runs on
     * a fixed cadence rather than the wall clock, so this is called once per encoded frame - which
     * is what makes a fade land on exactly the frames it was authored for.
     */
    onSample?: (sample: MovieSample) => void;
    /** Frames per second of the finished file. */
    fps?: number;
    /** How many frames to render. The default is one degree per frame, so a full turn. */
    frames?: number;
    /** Degrees of rotation per frame. */
    degreesPerFrame?: number;
    /**
     * Encoder bitrate in bits per second. Given explicitly it is used as it stands; otherwise it
     * is derived from `quality` and the frame, which is almost always what you want - see
     * videoBitrate for why a flat number cannot suit both a window and a 4K render.
     */
    bitrate?: number;
    /** Which preset to derive the bitrate from, when `bitrate` is not given. */
    quality?: VideoQuality;
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

export interface MovieRenderResult {
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
    fps = DEFAULTS.fps,
    // The same frame-derived rate the export itself would ask for, so a probe answers the question
    // that is actually going to be asked rather than one about some other bitrate.
    bitrate = bitrateFor(DEFAULT_QUALITY, width, height, fps),
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
 * Render a movie at a fixed cadence and encode it.
 *
 * Timestamps are chosen rather than observed, and the drawing buffer is sized to the output, so
 * the file's timing is the movie's own rather than whatever the machine managed while rendering.
 * That is the whole difference between an export and a screen recording.
 */
export async function recordMovieToMp4(
    glRef: React.RefObject<webGL.MGWebGL>,
    movie: Movie,
    options: MovieRenderOptions = {},
): Promise<MovieRenderResult> {

    const { fps, codec } = { ...DEFAULTS, ...options };

    const gl = glRef?.current;
    if (!gl) throw new Error("No WebGL component to record from");
    if (!webCodecsAvailable()) throw new Error("WebCodecs is not available in this browser");

    const canvas = gl.getCanvasRef()?.current;
    if (!canvas) throw new Error("No canvas to record from");

    const width = evenDown(options.width ?? canvas.width);
    const height = evenDown(options.height ?? canvas.height);
    const resizing = options.width !== undefined || options.height !== undefined;

    const frames = Math.max(1, Math.round(movieDuration(movie) * fps));

    // Derived from the frame unless the caller insisted on a number. This used to be a flat
    // 12 Mbps whatever the output size, which is about half of "medium" at 1080p and a third of
    // "low" at 4K - so asking the Output panel for 4K produced a visibly broken-up file with
    // nothing to say why.
    const bitrate = options.bitrate
        ?? bitrateFor(options.quality ?? DEFAULT_QUALITY, width, height, fps);

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
        onEncoderConfig: config => console.log("[movie] encoder config", config),
    });
    output.addVideoTrack(source);
    await output.start();

    // The camera is borrowed for the duration and handed back as it was, with the slab policy put
    // in manual so the movie's own clip and fog survive. See movieCamera.
    const hold = holdCameraForMovie(gl);
    hold.play(movie, options.onSample);
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
    options: {
        onProgress?: (seconds: number, total: number) => void;
        /**
         * Put the view back where it was when the preview started.
         *
         * True for a preview button, whose whole contract is "show me this and give me my view
         * back". False when the playing *is* the work - a movie panel, where landing on the last
         * keyframe is the point, and being yanked back to wherever Play was pressed looks like
         * the movie undoing itself.
         */
        restoreView?: boolean;
        /**
         * Called with each sampled frame, for everything that is not the camera - the object
         * fades, and in time the scene's quantities.
         *
         * The player does not know what a fade is, deliberately: it hands over the sample and the
         * caller decides what in the scene it describes.
         */
        onSample?: (sample: MovieSample) => void;
    } = {},
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
    const hold = holdCameraForMovie(gl, options.restoreView ?? true);
    hold.play(movie, options.onSample);

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
export const downloadMovie = (blob: Blob, filename = "moorhen_movie.mp4") => {
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
