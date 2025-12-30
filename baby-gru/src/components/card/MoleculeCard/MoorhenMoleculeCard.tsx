import { AddOutlined, FormatColorFillOutlined, TuneOutlined } from "@mui/icons-material";
import { LinearProgress } from "@mui/material";
import { useDispatch, useSelector, useStore } from "react-redux";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { useCommandCentre, usePaths } from "../../../InstanceManager";
import { isDarkBackground } from "../../../WebGLgComponents/webGLUtils";
import { RootState } from "../../../store/MoorhenReduxStore";
import { triggerUpdate } from "../../../store/moleculeMapUpdateSlice";
import { addGeneralRepresentation, addMolecule, hideMolecule, showMolecule } from "../../../store/moleculesSlice";
import { moorhen } from "../../../types/moorhen";
import { convertViewtoPx, getCentreAtom } from "../../../utils/utils";
import { MoorhenButton, MoorhenPopoverButton } from "../../inputs";
import { MoorhenAccordion, MoorhenMenuItem, MoorhenMenuItemPopover, MoorhenStack } from "../../interface-base";
import { DeleteDisplayObject, GenerateAssembly, RenameDisplayObject } from "../../menu-item";
import { MoorhenAddCustomRepresentationCard } from "../MoorhenAddCustomRepresentationCard";
import { MoorhenHeaderInfoCard } from "../MoorhenHeaderInfoCard";
import { MoorhenMoleculeRepresentationSettingsCard } from "../MoorhenMoleculeRepresentationSettingsCard";
import { ItemName } from "../utils/ItemName";
import { MoorhenModifyColourRulesCard } from "./MoorhenModifyColourRulesCard";
import { CustomRepresentationChip, RepresentationCheckbox } from "./RepresentationChip";
import { MoorhenCarbohydrateList } from "./list/MoorhenCarbohydrateList";
import { MoorhenLigandList } from "./list/MoorhenLigandList";
import { MoorhenSequencesAccordion } from "./list/MoorhenSequencesAccordion";
import "./molecule-card.css";

const allRepresentations: moorhen.RepresentationStyles[] = [
    "CBs",
    "adaptativeBonds",
    "CAs",
    "CRs",
    "ligands",
    "gaussian",
    "MolecularSurface",
    "VdwSpheres",
    "rama",
    "rotamer",
    "CDs",
    "allHBonds",
    "glycoBlocks",
    "restraints",
    "environment",
];

interface MoorhenMoleculeCardPropsInterface {
    dropdownId: number;
    accordionDropdownId: number;
    setAccordionDropdownId: React.Dispatch<React.SetStateAction<number>>;
    sideBarWidth: number;
    showSideBar: boolean;
    busy: boolean;
    key: number;
    index: number;
    molecule: moorhen.Molecule;
    currentDropdownMolNo: number;
    setCurrentDropdownMolNo: React.Dispatch<React.SetStateAction<number>>;
}

export type clickedResidueType = {
    modelIndex: number;
    molName: string;
    chain: string;
    seqNum: number;
};

