/**
 * Reading a scene's maps section from a session file (src/store/userSceneFormat.ts, .roadmaps/map-display.md):
 * records that cannot be drawn are dropped, fields a record was saved without get their defaults.
 */
import { fromFileEntry } from "../../src/store/userSceneFormat";

const record = {
    id: "rep-1",
    mapUid: "map-1",
    visible: true,
    contourLevel: 0.4,
    radius: { local: 15, full: 60 },
    style: "lines",
    alpha: { lines: 1, "lit-lines": 1, solid: 0.5, slice: 1 },
    colour: { r: 1, g: 0, b: 0 },
    positiveColour: null,
    negativeColour: null,
    colourByMap: null,
    originLock: null,
    slice: null,
};

describe("a scene's maps section, read from a file", () => {
    test("keeps the records as saved, and the maps the scene knew", () => {
        const scene = fromFileEntry({
            id: "custom-1",
            name: "Figure",
            objects: { molecules: {}, maps: { "map-1": "map.mtz", "map-2": 42 as unknown as string } },
            sections: { maps: [record] },
        });
        expect(scene.content.sections.maps).toEqual([record]);
        expect(scene.content.objects.maps).toEqual({ "map-1": "map.mtz" });
    });

    test("drops records that cannot be drawn, and gives the others the fields they were saved without", () => {
        const { colourByMap, originLock, slice, positiveColour, negativeColour, ...older } = record;
        const scene = fromFileEntry({
            id: "custom-1",
            name: "Figure",
            objects: { molecules: {}, maps: { "map-1": "map.mtz" } },
            sections: {
                maps: [
                    older,
                    { ...record, id: 7 },
                    { ...record, id: "no-level", contourLevel: "high" },
                    { ...record, id: "bad-slice", slice: { origin: [0, 0], orientation: [] }, colourByMap: { mapUid: "map-2" } },
                ] as never,
            },
        });
        expect(scene.content.sections.maps).toEqual([
            { ...older, colourByMap, originLock, slice, positiveColour, negativeColour },
            { ...record, id: "bad-slice" },
        ]);
    });

    test("is absent in a scene saved before maps were in scenes: the shown maps are kept", () => {
        const scene = fromFileEntry({ id: "custom-1", name: "Figure", objects: { molecules: {} }, sections: { representations: [] } });
        expect(scene.content.sections.maps).toBeUndefined();
        expect(scene.content.objects.maps).toBeUndefined();
    });
});
