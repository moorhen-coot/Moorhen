import { LinearProgress } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { useCallback, useEffect, useRef, useState } from "react";
import { MoorhenButton } from "@/components/inputs";
import { flipPeptide } from "@/components/validation-tools/MoorhenPepflipsDifferenceMap";
import { RootState, addGeneralRepresentation, removeGeneralRepresentation, setShownControl } from "@/store";
import { useCommandCentre, useTimeCapsule } from "../../../InstanceManager";
import { setHoveredAtom } from "../../../store/hoveringStatesSlice";
import { cidToSpec, sleep } from "../../../utils/utils";
import { MoorhenInfoCard, MoorhenStack } from "../../interface-base";
import { fillPartialResidue } from "../../validation-tools/MoorhenFillMissingAtoms";

//     await selectedMolecule.fetchIfDirtyAndDraw("rama");
// },
// onStop: () => {
//     selectedMolecule.clearBuffersOfStyle("rama");

export const ResidueSteps = (props: { variant: "pepFlip" | "stepRefine" | "fillAllAtoms" }) => {
    console.log("Rendering residue steps with variant ", props.variant);
    const timeCapsuleRef = useTimeCapsule();

    const disableTimeCapsule = true;
    const sleepTime = 600;

    let onStop: () => void = null;
    let onStart: () => Promise<void> = null;
    let onStep: (cid: string) => Promise<void> = null;
    let onPause: () => void = null;
    let onResume: () => void = null;
    let infoText = null;

    const dispatch = useDispatch();

    const timeCapsuleIsEnabled = useSelector((state: RootState) => state.backupSettings.enableTimeCapsule);
    const molecules = useSelector((state: RootState) => state.molecules.moleculeList);
    const [isRunning, setIsRunning] = useState<boolean>(false);
    const [progress, setProgress] = useState<number>(0);
    const [buffer, setBuffer] = useState<number>(1);
    const [cid, setCid] = useState<string | null>("Refining...");
    const commandCentre = useCommandCentre();
    const shownControl = useSelector((state: RootState) => state.globalUI.shownControl);
    const enableRefineAfterMod = useSelector((state: RootState) => state.refinementSettings.enableRefineAfterMod);

    const residueList =
        shownControl.name === "flipAllPeptides" || shownControl.name === "fillAllAtoms" || shownControl.name === "steppedRefine"
            ? (shownControl?.payload?.residueList as string[])
            : [];
    const selectedMoleculeNo =
        shownControl.name === "flipAllPeptides" || shownControl.name === "fillAllAtoms" || shownControl.name === "steppedRefine"
            ? (shownControl?.payload?.selectedMolecule as number)
            : null;
    const selectedMolecule = molecules.find(mol => mol.molNo === selectedMoleculeNo);

    const isClosedRef = useRef<boolean>(false);
    const isRunningRef = useRef<boolean>(false);

    const exit = async () => {
        onStop?.();
        dispatch(setShownControl(null));
        if (disableTimeCapsule) timeCapsuleRef.current.disableBackups = !timeCapsuleIsEnabled;
        await timeCapsuleRef.current.addModification();
    };

    const init = async () => {
        await onStart?.();
        dispatch(setHoveredAtom({ molecule: null, cid: null, atomInfo: null }));
        if (disableTimeCapsule) timeCapsuleRef.current.disableBackups = true;
    };

    const steppedRefine = async () => {
        await init();
        const nSteps = residueList.length;
        const stepPercent = nSteps / 100;
        const singleStepPercent = 1 / stepPercent;

        for (const residue of residueList) {
            setBuffer(prev => prev + singleStepPercent);
            if (isClosedRef.current) {
                await exit();
                return;
            }
            while (!isRunningRef.current) {
                if (isClosedRef.current) {
                    exit();
                    return;
                } else {
                    await sleep(500);
                }
            }
            setCid(residue);
            await onStep(residue);
            setProgress(prev => prev + singleStepPercent);
            await sleep(sleepTime);
        }
        await exit();
    };

    const handleStepFlipPeptide = async (cid: string) => {
        const resSpec = cidToSpec(cid);
        await selectedMolecule.centreAndAlignViewOn(cid, false);
        await sleep(1000);
        await flipPeptide(
            selectedMolecule,
            resSpec.chain_id,
            resSpec.res_no,
            resSpec.ins_code,
            commandCentre,
            enableRefineAfterMod,
            dispatch
        );
    };

    const handleStepFillAtoms = async (cid: string) => {
        const resSpec = cidToSpec(cid);
        await selectedMolecule.centreAndAlignViewOn(cid, true);
        await sleep(1000);
        await fillPartialResidue(
            selectedMolecule,
            resSpec.chain_id,
            resSpec.res_no,
            resSpec.ins_code,
            commandCentre,
            dispatch,
            enableRefineAfterMod
        );
    };

    const handleStepRefine = async (cid: string) => {
        await selectedMolecule.centreAndAlignViewOn(cid, true);
        await selectedMolecule.refineResiduesUsingAtomCid(cid, "TRIPLE", 4000, true);
    };

    useEffect(() => {
        if (!isRunningRef.current) {
            setIsRunning(true);
            isRunningRef.current = true;
            steppedRefine();
        }
    }, []);

    if (props.variant === "pepFlip") {
        onStart = async () => {
            await selectedMolecule.show("rama").then(representation => {
                dispatch(addGeneralRepresentation(representation));
            });
        };
        onStep = handleStepFlipPeptide;
        onStop = () => {
            const rep = selectedMolecule.hide("rama");
            dispatch(removeGeneralRepresentation(rep));
        };
        infoText = (
            <>
                <h1>Peptide flipping in progress...</h1> Color balls indicate ramachandran quality
            </>
        );
    } else if (props.variant === "fillAllAtoms") {
        onStart = async () => {
            await selectedMolecule.show("rotamer").then(representation => {
                dispatch(addGeneralRepresentation(representation));
            });
        };
        onStep = handleStepFillAtoms;
        onStop = () => {
            const rep = selectedMolecule.hide("rotamer");
            dispatch(removeGeneralRepresentation(rep));
        };
        infoText = (
            <>
                <h1>Filling all atoms.</h1> Dodecahedrons indicate rotamer quality
            </>
        );
    } else if (props.variant === "stepRefine") {
        onStart = async () => {
            await selectedMolecule.show("rotamer").then(representation => {
                dispatch(addGeneralRepresentation(representation));
            });
            await selectedMolecule.show("rama").then(representation => {
                dispatch(addGeneralRepresentation(representation));
            });
        };
        onStep = handleStepRefine;
        onStop = async () => {
            const rep = selectedMolecule.hide("rotamer");
            dispatch(removeGeneralRepresentation(rep));
            const rep2 = selectedMolecule.hide("rama");
            dispatch(removeGeneralRepresentation(rep2));
        };
        infoText = (
            <>
                <h1>Stepwise refinement.</h1> Dodecahedrons indicate rotamer quality <br />
                Balls indicate ramachandran quality
            </>
        );
    }

    return (
        <MoorhenStack style={{ width: "8rem", padding: "0.5rem" }} align="center" justify="center" gap={"0.5rem"}>
            <MoorhenStack style={{ width: "100%" }} align="center" justify="center" gap={"0.5rem"}>
                <span>{cid}</span>
                <LinearProgress
                    variant={isRunning ? "buffer" : "determinate"}
                    value={progress}
                    valueBuffer={buffer}
                    style={{ width: "100%", display: "flex", justifyContent: "start" }}
                />
            </MoorhenStack>
            <MoorhenStack direction="row" align="center" justify="center" gap={"0.5rem"}>
                <MoorhenButton
                    type="icon-only"
                    icon={isRunning ? "MatSymPauseCircled" : "MatSymPlayCircled"}
                    onClick={() => {
                        if (isRunningRef.current) {
                            onPause?.();
                        } else {
                            onResume?.();
                        }
                        isRunningRef.current = !isRunningRef.current;
                        setIsRunning(isRunningRef.current);
                    }}
                />
                <MoorhenButton
                    type="icon-only"
                    icon="MatSymStopCircled"
                    onClick={() => {
                        isClosedRef.current = true;
                    }}
                />
                {infoText && <MoorhenInfoCard infoText={infoText} />}
            </MoorhenStack>
        </MoorhenStack>
    );
};
