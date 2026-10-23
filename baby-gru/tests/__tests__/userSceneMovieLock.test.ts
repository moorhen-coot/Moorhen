/*
 * A movie plays in a scene of its own, and scenes must not change while a movie plays or is
 * rendered: switching scene deletes the representations the movie fades, and a snapshot moves the
 * camera it holds.
 */
import * as quat4 from "gl-matrix/quat";
import { appendKeyframe, setMovieDocument, setMoviePlaying } from "@/store/movieSlice";
import { MOVIE_SCENE_ID } from "@/store/userScenesSlice";
import type { Keyframe } from "@/utils/cameraPath";
import { emptyMovie } from "@/utils/movieDocument";
import { createCloudInstance, loadCootModules, type CloudInstance } from "./cloudHost/cloudHostHarness";

jest.setTimeout(60000);

let cloud: CloudInstance;

const keyframe: Keyframe = {
    quat: quat4.fromValues(0, 0, 0, -1),
    origin: [0, 0, 0],
    zoom: 1,
    clipFront: 8, clipBack: 21, fogFront: 8, fogBack: 21,
};

beforeAll(loadCootModules);

beforeEach(async () => {
    cloud = await createCloudInstance();
});

afterEach(async () => {
    await cloud.cleanup();
});

describe("scene changes while a movie plays", () => {
    test("select and reset are refused, and allowed again once the movie stops", async () => {
        const userScene = cloud.instance.userScene;
        cloud.store.dispatch(setMoviePlaying(true));

        expect(await userScene.select("Model Building")).toBe(false);
        expect(userScene.selected).toBe("Default");
        expect(await userScene.reset("Default", "default", true)).toBe(false);

        cloud.store.dispatch(setMoviePlaying(false));
        expect(await userScene.select("Model Building")).toBe(true);
        expect(userScene.selected).toBe("Model Building");
    });
});

describe("the movie's scene", () => {
    test("is a copy of the current scene, shown, and cannot be deleted while the movie has keyframes", async () => {
        const userScene = cloud.instance.userScene;
        const sceneId = await userScene.createMovieScene("Movie: test");

        expect(sceneId).toBe(MOVIE_SCENE_ID);
        expect(userScene.selected).toBe(sceneId);
        expect(userScene.list.map(scene => scene.name)).toContain("Movie: test");
        expect(sceneId).toBe(MOVIE_SCENE_ID);

        cloud.store.dispatch(appendKeyframe(keyframe));
        expect(await userScene.delete(sceneId)).toBe(false);

        // A new movie, with no keyframes yet, no longer needs it
        cloud.store.dispatch(setMovieDocument(emptyMovie()));
        expect(await userScene.delete(sceneId)).toBe(true);
        expect(userScene.list.some(scene => scene.id === sceneId)).toBe(false);
    });

    test("there is only one: a later movie plays in the same scene", async () => {
        const userScene = cloud.instance.userScene;
        expect(await userScene.createMovieScene("Movie: first")).toBe(MOVIE_SCENE_ID);
        await userScene.select("Default");

        expect(await userScene.createMovieScene("Movie: second")).toBe(MOVIE_SCENE_ID);
        expect(userScene.selected).toBe(MOVIE_SCENE_ID);
        expect(userScene.list.filter(scene => scene.id === MOVIE_SCENE_ID)).toHaveLength(1);
    });
});
