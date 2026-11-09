/**
 * Restoring a representation's identity from a session.
 *
 * WHY A REPRESENTATION NEEDS A STABLE ID AT ALL
 *
 * Its uniqueId is a guid minted in the constructor, and restoring a session rebuilds every
 * representation through addRepresentation - so until the session format carried the id, every
 * reload gave the same ribbons a different name. Nothing noticed, because the id was only ever
 * used within one run: React keys, finding a representation to edit, removing one. The moment
 * anything saved refers to a representation - a movie's per-object fades being the case in hand -
 * a regenerated id means a reference that no longer points at anything, and the symptom is not an
 * error but a movie that quietly stops fading.
 *
 * WHY THIS IS A FUNCTION RATHER THAN A LINE
 *
 * Minting the id guaranteed it was unique. Reading it from a file does not: a file can be
 * hand-edited, generated, or stitched together from two sessions. A collision would be worse than
 * a regenerated id, because two representations answering to one name makes the wrong one get
 * edited or deleted. So a stored id is taken only if it is free, and otherwise the freshly minted
 * one stands - which is exactly the behaviour that existed before, applied to the one case where
 * the file cannot be trusted.
 */

/**
 * Which id a restored representation should carry.
 *
 * @param stored  the id the session recorded, if it recorded one. Sessions written before the
 *                field existed have none, and protobuf decodes an absent string as "", which is
 *                not a legitimate id either - so both arrive here as something falsy.
 * @param taken   ids already given out during this restore.
 * @param fresh   the guid the representation was constructed with, used when the stored id cannot
 *                be.
 */
export const representationIdForRestore = (
    stored: string | null | undefined,
    taken: ReadonlySet<string>,
    fresh: string,
): string => (stored && !taken.has(stored) ? stored : fresh);
