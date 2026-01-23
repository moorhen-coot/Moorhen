import { GrainOutlined } from "@mui/icons-material";
import { useSnackbar } from "notistack";
import { useDispatch, useSelector } from "react-redux";
import { memo, useRef, useState } from "react";
import { useCommandCentre } from "@/InstanceManager";
import { MoorhenLigandSelect } from "@/components/inputs/Selector/MoorhenLigandSelect";
import { CommandCentre } from "@/moorhen";
import {
    MoleculeRepresentation,
    RepresentationStyles,
    m2tParameters,
    residueEnvironmentOptions,
} from "@/utils/MoorhenMoleculeRepresentation";
import { addCustomRepresentation, addGeneralRepresentation } from "../../../store/moleculesSlice";
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

const customRepresentations = [
    "CBs",
    "CAs",
    "CRs",
    "gaussian",
    "MolecularSurface",
    "VdwSpheres",
    "MetaBalls",
    "residue_environment",
    "allHBonds",
    "adaptativeBonds",
];

export const AddCustomRepresentationCard = memo(
    (props: {
        molecule: moorhen.Molecule;
        urlPrefix: string;
        mode?: "add" | "edit";
        representation?: MoleculeRepresentation;
        setBusy?: React.Dispatch<React.SetStateAction<boolean>>;
        onApply?: () => void;
    }) => {
        const applyColourToNonCarbonAtomsSwitchRef = useRef<HTMLInputElement | null>(null);
        const useDefaultRepresentationSettingsSwitchRef = useRef<HTMLInputElement | null>(null);
        const ligandFormRef = useRef<HTMLSelectElement | null>(null);
        const styleSelectRef = useRef<HTMLSelectElement | null>(null);
        const focusStyleSelectRef = useRef<HTMLSelectElement | null>(null);
        const backgroundStyleSelectRef = useRef<HTMLSelectElement | null>(null);
        const chainSelectRef = useRef<HTMLSelectElement | null>(null);
        const colourModeSelectRef = useRef<HTMLSelectElement | null>(null);
        const alphaSwatchRef = useRef<HTMLImageElement | null>(null);
        const ncsColourRuleRef = useRef<null | ColourRule>(null);
        const [ruleType, setRuleType] = useState<string>(
            props.representation ? (props.representation.cid === "//*//:*" ? "molecule" : "cid") : "molecule"
        );
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
        const [showAlphaSlider, setShowAlphaSlider] = useState<boolean>(false);
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

        const [cid, setCid] = useState<string>("//*/:*");
        const [adaptBondOOF, setAdaptBondOOF] = useState<RepresentationStyles>("CRs");
        const [adaptDist, setadaptDist] = useState<number>(8.0);

        const [notHOH, setNotHOH] = useState<boolean>(props.representation?.cid?.includes("(!HOH)") ? true : false);
        const [notH, setNotH] = useState<boolean>(props.representation?.cid?.includes("[!H]") ? true : false);
        const [sideChainOnly, setSideChainOnly] = useState<boolean>(props.representation?.cid?.includes("!O,C,N") ? true : false);

        const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);

        const dispatch = useDispatch();

        const { enqueueSnackbar } = useSnackbar();

        const mode = props.mode ?? "add";

        const commandCentre = useCommandCentre();
        const representationRef = useRef<MoleculeRepresentation>(
            props.representation ?? new MoleculeRepresentation(representationStyle, "//*/:*", commandCentre)
        );

        const selectedSequence = props.molecule.sequences.find(sequence => sequence.chain === selectedChain);

        const handleDefaultRepresentationSettingsChange = () => {
            setUseDefaultRepresentationSettings(!useDefaultRepresentationSettings);

            if (M2T_REPRESENTATIONS.includes(representationStyle)) {
                representationRef.current.useDefaultM2tParams = !useDefaultRepresentationSettings;
            } else if (COOT_BOND_REPRESENTATIONS.includes(representationStyle)) {
                representationRef.current.useDefaultBondOptions = !useDefaultRepresentationSettings;
            } else if (representationStyle === "residue_environment") {
                representationRef.current.useDefaultResidueEnvironmentOptions = !useDefaultRepresentationSettings;
            }
            if (mode === "edit" && !useDefaultRepresentationSettings) {
                representationRef.current.redraw();
            }
        };

        const createRepresentation = async () => {
            props.setBusy?.(true);

            let cidSelection: string;
            switch (ruleType) {
                case "molecule":
                    cidSelection = "//*/";
                    if (representationStyle === "CBs" && notHOH) {
                        cidSelection += "(!HOH)";
                    }
                    cidSelection += "/";
                    if (representationStyle === "CBs" && sideChainOnly) {
                        cidSelection += "!O,C,N";
                    }

                    if (representationStyle === "CBs" && notH) {
                        cidSelection += "[!H]";
                    }
                    cidSelection += ":*";

                    break;
                case "chain":
                    cidSelection = `//${chainSelectRef.current.value}/`;
                    if (representationStyle === "CBs" && notHOH) {
                        cidSelection += "(!HOH)";
                    }
                    cidSelection += "/";
                    if (representationStyle === "CBs" && sideChainOnly) {
                        cidSelection += "!O,C,N";
                    }

                    if (representationStyle === "CBs" && notH) {
                        cidSelection += "[!H]";
                    }
                    cidSelection += ":*";
                    break;
                case "residue-range":
                    const selectedResidues = sequenceResidueRange;
                    console.log("selectedResidues", selectedResidues);
                    cidSelection =
                        selectedResidues && selectedResidues.length === 2
                            ? `//${chainSelectRef.current.value}/${selectedResidues[0]}-${selectedResidues[1]}`
                            : null;
                    break;
                case "cid":
                    cidSelection = cid;
                    break;
                case "ligands":
                    cidSelection = ligandFormRef.current.value;
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
                const colourRuleCid = styleSelectRef.current.value === "residue_environment" ? "//*" : cidSelection;
                switch (colourModeSelectRef.current.value) {
                    case "custom":
                        colourRule = new ColourRule(
                            ruleType,
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
            if (mode === "add") {
                if (styleSelectRef.current.value === "adaptativeBonds") {
                    props.molecule.setDrawAdaptativeBonds(true);
                    dispatch(addCustomRepresentation(props.molecule.adaptativeBondsRepresentation));
                } else {
                    representationRef.current.cid = cidSelection;
                    representationRef.current.setStyle(representationStyle);
                    representationRef.current.setUseDefaultColourRules(useDefaultColours);
                    representationRef.current.setColourRules(colourRule ? [colourRule] : null);
                    representationRef.current.nonCustomOpacity = nonCustomAlpha;
                    //  = await props.molecule.addRepresentation(
                    //     styleSelectRef.current.value as moorhen.RepresentationStyles,
                    //     cidSelection,
                    //     true,
                    //     colourRule ? [colourRule] : null,
                    //     bondOptions,
                    //     m2tParams,
                    //     residueEnvSettings,
                    //     nonCustomAlpha
                    // );
                    props.molecule.addRepresentation(representationRef.current);
                    dispatch(addCustomRepresentation(representationRef.current));
                }
            } else if (mode === "edit" && props.representation.uniqueId) {
                const representation = props.molecule.representations.find(item => item.uniqueId === props.representation.uniqueId);
                if (representation) {
                    representation.cid = cidSelection;
                    representation.setStyle(styleSelectRef.current.value as moorhen.RepresentationStyles);
                    representation.setUseDefaultColourRules(!colourRule);
                    representation.setColourRules(colourRule ? [colourRule] : null);
                    await representation.redraw();
                    representation.setNonCustomOpacity(nonCustomAlpha);
                }
            }
            if (styleSelectRef.current.value === "adaptativeBonds") {
                props.molecule.adaptativeBondsRepresentation.residueEnvironmentOptions.backgroundRepresentation = adaptBondOOF;
                props.molecule.adaptativeBondsRepresentation.residueEnvironmentOptions.maxDist = adaptDist;
            }
            if (mode === "edit") {
                props.representation.redraw();
            }
            props.setBusy?.(false);
            props.onApply?.();
        };

        const handleCreateRepresentation = async () => {
            try {
                await createRepresentation();
            } catch (err) {
                console.warn(err);
                enqueueSnackbar(`Something went wrong while ${mode === "edit" ? "editing" : "creating a new"} custom representation`, {
                    variant: "error",
                });
            }
        };

        const handleColourModeChange = evt => {
            if (evt.target.value === "mol-symm" && !ncsColourRuleRef.current && mode === "edit") {
                const representation = props.molecule.representations.find(item => item.uniqueId === props.representation.uniqueId);
                if (representation?.colourRules?.length > 0) ncsColourRuleRef.current = representation.colourRules[0];
            }
            setColourMode(evt.target.value);
        };

        const applyNcsColourChange = async () => {
            await props.molecule.redraw();
        };

        const handleOpacityChange = newVal => {
            setNonCustomOpacity(newVal);
            if (props.representation) {
                props.representation.setNonCustomOpacity(newVal);
            }
        };

        const handleResiduesRangeSelection = selection => {
            setSequenceResidueRange(selection.range[0] < selection.range[1] ? selection.range : [selection.range[1], selection.range[0]]);
        };

        const isThereLigand: boolean = props.molecule.ligands.length > 0;

        return (
            <MoorhenStack style={{ width: "25rem", margin: "0.5rem" }}>
                <MoorhenStack inputGrid>
                    <MoorhenSelect
                        ref={styleSelectRef}
                        value={representationStyle}
                        label={"Style"}
                        onChange={evt => {
                            setRepresentationStyle(evt.target.value as moorhen.RepresentationStyles);
                            if (evt.target.value === "residue_environment") setRuleType("cid");
                        }}
                    >
                        {customRepresentations.map(key => {
                            return (
                                <option value={key} key={key}>
                                    {representationLabelMapping[key]}
                                </option>
                            );
                        })}
                    </MoorhenSelect>
                    {representationStyle === "adaptativeBonds" ? (
                        <MoorhenSelect label="Out of Focus Style" setValue={setAdaptBondOOF}>
                            <option value="CRs" key="CRs">
                                Ribbons
                            </option>
                            <option value="CAs" key="CAs">
                                C-alpha
                            </option>
                        </MoorhenSelect>
                    ) : (
                        <MoorhenSelect label={"Residue selection"} defaultValue={ruleType} setValue={setRuleType}>
                            {representationStyle === "residue_environment" ? (
                                <>
                                    <option value={"cid"} key={"cid"}>
                                        Atom selection
                                    </option>
                                </>
                            ) : (
                                <>
                                    <option value={"molecule"} key={"molecule"}>
                                        All molecule
                                    </option>
                                    <option value={"chain"} key={"chain"}>
                                        Chain
                                    </option>
                                    <option value={"residue-range"} key={"residue-range"}>
                                        Residue range
                                    </option>
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
                    )}

                    {ruleType === "cid" && representationStyle !== "adaptativeBonds" && (
                        <MoorhenCidInputForm
                            setCid={setCid}
                            label="Atom selection"
                            defaultValue={props.representation?.cid ?? ""}
                            allowUseCurrentSelection={true}
                        />
                    )}
                    {(ruleType === "chain" || ruleType === "residue-range") && (
                        <MoorhenChainSelect
                            molecules={molecules}
                            onChange={evt => setSelectedChain(evt.target.value)}
                            selectedCoordMolNo={props.molecule.molNo}
                            ref={chainSelectRef}
                            allowedTypes={[1, 2, 3, 4, 5]}
                        />
                    )}
                    {(ruleType === "chain" || ruleType === "molecule") && representationStyle === "CBs" && (
                        <>
                            <MoorhenToggle label="Hide Waters" checked={notHOH} onChange={() => setNotHOH(!notHOH)} />
                            <MoorhenToggle label="Hide Hydrogens" checked={notH} onChange={() => setNotH(!notH)} />
                            <MoorhenToggle
                                label="Side Chain Only"
                                checked={sideChainOnly}
                                onChange={() => setSideChainOnly(!sideChainOnly)}
                            />
                        </>
                    )}
                    {ruleType === "ligands" && (
                        <>
                            <MoorhenLigandSelect
                                selectedCoordMolNo={props.molecule.molNo}
                                molecules={[props.molecule]}
                                allowAll
                                ref={ligandFormRef}
                            />
                        </>
                    )}
                </MoorhenStack>
                {ruleType === "residue-range" ? (
                    <>
                        <MoorhenSequenceViewer
                            style={{ marginTop: "1rem" }}
                            sequences={moorhenSequenceToSeqViewer(selectedSequence, props.molecule.name, props.molecule.molNo)}
                            onResiduesSelect={selection => {
                                handleResiduesRangeSelection(selection);
                            }}
                        />
                    </>
                ) : null}
                {["CBs", "CAs", "ligands", "CRs", "MolecularSurface", "residue_environment"].includes(representationStyle) && (
                    <MoorhenToggle
                        ref={useDefaultRepresentationSettingsSwitchRef}
                        type="switch"
                        label={`Apply general representation settings`}
                        checked={useDefaultRepresentationSettings}
                        onChange={handleDefaultRepresentationSettingsChange}
                    />
                )}
                {!useDefaultRepresentationSettings && representationStyle === "MolecularSurface" && (
                    <MolSurfSettingsPanel representation={representationRef.current} />
                )}
                {!useDefaultRepresentationSettings && representationStyle === "CRs" && (
                    <RibbonSettingsPanel representation={representationRef.current} />
                )}
                {!useDefaultRepresentationSettings &&
                    representationStyle !== "MetaBalls" &&
                    COOT_BOND_REPRESENTATIONS.includes(representationStyle) && (
                        <BondSettingsPanel representation={representationRef.current} />
                    )}
                {!useDefaultRepresentationSettings && representationStyle === "residue_environment" && (
                    <ResidueEnvironmentSettingsPanel representation={representationRef.current} />
                )}
                {representationStyle === "residue_environment" && !useDefaultRepresentationSettings && (
                    <MoorhenStack direction="horizontal">
                        <MoorhenSelect
                            ref={focusStyleSelectRef}
                            defaultValue={props.representation?.residueEnvironmentOptions.focusRepresentation ?? "CBs"}
                            label={"Focus Style"}
                        >
                            {["CBs", "CAs", "CRs", "MolecularSurface", "VdwSpheres"].map(key => {
                                return (
                                    <option value={key} key={key}>
                                        {representationLabelMapping[key]}
                                    </option>
                                );
                            })}
                        </MoorhenSelect>
                        <MoorhenSelect
                            ref={backgroundStyleSelectRef}
                            defaultValue={props.representation?.residueEnvironmentOptions.backgroundRepresentation ?? "CRs"}
                            label={"Background Style"}
                        >
                            {["CBs", "CAs", "CRs", "MolecularSurface", "VdwSpheres"].map(key => {
                                return (
                                    <option value={key} key={key}>
                                        {representationLabelMapping[key]}
                                    </option>
                                );
                            })}
                        </MoorhenSelect>
                    </MoorhenStack>
                )}
                {representationStyle === "adaptativeBonds" && (
                    <MoorhenStack card>
                        <MoorhenSlider
                            sliderTitle="Neighbouring Res. Dist."
                            externalValue={adaptDist}
                            setExternalValue={setadaptDist}
                            showMinMaxVal={false}
                            stepButtons={0.5}
                            minVal={1}
                            maxVal={15}
                            logScale={false}
                            decimalPlaces={2}
                        />
                    </MoorhenStack>
                )}
                {!["allHBonds", "adaptativeBonds"].includes(representationStyle) && (
                    <MoorhenToggle
                        type="switch"
                        label="Apply general colour settings"
                        checked={useDefaultColours}
                        onChange={() => {
                            setUseDefaultColours(prev => {
                                return !prev;
                            });
                        }}
                    />
                )}
                {["MetaBalls", "CBs", "VdwSpheres", "ligands"].includes(representationStyle) && !useDefaultColours && (
                    <MoorhenToggle
                        ref={applyColourToNonCarbonAtomsSwitchRef}
                        type="switch"
                        label="Apply colour to non-carbon atoms also"
                        checked={applyColourToNonCarbonAtoms}
                        onChange={() => {
                            setApplyColourToNonCarbonAtoms(prev => {
                                return !prev;
                            });
                        }}
                    />
                )}
                {!useDefaultColours && (
                    <>
                        <MoorhenSelect ref={colourModeSelectRef} defaultValue={colourMode} onChange={handleColourModeChange}>
                            <>
                                <option value={"custom"} key={"custom"}>
                                    User defined colour
                                </option>
                                <option value={"secondary-structure"} key={"secondary-structure"}>
                                    Secondary structure
                                </option>
                                <option value={"jones-rainbow"} key={"jones-rainbow"}>
                                    Jones' rainbow
                                </option>
                                <option value={"b-factor"} key={"b-factor"}>
                                    B-Factor
                                </option>
                                <option value={"b-factor-norm"} key={"b-factor-norm"}>
                                    B-Factor (normalised)
                                </option>
                                <option value={"af2-plddt"} key={"af2-plddt"}>
                                    AF2 PLDDT
                                </option>
                                <option value={"mol-symm"} key={"mol-symm"}>
                                    Mol. Symmetry
                                </option>
                            </>
                            {representationStyle === "MolecularSurface" && (
                                <option value={"electrostatics"} key={"electrostatics"}>
                                    Electrostatics
                                </option>
                            )}
                        </MoorhenSelect>
                        <MoorhenStack direction="row" addMargin align="center">
                            {colourMode === "b-factor" || colourMode === "b-factor-norm" ? (
                                <img
                                    className="colour-rule-icon"
                                    src={`${props.urlPrefix}/pixmaps/temperature.svg`}
                                    alt="b-factor"
                                    style={{
                                        width: "30px",
                                        height: "30px",
                                        borderRadius: "3px",
                                        border: "1px solid #c9c9c9",
                                        padding: 0,
                                    }}
                                    ref={alphaSwatchRef}
                                    onClick={() => setShowAlphaSlider(true)}
                                />
                            ) : colourMode === "secondary-structure" ? (
                                <img
                                    className="colour-rule-icon"
                                    src={`${props.urlPrefix}/pixmaps/secondary-structure-grey.svg`}
                                    alt="ss2"
                                    style={{
                                        width: "30px",
                                        height: "30px",
                                        borderRadius: "3px",
                                        border: "1px solid #c9c9c9",
                                        padding: 0,
                                    }}
                                    ref={alphaSwatchRef}
                                    onClick={() => setShowAlphaSlider(true)}
                                />
                            ) : colourMode === "electrostatics" ? (
                                <img
                                    className="colour-rule-icon"
                                    src={`${props.urlPrefix}/pixmaps/esurf.svg`}
                                    alt="Electrostatic surface"
                                    style={{
                                        width: "30px",
                                        height: "30px",
                                        borderRadius: "3px",
                                        border: "1px solid #c9c9c9",
                                        padding: 0,
                                    }}
                                    ref={alphaSwatchRef}
                                    onClick={() => setShowAlphaSlider(true)}
                                />
                            ) : colourMode === "jones-rainbow" ? (
                                <img
                                    className="colour-rule-icon"
                                    src={`${props.urlPrefix}/pixmaps/jones_rainbow.svg`}
                                    alt="ss2"
                                    style={{
                                        width: "30px",
                                        height: "30px",
                                        borderRadius: "3px",
                                        border: "1px solid #c9c9c9",
                                        padding: 0,
                                    }}
                                    ref={alphaSwatchRef}
                                    onClick={() => setShowAlphaSlider(true)}
                                />
                            ) : colourMode === "mol-symm" ? (
                                mode === "edit" ? (
                                    <NcsColourSwatch
                                        style={{
                                            cursor: "pointer",
                                            height: "30px",
                                            width: "30px",
                                            padding: "0px",
                                            borderStyle: "solid",
                                            borderColor: "#ced4da",
                                            borderWidth: "3px",
                                            borderRadius: "8px",
                                        }}
                                        rule={ncsColourRuleRef?.current}
                                        applyColourChange={applyNcsColourChange}
                                    />
                                ) : (
                                    <GrainOutlined
                                        style={{
                                            height: "30px",
                                            width: "30px",
                                            padding: 0,
                                            borderStyle: "solid",
                                            borderColor: "#ced4da",
                                            borderWidth: "3px",
                                            borderRadius: "8px",
                                        }}
                                    />
                                )
                            ) : colourMode === "custom" ? (
                                <MoorhenColourPicker
                                    colour={hexToRGB(colour)}
                                    setColour={color => setColour(rgbToHex(color[0], color[1], color[2]))}
                                />
                            ) : (
                                <img
                                    className="colour-rule-icon"
                                    src={`${props.urlPrefix}/pixmaps/alphafold_rainbow.svg`}
                                    alt="ss2"
                                    style={{
                                        width: "30px",
                                        height: "30px",
                                        borderRadius: "3px",
                                        border: "1px solid #c9c9c9",
                                        padding: 0,
                                    }}
                                    ref={alphaSwatchRef}
                                    onClick={() => setShowAlphaSlider(true)}
                                />
                            )}

                            <MoorhenSlider
                                minVal={0.0}
                                maxVal={1.0}
                                showButtons={false}
                                decimalPlaces={2}
                                logScale={false}
                                sliderTitle="Opacity"
                                externalValue={nonCustomOpacity}
                                setExternalValue={(newVal: number) => handleOpacityChange(newVal)}
                            />
                        </MoorhenStack>
                    </>
                )}
                <MoorhenButton onClick={handleCreateRepresentation}>{mode === "add" ? "Create" : "Apply"}</MoorhenButton>
            </MoorhenStack>
        );
    }
);
