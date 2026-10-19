import { v4 as uuidv4 } from "uuid";
import { MoorhenVector } from "../store/vectorsSlice";

/**
 * A default vector, in one place.
 *
 * This existed three times over - in MoorhenDevMenu, MoorhenVectorsModal and
 * MoorhenNOERestraints - as three near-identical local `newVector()` functions. The copies were
 * not merely redundant: `customTags` was added to MoorhenVector without any of them learning
 * about it, so `newNOEVector.customTags.push("ambiguous")` threw for every NOE row with its
 * ambiguity flag set. One factory is what stops a field added to the type from reaching none of
 * the places that build one.
 *
 * `radius` is the one value the three copies disagreed about: the modal set 0.07 and the other
 * two left it undefined. Nothing was drawn differently, because vectorsDraw.ts reads it as
 * `vec.radius ? vec.radius : 0.07` - the modal was stating the fallback. It is stated here
 * instead, so the default is in the default rather than in the renderer.
 *
 * @param overrides - Fields to set on the new vector, in place of their defaults.
 */
export const newVector = (overrides: Partial<MoorhenVector> = {}): MoorhenVector => ({
    coordsMode: "atoms",
    labelMode: "none",
    labelText: "vector label",
    drawMode: "cylinder",
    arrowMode: "none",
    xFrom: 0.0,
    yFrom: 0.0,
    zFrom: 0.0,
    xTo: 0.0,
    yTo: 0.0,
    zTo: 0.0,
    cidFrom: "",
    cidTo: "",
    molFromUniqueId: "",
    molToUniqueId: "",
    uniqueId: uuidv4(),
    vectorColour: { r: 0, g: 0, b: 0 },
    textColour: { r: 0, g: 0, b: 0 },
    radius: 0.07,
    // Present rather than optional-and-absent, so a caller may push to it without checking.
    // This is the field whose absence was the bug.
    customTags: [],
    ...overrides
});
