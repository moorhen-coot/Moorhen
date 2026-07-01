import { useDispatch, useSelector } from "react-redux";
import { useCallback, useEffect, useRef, useState } from "react";
import { hideModal } from "../../store/modalsSlice";
import { triggerUpdate } from "../../store/moleculeMapUpdateSlice";
import { addMolecule } from "../../store/moleculesSlice";
import { moorhen } from "../../types/moorhen";
import { modalKeys } from "../../utils/enums";
import { MoorhenSpinner } from "../icons";
import { MoorhenButton, MoorhenNumberInput, MoorhenToggle } from "../inputs";
import { MoorhenMoleculeSelect } from "../inputs";
import { MoorhenMapSelect } from "../inputs/Selector/MoorhenMapSelect";
import { MoorhenStack } from "../interface-base";
import { MoorhenDraggableModalBase } from "../interface-base/ModalBase/DraggableModalBase";
import { ModalComponentProps } from "../interface-base/ModalBase/ModalsContainer";
import { OverlayModal } from "../interface-base/ModalBase/OverlayModal";

const LigandHitCard = (props: {
    selectedMolNo: number;
    ligandMolecule: moorhen.Molecule;
    ligandCardMolNoFocus: number;
    setLigandCardMolNoFocus: React.Dispatch<React.SetStateAction<number>>;
    ligandResults: moorhen.Molecule[];
    setLigandResults: React.Dispatch<React.SetStateAction<moorhen.Molecule[]>>;
}) => {
    const dispatch = useDispatch();

    const animateRefine = useSelector((state: moorhen.State) => state.refinementSettings.animateRefine);
    const activeMap = useSelector((state: moorhen.State) => state.generalStates.activeMap);
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark);
    const allowAddNewFittedLigand = useSelector((state: moorhen.State) => state.generalStates.allowAddNewFittedLigand);
    const allowMergeFittedLigand = useSelector((state: moorhen.State) => state.generalStates.allowMergeFittedLigand);

    const handleShow = useCallback(async () => {
        if (props.ligandMolecule.representations.length > 0) {
            await props.ligandMolecule.show("CBs");
        } else {
            await props.ligandMolecule.fetchIfDirtyAndDraw("CBs");
        }
        await props.ligandMolecule.centreOn("/*/*/*/*", true, true);
    }, []);

    useEffect(() => {
        if (props.ligandCardMolNoFocus !== props.ligandMolecule.molNo) {
            props.ligandMolecule.hide("CBs");
        } else {
            handleShow();
        }
    }, [props.ligandCardMolNoFocus]);

    const handleRefinement = useCallback(
        async (ligandMolecule: moorhen.Molecule) => {
            if (animateRefine) {
                ligandMolecule.refineResiduesUsingAtomCidAnimated("//", activeMap, -1);
            } else {
                ligandMolecule.refineResiduesUsingAtomCid("//", "ALL");
            }
        },
        [animateRefine, activeMap]
    );

    const handleMerge = useCallback(async () => {
        const selectedMolecule = molecules.find(molecule => molecule.molNo === props.selectedMolNo);
        if (selectedMolecule) {
            await selectedMolecule.mergeMolecules([props.ligandMolecule], true);
            await props.ligandMolecule.delete();
            dispatch(triggerUpdate(selectedMolecule.molNo));
            props.setLigandResults(prevLigands => prevLigands.filter(ligand => ligand.molNo !== props.ligandMolecule.molNo));
        }
    }, [molecules]);

    const handleAdd = useCallback(async () => {
        if (props.ligandMolecule) {
            dispatch(addMolecule(props.ligandMolecule));
            props.setLigandResults(prevLigands => prevLigands.filter(ligand => ligand.molNo !== props.ligandMolecule.molNo));
        }
    }, []);

    return (
        <MoorhenStack card direction="row" align="center" gap={"0.5rem"}>
            <span>{props.ligandMolecule.name}</span>

            <MoorhenButton
                onClick={() => props.setLigandCardMolNoFocus(props.ligandMolecule.molNo)}
                type="icon-only"
                tooltip="View"
                icon="MatSymFilterFocus"
            >
            </MoorhenButton>

            <MoorhenButton

                onClick={() => handleRefinement(props.ligandMolecule)}
                tooltip="Refine"
                type="icon-only"
                icon="MatSymCrisisAlert"
            >
            </MoorhenButton>
            {allowAddNewFittedLigand && (

                <MoorhenButton icon="MatSymCheck" onClick={handleAdd} tooltip="Add to new molecule" type="icon-only">
                </MoorhenButton>
            )}
            {allowMergeFittedLigand && (

                    <MoorhenButton tooltip="Merge to molecule" onClick={handleMerge} icon="MatSymMerge" type="icon-only">
                    </MoorhenButton>

            )}
        </MoorhenStack>
    );
};

