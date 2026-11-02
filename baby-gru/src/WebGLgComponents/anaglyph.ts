/**
 * Anaglyph stereo: the two eyes' pictures in one, each in its own colour channels, for glasses
 * with a filter of each colour. Shared by both renderers and the preferences.
 *
 * Each eye's picture is grey, and goes into the channels its filter passes; a channel neither
 * eye has keeps the background. So through each filter one eye's picture shows, on the
 * background, and the other's does not. The left eye is the first of MGWebGL's stereoQuats (as
 * side-by-side stereo's left view), the one WebGL has always drawn red.
 */

/** The pairs of colours, left eye first. */
export type AnaglyphColours = "red-green" | "red-cyan" | "red-blue" | "green-magenta";

/** Red and green: what WebGL has always drawn. */
export const DEFAULT_ANAGLYPH_COLOURS: AnaglyphColours = "red-green";

/** Which of red, green and blue each eye's picture goes into. */
export interface AnaglyphChannels {
    label: string;
    left: [boolean, boolean, boolean];
    right: [boolean, boolean, boolean];
}

export const ANAGLYPH_COLOURS: Record<AnaglyphColours, AnaglyphChannels> = {
    "red-green": { label: "Red and green", left: [true, false, false], right: [false, true, false] },
    "red-cyan": { label: "Red and cyan", left: [true, false, false], right: [false, true, true] },
    "red-blue": { label: "Red and blue", left: [true, false, false], right: [false, false, true] },
    "green-magenta": { label: "Green and magenta", left: [false, true, false], right: [true, false, true] },
};

/** The channels for a setting, red and green for anything not known. */
export function anaglyphChannels(colours: string | undefined | null): AnaglyphChannels {
    return ANAGLYPH_COLOURS[colours as AnaglyphColours] ?? ANAGLYPH_COLOURS[DEFAULT_ANAGLYPH_COLOURS];
}
