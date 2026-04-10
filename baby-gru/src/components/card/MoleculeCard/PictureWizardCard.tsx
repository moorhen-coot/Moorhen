import { GrainOutlined } from "@mui/icons-material";
import { useSnackbar } from "notistack";
import { useDispatch, useSelector, useStore } from "react-redux";
import { memo, useRef, useState } from "react";
import { useCommandCentre } from "@/InstanceManager";
import { MoorhenLigandSelect } from "@/components/inputs/Selector/MoorhenLigandSelect";
import { RootState } from "@/store";
import { MoleculeRepresentation, RepresentationStyles } from "@/utils/MoorhenMoleculeRepresentation";
import { addCustomRepresentation, removeCustomRepresentation } from "../../../store/moleculesSlice";
import { moorhen } from "../../../types/moorhen";
import { ColourRule } from "../../../utils/MoorhenColourRule";
import { COOT_BOND_REPRESENTATIONS, M2T_REPRESENTATIONS, representationLabelMapping } from "../../../utils/enums";
import { getMultiColourRuleArgs, hexToRGB, rgbToHex } from "../../../utils/utils";
import { MoorhenButton, MoorhenColourPicker, MoorhenSelect, MoorhenSlider, MoorhenToggle } from "../../inputs";
import { MoorhenCidInputForm } from "../../inputs/MoorhenCidInputForm";
import { MoorhenChainSelect } from "../../inputs/Selector/MoorhenChainSelect";
import { MoorhenStack } from "../../interface-base";
import { MoorhenSequenceViewer, moorhenSequenceToSeqViewer } from "../../sequence-viewer";
import { NcsColourSwatch } from "./ColourRuleCard";
import {
    BondSettingsPanel,
    MolSurfSettingsPanel,
    ResidueEnvironmentSettingsPanel,
    RibbonSettingsPanel,
} from "./MoleculeRepresentationSettingsCard";

