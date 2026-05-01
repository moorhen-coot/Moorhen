import { useDispatch, useSelector } from "react-redux";
import { useState } from "react";
import { RootState, setShownControl } from "@/store";
import { MoorhenButton, MoorhenChainSelect, MoorhenMoleculeSelect, MoorhenNumberInput } from "../inputs";
import { MoorhenStack } from "../interface-base";

export const StepRefinement = () => {
    const molecules = useSelector((state: RootState) => state.molecules.moleculeList);
    const [selectedMolecule, setSelectedMolecule] = useState(molecules[0]?.molNo ?? null);
    const dispatch = useDispatch();

    const [selectedChain, setSelectedChain] = useState<string>("*");
    const selectedMoleculeObj = molecules.find(molecule => molecule.molNo === selectedMolecule);
    const [startAt, setStartAt] = useState<number>(
        selectedMoleculeObj?.sequences.find(sequence => (selectedChain !== "*" ? sequence.chain === selectedChain : true))?.sequence[0].resNum ?? 1
    );

    const onCompleted = () => {
        if (selectedMoleculeObj) {
            const chains = selectedChain === "*" ? selectedMoleculeObj.sequences.map(sequence => sequence.chain) : [selectedChain];
            const residueList = selectedMoleculeObj.sequences
                .filter(sequence => chains.includes(sequence.chain))
                .map(item => item.sequence)
                .map(sequence => sequence.map(residue => (residue.resNum > startAt ? residue.cid : null)))
                .flat()
                .filter(cid => cid !== null);
            dispatch(setShownControl({ name: "steppedRefine", payload: { residueList, selectedMolecule: selectedMoleculeObj.molNo } }));
        } else {
            console.warn(`Unable to find molecule with molNo ${selectedMolecule} for stepped refinement...`);
        }
        document.body.click();
    };

    return (
        <MoorhenStack inputGrid>
            {selectedMolecule!==null && <MoorhenMoleculeSelect selected={selectedMolecule} onSelect={setSelectedMolecule} />}
            {selectedMolecule===null && <MoorhenMoleculeSelect/>}
            <MoorhenChainSelect
                molecules={molecules}
                selectedCoordMolNo={selectedMolecule}
                allowAll
                defaultValue="*"
                onChange={evt => {
                    if(selectedMolecule){
                        setSelectedChain(evt.target.value);
                        setStartAt(
                            selectedMoleculeObj.sequences.find(sequence => sequence.chain === evt.target.value)?.sequence[0].resNum ?? 1
                        );
                    }
                }}
            />
            <MoorhenNumberInput
                label="Start at residue"
                setValue={setStartAt}
                value={startAt}
                decimalDigits={0}
                type="number"
                width={"5rem"}
            />
            <MoorhenButton onClick={onCompleted}>Ok</MoorhenButton>
        </MoorhenStack>
    );
};
