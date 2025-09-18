import { useCallback, useRef } from "react";
import { useDispatch, batch, useSelector } from "react-redux";
import { useSnackbar } from "notistack";
import { moorhen } from "../../types/moorhen";
import { setHoveredAtom } from "../../store/hoveringStatesSlice";
import { setIsDraggingAtoms } from "../../store/generalStatesSlice";
import { MoorhenContextButtonBase, ContextButtonProps } from "./MoorhenContextButtonBase";
import { useCommandCentre } from "../../InstanceManager";

export const MoorhenDragAtomsButton = (props: ContextButtonProps) => {
    const chosenMolecule = useRef<null | moorhen.Molecule>(null);
    const fragmentCid = useRef<string[] | null>(null);

    const dispatch = useDispatch();
    const commandCentre = useCommandCentre();

    const refinementSelection = useSelector((state: moorhen.State) => state.refinementSettings.refinementSelection);

    const { enqueueSnackbar } = useSnackbar();

    const nonCootCommand = useCallback(
        async (molecule: moorhen.Molecule, chosenAtom: moorhen.ResidueSpec, dragMode?: string) => {
            chosenMolecule.current = molecule;
            const selectedSequence = molecule.sequences.find((sequence) => sequence.chain === chosenAtom.chain_id);
            let selectedResidueIndex: number = -1;
            let start: number;
            let stop: number;
            let sphereResidueCids: string[];

            if (typeof selectedSequence !== "undefined") {
                selectedResidueIndex = selectedSequence.sequence.findIndex(
                    (residue) => residue.resNum === chosenAtom.res_no
                );
            }

            let selectionType: string;
            if (dragMode) {
                selectionType = dragMode;
            } else if (selectedResidueIndex === -1) {
                selectionType = "SINGLE";
            } else {
                selectionType = refinementSelection;
            }

            switch (selectionType) {
                case "SINGLE":
                    start = chosenAtom.res_no;
                    stop = chosenAtom.res_no;
                    break;
                case "TRIPLE":
                    start =
                        selectedResidueIndex !== 0
                            ? selectedSequence.sequence[selectedResidueIndex - 1].resNum
                            : chosenAtom.res_no;
                    stop =
                        selectedResidueIndex < selectedSequence.sequence.length - 1
                            ? selectedSequence.sequence[selectedResidueIndex + 1].resNum
                            : chosenAtom.res_no;
                    break;
                case "QUINTUPLE":
                    start =
                        selectedResidueIndex !== 0
                            ? selectedSequence.sequence[selectedResidueIndex - 2].resNum
                            : chosenAtom.res_no;
                    stop =
                        selectedResidueIndex < selectedSequence.sequence.length - 2
                            ? selectedSequence.sequence[selectedResidueIndex + 2].resNum
                            : selectedSequence.sequence[selectedResidueIndex - 1].resNum;
                    break;
                case "HEPTUPLE":
                    start =
                        selectedResidueIndex !== 0
                            ? selectedSequence.sequence[selectedResidueIndex - 3].resNum
                            : chosenAtom.res_no;
                    stop =
                        selectedResidueIndex < selectedSequence.sequence.length - 3
                            ? selectedSequence.sequence[selectedResidueIndex + 3].resNum
                            : selectedSequence.sequence[selectedResidueIndex - 1].resNum;
                    break;
                case "SPHERE":
                    sphereResidueCids = await molecule.getNeighborResiduesCids(chosenAtom.cid, 6);
                    break;
                default:
                    console.log("Unrecognised dragging atoms selection...");
                    break;
            }

            if (!sphereResidueCids && (!start || !stop)) {
                return;
            }

            if (selectionType !== "SPHERE") {
                fragmentCid.current = [`//${chosenAtom.chain_id}/${start}-${stop}/*`];
            } else {
                fragmentCid.current = sphereResidueCids;
            }

            props.setShowOverlay(false);
            props.setOpacity(1);
            props.setShowContextMenu(false);
            enqueueSnackbar("accept-reject-drag-atoms", {
                variant: "acceptRejectDraggingAtoms",
                persist: true,
                monomerLibraryPath: props.monomerLibraryPath,
                commandCentre: commandCentre,
                cidRef: fragmentCid,
                moleculeRef: chosenMolecule,
            });
            batch(() => {
                dispatch(setHoveredAtom({ molecule: null, cid: null }));
                dispatch(setIsDraggingAtoms(true));
            });
        },
        [refinementSelection]
    );

    return (
        <MoorhenContextButtonBase
            icon={
                <img
                    alt="drag atoms"
                    className="moorhen-context-button__icon"
                    src={`${props.urlPrefix}/pixmaps/drag.svg`}
                />
            }
            toolTipLabel="Drag atoms"
            refineAfterMod={false}
            needsMapData={true}
            nonCootCommand={nonCootCommand}
            {...props}
        />
    );
};
