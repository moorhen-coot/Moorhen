/**
 * Tags, matching, and reading a session that pre-dates them.
 *
 * The mechanism being replaced wrote a tag into the `uniqueId` and found it again with
 * `String.includes`. The two things most worth pinning down are therefore the ones where the new
 * behaviour deliberately differs from the old: matching is exact per key rather than a substring
 * of an identifier, and a query of several pairs narrows rather than widens.
 *
 * The migration is the other half. It has to recover Moorhen's own two live tags from old
 * identifiers, leave third-party ones alone rather than guess at them, and never overwrite tags
 * that are already there.
 */
import {
    matchesTags,
    tagsFromLegacyId,
    withMigratedTags,
    LEGACY_TAG_PREFIX,
    SOURCE_DEV_TEST,
    SOURCE_XPID,
    TAG_MOLECULE,
    TAG_SOURCE,
    Tags
} from "../../src/utils/tags";

describe("matchesTags", () => {
    const xpidVector = { tags: { [TAG_SOURCE]: SOURCE_XPID, [TAG_MOLECULE]: "mol-1" } };

    test("a single pair matches everything carrying it", () => {
        expect(matchesTags(xpidVector, { [TAG_SOURCE]: SOURCE_XPID })).toBe(true);
    });

    test("several pairs narrow rather than widen", () => {
        expect(matchesTags(xpidVector, { [TAG_SOURCE]: SOURCE_XPID, [TAG_MOLECULE]: "mol-1" })).toBe(true);
        expect(matchesTags(xpidVector, { [TAG_SOURCE]: SOURCE_XPID, [TAG_MOLECULE]: "mol-2" })).toBe(false);
    });

    test("tags beyond those asked for are ignored", () => {
        expect(matchesTags({ tags: { a: "1", b: "2", c: "3" } }, { a: "1", c: "3" })).toBe(true);
    });

    test("a key the candidate lacks does not match", () => {
        expect(matchesTags(xpidVector, { [TAG_SOURCE]: SOURCE_XPID, ambiguous: "true" })).toBe(false);
    });

    test("an untagged thing matches nothing except the empty query", () => {
        expect(matchesTags({}, { [TAG_SOURCE]: SOURCE_XPID })).toBe(false);
        expect(matchesTags({}, {})).toBe(true);
    });

    test("values are compared exactly, not as substrings", () => {
        // The point of the exercise: uniqueId.includes("__TAG_NEF") would also have matched
        // "__TAG_NEFARIOUS". Tag values do not behave that way.
        expect(matchesTags({ tags: { [TAG_SOURCE]: "nefarious" } }, { [TAG_SOURCE]: "nef" })).toBe(false);
        expect(matchesTags({ tags: { [TAG_SOURCE]: "nef" } }, { [TAG_SOURCE]: "nef" })).toBe(true);
    });
});

describe("recovering tags from an old identifier", () => {
    // The real shape, from MoorhenXPIDList: the prefix, then the molecule's uniqueId, then the
    // interaction description, with no separator between the two.
    const molecule = "f1e2d3c4-0000-4000-8000-000000000001";
    const xpidId = `${LEGACY_TAG_PREFIX}XPID_${molecule}4_H12_X13_A_55pi1__B_99_0`;

    test("the XPID form yields both source and molecule", () => {
        expect(tagsFromLegacyId(xpidId, [molecule])).toEqual({
            [TAG_SOURCE]: SOURCE_XPID,
            [TAG_MOLECULE]: molecule
        });
    });

    test("without the molecule ids to hand, the source is still recovered", () => {
        // Degrades rather than guessing where the molecule id ends: there is no separator in the
        // string to find it by.
        expect(tagsFromLegacyId(xpidId, [])).toEqual({ [TAG_SOURCE]: SOURCE_XPID });
    });

    test("the longest matching molecule id wins", () => {
        // A short id that happens to prefix a longer one must not be chosen over it.
        const shortId = "mol-1";
        const longId = "mol-12345";
        const id = `${LEGACY_TAG_PREFIX}XPID_${longId}_rest_of_it`;
        expect(tagsFromLegacyId(id, [shortId, longId])![TAG_MOLECULE]).toBe(longId);
    });

    test("the dev-test form is recognised", () => {
        expect(tagsFromLegacyId(`abc-123${LEGACY_TAG_PREFIX}DEV_TEST_VECTOR`)).toEqual({
            [TAG_SOURCE]: SOURCE_DEV_TEST
        });
    });

    test("an identifier with no tag in it yields nothing", () => {
        expect(tagsFromLegacyId("f1e2d3c4-0000-4000-8000-000000000002")).toBeNull();
    });

    test("a tag we did not write is left alone rather than guessed at", () => {
        // Third-party tags have no structure we can assume, and their ids still work with
        // removeVectorsMatchingIDString, which is why that function has to stay.
        expect(tagsFromLegacyId(`xyz${LEGACY_TAG_PREFIX}SOMEONE_ELSES_THING`)).toBeNull();
    });
});

describe("withMigratedTags", () => {
    const molecule = "mol-1";

    test("fills in tags for old items and leaves new ones untouched", () => {
        const already: Tags = { [TAG_SOURCE]: "something-deliberate" };
        const items = [
            { uniqueId: `${LEGACY_TAG_PREFIX}XPID_${molecule}_detail` },
            { uniqueId: "plain-uuid" },
            { uniqueId: `${LEGACY_TAG_PREFIX}XPID_${molecule}_other`, tags: already }
        ];
        const out = withMigratedTags(items, [molecule]);

        expect(out[0].tags).toEqual({ [TAG_SOURCE]: SOURCE_XPID, [TAG_MOLECULE]: molecule });
        expect(out[1].tags).toBeUndefined();
        // An item that already says what it is wins over anything inferred from its id.
        expect(out[2].tags).toBe(already);
    });

    test("an empty tags object counts as untagged, so it is still migrated", () => {
        const out = withMigratedTags([{ uniqueId: `${LEGACY_TAG_PREFIX}XPID_${molecule}_x`, tags: {} }], [molecule]);
        expect(out[0].tags).toEqual({ [TAG_SOURCE]: SOURCE_XPID, [TAG_MOLECULE]: molecule });
    });

    test("the input is not mutated", () => {
        const items = [{ uniqueId: `${LEGACY_TAG_PREFIX}DEV_TEST_VECTOR` }];
        const out = withMigratedTags(items);
        expect(items[0]).not.toHaveProperty("tags");
        expect(out[0].tags).toEqual({ [TAG_SOURCE]: SOURCE_DEV_TEST });
        expect(out[0]).not.toBe(items[0]);
    });

    test("every other field survives", () => {
        const item = { uniqueId: `${LEGACY_TAG_PREFIX}DEV_TEST_VECTOR`, radius: 0.07, labelText: "keep me" };
        expect(withMigratedTags([item])[0]).toEqual({ ...item, tags: { [TAG_SOURCE]: SOURCE_DEV_TEST } });
    });
});

describe("what the old mechanism did, for comparison", () => {
    test("the substring match this replaces was genuinely loose", () => {
        // Not a test of our code - a record of why the change was made, so the reason survives
        // alongside the behaviour.
        const nefarious = `${LEGACY_TAG_PREFIX}NEFARIOUS_thing`;
        expect(nefarious.includes(`${LEGACY_TAG_PREFIX}NEF`)).toBe(true);
        expect(matchesTags({ tags: { [TAG_SOURCE]: "nefarious" } }, { [TAG_SOURCE]: "nef" })).toBe(false);
    });
});
