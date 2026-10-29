/**
 * Tags: who made a drawn thing, and how it should group.
 *
 * Both Vectors and 3D objects carry them, so the matching and the migration live here rather
 * than once per type.
 *
 * Key/value rather than a flat list of strings, because the uses that already exist are not all
 * flat. "Everything XPID drew for molecule X" is two facts, and writing it as one string is what
 * led to one object's id being embedded in another's tag.
 */
export type Tags = Record<string, string>;

/** Reserved keys, so a host application and Moorhen itself do not collide by accident. */
export const TAG_SOURCE = "source";
export const TAG_MOLECULE = "molecule";

/** The values Moorhen's own code uses for `source`. */
export const SOURCE_XPID = "xpid";
export const SOURCE_NEF = "nef";
export const SOURCE_DEV_TEST = "dev-test";

/**
 * Does this thing carry all the tags asked for?
 *
 * Every pair in `query` must be present and equal; tags the candidate has in addition are
 * ignored. So `{ source: "xpid" }` matches every XPID vector and
 * `{ source: "xpid", molecule: uid }` narrows to one molecule's, which gives both the broad and
 * the narrow case from one function.
 *
 * An empty query matches everything, which is the identity you want when a filter is optional.
 * Deliberately not a substring match: the mechanism this replaces used
 * `uniqueId.includes("__TAG_NEF")`, which would also have matched `__TAG_NEFARIOUS`.
 */
export const matchesTags = (candidate: { tags?: Tags }, query: Tags): boolean => {
    const tags = candidate.tags;
    for (const key of Object.keys(query)) {
        if (!tags || tags[key] !== query[key]) {
            return false;
        }
    }
    return true;
};

/**
 * The legacy prefix, by which a tag used to be written into the `uniqueId` itself.
 *
 * Still exported because `removeVectorsMatchingIDString` takes an arbitrary string and is public,
 * so ids in the wild carry tags we cannot know about and that function has to keep working.
 */
export const LEGACY_TAG_PREFIX = "__TAG_";

/**
 * Recover tags from an identifier that encodes them the old way.
 *
 * For reading sessions saved before tags were a field. One-way and read-only: nothing writes
 * tags into an id any more, and a session written now is not expected to group correctly in an
 * older Moorhen.
 *
 * Only Moorhen's own two live tags are recognised, because they are the only ones whose
 * structure is known:
 *
 *   __TAG_XPID_<moleculeUniqueId><interaction details>  ->  { source: "xpid", molecule: <uid> }
 *   <uuid>__TAG_DEV_TEST_VECTOR                         ->  { source: "dev-test" }
 *
 * The XPID case needs the molecule ids present in the session to split the uniqueId, since the
 * molecule id runs straight into the interaction description with no separator - there is
 * nothing in the string itself that says where one ends and the other begins.
 *
 * Anything else carrying the prefix is left alone rather than guessed at: a third-party tag has
 * no structure we can assume, and its id still works with removeVectorsMatchingIDString.
 *
 * @param uniqueId - The identifier to read.
 * @param knownMoleculeIds - Molecule unique ids available to match the XPID form against.
 * @returns The tags recovered, or null if the id encodes none that we recognise.
 */
export const tagsFromLegacyId = (uniqueId: string, knownMoleculeIds: string[] = []): Tags | null => {
    if (!uniqueId.includes(LEGACY_TAG_PREFIX)) {
        return null;
    }

    if (uniqueId.includes(`${LEGACY_TAG_PREFIX}DEV_TEST_VECTOR`)) {
        return { [TAG_SOURCE]: SOURCE_DEV_TEST };
    }

    const xpid = `${LEGACY_TAG_PREFIX}XPID_`;
    const at = uniqueId.indexOf(xpid);
    if (at !== -1) {
        const remainder = uniqueId.slice(at + xpid.length);
        // Longest first, so one molecule id that happens to prefix another cannot win over it.
        const molecule = [...knownMoleculeIds]
            .sort((a, b) => b.length - a.length)
            .find(id => remainder.startsWith(id));
        return molecule
            ? { [TAG_SOURCE]: SOURCE_XPID, [TAG_MOLECULE]: molecule }
            : { [TAG_SOURCE]: SOURCE_XPID };
    }

    return null;
};

/**
 * Fill in tags on things restored from a session, leaving anything already tagged untouched.
 *
 * Returns new items rather than mutating, so it is safe to call on objects that have come
 * straight out of a parsed session and are about to be dispatched.
 */
export const withMigratedTags = <T extends { uniqueId: string; tags?: Tags }>(
    items: T[],
    knownMoleculeIds: string[] = []
): T[] =>
    items.map(item => {
        if (item.tags && Object.keys(item.tags).length > 0) {
            return item;
        }
        const recovered = tagsFromLegacyId(item.uniqueId, knownMoleculeIds);
        return recovered ? { ...item, tags: recovered } : item;
    });
