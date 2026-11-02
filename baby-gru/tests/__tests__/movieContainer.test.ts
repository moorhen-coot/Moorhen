/**
 * The movie file.
 *
 * Two things are being checked. That a movie survives the round trip, including the session it
 * was authored against - a movie that reopens without its scene is a camera path through nothing.
 * And that every way of failing says what is wrong with the file, because a truncated download, a
 * file from a newer Moorhen and a zip of something else entirely need different responses from
 * whoever is holding the file.
 */
import { describe, expect, it } from "@jest/globals";
import JSZip from "jszip";
import {
    MANIFEST_ENTRY, MOVIE_FORMAT_VERSION, MovieFileError, SESSION_ENTRY,
    packMovie, unpackMovie,
} from "../../src/utils/movieContainer";
import { emptyMovie } from "../../src/utils/movieDocument";
import type { MovieDocument } from "../../src/utils/movieDocument";

const aMovie = (): MovieDocument => {
    const movie = emptyMovie("Tour of the active site");
    movie.path.keyframes.push({
        quat: [0, 0, 0, 1], origin: [1, 2, 3], zoom: 0.5,
        clipFront: 10, clipBack: 20, fogFront: 8, fogBack: 21,
        opacity: { surface: 0.4 },
    });
    movie.path.keyframes.push({
        quat: [0, 0, 0, 1], origin: [4, 5, 6], zoom: 0.25,
        clipFront: 10, clipBack: 20, fogFront: 8, fogBack: 21,
        opacity: { surface: 1 },
    });
    movie.path.segments.push({ seconds: 3, motion: { kind: "move" } });
    return movie;
};

const bytes = (...values: number[]) => new Uint8Array(values);

const packed = async (movie: MovieDocument, session?: Uint8Array) =>
    (await packMovie({ movie, ...(session ? { session } : {}) })) as Uint8Array;

describe("a movie saved with its session", () => {
    it("comes back as it went in", async () => {
        const movie = aMovie();
        const session = bytes(8, 1, 16, 2, 24, 3);

        const container = await unpackMovie(await packed(movie, session));

        expect(container.movie).toEqual(movie);
        expect(container.session).toEqual(session);
    });

    it("keeps the opacity map, which is the part with a long way to fall", async () => {
        // Keyed on representation ids that survive a session reload. If this were ever stringified
        // through something lossy the fades would simply stop happening, with no error.
        const container = await unpackMovie(await packed(aMovie(), bytes(1)));
        expect(container.movie.path.keyframes[0].opacity).toEqual({ surface: 0.4 });
        expect(container.movie.path.keyframes[1].opacity).toEqual({ surface: 1 });
    });

    it("writes the movie as readable text beside the session", async () => {
        // Half the reason the format is a zip: `unzip -p movie.mhm moorhen-movie.json` is a
        // debugging tool nobody has to write.
        const zip = await JSZip.loadAsync(await packed(aMovie(), bytes(1)));
        const manifest = JSON.parse(await zip.file(MANIFEST_ENTRY)!.async("string"));

        expect(manifest.format).toBe(MOVIE_FORMAT_VERSION);
        expect(manifest.hasSession).toBe(true);
        expect(manifest.movie.name).toBe("Tour of the active site");
        expect(zip.file(SESSION_ENTRY)).not.toBeNull();
    });
});

describe("a movie saved without a session", () => {
    it("round-trips, and says it has no scene of its own", async () => {
        // The working case: a few kilobytes of camera path, saved over and over while being
        // authored, to be played over a scene that is already open.
        const container = await unpackMovie(await packed(aMovie()));

        expect(container.movie.name).toBe("Tour of the active site");
        expect(container.session).toBeUndefined();
    });

    it("does not carry a session entry at all", async () => {
        const zip = await JSZip.loadAsync(await packed(aMovie()));
        expect(zip.file(SESSION_ENTRY)).toBeNull();
        expect(JSON.parse(await zip.file(MANIFEST_ENTRY)!.async("string")).hasSession).toBe(false);
    });
});

describe("opening something that is not a movie", () => {
    const openingShouldSay = async (data: Uint8Array, fragment: string) => {
        await expect(unpackMovie(data)).rejects.toThrow(MovieFileError);
        await expect(unpackMovie(data)).rejects.toThrow(fragment);
    };

    it("says so when the file is not a zip", async () => {
        await openingShouldSay(bytes(1, 2, 3, 4, 5), "not a zip archive");
    });

    it("says so when the zip is of something else", async () => {
        const zip = new JSZip();
        zip.file("holiday.jpg", bytes(1, 2, 3));
        await openingShouldSay(await zip.generateAsync({ type: "uint8array" }), MANIFEST_ENTRY);
    });

    it("says so when the manifest is damaged", async () => {
        const zip = new JSZip();
        zip.file(MANIFEST_ENTRY, "{ this is not json");
        await openingShouldSay(await zip.generateAsync({ type: "uint8array" }), "not valid JSON");
    });

    it("refuses a movie from a newer Moorhen, naming both versions", async () => {
        // Rather than reading what it recognises and presenting half a movie as whole.
        const zip = new JSZip();
        zip.file(MANIFEST_ENTRY, JSON.stringify({
            format: MOVIE_FORMAT_VERSION + 7, hasSession: false, movie: aMovie(),
        }));
        await openingShouldSay(await zip.generateAsync({ type: "uint8array" }),
            `format ${MOVIE_FORMAT_VERSION + 7}`);
    });

    it("says so when a file promises a session it does not contain", async () => {
        // A truncated download, or a file assembled by something other than packMovie.
        const zip = new JSZip();
        zip.file(MANIFEST_ENTRY, JSON.stringify({
            format: MOVIE_FORMAT_VERSION, hasSession: true, movie: aMovie(),
        }));
        await openingShouldSay(await zip.generateAsync({ type: "uint8array" }), "incomplete");
    });

    it("says so when the manifest carries no movie", async () => {
        const zip = new JSZip();
        zip.file(MANIFEST_ENTRY, JSON.stringify({ format: MOVIE_FORMAT_VERSION, hasSession: false }));
        await openingShouldSay(await zip.generateAsync({ type: "uint8array" }), "no movie");
    });
});

describe("a file whose manifest and contents disagree the other way", () => {
    it("takes the session that is there, whatever the manifest claimed", async () => {
        // Trust what is in the file over what it says about itself, and only complain when the
        // thing missing is the thing promised. Being stricter would reject a hand-edited movie
        // for no benefit.
        const zip = new JSZip();
        zip.file(MANIFEST_ENTRY, JSON.stringify({
            format: MOVIE_FORMAT_VERSION, hasSession: false, movie: aMovie(),
        }));
        zip.file(SESSION_ENTRY, bytes(9, 9, 9));

        const container = await unpackMovie(await zip.generateAsync({ type: "uint8array" }));
        expect(container.session).toEqual(bytes(9, 9, 9));
    });
});
