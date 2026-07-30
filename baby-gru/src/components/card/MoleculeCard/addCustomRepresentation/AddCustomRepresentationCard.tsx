import { useDispatch, useSelector, useStore } from "react-redux";
import { memo, useRef, useState } from "react";
import { useCommandCentre } from "@/InstanceManager";
import { RootState, enqueueSnackbar } from "@/store";
import { MoleculeRepresentation, RepresentationStyles } from "@/utils/MoorhenMoleculeRepresentation";
import { addCustomRepresentation } from "../../../../store/moleculesSlice";
import { moorhen } from "../../../../types/moorhen";
import { ColourRule } from "../../../../utils/MoorhenColourRule";
import { COOT_BOND_REPRESENTATIONS, M2T_REPRESENTATIONS } from "../../../../utils/enums";
import { MoorhenButton, MoorhenSlider, MoorhenToggle } from "../../../inputs";
import { MoorhenStack } from "../../../interface-base";
import { MoorhenSequenceViewer, moorhenSequenceToSeqViewer } from "../../../sequence-viewer";
import {
    BondSettingsPanel,
    MolSurfSettingsPanel,
    ResidueEnvironmentSettingsPanel,
    RibbonSettingsPanel,
} from "../MoleculeRepresentationSettingsCard";
import { ColourSettingsSection } from "./components/ColourSettingsSection";
import { FilterToggles } from "./components/FilterToggles";
import { NeighbourhoodSettings } from "./components/NeighbourhoodSettings";
import { ResidueEnvironmentStyleSelectors } from "./components/ResidueEnvironmentStyleSelectors";
import { ResidueSelectionSection } from "./components/ResidueSelectionSection";
import { StyleSelector } from "./components/StyleSelector";
import { buildCidSelection, buildColourRule, getNonCustomAlpha } from "./utils/cidBuilder";
import { parseCid } from "../../../../utils/utils";

