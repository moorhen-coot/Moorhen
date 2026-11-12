/**
 * Loading a Gaussian Cube as one or more maps.
 *
 * The cube is parsed, each of its fields is written out as an MRC buffer and handed to the same
 * Coot entry point an ordinary map file uses. From there on it *is* a map: Coot contours it, the
 * existing draw settings apply, and a signed field is flagged as a difference map so the positive
 * and negative lobes come out as one object in two colours - which is what an orbital wants and
 * what Moorhen already knows how to draw.
 *
 * A multi-field cube becomes several maps, which is why this returns a list.
 */

import { MoorhenMap } from "./MoorhenMap";
import { cubeFieldName, parseCubeFile, type CubeGrid } from "./cubeFile";
import { cubeFieldToMrc } from "./cubeToMap";
import type { MoorhenInstance } from "../InstanceManager";

/** The extensions this reader claims. */
export const CUBE_EXTENSIONS = [".cube", ".cub"] as const;

/** Whether a file name is one this reader should take. Case-insensitive; writers vary. */
export const isCubeFileName = (name: string): boolean =>
    CUBE_EXTENSIONS.some(extension => name.toLowerCase().endsWith(extension));

/**
 * Read a cube file and load every field in it into Coot as a map.
 *
 * @returns one map per field, in the order the file lists them.
 */
export async function loadCubeFile(
    file: File, moorhenInstance: MoorhenInstance,
): Promise<MoorhenMap[]> {
    const grid = parseCubeFile(await file.text());
    const maps: MoorhenMap[] = [];

    for (let position = 0; position < grid.fields.length; position++) {
        const field = grid.fields[position];
        const name = cubeFieldName(file.name, grid.fields.length, position, field.index);
        const { buffer, centre, safeRadius, clipsSignificantDensity } = cubeFieldToMrc(
            grid, field.values, {
                label: `Gaussian Cube ${file.name} field ${position + 1}`,
                asDifferenceMap: field.signed,
            });
        if (clipsSignificantDensity) {
            console.warn(
                `${name}: the grid is too tight around the orbital to show all of it at once. `
                + `Contouring beyond ${safeRadius.toFixed(2)} A would show periodic copies, so the `
                + "outermost density is clipped instead.");
        }

        // Signed fields are flagged as difference maps, which is what gives an orbital its two
        // surfaces in two colours. A field that never goes negative - a density cube rather than
        // a wavefunction - is not, because a negative contour of it would be empty and the second
        // colour would be furniture.
        const map = await MoorhenMap.loadToCootFromMapData(
            buffer, name, field.signed, moorhenInstance);

        map.isCube = true;
        // Stated outright rather than left to initialise(), which infers it from the same
        // "P1 and all angles 90" shape that the conversion has just had to step around. An orbital
        // is drawn whole, at its own centre, whatever the header now says about the cell.
        map.isOriginLocked = true;
        map.suggestedContourLevel = grid.suggestedLevel ?? defaultLevelFor(field.values);
        // Negated: Moorhen states a map's centre as the origin that puts it in view.
        map.mapCentre = centre.map(coord => -coord) as [number, number, number];
        map.drawOrigin = map.mapCentre;
        // Not a preference but a limit - past this the cell repeats and the orbital is drawn
        // several times over. The map card has no radius slider for a cube for the same reason.
        map.suggestedRadius = safeRadius;
        maps.push(map);
    }

    return maps;
}

/**
 * A contour level for a file that suggests none.
 *
 * Two sigma, which is the sort of level a person would reach for by hand, and far better than a
 * constant: the useful level for an orbital depends on how diffuse it is, and these fields range
 * over orders of magnitude between one basis set and another.
 */
export const defaultLevelFor = (values: Float32Array): number => {
    if (values.length === 0) return 0;
    let sum = 0;
    for (let i = 0; i < values.length; i++) sum += values[i];
    const mean = sum / values.length;
    let squares = 0;
    for (let i = 0; i < values.length; i++) {
        const d = values[i] - mean;
        squares += d * d;
    }
    return 2 * Math.sqrt(squares / values.length);
};
