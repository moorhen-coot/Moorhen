import { ColourRule } from "../../../../../utils/MoorhenColourRule";
import { getMultiColourRuleArgs } from "../../../../../utils/utils";
import { moorhen } from "../../../../../types/moorhen";

export interface BuildCidSelectionParams {
    ruleType: "ligands" | "cid" | "molecule" | "chain" | "residue-range" | "neighbourhood";
    representationStyle: moorhen.RepresentationStyles;
    molecule: moorhen.Molecule;
    chainName: string | null;
    notHOH: boolean;
    notH: boolean;
    sideChainOnly: boolean;
    restrictToNeighbours: boolean;
    excludeNeighbours: boolean;
    neighboursCid: string;
    neighboursDistance: number;
    sequenceResidueRange: [number, number] | null;
    cid: string;
    ligandCid: string | null;
}

/**
 * Build a CID selection string based on the rule type and other parameters.
 * Returns null if the selection is invalid.
 */
export function buildCidSelection(params: BuildCidSelectionParams): string | null {
    const {
        ruleType,
        representationStyle,
        molecule: theMolecule,
        chainName,
        notHOH,
        notH,
        sideChainOnly,
        restrictToNeighbours,
        excludeNeighbours,
        neighboursCid,
        neighboursDistance,
        sequenceResidueRange,
        cid,
        ligandCid,
    } = params;

    let cidSelection: string;
    let unRestrictedCidSelection: string;

    switch (ruleType) {
        case "molecule":
        case "neighbourhood":
        case "chain":
            if (ruleType === "chain") {
                cidSelection = `//${chainName}/`;
            } else {
                cidSelection = "/*/*/";
            }
            if (
                (representationStyle === "MetaBalls" || representationStyle === "VdwSpheres" || representationStyle === "CBs") &&
                notHOH
            ) {
                cidSelection += "(!HOH)";
            } else {
                cidSelection += "*";
            }
            cidSelection += "/";
            unRestrictedCidSelection = cidSelection;
            if (
                (representationStyle === "MetaBalls" || representationStyle === "VdwSpheres" || representationStyle === "CBs") &&
                sideChainOnly
            ) {
                cidSelection += "!O,C,N,H";
            }

            if (
                (representationStyle === "MetaBalls" || representationStyle === "VdwSpheres" || representationStyle === "CBs") &&
                notH
            ) {
                cidSelection += "[!H]";
            }

            if (
                (representationStyle === "MetaBalls" || representationStyle === "VdwSpheres" || representationStyle === "CBs") &&
                restrictToNeighbours
            ) {
                const restrictedCid = window.gemmiModule.cidToNeighboursCid(
                    theMolecule.gemmiStructure,
                    unRestrictedCidSelection,
                    neighboursCid,
                    neighboursDistance,
                    excludeNeighbours
                );
                let extraRestrict = "";
                if (sideChainOnly) extraRestrict += "/!O,C,N,H";
                if (notH && !sideChainOnly) extraRestrict += "/*[!H]";
                if (notH && sideChainOnly) extraRestrict += "[!H]";
                if (!notH && !sideChainOnly) extraRestrict += "/";
                extraRestrict += ":*";
                cidSelection = restrictedCid
                    .split("||")
                    .map(r => r + extraRestrict)
                    .join("||");
            } else if (representationStyle === "CAs" && restrictToNeighbours) {
                const restrictedCid = window.gemmiModule.cidToNeighboursCid(
                    theMolecule.gemmiStructure,
                    unRestrictedCidSelection,
                    neighboursCid,
                    neighboursDistance,
                    excludeNeighbours
                );
                cidSelection = restrictedCid;
            } else {
                cidSelection += ":*";
            }
            if (
                (representationStyle === "MetaBalls" || representationStyle === "VdwSpheres" || representationStyle === "CBs") &&
                !notHOH &&
                sideChainOnly
            ) {
                if (
                    (representationStyle === "MetaBalls" ||
                        representationStyle === "VdwSpheres" ||
                        representationStyle === "CBs") &&
                    restrictToNeighbours
                ) {
                    const waterSelection = "/*/*/(HOH)";
                    const restrictedWaterCid = window.gemmiModule.cidToNeighboursCid(
                        theMolecule.gemmiStructure,
                        waterSelection,
                        neighboursCid,
                        neighboursDistance,
                        excludeNeighbours
                    );
                    if (restrictedWaterCid.length > 2) cidSelection += "||" + restrictedWaterCid;
                } else {
                    cidSelection += "||(HOH)";
                }
            }
            break;
        case "residue-range":
            cidSelection =
                sequenceResidueRange && sequenceResidueRange.length === 2
                    ? `//${chainName}/${sequenceResidueRange[0]}-${sequenceResidueRange[1]}`
                    : null;
            break;
        case "cid":
            cidSelection = cid;
            break;
        case "ligands":
            cidSelection = ligandCid;
            break;
        default:
            console.warn("Unrecognised residue selection for the custom representation");
            return null;
    }

    return cidSelection;
}

