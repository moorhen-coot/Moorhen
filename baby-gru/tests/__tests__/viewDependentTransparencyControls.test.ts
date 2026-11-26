/**
 * The controls that decide which surfaces thicken at their edges.
 *
 * The effect itself is tested in viewDependentTransparency.test.ts. This is about the two switches
 * that drive it: a map's, which lives in the store beside the other map contour settings, and a
 * representation's, which lives on the representation beside its opacity.
 *
 * The property worth holding onto is that it reaches the *buffers* - the shader reads a uniform
 * per buffer, so a switch that updates some state and never touches a buffer is a switch that
 * does nothing, and nothing about the picture would say so.
 */
import { describe, expect, it } from "@jest/globals";
import mapContourSettingsReducer, {
    setMapAlpha, setMapViewDependentTransparency,
} from "../../src/store/mapContourSettingsSlice";

const initial = () => mapContourSettingsReducer(undefined, { type: "@@INIT" });

describe("the map switch, in the store", () => {
    it("starts off for every map", () => {
        expect(initial().mapViewDependentTransparency).toEqual([]);
    });

    it("turns on and off again for one map without disturbing another", () => {
        let state = initial();
        state = mapContourSettingsReducer(state, setMapViewDependentTransparency({ molNo: 0, enabled: true }));
        state = mapContourSettingsReducer(state, setMapViewDependentTransparency({ molNo: 1, enabled: true }));
        expect([...state.mapViewDependentTransparency].sort()).toEqual([0, 1]);

        state = mapContourSettingsReducer(state, setMapViewDependentTransparency({ molNo: 0, enabled: false }));
        expect(state.mapViewDependentTransparency).toEqual([1]);
    });

    it("does not list a map twice when switched on again", () => {
        let state = initial();
        state = mapContourSettingsReducer(state, setMapViewDependentTransparency({ molNo: 3, enabled: true }));
        state = mapContourSettingsReducer(state, setMapViewDependentTransparency({ molNo: 3, enabled: true }));
        expect(state.mapViewDependentTransparency).toEqual([3]);
    });

    it("is independent of the opacity it accompanies", () => {
        // Deliberately not coupled in the store: the interface disables the switch while a map is
        // solid, but turning the opacity back down should find the switch as it was left rather
        // than silently off.
        let state = initial();
        state = mapContourSettingsReducer(state, setMapViewDependentTransparency({ molNo: 0, enabled: true }));
        state = mapContourSettingsReducer(state, setMapAlpha({ molNo: 0, alpha: 1.0 }));
        expect(state.mapViewDependentTransparency).toEqual([0]);
    });
});

describe("a map, reading its own setting", () => {
    /** Only what getMapContourParams touches. */
    const mapWith = (enabled: number[]) => {
        const store = {
            getState: () => ({
                mapContourSettings: {
                    mapRadii: [], contourLevels: [], mapAlpha: [], mapStyles: [],
                    mapColours: [], negativeMapColours: [], positiveMapColours: [],
                    mapViewDependentTransparency: enabled,
                },
            }),
        };
        return { molNo: 7, store };
    };

    it("is on only for a map that is listed", async () => {
        const { MoorhenMap } = await import("../../src/utils/MoorhenMap");
        const read = MoorhenMap.prototype.getMapContourParams;
        expect(read.call({ ...mapWith([7]) }).viewDependentTransparency).toBe(true);
        expect(read.call({ ...mapWith([1, 2]) }).viewDependentTransparency).toBe(false);
        expect(read.call({ ...mapWith([]) }).viewDependentTransparency).toBe(false);
    });

    it("is off for a session saved before the setting existed", async () => {
        // The list is absent entirely from an older stored state, which must read as "no maps"
        // rather than throwing on the way to drawing anything at all.
        const { MoorhenMap } = await import("../../src/utils/MoorhenMap");
        const store = {
            getState: () => ({
                mapContourSettings: {
                    mapRadii: [], contourLevels: [], mapAlpha: [], mapStyles: [],
                    mapColours: [], negativeMapColours: [], positiveMapColours: [],
                },
            }),
        };
        expect(MoorhenMap.prototype.getMapContourParams
            .call({ molNo: 7, store }).viewDependentTransparency).toBe(false);
    });
});

describe("a representation's switch", () => {
    /** Only what setViewDependentTransparency touches. */
    const representationWith = (buffers: { viewDependentTransparency?: boolean }[]) => {
        const dispatched: unknown[] = [];
        return {
            dispatched,
            representation: {
                viewDependentTransparency: false,
                buffers,
                parentMolecule: { store: { dispatch: (action: unknown) => dispatched.push(action) } },
            },
        };
    };

    it("reaches every buffer, which is the only thing the shader reads", async () => {
        const { MoleculeRepresentation } =
            await import("../../src/utils/Representation/MoorhenMoleculeRepresentation");
        const { representation, dispatched } = representationWith([{}, {}, {}]);
        MoleculeRepresentation.prototype.setViewDependentTransparency
            .call(representation, true);
        expect(representation.viewDependentTransparency).toBe(true);
        expect(representation.buffers.map(b => b.viewDependentTransparency)).toEqual([true, true, true]);
        // A uniform changes nothing until something draws, and a switch asks for no frame itself.
        expect(dispatched).toHaveLength(1);
    });

    it("turns off again", async () => {
        const { MoleculeRepresentation } =
            await import("../../src/utils/Representation/MoorhenMoleculeRepresentation");
        const { representation } = representationWith([{ viewDependentTransparency: true }]);
        MoleculeRepresentation.prototype.setViewDependentTransparency
            .call(representation, false);
        expect(representation.buffers[0].viewDependentTransparency).toBe(false);
    });

    it("survives a representation with no buffers yet", async () => {
        // Set before anything is drawn - from a restored session, or from the card before Apply.
        const { MoleculeRepresentation } =
            await import("../../src/utils/Representation/MoorhenMoleculeRepresentation");
        const representation = { viewDependentTransparency: false, buffers: null, parentMolecule: null };
        expect(() => MoleculeRepresentation.prototype.setViewDependentTransparency
            .call(representation, true)).not.toThrow();
        expect(representation.viewDependentTransparency).toBe(true);
    });
});

describe("rebuilding a representation", () => {
    it("re-applies the switch wherever it re-applies the opacity", async () => {
        // Fresh buffers start without it, so anything that rebuilds has to put it back. The two
        // sites are the ones that already restore nonCustomOpacity; checked as source because
        // exercising them needs a molecule, a renderer and Coot.
        const { readFileSync } = await import("fs");
        const { join } = await import("path");
        const source = readFileSync(join(
            __dirname, "../../src/utils/Representation/MoorhenMoleculeRepresentation.ts"), "utf8");
        const opacityRestores = source.match(/this\.setNonCustomOpacity\(this\.nonCustomOpacity\)/g) ?? [];
        const switchRestores = source.match(/this\.setViewDependentTransparency\(true\)/g) ?? [];
        expect(opacityRestores.length).toBeGreaterThan(0);
        expect(switchRestores.length).toBe(opacityRestores.length);
    });
});
