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

/** A map display driver that records the origins it was asked to contour the maps at, and when it finished. */
const mapDisplayStub = () => {
    const origins: number[][] = [];
    let settle: (() => void) | null = null;
    return {
        origins,
        finish: () => { settle?.(); settle = null; },
        contourMapsAt: (origin: readonly number[]) => {
            origins.push([...origin]);
            return new Promise<void>(resolve => { settle = resolve as () => void; });
        },
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
    mapDisplay: ReturnType<typeof mapDisplayStub> | null,
    molecules: ReturnType<typeof moleculeStub>[],
): OriginFollowingScene => ({
    molecules: molecules as never,
    contourMaps: mapDisplay ? origin => mapDisplay.contourMapsAt(origin) : null,
    commandCentre: {
        cootCommand: async () => ({ data: { result: { result: { first: 0, second: "/1/A/42" } } } }),
    } as never,
    store: { getState: () => ({ sceneSettings: { origin: [0, 0, 0] } }) } as never,
});

// Which maps are contoured, with what level and radius, and which are left alone (hidden, locked, on the GPU) is
// the map display driver's (MapDisplayDriver.contourMapsAt, MapRepresentation.contourAround); here only that it is
// asked at the right origin and waited for.
describe("contouring the maps", () => {
    it("contours about the origin it is given, not the store's", () => {
        // The point of the whole module. During an export the store is deliberately behind.
        const mapDisplay = mapDisplayStub();
        contourMapsAtOrigin(sceneOf(mapDisplay, []), [-10, -20, -30]);
        expect(mapDisplay.origins).toEqual([[-10, -20, -30]]);
    });

    it("has nothing to contour without a map display", async () => {
        await expect(contourMapsAtOrigin(sceneOf(null, []), [0, 0, 0])).resolves.toBeUndefined();
    });

    it("does not resolve until the maps are drawn", async () => {
        // The property an exported frame depends on: started is not good enough, because the frame
        // is captured the instant this returns.
        const mapDisplay = mapDisplayStub();
        let done = false;
        const settled = contourMapsAtOrigin(sceneOf(mapDisplay, []), [0, 0, 0])
            .then(() => { done = true; });

        await Promise.resolve();
        expect(done).toBe(false);
        mapDisplay.finish();
        await settled;
        expect(done).toBe(true);
    });
});

describe("the representations drawn about the centre", () => {
    it("redraws only what is actually switched on", async () => {
        const molecule = moleculeStub({ environment: true, nef: true });
        await redrawOriginRepresentations(sceneOf(null, [molecule]), [0, 0, 0]);
        expect(molecule.calls).toContain("environment:/1/A/42");
        expect(molecule.calls).toContain("nef:/1/A/42");
        expect(molecule.calls).not.toContain("adaptative:/1/A/42");
        expect(molecule.calls).not.toContain("symmetry");
    });

    it("asks coot nothing at all when nothing follows the centre", async () => {
        // The common case by far, and the one an export pays for on every single frame.
        const molecule = moleculeStub();
        const scene = sceneOf(null, [molecule]);
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
        const scene = sceneOf(null, [molecule]);
        (scene.commandCentre as unknown as { cootCommand: unknown }).cootCommand =
            async () => ({ data: { result: { result: { first: -1, second: "" } } } });
        await redrawOriginRepresentations(scene, [0, 0, 0]);
        expect(molecule.calls).toEqual(["symmetry"]);
    });
});

describe("the whole scene together", () => {
    it("waits for both the maps and the representations", async () => {
        const mapDisplay = mapDisplayStub();
        const molecule = moleculeStub({ environment: true });
        let done = false;
        const settled = followOrigin(sceneOf(mapDisplay, [molecule]), [0, 0, 0])
            .then(() => { done = true; });

        // The molecule work resolves on its own; the map is still outstanding.
        await Promise.resolve();
        await Promise.resolve();
        expect(done).toBe(false);
        mapDisplay.finish();
        await settled;
        expect(done).toBe(true);
        expect(molecule.calls).toContain("environment:/1/A/42");
    });
});