export const MoorhenMoleculeCard = forwardRef<any, MoorhenMoleculeCardPropsInterface>((props, cardRef) => {
    const commandCentre = useCommandCentre();
    const urlPrefix = usePaths().urlPrefix;
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark);
    const backgroundColor = useSelector((state: moorhen.State) => state.sceneSettings.backgroundColor);
    const defaultExpandDisplayCards = useSelector((state: moorhen.State) => state.generalStates.defaultExpandDisplayCards);
    const drawMissingLoops = useSelector((state: moorhen.State) => state.sceneSettings.drawMissingLoops);
    const userPreferencesMounted = useSelector((state: moorhen.State) => state.generalStates.userPreferencesMounted);
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height);
    const isVisible = useSelector((state: moorhen.State) => state.molecules.visibleMolecules.includes(props.molecule.molNo));
    const drawInteractions = useSelector((state: moorhen.State) =>
        state.molecules.generalRepresentations.some(
            item => item.parentMolecule?.molNo === props.molecule.molNo && item.style === "environment" && !item.isCustom
        )
    );
    const customRepresentationsString = useSelector((state: moorhen.State) => {
        return JSON.stringify(
            state.molecules.customRepresentations
                .filter(item => item.parentMolecule?.molNo === props.molecule.molNo)
                .map(item => item.uniqueId)
        );
    });
    const generalRepresentationString = useSelector((state: moorhen.State) => {
        return JSON.stringify(
            state.molecules.generalRepresentations
                .filter(item => item.parentMolecule?.molNo === props.molecule.molNo)
                .map(item => item.style)
        );
    });

    const dispatch = useDispatch();
    const store = useStore<RootState>();

    const cardHeaderDivRef = useRef<HTMLDivElement | null>(null);
    const addColourRulesAnchorDivRef = useRef<HTMLDivElement | null>(null);
    const busyRedrawing = useRef<boolean>(false);
    const isDirty = useRef<boolean>(false);
    const innerDrawMissingLoopsRef = useRef<boolean>(null);

    const [busyDrawingCustomRepresentation, setBusyDrawingCustomRepresentation] = useState<boolean>(false);
    const [busyLoadingSequences, setBusyLoadingSequences] = useState<boolean>(false);
    const [busyLoadingLigands, setBusyLoadingLigands] = useState<boolean>(false);
    const [busyLoadingCarbohydrates, setBusyLoadingCarbohydrates] = useState<boolean>(false);

    const [showHeaderInfo, setShowHeaderInfo] = useState<boolean>(false);
    const [showColourRulesModal, setShowColourRulesModal] = useState<boolean>(false);
    const [showCreateCustomRepresentation, setShowCreateCustomRepresentation] = useState<boolean>(false);
    const [showCreateRepresentationSettingsModal, setShowCreateRepresentationSettingsModal] = useState<boolean>(false);

    const [selectedResidues, setSelectedResidues] = useState<[number, number] | null>(null);
    const [clickedResidue, setClickedResidue] = useState<clickedResidueType | null>(null);
    const [isCollapsed, setIsCollapsed] = useState<boolean>(!defaultExpandDisplayCards);

    const [cylindersStyleAngularSampling, setCylindersStyleAngularSampling] = useState<number>(
        props.molecule.defaultM2tParams.cylindersStyleAngularSampling
    );
    const [cylindersStyleCylinderRadius, setCylindersStyleCylinderRadius] = useState<number>(
        props.molecule.defaultM2tParams.cylindersStyleCylinderRadius
    );
    const [cylindersStyleBallRadius, setCylindersStyleBallRadius] = useState<number>(
        props.molecule.defaultM2tParams.cylindersStyleBallRadius
    );

    const [surfaceStyleProbeRadius, setSurfaceStyleProbeRadius] = useState<number>(props.molecule.defaultM2tParams.surfaceStyleProbeRadius);
    const [ballsStyleRadiusMultiplier, setBallsStyleRadiusMultiplier] = useState<number>(
        props.molecule.defaultM2tParams.ballsStyleRadiusMultiplier
    );

    const [ribbonCoilThickness, setRibbonCoilThickness] = useState<number>(props.molecule.defaultM2tParams.ribbonStyleCoilThickness);
    const [ribbonHelixWidth, setRibbonHelixWidth] = useState<number>(props.molecule.defaultM2tParams.ribbonStyleHelixWidth);
    const [ribbonStrandWidth, setRibbonStrandWidth] = useState<number>(props.molecule.defaultM2tParams.ribbonStyleStrandWidth);
    const [ribbonArrowWidth, setRibbonArrowWidth] = useState<number>(props.molecule.defaultM2tParams.ribbonStyleArrowWidth);
    const [ribbonDNARNAWidth, setRibbonDNARNAWidth] = useState<number>(props.molecule.defaultM2tParams.ribbonStyleDNARNAWidth);
    const [ribbonAxialSampling, setRibbonAxialSampling] = useState<number>(props.molecule.defaultM2tParams.ribbonStyleAxialSampling);
    const [nucleotideRibbonStyle, setNucleotideRibbonStyle] = useState<"DishyBases" | "StickBases">(
        props.molecule.defaultM2tParams.nucleotideRibbonStyle
    );
    const [dishStyleAngularSampling, setDishStyleAngularSampling] = useState<number>(
        props.molecule.defaultM2tParams.dishStyleAngularSampling
    );

    const [bondWidth, setBondWidth] = useState<number>(props.molecule.defaultBondOptions.width);
    const [atomRadiusBondRatio, setAtomRadiusBondRatio] = useState<number>(props.molecule.defaultBondOptions.atomRadiusBondRatio);
    const [showAniso, setShowAniso] = useState<boolean>(props.molecule.defaultBondOptions.showAniso);
    const [showOrtep, setShowOrtep] = useState<boolean>(props.molecule.defaultBondOptions.showOrtep);
    const [showHs, setShowHs] = useState<boolean>(props.molecule.defaultBondOptions.showHs);
    const [bondSmoothness, setBondSmoothness] = useState<number>(
        props.molecule.defaultBondOptions.smoothness === 1 ? 1 : props.molecule.defaultBondOptions.smoothness === 2 ? 50 : 100
    );
    const [ssUsageScheme, setSsUsageScheme] = useState<number>(props.molecule.defaultM2tParams.ssUsageScheme);

    const [surfaceSigma, setSurfaceSigma] = useState<number>(4.4);
    const [surfaceLevel, setSurfaceLevel] = useState<number>(4.0);
    const [surfaceRadius, setSurfaceRadius] = useState<number>(5.0);
    const [surfaceGridScale, setSurfaceGridScale] = useState<number>(0.7);
    const [surfaceBFactor, setSurfaceBFactor] = useState<number>(100);

    const [maxEnvDist, setMaxEnvDist] = useState<number>(props.molecule.defaultResidueEnvironmentOptions.maxDist);
    const [labelledEnv, setLabelledEnv] = useState<boolean>(props.molecule.defaultResidueEnvironmentOptions.labelled);
    const [showEnvHBonds, setShowEnvHBonds] = useState<boolean>(props.molecule.defaultResidueEnvironmentOptions.showHBonds);
    const [showEnvContacts, setShowEnvContacts] = useState<boolean>(props.molecule.defaultResidueEnvironmentOptions.showContacts);

    const [symmetryRadius, setSymmetryRadius] = useState<number>(props.molecule.symmetryRadius);

    const customRepresentationList: moorhen.MoleculeRepresentation[] = useMemo(() => {
        return JSON.parse(customRepresentationsString).map(representationId => {
            return props.molecule.representations.find(item => item.uniqueId === representationId);
        });
    }, [customRepresentationsString]);

    const generalRepresentationsList: moorhen.RepresentationStyles[] = useMemo(() => {
        return JSON.parse(generalRepresentationString);
    }, [generalRepresentationString]);

    useImperativeHandle(
        cardRef,
        () => ({
            forceIsCollapsed: (value: boolean) => {
                setIsCollapsed(value);
            },
        }),
        [setIsCollapsed]
    );

    const bondSettingsProps = {
        bondWidth,
        setBondWidth,
        atomRadiusBondRatio,
        setAtomRadiusBondRatio,
        bondSmoothness,
        setBondSmoothness,
        showAniso,
        setShowAniso,
        showOrtep,
        setShowOrtep,
        showHs,
        setShowHs,
    };

    const ribbonSettingsProps = {
        ribbonCoilThickness,
        setRibbonCoilThickness,
        ribbonHelixWidth,
        setRibbonHelixWidth,
        ribbonStrandWidth,
        setRibbonStrandWidth,
        ribbonArrowWidth,
        setRibbonArrowWidth,
        ribbonDNARNAWidth,
        setRibbonDNARNAWidth,
        ribbonAxialSampling,
        setRibbonAxialSampling,
        nucleotideRibbonStyle,
        setNucleotideRibbonStyle,
        dishStyleAngularSampling,
        setDishStyleAngularSampling,
        ssUsageScheme,
        setSsUsageScheme,
    };

    const molSurfSettingsProps = {
        surfaceStyleProbeRadius,
        setSurfaceStyleProbeRadius,
        ballsStyleRadiusMultiplier,
        setBallsStyleRadiusMultiplier,
    };

    const cylinderSettingsProps = {
        cylindersStyleAngularSampling,
        setCylindersStyleAngularSampling,
        cylindersStyleBallRadius,
        setCylindersStyleBallRadius,
        cylindersStyleCylinderRadius,
        setCylindersStyleCylinderRadius,
    };

    const symmetrySettingsProps = {
        symmetryRadius,
        setSymmetryRadius,
    };

    const gaussianSettingsProps = {
        surfaceSigma,
        setSurfaceSigma,
        surfaceLevel,
        setSurfaceLevel,
        surfaceBFactor,
        setSurfaceBFactor,
        surfaceRadius,
        setSurfaceRadius,
        surfaceGridScale,
        setSurfaceGridScale,
    };

    const residueEnvironmentSettingsProps = {
        maxDist: maxEnvDist,
        setMaxDist: setMaxEnvDist,
        labelled: labelledEnv,
        setLabelled: setLabelledEnv,
        showHBonds: showEnvHBonds,
        setShowHBonds: setShowEnvHBonds,
        showContacts: showEnvContacts,
        setShowContacts: setShowEnvContacts,
    };

    const redrawMolIfDirty = async (representationIds: string[]) => {
        if (isDirty.current) {
            busyRedrawing.current = true;
            isDirty.current = false;
            for (const id of representationIds) {
                await props.molecule.redrawRepresentation(id);
            }
            busyRedrawing.current = false;
            redrawMolIfDirty(representationIds);
        }
    };

    const redrawEnvironment = useCallback(async () => {
        if (drawInteractions) {
            const [molecule, cid] = await getCentreAtom(molecules, commandCentre, store);
            if (molecule?.molNo === props.molecule.molNo) {
                props.molecule.clearBuffersOfStyle("environment");
                await props.molecule.drawEnvironment(cid);
            } else {
                props.molecule.clearBuffersOfStyle("environment");
            }
        } else {
            props.molecule.clearBuffersOfStyle("environment");
        }
    }, [drawInteractions, molecules, commandCentre, props.molecule]);

    const redrawOriginRepresentations = useCallback(async () => {
        if (isDirty.current) {
            busyRedrawing.current = true;
            isDirty.current = false;
            if (props.molecule.adaptativeBondsEnabled || drawInteractions) {
                const [molecule, cid] = await getCentreAtom(molecules, commandCentre, store);
                if (molecule.molNo === props.molecule.molNo) {
                    if (props.molecule.adaptativeBondsEnabled) {
                        await props.molecule.redrawAdaptativeBonds(cid);
                    }
                    if (drawInteractions) {
                        await props.molecule.drawEnvironment(cid);
                    }
                } else {
                    props.molecule.clearBuffersOfStyle("environment");
                }
            } else {
                props.molecule.clearBuffersOfStyle("environment");
            }
            await props.molecule.drawSymmetry();
            busyRedrawing.current = false;
            await redrawOriginRepresentations();
        }
    }, [molecules, props.molecule, drawInteractions, commandCentre]);

    const handleOriginUpdate = useCallback(() => {
        isDirty.current = true;
        if (!busyRedrawing.current && isVisible) {
            redrawOriginRepresentations();
        }
    }, [redrawOriginRepresentations, isVisible]);

    useEffect(() => {
        if (!userPreferencesMounted || drawMissingLoops === null) {
            return;
        } else if (innerDrawMissingLoopsRef.current === null) {
            innerDrawMissingLoopsRef.current = drawMissingLoops;
            return;
        } else if (innerDrawMissingLoopsRef.current !== drawMissingLoops) {
            innerDrawMissingLoopsRef.current = drawMissingLoops;
            const representations = props.molecule.representations.filter(
                representation => representation.visible && ["CBs", "CAs", "ligands"].includes(representation.style)
            );
            if (isVisible && representations.length > 0) {
                isDirty.current = true;
                if (!busyRedrawing.current) {
                    redrawMolIfDirty(representations.map(representation => representation.uniqueId));
                }
            }
        }
    }, [drawMissingLoops]);

    useEffect(() => {
        if (backgroundColor === null) {
            return;
        }

        const representations = props.molecule.representations.filter(
            representation => representation.visible && ["CBs", "ligands"].includes(representation.style)
        );

        if (isVisible && representations.length > 0) {
            const newBackgroundIsDark = isDarkBackground(...backgroundColor);
            if (props.molecule.isDarkBackground !== newBackgroundIsDark) {
                props.molecule.isDarkBackground = newBackgroundIsDark;
                isDirty.current = true;
                if (!busyRedrawing.current) {
                    redrawMolIfDirty(representations.map(representation => representation.uniqueId));
                }
            }
        }
    }, [backgroundColor, generalRepresentationString]);

    useEffect(() => {
        const handleEnvSettingsChange = async () => {
            if ([labelledEnv, showEnvHBonds, showEnvContacts].some(item => item === null)) {
                return;
            }

            const representations = props.molecule.representations.filter(
                representation =>
                    representation.useDefaultResidueEnvironmentOptions &&
                    representation.visible &&
                    representation.style === "residue_environment"
            );

            const needsRedraw =
                props.molecule.defaultResidueEnvironmentOptions.showHBonds !== showEnvHBonds ||
                props.molecule.defaultResidueEnvironmentOptions.showContacts !== showEnvContacts ||
                props.molecule.defaultResidueEnvironmentOptions.labelled !== labelledEnv;

            if (needsRedraw) {
                props.molecule.defaultResidueEnvironmentOptions = {
                    ...props.molecule.defaultResidueEnvironmentOptions,
                    showHBonds: showEnvHBonds,
                    showContacts: showEnvContacts,
                    labelled: labelledEnv,
                };
            }

            if (isVisible && needsRedraw) {
                await redrawEnvironment();
                if (representations.length > 0) {
                    isDirty.current = true;
                    if (!busyRedrawing.current) {
                        await redrawMolIfDirty(representations.map(representation => representation.uniqueId));
                    }
                }
            }
        };
        handleEnvSettingsChange();
    }, [labelledEnv, showEnvHBonds, showEnvContacts]);

    useEffect(() => {
        const handleMaxEnvDistChange = async () => {
            if (maxEnvDist === null) {
                return;
            }

            const representations = props.molecule.representations.filter(
                representation =>
                    representation.useDefaultResidueEnvironmentOptions &&
                    representation.visible &&
                    representation.style === "residue_environment"
            );

            const needsRedraw = props.molecule.defaultResidueEnvironmentOptions.maxDist !== maxEnvDist;

            if (needsRedraw) {
                props.molecule.defaultResidueEnvironmentOptions = {
                    ...props.molecule.defaultResidueEnvironmentOptions,
                    maxDist: maxEnvDist,
                };
            }

            if (isVisible && needsRedraw) {
                if (props.molecule.adaptativeBondsEnabled) {
                    isDirty.current = true;
                    if (!busyRedrawing.current) {
                        await redrawOriginRepresentations();
                    }
                }
                if (representations.length > 0) {
                    isDirty.current = true;
                    if (!busyRedrawing.current) {
                        await redrawMolIfDirty(representations.map(representation => representation.uniqueId));
                    }
                }
            }
        };
        handleMaxEnvDistChange();
    }, [maxEnvDist]);

    useEffect(() => {
        if ([cylindersStyleAngularSampling, cylindersStyleBallRadius, cylindersStyleCylinderRadius].some(item => item === null)) {
            return;
        }

        const representations = props.molecule.representations.filter(
            representation => representation.useDefaultM2tParams && representation.visible && representation.style === "CRs"
        );

        const needsRedraw =
            props.molecule.defaultM2tParams.cylindersStyleAngularSampling !== cylindersStyleAngularSampling ||
            props.molecule.defaultM2tParams.cylindersStyleBallRadius !== cylindersStyleBallRadius ||
            props.molecule.defaultM2tParams.cylindersStyleCylinderRadius !== cylindersStyleCylinderRadius ||
            props.molecule.defaultM2tParams.ssUsageScheme !== ssUsageScheme;

        if (needsRedraw) {
            props.molecule.defaultM2tParams = {
                ...props.molecule.defaultM2tParams,
                cylindersStyleAngularSampling: cylindersStyleAngularSampling,
                cylindersStyleBallRadius: cylindersStyleBallRadius,
                cylindersStyleCylinderRadius: cylindersStyleCylinderRadius,
            };
        }

        if (isVisible && representations.length > 0 && needsRedraw) {
            isDirty.current = true;
            if (!busyRedrawing.current) {
                redrawMolIfDirty(representations.map(representation => representation.uniqueId));
            }
        }
    }, [cylindersStyleAngularSampling, cylindersStyleBallRadius, cylindersStyleCylinderRadius, dishStyleAngularSampling]);

    useEffect(() => {
        if ([ballsStyleRadiusMultiplier, surfaceStyleProbeRadius].some(item => item === null)) {
            return;
        }

        const representations = props.molecule.representations.filter(
            representation => representation.useDefaultM2tParams && representation.visible && representation.style === "MolecularSurface"
        );

        const needsRedraw =
            props.molecule.defaultM2tParams.ballsStyleRadiusMultiplier !== ballsStyleRadiusMultiplier ||
            props.molecule.defaultM2tParams.surfaceStyleProbeRadius !== surfaceStyleProbeRadius;

        if (needsRedraw) {
            props.molecule.defaultM2tParams = {
                ...props.molecule.defaultM2tParams,
                ballsStyleRadiusMultiplier: ballsStyleRadiusMultiplier,
                surfaceStyleProbeRadius: surfaceStyleProbeRadius,
            };
        }

        if (isVisible && representations.length > 0 && needsRedraw) {
            isDirty.current = true;
            if (!busyRedrawing.current) {
                redrawMolIfDirty(representations.map(representation => representation.uniqueId));
            }
        }
    }, [ballsStyleRadiusMultiplier, surfaceStyleProbeRadius]);

    useEffect(() => {
        if (
            [
                nucleotideRibbonStyle,
                ribbonArrowWidth,
                ribbonAxialSampling,
                ribbonCoilThickness,
                ribbonDNARNAWidth,
                ribbonHelixWidth,
                ribbonStrandWidth,
                dishStyleAngularSampling,
            ].some(item => item === null)
        ) {
            return;
        }

        const representations = props.molecule.representations.filter(
            representation => representation.useDefaultM2tParams && representation.visible && representation.style === "CRs"
        );

        const needsRedraw =
            props.molecule.defaultM2tParams.ribbonStyleArrowWidth !== ribbonArrowWidth ||
            props.molecule.defaultM2tParams.ribbonStyleAxialSampling !== ribbonAxialSampling ||
            props.molecule.defaultM2tParams.ribbonStyleCoilThickness !== ribbonCoilThickness ||
            props.molecule.defaultM2tParams.ribbonStyleDNARNAWidth !== ribbonDNARNAWidth ||
            props.molecule.defaultM2tParams.ribbonStyleHelixWidth !== ribbonHelixWidth ||
            props.molecule.defaultM2tParams.ribbonStyleStrandWidth !== ribbonStrandWidth ||
            props.molecule.defaultM2tParams.nucleotideRibbonStyle !== nucleotideRibbonStyle ||
            props.molecule.defaultM2tParams.dishStyleAngularSampling !== dishStyleAngularSampling ||
            props.molecule.defaultM2tParams.ssUsageScheme !== ssUsageScheme;

        if (needsRedraw) {
            props.molecule.defaultM2tParams = {
                ...props.molecule.defaultM2tParams,
                ribbonStyleArrowWidth: ribbonArrowWidth,
                ribbonStyleAxialSampling: ribbonAxialSampling,
                ribbonStyleCoilThickness: ribbonCoilThickness,
                ribbonStyleDNARNAWidth: ribbonDNARNAWidth,
                ribbonStyleHelixWidth: ribbonHelixWidth,
                ribbonStyleStrandWidth: ribbonStrandWidth,
                nucleotideRibbonStyle: nucleotideRibbonStyle,
                dishStyleAngularSampling: dishStyleAngularSampling,
                ssUsageScheme: ssUsageScheme,
            };
        }

        if (isVisible && representations.length > 0 && needsRedraw) {
            isDirty.current = true;
            if (!busyRedrawing.current) {
                redrawMolIfDirty(representations.map(representation => representation.uniqueId));
            }
        }
    }, [
        ribbonArrowWidth,
        ribbonAxialSampling,
        ribbonCoilThickness,
        ribbonDNARNAWidth,
        ribbonHelixWidth,
        ribbonStrandWidth,
        nucleotideRibbonStyle,
        dishStyleAngularSampling,
        ssUsageScheme,
    ]);

    useEffect(() => {
        if ([bondSmoothness, bondWidth, atomRadiusBondRatio, showAniso, showOrtep, showHs].some(item => item === null)) {
            return;
        }

        const representations = props.molecule.representations.filter(
            representation =>
                representation.useDefaultBondOptions && representation.visible && ["CBs", "CAs", "ligands"].includes(representation.style)
        );

        const needsRedraw =
            props.molecule.defaultBondOptions.width !== bondWidth ||
            props.molecule.defaultBondOptions.atomRadiusBondRatio !== atomRadiusBondRatio ||
            props.molecule.defaultBondOptions.smoothness !== bondSmoothness ||
            props.molecule.defaultBondOptions.showAniso !== showAniso ||
            props.molecule.defaultBondOptions.showOrtep !== showOrtep ||
            props.molecule.defaultBondOptions.showHs !== showHs;

        if (needsRedraw) {
            props.molecule.defaultBondOptions = {
                width: bondWidth,
                atomRadiusBondRatio: atomRadiusBondRatio,
                showAniso: showAniso,
                showOrtep: showOrtep,
                showHs: showHs,
                smoothness: bondSmoothness === 1 ? 1 : bondSmoothness === 50 ? 2 : 3,
            };
        }

        if (isVisible && representations.length > 0 && needsRedraw) {
            isDirty.current = true;
            if (!busyRedrawing.current) {
                redrawMolIfDirty(representations.map(representation => representation.uniqueId));
            }
        }
    }, [bondSmoothness, bondWidth, atomRadiusBondRatio, showAniso, showOrtep, showHs]);

    useEffect(() => {
        if (symmetryRadius === null) {
            return;
        }
        props.molecule.setSymmetryRadius(symmetryRadius);
    }, [symmetryRadius]);

    useEffect(() => {
        if ([surfaceSigma, surfaceLevel, surfaceRadius, surfaceGridScale, surfaceBFactor].some(item => item === null)) {
            return;
        }

        const representations = props.molecule.representations.filter(
            representation => representation.visible && representation.style === "gaussian"
        );

        const needsRedraw =
            props.molecule.gaussianSurfaceSettings.sigma !== surfaceSigma ||
            props.molecule.gaussianSurfaceSettings.countourLevel !== surfaceLevel ||
            props.molecule.gaussianSurfaceSettings.boxRadius !== surfaceRadius ||
            props.molecule.gaussianSurfaceSettings.gridScale !== surfaceGridScale ||
            props.molecule.gaussianSurfaceSettings.bFactor !== surfaceBFactor;

        if (needsRedraw) {
            props.molecule.gaussianSurfaceSettings = {
                sigma: surfaceSigma,
                countourLevel: surfaceLevel,
                boxRadius: surfaceRadius,
                gridScale: surfaceGridScale,
                bFactor: surfaceBFactor,
            };
        }

        if (isVisible && representations.length > 0 && needsRedraw) {
            isDirty.current = true;
            if (!busyRedrawing.current) {
                redrawMolIfDirty(representations.map(representation => representation.uniqueId));
            }
        }
    }, [surfaceSigma, surfaceLevel, surfaceRadius, surfaceGridScale, surfaceBFactor]);

    useEffect(() => {
        dispatch(showMolecule(props.molecule));
        props.molecule.representations
            .filter(item => {
                return !item.isCustom && item.style !== "hover";
            })
            .forEach(item => {
                if (item.buffers.length > 0 && item.buffers[0].visible) {
                    dispatch(addGeneralRepresentation(item));
                }
            });
    }, []);

    useEffect(() => {
        if (isVisible) {
            props.molecule.representations.forEach(item => (generalRepresentationsList.includes(item.style) ? item.show() : null));
        } else {
            props.molecule.representations.forEach(item => (generalRepresentationsList.includes(item.style) ? item.hide() : null));
        }
    }, [isVisible]);

    useEffect(() => {
        if (!clickedResidue) {
            return;
        }

        props.molecule.centreOn(`/*/${clickedResidue.chain}/${clickedResidue.seqNum}-${clickedResidue.seqNum}/*`);
    }, [clickedResidue]);

    useEffect(() => {
        document.addEventListener("originUpdate", handleOriginUpdate);
        return () => {
            document.removeEventListener("originUpdate", handleOriginUpdate);
        };
    }, [handleOriginUpdate]);

    const handleDownload = async () => {
        await props.molecule.downloadAtoms();
        props.setCurrentDropdownMolNo(-1);
    };

    const handleCopyFragment = () => {
        async function createNewFragmentMolecule() {
            const cid = `//${clickedResidue.chain}/${selectedResidues[0]}-${selectedResidues[1]}/*`;
            const newMolecule = await props.molecule.copyFragmentUsingCid(cid, true);
            dispatch(addMolecule(newMolecule));
        }

        // TODO: Test that residue start and residue end are valid (i.e. not missing from the structure)
        if (clickedResidue && selectedResidues) {
            createNewFragmentMolecule();
        }
        props.setCurrentDropdownMolNo(-1);
    };

    const handleUndo = async () => {
        await props.molecule.undo();
        props.setCurrentDropdownMolNo(-1);
        dispatch(triggerUpdate(props.molecule.molNo));
    };

    const handleRedo = async () => {
        await props.molecule.redo();
        props.setCurrentDropdownMolNo(-1);
        dispatch(triggerUpdate(props.molecule.molNo));
    };

    const handleCentering = () => {
        props.molecule.centreOn();
        props.setCurrentDropdownMolNo(-1);
    };

    const handleShowInfo = () => {
        setShowHeaderInfo(true);
    };

    const handleProps = { handleCentering, handleCopyFragment, handleDownload, handleRedo, handleUndo, handleShowInfo };
    const handleVisibility = useCallback(() => {
        dispatch(isVisible ? hideMolecule(props.molecule) : showMolecule(props.molecule));
        props.setCurrentDropdownMolNo(-1);
    }, [isVisible]);

    const [currentName, setCurrentName] = useState<string>(props.molecule.name);
    const handleRename = (name: string) => {
        if (name === "") {
            return;
        }
        setCurrentName(name);
        props.molecule.name = name;
    };

    const showAssemblies = useMemo(() => {
        if (!props.molecule.gemmiStructure) {
            return false;
        }
        try {
            const assemblies = props.molecule.gemmiStructure.assemblies;
            for (let i = 0; i < assemblies.size(); i++) {
                const assembly = assemblies.get(i);
                const generators = assembly.generators;
                const n_gen = generators.size();
                let n_tot_op = 0;
                for (let i_gen = 0; i_gen < n_gen; i_gen++) {
                    const gen = generators.get(i_gen);
                    const operators = gen.operators;
                    const n_op = operators.size();
                    n_tot_op += n_op;
                    gen.delete();
                    operators.delete();
                }
                assembly.delete();
                generators.delete();

                if (n_tot_op !== 60 && n_tot_op !== 1) {
                    assemblies.delete();
                    return true;
                }
            }
            assemblies.delete();
        } catch (e) {
            console.log("Some problem getting assembly info");
        }
    }, []);

    const dropDownMenu: React.JSX.Element = (
        <div style={{ display: "flex", flexDirection: "column", width: "150px" }}>
            <MoorhenMenuItem
                key={6}
                onClick={() => {
                    document.body.click();
                    handleShowInfo();
                }}
            >
                Header info
            </MoorhenMenuItem>
            <MoorhenMenuItemPopover menuItemText="Rename Molecule">
                <RenameDisplayObject key="rename" setCurrentName={handleRename} item={props.molecule} />
            </MoorhenMenuItemPopover>
            {showAssemblies ? (
                <MoorhenMenuItemPopover menuItemText="Generate Assembly">
                    <GenerateAssembly key="assembly" setPopoverIsShown={() => {}} setCurrentName={handleRename} item={props.molecule} />
                </MoorhenMenuItemPopover>
            ) : null}
            <MoorhenMenuItemPopover menuItemText="Delete Molecule" style={{ color: "var(--moorhen-danger)" }}>
                <DeleteDisplayObject key="deleteDisplayObjectMenuItem" item={props.molecule} />
            </MoorhenMenuItemPopover>
        </div>
    );

    const extraControls: React.JSX.Element[] = [
        <MoorhenButton
            key="visibility"
            size="accordion"
            onClick={handleVisibility}
            type="icon-only"
            icon={isVisible ? `MUISymbolVisibility` : `MUISymbolVisibilityOff`}
            tooltip="Toggle visibility"
        />,
        <MoorhenButton key="undo" size="accordion" onClick={handleUndo} type="icon-only" icon="MUISymbolUndo" tooltip="Undo" />,
        <MoorhenButton key="redo" size="accordion" onClick={handleRedo} type="icon-only" icon="MUISymbolRedo" tooltip="Redo" />,
        <MoorhenButton
            key="center"
            size="accordion"
            onClick={handleCentering}
            type="icon-only"
            icon="MUISymbolFilterFocus"
            tooltip="Center on molecule"
        />,
        <MoorhenButton
            key="download"
            type="icon-only"
            icon={`MUISymbolDownload`}
            onClick={handleDownload}
            size="accordion"
            tooltip="Save molecule"
        />,
        <MoorhenPopoverButton size="accordion" popoverPlacement="left" tooltip="More">
            {dropDownMenu}
        </MoorhenPopoverButton>,
    ];

    const cardLabel = <ItemName item={props.molecule} />;

    return (
        <MoorhenAccordion title={cardLabel} type="card" defaultOpen={true} extraControls={extraControls}>
            <MoorhenStack gap={2} direction="vertical">
                <div className="moorhen__molecule_card_representation">
                    <MoorhenStack direction="vertical" card>
                        <div className="moorhen__molecule_card_representation-chip-container" ref={addColourRulesAnchorDivRef}>
                            {allRepresentations.map(key => (
                                <RepresentationCheckbox key={key} style={key} molecule={props.molecule} isVisible={isVisible} />
                            ))}
                        </div>
                        <hr style={{ margin: "0.5rem" }}></hr>
                        <div className="moorhen__molecule_card_representation-chip-container">
                            {props.molecule.representations.some(representation => representation.isCustom) ? (
                                <>
                                    {customRepresentationList
                                        .filter(representation => representation !== undefined)
                                        .map(representation => {
                                            return (
                                                <CustomRepresentationChip
                                                    key={representation.uniqueId}
                                                    addColourRulesAnchorDivRef={addColourRulesAnchorDivRef}
                                                    molecule={props.molecule}
                                                    representation={representation}
                                                />
                                            );
                                        })}
                                </>
                            ) : (
                                <span>No custom representations</span>
                            )}
                            {busyDrawingCustomRepresentation && <LinearProgress style={{ margin: "0.5rem" }} />}
                        </div>
                    </MoorhenStack>
                    <div className="moorhen__molecule_card_representation-buttons">
                        <MoorhenPopoverButton
                            type="default"
                            style={{ height: "100%" }}
                            popoverPlacement="left"
                            icon="MUISymbolColors"
                            closeButton
                        >
                            <MoorhenModifyColourRulesCard molecule={props.molecule} />
                        </MoorhenPopoverButton>
                        <MoorhenPopoverButton
                            style={{ height: "100%" }}
                            type="default"
                            popoverPlacement="left"
                            closeButton
                            icon="MUISymbolTune"
                        >
                            <MoorhenMoleculeRepresentationSettingsCard
                                residueEnvironmentSettingsProps={residueEnvironmentSettingsProps}
                                cylinderSettingsProps={cylinderSettingsProps}
                                molSurfSettingsProps={molSurfSettingsProps}
                                ribbonSettingsProps={ribbonSettingsProps}
                                symmetrySettingsProps={symmetrySettingsProps}
                                gaussianSettingsProps={gaussianSettingsProps}
                                bondSettingsProps={bondSettingsProps}
                                molecule={props.molecule}
                            />
                        </MoorhenPopoverButton>
                        <MoorhenPopoverButton style={{ height: "100%" }} type="default" icon="MUISymbolAdd" popoverPlacement="left">
                            <MoorhenAddCustomRepresentationCard
                                setBusy={setBusyDrawingCustomRepresentation}
                                urlPrefix={urlPrefix}
                                molecule={props.molecule}
                            />
                        </MoorhenPopoverButton>
                    </div>
                </div>
                <MoorhenHeaderInfoCard
                    anchorEl={cardHeaderDivRef}
                    molecule={props.molecule}
                    show={showHeaderInfo}
                    setShow={setShowHeaderInfo}
                />
                <div>
                    <MoorhenSequencesAccordion
                        setBusy={setBusyLoadingSequences}
                        molecule={props.molecule}
                        clickedResidue={clickedResidue}
                        setClickedResidue={setClickedResidue}
                        setSelectedResidues={setSelectedResidues}
                    />
                    {/* TODO: add the loading spinners */}
                    <MoorhenAccordion title="Ligands">
                        <MoorhenLigandList
                            setBusy={setBusyLoadingLigands}
                            commandCentre={commandCentre}
                            molecule={props.molecule}
                            height={convertViewtoPx(40, height)}
                        />
                    </MoorhenAccordion>
                    {/* TODO: add the loading spinners {busyLoadingCarbohydrates ? <Spinner animation="border" /> : <ExpandMoreOutlined />}*/}
                    {props.molecule.hasGlycans && (
                        <MoorhenAccordion title="Carbohydrates">
                            <MoorhenCarbohydrateList
                                setBusy={setBusyLoadingCarbohydrates}
                                molecule={props.molecule}
                                height={convertViewtoPx(40, height)}
                            />
                        </MoorhenAccordion>
                    )}
                </div>
            </MoorhenStack>
        </MoorhenAccordion>
    );
});
MoorhenMoleculeCard.displayName = "MoorhenMoleculeCard";
