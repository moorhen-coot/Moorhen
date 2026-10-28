import { useDispatch, useSelector } from "react-redux";
import { useCallback, useState } from "react";
import { useCommandCentre } from "../../InstanceManager";
import { clearResidueSelection } from "../../store/generalStatesSlice";
import { moorhen } from "../../types/moorhen";
import { MoorhenSlider } from "../inputs";
import { MoorhenButton } from "../inputs";
import { MoorhenMoleculeSelect } from "../inputs";
import { MoorhenCidInputForm } from "../inputs/Cid/MoorhenCidInputForm";
import { MoorhenMapSelect } from "../inputs/Selector/MoorhenMapSelect";
import { MoorhenStack } from "../interface-base";

export const RandomJiggleBlur = () => {
    const commandCentre = useCommandCentre();
    const dispatch = useDispatch();
    const residueSelection = useSelector((state: moorhen.State) => state.generalStates.residueSelection);
    const maps = useSelector((state: moorhen.State) => state.maps);
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);

    const [selectedMap, setSelectedMap] = useState<number | null>(null);
    const [selectedMolNo, setSelectedMolNo] = useState<number | undefined>(undefined);
    const [bFactor, setBFactor] = useState<number>(200);
    const [noTrials, setNoTrials] = useState<number>(500);
    const [scaleFactor, setScaleFactor] = useState<number>(3);
    const [cid, setCid] = useState<string>("");

    const onCompleted = useCallback(async () => {
        if (selectedMolNo === undefined || selectedMap === null || !cid) {
            return;
        }

        const selectedMolecule = molecules.find(molecule => molecule.molNo === selectedMolNo);
        if (!selectedMolecule) {
            return;
        }

        if (cid === residueSelection?.cid) {
            dispatch(clearResidueSelection());
        }

        await commandCentre.current.cootCommand(
            {
                command: "fit_to_map_by_random_jiggle_with_blur_using_cid",
                returnType: "status",
                commandArgs: [selectedMolNo, selectedMap, cid, bFactor, noTrials, scaleFactor],
            },
            false
        );

        selectedMolecule.setAtomsDirty(true);
        await selectedMolecule.redraw();
    }, [commandCentre, molecules, residueSelection, selectedMolNo, selectedMap, cid, bFactor, noTrials, scaleFactor]);

    return (
        <>
            <MoorhenStack inputGrid>
            <MoorhenMoleculeSelect molecules={molecules} selectedMolecule={selectedMolNo} setSelectedMolecule={setSelectedMolNo} />
            <MoorhenMapSelect maps={maps} selectedMap={selectedMap} setSelectedMap={setSelectedMap} />
            <MoorhenCidInputForm
                margin="0.5rem"
                value={cid}
                setValue={setCid}
                allowUseCurrentSelection={true}
                placeholder="Input custom selection e.g. //A,B"
            />
            </MoorhenStack>
            <MoorhenSlider
                sliderTitle="B-Factor"
                minVal={10}
                maxVal={400}
                showLabels={false}
                scale="linear"
                stepButtons={25}
                value={bFactor}
                setValue={value => setBFactor(value)}
                decimalPlaces={0}
            />
            <MoorhenSlider
                sliderTitle="No. of trials"
                minVal={10}
                maxVal={5000}
                showLabels={false}
                scale="linear"
                stepButtons={100}
                value={noTrials}
                setValue={value => setNoTrials(value)}
                decimalPlaces={0}
            />
            <MoorhenSlider
                sliderTitle="Scale factor"
                minVal={1}
                maxVal={6}
                showLabels={false}
                scale="linear"
                stepButtons={1}
                value={scaleFactor}
                setValue={value => setScaleFactor(value)}
                decimalPlaces={0}
            />
            <MoorhenButton onClick={onCompleted}>Ok</MoorhenButton>
        </>
    );
};
