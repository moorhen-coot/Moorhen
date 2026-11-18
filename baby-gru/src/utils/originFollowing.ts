/**
 * Everything in the scene that is drawn around the view centre, brought up to date at one origin.
 *
 * WHAT FOLLOWS THE ORIGIN, AND WHY IT IS A LIST
 *
 * Most of a scene is drawn once and then only looked at from different angles. A few things are
 * not: they are computed *about a point*, and that point is where the camera is looking.
 *
 *   - a map is contoured inside a sphere about the centre, so moving the centre uncovers nothing
 *     until the map is contoured again;
 *   - environment distances, the adaptive bonds and the NEF restraints are all drawn around the
 *     residue nearest the centre, so they follow whichever that is;
 *   - symmetry mates are generated for the cell images near the centre.
 *
 * In the running application these are driven by two React listeners watching the store's copy of
 * the origin - MapOriginListener per map, MoleculesOriginListener on a 500ms poll. That works for
 * a user dragging the view, where nobody minds the work landing a frame or two later and there is
 * no question of "which frame" it landed on.
 *
 * A movie being written to a file has exactly that question. An exported frame is a promise that
 * this is what the scene looked like at this moment, so the work has to be finished before the
 * frame is captured, not merely started. Neither listener can be waited for - one is a render-time
 * side effect and the other is an interval - so this is the same work expressed as something that
 * resolves when it is done.
 *
 * THE ORIGIN IS AN ARGUMENT
 *
 * Both listeners read the store. This takes the origin instead, for the same reason the camera
 * controller takes the time rather than reading a clock: during an export the store's copy is
 * deliberately not being updated, because the export is driving these updates itself and a second
 * source of them would contour arbitrary frames. The caller says where the camera is; nothing here
 * goes looking.
 */

import { getCentreAtom } from "./utils";
import type { MoorhenMolecule } from "./MoorhenMolecule";
import type { MoorhenMap } from "./MoorhenMap";
import type { CommandCentre } from "../InstanceManager/CommandCentre";
import type { MoorhenReduxStoreType } from "../store";

/** The scene's origin, in the store's negated convention. */
export type SceneOrigin = readonly [number, number, number];

/** Only what this module touches, so a test needs neither a renderer nor an instance. */
export interface OriginFollowingScene {
    molecules: MoorhenMolecule[];
    maps: MoorhenMap[];
    /** Which maps are drawn at all. A hidden map is not contoured. */
    visibleMapNumbers: number[];
    commandCentre: CommandCentre;
    store: MoorhenReduxStoreType;
}

/**
 * Contour every visible map about `origin`.
 *
 * The level, radius and style still come from the store, because those are settings rather than
 * consequences of where the camera is; only the centre is passed in. An origin-locked map ignores
 * the centre entirely, which doCootContour already knows.
 */
export const contourMapsAtOrigin = async (
    scene: OriginFollowingScene, origin: SceneOrigin,
): Promise<void> => {
    const centre = [-origin[0], -origin[1], -origin[2]] as [number, number, number];
    await Promise.all(scene.maps
        .filter(map => scene.visibleMapNumbers.includes(map.molNo))
        .map(map => {
            const { mapRadius, contourLevel, mapStyle } = map.getMapContourParams();
            return map.doCootContour(centre[0], centre[1], centre[2], mapRadius, contourLevel, mapStyle);
        }));
};

/**
 * Redraw the molecule representations that are drawn about the centre.
 *
 * All four hang off the same question - which residue is nearest the centre - so they are asked
 * once and answered together, exactly as MoleculesOriginListener does.
 */
export const redrawOriginRepresentations = async (
    scene: OriginFollowingScene, origin: SceneOrigin,
): Promise<void> => {
    const wanted = scene.molecules.filter(molecule =>
        molecule.environmentRepresentation?.visible
        || molecule.adaptativeBondsEnabled
        || molecule.symmetryOn
        || molecule.NEFRestraintRepresentation?.visible);
    if (wanted.length === 0) return;

    const [, cid] = await getCentreAtom(scene.molecules, scene.commandCentre, scene.store, origin);

    await Promise.all(wanted.flatMap(molecule => {
        const work: Promise<unknown>[] = [];
        // Symmetry is about the cell, not about a residue, so it is redrawn even when nothing was
        // near enough to name.
        if (molecule.symmetryOn) work.push(Promise.resolve(molecule.drawSymmetry()));
        if (!cid) return work;
        if (molecule.environmentRepresentation?.visible) work.push(molecule.drawEnvironment(cid));
        if (molecule.adaptativeBondsEnabled) work.push(molecule.redrawAdaptativeBonds(cid));
        if (molecule.NEFRestraintRepresentation?.visible) work.push(molecule.drawNEFRestraints(cid));
        return work;
    }));
};

/**
 * Bring the whole origin-dependent scene up to date, and resolve when it has.
 *
 * Maps and molecules together rather than in sequence: they ask different things of Coot and
 * neither depends on the other's answer, so an export frame waits for the slower of the two
 * instead of for their sum.
 */
export const followOrigin = async (
    scene: OriginFollowingScene, origin: SceneOrigin,
): Promise<void> => {
    await Promise.all([
        contourMapsAtOrigin(scene, origin),
        redrawOriginRepresentations(scene, origin),
    ]);
};
