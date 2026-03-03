import { useDispatch, useSelector } from "react-redux";
import { useCallback, useEffect, useRef } from "react";
import { MoorhenButton } from "@/components/inputs";
import { useControlLock } from "@/hooks/useControlsLock";
import { setShownControl, unlockControls } from "@/store";
import { RootState } from "@/store";
import { useCommandCentre } from "../../../InstanceManager";
import { setIsDraggingAtoms } from "../../../store/generalStatesSlice";
import { setDraggableMolecule } from "../../../store/glRefSlice";
import { triggerUpdate } from "../../../store/moleculeMapUpdateSlice";
import { moorhen } from "../../../types/moorhen";
import { cidToSpec, parseAtomInfoLabel } from "../../../utils/utils";
import { MoorhenStack } from "../../interface-base";

export const AcceptRejectDragAtoms = () => {
    const controlKey = useControlLock();

    const moltenFragmentRef = useRef<null | moorhen.Molecule>(null);
    const busy = useRef<boolean>(false);
    const draggingDirty = useRef<boolean>(false);
    const refinementDirty = useRef<boolean>(false);
    const autoClearRestraintsRef = useRef<boolean>(true);
    const commandCentre = useCommandCentre();

    const isDark = useSelector((state: RootState) => state.sceneSettings.isDark);
    const activeMap = useSelector((state: RootState) => state.generalStates.activeMap);

    const draggableMolecule = useSelector((state: RootState) => state.glRef.draggableMolecule);

    const shownControl = useSelector((state: RootState) => state.globalUI.shownControl);
    const molecules = useSelector((state: RootState) => state.molecules.moleculeList);

    const molecule = molecules.find(
        mol => mol.molNo === (shownControl?.name === "acceptRejectDraggingAtoms" ? shownControl.payload?.molNo : undefined)
    );
    const fragmentCid = (shownControl?.name === "acceptRejectDraggingAtoms" ? shownControl.payload?.fragmentCid : undefined) as
        | string[]
        | undefined;

    const dispatch = useDispatch();

    const finishDragging = async (acceptTransform: boolean) => {
        document.removeEventListener("atomDragged", atomDraggedCallback);
        document.removeEventListener("mouseup", mouseUpCallback);
        dispatch(setDraggableMolecule(null));
        if (busy.current) {
            setTimeout(() => finishDragging(acceptTransform), 100);
            return;
        }
        await molecule.mergeFragmentFromRefinement(fragmentCid.join("||"), moltenFragmentRef.current, acceptTransform, false);
        if (acceptTransform) {
            dispatch(triggerUpdate(molecule.molNo));
        }
        dispatch(setIsDraggingAtoms(false));
        dispatch(unlockControls(controlKey));
        if (shownControl?.name === "acceptRejectDraggingAtoms" && shownControl?.payload?.drawSelectionOnClose) {
            molecule.drawResidueSelection(fragmentCid.join("||"));
            dispatch(setShownControl({ name: "selectionTools" }));
        } else {
            dispatch(setShownControl(null));
        }
    };

    const atomDraggedCallback = useCallback(
        async (evt: moorhen.AtomDraggedEvent) => {
            draggingDirty.current = true;
            if (!busy.current) {
                moltenFragmentRef.current.clearBuffersOfStyle("hover");
                await handleAtomDragged(evt);
            }
        },
        [moltenFragmentRef]
    );

    const mouseUpCallback = useCallback(async () => {
        if (refinementDirty.current) {
            await refineNewPosition();
        }
        moltenFragmentRef.current.displayObjectsTransformation.origin = [0, 0, 0];
        moltenFragmentRef.current.displayObjectsTransformation.quat = null;
    }, [moltenFragmentRef]);

    const handleAtomDragged = async (evt: moorhen.AtomDraggedEvent) => {
        const atomCid = parseAtomInfoLabel(evt.detail.atom);
        if (draggingDirty.current && atomCid) {
            busy.current = true;
            refinementDirty.current = true;
            draggingDirty.current = false;
            const movedAtoms = moltenFragmentRef.current.transformedCachedAtomsAsMovedAtoms(atomCid);
            if (movedAtoms.length < 1 || typeof movedAtoms[0][0] === "undefined") {
                // The atom dragged was not part of the molten molecule
                refinementDirty.current = false;
                busy.current = false;
                return;
            }
            const chosenAtom = cidToSpec(atomCid);
            const result = await commandCentre.current.cootCommand(
                {
                    returnType: "instanced_mesh",
                    command: "add_target_position_restraint_and_refine",
                    commandArgs: [
                        moltenFragmentRef.current.molNo,
                        `//${chosenAtom.chain_id}/${chosenAtom.res_no}/${chosenAtom.atom_name}`,
                        movedAtoms[0][0].x,
                        movedAtoms[0][0].y,
                        movedAtoms[0][0].z,
                        10,
                    ],
                },
                false
            );
            await moltenFragmentRef.current.drawWithStyleFromMesh("CBs", [result.data.result.result]);
            busy.current = false;
            handleAtomDragged(evt);
        }
    };

    const refineNewPosition = async () => {
        if (!busy.current) {
            busy.current = true;
            refinementDirty.current = false;
            if (autoClearRestraintsRef.current) {
                await commandCentre.current.cootCommand(
                    {
                        returnType: "status",
                        command: "clear_target_position_restraints",
                        commandArgs: [moltenFragmentRef.current.molNo],
                    },
                    false
                );
                await moltenFragmentRef.current.animateRefine(10, 5);
            } else {
                await moltenFragmentRef.current.animateRefine(-1, 1);
            }
            busy.current = false;
        } else {
            setTimeout(() => refineNewPosition(), 100);
        }
    };

    const clearRestraints = async () => {
        busy.current = true;
        refinementDirty.current = false;
        await commandCentre.current.cootCommand(
            {
                returnType: "status",
                command: "clear_target_position_restraints",
                commandArgs: [moltenFragmentRef.current.molNo],
            },
            false
        );
        await moltenFragmentRef.current.animateRefine(10, 5);
        busy.current = false;
    };

    useEffect(() => {
        document.addEventListener("atomDragged", atomDraggedCallback);

        return () => {
            document.removeEventListener("atomDragged", atomDraggedCallback);
        };
    }, [atomDraggedCallback]);

    useEffect(() => {
        document.addEventListener("mouseup", mouseUpCallback);

        return () => {
            document.removeEventListener("mouseup", mouseUpCallback);
        };
    }, [mouseUpCallback]);

    useEffect(() => {
        const startDragging = async () => {
            if (moltenFragmentRef.current || draggableMolecule) {
                console.warn("There is already a draggable molecule... Doing nothing.");
                return;
            }
            // This is only necessary in development because React.StrictMode mounts components twice
            // @ts-ignore-expect-error
            moltenFragmentRef.current = 1;

            /* Copy the component to move into a new molecule */
            const newMolecule = await molecule.copyFragmentForRefinement(fragmentCid, activeMap);
            moltenFragmentRef.current = newMolecule;

            /* Redraw with animation*/
            await moltenFragmentRef.current.animateRefine(10, 5, 10);
            dispatch(setDraggableMolecule(newMolecule));
        };

        startDragging();
    }, []);

    return (
        <MoorhenStack align="center">
            <div>
                <span>Accept changes?</span>
            </div>
            <div>
                <MoorhenButton
                    type="icon-only"
                    icon="MatSymCheck"
                    onClick={async () => {
                        document.removeEventListener("atomDragged", atomDraggedCallback);
                        document.removeEventListener("mouseup", mouseUpCallback);
                        await finishDragging(true);
                    }}
                />
                <MoorhenButton
                    type="icon-only"
                    icon="MatSymClose"
                    onClick={async () => {
                        document.removeEventListener("atomDragged", atomDraggedCallback);
                        document.removeEventListener("mouseup", mouseUpCallback);
                        await finishDragging(false);
                    }}
                />
            </div>
        </MoorhenStack>
    );
};
