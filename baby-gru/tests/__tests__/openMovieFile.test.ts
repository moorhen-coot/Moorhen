/**
 * Opening a .mhm.
 *
 * One function serves three ways in - the movie panel's Open button, File -> Open, and dropping a
 * file on the window - so what is checked here is the ordering they all depend on: the scene is
 * restored before the document is loaded, and a scene that will not load takes the document down
 * with it rather than leaving a movie playing over the wrong molecules.
 */
import { describe, expect, it, jest, beforeEach } from "@jest/globals";

// `mock` prefix: jest.mock is hoisted above the imports, and babel-plugin-jest-hoist only
// allows the factory to close over names that begin with it.
const mockLoadSession = jest.fn<(...args: any[]) => Promise<number>>();
jest.mock("../../src/utils/MoorhenTimeCapsule", () => ({
    MoorhenTimeCapsule: {
        loadSessionFromArrayBuffer: (...args: any[]) => mockLoadSession(...args),
        NEWER_VERSION_STATUS: -2,
        NEWER_VERSION_MESSAGE: "This session file is for a more recent version of Moorhen",
        MOVIE_PLAYING_STATUS: -3,
        MOVIE_PLAYING_MESSAGE: "A movie is playing: stop it before loading a session",
    },
}));

import { openMovieFile } from "../../src/utils/openMovieFile";
import { packMovie } from "../../src/utils/movieContainer";
import { emptyMovie } from "../../src/utils/movieDocument";
import type { MovieDocument } from "../../src/utils/movieDocument";

const aMovie = (): MovieDocument => {
    const movie = emptyMovie("A tour");
    movie.path.keyframes.push({
        quat: [0, 0, 0, 1], origin: [1, 2, 3], zoom: 0.5,
        clipFront: 10, clipBack: 20, fogFront: 8, fogBack: 21,
    });
    return movie;
};

/** A .mhm as a File, the way the browser hands one over. */
const movieFile = async (name: string, session?: Uint8Array): Promise<File> => {
    const packed = await packMovie(
        { movie: aMovie(), ...(session ? { session } : {}) }) as Uint8Array;
    return new File([packed as BlobPart], name);
};

/**
 * Only what openMovieFile touches: somewhere to dispatch, somewhere to look afterwards, and the
 * scenes, to show the movie scene if the session has one.
 */
const anInstance = (sceneIds: string[] = ["Overview", "Model Building"], isPlaying = false) => {
    const dispatched: { type: string; payload?: unknown }[] = [];
    const select = jest.fn(async (_sceneId: string) => true);
    return {
        dispatched,
        select,
        instance: {
            store: { dispatch: (action: any) => dispatched.push(action), getState: () => ({ movie: { isPlaying } }) },
            userScene: { list: sceneIds.map(id => ({ id, name: id })), selected: "Overview", select, waitUntilIdle: async () => {} },
        } as any,
    };
};

const types = (dispatched: { type: string }[]) => dispatched.map(action => action.type);

beforeEach(() => {
    mockLoadSession.mockReset();
    mockLoadSession.mockResolvedValue(0);
});

