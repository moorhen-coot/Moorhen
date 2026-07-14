import { useEffect, useState } from "react";
import { MoorhenMoleculeSelect } from "../Selector/MoleculeSelector";
import { MoorhenCidInputForm } from "./MoorhenCidInputForm";
import { MoorhenMolecule } from "@/utils/MoorhenMolecule";

export const MoorhenCidAndMoleculeSelect = (props: {
    moleculeList?: MoorhenMolecule[];
    setSelectedMoleculeUniqueId: React.Dispatch<React.SetStateAction<string>> | ((newMoleculeUniqueId: string) => void);
    setSelectedCid: React.Dispatch<React.SetStateAction<string>> | ((newCid: string) => void);
    selectedMoleculeUniqueId?: string;
    selectedCid?: string;
}) => {
    const [internalSelectedMoleculeUniqueId, setInternalSelectedMoleculeUniqueId] = useState<string | undefined>(props.selectedMoleculeUniqueId);

    useEffect(() => {
        if (props.selectedMoleculeUniqueId !== undefined) {
            setInternalSelectedMoleculeUniqueId(props.selectedMoleculeUniqueId);
        }
    }, [props.selectedMoleculeUniqueId]);

    const selectedMoleculeUniqueId = props.selectedMoleculeUniqueId !== undefined ? props.selectedMoleculeUniqueId : internalSelectedMoleculeUniqueId;

    const handleMoleculeUniqueIdChange = (newMoleculeUniqueId: string) => {
        if (props.selectedMoleculeUniqueId === undefined) {
            setInternalSelectedMoleculeUniqueId(newMoleculeUniqueId);
        }
        props.setSelectedMoleculeUniqueId(newMoleculeUniqueId);
    };

    return (
        <>
            <MoorhenMoleculeSelect useUniqueId selectedMolecule={selectedMoleculeUniqueId} onSelect={handleMoleculeUniqueIdChange} />
            <MoorhenCidInputForm value={props.selectedCid} setCid={props.setSelectedCid} setMoleculeUniqueId={handleMoleculeUniqueIdChange} />
        </>
    )
}