export const MoorhenFindLigandModal = (props: ModalComponentProps) => {
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);
    const maps = useSelector((state: moorhen.State) => state.maps);
    const width = useSelector((state: moorhen.State) => state.sceneSettings.width);
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height);

    const intoMoleculeRef = useRef<HTMLSelectElement | null>(null);
    const ligandMoleculeRef = useRef<HTMLSelectElement | null>(null);
    const mapSelectRef = useRef<HTMLSelectElement | null>(null);
    const useConformersRef = useRef<boolean>(false);
    const fitAnywhereRef = useRef<boolean>(false);
    const conformerCountRef = useRef<HTMLInputElement>(null);

    const [ligandCardMolNoFocus, setLigandCardMolNoFocus] = useState<number>(null);
    const [useConformers, setUseConformers] = useState<boolean>(false);
    const [fitAnywhere, setFitAnywhere] = useState<boolean>(false);
    const [busy, setBusy] = useState<boolean>(false);
    const [ligandResults, setLigandResults] = useState<moorhen.Molecule[]>(null);

    const dispatch = useDispatch();

    const handleClose = () => {
        ligandResults?.forEach(ligandMolecule => ligandMolecule.delete());
        dispatch(hideModal(modalKeys.FIT_LIGAND));
    };

    const findLigand = useCallback(async () => {
        if (!mapSelectRef.current.value || !ligandMoleculeRef.current.value || !intoMoleculeRef.current.value) {
            console.warn("Missing input, cannot find ligand...");
            return;
        }
        if (useConformersRef.current && !conformerCountRef.current) {
            console.warn("Unable to parse conformer count into a valid int...");
            return;
        }
        if (ligandResults?.length > 0) {
            ligandResults.forEach(ligandMolecule => ligandMolecule.delete());
        }
        setBusy(true);
        const selectedMolecule = molecules.find(molecule => molecule.molNo === parseInt(intoMoleculeRef.current.value));
        if (selectedMolecule) {
            const newMolecules = await selectedMolecule.fitLigand(
                parseInt(mapSelectRef.current.value),
                parseInt(ligandMoleculeRef.current.value),
                !fitAnywhereRef.current,
                false,
                useConformersRef.current,
                parseInt(conformerCountRef.current.value)
            );
            setLigandResults(newMolecules);
        }
        setBusy(false);
    }, [molecules, ligandResults]);

    const handleMoleculeSelectChange = useCallback(() => {
        if (ligandResults?.length > 0) {
            ligandResults.forEach(ligandMolecule => ligandMolecule.delete());
            setLigandResults([]);
        }
    }, [ligandResults]);

    const bodyContent = (
                <OverlayModal isShown={busy} overlay={<span><MoorhenSpinner size={40} colour="white"/> Finding ligand...</span>} style={{ zIndex: 12000 }}>
            
        
        <MoorhenStack>
            <MoorhenStack inputGrid>
                <MoorhenMapSelect width="" maps={maps} label="Map" ref={mapSelectRef} />
                <MoorhenMoleculeSelect
                    label="Molecule"
                    allowAny={false}
                    ref={intoMoleculeRef}
                    filterFunction={molecule => !molecule.isLigand}
                    onChange={handleMoleculeSelectChange}
                />

                <MoorhenMoleculeSelect
                    label="Ligand"
                    allowAny={false}
                    ref={ligandMoleculeRef}
                    filterFunction={molecule => molecule.isLigand}
                    onChange={handleMoleculeSelectChange}
                />
            </MoorhenStack>
            <MoorhenToggle
                style={{ margin: "0.5rem" }}
                type="radio"
                checked={!fitAnywhere}
                onChange={() => {
                    fitAnywhereRef.current = !fitAnywhere;
                    setFitAnywhere(!fitAnywhere);
                }}
                label="Search right here"
            />
            <MoorhenToggle
                style={{ margin: "0.5rem" }}
                type="radio"
                checked={fitAnywhere}
                onChange={() => {
                    fitAnywhereRef.current = !fitAnywhere;
                    setFitAnywhere(!fitAnywhere);
                }}
                label="Search everywhere"
            />
            <MoorhenToggle
                style={{ margin: "0.5rem" }}
                type="switch"
                checked={useConformers}
                onChange={() => {
                    useConformersRef.current = !useConformers;
                    setUseConformers(!useConformers);
                }}
                label="Flexible ligand"
            />
            <MoorhenNumberInput ref={conformerCountRef} label="No. of conformers" value={10} disabled={!useConformers} width="10rem" />
            <hr></hr>
            <MoorhenStack flex={1}>
                {ligandResults?.length > 0 ? <span>Found {ligandResults.length} possible ligand location(s)</span> : null}
                {ligandResults?.length > 0 ? (
                    <div style={{ height: "100px", width: "100%" }}>
                        {ligandResults.map(ligandMolecule => {
                            return (
                                <LigandHitCard
                                    key={ligandMolecule.molNo}
                                    ligandMolecule={ligandMolecule}
                                    selectedMolNo={parseInt(intoMoleculeRef.current?.value)}
                                    ligandCardMolNoFocus={ligandCardMolNoFocus}
                                    setLigandCardMolNoFocus={setLigandCardMolNoFocus}
                                    ligandResults={ligandResults}
                                    setLigandResults={setLigandResults}
                                />
                            );
                        })}
                    </div>
                ) : (
                    <span>No results...</span>
                )}
            </MoorhenStack>
        </MoorhenStack>
        </OverlayModal>
    );

    const footerContent = (
        <>
            <MoorhenStack
                gap={2}
                direction="horizontal"
                style={{ paddingTop: "0.5rem", alignItems: "center", alignContent: "center", justifyContent: "center" }}
            >
                <MoorhenButton variant="primary" onClick={findLigand}>
                    Find
                </MoorhenButton>
                <MoorhenButton variant="danger" onClick={handleClose}>
                    Close
                </MoorhenButton>
            </MoorhenStack>
        </>
    );


    return (
        <MoorhenDraggableModalBase
            modalId={modalKeys.FIT_LIGAND}
            left={width / 6}
            top={height / 6}
            initialWidth={400}
            initialHeight={600}
            headerTitle="Find ligand"
            onClose={handleClose}
            footer={footerContent}
            body={bodyContent}
            openDocked={props.openDocked}
        />
    );
};
