/**
 * How many bits a second of video gets, for both of the ways Moorhen makes one.
 *
 * There are two: "Record the screen" captures the canvas live through MediaRecorder, and the movie
 * panel renders an authored camera path through WebCodecs. They are different tools and should
 * stay different, but a bitrate is a bitrate - the picture breaking up looks the same whichever
 * made it - so the numbers live here rather than twice.
 *
 * WHY IT SCALES WITH THE FRAME
 *
 * A fixed bitrate cannot suit both a small window and a 4K one: the same number is wasteful for
 * the first and blocky for the second. The movie export had exactly that bug - a flat 12 Mbps
 * whatever the output size - while its own Output panel invites you to type 3840x2160, which
 * works out at 0.048 bits per pixel per frame, a third of what `low` spends.
 */

/** The three presets offered in the UI. Ordered from smallest file to best picture. */
export type VideoQuality = "low" | "medium" | "high";

/**
 * Bits spent per pixel per frame for each preset, from which the bitrate is derived.
 *
 * Moorhen's thin bonds and map mesh are the first thing to break up when bits run short, and
 * Firefox's realtime VP8 encoder needs noticeably more than Chrome's for the same result. At 1080p
 * and 30fps these come to roughly 9, 25 and 62 Mbps. VP9 and H.264 encoders spend only what the
 * content needs, so they often stay well below the request - a still scene costs almost nothing.
 */
export const BITS_PER_PIXEL_PER_FRAME: Record<VideoQuality, number> = {
    low: 0.15,
    medium: 0.4,
    high: 1.0,
};

/** Below this, even a small still frame looks poor. */
export const MIN_BITRATE = 4_000_000;

/** Keeps a 4K frame on "high" (~250 Mbps uncapped) to a file size people can still handle. */
export const MAX_BITRATE = 160_000_000;

/** What a movie that says nothing about quality gets. */
export const DEFAULT_QUALITY: VideoQuality = "medium";

/**
 * The bitrate to ask an encoder for, in bits per second.
 *
 * Clamped at both ends, so a tiny preview window still gets something watchable and a 4K "high"
 * does not produce a file nobody can send. A frame with no area yet - a canvas before layout - is
 * given the minimum rather than zero, which some encoders reject outright.
 */
export function bitrateFor(
    quality: VideoQuality, width: number, height: number, fps: number,
): number {
    const perFrame = BITS_PER_PIXEL_PER_FRAME[quality] ?? BITS_PER_PIXEL_PER_FRAME[DEFAULT_QUALITY];
    const pixels = Math.max(1, (width > 0 ? width : 0) * (height > 0 ? height : 0));
    const rate = pixels * (fps > 0 ? fps : 0) * perFrame;
    return Math.round(Math.min(MAX_BITRATE, Math.max(MIN_BITRATE, rate)));
}
