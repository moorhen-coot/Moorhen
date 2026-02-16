import { useDispatch } from "react-redux";
import { useCallback, useRef, useState } from "react";
import { addMolecule } from "../../store/moleculesSlice";
import { moorhen } from "../../types/moorhen";
import { MoorhenButton, MoorhenSelect } from "../inputs";

export const GenerateAssembly = (props: {
    item: moorhen.Molecule;
    setCurrentName: React.Dispatch<React.SetStateAction<string>>;
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
    const ruleSelectRef = useRef<null | HTMLSelectElement>(null);
    const [selectionType, setSelectionType] = useState<string>("1");
    const dispatch = useDispatch();

    const menuItemText = "Generate assembly";

    const rows = [];
    const assemblies = props.item.gemmiStructure.assemblies;
    for (let i = 0; i < assemblies.size(); i++) {
        const assembly = assemblies.get(i);
        const assembly_name = assembly.name;
        const oligomeric_details = assembly.oligomeric_details;
        assembly.delete();
        rows.push(
            <option value={assembly_name} key={assembly_name}>
                ({assembly_name}) {oligomeric_details}
            </option>
        );
    }
    assemblies.delete();

    const onCompleted = useCallback(async () => {
        props.setPopoverIsShown(false);
        const newMolecule = await props.item.generateAssembly(ruleSelectRef.current.value);
        dispatch(addMolecule(newMolecule));
        document.body.click();
    }, []);

    return (
        <>
            <MoorhenSelect label="Assembly" ref={ruleSelectRef} onChange={val => setSelectionType(val.target.value)}>
                {rows}
            </MoorhenSelect>
            <MoorhenButton onClick={onCompleted}>OK</MoorhenButton>
        </>
    );
};
