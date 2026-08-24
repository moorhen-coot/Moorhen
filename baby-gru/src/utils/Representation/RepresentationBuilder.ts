import { moorhen } from "@/types/moorhen";
import { ColourRule } from "../MoorhenColourRule";
import type { MoorhenMolecule } from "../MoorhenMolecule";
import { getMultiColourRuleArgs, parseCid } from "../utils";
import { MoleculeRepresentation, RepresentationStyles, m2tParameters, residueEnvironmentOptions } from "./MoorhenMoleculeRepresentation";

/** The supported ways a representation selection can be built. */
export type RepresentationRuleType = "ligands" | "cid" | "molecule" | "chain" | "residue-range" | "neighbourhood";

export interface BuildCidSelectionParams {
    ruleType: "ligands" | "cid" | "molecule" | "chain" | "residue-range" | "neighbourhood";
    representationStyle: RepresentationStyles;
    molecule: MoorhenMolecule;
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
    } = params;

    let cidSelection: string;
    let unRestrictedCidSelection: string;

    switch (ruleType) {
        case "molecule":
        case "neighbourhood":
        case "residue-range":
        case "chain":
            if (ruleType === "chain") {
                cidSelection = `//${chainName}/`;
            } else if (ruleType === "residue-range") {
                cidSelection =
                    sequenceResidueRange && sequenceResidueRange.length === 2
                        ? `//${chainName}/${sequenceResidueRange[0]}-${sequenceResidueRange[1]}`
                        : null;
            } else {
                cidSelection = "/*/*/";
            }
            if ((representationStyle === "MetaBalls" || representationStyle === "VdwSpheres" || representationStyle === "CBs") && notHOH) {
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

            if ((representationStyle === "MetaBalls" || representationStyle === "VdwSpheres" || representationStyle === "CBs") && notH) {
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
                    (representationStyle === "MetaBalls" || representationStyle === "VdwSpheres" || representationStyle === "CBs") &&
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

        case "cid":
        case "ligands":
            cidSelection = cid;
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
    molecule: MoorhenMolecule;
    applyColourToNonCarbonAtoms: boolean;
    ncsColourRule: ColourRule | null;
    styleSelectValue: string;
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
        case "af2-plddt": {
            colourRule = new ColourRule(colourMode, "/*/*/*/*:*", "#ffffff", molecule.commandCentre, true, applyColourToNonCarbonAtoms);
            colourRule.setLabel(getColourModeLabel(colourMode));
            const ruleArgs = await getMultiColourRuleArgs(molecule, colourMode);
            colourRule.setArgs([ruleArgs]);
            colourRule.setParentMolecule(molecule);
            break;
        }
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
    const multiColourModes = ["b-factor", "b-factor-norm", "secondary-structure", "af2-plddt", "electrostatics", "jones-rainbow"];
    return multiColourModes.includes(colourMode) ? nonCustomOpacity : null;
}

export interface CreateRepresentationParams {
    representationStyle: RepresentationStyles;
    ruleType?: "ligands" | "cid" | "molecule" | "chain" | "residue-range" | "neighbourhood";
    molecule: MoorhenMolecule;
    /**
     * When provided, the existing representation is updated in place (edit mode)
     * instead of creating a brand-new one and committing it to the molecule.
     */
    existingRepresentation?: MoleculeRepresentation;
    /** CID-selection options (all optional, with sensible defaults) */
    chainName?: string | null;
    notHOH?: boolean;
    notH?: boolean;
    sideChainOnly?: boolean;
    restrictToNeighbours?: boolean;
    excludeNeighbours?: boolean;
    neighboursCid?: string;
    neighboursDistance?: number;
    sequenceResidueRange?: [number, number] | null;
    cid?: string;
    /** Colour-related options (default to default colours) */
    useDefaultColours?: boolean;
    colourMode?: string;
    colour?: string;
    applyColourToNonCarbonAtoms?: boolean;
    ncsColourRule?: ColourRule | null;
    /** Representation-related options */
    isCustom?: boolean;
    bondOptions?: moorhen.cootBondOptions | null;
    m2tParams?: m2tParameters | null;
    residueEnvironmentOptions?: residueEnvironmentOptions | null;
    nonCustomOpacity?: number | null;
    hbondedTo?: boolean;
}

/**
 * The parameters of a MoleculeRepresentation that can be extracted and reused
 * (e.g. to pre-populate the edit dialog, or as fallback defaults in edit mode).
 */
export interface ExtractedRepresentationParams {
    representationStyle: RepresentationStyles;
    ruleType: RepresentationRuleType;
    cid: string;
    chainName: string | null;
    sequenceResidueRange: [number, number] | null;
    notHOH: boolean;
    notH: boolean;
    sideChainOnly: boolean;
    restrictToNeighbours: boolean;
    excludeNeighbours: boolean;
    neighboursCid: string;
    neighboursDistance: number;
    hbondedTo: boolean;
    useDefaultColours: boolean;
    colourMode: string;
    colour: string;
    applyColourToNonCarbonAtoms: boolean;
    ncsColourRule: ColourRule | null;
    bondOptions: moorhen.cootBondOptions | null;
    m2tParams: m2tParameters | null;
    residueEnvironmentOptions: residueEnvironmentOptions | null;
    nonCustomOpacity: number | null;
}

/**
 * The subset of creation parameters that cannot be reconstructed exactly from a
 * representation's live state (they are encoded lossily in the built CID string
 * and colour rules). Snapshot onto the representation at build time so that
 * edit mode reuses the exact original values instead of re-deriving them.
 */
export interface BuildRepresentationParams {
    ruleType: RepresentationRuleType;
    colourMode: string;
    ncsColourRule: ColourRule | null;
    notHOH: boolean;
    notH: boolean;
    sideChainOnly: boolean;
    chainName: string | null;
    sequenceResidueRange: [number, number] | null;
}

/**
 * Read the parameters off an existing representation so they can be reused in
 * edit mode (pre-populating the edit dialog, or as defaults when some creation
 * options are omitted). Values stored in `representation.buildParams` (the
 * snapshot taken at build time) are preferred for fields that would otherwise
 * be lossy to reconstruct; all other fields are read from live state.
 */
export function extractRepresentationParams(representation: MoleculeRepresentation): ExtractedRepresentationParams {
    const colourRule = representation.colourRules?.[0] ?? null;
    const snapshot = representation.buildParams;
    const colourMode = snapshot?.colourMode ?? (colourRule?.isMultiColourRule ? (colourRule?.ruleType ?? "custom") : "custom");
    const parsedCid = snapshot ? null : parseCid(representation.cid);

    return {
        representationStyle: representation.style,
        ruleType:
            snapshot?.ruleType ?? (representation.restrictToNeighbours ? "neighbourhood" : representation.interfaceOption.selectionType),
        cid: representation.cid,
        chainName: snapshot?.chainName ?? (parsedCid && parsedCid.chain !== "*" ? parsedCid.chain : null),
        sequenceResidueRange: snapshot?.sequenceResidueRange ?? parsedCid?.residueRange ?? null,
        notHOH: snapshot?.notHOH ?? representation.cid.includes("(!HOH)"),
        notH: snapshot?.notH ?? representation.cid.includes("[!H]"),
        sideChainOnly: snapshot?.sideChainOnly ?? representation.cid.includes("!O,C,N"),
        restrictToNeighbours: representation.restrictToNeighbours,
        excludeNeighbours: representation.excludeNeighbours,
        neighboursCid: representation.neighboursCid,
        neighboursDistance: representation.neighboursDistance,
        hbondedTo: representation.hbondedTo,
        useDefaultColours: representation.useDefaultColourRules,
        colourMode,
        colour: !representation.useDefaultColourRules && colourRule && !colourRule.isMultiColourRule ? colourRule.color : "",
        applyColourToNonCarbonAtoms: !representation.useDefaultColourRules && colourRule ? colourRule.applyColourToNonCarbonAtoms : false,
        ncsColourRule: colourMode === "mol-symm" ? (snapshot?.ncsColourRule ?? colourRule) : null,
        bondOptions: representation.useDefaultBondOptions ? null : representation.bondOptions,
        m2tParams: representation.useDefaultM2tParams ? null : representation.m2tParams,
        residueEnvironmentOptions: representation.useDefaultResidueEnvironmentOptions ? null : representation.residueEnvironmentOptions,
        nonCustomOpacity: representation.nonCustomOpacity,
    };
}

/** Representation styles that are internal-only and not exposed on the public API surface. */
export const INTERNAL_REPRESENTATION_STYLES = [
    "hover",
    "environment",
    "residueSelection",
    "transformation",
    "rama",
    "rotamer",
    "chemical_features",
    "ligand_validation",
    "glycoBlocks",
    "adaptativeBonds",
] as const;

/**
 * The representation styles accepted on the public API surface
 * (e.g. MoorhenInstance.newMoleculeRepresentation). Excludes internal-only
 * styles (hover highlights, validation/analysis tools, etc.) that don't make
 * sense as a user-facing creation request.
 */
export type PublicRepresentationStyles = Exclude<RepresentationStyles, (typeof INTERNAL_REPRESENTATION_STYLES)[number]>;

export async function createRepresentation(params: CreateRepresentationParams): Promise<MoleculeRepresentation | null> {
    // In edit mode, any parameter that is not explicitly provided falls back to
    // the existing representation's current value instead of a hard-coded default.
    const existingParams = params.existingRepresentation ? extractRepresentationParams(params.existingRepresentation) : undefined;

    const {
        representationStyle,
        molecule,
        notHOH = existingParams?.notHOH ?? false,
        notH = existingParams?.notH ?? false,
        sideChainOnly = existingParams?.sideChainOnly ?? false,
        restrictToNeighbours = existingParams?.restrictToNeighbours ?? false,
        excludeNeighbours = existingParams?.excludeNeighbours ?? false,
        neighboursCid = existingParams?.neighboursCid ?? "",
        neighboursDistance = existingParams?.neighboursDistance ?? 6.0,
        sequenceResidueRange = existingParams?.sequenceResidueRange ?? null,
        cid = existingParams?.cid ?? "/*/*/*/*:*",
        colourMode = existingParams?.colourMode ?? "custom",
        colour = existingParams?.colour ?? "",
        useDefaultColours = colour === "" ? (existingParams?.useDefaultColours ?? true) : false,
        applyColourToNonCarbonAtoms = existingParams?.applyColourToNonCarbonAtoms ?? false,
        ncsColourRule = existingParams?.ncsColourRule ?? null,
        isCustom = true,
        bondOptions = existingParams?.bondOptions ?? undefined,
        m2tParams = existingParams?.m2tParams ?? undefined,
        residueEnvironmentOptions = existingParams?.residueEnvironmentOptions ?? undefined,
        nonCustomOpacity = existingParams?.nonCustomOpacity ?? undefined,
        hbondedTo = existingParams?.hbondedTo ?? false,
        existingRepresentation,
    } = params;

    // Explicitly-provided CID-related params take precedence; otherwise fall back
    // to the existing selection type in edit mode (or "molecule" for new reps).
    let ruleType: RepresentationRuleType = existingParams?.ruleType ?? "molecule";
    if (params.ruleType) {
        ruleType = params.ruleType;
    } else if (params.cid) {
        ruleType = "cid";
    } else if (params.sequenceResidueRange) {
        ruleType = "residue-range";
    } else if (params.chainName) {
        ruleType = "chain";
    }

    let chainName = params.chainName ?? existingParams?.chainName ?? null;
    if (!chainName && (ruleType === "chain" || ruleType === "residue-range")) {
        console.log(`Impossible to create new representation: ${ruleType} require chainName`);
        return;
    }

    const cidSelection = buildCidSelection({
        ruleType,
        representationStyle,
        molecule,
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
    });
    if (!cidSelection) {
        console.warn("Invalid CID selection to create a custom representation");
        return null;
    }

    const colourRule = await buildColourRule({
        useDefaultColours,
        colourMode,
        ruleType: ruleType !== "neighbourhood" ? ruleType : "molecule",
        cidSelection,
        colour,
        molecule,
        applyColourToNonCarbonAtoms,
        ncsColourRule,
        styleSelectValue: representationStyle,
    });

    const isEdit = existingRepresentation != null;

    // Editing an existing representation updates it in place (and redraws it);
    // otherwise a brand-new representation is created and committed to the molecule.
    const representation = existingRepresentation ?? new MoleculeRepresentation(representationStyle, cidSelection, molecule.commandCentre);

    if (!isEdit) {
        representation.setParentMolecule(molecule);
        representation.isCustom = isCustom;
    } else {
        // Edit mode: keep the representation's identity (uniqueId/isCustom) and
        // re-apply the (possibly changed) style in place.
        representation.setStyle(representationStyle);
    }
    representation.cid = cidSelection;
    representation.restrictToNeighbours = restrictToNeighbours;
    representation.neighboursDistance = neighboursDistance;
    representation.excludeNeighbours = excludeNeighbours;
    representation.neighboursCid = neighboursCid;
    representation.hbondedTo = hbondedTo;
    representation.hbondedToCid = neighboursCid;
    representation.setUseDefaultColourRules(!colourRule);
    representation.setColourRules(colourRule ? [colourRule] : null);
    representation.setBondOptions(bondOptions);
    representation.setM2tParams(m2tParams);
    representation.setResidueEnvOptions(residueEnvironmentOptions);
    representation.setNonCustomOpacity(nonCustomOpacity);
    representation.interfaceOption.selectionType = ruleType !== "neighbourhood" ? ruleType : "molecule";
    representation.interfaceOption.visible = true;
    // Snapshot the params that would be lossy to reconstruct later, so edit mode
    // can reuse the exact original values (see extractRepresentationParams).
    representation.buildParams = {
        ruleType,
        colourMode,
        ncsColourRule,
        notHOH,
        notH,
        sideChainOnly,
        chainName,
        sequenceResidueRange,
    };

    if (isEdit) {
        await representation.redraw();
    } else {
        // Commit the representation to the molecule (previously done by the instance
        // path of MoorhenMolecule.addRepresentation, which is now deprecated).
        if (!molecule.defaultColourRules) {
            await molecule.fetchDefaultColourRules();
        }
        await representation.draw();
        molecule.representations.push(representation);
        await molecule.drawSymmetry(false);
        molecule.drawBiomolecule(false);
    }

    return representation;
}
