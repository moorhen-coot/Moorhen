/**
 * The controls that decide which surfaces thicken at their edges.
 *
 * The effect itself is tested in viewDependentTransparency.test.ts. This is about the two switches
 * that drive it: a map representation's, which lives in its display record beside its opacity
 * (.roadmaps/map-display.md), and a molecule representation's, which lives on the representation
 * beside its opacity.
 *
 * The property worth holding onto is that it reaches the *buffers* - the shader reads a uniform
 * per buffer, so a switch that updates some state and never touches a buffer is a switch that
 * does nothing, and nothing about the picture would say so. For maps the record is the one writer:
 * a record change repaints the representation (MapRepresentation), whoever made it - the map card's
 * switch, a scene, a session, a script. That it reaches the buffers in a browser is checked in
 * tests/e2e/map-representations.spec.ts.
 */
import { describe, expect, it } from "@jest/globals";
import { readFileSync } from "fs";
import { join } from "path";
import { configureStore } from "@reduxjs/toolkit";
import mapRepresentationsReducer, {
    addMapRepresentation,
    selectMapRepresentation,
    setMapRepresentation,
    setMapRepresentationAlpha,
} from "../../src/store/mapRepresentationsSlice";
import type { MapRepresentationData } from "../../src/utils/Representation/mapRepresentationData";

const record = (id: string, changes: Partial<MapRepresentationData> = {}): MapRepresentationData => ({
    id,
    mapUid: "map-1",
    visible: true,
    contourLevel: 0.3,
    radius: { local: 15, full: 15 },
    style: "solid",
    alpha: { lines: 1, "lit-lines": 1, solid: 0.5, slice: 1 },
    colour: null,
    positiveColour: null,
    negativeColour: null,
    colourByMap: null,
    originLock: null,
    slice: null,
    viewDependentTransparency: false,
    ...changes,
});

const storeWith = (...records: MapRepresentationData[]) => {
    const store = configureStore({ reducer: { mapRepresentations: mapRepresentationsReducer } });
    records.forEach(item => store.dispatch(addMapRepresentation(item)));
    return store;
};

describe("a map representation's switch, in its record", () => {
    it("starts off for a new map", async () => {
        const { createDefaultMapRepresentationData } = await import("../../src/utils/Representation/mapRepresentationData");
        const map = { uniqueId: "map-1", showOnLoad: true, isEM: false, isDifference: false, mapRmsd: 0.2, suggestedRadius: 10 } as never;
        expect(createDefaultMapRepresentationData(map, { defaultMapLitLines: false, defaultMapSurface: false }).viewDependentTransparency).toBe(false);
    });

    it("turns on and off again for one representation without disturbing another", () => {
        const store = storeWith(record("a"), record("b"));
        store.dispatch(setMapRepresentation({ id: "a", changes: { viewDependentTransparency: true } }));
        expect(selectMapRepresentation(store.getState(), "a").viewDependentTransparency).toBe(true);
        expect(selectMapRepresentation(store.getState(), "b").viewDependentTransparency).toBe(false);
        store.dispatch(setMapRepresentation({ id: "a", changes: { viewDependentTransparency: false } }));
        expect(selectMapRepresentation(store.getState(), "a").viewDependentTransparency).toBe(false);
    });

    it("is independent of the opacity it accompanies", () => {
        // Deliberately not coupled: the interface disables the switch while a surface is solid,
        // but turning the opacity back down should find the switch as it was left rather than
        // silently off.
        const store = storeWith(record("a", { viewDependentTransparency: true }));
        store.dispatch(setMapRepresentationAlpha({ id: "a", alpha: 1 }));
        expect(selectMapRepresentation(store.getState(), "a").viewDependentTransparency).toBe(true);
    });
});

describe("a map, reading its own setting", () => {
    /** Only what getMapContourParams touches: the map's first record */
    const mapWith = async (primary: Partial<MapRepresentationData>) => {
        const { MoorhenMap } = await import("../../src/utils/MoorhenMap");
        const map = Object.assign(Object.create(MoorhenMap.prototype), { uniqueId: "map-1", molNo: 7 });
        Object.defineProperty(map, "primaryRepresentation", { get: () => primary });
        return map;
    };

    it("is on only for a map whose record says so", async () => {
        expect((await mapWith(record("a", { viewDependentTransparency: true }))).getMapContourParams().viewDependentTransparency).toBe(true);
        expect((await mapWith(record("a", { viewDependentTransparency: false }))).getMapContourParams().viewDependentTransparency).toBe(false);
    });

    it("is off for a record saved before the setting existed", async () => {
        // A scene or session written before it has records without the field, which must read
        // as off rather than throwing on the way to drawing anything at all.
        const older = record("a") as Partial<MapRepresentationData>;
        delete older.viewDependentTransparency;
        expect((await mapWith(older)).getMapContourParams().viewDependentTransparency).toBe(false);
    });
});

describe("the map switch, reaching the buffers", () => {
    const source = (path: string) => readFileSync(join(__dirname, "../../src", path), "utf8");

    it("is painted by the representation, as its opacity is: no recontouring", () => {
        const representation = source("utils/Representation/MapRepresentation.ts");
        // Part of what only needs repainting, and set on each buffer when painted
        expect(representation).toMatch(/type AppearanceKey = \{[^}]*viewDependentTransparency: boolean/);
        expect(representation).toContain("buffer.viewDependentTransparency = appearance.viewDependentTransparency");
    });

    it("is only written to the record by the switch", () => {
        // Two writers for one setting is how they drift apart: the record is the one everything
        // else (scenes, sessions, scripts) goes through.
        const accordion = source("components/card/MapCard/MapSettingsAccordion.tsx");
        expect(accordion).toContain("change({ viewDependentTransparency: !viewDependentTransparency })");
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
