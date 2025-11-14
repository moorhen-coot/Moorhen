import { TextField } from "@mui/material";
import { Button, Form, FormSelect } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCommandCentre } from "../../InstanceManager";
import { triggerRedrawEnv } from "../../store/glRefSlice";
import { triggerUpdate } from "../../store/moleculeMapUpdateSlice";
import { moorhen } from "../../types/moorhen";
import { MoorhenCidInputForm } from "../inputs/MoorhenCidInputForm";
import { MoorhenLigandSelect } from "../select/MoorhenLigandSelect";
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect";

export const SetOccupancy = () => {
    const moleculeSelectRef = useRef<null | HTMLSelectElement>(null);
    const cidFormRef = useRef<null | HTMLInputElement>(null);
    const ruleSelectRef = useRef<null | HTMLSelectElement>(null);
    const ligandSelectRef = useRef<null | HTMLSelectElement>(null);
    const occupancyValueRef = useRef<null | number>(1.0);

    const dispatch = useDispatch();
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);

    const [cid, setCid] = useState<string>("");
    const [invalidCid, setInvalidCid] = useState<boolean>(false);
    const [selectionType, setSelectionType] = useState<string>("ligand");
    const [selectedModel, setSelectedModel] = useState<number | number>(null);
    const [occupancy, setOccupancy] = useState<string>("1.0");
    const commandCentre = useCommandCentre();

    const menuItemText = "Set occupancy...";

    const handleModelChange = useCallback(
        (evt: React.ChangeEvent<HTMLSelectElement>) => {
            setSelectedModel(parseInt(evt.target.value));
        },
        [molecules]
    );

    useEffect(() => {
        let selectedMolecule: moorhen.Molecule;
        if (molecules.length === 0) {
            setSelectedModel(null);
        } else if (selectedModel === null) {
            setSelectedModel(molecules[0].molNo);
            selectedMolecule = molecules[0];
        } else if (!molecules.map(molecule => molecule.molNo).includes(selectedModel)) {
            setSelectedModel(molecules[0].molNo);
            selectedMolecule = molecules[0];
        }
    }, [molecules]);

    const convertValue = (value: number) => {
        if (value >= 0) {
            return `+${value + 1}0%`;
        }
        return `${value}0%`;
    };

    const set_occupancy = async () => {
        if (!moleculeSelectRef.current.value || !ruleSelectRef.current?.value || occupancyValueRef.current === null) {
            console.warn("Missing data, doing nothing...");
            return;
        }

        const selectedMolecule = molecules.find(molecule => molecule.molNo === parseInt(moleculeSelectRef.current.value));
        if (!selectedMolecule) {
            console.warn(`Cannot find molecule with molNo ${moleculeSelectRef.current.value}`);
            return;
        }

        let cid: string;
        switch (ruleSelectRef.current.value) {
            case "ligand":
                cid = ligandSelectRef.current?.value ? ligandSelectRef.current.value : undefined;
                break;
            case "cid":
                cid = cidFormRef.current?.value ? cidFormRef.current.value : undefined;
                break;
            default:
                console.warn(`Unrecognised selection type ${ruleSelectRef.current.value}`);
                break;
        }

        const isValid = cid && (await selectedMolecule.isValidSelection(cid));
        if (isValid) {
            await commandCentre.current.cootCommand(
                {
                    command: "set_occupancy",
                    commandArgs: [selectedMolecule.molNo, cid, occupancyValueRef.current],
                    returnType: "status",
                },
                false
            );
            dispatch(triggerUpdate(selectedMolecule.molNo));
            selectedMolecule.setAtomsDirty(true);
            await selectedMolecule.redraw();
            dispatch(triggerRedrawEnv(true));
            document.body.click();
        } else {
            if (ruleSelectRef.current.value === "cid") setInvalidCid(true);
            console.warn(`Invalid selection of type ${ruleSelectRef.current.value}`);
        }
    };

    return (
        <>
            <Form.Group style={{ width: "100%", margin: 0 }}>
                <Form.Label>Selection type</Form.Label>
                <FormSelect size="sm" ref={ruleSelectRef} defaultValue={"ligand"} onChange={val => setSelectionType(val.target.value)}>
                    <option value={"ligand"} key={"ligand"}>
                        By ligand
                    </option>
                    <option value={"cid"} key={"cid"}>
                        By atom selection
                    </option>
                </FormSelect>
            </Form.Group>
            <MoorhenMoleculeSelect molecules={molecules} onChange={handleModelChange} allowAny={false} ref={moleculeSelectRef} />
            {selectionType === "ligand" && (
                <MoorhenLigandSelect molecules={molecules} selectedCoordMolNo={selectedModel} ref={ligandSelectRef} />
            )}
            {selectionType === "cid" && (
                <MoorhenCidInputForm
                    ref={cidFormRef}
                    label="Atom selection"
                    margin="0.5rem"
                    // defaultValue={props.initialCid}
                    onChange={evt => setCid(evt.target.value)}
                    invalidCid={invalidCid}
                    allowUseCurrentSelection={true}
                />
            )}
            <Form.Group style={{ width: "100%", margin: 0 }}>
                <TextField
                    style={{ width: "30%", margin: "0.5rem" }}
                    id="conformer-count"
                    label="Occupancy"
                    type="number"
                    variant="standard"
                    error={isNaN(parseFloat(occupancy)) || parseFloat(occupancy) < 0 || parseInt(occupancy) === Infinity}
                    value={occupancy}
                    inputProps={{
                        step: ".1",
                        max: 1.0,
                        min: 0.0,
                    }}
                    onChange={evt => {
                        occupancyValueRef.current = parseFloat(evt.target.value);
                        setOccupancy(evt.target.value);
                    }}
                />
            </Form.Group>
            <Button variant="primary" onClick={set_occupancy}>
                OK
            </Button>
        </>
    );
};
