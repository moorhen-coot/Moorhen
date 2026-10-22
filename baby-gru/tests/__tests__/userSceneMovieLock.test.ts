/*
 * A movie plays in a scene of its own, and scenes must not change while a movie plays or is
 * rendered: switching scene deletes the representations the movie fades, and a snapshot moves the
 * camera it holds.
 */
import { setMovieDocument, setMoviePlaying, setMovieSceneId } from "@/store/movieSlice";
import { emptyMovie } from "@/utils/movieDocument";
import { createCloudInstance, loadCootModules, type CloudInstance } from "./cloudHost/cloudHostHarness";

jest.setTimeout(60000);

let cloud: CloudInstance;

beforeAll(loadCootModules);

beforeEach(async () => {
    cloud = await createCloudInstance();
});

afterEach(async () => {
    await cloud.cleanup();
});

describe("scene changes while a movie plays", () => {
    test("select and restoreDefault are refused, and allowed again once the movie stops", async () => {
        const userScene = cloud.instance.userScene;
        cloud.store.dispatch(setMoviePlaying(true));

        expect(await userScene.select("Model Building")).toBe(false);
        expect(userScene.selected).toBe("Default");
        expect(await userScene.restoreDefault("Default")).toBe(false);

        cloud.store.dispatch(setMoviePlaying(false));
        expect(await userScene.select("Model Building")).toBe(true);
        expect(userScene.selected).toBe("Model Building");
    });
});

describe("the movie's scene", () => {
    test("is a copy of the current scene, shown, and cannot be deleted while the movie uses it", async () => {
        const userScene = cloud.instance.userScene;
        const sceneId = await userScene.createMovieScene("Movie: test");
        cloud.store.dispatch(setMovieSceneId(sceneId));

        expect(sceneId).toBe("movie-1");
        expect(userScene.selected).toBe(sceneId);
        expect(userScene.list.map(scene => scene.name)).toContain("Movie: test");
        expect(userScene.isMovieScene(sceneId)).toBe(true);
        expect(await userScene.delete(sceneId)).toBe(false);

        // Another movie no longer uses it
        cloud.store.dispatch(setMovieDocument(emptyMovie()));
        expect(await userScene.delete(sceneId)).toBe(true);
        expect(userScene.list.some(scene => scene.id === sceneId)).toBe(false);
    });
});
