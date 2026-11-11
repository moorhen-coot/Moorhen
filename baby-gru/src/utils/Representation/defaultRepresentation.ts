import type { MoorhenInstance } from "../../InstanceManager/MoorhenInstance";
import type { DefaultRepresentationStyle } from "../../store/sceneSettingsSlice";

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
