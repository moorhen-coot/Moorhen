import { useSnackbar } from "notistack";
import { useSelector } from "react-redux";
import { useCallback, useRef } from "react";
import { useTimeCapsule } from "../../InstanceManager";
import { moorhen } from "../../types/moorhen";
import { MoorhenButton } from "../inputs";
import { MoorhenMoleculeSelect } from "../inputs";

export const StepRefinement = (props: { setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>> }) => {
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);
    const moleculeSelectRef = useRef<HTMLSelectElement | null>(null);
    const timeCapsuleRef = useTimeCapsule();

    const { enqueueSnackbar } = useSnackbar();

    const menuItemText = "Stepped refine...";

    const onCompleted = useCallback(async () => {
        const selectedMolecule = molecules.find(molecule => molecule.molNo === parseInt(moleculeSelectRef.current.value));
        if (selectedMolecule) {
            const handleStepRefine = async (cid: string) => {
                await selectedMolecule.centreAndAlignViewOn(cid, true);
                await selectedMolecule.refineResiduesUsingAtomCid(cid, "TRIPLE", 4000, true);
            };

            const residueList = selectedMolecule.sequences
                .map(item => item.sequence)
                .map(sequence => sequence.map(residue => residue))
                .flat();

            enqueueSnackbar("stepped-refine", {
                variant: "residueSteps",
                persist: true,
                timeCapsuleRef: timeCapsuleRef,
                residueList: residueList,
                onStep: handleStepRefine,
                onStart: async () => {
                    await selectedMolecule.fetchIfDirtyAndDraw("rama");
                },
                onStop: () => {
                    selectedMolecule.clearBuffersOfStyle("rama");
                },
            });
        } else {
            console.warn(`Unable to find molecule with molNo ${moleculeSelectRef.current.value} for stepped refinement...`);
        }
    }, [molecules]);

    return (
        <>
            <MoorhenMoleculeSelect ref={moleculeSelectRef} />
            <MoorhenButton onClick={onCompleted}>Ok</MoorhenButton>
        </>
    );
};
