/**
 * Updating maps after a model change (MoorhenMap.redrawWithNewData): Coot recalculates 2Fo-Fc / Fo-Fc lazily, when a
 * contour is next asked for, and the R-factors read next (UpdatingMapsManager) come from them. So a token contour is
 * always asked for, whether or not the map's representations will contour now (hidden, a 2D slice, GPU contours, or
 * a contour squashed in the queue): otherwise the scores shown after a refinement could be the previous ones.
 */
import { describe, expect, it } from "@jest/globals";
import { MoorhenMap } from "../../src/utils/MoorhenMap";
import { gpuMapContourSetting } from "../../src/WebGPUComponents/mapContour/setting";

const mapAskingCoot = () => {
    const commands: { command: string; commandArgs: unknown[] }[] = [];
    const map = Object.assign(Object.create(MoorhenMap.prototype), {
        molNo: 4,
        uniqueId: "map-4",
        dataRevision: 0,
        commandCentre: { cootCommand: async (command: { command: string; commandArgs: unknown[] }) => commands.push(command) },
        store: { getState: () => ({ sceneSettings: { origin: [-1, -2, -3] } }) },
        // The representations contour nothing (hidden): no other command goes to Coot
        drawMapContour: async () => {},
    });
    Object.defineProperty(map, "primaryRepresentation", {
        get: () => ({
            visible: false,
            contourLevel: 0.4,
            style: "lines",
            radius: { local: 15, full: 15 },
            alpha: { lines: 1, "lit-lines": 1, solid: 1, slice: 1 },
            originLock: null,
            viewDependentTransparency: false,
        }),
    });
    return { map, commands };
};

describe("a model change, on an updating map", () => {
    it("asks Coot for a token contour, with Coot contours and the map hidden", async () => {
        gpuMapContourSetting.enabled = false;
        const { map, commands } = mapAskingCoot();
        await map.redrawWithNewData();
        expect(commands).toHaveLength(1);
        expect(commands[0].command).toBe("get_map_contours_mesh");
        // At the view centre, half an ångström across
        expect(commands[0].commandArgs.slice(0, 5)).toEqual([4, 1, 2, 3, 0.5]);
        expect(map.dataRevision).toBe(1);
    });

    it("asks for it with GPU contours too", async () => {
        gpuMapContourSetting.enabled = true;
        try {
            const { map, commands } = mapAskingCoot();
            await map.redrawWithNewData();
            expect(commands.map(command => command.command)).toEqual(["get_map_contours_mesh"]);
        } finally {
            gpuMapContourSetting.enabled = false;
        }
    });
});
