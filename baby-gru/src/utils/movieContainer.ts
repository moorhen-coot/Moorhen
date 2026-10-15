/**
 * A movie as a file.
 *
 * A movie is a description of how a scene should move, which is worthless without the scene. Save
 * only the description and reopening it a month later gives a camera path through nothing; save a
 * screen recording and the movie can never be edited again. So the file carries both: the movie
 * document, and the session it was authored against.
 *
 * WHY A ZIP RATHER THAN ONE MESSAGE
 *
 * The two halves have opposite natures. A session is large, binary, and written by machinery that
 * already exists and already has a schema - embedding coordinates, maps and representations
 * through protobuf. A movie document is small, text, and still changing shape week by week.
 * Putting the movie inside the session's schema would mean regenerating protobuf for every
 * keyframe field anyone thinks of, and putting the session inside JSON would mean base64 and a
 * third again in size for data that is already compact.
 *
 * A zip keeps each in the form that suits it. It also means the movie can be read, diffed, hand
 * edited and migrated without decoding a session at all, which matters for a format that will
 * change: `unzip -p movie.mhm moorhen-movie.json` is a debugging tool nobody has to write.
 *
 * THE SESSION IS OPTIONAL
 *
 * Two ways of working, and both are legitimate. A movie saved *with* its session is a complete
 * thing: it opens anywhere, including on a machine that has never seen the data. A movie saved
 * without one is a few kilobytes of camera path meant to be played over a scene you already have
 * - which is how a movie gets authored in the first place, saved repeatedly while being worked on,
 * and how a tour can be written once and applied to each of a series of structures.
 *
 * The manifest says which it is, so opening one can tell a movie that brought its own scene from
 * one that expects to find it already there, rather than discovering it halfway through a load.
 *
 * ON URLS
 *
 * CCP-EM's embedded Moorhen refers to data by URL, which would make for a very small movie file.
 * It is deliberately not the mechanism here: a URL needs something serving it, `file://` will not
 * do, and a movie that stops working when a server moves is not a saved movie. If a URL-referenced
 * variety is wanted later it belongs beside the embedded session as another manifest field, not
 * instead of it.
 */

import JSZip from "jszip";
import type { MovieDocument } from "./movieDocument";

/**
 * The format's version, for the manifest.
 *
 * Incremented when a change would make an older reader misunderstand a newer file - not when a
 * field is added that an older reader can safely ignore, which is most changes. A reader refuses
 * anything newer than it knows, because the alternative is loading half a movie and presenting it
 * as whole.
 */
export const MOVIE_FORMAT_VERSION = 1;

/** The movie description. Text, so it can be read without any of this code. */
export const MANIFEST_ENTRY = "moorhen-movie.json";

/** The session, exactly the bytes MoorhenTimeCapsule would have written on its own. */
export const SESSION_ENTRY = "session.pb";

/** The extension the file chooser should offer. */
export const MOVIE_EXTENSION = ".mhm";

/** What the manifest holds, beside the document itself. */
interface MovieManifest {
    format: number;
    /** Informational: which Moorhen wrote it, for making sense of a file that misbehaves. */
    writtenBy?: string;
    /** Whether a session accompanies the movie in this file. */
    hasSession: boolean;
    movie: MovieDocument;
}

export interface MovieContainer {
    movie: MovieDocument;
    /**
     * The session the movie was authored against, if the file carried one.
     *
     * Undefined is not an error - see the note on optional sessions above - but it does mean the
     * caller has to decide what scene to play the movie over, and should say so rather than
     * silently playing it over whatever happens to be loaded.
     */
    session?: Uint8Array;
}

/** What went wrong opening a file, in terms a person can act on. */
export class MovieFileError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "MovieFileError";
    }
}

/**
 * A movie and its session, as the bytes of a file.
 *
 * @param type  "uint8array" for bytes, "blob" for something to hand to a download. The caller
 *              knows which it wants; this does not.
 */
export async function packMovie(
    container: MovieContainer,
    options: { type?: "uint8array" | "blob"; writtenBy?: string } = {},
): Promise<Uint8Array | Blob> {
    const manifest: MovieManifest = {
        format: MOVIE_FORMAT_VERSION,
        ...(options.writtenBy ? { writtenBy: options.writtenBy } : {}),
        hasSession: container.session !== undefined,
        movie: container.movie,
    };

    const zip = new JSZip();
    // Indented, because being able to read and hand-edit this is half the reason the format is a
    // zip at all. It compresses away to almost nothing.
    zip.file(MANIFEST_ENTRY, JSON.stringify(manifest, null, 2));
    if (container.session) zip.file(SESSION_ENTRY, container.session);

    return zip.generateAsync({
        type: options.type ?? "uint8array",
        compression: "DEFLATE",
        // Level 1, not 9. The session's bulk is coordinate and map data that barely compresses,
        // and a movie is saved over and over while it is being authored - so the time matters and
        // the last few percent do not.
        compressionOptions: { level: 1 },
    }) as Promise<Uint8Array | Blob>;
}

/**
 * A file, back into a movie and its session.
 *
 * Every way this can fail says which thing was wrong with the file. The alternative - one "could
 * not read movie" - is the failure mode that wastes an afternoon, because a truncated download, a
 * file from a newer Moorhen and a zip of something else entirely all need different responses.
 */
export async function unpackMovie(data: ArrayBuffer | Uint8Array | Blob): Promise<MovieContainer> {
    let zip: JSZip;
    try {
        zip = await JSZip.loadAsync(data as ArrayBuffer);
    } catch {
        throw new MovieFileError("This is not a Moorhen movie file: it is not a zip archive.");
    }

    const manifestEntry = zip.file(MANIFEST_ENTRY);
    if (!manifestEntry) {
        throw new MovieFileError(
            `This zip does not contain ${MANIFEST_ENTRY}, so it is not a Moorhen movie.`);
    }

    let manifest: MovieManifest;
    try {
        manifest = JSON.parse(await manifestEntry.async("string"));
    } catch {
        throw new MovieFileError(`${MANIFEST_ENTRY} is not valid JSON; the file is damaged.`);
    }

    if (typeof manifest.format !== "number") {
        throw new MovieFileError(`${MANIFEST_ENTRY} has no format version.`);
    }
    if (manifest.format > MOVIE_FORMAT_VERSION) {
        throw new MovieFileError(
            `This movie was written by a newer Moorhen (format ${manifest.format}; this one reads `
            + `up to ${MOVIE_FORMAT_VERSION}).`);
    }
    if (!manifest.movie || !Array.isArray(manifest.movie.path?.keyframes)) {
        throw new MovieFileError(`${MANIFEST_ENTRY} contains no movie.`);
    }

    const sessionEntry = zip.file(SESSION_ENTRY);
    // The manifest and the entries disagreeing means the file was assembled by something other
    // than packMovie, or edited. Trust what is actually there, and only complain when the thing
    // that is missing is the thing the file promised.
    if (manifest.hasSession && !sessionEntry) {
        throw new MovieFileError(
            `This movie says it embeds a session, but ${SESSION_ENTRY} is missing; the file is `
            + "incomplete.");
    }

    return {
        movie: manifest.movie,
        ...(sessionEntry ? { session: await sessionEntry.async("uint8array") } : {}),
    };
}