describe("opening a movie file", () => {
    it("restores the scene, loads the document, and shows the panel", async () => {
        const { instance, dispatched } = anInstance();
        const result = await openMovieFile(
            await movieFile("tour.mhm", new Uint8Array([8, 1])), instance);

        expect(result.ok).toBe(true);
        expect(result.restoredScene).toBe(true);
        expect(mockLoadSession).toHaveBeenCalledTimes(1);
        expect(types(dispatched)).toEqual([
            "movie/setMovieDocument", "movie/setMovieFileName", "globalUI/setShownSidePanel",
        ]);
        expect(dispatched.at(-1).payload).toBe("movie");
    });

    it("says so when the file carries no scene, and opens it anyway", async () => {
        // A movie saved without a session is a few kilobytes of camera path. It is perfectly
        // usable over the scene that is already open - and misleading if nothing says so.
        const { instance, dispatched } = anInstance();
        const result = await openMovieFile(await movieFile("path-only.mhm"), instance);

        expect(result.ok).toBe(true);
        expect(result.restoredScene).toBe(false);
        expect(result.message).toMatch(/carries no scene/);
        expect(mockLoadSession).not.toHaveBeenCalled();
        expect(types(dispatched)).toContain("movie/setMovieDocument");
    });

    it("shows the movie scene when the session has one", async () => {
        const { instance, select } = anInstance(["Overview", "Model Building", "movie"]);
        await openMovieFile(await movieFile("tour.mhm", new Uint8Array([8, 1])), instance);
        expect(select).toHaveBeenCalledWith("movie");
    });

    it("says so when the movie scene cannot be shown", async () => {
        const { instance, select } = anInstance(["Overview", "movie"]);
        select.mockResolvedValue(false);
        const result = await openMovieFile(await movieFile("tour.mhm", new Uint8Array([8, 1])), instance);
        expect(result.ok).toBe(true);
        expect(result.message).toMatch(/could not show its scene/);
    });

    it("refuses a file without a session too while a movie plays", async () => {
        const { instance, dispatched } = anInstance(undefined, true);
        const result = await openMovieFile(await movieFile("path-only.mhm"), instance);
        expect(result.ok).toBe(false);
        expect(result.message).toMatch(/movie is playing/);
        expect(dispatched).toHaveLength(0);
        expect(mockLoadSession).not.toHaveBeenCalled();
    });

    it("refuses while a movie plays, saying why", async () => {
        mockLoadSession.mockResolvedValue(-3);
        const { instance, dispatched } = anInstance();
        const result = await openMovieFile(await movieFile("tour.mhm", new Uint8Array([8, 1])), instance);
        expect(result.ok).toBe(false);
        expect(result.message).toMatch(/movie is playing/);
        expect(dispatched).toHaveLength(0);
    });

    it("leaves the scene alone when there is no movie scene", async () => {
        const { instance, select } = anInstance();
        await openMovieFile(await movieFile("path-only.mhm"), instance);
        expect(select).not.toHaveBeenCalled();
    });

    it("loads no document when the session is from a more recent Moorhen", async () => {
        mockLoadSession.mockResolvedValue(-2);
        const { instance, dispatched } = anInstance();
        const result = await openMovieFile(
            await movieFile("tour.mhm", new Uint8Array([8, 1])), instance);

        expect(result.ok).toBe(false);
        expect(result.message).toMatch(/more recent version/);
        expect(dispatched).toHaveLength(0);
    });

    it("loads no document when the scene will not load", async () => {
        // The point of the whole ordering. A movie over the wrong scene is worse than no movie:
        // it plays, and every shot in it is of something else.
        mockLoadSession.mockResolvedValue(-1);
        const { instance, dispatched } = anInstance();
        const result = await openMovieFile(
            await movieFile("tour.mhm", new Uint8Array([8, 1])), instance);

        expect(result.ok).toBe(false);
        expect(result.message).toMatch(/scene would not load/);
        expect(dispatched).toHaveLength(0);
    });

    it("reports a file that is not a movie rather than throwing", async () => {
        // It comes from a drop target, where anything at all can land.
        const { instance, dispatched } = anInstance();
        const result = await openMovieFile(
            new File([new Uint8Array([1, 2, 3, 4])], "holiday.jpg"), instance);

        expect(result.ok).toBe(false);
        expect(result.message.length).toBeGreaterThan(0);
        expect(dispatched).toHaveLength(0);
    });

    it("reports each step to a caller that has somewhere to put it", async () => {
        const steps: string[] = [];
        const { instance } = anInstance();
        await openMovieFile(
            await movieFile("tour.mhm", new Uint8Array([8, 1])), instance, m => steps.push(m));

        expect(steps[0]).toMatch(/tour\.mhm/);
        expect(steps.some(step => /scene/i.test(step))).toBe(true);
    });
});
