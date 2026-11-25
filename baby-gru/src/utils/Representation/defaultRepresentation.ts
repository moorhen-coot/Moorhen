import type { MoorhenInstance } from "../../InstanceManager/MoorhenInstance";
import type { DefaultRepresentationStyle } from "../../store/sceneSettingsSlice";
import { addCustomRepresentation } from "../../store/moleculesSlice";
import type { MoorhenMolecule } from "../MoorhenMolecule";
import { MoleculeRepresentation } from "./MoorhenMoleculeRepresentation";

/** Default styles made of several representations, drawn by the picture wizard */
const WIZARD_STYLES = ["ribbons-and-ligands", "ribbons-and-side-chains", "site-and-ribbons"] as const;

/**
 * Draw a molecule in a scene's default style (sceneSettings.defaultRepresentationStyle): when it
 * is loaded, and when a scene that has not seen it is shown.
 * @param deleteExisting - Remove the molecule's existing representations first (wizard styles).
 */
export const drawDefaultRepresentation = async (
    instance: MoorhenInstance,
    moleculeUniqueId: string,
    style: DefaultRepresentationStyle,
    deleteExisting: boolean = false
): Promise<void> => {
    if ((WIZARD_STYLES as readonly string[]).includes(style)) {
        await instance.representation.wizard(moleculeUniqueId, style as (typeof WIZARD_STYLES)[number], deleteExisting);
    } else {
        await instance.representation.create(moleculeUniqueId, { representationStyle: style as "CBs" | "CAs" | "CRs" });
    }
};

/**
 * Draw a new ligand molecule as bonds, a custom representation as every loaded molecule's (listed and
 * edited in the interface: molecule card chips, ligand list styles). For a molecule not yet in the
 * store, which instance.representation.create cannot find; its atoms are fetched first if needed.
 */
export const drawLigandBonds = async (molecule: MoorhenMolecule): Promise<void> => {
    if (molecule.atomsDirty) await molecule.updateAtoms();
    const representation = await MoleculeRepresentation.create({ representationStyle: "CBs", molecule });
    if (representation) molecule.store.dispatch(addCustomRepresentation(representation));
};
