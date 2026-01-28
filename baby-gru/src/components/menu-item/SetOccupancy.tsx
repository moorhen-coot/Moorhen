import { useDispatch, useSelector } from "react-redux";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCommandCentre } from "../../InstanceManager";
import { triggerRedrawEnv } from "../../store/glRefSlice";
import { triggerUpdate } from "../../store/moleculeMapUpdateSlice";
import { moorhen } from "../../types/moorhen";
import { MoorhenButton, MoorhenNumberInput, MoorhenSelect } from "../inputs";
import { MoorhenMoleculeSelect } from "../inputs";
import { MoorhenCidInputForm } from "../inputs/MoorhenCidInputForm";
import { MoorhenLigandSelect } from "../inputs/Selector/MoorhenLigandSelect";
import { MoorhenStack } from "../interface-base";

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
    const [occupancy, setOccupancy] = useState<number>(1.0);
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
        if (!moleculeSelectRef.current.value || !ruleSelectRef.current?.value === null) {
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
                    commandArgs: [selectedMolecule.molNo, cid, occupancy],
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
            <MoorhenStack inputGrid align="center">
                <MoorhenSelect
                    label="Selection type"
                    ref={ruleSelectRef}
                    defaultValue={"ligand"}
                    onChange={val => setSelectionType(val.target.value)}
                >
                    <option value={"ligand"} key={"ligand"}>
                        By ligand
                    </option>
                    <option value={"cid"} key={"cid"}>
                        By atom selection
                    </option>
                </MoorhenSelect>
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
                <MoorhenNumberInput label="Occupancy" type="number" value={Number(occupancy)} setValue={setOccupancy} minMax={[0, 1]} />
            </MoorhenStack>
            <p />
            <MoorhenButton variant="primary" onClick={set_occupancy}>
                OK
            </MoorhenButton>
        </>
    );
};
