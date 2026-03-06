import { CheckOutlined, CloseOutlined, InfoOutlined } from "@mui/icons-material";
import { IconButton } from "@mui/material";
import { SnackbarContent, useSnackbar } from "notistack";
import { OverlayTrigger, Stack, Tooltip } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { setIsRotatingAtoms } from "../../store/generalStatesSlice";
import { setActiveMolecule } from "../../store/glRefSlice";
import { triggerUpdate } from "../../store/moleculeMapUpdateSlice";
import { moorhen } from "../../types/moorhen";
import { getTooltipShortcutLabel } from "../../utils/utils";
import { MoorhenStack } from "../interface-base";

export const MoorhenAcceptRejectRotateTranslateSnackBar = forwardRef<
    HTMLDivElement,
    {
        moleculeRef: React.RefObject<moorhen.Molecule>;
        cidRef: React.RefObject<string>;
        id: string;
    }
>((props, ref) => {
    const dispatch = useDispatch();

    const activeMolecule = useSelector((state: moorhen.State) => state.glRef.activeMolecule);
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark);
    const shortCuts = useSelector((state: moorhen.State) => state.shortcutSettings.shortCuts);

    const [tips, setTips] = useState<null | React.JSX.Element>(null);

    const fragmentMoleculeRef = useRef<null | moorhen.Molecule>(null);

    const { closeSnackbar } = useSnackbar();

    const stopRotateTranslate = useCallback(
        async (acceptTransform: boolean = false) => {
            dispatch(setActiveMolecule(null));
            await props.moleculeRef.current.unhideAll(!acceptTransform);
            if (acceptTransform) {
                const transformedAtoms = fragmentMoleculeRef.current.transformedCachedAtomsAsMovedAtoms();
                await props.moleculeRef.current.updateWithMovedAtoms(transformedAtoms);
                dispatch(triggerUpdate(props.moleculeRef.current.molNo));
            }
            await fragmentMoleculeRef.current.delete(true);
            dispatch(setIsRotatingAtoms(false));
            closeSnackbar(props.id);
        },
        [props, props.moleculeRef, fragmentMoleculeRef]
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
            const newMolecule = await props.moleculeRef.current.copyFragmentUsingCid(props.cidRef.current, false);
            await newMolecule.updateAtoms();
            /* redraw after delay so that the context menu does not refresh empty */
            setTimeout(async () => {
                props.moleculeRef.current.hideCid(props.cidRef.current);
                await Promise.all(
                    props.moleculeRef.current.representations
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
        <SnackbarContent
            ref={ref}
            className="moorhen-notification-div"
            style={{ backgroundColor: isDark ? "grey" : "white", color: isDark ? "white" : "grey" }}
        >
            <MoorhenStack gap={2} direction="horizontal" style={{ width: "100%", display: "flex", justifyContent: "space-between" }}>
                <OverlayTrigger
                    placement="bottom"
                    overlay={
                        <Tooltip id="tip-tooltip" className="moorhen-tooltip">
                            <div>
                                <em>{"Hold <Shift><Alt> to translate"}</em>
                                <br></br>
                                <em>
                                    {shortCuts
                                        ? `Hold ${getTooltipShortcutLabel(JSON.parse(shortCuts as string).residue_camera_wiggle)} to move view`
                                        : null}
                                </em>
                            </div>
                        </Tooltip>
                    }
                >
                    <InfoOutlined />
                </OverlayTrigger>
                <div>
                    <span>Accept changes?</span>
                </div>
                <div>
                    <IconButton
                        style={{ padding: 0, color: isDark ? "white" : "grey" }}
                        onClick={async () => {
                            await stopRotateTranslate(true);
                        }}
                    >
                        <CheckOutlined />
                    </IconButton>
                    <IconButton
                        style={{ padding: 0, color: isDark ? "white" : "grey" }}
                        onClick={async () => {
                            await stopRotateTranslate();
                        }}
                    >
                        <CloseOutlined />
                    </IconButton>
                </div>
            </MoorhenStack>
        </SnackbarContent>
    );
});

MoorhenAcceptRejectRotateTranslateSnackBar.displayName = "MoorhenAcceptRejectRotateTranslateSnackBar";
