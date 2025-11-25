import { PauseCircleOutline, PlayCircleOutline, ReplayCircleFilledOutlined, StopCircleOutlined } from "@mui/icons-material";
import { IconButton, LinearProgress, Slider } from "@mui/material";
import { SnackbarContent, useSnackbar } from "notistack";
import { Stack } from "react-bootstrap";
import { useDispatch, useSelector, useStore } from "react-redux";
import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCommandCentre } from "../../InstanceManager";
import { RootState } from "../../store/MoorhenReduxStore";
import { setIsAnimatingTrajectory } from "../../store/generalStatesSlice";
import { hideMolecule, showMolecule } from "../../store/moleculesSlice";
import { moorhen } from "../../types/moorhen";
import { MoleculeRepresentation } from "../../utils/MoorhenMoleculeRepresentation";
import { sleep } from "../../utils/utils";
import { MoorhenStack } from "../interface-base";

export const MoorhenModelTrajectorySnackBar = forwardRef<
    HTMLDivElement,
    {
        commandCentre: React.RefObject<moorhen.CommandCentre>;
        moleculeMolNo: number;
        representationStyle: string;
        id: string;
    }
>((props, ref) => {
    const dispatch = useDispatch();
    const store = useStore<RootState>();

    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark);

    const isPlayingAnimationRef = useRef<boolean>(false);
    const representationRef = useRef<null | moorhen.MoleculeRepresentation>(null);
    const framesRef = useRef<null | moorhen.DisplayObject[][]>([]);
    const iFrameRef = useRef<number>(0);

    const [busyComputingFrames, setBusyComputingFrames] = useState<boolean>(false);
    const [nFrames, setNFrames] = useState<number>(0);
    const [progress, setProgress] = useState<number>(0);
    const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0);
    const [isPlayingAnimation, setIsPlayingAnimation] = useState<boolean>(false);

    const selectedMolecule = useMemo(() => molecules.find(molecule => molecule.molNo === props.moleculeMolNo), [props.moleculeMolNo]);

    const { closeSnackbar } = useSnackbar();
    const commandCentre = useCommandCentre();

    const computeFrames = async (molecule: moorhen.Molecule, representation: moorhen.MoleculeRepresentation) => {
        const frames: moorhen.DisplayObject[][] = [];
        const multiModelMolecules = await molecule.splitMultiModels(false);

        const nSteps = multiModelMolecules.length;
        const stepPercent = nSteps / 50;
        const singleStepPercent = 1 / stepPercent;

        for (const iMolecule of multiModelMolecules) {
            iMolecule.setAtomsDirty(true);
            await iMolecule.updateAtoms();
            representation.setParentMolecule(iMolecule);
            representation.setColourRules(molecule.defaultColourRules);
            await representation.applyColourRules();
            const meshObjects = await representation.getBufferObjects();
            frames.push(meshObjects);
            setProgress(prev => prev + singleStepPercent);
        }

        return frames;
    };

    const playAnimation = useCallback(async () => {
        if (isPlayingAnimation && iFrameRef.current === framesRef.current.length) {
            setCurrentFrameIndex(0);
            iFrameRef.current = 0;
        } else if (isPlayingAnimation) {
            isPlayingAnimationRef.current = false;
            setIsPlayingAnimation(false);
        } else {
            isPlayingAnimationRef.current = true;
            setIsPlayingAnimation(true);
        }

        if (isPlayingAnimationRef.current) {
            const nSteps = framesRef.current.length;
            const stepPercent = nSteps / 100;
            const singleStepPercent = 1 / stepPercent;

            while (iFrameRef.current < framesRef.current.length) {
                representationRef.current.deleteBuffers();
                await representationRef.current.buildBuffers(framesRef.current[iFrameRef.current]);
                setCurrentFrameIndex(prev => prev + singleStepPercent);
                await sleep(5);
                iFrameRef.current += 1;
                if (!isPlayingAnimationRef.current) {
                    break;
                }
            }
        }
    }, [isPlayingAnimation, selectedMolecule]);

    useEffect(() => {
        const loadFrames = async () => {
            dispatch(setIsAnimatingTrajectory(true));
            representationRef.current = new MoleculeRepresentation(
                props.representationStyle as moorhen.RepresentationStyles,
                "/*/*/*/*",
                commandCentre
            );
            framesRef.current = await computeFrames(selectedMolecule, representationRef.current);
            setNFrames(framesRef.current.length);
            setBusyComputingFrames(false);
            dispatch(hideMolecule(selectedMolecule));
            await representationRef.current.buildBuffers(framesRef.current[0]);
        };
        loadFrames();
    }, []);

    return (
        <SnackbarContent
            ref={ref}
            className="moorhen-notification-div"
            style={{ backgroundColor: isDark ? "grey" : "white", color: isDark ? "white" : "grey" }}
        >
            {busyComputingFrames ? (
                <MoorhenStack gap={1} direction="vertical">
                    <span>Please wait...</span>
                    <LinearProgress variant="determinate" value={progress} />
                </MoorhenStack>
            ) : nFrames > 0 ? (
                <MoorhenStack gap={1} direction="vertical">
                    <div style={{ display: "flex", justifyContent: "center" }}>
                        <IconButton onClick={playAnimation}>
                            {iFrameRef.current === framesRef.current.length - 1 ? (
                                <ReplayCircleFilledOutlined />
                            ) : isPlayingAnimation ? (
                                <PauseCircleOutline />
                            ) : (
                                <PlayCircleOutline />
                            )}
                        </IconButton>
                        <IconButton
                            onClick={() => {
                                isPlayingAnimationRef.current = false;
                                setIsPlayingAnimation(false);
                                representationRef.current?.deleteBuffers();
                                dispatch(showMolecule(selectedMolecule));
                                dispatch(setIsAnimatingTrajectory(false));
                                closeSnackbar(props.id);
                            }}
                        >
                            <StopCircleOutlined />
                        </IconButton>
                    </div>
                    <Slider
                        size="small"
                        defaultValue={0}
                        value={currentFrameIndex}
                        onChange={(evt, newVal) => {
                            if (isPlayingAnimationRef.current && iFrameRef.current === framesRef.current.length) {
                                isPlayingAnimationRef.current = false;
                                setIsPlayingAnimation(false);
                            }
                            iFrameRef.current = Math.floor(((newVal as number) * framesRef.current.length) / 100);
                            representationRef.current.deleteBuffers();
                            if (iFrameRef.current < framesRef.current.length) {
                                representationRef.current.buildBuffers(framesRef.current[iFrameRef.current]);
                                setCurrentFrameIndex(newVal as number);
                            }
                        }}
                    />
                </MoorhenStack>
            ) : (
                <span>Something went wrong...</span>
            )}
        </SnackbarContent>
    );
});

MoorhenModelTrajectorySnackBar.displayName = "MoorhenModelTrajectorySnackBar";
