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
import { readFileSync } from "fs";
import { join } from "path";
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

/**
 * The switch lives in the store, so the store is what has to reach the buffers.
 *
 * Raised in review, and right: the map card's switch applied the change itself, which left every
 * other way of dispatching it - a session restore, a script calling the exported action - changing
 * a number nothing read until the map was next contoured. The fix is the arrangement the opacity
 * already uses: one listener in MoorhenMapManager, and the switch only dispatches.
 */
describe("the map switch, reaching the buffers", () => {
    const source = (path: string) =>
        readFileSync(join(__dirname, "../../src", path), "utf8");

    it("sets the uniform on every drawn buffer and asks for a frame", async () => {
        const { MoorhenMap } = await import("../../src/utils/MoorhenMap");
        const buffers = [{ viewDependentTransparency: false }, { viewDependentTransparency: false }];
        const dispatched: unknown[] = [];
        MoorhenMap.prototype.applyViewDependentTransparency.call({
            molNo: 7,
            displayObjects: { Coot: buffers },
            getMapContourParams: MoorhenMap.prototype.getMapContourParams,
            store: {
                dispatch: (action: unknown) => dispatched.push(action),
                getState: () => ({
                    mapContourSettings: {
                        mapRadii: [], contourLevels: [], mapAlpha: [], mapStyles: [],
                        mapColours: [], negativeMapColours: [], positiveMapColours: [],
                        mapViewDependentTransparency: [7],
                    },
                }),
            },
        });
        expect(buffers.every(buffer => buffer.viewDependentTransparency)).toBe(true);
        // A uniform changed and nothing else did, so something has to ask for the next frame.
        expect(dispatched).toHaveLength(1);
    });

    it("is applied by a listener on the store, beside the one the opacity uses", () => {
        const manager = source("components/managers/maps/MoorhenMapManager.tsx");
        expect(manager).toContain("applyViewDependentTransparency");
        expect(manager).toContain("mapViewDependentTransparency.includes(map.molNo)");
        // The boolean, not the array: a dispatch about another map must not redraw this one.
        expect(manager).not.toMatch(/selector:?\s*\(state: RootState\) =>\s*state\.mapContourSettings\.mapViewDependentTransparency,/);
    });

    it("is not also applied by the switch itself", () => {
        // Two writers for one setting is how they drift apart: the one in the card would keep
        // working while the one everything else depends on quietly stopped.
        const accordion = source("components/card/MapCard/MapSettingsAccordion.tsx");
        expect(accordion).toContain("setMapViewDependentTransparency");
        expect(accordion).not.toContain("applyViewDependentTransparency");
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

describe("the scene's copy of a representation", () => {
    /**
     * A scene records its representations as build parameters of its own and rebuilds them from
     * those when it is shown - which happens *after* the session loader has restored everything
     * else. So a setting the parameters do not carry is restored and then immediately thrown
     * away, which is exactly what happened to this one: saved correctly in the session file, gone
     * by the time the scene had finished showing.
     */
    const builder = () => import("../../src/utils/Representation/RepresentationBuilder");

    it("is captured from the representation", async () => {
        const { extractRepresentationParams } = await builder();
        const params = extractRepresentationParams({
            style: "MetaBalls", cid: "//B", nonCustomOpacity: 0.47,
            viewDependentTransparency: true,
            useDefaultColourRules: true, colourRules: [], useDefaultBondOptions: true,
            useDefaultM2tParams: true, useDefaultResidueEnvironmentOptions: true,
            useDefaultGaussianSurfaceSettings: true, useDefaultWormOptions: true,
            uniqueId: "rep-1", isCustom: true, visible: true, interfaceOption: { visible: true },
        } as never);
        expect(params.viewDependentTransparency).toBe(true);
    });

    it("is captured as off when it is off", async () => {
        const { extractRepresentationParams } = await builder();
        const params = extractRepresentationParams({
            style: "CBs", cid: "//A", nonCustomOpacity: 1, viewDependentTransparency: false,
            useDefaultColourRules: true, colourRules: [], useDefaultBondOptions: true,
            useDefaultM2tParams: true, useDefaultResidueEnvironmentOptions: true,
            useDefaultGaussianSurfaceSettings: true, useDefaultWormOptions: true,
            uniqueId: "rep-2", isCustom: true, visible: true, interfaceOption: { visible: true },
        } as never);
        expect(params.viewDependentTransparency).toBe(false);
    });

    it("is applied when a scene rebuilds the representation", async () => {
        // Source-level: running the builder needs a molecule, Coot and a renderer. The pairing
        // with setNonCustomOpacity is the thing worth holding - they are restored together or
        // the scene drops one of them.
        const { readFileSync } = await import("fs");
        const { join } = await import("path");
        const source = readFileSync(join(
            __dirname, "../../src/utils/Representation/RepresentationBuilder.ts"), "utf8");
        const opacity = source.indexOf("representation.setNonCustomOpacity(nonCustomOpacity);");
        const ours = source.indexOf("representation.setViewDependentTransparency(");
        expect(opacity).toBeGreaterThan(-1);
        expect(ours).toBeGreaterThan(opacity);
        expect(source).toContain("viewDependentTransparency = existingParams?.viewDependentTransparency ?? false,");
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
