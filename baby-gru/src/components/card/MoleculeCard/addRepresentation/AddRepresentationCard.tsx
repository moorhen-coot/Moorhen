import { useDispatch, useSelector, useStore } from "react-redux";
import { memo, useRef, useState } from "react";
import { useCommandCentre } from "@/InstanceManager";
import { RootState, enqueueSnackbar } from "@/store";
import { MoleculeRepresentation, RepresentationStyles } from "@/utils/Representation/MoorhenMoleculeRepresentation";
import { addCustomRepresentation } from "../../../../store/moleculesSlice";
import { moorhen } from "../../../../types/moorhen";
import { ColourRule } from "../../../../utils/MoorhenColourRule";
import { COOT_BOND_REPRESENTATIONS, M2T_REPRESENTATIONS } from "../../../../utils/enums";
import { MoorhenButton, MoorhenSlider, MoorhenToggle } from "../../../inputs";
import { MoorhenStack } from "../../../interface-base";
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
import { ResidueSelectionRuleType, ResidueSelectionSection } from "./components/ResidueSelectionSection";
import { StyleSelector } from "./components/StyleSelector";
import { extractRepresentationParams, getNonCustomAlpha } from "../../../../utils/Representation/RepresentationBuilder";

export const AddCustomRepresentationCard = memo(
    function AddCustomRepresentationCard(props: {
        molecule: moorhen.Molecule;
        urlPrefix: string;
        mode?: "add" | "edit";
        representation?: MoleculeRepresentation;
        setBusy?: React.Dispatch<React.SetStateAction<boolean>>;
        onApply?: () => void;
    }) {
        const store = useStore<RootState>();
        const existingParams = props.representation ? extractRepresentationParams(props.representation) : undefined;
        const ncsColourRuleRef = useRef<null | ColourRule>(existingParams?.ncsColourRule ?? null);

        const [ruleType, setRuleType] = useState<ResidueSelectionRuleType>(
            existingParams?.ruleType ?? "molecule"
        );
        const [representationStyle, setRepresentationStyle] = useState<moorhen.RepresentationStyles>(existingParams?.representationStyle ?? "CBs");

        const [restrictToNeighbours, setRestrictToNeighbours] = useState<boolean>(existingParams?.restrictToNeighbours ?? false);
        const [hbondedTo, setHbondedTo] = useState<boolean>(existingParams?.hbondedTo ?? false);
        const [excludeNeighbours, setExcludeNeighbours] = useState<boolean>(existingParams?.excludeNeighbours ?? false);
        const [neighboursCid, setNeighboursCid] = useState<string>(existingParams?.neighboursCid ?? "");
        const [neighboursDistance, setNeighboursDistance] = useState<number>(existingParams?.neighboursDistance ?? 6.0);

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

        const [colourMode, setColourMode] = useState<string>(existingParams?.colourMode ?? "custom");
        const [nonCustomOpacity, setNonCustomOpacity] = useState<number>(existingParams?.nonCustomOpacity ?? 1.0);
        const [colour, setColour] = useState<string>(
            existingParams && !existingParams.useDefaultColours && existingParams.colour !== ""
                ? existingParams.colour
                : "#47d65f"
        );
        const [applyColourToNonCarbonAtoms, setApplyColourToNonCarbonAtoms] = useState<boolean>(
            existingParams?.applyColourToNonCarbonAtoms ?? false
        );
        const [useDefaultColours, setUseDefaultColours] = useState<boolean>(existingParams?.useDefaultColours ?? true);

        const defaultChain = existingParams?.chainName || props.molecule.sequences[0]?.chain || "";

        const [selectedChain, setSelectedChain] = useState<string>(defaultChain);
        const [sequenceResidueRange, setSequenceResidueRange] = useState<[number, number] | null>(
            existingParams?.sequenceResidueRange ?? null
        );
        
        const [cid, setCid] = useState<string>(existingParams?.cid ?? "/*/*/*/*:*");
        const [adaptBondOOF, setAdaptBondOOF] = useState<RepresentationStyles>("CRs");
        const [adaptDist, setAdaptDist] = useState<number>(props.representation?.residueEnvironmentOptions.adaptiveDist ?? 8.0);

        const [notHOH, setNotHOH] = useState<boolean>(existingParams?.notHOH ?? false);
        const [notH, setNotH] = useState<boolean>(existingParams?.notH ?? false);
        const [sideChainOnly, setSideChainOnly] = useState<boolean>(existingParams?.sideChainOnly ?? false);

        const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);

        const dispatch = useDispatch();

        const mode = props.mode ?? "add";

        const commandCentre = useCommandCentre();
        const representationRef = useRef<MoleculeRepresentation>(
            props.representation ?? new MoleculeRepresentation(representationStyle, "/*/*/*/*:*", commandCentre.current)
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

        const applyRepresentation = async () => {
            props.setBusy?.(true);

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
                    const representation = await MoleculeRepresentation.create({
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
                        sequenceResidueRange:
                            sequenceResidueRange && sequenceResidueRange[0] !== -9999 ? sequenceResidueRange : null,
                        cid,
                        useDefaultColours,
                        colourMode,
                        colour,
                        applyColourToNonCarbonAtoms,
                        ncsColourRule: ncsColourRuleRef.current,
                        isCustom: true,
                        bondOptions: representationRef.current.useDefaultBondOptions
                            ? null
                            : { ...representationRef.current.bondOptions },
                        m2tParams: representationRef.current.useDefaultM2tParams
                            ? null
                            : { ...representationRef.current.m2tParams },
                        residueEnvironmentOptions: representationRef.current.useDefaultResidueEnvironmentOptions
                            ? null
                            : { ...representationRef.current.residueEnvironmentOptions },
                        nonCustomOpacity: nonCustomAlpha,
                        hbondedTo,
                    });

                    if (!representation) {
                        props.setBusy?.(false);
                        return;
                    }

                    dispatch(addCustomRepresentation(representation));
                }
            } else if (mode === "edit" && props.representation.uniqueId) {
                const existingRepresentation = props.molecule.representations.find(
                    item => item.uniqueId === props.representation.uniqueId
                );
                if (existingRepresentation) {
                    existingRepresentation.edit({
                        ruleType,
                        representationStyle,
                        chainName: selectedChain || null,
                        notHOH,
                        notH,
                        sideChainOnly,
                        restrictToNeighbours,
                        excludeNeighbours,
                        neighboursCid,
                        neighboursDistance,
                        sequenceResidueRange:
                            sequenceResidueRange && sequenceResidueRange[0] !== -9999 ? sequenceResidueRange : null,
                        cid,
                        useDefaultColours,
                        colourMode,
                        colour,
                        applyColourToNonCarbonAtoms,
                        ncsColourRule: ncsColourRuleRef.current,
                        bondOptions: representationRef.current.useDefaultBondOptions
                            ? null
                            : { ...representationRef.current.bondOptions },
                        m2tParams: representationRef.current.useDefaultM2tParams
                            ? null
                            : { ...representationRef.current.m2tParams },
                        residueEnvironmentOptions: representationRef.current.useDefaultResidueEnvironmentOptions
                            ? null
                            : { ...representationRef.current.residueEnvironmentOptions },
                        nonCustomOpacity: nonCustomAlpha,
                        hbondedTo,
                    });}

                    else {
                        props.setBusy?.(false);
                        return;
                    }
    
            }
            if (representationStyle === "adaptativeBonds") {
                props.molecule.adaptativeBondsRepresentation.residueEnvironmentOptions.backgroundRepresentation = adaptBondOOF;
                props.molecule.adaptativeBondsRepresentation.residueEnvironmentOptions.adaptiveDist = adaptDist;
            }
            props.setBusy?.(false);
            props.onApply?.();
        };

        const handleCreateRepresentation = async () => {
            try {
                await applyRepresentation();
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
            <MoorhenStack style={{ overflowY: "auto", maxHeight: "80vh", width: "25rem" }}>
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
