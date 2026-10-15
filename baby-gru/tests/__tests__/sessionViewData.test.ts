/**
 * The session's view data survives being written to a file and read back.
 *
 * WHY THIS EXISTS
 *
 * A session field lives in three places: the `viewDataSession` type, the code that fills it in
 * MoorhenTimeCapsule, and the `ViewDataSession` message in MoorhenSession.proto. TypeScript checks
 * the first two against each other and knows nothing about the third, so a field added to the type
 * and the save code but not to the .proto compiles, type-checks, and is then silently discarded by
 * `Session.encode`.
 *
 * That is not hypothetical: `eyeDistance` was added to the type, the save and the restore without
 * being declared in the .proto. It survived automatic backups, which go through JSON.stringify and
 * keep everything, and was dropped from saved session files, which go through protobuf - so a
 * session saved with the eye at 400 came back claiming 250, and its fog, stored as a distance from
 * the eye, landed about 150A out.
 *
 * TWO GUARDS, AND THEY CATCH DIFFERENT THINGS
 *
 * The fixture below is typed `Required<viewDataSession>`, so adding any field to the type - even an
 * optional one - stops this file compiling until the fixture covers it. The round trip then checks
 * the .proto carries what the fixture holds. Between them, a field cannot reach the type without
 * also reaching the wire.
 */
import { describe, expect, it } from "@jest/globals";
import { moorhensession } from "../../src/protobuf/MoorhenSession";
import type { viewDataSession } from "../../src/utils/MoorhenTimeCapsule";

/**
 * Every field, with a distinct value.
 *
 * Distinct because a round trip that moved two fields' contents into each other would pass against
 * repeated values. Every value is exactly representable in float32 - integers and halves, quarters
 * and eighths - because the wire type is float32 and 0.1 comes back as 0.10000000149011612. That
 * lets the comparison below be exact equality, which is what makes a drift test worth having: a
 * tolerance would also swallow a field that came back subtly wrong rather than merely imprecise.
 */
const fullViewData: Required<viewDataSession> = {
    origin: [-11, -22, -33],
    backgroundColor: [0.25, 0.5, 0.75, 1],
    ambientLight: [0.125, 0.25, 0.375, 1],
    diffuseLight: [0.5, 0.625, 0.75, 1],
    lightPosition: [10, 20, 30, 1],
    specularLight: [0.8125, 0.875, 0.9375, 1],
    specularPower: 64,
    fogStart: 392,
    fogEnd: 421,
    zoom: 2.5,
    doDrawClickedAtomLines: true,
    clipStart: -8,
    clipEnd: 21,
    quat4: [0, 0, 0, -1],
    shadows: true,
    ssao: { enabled: true, radius: 3.5, bias: 0.125 },
    edgeDetection: {
        enabled: true,
        depthScale: 1.5,
        normalScale: 2.5,
        depthThreshold: 0.75,
        normalThreshold: 0.25,
    },
    doPerspectiveProjection: true,
    eyeDistance: 400,
    blur: { enabled: true, depth: 0.5, radius: 7 },
};

/** What a saved session file does to it: fromObject, encode, decode, toObject. */
const throughAFile = (viewData: Partial<viewDataSession>): Record<string, any> => {
    const message = moorhensession.ViewDataSession.fromObject(viewData as any);
    const bytes = moorhensession.ViewDataSession.encode(message).finish();
    return moorhensession.ViewDataSession.toObject(moorhensession.ViewDataSession.decode(bytes));
};

describe("writing the view data to a session file", () => {
    it("brings every field back", () => {
        // The failure this is really for: a field is in the type and the save code but not the
        // .proto, so it vanishes here and nothing else notices.
        const returned = throughAFile(fullViewData);
        const missing = Object.keys(fullViewData).filter(key => returned[key] === undefined);
        expect(missing).toEqual([]);
    });

    it("brings every field back with the value it was given", () => {
        const returned = throughAFile(fullViewData);
        Object.entries(fullViewData).forEach(([key, value]) => {
            expect({ [key]: returned[key] }).toEqual({ [key]: value });
        });
    });

    it("keeps the eye distance, which fog is measured from", () => {
        // Named separately because it is the one that got away, and because losing it is not a
        // missing number: fogStart and fogEnd are distances from the eye, so an eye that reads
        // back as something else moves the whole slab.
        expect(throughAFile(fullViewData).eyeDistance).toBe(400);
    });
});

describe("reading a session written before a field existed", () => {
    it("reports the eye distance as absent rather than as zero", () => {
        // Why the .proto says `optional`. A proto3 float has no explicit presence, so an absent
        // one decodes as 0 - and the restore's `?? 250` only catches null and undefined. Every
        // older session would arrive claiming an eye at the origin, which is worse than the bug
        // the field was added to fix, and would look like a correct change.
        const { eyeDistance, ...withoutTheEye } = fullViewData;
        const returned = throughAFile(withoutTheEye);

        expect(returned.eyeDistance).toBeUndefined();
        expect(returned.eyeDistance ?? 250).toBe(250);
    });

    it("is otherwise unaffected", () => {
        const { eyeDistance, ...withoutTheEye } = fullViewData;
        const returned = throughAFile(withoutTheEye);
        expect(returned.fogStart).toBe(392);
        expect(returned.fogEnd).toBe(421);
        expect(returned.clipStart).toBe(-8);
        expect(returned.clipEnd).toBe(21);
    });
});
