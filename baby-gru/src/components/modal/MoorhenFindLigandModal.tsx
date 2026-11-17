import { useDispatch, useSelector } from "react-redux";
import { useCallback, useEffect, useRef, useState } from "react";
import { hideModal } from "../../store/modalsSlice";
import { addMolecule } from "../../store/moleculesSlice";
import { enqueueSnackbar } from "../../store/snackbarSlice";
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
import type { MoorhenMolecule } from "@/utils/MoorhenMolecule";
import { drawLigandBonds } from "@/utils/Representation/defaultRepresentation";

/**
 * One fitted pose: view it, or save it as a new molecule (listed with the ligands). Saving instead of
 * merging into the model keeps the pose on its own, to compare, refine, merge or delete like any
 * ligand; the poses not saved are deleted when the search is run again or the modal closed.
 */
const LigandHitCard = (props: {
    ligandMolecule: moorhen.Molecule;
    ligandCardMolNoFocus: number;
    setLigandCardMolNoFocus: React.Dispatch<React.SetStateAction<number>>;
    setLigandResults: React.Dispatch<React.SetStateAction<moorhen.Molecule[]>>;
}) => {
    const dispatch = useDispatch();
    const [busy, setBusy] = useState<boolean>(false);

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

    const handleSave = useCallback(async () => {
        const ligand = props.ligandMolecule as MoorhenMolecule;
        setBusy(true);
        try {
            // The preview's bonds are not a custom representation: drawn again as one, as any loaded
            // molecule's, and shown whether or not this pose was the one being viewed
            for (const representation of [...ligand.representations]) {
                if (!representation.isCustom) ligand.removeRepresentation(representation.uniqueId);
            }
            await drawLigandBonds(ligand);
            dispatch(addMolecule(ligand));
            // Out of the results, so that it is not deleted with the poses not saved
            props.setLigandResults(previous => previous.filter(other => other.molNo !== ligand.molNo));
            dispatch(enqueueSnackbar({ message: `Saved ${ligand.name} as a new molecule`, variant: "success" }));
        } catch (err) {
            console.error(err);
            dispatch(enqueueSnackbar({ message: `Failed to save ${ligand.name}`, variant: "error" }));
        } finally {
            setBusy(false);
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
            />
            <MoorhenButton onClick={handleSave} disabled={busy} tooltip="Save as a new molecule" type="icon-only" icon="MatSymSave" />
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
    
    const fitAnywhereRef = useRef<boolean>(false);
    

    const [ligandCardMolNoFocus, setLigandCardMolNoFocus] = useState<number>(null);
    const [useConformers, setUseConformers] = useState<boolean>(false);
    const [conformerCount, setConformerCount] = useState<number>(10);

    const [fitAnywhere, setFitAnywhere] = useState<boolean>(false);
    const [busy, setBusy] = useState<boolean>(false);
    const [ligandResults, setLigandResults] = useState<moorhen.Molecule[] | null>(null);

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
        if (useConformers && !conformerCount) {
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
                useConformers,
                conformerCount
            );
            for (const newMolecule of newMolecules) {
                if (newMolecule.gemmiStructure === null) {
                    console.warn(`Failed to fit ligand ${newMolecule.name} into map ${mapSelectRef.current.value}`);
                    const atoms = await newMolecule.getNumberOfAtoms();
                        if (atoms === 0) {
                            console.warn(`Deleting empty ligand molecule ${newMolecule.name}`);
                            newMolecules.splice(newMolecules.indexOf(newMolecule), 1);
                            await newMolecule.delete();
                        }
                }
            }
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
                <MoorhenMapSelect maps={maps} label="Map" ref={mapSelectRef} />
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
                toggle={setUseConformers}
                label="Flexible ligand"
            />
            <MoorhenNumberInput label="No. of conformers" value={conformerCount} setValue={setConformerCount} disabled={!useConformers} integer buttonSteps={10} showButtons/>
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
                                    ligandCardMolNoFocus={ligandCardMolNoFocus}
                                    setLigandCardMolNoFocus={setLigandCardMolNoFocus}
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
            initialHeight={900}
            headerTitle="Find ligand"
            onClose={handleClose}
            footer={footerContent}
            body={bodyContent}
            allowDocking={true}
            openDocked={"right"}
        />
    );
};
