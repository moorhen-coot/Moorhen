import { batch, useDispatch, useSelector } from "react-redux";
import { useCallback, useRef } from "react";
import { enqueueSnackbar, setShownControl } from "@/store";
import { useCommandCentre } from "../../InstanceManager";
import { setIsDraggingAtoms } from "../../store/generalStatesSlice";
import { setHoveredAtom } from "../../store/hoveringStatesSlice";
import { moorhen } from "../../types/moorhen";
import { ContextButtonProps, MoorhenContextButtonBase } from "./MoorhenContextButtonBase";

export const MoorhenDragAtomsButton = (props: ContextButtonProps) => {
    const chosenMolecule = useRef<null | moorhen.Molecule>(null);
    const fragmentCid = useRef<string[] | null>(null);

    const dispatch = useDispatch();
    const commandCentre = useCommandCentre();

    const refinementSelection = useSelector((state: moorhen.State) => state.refinementSettings.refinementSelection);

    const nonCootCommand = useCallback(
        async (molecule: moorhen.Molecule, chosenAtom: moorhen.ResidueSpec, dragMode?: string) => {
            chosenMolecule.current = molecule;
            const selectedSequence = molecule.sequences.find(sequence => sequence.chain === chosenAtom.chain_id);
            let selectedResidueIndex: number = -1;
            let start: number;
            let stop: number;
            let sphereResidueCids: string[];

            if (typeof selectedSequence !== "undefined") {
                selectedResidueIndex = selectedSequence.sequence.findIndex(residue => residue.resNum === chosenAtom.res_no);
            }

            let selectionType: string;
            if (dragMode) {
                selectionType = dragMode;
            } else if (selectedResidueIndex === -1) {
                selectionType = "SINGLE";
            } else {
                selectionType = refinementSelection;
            }

            // Clamp neighbour lookups to the chain ends so residues near a terminus
            // can't index past the sequence array (which would read undefined.resNum).
            const neighbourResNum = (offset: number) =>
                selectedSequence.sequence[Math.min(Math.max(selectedResidueIndex + offset, 0), selectedSequence.sequence.length - 1)]
                    .resNum;

            switch (selectionType) {
                case "SINGLE":
                    start = chosenAtom.res_no;
                    stop = chosenAtom.res_no;
                    break;
                case "TRIPLE":
                    start = neighbourResNum(-1);
                    stop = neighbourResNum(1);
                    break;
                case "QUINTUPLE":
                    start = neighbourResNum(-2);
                    stop = neighbourResNum(2);
                    break;
                case "HEPTUPLE":
                    start = neighbourResNum(-3);
                    stop = neighbourResNum(3);
                    break;
                case "SPHERE":
                    sphereResidueCids = await molecule.getNeighborResiduesCids(chosenAtom.cid, 6);
                    break;
                default:
                    console.log("Unrecognised dragging atoms selection...");
                    break;
            }

            const invalidSelection =
                selectionType === "SPHERE"
                    ? !sphereResidueCids || sphereResidueCids.length === 0
                    : typeof start === "undefined" || typeof stop === "undefined";
            if (invalidSelection) {
                // Don't silently swallow the click: tell the user and close the menu.
                dispatch(enqueueSnackbar({ message: "Could not determine a residue selection to drag", variant: "warning" }));
                props.setShowContextMenu(false);
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
            dispatch(
                setShownControl({ name: "acceptRejectDraggingAtoms", payload: { molNo: molecule.molNo, fragmentCid: fragmentCid.current } })
            );

            batch(() => {
                dispatch(setHoveredAtom({ molecule: null, cid: null, atomInfo: null }));
                dispatch(setIsDraggingAtoms(true));
            });
        },
        [refinementSelection]
    );

    return (
        <MoorhenContextButtonBase
            icon={<img alt="drag atoms" className="moorhen-context-button__icon" src={`${props.urlPrefix}/pixmaps/drag.svg`} />}
            toolTipLabel="Drag atoms"
            refineAfterMod={false}
            needsMapData={true}
            nonCootCommand={nonCootCommand}
            {...props}
        />
    );
};
