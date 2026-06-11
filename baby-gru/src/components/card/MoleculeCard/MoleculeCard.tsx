import { LinearProgress } from "@mui/material";
import { useDispatch, useSelector, useStore } from "react-redux";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RootState, removeVectors } from "@/store";
import { useCommandCentre, usePaths, useMoorhenInstance } from "../../../InstanceManager";
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
import { libcootApi } from "../../../types/libcoot";
import { convertViewtoPx, getCentreAtom } from "../../../utils/utils";
import { MoorhenButton, MoorhenPopoverButton, MoorhenToggle } from "../../inputs";
import { MoorhenAccordion, MoorhenInfoCard, MoorhenMenuItem, MoorhenMenuItemPopover, MoorhenStack } from "../../interface-base";
import { DeleteDisplayObject, GenerateAssembly, RenameDisplayObject } from "../../menu-item";
import { MoorhenHeaderInfoCard } from "../MoorhenHeaderInfoCard";
import { ItemName } from "../utils/ItemName";
import { AddCustomRepresentationCard } from "./AddCustomRepresentationCard";
import { MoorhenModifyColourRulesCard } from "./ModifyColourRulesCard";
import {
    MoorhenMoleculeRepresentationSettingsCard,
    ResidueEnvironmentSettingsPanel,
    SymmetrySettingsPanel,
} from "./MoleculeRepresentationSettingsCard";
import { PictureWizardCard } from "./PictureWizardCard";
import { CustomRepresentationChip } from "./RepresentationChip";
import { MoorhenCarbohydrateList } from "./list/MoorhenCarbohydrateList";
import { MoorhenLigandList } from "./list/MoorhenLigandList";
import { MoorhenXPIDList } from "./list/MoorhenXPIDList";
import "./molecule-card.css";

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
    const moorhenGlobalInstance = useMoorhenInstance()
    const commandCentre = useCommandCentre();
    const urlPrefix = usePaths().urlPrefix;
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);
    const backgroundColor = useSelector((state: moorhen.State) => state.sceneSettings.backgroundColor);
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
    const [busyLoadingXPID, setBusyLoadingXPID] = useState<boolean>(false);
    const [showXPIDList, setShownXPIDList] = useState<boolean>(props.molecule.moleculeCardState?.showXpidList ?? false);

    const [showHeaderInfo, setShowHeaderInfo] = useState<boolean>(false);

    const [selectedResidues, setSelectedResidues] = useState<[number, number] | null>(null);
    const [clickedResidue, setClickedResidue] = useState<clickedResidueType | null>(null);

    const [symmetryRadius, setSymmetryRadius] = useState<number>(props.molecule.symmetryRadius);

    const customRepresentationList = useSelector((state: RootState) =>
        state.molecules.customRepresentations.filter(rep => rep.parentMolecule.molNo === props.molecule.molNo)
    );

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

    const displayDNATCO = useSelector((state: RootState) => {
        return state.molecules.generalRepresentations.some(rep => {
            return rep.parentMolecule.molNo === props.molecule.molNo && rep.style === "dnatco";
        });
    });

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
    };

    const handleUndo = async () => {
        await props.molecule.undo();
        dispatch(triggerUpdate(props.molecule.molNo));
    };

    const handleRedo = async () => {
        await props.molecule.redo();
        dispatch(triggerUpdate(props.molecule.molNo));
    };

    const handleCentering = () => {
        props.molecule.centreOn();
    };

    const handleShowInfo = () => {
        setShowHeaderInfo(true);
    };

    const handleVisibility = useCallback(() => {
        props.molecule.representations.forEach(rep => (isVisible ? rep.hide() : rep.interfaceOption.visible ? rep.show() : null));
        dispatch(isVisible ? hideMolecule(props.molecule) : showMolecule(props.molecule));
        if (isVisible) {
            props.molecule.environmentRepresentation?.hide();
        } else {
            if (displayEnvironment) {
                props.molecule.environmentRepresentation?.show();
                props.molecule.environmentRepresentation?.redraw();
            }
        }
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

    const centreOnCid = async (cid:string) => {
        const c3pAtom = await props.molecule.gemmiAtomsForCid(cid)
        if(c3pAtom.length<1) return
        const x = -c3pAtom[0].x
        const y = -c3pAtom[0].y
        const z = -c3pAtom[0].z
        moorhenGlobalInstance.centerOnCoordinate(x,y,z)
    }

    const handleToggleXPIDList = value => {
        setShownXPIDList(value);
        props.molecule.moleculeCardState.showXpidList = value;
        if (!value) {
            const vectorList = store
                .getState()
                .vectors.vectorsList.filter(vector => vector.uniqueId.includes(`__TAG_XPID_${props.molecule.uniqueId}`));
            dispatch(removeVectors(vectorList));
        }
    };

    const bpl = props.molecule.DNATCO_info["base_pair_list"]
    const bpa = props.molecule.DNATCO_info["base_pair_annotation"]
    const ntc_step = props.molecule.DNATCO_info["ntc_step"]
    const ntc_step_summary = props.molecule.DNATCO_info["ntc_step_summary"]
    const bpaMap: Map<number,libcootApi.DNATCOBasePairAnnotation> = new Map(bpa.map(ba => [ba.base_pair_id, ba]));
    const stepMap: Map<number,libcootApi.DNATCONtcStepSummary> = new Map(ntc_step_summary.map(step => [step.step_id, step]));

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
                    <MoorhenPopoverButton
                        type="default"
                        icon="MatSymAutoAwesome"
                        popoverPlacement="left"
                        tooltip="Picture Wizard - create multiple representations at once"
                        style={{ width: "5rem" }}
                    >
                        <PictureWizardCard
                            setBusy={setBusyDrawingCustomRepresentation}
                            urlPrefix={urlPrefix}
                            molecule={props.molecule}
                            onApply={() => document.body.click()}
                        />
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
                        <MoorhenStack direction="row" align="center">
                            <MoorhenToggle
                                onChange={e => handleEnvironmentToggle(e.target.checked)}
                                checked={displayEnvironment}
                                disabled={isVisible ? false : true}
                                label={
                                    <MoorhenStack direction="row" align="center">
                                        Environment distances&nbsp;
                                        <MoorhenInfoCard
                                            infoText={
                                                <>
                                                    <b>Environment Distances</b>
                                                    <br />
                                                    Display H-bonds an other interactions between the center residue and its environment
                                                </>
                                            }
                                        />
                                    </MoorhenStack>
                                }
                            />

                            <MoorhenPopoverButton tooltip={"Environment settings"} disabled={isVisible ? false : true}>
                                <ResidueEnvironmentSettingsPanel molecule={props.molecule} />
                            </MoorhenPopoverButton>
                        </MoorhenStack>
                        <MoorhenToggle
                            label={`XH-\u03C0 Interaction`}
                            onChange={() => {
                                handleToggleXPIDList(!showXPIDList);
                            }}
                            checked={showXPIDList}
                            disabled={isVisible ? false : true}
                        />

                        <MoorhenToggle
                            onChange={e => handleToolsToggle(e.target.checked, "rama")}
                            checked={displayRamaBalls}
                            disabled={isVisible ? false : true}
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
                            disabled={isVisible ? false : true}
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
                            disabled={isVisible ? false : true}
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
                            disabled={isVisible ? false : true}
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
                        {bpl.length > 0 && <MoorhenToggle
                            onChange={e => handleToolsToggle(e.target.checked, "dnatco")}
                            checked={displayDNATCO}
                            disabled={isVisible ? false : true}
                            label={
                                <MoorhenStack direction="row" align="center">
                                    DNATCO&nbsp;base&nbsp;pairs
                                    <MoorhenInfoCard
                                        infoText={
                                            <>
                                                <b>DNATCO base pairs</b>
                                                <br />
                                                Display base-pairs as determined by DNATCO
                                            </>
                                        }
                                    />
                                </MoorhenStack>
                            }
                        />
                        }
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
                    {showXPIDList && (
                        <MoorhenXPIDList setBusy={setBusyLoadingXPID} molecule={props.molecule} height={convertViewtoPx(40, height)} />
                    )}
                    {displayDNATCO && (
                        <MoorhenAccordion title="Base&nbsp;pairs">
                            {bpl.map((bp,idx) => {
                               const ba: libcootApi.DNATCOBasePairAnnotation = bpaMap.get(bp.base_pair_id)
                               const chain_1 = bp.auth_asym_id_1
                               const chain_2 = bp.auth_asym_id_2
                               const base_1 = bp.auth_seq_id_1
                               const base_2 = bp.auth_seq_id_2
                               const compid_1 = bp.comp_id_1
                               const compid_2 = bp.comp_id_2
                               const family = ba.class
                               const key = "base_pair_" + bp.base_pair_id + "_" + chain_1 + "_" + base_1 + "_" + chain_2 + "_" + base_2
                               return (<MoorhenStack
                                   key={key}
                                   direction="row"
                               >
                               <div style={{ width: "2rem" }}>{chain_1}</div>
                               <div style={{ width: "4rem" }}>{compid_1}&nbsp;{base_1}</div>
                               <div style={{ width: "5rem" }}>{family}</div>
                               <div style={{ width: "2rem" }}>{chain_2}</div>
                               <div style={{ width: "5rem" }}>{compid_2}&nbsp;{base_2}</div>
                               <MoorhenButton
                                   size="accordion"
                                   onClick={() => {
                                       centreOnCid("/1/"+chain_1+"/"+base_1+"/C3'")
                                   }}
                                   type="icon-only"
                                   icon="MatSymFilterFocus"
                                   tooltip="Center on base pair"
                               />
                               </MoorhenStack>)
                            })}
                        </MoorhenAccordion>
                    )}
                    {displayDNATCO && (
                        <MoorhenAccordion title="Dinucleotide&nbsp;NtC&nbsp;classes">
                            {ntc_step.map((step,idx) => {
                               const ntc: libcootApi.DNATCONtcStepSummary = stepMap.get(step.id)
                               const assigned_CANA = ntc.assigned_CANA
                               const assigned_NtC = ntc.assigned_NtC
                               const chain = step.auth_asym_id_1
                               const base_1 = step.auth_seq_id_1
                               const base_2 = step.auth_seq_id_2
                               const compid_1 = step.label_comp_id_1
                               const compid_2 = step.label_comp_id_2
                               const key = chain + "_"  +base_1 + "_"  + base_2 + "_" + assigned_CANA+ "_" + assigned_NtC
                               return (<MoorhenStack
                                   key={key}
                                   direction="row"
                               >
                               <div style={{ width: "3rem" }}>{chain}</div>
                               <div style={{ width: "5rem" }}>{assigned_NtC}</div>
                               <div style={{ width: "5rem" }}>{assigned_CANA}</div>
                               <div style={{ width: "7rem" }}>{compid_1}&nbsp;{base_1}&nbsp;{compid_2}&nbsp;{base_2}</div>
                               <MoorhenButton
                                   size="accordion"
                                   onClick={() => {
                                       centreOnCid("/1/"+chain+"/"+base_1+"/C3'")
                                   }}
                                   type="icon-only"
                                   icon="MatSymFilterFocus"
                                   tooltip="Center on bases"
                                   style={{ width: "3rem" }}
                               />
                               </MoorhenStack>)
                            })}
                        </MoorhenAccordion>
                    )}
                </div>
            </MoorhenStack>
        </MoorhenAccordion>
    );
};
