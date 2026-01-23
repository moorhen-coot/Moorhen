import { AddOutlined, FormatColorFillOutlined, TuneOutlined } from "@mui/icons-material";
import { LinearProgress } from "@mui/material";
import { useDispatch, useSelector, useStore } from "react-redux";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { RootState } from "@/store";
import { useCommandCentre, usePaths } from "../../../InstanceManager";
import { isDarkBackground } from "../../../WebGLgComponents/webGLUtils";
import { triggerUpdate } from "../../../store/moleculeMapUpdateSlice";
import {
    addGeneralRepresentation,
    addMolecule,
    hideMolecule,
    removeGeneralRepresentation,
    showMolecule,
} from "../../../store/moleculesSlice";
import { moorhen } from "../../../types/moorhen";
import { convertViewtoPx, getCentreAtom } from "../../../utils/utils";
import { MoorhenButton, MoorhenPopoverButton, MoorhenToggle } from "../../inputs";
import { MoorhenAccordion, MoorhenInfoCard, MoorhenMenuItem, MoorhenMenuItemPopover, MoorhenStack } from "../../interface-base";
import { DeleteDisplayObject, GenerateAssembly, RenameDisplayObject } from "../../menu-item";
import { MoorhenHeaderInfoCard } from "../MoorhenHeaderInfoCard";
import { ItemName } from "../utils/ItemName";
import { AddCustomRepresentationCard } from "./AddCustomRepresentationCard";
import { MoorhenModifyColourRulesCard } from "./ModifyColourRulesCard";
import { MoorhenMoleculeRepresentationSettingsCard, SymmetrySettingsPanel } from "./MoleculeRepresentationSettingsCard";
import { CustomRepresentationChip } from "./RepresentationChip";
import { MoorhenCarbohydrateList } from "./list/MoorhenCarbohydrateList";
import { MoorhenLigandList } from "./list/MoorhenLigandList";
import "./molecule-card.css";

const allRepresentations: moorhen.RepresentationStyles[] = [
    // "CBs",
    //"adaptativeBonds",
    // "CAs",
    // "CRs",
    // "ligands",
    // "gaussian",
    // "MolecularSurface",
    // "VdwSpheres",
    //"rama",
    //"rotamer",
    //"CDs",
    //"allHBonds",
    //"glycoBlocks",
    //"restraints",
    //"environment",
];

interface MoleculeCardProps {
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
    open?: boolean | null;
    onCollapseToggle?: (key, isOpen) => void;
}

export type clickedResidueType = {
    modelIndex: number;
    molName: string;
    chain: string;
    seqNum: number;
};