export const PictureWizardCard = memo(
    (props: {
        molecule: moorhen.Molecule;
        urlPrefix: string;
        mode?: "add" | "edit";
        representation?: MoleculeRepresentation;
        setBusy?: React.Dispatch<React.SetStateAction<boolean>>;
        onApply?: () => void;
    }) => {
        const store = useStore<RootState>();
        const applyColourToNonCarbonAtomsSwitchRef = useRef<HTMLInputElement | null>(null);
        const backgroundStyleSelectRef = useRef<HTMLSelectElement | null>(null);
        const chainSelectRef = useRef<HTMLSelectElement | null>(null);
        const colourModeSelectRef = useRef<HTMLSelectElement | null>(null);
        const alphaSwatchRef = useRef<HTMLImageElement | null>(null);
        const ncsColourRuleRef = useRef<null | ColourRule>(null);
        const [wizardType, setWizardType] = useState<"site-and-ribbons" | "bonds" | "ribbons">("site-and-ribbons")
        const [ruleType, setRuleType] = useState<"ligands" | "cid" | "molecule" | "chain" | "residue-range">(
            props.representation ? props.representation.interfaceOption.selectionType : "ligands"
        );
        const [ligandSelection, setLigandSelection] = useState<string|null>(null)
        const [representationStyle, setRepresentationStyle] = useState<moorhen.RepresentationStyles>(props.representation?.style ?? "CBs");

        const [useDefaultRepresentationSettings, setUseDefaultRepresentationSettings] = useState<boolean>(() => {
            if (props.representation) {
                if (M2T_REPRESENTATIONS.includes(props.representation.style)) {
                    return props.representation.useDefaultM2tParams;
                } else if (COOT_BOND_REPRESENTATIONS.includes(props.representation.style)) {
                    return props.representation.useDefaultBondOptions;
                } else if (props.representation.style === "residue_environment") {
                    return props.representation.useDefaultResidueEnvironmentOptions;
                }
            } else {
                return true;
            }
        });

        const [colourMode, setColourMode] = useState<string>("custom");
        const [nonCustomOpacity, setNonCustomOpacity] = useState<number>(
            props.representation?.nonCustomOpacity ? props.representation.nonCustomOpacity : 1.0
        );
        const [colour, setColour] = useState<string>(
            props.representation && !props.representation?.useDefaultColourRules && !props.representation?.colourRules[0]?.isMultiColourRule
                ? props.representation?.colourRules[0].color
                : "#47d65f"
        );
        const [applyColourToNonCarbonAtoms, setApplyColourToNonCarbonAtoms] = useState<boolean>(
            props.representation && !props.representation?.useDefaultColourRules && props.representation?.colourRules?.length !== 0
                ? props.representation?.colourRules[0].applyColourToNonCarbonAtoms
                : false
        );
        const [useDefaultColours, setUseDefaultColours] = useState<boolean>(props.representation?.useDefaultColourRules ?? true);

        const [selectedChain, setSelectedChain] = useState<string>(props.molecule.sequences[0]?.chain || "");
        const [sequenceResidueRange, setSequenceResidueRange] = useState<[number, number] | null>(null);

        const [cid, setCid] = useState<string>("/*/*/*/*:*");

        const [backBonerepresentation, setBackBonerepresentation] = useState<RepresentationStyles>("CRs");

        const [deleteExisting, setDeleteExisting] = useState<boolean>(false);

        const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);

        const dispatch = useDispatch();

        const { enqueueSnackbar } = useSnackbar();

        const mode = "add";

        const commandCentre = useCommandCentre();

        const selectedSequence = props.molecule.sequences.find(sequence => sequence.chain === selectedChain);

        const createRepresentations = async () => {

            if(deleteExisting){
                props.molecule.representations.forEach(rep => {
                    props.molecule.removeRepresentation(rep.uniqueId)
                    dispatch(removeCustomRepresentation(rep));
                })
                props.molecule.clearBuffersOfStyle("environment");
            }

            if(wizardType==="site-and-ribbons") {
                let splitLigands = []

                if(ruleType==="ligands"){
                    let theLigandSelection = ""
                    if(ligandSelection){
                        theLigandSelection = ligandSelection
                    } else if(props.molecule.ligands&&props.molecule.ligands.length>0) {
                        theLigandSelection = props.molecule.ligands.map(x => x.cid).join("||")
                    } else {
                        return
                    }
                    splitLigands = theLigandSelection.split("||")
                } else if(ruleType==="cid"){
                    splitLigands = cid.split("||")
                }
                if(splitLigands){
                    for(let ilig=0; ilig<splitLigands.length; ilig++){
                        await createRepresentation("molecule","CBs",splitLigands[ilig],true,"",false,false);
                        await createRepresentation("molecule","allHBonds",splitLigands[ilig],true,"",false,false);
                        await createRepresentation("molecule","CBs","",false,splitLigands[ilig],true,false);
                    }
                }
                await createRepresentation("molecule","CRs","",true,"",false,false);
            } else if(wizardType==="ribbons") {
                await createRepresentation("molecule","CRs","",true,"",false,false);
            } else if(wizardType==="bonds") {
                await createRepresentation("molecule","CBs","",true,"",false,false);
            }
        }

        const createRepresentation = async (theRuleType: "ligands" | "cid" | "molecule" | "chain" | "residue-range", representationStyle: "CBs"|"CRs"|"CAs"|"allHBonds", neighboursCid: string, restrictToNeighbours: boolean, hbondedToCid: string, hbondedTo: boolean, excludeNeighbours: boolean) => {

            props.setBusy?.(true);

            const sideChainOnly = false
            const notHOH = false
            const notH = false

            const neighboursDistance = 6.0

            const theMolecule = props.molecule

            let cidSelection: string;
            let unRestrictedCidSelection: string;
            switch (theRuleType) {
                case "molecule":
                    cidSelection = "/*/*/";
                    if (representationStyle === "CBs" && notHOH) {
                        cidSelection += "(!HOH)";
                    } else {
                        cidSelection += "*";
                    }
                    cidSelection += "/";
                    unRestrictedCidSelection = cidSelection
                    if (representationStyle === "CBs" && sideChainOnly) {
                        cidSelection += "!O,C,N,H";
                    }

                    if (representationStyle === "CBs" && notH) {
                        cidSelection += "[!H]";
                    }

                    if (representationStyle === "CBs" && restrictToNeighbours) {
                        const restrictedCid = window.cootModule.cidToNeighboursCid(theMolecule.gemmiStructure,unRestrictedCidSelection,neighboursCid,neighboursDistance,excludeNeighbours)
                        let extraRestrict = ""
                        if(sideChainOnly) extraRestrict += "/!O,C,N,H"
                        if(notH&&!sideChainOnly) extraRestrict += "/*[!H]"
                        if(notH&&sideChainOnly) extraRestrict += "[!H]"
                        if(!notH&&!sideChainOnly) extraRestrict += "/"
                        extraRestrict += ":*"
                        cidSelection = restrictedCid.split("||").map(r => r+extraRestrict).join("||")
                    } else if (representationStyle === "CAs" && restrictToNeighbours) {
                        const restrictedCid = window.cootModule.cidToNeighboursCid(theMolecule.gemmiStructure,unRestrictedCidSelection,neighboursCid,neighboursDistance,excludeNeighbours)
                        cidSelection = restrictedCid
                    } else {
                        cidSelection += ":*";
                    }
                    if (representationStyle === "CBs" && !notHOH && sideChainOnly) {
                        if (representationStyle === "CBs" && restrictToNeighbours) {
                            const waterSelection = "/*/*/(HOH)";
                            const restrictedWaterCid = window.cootModule.cidToNeighboursCid(theMolecule.gemmiStructure,waterSelection,neighboursCid,neighboursDistance,excludeNeighbours)
                            if(restrictedWaterCid.length>2)
                                cidSelection += "||"+restrictedWaterCid
                        } else {
                            cidSelection += "||(HOH)";
                        }
                    }
                    break;
                case "chain":
                    cidSelection = `//${chainSelectRef.current.value}/`;
                    if (representationStyle === "CBs" && notHOH) {
                        cidSelection += "(!HOH)";
                    }
                    cidSelection += "/";
                    unRestrictedCidSelection = cidSelection
                    if (representationStyle === "CBs" && sideChainOnly) {
                        cidSelection += "!O,C,N";
                    }

                    if (representationStyle === "CBs" && notH) {
                        cidSelection += "[!H]";
                    }
                    if (representationStyle === "CBs" && restrictToNeighbours) {
                        const restrictedCid = window.cootModule.cidToNeighboursCid(theMolecule.gemmiStructure,unRestrictedCidSelection,neighboursCid,neighboursDistance,excludeNeighbours)
                        let extraRestrict = ""
                        if(sideChainOnly) extraRestrict += "/!O,C,N,H"
                        if(notH&&!sideChainOnly) extraRestrict += "/*[!H]"
                        if(notH&&sideChainOnly) extraRestrict += "[!H]"
                        if(!notH&&!sideChainOnly) extraRestrict += "/"
                        extraRestrict += ":*"
                        cidSelection = restrictedCid.split("||").map(r => r+extraRestrict).join("||")
                    } else {
                        cidSelection += ":*";
                    }
                    break;
                default:
                    console.warn("Unrecognised residue selection for the custom representation");
                    break;
            }

            if (!cidSelection) {
                console.warn("Invalid CID selection to create a custom representation");
                return;
            }

            let colourRule: ColourRule;
            if (!useDefaultColours) {
                const colourRuleCid = cidSelection;
                switch (colourModeSelectRef.current.value) {
                    case "custom":
                        colourRule = new ColourRule(
                            theRuleType,
                            colourRuleCid,
                            colour,
                            props.molecule.commandCentre,
                            false,
                            applyColourToNonCarbonAtomsSwitchRef.current?.checked
                        );
                        colourRule.setArgs([colourRuleCid, colour]);
                        colourRule.setParentMolecule(props.molecule);
                        break;
                    case "mol-symm":
                        if (ncsColourRuleRef.current) {
                            colourRule = ncsColourRuleRef.current;
                            colourRule.setApplyColourToNonCarbonAtoms(applyColourToNonCarbonAtomsSwitchRef.current?.checked);
                            break;
                        }
                    case "secondary-structure":
                    case "jones-rainbow":
                    case "b-factor":
                    case "b-factor-norm":
                    case "electrostatics":
                    case "af2-plddt":
                        colourRule = new ColourRule(
                            colourModeSelectRef.current.value,
                            "/*/*/*/*:*",
                            "#ffffff",
                            props.molecule.commandCentre,
                            true,
                            applyColourToNonCarbonAtomsSwitchRef.current?.checked
                        );
                        colourRule.setLabel(
                            `${
                                colourModeSelectRef.current.value === "secondary-structure"
                                    ? "Secondary struct."
                                    : colourModeSelectRef.current.value === "jones-rainbow"
                                      ? "Jones-Rainbow"
                                      : colourModeSelectRef.current.value === "mol-symm"
                                        ? "Mol. Symm."
                                        : colourModeSelectRef.current.value === "b-factor"
                                          ? "B-factor"
                                          : colourModeSelectRef.current.value === "b-factor-norm"
                                            ? "B-factor norm."
                                            : colourModeSelectRef.current.value === "af2-plddt"
                                              ? "PLDDT"
                                              : colourModeSelectRef.current.value === "electrostatics"
                                                ? "Electrostatics"
                                                : ""
                            }`
                        );
                        const ruleArgs = await getMultiColourRuleArgs(props.molecule, colourModeSelectRef.current.value);
                        colourRule.setArgs([ruleArgs]);
                        colourRule.setParentMolecule(props.molecule);
                        break;
                    default:
                        console.log("Unrecognised colour mode");
                        break;
                }
            }

            const nonCustomAlpha =
                colourMode === "b-factor" ||
                colourMode === "b-factor-norm" ||
                colourMode === "secondary-structure" ||
                colourMode === "af2-plddt" ||
                colourMode === "electrostatics" ||
                colourMode === "jones-rainbow"
                    ? nonCustomOpacity
                    : null;

            let rep = new MoleculeRepresentation(representationStyle, cidSelection, commandCentre)
            rep.cid = cidSelection;
            rep.restrictToNeighbours = restrictToNeighbours;
            rep.excludeNeighbours = excludeNeighbours;
            rep.neighboursCid = neighboursCid;
            rep.hbondedTo = hbondedTo;
            rep.hbondedToCid = hbondedToCid;
            rep.setStyle(representationStyle);
            rep.setUseDefaultColourRules(useDefaultColours);
            rep.setColourRules(colourRule ? [colourRule] : null);
            rep.nonCustomOpacity = nonCustomAlpha;
            props.molecule.addRepresentation(rep);
            dispatch(addCustomRepresentation(rep));

            props.setBusy?.(false);
            props.onApply?.();
        };

        const handleCreateRepresentation = async () => {
            try {
                await createRepresentations();
            } catch (err) {
                console.warn(err);
                enqueueSnackbar(`Something went wrong while creating a new custom representation`, {
                    variant: "error",
                });
            }
        };

        const isThereLigand: boolean = props.molecule.ligands.length > 0;

        return (
            <MoorhenStack style={{ width: "25rem", margin: "0.5rem" }}>
                <MoorhenStack inputGrid>
                        <MoorhenSelect label={"Wizard"} defaultValue={wizardType} setValue={setWizardType}>
                                <>
                                    <option value={"site-and-ribbons"} key={"site-and-ribbons"}>
                                        Binding site and ribbons
                                    </option>
                                    <option value={"ribbons"} key={"ribbons"}>
                                        Ribbons
                                    </option>
                                    <option value={"bonds"} key={"bonds"}>
                                        Bonds
                                    </option>
                                </>
                        </MoorhenSelect>
                        {wizardType === "site-and-ribbons" && <MoorhenSelect label={"Residue selection"} defaultValue={ruleType} setValue={setRuleType}>
                            {representationStyle === "residue_environment" ? (
                                <>
                                    <option value={"cid"} key={"cid"}>
                                        Atom selection
                                    </option>
                                </>
                            ) : (
                                <>
                                    {isThereLigand && (
                                        <option value={"ligands"} key={"ligands"}>
                                            Ligands
                                        </option>
                                    )}
                                    <option value={"cid"} key={"cid"}>
                                        Atom selection
                                    </option>
                                </>
                            )}
                        </MoorhenSelect>
                        }
                    {ruleType === "cid"  && wizardType === "site-and-ribbons" && (
                        <MoorhenCidInputForm
                            setCid={setCid}
                            label="Atom selection"
                            defaultValue={props.representation?.cid ?? ""}
                            allowUseCurrentSelection={true}
                        />
                    )}
                    {ruleType === "ligands" && wizardType === "site-and-ribbons" && (
                        <>
                            <MoorhenLigandSelect
                                selectedCoordMolNo={props.molecule.molNo}
                                molecules={[props.molecule]}
                                allowAll
                                setValue={setLigandSelection}
                            />
                        </>
                    )}
                </MoorhenStack>
                <MoorhenToggle
                    label="Delete all existing representations"
                    checked={deleteExisting}
                    onChange={() => setDeleteExisting(!deleteExisting)}
                />
                <MoorhenButton onClick={handleCreateRepresentation}>{mode === "add" ? "Create" : "Apply"}</MoorhenButton>
            </MoorhenStack>
        );
    }
);
