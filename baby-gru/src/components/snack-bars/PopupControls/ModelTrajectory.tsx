import { useDispatch, useSelector } from "react-redux";
import {  useEffect, useMemo, useRef, useState } from "react";
import { useCommandCentre } from "@/InstanceManager";
import { MoorhenStack } from "@/components/interface-base";
import { RootState } from "@/store/MoorhenReduxStore";
import { setIsAnimatingTrajectory } from "@/store/generalStatesSlice";
import { setShownControl } from "@/store/globalUISlice";
import { hideMolecule, showMolecule } from "@/store/moleculesSlice";
import { moorhen } from "@/types/moorhen";
import { MoleculeRepresentation } from "@/utils/MoorhenMoleculeRepresentation";
import { MoorhenButton, MoorhenNumberInput, MoorhenSlider } from "@/components/inputs";
import { MoorhenLinearProgress } from "@/components/icons";
import useStateWithRef from "@/hooks/useStateWithRef";

export const ModelTrajectory = () => {
    const dispatch = useDispatch();

    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);
    const representationRef = useRef<null | moorhen.MoleculeRepresentation>(null);
    const framesRef = useRef<null | moorhen.DisplayObject[][]>([]);

    const [busyComputingFrames, setBusyComputingFrames] = useState<boolean>(true);
    const [nFrames, setNFrames] = useState<number>(0);
    const [progress, setProgress] = useState<number>(0);
    const [currentFrameIndex, setCurrentFrameIndex, currentFrameIndexRef] = useStateWithRef<number>(0);
    const [isPlayingAnimation, setIsPlayingAnimation] = useState<boolean>(false);
    const [frameTime, setFrameTime] = useState<number>(100);
    const shownControl = useSelector((state: RootState) => state.globalUI.shownControl);
    const molNo = shownControl?.name === "trajectory" ? (shownControl.payload?.molNo ?? 0) : 0;
    const style = shownControl?.name === "trajectory" ? (shownControl?.payload?.style ?? "CRs") : "CRs";

    const animationTimerRef = useRef<NodeJS.Timeout | null>(null);

    const selectedMolecule = useMemo(() => molecules.find(molecule => molecule.molNo === molNo), [molNo]);
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

    const handlePlayButton = () => {
        if (isPlayingAnimation) {
            setIsPlayingAnimation(false);
            if (animationTimerRef.current) {
                clearInterval(animationTimerRef.current);}
        } else {
            if (currentFrameIndex  === nFrames) {
                setCurrentFrameIndex(0);
            }
            setIsPlayingAnimation(true);
            playAnimation();
        }
    }

    useEffect(() => {
        const buildCurrentFrame = async () => {
            const representation = representationRef.current;
            const frame = framesRef.current[currentFrameIndex];
            if (!representation || !frame) {
                return;
            }
            representationRef.current.deleteBuffers();
            await representation.buildBuffers(frame);
        };

        void buildCurrentFrame();
    }, [currentFrameIndex]);

    const playAnimation = () => {
        animationTimerRef.current = setInterval(() => {
            if (currentFrameIndexRef.current < nFrames) {
                setCurrentFrameIndex(prev => prev + 1);
            } else {
                setIsPlayingAnimation(false);
                if (animationTimerRef.current) {
                    clearInterval(animationTimerRef.current);
                }
            }
        }, frameTime);
    };


    useEffect(() => {
        const loadFrames = async () => {
            dispatch(setIsAnimatingTrajectory(true));
            representationRef.current = new MoleculeRepresentation(style, "/*/*/*/*", commandCentre.current);
            framesRef.current = await computeFrames(selectedMolecule, representationRef.current);
            setNFrames(framesRef.current.length);
            setBusyComputingFrames(false);
            dispatch(hideMolecule(selectedMolecule));
            await representationRef.current.buildBuffers(framesRef.current[0]);
        };
        loadFrames();
    }, []);

    return (
        <div style={{ width: "20rem" }}>
            {busyComputingFrames ? (
                <MoorhenStack direction="vertical">
                    <span>Please wait...</span>
                    <MoorhenLinearProgress value={progress} />
                </MoorhenStack>
            ) : nFrames > 0 ? (
                <MoorhenStack direction="vertical">
                    <MoorhenStack gap="0.5rem" direction="horizontal" align="center" justify="center">
                        <MoorhenButton onClick={handlePlayButton}
                            type="icon-only" icon=
                            {currentFrameIndex === nFrames ? (
                                "MatSymReplay"
                            ) : isPlayingAnimation ? (
                                "MatSymPauseCircled"
                            ) : (
                                "MatSymPlayCircled"
                            )}>
                        </MoorhenButton>
                        <MoorhenButton
                            type="icon-only"
                            onClick={() => {
                                setIsPlayingAnimation(false);
                                representationRef.current?.deleteBuffers();
                                dispatch(showMolecule(selectedMolecule));
                                dispatch(setIsAnimatingTrajectory(false));
                                dispatch(setShownControl(null));
                                if (animationTimerRef.current) {
                                    clearInterval(animationTimerRef.current);
                                }
                            }}
                            icon="MatSymStopCircled"
                        >
                        </MoorhenButton>
                        <MoorhenNumberInput
                            value={frameTime}
                            setValue={setFrameTime}
                            integer
                            label="Frame Time:"
                            type="number"
                            disabled={isPlayingAnimation} />
                    </MoorhenStack>
                    <MoorhenSlider
                        value={currentFrameIndex}
                        minVal={1}
                        maxVal={nFrames}
                        step={1}
                        decimalPlaces={0}
                        sliderTitle="Frame"
                        setValue={setCurrentFrameIndex}
                    />
                </MoorhenStack>
            ) : (
                <span>Loading...</span>
            )}
        </div>
    );
};