export const MoleculeCard = (props: MoleculeCardProps) => {
    const commandCentre = useCommandCentre();
    const urlPrefix = usePaths().urlPrefix;
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);
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
    const [busyLoadingLigands, setBusyLoadingLigands] = useState<boolean>(false);
    const [busyLoadingCarbohydrates, setBusyLoadingCarbohydrates] = useState<boolean>(false);

    const [showHeaderInfo, setShowHeaderInfo] = useState<boolean>(false);

    const [selectedResidues, setSelectedResidues] = useState<[number, number] | null>(null);
    const [clickedResidue, setClickedResidue] = useState<clickedResidueType | null>(null);

    const [symmetryRadius, setSymmetryRadius] = useState<number>(props.molecule.symmetryRadius);

    const customRepresentationList = useSelector((state: RootState) => state.molecules.customRepresentations);

    const displayEnvironment = useSelector((state: RootState) => {
        return state.molecules.generalRepresentations.some(rep => {
            return rep.parentMolecule.molNo === props.molecule.molNo && rep.style === "environment";
        });
    });

    const displayRamaBalls = useSelector((state: RootState) => {
        return state.molecules.generalRepresentations.some(rep => {
            return rep.parentMolecule.molNo === props.molecule.molNo && rep.style === "rama";
        });
    });

    const displayRotaDodec = useSelector((state: RootState) => {
        return state.molecules.generalRepresentations.some(rep => {
            return rep.parentMolecule.molNo === props.molecule.molNo && rep.style === "rotamer";
        });
    });
    const displayRestraints = useSelector((state: RootState) => {
        return state.molecules.generalRepresentations.some(rep => {
            return rep.parentMolecule.molNo === props.molecule.molNo && rep.style === "restraints";
        });
    });

    const displayContactDots = useSelector((state: RootState) => {
        return state.molecules.generalRepresentations.some(rep => {
            return rep.parentMolecule.molNo === props.molecule.molNo && rep.style === "CDs";
        });
    });

    const generalRepresentationsList: moorhen.RepresentationStyles[] = JSON.parse(generalRepresentationString).filter(
        rep =>
            rep.style !== "CAs" &&
            rep.style !== "CBs" &&
            rep.style !== "CRs" &&
            rep.style !== "MolecularSurface" &&
            rep.style !== "gaussian" &&
            rep.style !== "VdwSpheres"
    );

    const symmetrySettingsProps = {
        symmetryRadius,
        setSymmetryRadius,
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
        if (symmetryRadius === null) {
            return;
        }
        props.molecule.setSymmetryRadius(symmetryRadius);
    }, [symmetryRadius]);

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
        <MoorhenStack>
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
            <MoorhenMenuItemPopover menuItemText="Cell and Symmetry">
                <SymmetrySettingsPanel {...symmetrySettingsProps} molecule={props.molecule} />
            </MoorhenMenuItemPopover>
            <MoorhenMenuItemPopover menuItemText="Delete Molecule" style={{ color: "var(--moorhen-danger)" }}>
                <DeleteDisplayObject key="deleteDisplayObjectMenuItem" item={props.molecule} />
            </MoorhenMenuItemPopover>
        </MoorhenStack>
    );

    const extraControls: React.JSX.Element[] = [
        <MoorhenButton
            key="visibility"
            size="accordion"
            onClick={handleVisibility}
            type="icon-only"
            icon={isVisible ? `MatSymVisibility` : `MatSymVisibilityOff`}
            tooltip="Toggle visibility"
        />,
        <MoorhenButton key="undo" size="accordion" onClick={handleUndo} type="icon-only" icon="MatSymUndo" tooltip="Undo" />,
        <MoorhenButton key="redo" size="accordion" onClick={handleRedo} type="icon-only" icon="MatSymRedo" tooltip="Redo" />,
        <MoorhenButton
            key="center"
            size="accordion"
            onClick={handleCentering}
            type="icon-only"
            icon="MatSymFilterFocus"
            tooltip="Center on molecule"
        />,
        <MoorhenButton
            key="download"
            type="icon-only"
            icon={`MatSymDownload`}
            onClick={handleDownload}
            size="accordion"
            tooltip="Save molecule"
        />,
        <MoorhenPopoverButton size="accordion" popoverPlacement="left" tooltip="More">
            {dropDownMenu}
        </MoorhenPopoverButton>,
    ];

    const cardLabel = <ItemName item={props.molecule} />;

    const handleToolsToggle = (value, rep) => {
        if (value === true) {
            props.molecule.show(rep).then(representation => {
                dispatch(addGeneralRepresentation(representation));
            });
        } else {
            const representation = props.molecule.hide(rep);
            dispatch(removeGeneralRepresentation(representation));
        }
    };

    const handleEnvironmentToggle = value => {
        if (!value) {
            props.molecule.environmentRepresentation?.hide();
            dispatch(removeGeneralRepresentation(props.molecule.environmentRepresentation));
            // setBusyDrawingRepresentation(false);
        } else {
            props.molecule.drawEnvironment().then(_ => {
                dispatch(addGeneralRepresentation(props.molecule.environmentRepresentation));
                // setBusyDrawingRepresentation(false);
            });
        }
    };

    return (
        <MoorhenAccordion
            title={cardLabel}
            type="card"
            defaultOpen={true}
            extraControls={extraControls}
            open={props.open}
            onChange={isOpen => (props.onCollapseToggle ? props.onCollapseToggle(props.molecule.molNo, isOpen) : () => {})}
        >
            <MoorhenStack direction="vertical">
                <MoorhenStack direction="row" justify="center">
                    <MoorhenPopoverButton
                        type="default"
                        icon="MatSymAdd"
                        popoverPlacement="left"
                        tooltip="Add New representation"
                        style={{ width: "5rem" }}
                    >
                        <AddCustomRepresentationCard
                            setBusy={setBusyDrawingCustomRepresentation}
                            urlPrefix={urlPrefix}
                            molecule={props.molecule}
                            onApply={() => document.body.click()}
                        />
                    </MoorhenPopoverButton>
                    <MoorhenPopoverButton
                        type="default"
                        popoverPlacement="left"
                        icon="MatSymColors"
                        closeButton
                        size="medium"
                        tooltip="Edit general color rules"
                        style={{ width: "5rem" }}
                    >
                        <MoorhenModifyColourRulesCard molecule={props.molecule} />
                    </MoorhenPopoverButton>
                    <MoorhenPopoverButton
                        type="default"
                        popoverPlacement="left"
                        closeButton
                        icon="MatSymTune"
                        tooltip="Edit default representation"
                        style={{ width: "5rem" }}
                        popoverStyle={{ maxHeight: "100%" }}
                    >
                        <MoorhenMoleculeRepresentationSettingsCard molecule={props.molecule} />
                    </MoorhenPopoverButton>
                </MoorhenStack>
                {/* <div className="moorhen__molecule_card_representation"> */}
                <MoorhenStack direction="vertical" card>
                    <div className="moorhen__molecule_card_representation-chip-container">
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
                        {busyDrawingCustomRepresentation && <LinearProgress style={{ margin: "0.5rem" }} />}
                    </div>
                    {/* <hr style={{ margin: "0.5rem" }}></hr> */}
                </MoorhenStack>
                {/* <div className="moorhen__molecule_card_representation-chip-container" ref={addColourRulesAnchorDivRef}>
                    {allRepresentations.map(key => (
                        <RepresentationCheckbox key={key} style={key} molecule={props.molecule} isVisible={isVisible} />
                    ))}
                </div> */}
                <MoorhenAccordion title="Tools">
                    <MoorhenStack>
                        <MoorhenToggle
                            onChange={e => handleEnvironmentToggle(e.target.checked)}
                            checked={displayEnvironment}
                            label={
                                <MoorhenStack direction="row" align="center">
                                    Environment distances&nbsp;
                                    <MoorhenInfoCard
                                        infoText={
                                            <>
                                                <b>Ramachandran Balls</b>
                                                <br />
                                                Display colored balls indicating the quality of the Ramachadran for each residue
                                            </>
                                        }
                                    />
                                </MoorhenStack>
                            }
                        />
                        <MoorhenToggle
                            onChange={e => handleToolsToggle(e.target.checked, "rama")}
                            checked={displayRamaBalls}
                            label={
                                <MoorhenStack direction="row" align="center">
                                    Ramachandran Balls&nbsp;
                                    <MoorhenInfoCard
                                        infoText={
                                            <>
                                                <b>Ramachandran Balls</b>
                                                <br />
                                                Display colored balls indicating the quality of the Ramachadran for each residue
                                            </>
                                        }
                                    />
                                </MoorhenStack>
                            }
                        />
                        <MoorhenToggle
                            onChange={e => handleToolsToggle(e.target.checked, "rotamer")}
                            checked={displayRotaDodec}
                            label={
                                <MoorhenStack direction="row" align="center">
                                    Rotamer Dodecahedron&nbsp;
                                    <MoorhenInfoCard
                                        infoText={
                                            <>
                                                <b>Rotamer Dodecahedrons</b>
                                                <br />
                                                Display colored dodecahedrons indicating the quality of the rotamer for each residue
                                            </>
                                        }
                                    />
                                </MoorhenStack>
                            }
                        />
                        <MoorhenToggle
                            onChange={e => handleToolsToggle(e.target.checked, "CDs")}
                            checked={displayContactDots}
                            label={
                                <MoorhenStack direction="row" align="center">
                                    Contact Dots&nbsp;
                                    <MoorhenInfoCard
                                        infoText={
                                            <>
                                                <b>Contact Dots</b>
                                                <br />
                                                Show atoms to atoms contacts
                                            </>
                                        }
                                    />
                                </MoorhenStack>
                            }
                        />
                        <MoorhenToggle
                            onChange={e => handleToolsToggle(e.target.checked, "restraints")}
                            checked={displayRestraints}
                            label={
                                <MoorhenStack direction="row" align="center">
                                    Restraints&nbsp;
                                    <MoorhenInfoCard
                                        infoText={
                                            <>
                                                <b>Restraints</b>
                                                <br />
                                                Display the self restraints
                                            </>
                                        }
                                    />
                                </MoorhenStack>
                            }
                        />
                    </MoorhenStack>
                </MoorhenAccordion>
                {/* <div className="moorhen__molecule_card_representation-buttons"></div> */}
                {/* </div> */}
                <MoorhenHeaderInfoCard
                    anchorEl={cardHeaderDivRef}
                    molecule={props.molecule}
                    show={showHeaderInfo}
                    setShow={setShowHeaderInfo}
                />
                <div>
                    {/* <MoorhenSequencesAccordion
                        setBusy={setBusyLoadingSequences}
                        molecule={props.molecule}
                        clickedResidue={clickedResidue}
                        setClickedResidue={setClickedResidue}
                        setSelectedResidues={setSelectedResidues}
                    /> */}
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
                        <MoorhenCarbohydrateList
                            setBusy={setBusyLoadingCarbohydrates}
                            molecule={props.molecule}
                            height={convertViewtoPx(40, height)}
                        />
                    )}
                </div>
            </MoorhenStack>
        </MoorhenAccordion>
    );
};
