/**
 * A map's 2D slice in a saved session: where it was is written and read back, so that a map saved
 * drawn as a slice comes back where it was rather than through the centre of the view.
 */
import { describe, expect, it } from "@jest/globals";
import * as path from "path";
import * as protobuf from "protobufjs";

const PROTO = path.resolve(__dirname, "../../src/protobuf/MoorhenSession.proto");
const schema = protobuf.loadSync(PROTO);
const MapDataSession = schema.lookupType("MapDataSession");

describe("a map's slice in a session", () => {
    it("is declared, so saving it is not a no-op", () => {
        expect(Object.keys(MapDataSession.fields)).toContain("slice");
    });

    it("comes back where it was", () => {
        const c = Math.cos(0.3), s = Math.sin(0.3);
        const slice = { origin: [1.5, -2.25, 3], orientation: [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], nodalLines: true, contourSpacing: "geometric" };
        const bytes = MapDataSession.encode(MapDataSession.create({ name: "orbital", style: "slice", slice })).finish();
        const restored = MapDataSession.toObject(MapDataSession.decode(bytes)) as { style: string; slice: typeof slice };
        expect(restored.style).toBe("slice");
        expect(restored.slice.origin).toEqual(slice.origin);
        expect(restored.slice.nodalLines).toBe(true);
        expect(restored.slice.contourSpacing).toBe("geometric");
        restored.slice.orientation.forEach((value, i) => expect(value).toBeCloseTo(slice.orientation[i], 6));
    });

    it("is absent for a map that never had one", () => {
        const bytes = MapDataSession.encode(MapDataSession.create({ name: "map", style: "lines" })).finish();
        const restored = MapDataSession.toObject(MapDataSession.decode(bytes)) as { slice?: unknown };
        expect(restored.slice).toBeUndefined();
    });
});