export interface BuildColourRuleParams {
    useDefaultColours: boolean;
    colourMode: string;
    ruleType: string;
    cidSelection: string;
    colour: string;
    molecule: moorhen.Molecule;
    applyColourToNonCarbonAtoms: boolean;
    ncsColourRule: ColourRule | null;
    styleSelectValue: string;
    colourModeSelectValue: string;
}

/**
 * Build a ColourRule based on the colour mode and other parameters.
 * Returns undefined if default colours should be used.
 */
export async function buildColourRule(params: BuildColourRuleParams): Promise<ColourRule | undefined> {
    const {
        useDefaultColours,
        colourMode,
        ruleType,
        cidSelection,
        colour,
        molecule,
        applyColourToNonCarbonAtoms,
        ncsColourRule,
        styleSelectValue,
        colourModeSelectValue,
    } = params;

    if (useDefaultColours) {
        return undefined;
    }

    let colourRule: ColourRule;
    const colourRuleCid = styleSelectValue === "residue_environment" ? "//*" : cidSelection;

    switch (colourMode) {
        case "custom":
            colourRule = new ColourRule(
                ruleType !== "neighbourhood" ? ruleType : "molecule",
                colourRuleCid,
                colour,
                molecule.commandCentre,
                false,
                applyColourToNonCarbonAtoms
            );
            colourRule.setArgs([colourRuleCid, colour]);
            colourRule.setParentMolecule(molecule);
            break;
        case "mol-symm":
            if (ncsColourRule) {
                colourRule = ncsColourRule;
                colourRule.setApplyColourToNonCarbonAtoms(applyColourToNonCarbonAtoms);
                break;
            }
        // falls through to the multi-colour rules if no NCS rule cached
        case "secondary-structure":
        case "jones-rainbow":
        case "b-factor":
        case "b-factor-norm":
        case "electrostatics":
        case "af2-plddt":
            colourRule = new ColourRule(
                colourMode,
                "/*/*/*/*:*",
                "#ffffff",
                molecule.commandCentre,
                true,
                applyColourToNonCarbonAtoms
            );
            colourRule.setLabel(getColourModeLabel(colourMode));
            const ruleArgs = await getMultiColourRuleArgs(molecule, colourMode);
            colourRule.setArgs([ruleArgs]);
            colourRule.setParentMolecule(molecule);
            break;
        default:
            console.log("Unrecognised colour mode");
            return undefined;
    }

    return colourRule;
}

function getColourModeLabel(colourMode: string): string {
    switch (colourMode) {
        case "secondary-structure":
            return "Secondary struct.";
        case "jones-rainbow":
            return "Jones-Rainbow";
        case "mol-symm":
            return "Mol. Symm.";
        case "b-factor":
            return "B-factor";
        case "b-factor-norm":
            return "B-factor norm.";
        case "af2-plddt":
            return "PLDDT";
        case "electrostatics":
            return "Electrostatics";
        default:
            return "";
    }
}

/**
 * Determine the non-custom alpha value based on the colour mode.
 * Returns null for custom colour mode.
 */
export function getNonCustomAlpha(colourMode: string, nonCustomOpacity: number): number | null {
    const multiColourModes = [
        "b-factor",
        "b-factor-norm",
        "secondary-structure",
        "af2-plddt",
        "electrostatics",
        "jones-rainbow",
    ];
    return multiColourModes.includes(colourMode) ? nonCustomOpacity : null;
}
