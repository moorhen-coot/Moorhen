/**
 * What a session has to carry about a representation.
 *
 * Two bugs of the same shape got us here. `eyeDistance` was saved, typed and restored, but never
 * declared in the .proto, so it survived JSON backups and vanished from saved files.
 * `nonCustomOpacity` had been doing the same thing for much longer: a surface saved at half
 * opacity came back solid. Neither was caught by a test, because the tests either side of the
 * boundary both passed - the save wrote the field, the restore read it, and protobuf quietly
 * dropped it in between.
 *
 * So the test that matters here is not about particular fields. It reads the schema and checks
 * that every field the save path writes is declared in it, which is the guard the next dropped
 * field will trip over.
 */
import { describe, expect, it } from "@jest/globals";
import * as path from "path";
import * as protobuf from "protobufjs";
import { representationIdForRestore } from "../../src/utils/sessionRepresentation";

const PROTO = path.resolve(__dirname, "../../src/protobuf/MoorhenSession.proto");
const schema = protobuf.loadSync(PROTO);
const Representation = schema.lookupType("Representation");

/**
 * Every property MoorhenTimeCapsule writes for a representation.
 *
 * Kept by hand rather than derived, deliberately: adding one here and watching the test fail is
 * the moment to remember the .proto, which is the step that was missed twice.
 */
const SAVED_FIELDS = [
    "uniqueId", "cid", "style", "isCustom", "colourRules", "bondOptions", "m2tParams", "wormOptions",
    "nonCustomOpacity", "viewDependentTransparency", "resEnvOptions", "neighboursCid",
    "restrictToNeighbours", "excludeNeighbours", "hbondedToCid", "hbondedTo", "neighboursDistance",
] as const;

describe("the representation message", () => {
    it.each(SAVED_FIELDS)("declares %s, so saving it is not a no-op", field => {
        expect(Object.keys(Representation.fields)).toContain(field);
    });

    it("carries an identity and an opacity through an encode and decode", () => {
        // The two that were being dropped, proven over the real schema rather than argued from
        // reading it.
        const saved = {
            uniqueId: "rep-1234", cid: "/*/*/*/*:*", style: "MolecularSurface",
            isCustom: false, nonCustomOpacity: 0.5,
        };
        const bytes = Representation.encode(Representation.create(saved)).finish();
        const restored = Representation.toObject(Representation.decode(bytes));

        expect(restored.uniqueId).toBe("rep-1234");
        expect(restored.nonCustomOpacity).toBeCloseTo(0.5, 5);
    });

    it("carries a worm's radii through an encode and decode", () => {
        const wormOptions = {
            radiusSource: "custom", bFactorScale: 0.05, uniformRadius: 1, axialSampling: 8, angularSampling: 16,
            residueRadii: [
                { chainId: "A", resNo: 34, insCode: "B", radius: 2.5 },
                { chainId: "A", resNo: 35, insCode: "", radiusAniso: [1, 2, 3] },
            ],
        };
        const bytes = Representation.encode(Representation.create({ style: "Worm", wormOptions })).finish();
        const restored = Representation.toObject(Representation.decode(bytes)) as { wormOptions: typeof wormOptions };

        expect(restored.wormOptions.radiusSource).toBe("custom");
        expect(restored.wormOptions.axialSampling).toBe(8);
        expect(restored.wormOptions.angularSampling).toBe(16);
        expect(restored.wormOptions.bFactorScale).toBeCloseTo(0.05, 6);
        expect(restored.wormOptions.residueRadii[0]).toMatchObject({ chainId: "A", resNo: 34, insCode: "B" });
        expect(restored.wormOptions.residueRadii[0].radius).toBeCloseTo(2.5, 6);
        expect(restored.wormOptions.residueRadii[1].radiusAniso).toEqual([1, 2, 3]);
    });

    it("tells a fully transparent representation from one that never said", () => {
        // Why nonCustomOpacity is `optional`. Zero is a legitimate opacity, so without explicit
        // presence an absent field and a deliberate zero decode identically - and reading absent
        // as zero would turn every representation in every older session invisible.
        const transparent = Representation.toObject(
            Representation.decode(
                Representation.encode(Representation.create({ nonCustomOpacity: 0 })).finish()),
            { defaults: true });
        const silent = Representation.toObject(
            Representation.decode(Representation.encode(Representation.create({})).finish()),
            { defaults: true });

        expect(transparent.nonCustomOpacity).toBe(0);
        expect(silent.nonCustomOpacity ?? null).toBeNull();
    });

    it("carries the edge-density switch through an encode and decode", () => {
        // The companion to nonCustomOpacity and the same trap: it is saved and restored, so if it
        // were not declared here it would survive a JSON backup and vanish from a .pb session.
        const on = Representation.toObject(Representation.decode(
            Representation.encode(Representation.create({ viewDependentTransparency: true })).finish()));
        const off = Representation.toObject(Representation.decode(
            Representation.encode(Representation.create({ viewDependentTransparency: false })).finish()),
            { defaults: true });

        expect(on.viewDependentTransparency).toBe(true);
        expect(off.viewDependentTransparency).toBe(false);
    });

    it("reads an older session, which never mentioned it, as off", () => {
        const silent = Representation.toObject(
            Representation.decode(Representation.encode(Representation.create({})).finish()),
            { defaults: true });
        expect(Boolean(silent.viewDependentTransparency)).toBe(false);
    });
});

describe("the map message", () => {
    const MapData = schema.lookupType("MapDataSession");

    it("declares the edge-density switch", () => {
        expect(Object.keys(MapData.fields)).toContain("viewDependentTransparency");
    });

    it("carries it through an encode and decode, and reads an older session as off", () => {
        const on = MapData.toObject(MapData.decode(
            MapData.encode(MapData.create({ viewDependentTransparency: true })).finish()));
        const silent = MapData.toObject(
            MapData.decode(MapData.encode(MapData.create({})).finish()), { defaults: true });

        expect(on.viewDependentTransparency).toBe(true);
        expect(Boolean(silent.viewDependentTransparency)).toBe(false);
    });

    it("has not disturbed the fields around it", () => {
        // Two tags were added here in quick succession - a map slice from main, and this. A
        // collision would not fail to compile; it would silently decode one as the other.
        const tags = Object.fromEntries(
            Object.entries(MapData.fields).map(([name, field]) => [name, (field as { id: number }).id]));
        expect(tags.isCube).toBe(15);
        expect(tags.slice).toBe(16);
        expect(tags.viewDependentTransparency).toBe(17);
        expect(new Set(Object.values(tags)).size).toBe(Object.values(tags).length);
    });
});

describe("choosing a restored representation's id", () => {
    it("keeps the one the session recorded", () => {
        expect(representationIdForRestore("rep-1234", new Set(), "fresh")).toBe("rep-1234");
    });

    it("falls back to the new guid for a session written before the field existed", () => {
        // Both shapes absence arrives in: undefined from a JSON backup, "" from protobuf, which
        // decodes an absent string as empty.
        expect(representationIdForRestore(undefined, new Set(), "fresh")).toBe("fresh");
        expect(representationIdForRestore("", new Set(), "fresh")).toBe("fresh");
    });

    it("refuses an id already handed out in this restore", () => {
        // Minting guaranteed uniqueness; reading from a file does not. Two representations
        // answering to one name is worse than a regenerated id, because the wrong one then gets
        // edited or deleted.
        expect(representationIdForRestore("rep-1234", new Set(["rep-1234"]), "fresh"))
            .toBe("fresh");
    });
});
