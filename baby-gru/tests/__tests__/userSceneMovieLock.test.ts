/*
 * Scenes must not change while a movie plays or is rendered: switching scene deletes the
 * representations the movie fades, and a snapshot moves the camera it holds.
 */
import { setMoviePlaying } from "@/store/movieSlice";
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
