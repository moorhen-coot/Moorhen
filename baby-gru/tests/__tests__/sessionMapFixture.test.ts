/**
 * tests/test_data/session/map-display.pb, the session the map display e2e tests load (session-map-display.spec.ts):
 * it loads, here in Node with Coot, so that a broken fixture shows up as such rather than as an e2e timeout.
 * Its maps were subsampled by 2 on each axis and its reflection data dropped (2026-11-26, 13.8 MB → 1.5 MB): only
 * how the maps are displayed is tested with it.
 */
import * as fs from "fs";
import * as path from "path";
import { moorhensession } from "@/protobuf/MoorhenSession";
import { MoorhenTimeCapsule } from "@/utils/MoorhenTimeCapsule";
import { createCloudInstance, loadCootModules, type CloudInstance } from "./cloudHost/cloudHostHarness";

jest.setTimeout(120000);

let cloud: CloudInstance;
beforeAll(loadCootModules);
beforeEach(async () => {
    cloud = await createCloudInstance();
});
afterEach(async () => {
    await cloud.cleanup();
});

const fixture = () => fs.readFileSync(path.join(__dirname, "..", "test_data", "session", "map-display.pb"));
const load = (bytes: Uint8Array) =>
    MoorhenTimeCapsule.loadSessionFromArrayBuffer(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer, cloud.instance);
const mapSummary = () =>
    cloud.store
        .getState()
        .maps.map(map => ({ name: map.name, isEM: map.isEM, isDifference: map.isDifference }))
        .sort((a, b) => a.name.localeCompare(b.name));

describe("the map display session fixture", () => {
    test("loads its five maps, the EM one detected as such", async () => {
        expect(await load(fixture())).toBe(0);
        expect(mapSummary()).toEqual([
            { name: "Copy of map-1 - hidden", isEM: false, isDifference: true },
            { name: "Copy of map-1 coloured by diff", isEM: false, isDifference: false },
            { name: "low-res-emd-32143", isEM: true, isDifference: false },
            { name: "map-1 ", isEM: false, isDifference: false },
            { name: "map-1 - diff", isEM: false, isDifference: true },
        ]);
    });

    test("loads with an empty reflection data field on a map without MTZ columns (it used to stop the load)", async () => {
        const session = moorhensession.Session.decode(fixture());
        session.mapData.forEach(map => (map.reflectionData = new Uint8Array(0)));
        expect(await load(moorhensession.Session.encode(session).finish())).toBe(0);
        expect(mapSummary()).toHaveLength(5);
    });
});
