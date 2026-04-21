import { useDispatch, useSelector } from "react-redux";
import { useCallback, useEffect, useRef, useState } from "react";
import { MoorhenButton } from "@/components/inputs";
import { useControlLock } from "@/hooks";
import { RootState, setShownControl, unlockControls } from "@/store";
import { setIsRotatingAtoms } from "../../../store/generalStatesSlice";
import { setActiveMolecule } from "../../../store/glRefSlice";
import { triggerUpdate } from "../../../store/moleculeMapUpdateSlice";
import { moorhen } from "../../../types/moorhen";
import { getTooltipShortcutLabel } from "../../../utils/utils";
import { MoorhenStack } from "../../interface-base";

export const AcceptRejectRotateTranslate = () => {
    const controlKey = useControlLock();
    const dispatch = useDispatch();

    const activeMolecule = useSelector((state: RootState) => state.glRef.activeMolecule);
    const isDark = useSelector((state: RootState) => state.sceneSettings.isDark);
    const shortCuts = useSelector((state: RootState) => state.shortcutSettings.shortCuts);
    const [tips, setTips] = useState<null | React.JSX.Element>(null);
    const fragmentMoleculeRef = useRef<null | moorhen.Molecule>(null);

    const molecules = useSelector((state: RootState) => state.molecules.moleculeList);
    const shownControl = useSelector((state: RootState) => state.globalUI.shownControl);
    const molecule = molecules.find(
        mol => mol.molNo === (shownControl?.name === "acceptRejectRotateTranslate" ? shownControl.payload?.molNo : undefined)
    );
    const cid = (shownControl?.name === "acceptRejectRotateTranslate" ? shownControl.payload?.fragmentCid : "") as string;

    const stopRotateTranslate = useCallback(
        async (acceptTransform: boolean = false) => {
            dispatch(setActiveMolecule(null));
            await molecule.unhideAll(!acceptTransform);
            if (acceptTransform) {
                const transformedAtoms = fragmentMoleculeRef.current.transformedCachedAtomsAsMovedAtoms();
                await molecule.updateWithMovedAtoms(transformedAtoms);
                dispatch(triggerUpdate(molecule.molNo));
            }
            await fragmentMoleculeRef.current.delete(true);
            dispatch(setIsRotatingAtoms(false));
            dispatch(unlockControls(controlKey));
            if (shownControl?.name === "acceptRejectRotateTranslate" && shownControl?.payload?.drawSelectionOnClose) {
                molecule.drawResidueSelection(cid);
            }
            dispatch(setShownControl(null));
        },
        [fragmentMoleculeRef]
    );

    useEffect(() => {
        if (shortCuts) {
            const shortCut = JSON.parse(shortCuts as string).residue_camera_wiggle;
            setTips(
                <>
                    <em>{"Hold <Shift><Alt> to translate"}</em>
                    <br></br>
                    <em>{`Hold ${getTooltipShortcutLabel(shortCut)} to move view`}</em>
                    <br></br>
                    <br></br>
                </>
            );
        }
    }, [shortCuts]);

    useEffect(() => {
        const startRotateTranslate = async () => {
            if (fragmentMoleculeRef.current || activeMolecule) {
                console.warn("There is already an active molecule... Doing nothing.");
                return;
            }
            // This is only necessary in development because React.StrictMode mounts components twice
            // @ts-ignore
            fragmentMoleculeRef.current = 1;
            /* Copy the component to move into a new molecule */
            const newMolecule = await molecule.copyFragmentUsingCid(cid, false);
            await newMolecule.updateAtoms();
            /* redraw after delay so that the context menu does not refresh empty */
            setTimeout(async () => {
                molecule.hideCid(cid);
                await Promise.all(
                    molecule.representations
                        .filter(item => {
                            return [
                                "CRs",
                                "CBs",
                                "CAs",
                                "ligands",
                                "gaussian",
                                "MolecularSurface",
                                "VdWSurface",
                                "VdwSpheres",
                                "allHBonds",
                                "glycoBlocks",
                                "MetaBalls",
                            ].includes(item.style);
                        })
                        .map(representation => {
                            if (representation.buffers.length > 0 && representation.buffers[0].visible) {
                                return newMolecule.addRepresentation(representation.style, representation.cid);
                            } else {
                                return Promise.resolve();
                            }
                        })
                );
                dispatch(setActiveMolecule(newMolecule));
                fragmentMoleculeRef.current = newMolecule;
            }, 1);
        };

        startRotateTranslate();
    }, []);

    return (
        <MoorhenStack align="center" gap={"0.5rem"}>
            <div style={{ fontSize: "0.8rem" }}>
                <em>{"Hold <Shift>+<Alt> to translate"}</em>
                <br></br>
                <em>
                    {shortCuts
                        ? `Hold ${getTooltipShortcutLabel(JSON.parse(shortCuts as string).residue_camera_wiggle)} to move view`
                        : null}
                </em>
            </div>
            <span>Accept changes?</span>
            <div>
                <MoorhenButton
                    type="icon-only"
                    icon="MatSymCheck"
                    onClick={async () => {
                        await stopRotateTranslate(true);
                    }}
                />

                <MoorhenButton
                    type="icon-only"
                    icon="MatSymClose"
                    onClick={async () => {
                        await stopRotateTranslate();
                    }}
                />
            </div>
        </MoorhenStack>
    );
};