export const AddCustomRepresentationCard = memo(
    (props: {
        molecule: moorhen.Molecule;
        urlPrefix: string;
        mode?: "add" | "edit";
        representation?: MoleculeRepresentation;
        setBusy?: React.Dispatch<React.SetStateAction<boolean>>;
        onApply?: () => void;
    }) => {
        const store = useStore<RootState>();
        const ncsColourRuleRef = useRef<null | ColourRule>(null);
        const [ligandCid, setLigandCid] = useState<string>("");

        const [ruleType, setRuleType] = useState<"ligands" | "cid" | "molecule" | "chain" | "residue-range" | "neighbourhood">(
            props.representation
                ? props.representation?.restrictToNeighbours
                    ? "neighbourhood"
                    : props.representation.interfaceOption.selectionType
                : "molecule"
        );
        const [representationStyle, setRepresentationStyle] = useState<moorhen.RepresentationStyles>(props.representation?.style ?? "CBs");

        const [restrictToNeighbours, setRestrictToNeighbours] = useState<boolean>(props.representation?.restrictToNeighbours ?? false);
        const [hbondedTo, setHbondedTo] = useState<boolean>(props.representation?.hbondedTo ?? false);
        const [excludeNeighbours, setExcludeNeighbours] = useState<boolean>(props.representation?.excludeNeighbours ?? false);
        const [neighboursCid, setNeighboursCid] = useState<string>(props.representation?.neighboursCid ?? "");
        const [neighboursDistance, setNeighboursDistance] = useState<number>(props.representation?.neighboursDistance ?? 6.0);

        const [useDefaultRepresentationSettings, setUseDefaultRepresentationSettings] = useState<boolean>(() => {
            if (props.representation) {
                if (M2T_REPRESENTATIONS.includes(props.representation.style)) {
                    return props.representation.useDefaultM2tParams;
                } else if (COOT_BOND_REPRESENTATIONS.includes(props.representation.style)) {
                    return props.representation.useDefaultBondOptions;
                } else if (props.representation.style === "residue_environment") {
                    return props.representation.useDefaultResidueEnvironmentOptions;
                }
            }
            return true;
        });

        const [colourMode, setColourMode] = useState<string>("custom");
        const [nonCustomOpacity, setNonCustomOpacity] = useState<number>(props.representation?.nonCustomOpacity ?? 1.0);
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

        const parsedCid = props.representation ? parseCid(props.representation.cid) : null;
        const defaultChain = parsedCid?.chain !== "*" ? parsedCid?.chain : props.molecule.sequences[0]?.chain || "";

        const [selectedChain, setSelectedChain] = useState<string>(defaultChain);
        const [sequenceResidueRange, setSequenceResidueRange] = useState<[number, number] | null>(
            parsedCid?.residueRange ?? null
        );
        
        const [cid, setCid] = useState<string>(props.representation?.cid ?? "/*/*/*/*:*");
        const [adaptBondOOF, setAdaptBondOOF] = useState<RepresentationStyles>("CRs");
        const [adaptDist, setAdaptDist] = useState<number>(props.representation?.residueEnvironmentOptions.adaptiveDist ?? 8.0);

        const [notHOH, setNotHOH] = useState<boolean>(props.representation?.cid?.includes("(!HOH)") ?? false);
        const [notH, setNotH] = useState<boolean>(props.representation?.cid?.includes("[!H]") ?? false);
        const [sideChainOnly, setSideChainOnly] = useState<boolean>(props.representation?.cid?.includes("!O,C,N") ?? false);

        const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);

        const dispatch = useDispatch();

        const mode = props.mode ?? "add";

        const commandCentre = useCommandCentre();
        const representationRef = useRef<MoleculeRepresentation>(
            props.representation ?? new MoleculeRepresentation(representationStyle, "/*/*/*/*:*", commandCentre)
        );
        representationRef.current.interfaceOption.selectionType = ruleType !== "neighbourhood" ? ruleType : "molecule";



        const isThereLigand: boolean = props.molecule.ligands.length > 0;

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

            const cidSelection = buildCidSelection({
                ruleType,
                representationStyle,
                molecule: props.molecule,
                chainName: selectedChain || null,
                notHOH,
                notH,
                sideChainOnly,
                restrictToNeighbours,
                excludeNeighbours,
                neighboursCid,
                neighboursDistance,
                sequenceResidueRange: sequenceResidueRange[0] !== -9999 ? sequenceResidueRange : null,
                cid,
                ligandCid: ligandCid || null,
            });

            if (!cidSelection) {
                console.warn("Invalid CID selection to create a custom representation");
                props.setBusy?.(false);
                return;
            }

            const colourRule = await buildColourRule({
                useDefaultColours,
                colourMode,
                ruleType: ruleType !== "neighbourhood" ? ruleType : "molecule",
                cidSelection,
                colour,
                molecule: props.molecule,
                applyColourToNonCarbonAtoms,
                ncsColourRule: ncsColourRuleRef.current,
                styleSelectValue: representationStyle,
                colourModeSelectValue: colourMode,
            });

            const nonCustomAlpha = getNonCustomAlpha(colourMode, nonCustomOpacity);

            if (mode === "add") {
                if (representationStyle === "adaptativeBonds") {
                    props.molecule.setDrawAdaptativeBonds(true);
                    if (
                        !store
                            .getState()
                            .molecules.customRepresentations.find(
                                rep => rep.style === "adaptativeBonds" && rep.parentMolecule.molNo === props.molecule.molNo
                            )
                    ) {
                        dispatch(addCustomRepresentation(props.molecule.adaptativeBondsRepresentation));
                    }
                } else {
                    const representation = await props.molecule.addRepresentation(
                        representationStyle,
                        cidSelection,
                        true,
                        colourRule ? [colourRule] : null,
                        representationRef.current.useDefaultBondOptions ? null : { ...representationRef.current.bondOptions },
                        representationRef.current.useDefaultM2tParams ? null : { ...representationRef.current.m2tParams },
                        representationRef.current.useDefaultResidueEnvironmentOptions
                            ? null
                            : { ...representationRef.current.residueEnvironmentOptions },
                        nonCustomAlpha,
                        neighboursCid,
                        restrictToNeighbours,
                        excludeNeighbours,
                        neighboursCid,
                        hbondedTo,
                        neighboursDistance
                    );
                    representation.interfaceOption.selectionType = ruleType !== "neighbourhood" ? ruleType : "molecule";
                    dispatch(addCustomRepresentation(representation));
                }
            } else if (mode === "edit" && props.representation.uniqueId) {
                const representation = props.molecule.representations.find(item => item.uniqueId === props.representation.uniqueId);
                if (representation) {
                    representation.cid = cidSelection;
                    representation.restrictToNeighbours = restrictToNeighbours;
                    representation.neighboursDistance = neighboursDistance;
                    representation.excludeNeighbours = excludeNeighbours;
                    representation.neighboursCid = neighboursCid;
                    representation.hbondedTo = hbondedTo;
                    representation.hbondedToCid = neighboursCid;
                    representation.setStyle(representationStyle);
                    representation.setUseDefaultColourRules(!colourRule);
                    representation.setColourRules(colourRule ? [colourRule] : null);
                    await representation.redraw();
                    representation.setNonCustomOpacity(nonCustomAlpha);
                }
            }
            if (representationStyle === "adaptativeBonds") {
                props.molecule.adaptativeBondsRepresentation.residueEnvironmentOptions.backgroundRepresentation = adaptBondOOF;
                props.molecule.adaptativeBondsRepresentation.residueEnvironmentOptions.adaptiveDist = adaptDist;
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
                props.setBusy?.(false);
                console.warn(err);
                dispatch(
                    enqueueSnackbar({
                        message: `Something went wrong while ${mode === "edit" ? "editing" : "creating a new"} custom representation`,
                        variant: "error",
                    })
                );
            }
        };

        return (
            <MoorhenStack style={{ width: "25rem", margin: "0.5rem" }}>
                <MoorhenStack inputGrid>
                    <StyleSelector
                        value={representationStyle}
                        onChange={style => {
                            setRepresentationStyle(style);
                            if (style === "residue_environment") setRuleType("cid");
                        }}
                        mode={mode}
                        adaptBondOOF={adaptBondOOF}
                        setAdaptBondOOF={setAdaptBondOOF}
                    />
                    {representationStyle !== "adaptativeBonds" && (
                        <ResidueSelectionSection
                            ruleType={ruleType}
                            setRuleType={setRuleType}
                            representationStyle={representationStyle}
                            molecules={molecules}
                            molecule={props.molecule}
                            selectedChain={selectedChain}
                            setSelectedChain={setSelectedChain}
                            sequenceResidueRange={sequenceResidueRange}
                            setSequenceResidueRange={setSequenceResidueRange}
                            cid={cid}
                            setCid={setCid}
                            setLigandCid={setLigandCid}
                            setRestrictToNeighbours={setRestrictToNeighbours}
                            isThereLigand={isThereLigand}
                        />
                    )}
                    <FilterToggles
                        notHOH={notHOH}
                        setNotHOH={setNotHOH}
                        notH={notH}
                        setNotH={setNotH}
                        sideChainOnly={sideChainOnly}
                        setSideChainOnly={setSideChainOnly}
                        representationStyle={representationStyle}
                        ruleType={ruleType}
                    />
                    <NeighbourhoodSettings
                        restrictToNeighbours={restrictToNeighbours}
                        neighboursCid={neighboursCid}
                        setNeighboursCid={setNeighboursCid}
                        excludeNeighbours={excludeNeighbours}
                        setExcludeNeighbours={setExcludeNeighbours}
                        neighboursDistance={neighboursDistance}
                        setNeighboursDistance={setNeighboursDistance}
                        hbondedTo={hbondedTo}
                        setHbondedTo={setHbondedTo}
                        representationStyle={representationStyle}
                        ruleType={ruleType}
                    />
                </MoorhenStack>
                {["CBs", "CAs", "ligands", "CRs", "MolecularSurface", "residue_environment"].includes(representationStyle) && (
                    <MoorhenToggle
                        type="switch"
                        label="Apply general representation settings"
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
                    <ResidueEnvironmentStyleSelectors representation={representationRef.current} />
                )}
                {representationStyle === "adaptativeBonds" && (
                    <MoorhenStack card>
                        <MoorhenSlider
                            sliderTitle="Neighbouring Res. Dist."
                            value={adaptDist}
                            setValue={(value: number) => {
                                setAdaptDist(value);
                                props.molecule.adaptativeBondsRepresentation.residueEnvironmentOptions.adaptiveDist = value;
                                props.molecule.adaptativeBondsRepresentation.redraw();
                            }}
                            showLabels={false}
                            stepButtons={0.5}
                            minVal={1}
                            maxVal={15}
                            scale="linear"
                            decimalPlaces={2}
                        />
                    </MoorhenStack>
                )}
                <ColourSettingsSection
                    useDefaultColours={useDefaultColours}
                    setUseDefaultColours={setUseDefaultColours}
                    applyColourToNonCarbonAtoms={applyColourToNonCarbonAtoms}
                    setApplyColourToNonCarbonAtoms={setApplyColourToNonCarbonAtoms}
                    colourMode={colourMode}
                    setColourMode={setColourMode}
                    colour={colour}
                    setColour={setColour}
                    nonCustomOpacity={nonCustomOpacity}
                    setNonCustomOpacity={setNonCustomOpacity}
                    representationStyle={representationStyle}
                    mode={mode}
                    molecule={props.molecule}
                    urlPrefix={props.urlPrefix}
                    representation={props.representation}
                    ncsColourRuleRef={ncsColourRuleRef}
                />
                <MoorhenButton onClick={handleCreateRepresentation}>{mode === "add" ? "Create" : "Apply"}</MoorhenButton>
            </MoorhenStack>
        );
    }
);
