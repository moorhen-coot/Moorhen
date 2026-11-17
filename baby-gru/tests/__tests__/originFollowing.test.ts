/**
 * Bringing the origin-dependent scene to a given origin, and knowing when it has arrived.
 *
 * The running application drives these from two React listeners watching the store. An exported
 * movie frame cannot: it has to be able to say "this scene, at this moment", which means the work
 * must take the moment as an argument and resolve when it is finished rather than when it is
 * started. These are the two properties, plus the question of what gets left out.
 */
import { describe, expect, it, jest } from "@jest/globals";
import {
    contourMapsAtOrigin, followOrigin, redrawOriginRepresentations,
} from "../../src/utils/originFollowing";
import type { OriginFollowingScene } from "../../src/utils/originFollowing";

/** A map that records what it was asked to contour, and when it finished. */
const mapStub = (molNo: number, overrides: Record<string, unknown> = {}) => {
    const contoured: { centre: number[]; radius: number; level: number }[] = [];
    let settle: (() => void) | null = null;
    return {
        molNo,
        contoured,
        finish: () => { settle?.(); settle = null; },
        get pending() { return settle !== null; },
        getMapContourParams: () => ({
            mapRadius: 15, contourLevel: 0.8, mapStyle: "lines",
            mapAlpha: 1, mapColour: {}, positiveMapColour: {}, negativeMapColour: {},
        }),
        doCootContour: (x: number, y: number, z: number, radius: number, level: number) => {
            contoured.push({ centre: [x, y, z], radius, level });
            return new Promise<void>(resolve => { settle = resolve as () => void; });
        },
        ...overrides,
    };
};

/** A molecule with whichever origin-following representations are asked for. */
const moleculeStub = (flags: {
    environment?: boolean; adaptative?: boolean; symmetry?: boolean; nef?: boolean;
} = {}) => {
    const calls: string[] = [];
    return {
        calls,
        isVisible: () => true,
        molNo: 0,
        environmentRepresentation: { visible: !!flags.environment },
        NEFRestraintRepresentation: { visible: !!flags.nef },
        adaptativeBondsEnabled: !!flags.adaptative,
        symmetryOn: !!flags.symmetry,
        drawEnvironment: async (cid: string) => { calls.push(`environment:${cid}`); },
        redrawAdaptativeBonds: async (cid: string) => { calls.push(`adaptative:${cid}`); },
        drawNEFRestraints: async (cid: string) => { calls.push(`nef:${cid}`); },
        drawSymmetry: () => { calls.push("symmetry"); },
    };
};

const sceneOf = (
    maps: ReturnType<typeof mapStub>[],
    molecules: ReturnType<typeof moleculeStub>[],
    visibleMapNumbers = maps.map(map => map.molNo),
): OriginFollowingScene => ({
    maps: maps as never,
    molecules: molecules as never,
    visibleMapNumbers,
    commandCentre: {
        cootCommand: async () => ({ data: { result: { result: { first: 0, second: "/1/A/42" } } } }),
    } as never,
    store: { getState: () => ({ sceneSettings: { origin: [0, 0, 0] } }) } as never,
});

describe("contouring the maps", () => {
    it("contours about the origin it is given, not the store's", () => {
        // The point of the whole module. During an export the store is deliberately behind.
        const map = mapStub(0);
        const scene = sceneOf([map], []);
        contourMapsAtOrigin(scene, [-10, -20, -30]);
        expect(map.contoured).toHaveLength(1);
        // Negated on the way in, as the store's convention requires.
        expect(map.contoured[0].centre).toEqual([10, 20, 30]);
    });

    it("takes the level, radius and style from the settings, which are not the camera's business", () => {
        const map = mapStub(0);
        contourMapsAtOrigin(sceneOf([map], []), [0, 0, 0]);
        expect(map.contoured[0].radius).toBe(15);
        expect(map.contoured[0].level).toBe(0.8);
    });

    it("leaves a hidden map alone", () => {
        const shown = mapStub(0);
        const hidden = mapStub(1);
        contourMapsAtOrigin(sceneOf([shown, hidden], [], [0]), [0, 0, 0]);
        expect(shown.contoured).toHaveLength(1);
        expect(hidden.contoured).toHaveLength(0);
    });

    it("does not resolve until every map has finished", async () => {
        // The property an exported frame depends on: started is not good enough, because the frame
        // is captured the instant this returns.
        const first = mapStub(0);
        const second = mapStub(1);
        let done = false;
        const settled = contourMapsAtOrigin(sceneOf([first, second], []), [0, 0, 0])
            .then(() => { done = true; });

        await Promise.resolve();
        expect(done).toBe(false);
        first.finish();
        await Promise.resolve();
        expect(done).toBe(false);
        second.finish();
        await settled;
        expect(done).toBe(true);
    });
});

describe("the representations drawn about the centre", () => {
    it("redraws only what is actually switched on", async () => {
        const molecule = moleculeStub({ environment: true, nef: true });
        await redrawOriginRepresentations(sceneOf([], [molecule]), [0, 0, 0]);
        expect(molecule.calls).toContain("environment:/1/A/42");
        expect(molecule.calls).toContain("nef:/1/A/42");
        expect(molecule.calls).not.toContain("adaptative:/1/A/42");
        expect(molecule.calls).not.toContain("symmetry");
    });

    it("asks coot nothing at all when nothing follows the centre", async () => {
        // The common case by far, and the one an export pays for on every single frame.
        const molecule = moleculeStub();
        const scene = sceneOf([], [molecule]);
        const asked = jest.fn();
        (scene.commandCentre as unknown as { cootCommand: unknown }).cootCommand = asked;
        await redrawOriginRepresentations(scene, [0, 0, 0]);
        expect(asked).not.toHaveBeenCalled();
        expect(molecule.calls).toEqual([]);
    });

    it("still draws symmetry when no residue is near enough to name", async () => {
        // Symmetry is about the cell, not about a residue. Tying it to the centre atom would make
        // a view of empty solvent drop the symmetry mates.
        const molecule = moleculeStub({ symmetry: true, environment: true });
        const scene = sceneOf([], [molecule]);
        (scene.commandCentre as unknown as { cootCommand: unknown }).cootCommand =
            async () => ({ data: { result: { result: { first: -1, second: "" } } } });
        await redrawOriginRepresentations(scene, [0, 0, 0]);
        expect(molecule.calls).toEqual(["symmetry"]);
    });
});

describe("the whole scene together", () => {
    it("waits for both the maps and the representations", async () => {
        const map = mapStub(0);
        const molecule = moleculeStub({ environment: true });
        let done = false;
        const settled = followOrigin(sceneOf([map], [molecule]), [0, 0, 0])
            .then(() => { done = true; });

        // The molecule work resolves on its own; the map is still outstanding.
        await Promise.resolve();
        await Promise.resolve();
        expect(done).toBe(false);
        map.finish();
        await settled;
        expect(done).toBe(true);
        expect(molecule.calls).toContain("environment:/1/A/42");
    });
});
