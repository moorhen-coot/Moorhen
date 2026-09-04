import { enqueueSnackbar } from "@/store";
import type { MoorhenMolecule } from "../MoorhenMolecule";
import type { MoleculeRepresentation } from "./MoorhenMoleculeRepresentation";
import { createRepresentation, type CreateRepresentationParams } from "./RepresentationBuilder";
import { Dispatch } from "@reduxjs/toolkit";

export type PictureWizardType =
    | "site-and-ribbons"
    | "bonds"
    | "ribbons-and-ligands"
    | "ribbons-and-side-chains"
    | "catrace";

export type PictureWizardRuleType = "ligands" | "cid";

export interface RunPictureWizardParams {
    molecule: MoorhenMolecule;
    wizardType: PictureWizardType;
    ruleType?: PictureWizardRuleType;
    ligandSelection?: string | null;
    cid?: string;
    neighboursDistance?: number;
    deleteExisting?: boolean;
    onRepresentationAdded?: (representation: MoleculeRepresentation) => void;
    onRepresentationRemoved?: (representation: MoleculeRepresentation) => void;
    onApply?: () => void;
    dispatch: Dispatch;
}

/**
 * One step of the picture wizard: the parameters for one call to
 * createRepresentation, minus the ones shared by every step (molecule,
 * neighbours distance, isCustom).
 */
type WizardStep = Omit<CreateRepresentationParams, "molecule" | "neighboursDistance" | "isCustom">;

/** Ribbon: shared by every ribbon-based wizard type. */
const ribbonStep = (): WizardStep => ({ ruleType: "molecule", representationStyle: "CRs" });

/** Side chains: every non-water side chain (backbone atoms excluded) as sticks. */
const sideChainsStep = (): WizardStep => ({
    ruleType: "molecule",
    representationStyle: "CBs",
    sideChainOnly: true,
    notHOH: true,
});

/** CA trace: the alpha-carbon backbone only. */
const caTraceStep = (): WizardStep => ({ ruleType: "molecule", representationStyle: "CAs" });

/** Bonds: every atom of the molecule as sticks. */
const bondsStep = (): WizardStep => ({ ruleType: "molecule", representationStyle: "CBs" });

/** Ligands: the given CID (usually the ligand(s)) as sticks. */
const ligandsStep = (cid: string): WizardStep => ({ ruleType: "ligands", representationStyle: "CBs", cid });

/** Side chains of the residues around the given CID (binding-site style). */
const bindingSiteSideChainsStep = (neighboursCid: string): WizardStep => ({
    ruleType: "neighbourhood",
    representationStyle: "CBs",
    neighboursCid,
    restrictToNeighbours: true,
    sideChainOnly: true,
});

/** H-bonds around the given CID (binding-site style). */
const bindingSiteHBondsStep = (neighboursCid: string): WizardStep => ({
    ruleType: "molecule",
    representationStyle: "allHBonds",
    neighboursCid,
    restrictToNeighbours: true,
});


function resolveLigandSelection(params: {
    molecule: MoorhenMolecule;
    ruleType: PictureWizardRuleType;
    ligandSelection: string | null;
    cid: string;
}): string[] {
    const { molecule, ruleType, ligandSelection, cid } = params;
    if (ruleType === "cid") {
        return cid.split("||");
    }
    let selection = ligandSelection ?? "";
    if (!selection && molecule.ligands && molecule.ligands.length > 0) {
        selection = molecule.ligands.map(x => x.cid).join("||");
    }
    return selection ? selection.split("||") : [];
}

interface BuildWizardStepsParams {
    wizardType: PictureWizardType;
    molecule: MoorhenMolecule;
    ruleType: PictureWizardRuleType;
    ligandSelection: string | null;
    cid: string;
    dispatch: Dispatch;
}


function buildWizardSteps(params: BuildWizardStepsParams): WizardStep[] {
    const { wizardType, molecule, ruleType, ligandSelection, cid, dispatch } = params;

    switch (wizardType) {
        case "site-and-ribbons": {
            const steps: WizardStep[] = [];
            const splitLigands = resolveLigandSelection({ molecule, ruleType, ligandSelection, cid });
            if (splitLigands.length === 0) {
                dispatch(enqueueSnackbar({
                    message: "No ligands found for binding-site style",
                    variant: "warning" }
                ));
                // Binding-site style needs a ligand to build a site around; nothing to draw.
            } else if (splitLigands.length > 3) {
                steps.push(
                    bindingSiteSideChainsStep(splitLigands.join("||")),
                    bindingSiteHBondsStep(splitLigands.join("||"))
                );
            } else {
                for (const ligand of splitLigands) {
                    steps.push(bindingSiteSideChainsStep(ligand), bindingSiteHBondsStep(ligand));
                }
            }
            steps.push(ribbonStep());
            return steps;
        }
        case "ribbons-and-ligands": {
            const splitLigands = resolveLigandSelection({ molecule, ruleType, ligandSelection, cid });
            const steps: WizardStep[] = [];
            if (splitLigands.length > 0) {
                steps.push(ligandsStep(splitLigands.join("||")));
            }
            // A bare ribbon is still drawn when there is no ligand to show.
            steps.push(ribbonStep());
            return steps;
        }
        case "ribbons-and-side-chains":
            return [sideChainsStep(), ribbonStep()];
        case "catrace":
            return [caTraceStep()];
        case "bonds":
            return [bondsStep()];
    }
}


export async function runPictureWizard(params: RunPictureWizardParams): Promise<MoleculeRepresentation[]> {
    const {
        molecule,
        wizardType,
        ruleType = "ligands",
        ligandSelection = null,
        cid = "/*/*/*/*:*",
        neighboursDistance = 6.0,
        deleteExisting = true,
        onRepresentationAdded,
        onRepresentationRemoved,
        onApply,
        dispatch,
    } = params;

    const createdRepresentations: MoleculeRepresentation[] = [];

    if (deleteExisting) {
        molecule.representations.forEach(rep => {
            molecule.removeRepresentation(rep.uniqueId);
            onRepresentationRemoved?.(rep);
        });
        molecule.clearBuffersOfStyle("environment");
    }

    const steps = buildWizardSteps({ wizardType, molecule, ruleType, ligandSelection, cid, dispatch });

    for (const step of steps) {
        const representation = await createRepresentation({
            ...step,
            molecule,
            neighboursDistance,
            hbondedTo: step.restrictToNeighbours ?? false,
            isCustom: true,
        });
        if (representation) {
            createdRepresentations.push(representation);
            onRepresentationAdded?.(representation);
            onApply?.();
        }
    }

    return createdRepresentations;
}
