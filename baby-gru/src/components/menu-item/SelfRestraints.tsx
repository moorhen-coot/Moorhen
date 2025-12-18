import { useDispatch, useSelector } from "react-redux";
import { useCallback, useEffect, useRef, useState } from "react";
import { addGeneralRepresentation } from "../../moorhen";
import { triggerUpdate } from "../../store/moleculeMapUpdateSlice";
import { moorhen } from "../../types/moorhen";
import { MoorhenSelect, MoorhenSlider } from "../inputs";
import { MoorhenButton } from "../inputs";
import { MoorhenMoleculeSelect } from "../inputs";
import { MoorhenCidInputForm } from "../inputs/MoorhenCidInputForm";
import { MoorhenChainSelect } from "../inputs/Selector/MoorhenChainSelect";
import { MoorhenStack } from "../interface-base";

export const SelfRestraints = () => {
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark);

    const modeTypeSelectRef = useRef<HTMLSelectElement | null>(null);
    const moleculeSelectRef = useRef<HTMLSelectElement | null>(null);
    const chainSelectRef = useRef<HTMLSelectElement | null>(null);
    const cidSelectRef = useRef<HTMLInputElement | null>(null);
    const maxDistSliderRef = useRef<number>(4.5);

    const [selectedMode, setSelectedMode] = useState<string>("Molecule");
    const [selectedMolNo, setSelectedMolNo] = useState<null | number>(null);
    const [selectedChain, setSelectedChain] = useState<string>("");
    const [maxDist, setMaxDist] = useState<number>(4.5);
    const [cid, setCid] = useState<string>("");

    const dispatch = useDispatch();

    const modes = ["Molecule", "Chain", "Atom Selection"];

    useEffect(() => {
        if (molecules.length === 0) {
            setSelectedMolNo(null);
        } else if (selectedMolNo === null || !molecules.map(molecule => molecule.molNo).includes(selectedMolNo)) {
            setSelectedMolNo(molecules[0].molNo);
        }
    }, [molecules.length]);

    const handleModelChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedMolecule = molecules.find(molecule => molecule.molNo === parseInt(evt.target.value));
        if (selectedMolecule) {
            setSelectedMolNo(parseInt(evt.target.value));
            setSelectedChain(selectedMolecule.sequences.length > 0 ? selectedMolecule.sequences[0].chain : "");
        }
    };

    const onCompleted = useCallback(async () => {
        if (!moleculeSelectRef.current.value || maxDistSliderRef.current === null) {
            return;
        }

        const selectedMolecule = molecules.find(molecule => molecule.molNo === parseInt(moleculeSelectRef.current.value));
        if (!selectedMolecule) {
            return;
        }

        let cid: string;
        switch (modeTypeSelectRef.current.value) {
            case "Molecule":
                cid = "/*/*/*/*";
                break;
            case "Chain":
                cid = `/*/${chainSelectRef.current.value}/*/*`;
                break;
            case "Atom Selection":
                if (cidSelectRef.current.value) {
                    cid = cidSelectRef.current.value;
                }
                break;
            default:
                console.warn("Unrecognised self restraints mode...", modeTypeSelectRef.current.value);
        }

        if (cid) {
            await selectedMolecule.generateSelfRestraints(cid, maxDistSliderRef.current);
            const restraintsRepresenation = selectedMolecule.representations.find(item => item.style === "restraints");
            if (restraintsRepresenation) {
                await restraintsRepresenation.redraw();
            } else {
                const representation = await selectedMolecule.addRepresentation("restraints", "/*/*/*/*");
                dispatch(addGeneralRepresentation(representation));
            }
            dispatch(triggerUpdate(selectedMolecule.molNo));
        }
    }, []);

    return (
        <>
            <MoorhenStack inputGrid align="center">
                <MoorhenSelect
                    label="Selection"
                    ref={modeTypeSelectRef}
                    defaultValue={"Molecule"}
                    onChange={evt => setSelectedMode(evt.target.value)}
                >
                    {modes.map(type => {
                        return (
                            <option value={type} key={type}>
                                {type}
                            </option>
                        );
                    })}
                </MoorhenSelect>
                <MoorhenMoleculeSelect ref={moleculeSelectRef} molecules={molecules} onChange={handleModelChange} />
                {selectedMode === "Chain" && (
                    <MoorhenChainSelect
                        ref={chainSelectRef}
                        molecules={molecules}
                        selectedCoordMolNo={selectedMolNo}
                        onChange={evt => setSelectedChain(evt.target.value)}
                    />
                )}
                {selectedMode === "Atom Selection" && (
                    <MoorhenCidInputForm
                        ref={cidSelectRef}
                        margin="0.5rem"
                        onChange={evt => setCid(evt.target.value)}
                        allowUseCurrentSelection={true}
                        placeholder={cidSelectRef.current ? "" : "Input custom selection e.g. //A,B"}
                    />
                )}
            </MoorhenStack>
            <MoorhenSlider
                sliderTitle="Max. dist."
                minVal={4}
                maxVal={6}
                showMinMaxVal={false}
                logScale={false}
                externalValue={maxDist}
                stepButtons={0.25}
                decimalPlaces={2}
                setExternalValue={value => setMaxDist(value)}
            />
            <MoorhenButton onClick={onCompleted}>OK</MoorhenButton>
        </>
    );
};
