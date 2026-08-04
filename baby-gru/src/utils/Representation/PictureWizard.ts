import type { MoorhenMolecule } from "../MoorhenMolecule";
import type { MoleculeRepresentation } from "./MoorhenMoleculeRepresentation";
import { createRepresentation } from "./RepresentationBuilder";

export type PictureWizardType = "site-and-ribbons" | "bonds" | "ribbons-and-ligands" | "catrace";

export type PictureWizardRuleType = "ligands" | "cid";

export interface RunPictureWizardParams {
    molecule: MoorhenMolecule;
    wizardType: PictureWizardType;
    ruleType?: PictureWizardRuleType;
    ligandSelection?: string | null;
    cid?: string;
    neighboursDistance?: number;
    deleteExisting?: boolean;
    setBusy?: (busy: boolean) => void;
    onRepresentationAdded?: (representation: MoleculeRepresentation) => void;
    onRepresentationRemoved?: (representation: MoleculeRepresentation) => void;
    onApply?: () => void;
}

interface CreateWizardRepresentationParams {
    molecule: MoorhenMolecule;
    neighboursDistance: number;
    ruleType: "molecule" | "cid";
    representationStyle: "CBs" | "CRs" | "CAs" | "allHBonds";
    neighboursCid?: string;
    restrictToNeighbours?: boolean;
    excludeNeighbours?: boolean;
    cid?: string;
    sideChainOnly?: boolean;
    setBusy?: (busy: boolean) => void;
    onRepresentationAdded?: (representation: MoleculeRepresentation) => void;
    onApply?: () => void;
}

/**
 * Create a single "wizard-style" representation (one step of the picture
 * wizard) via the core representation builder. Fires onRepresentationAdded /
 * onApply when the representation is successfully created.
 */
async function createWizardRepresentation(params: CreateWizardRepresentationParams): Promise<MoleculeRepresentation | null> {
    const { molecule, neighboursDistance, setBusy, onRepresentationAdded, onApply } = params;

    setBusy?.(true);

    const representation = await createRepresentation({
        ...params,
        molecule,
        neighboursDistance,
        hbondedTo: params.restrictToNeighbours ?? false,
        isCustom: true,
    });

    if (representation) {
        onRepresentationAdded?.(representation);
        onApply?.();
    }

    setBusy?.(false);

    return representation;
}

/**
 * Run the "Picture Wizard" for a molecule: optionally delete the existing
 * representations, then create the set of representations implied by the
 * given wizard type. This is React-free so it can be reused by Moorhen core
 * (e.g. moorhenInstance.representation.wizard). Returns the created
 * representations.
 */
export async function runPictureWizard(params: RunPictureWizardParams): Promise<MoleculeRepresentation[]> {
    const {
        molecule,
        wizardType,
        ruleType = "ligands",
        ligandSelection = null,
        cid = "/*/*/*/*:*",
        neighboursDistance = 6.0,
        deleteExisting = true,
        setBusy,
        onRepresentationAdded,
        onRepresentationRemoved,
        onApply,
    } = params;

    const createdRepresentations: MoleculeRepresentation[] = [];

    if (deleteExisting) {
        setBusy?.(true);
        molecule.representations.forEach(rep => {
            molecule.removeRepresentation(rep.uniqueId);
            onRepresentationRemoved?.(rep);
        });
        molecule.clearBuffersOfStyle("environment");
        setBusy?.(false);
    }

    let splitLigands: string[] = [];
    if (wizardType === "site-and-ribbons" || wizardType === "ribbons-and-ligands") {
        if (ruleType === "ligands") {
            let theLigandSelection = ligandSelection ?? "";
            if (!theLigandSelection && molecule.ligands && molecule.ligands.length > 0) {
                theLigandSelection = molecule.ligands.map(x => x.cid).join("||");
            }
            if (theLigandSelection) {
                splitLigands = theLigandSelection.split("||");
            } else if (wizardType === "site-and-ribbons") {
                // Binding-site style needs a ligand to build a site around; nothing to draw.
                return createdRepresentations;
            }
            // For "ribbons" with no ligand, splitLigands stays empty so the ribbon
            // (CRs) representation below is still created.
        } else if (ruleType === "cid") {
            splitLigands = cid.split("||");
        }
    }

    if (wizardType === "site-and-ribbons") {
        if (splitLigands.length > 0) {
            if (splitLigands.length > 3) {
                createdRepresentations.push(
                    await createWizardRepresentation({ molecule, neighboursDistance, setBusy, onRepresentationAdded, onApply, ruleType: "molecule", representationStyle: "CBs", neighboursCid: splitLigands.join("||"), restrictToNeighbours: true, sideChainOnly: true })
                );
                createdRepresentations.push(
                    await createWizardRepresentation({ molecule, neighboursDistance, setBusy, onRepresentationAdded, onApply, ruleType: "molecule", representationStyle: "allHBonds", neighboursCid: splitLigands.join("||"), restrictToNeighbours: true })
                );
            } else {
                for (let ilig = 0; ilig < splitLigands.length; ilig++) {
                    createdRepresentations.push(
                        await createWizardRepresentation({ molecule, neighboursDistance, setBusy, onRepresentationAdded, onApply, ruleType: "molecule", representationStyle: "CBs", neighboursCid: splitLigands[ilig], restrictToNeighbours: true, sideChainOnly: true })
                    );
                    createdRepresentations.push(
                        await createWizardRepresentation({ molecule, neighboursDistance, setBusy, onRepresentationAdded, onApply, ruleType: "molecule", representationStyle: "allHBonds", neighboursCid: splitLigands[ilig], restrictToNeighbours: true })
                    );
                }
            }
        }
        createdRepresentations.push(
            await createWizardRepresentation({ molecule, neighboursDistance, setBusy, onRepresentationAdded, onApply, ruleType: "molecule", representationStyle: "CRs" })
        );
    } else if (wizardType === "ribbons-and-ligands") {
        if (splitLigands.length > 0) {
            createdRepresentations.push(
                await createWizardRepresentation({ molecule, neighboursDistance, setBusy, onRepresentationAdded, onApply, ruleType: "cid", representationStyle: "CBs", cid: splitLigands.join("||") })
            );
        }
        createdRepresentations.push(
            await createWizardRepresentation({ molecule, neighboursDistance, setBusy, onRepresentationAdded, onApply, ruleType: "molecule", representationStyle: "CRs" })
        );
    } else if (wizardType === "catrace") {
        createdRepresentations.push(
            await createWizardRepresentation({ molecule, neighboursDistance, setBusy, onRepresentationAdded, onApply, ruleType: "molecule", representationStyle: "CAs" })
        );
    } else if (wizardType === "bonds") {
        createdRepresentations.push(
            await createWizardRepresentation({ molecule, neighboursDistance, setBusy, onRepresentationAdded, onApply, ruleType: "molecule", representationStyle: "CBs" })
        );
    }

    return createdRepresentations;
}
