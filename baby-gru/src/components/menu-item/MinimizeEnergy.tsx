import { Button, Form, FormSelect, InputGroup } from "react-bootstrap";
import { useSelector } from "react-redux";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePersistentState } from "../../store/menusSlice";
import { moorhen } from "../../types/moorhen";
import { MoorhenButton, MoorhenSlider } from "../inputs";
import { MoorhenMoleculeSelect } from "../inputs";
import { MoorhenCidInputForm } from "../inputs/MoorhenCidInputForm";
import { MoorhenChainSelect } from "../select/MoorhenChainSelect";
import { MoorhenLigandSelect } from "../select/MoorhenLigandSelect";

export const MinimizeEnergy = () => {
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);
    const menu = "minimizeEnergyMenu";

    const useRamaRestraintsCheckRef = useRef<null | HTMLInputElement>(null);
    const useTorsionRestraintsCheckRef = useRef<null | HTMLInputElement>(null);
    const torsionWeightSliderRef = useRef<number>(1);
    const nIterationsSliderRef = useRef<number>(50);
    const ncycSliderRef = useRef<number>(50);
    const chainSelectRef = useRef<null | HTMLSelectElement>(null);
    const selectionTypeSelectRef = useRef<null | HTMLSelectElement>(null);
    const moleculeSelectRef = useRef<null | HTMLSelectElement>(null);
    const ligandSelectRef = useRef<null | HTMLSelectElement>(null);
    const cidInputRef = useRef<null | HTMLInputElement>(null);

    const [selectionType, setSelectionType] = usePersistentState<string>(menu, "selectionType", "ligand", true);
    const [selectedMolNo, setSelectedMolNo] = useState<number>(1);
    const [ramaWeight, setRamaWeight] = usePersistentState<number>(menu, "ramaWeight", 1, true);
    const [torsionWeight, setTorsionWeight] = usePersistentState<number>(menu, "torsionWeight", 1, true);
    const [ncyc, setNcyc] = usePersistentState<number>(menu, "ncyc", 50, true);
    const [nIterations, setNIterations] = usePersistentState<number>(menu, "nIterations", 50, true);
    const [useRamaRestraints, setUseRamaRestraints] = usePersistentState<boolean>(menu, "useRamaRestraints", false, true);
    const [useTorsionRestraints, setUseTorsionRestraints] = usePersistentState<boolean>(menu, "useTorsionRestraints", false, true);

    const menuItemText = "Minimize energy...";

    useEffect(() => {
        if (molecules.length === 0) {
            setSelectedMolNo(null);
        } else if (selectedMolNo === null) {
            setSelectedMolNo(molecules[0].molNo);
        } else if (!molecules.map(molecule => molecule.molNo).includes(selectedMolNo)) {
            setSelectedMolNo(molecules[0].molNo);
        }
    }, [molecules]);

    const minimizeEnergy = useCallback(async () => {
        if (!moleculeSelectRef.current.value) {
            return;
        }

        const molNo = parseInt(moleculeSelectRef.current.value);
        const selectedMolecule = molecules.find(molecule => molecule.molNo === molNo);

        if (!selectedMolecule) {
            return;
        }

        let cid: string;
        switch (selectionTypeSelectRef.current?.value) {
            case "molecule":
                cid = "//";
                break;
            case "chain":
                cid = `//${chainSelectRef.current.value}`;
                break;
            case "cid":
                cid = cidInputRef.current.value;
                break;
            case "ligand":
                cid = ligandSelectRef.current.value;
                break;
            default:
                console.log("Unrecognised mask type...");
                break;
        }

        if (!cid) {
            return;
        }

        document.body.click();

        await selectedMolecule.minimizeEnergyUsingCidAnimated(
            cid,
            ncycSliderRef.current,
            nIterationsSliderRef.current,
            useRamaRestraintsCheckRef.current.checked,
            ramaWeight,
            useTorsionRestraintsCheckRef.current.checked,
            torsionWeightSliderRef.current
        );
    }, [molecules]);

    return (
        <>
            <Form.Group style={{ margin: "0.5rem", width: "20rem" }}>
                <Form.Label>Selection type...</Form.Label>
                <FormSelect
                    size="sm"
                    ref={selectionTypeSelectRef}
                    defaultValue={selectionType}
                    onChange={evt => {
                        setSelectionType(evt.target.value);
                        selectionTypeSelectRef.current.value = evt.target.value;
                    }}
                >
                    <option value={"ligand"} key={"ligand"}>
                        By ligand
                    </option>
                    <option value={"chain"} key={"chain"}>
                        By chain
                    </option>
                    <option value={"cid"} key={"cid"}>
                        By atom selection
                    </option>
                </FormSelect>
            </Form.Group>
            <MoorhenMoleculeSelect
                molecules={molecules}
                allowAny={false}
                ref={moleculeSelectRef}
                onChange={evt => setSelectedMolNo(parseInt(evt.target.value))}
            />
            {selectionType === "cid" && (
                <MoorhenCidInputForm width="20rem" margin="0.5rem" ref={cidInputRef} allowUseCurrentSelection={true} />
            )}
            {selectionType === "chain" && (
                <MoorhenChainSelect molecules={molecules} selectedCoordMolNo={selectedMolNo} ref={chainSelectRef} />
            )}
            {selectionType === "ligand" && (
                <MoorhenLigandSelect
                    molecules={molecules}
                    selectedCoordMolNo={parseInt(moleculeSelectRef.current?.value)}
                    ref={ligandSelectRef}
                />
            )}
            <InputGroup className="moorhen-input-group-check" style={{ width: "20rem" }}>
                <Form.Check
                    ref={useRamaRestraintsCheckRef}
                    type="switch"
                    checked={useRamaRestraints}
                    onChange={() => {
                        setUseRamaRestraints(!useRamaRestraints);
                    }}
                    label="Use ramachandran restraints"
                />
            </InputGroup>
            <InputGroup className="moorhen-input-group-check" style={{ width: "20rem" }}>
                <Form.Check
                    ref={useTorsionRestraintsCheckRef}
                    type="switch"
                    checked={useTorsionRestraints}
                    onChange={() => {
                        setUseTorsionRestraints(!useTorsionRestraints);
                    }}
                    label="Use torsion restraints"
                />
            </InputGroup>
            <div style={{ display: useRamaRestraints ? "" : "none" }}>
                <MoorhenSlider
                    isDisabled={!useRamaRestraints}
                    sliderTitle="Ramachandran restraints weight"
                    minVal={0.1}
                    maxVal={100}
                    decimalPlaces={2}
                    logScale={true}
                    externalValue={ramaWeight}
                    setExternalValue={value => setRamaWeight(value)}
                />
            </div>
            <div style={{ display: useTorsionRestraints ? "" : "none" }}>
                <MoorhenSlider
                    isDisabled={!useTorsionRestraints}
                    sliderTitle="Torsion restraints weight"
                    minVal={0.1}
                    maxVal={10}
                    decimalPlaces={2}
                    logScale={true}
                    externalValue={torsionWeight}
                    setExternalValue={setTorsionWeight}
                />
            </div>
            <MoorhenSlider
                sliderTitle="Number of iterations"
                minVal={1}
                maxVal={100}
                logScale={false}
                decimalPlaces={0}
                externalValue={nIterations}
                setExternalValue={value => setNIterations(value)}
            />
            <MoorhenSlider
                sliderTitle="Number of cycles"
                minVal={1}
                maxVal={100}
                logScale={false}
                decimalPlaces={0}
                externalValue={ncyc}
                setExternalValue={value => setNcyc(value)}
            />
            <MoorhenButton variant="primary" onClick={minimizeEnergy}>
                OK
            </MoorhenButton>
        </>
    );
};
