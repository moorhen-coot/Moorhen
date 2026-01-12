import { LinearProgress } from "@mui/material";
import { useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { moorhen } from "../../../../types/moorhen";
import { privateer } from "../../../../types/privateer";
import { modalKeys } from "../../../../utils/enums";
import { MoorhenCarbohydrateCard } from "../../MoorhenCarbohydrateCard";

export const MoorhenCarbohydrateList = (props: {
    setBusy?: React.Dispatch<React.SetStateAction<boolean>>;
    molecule: moorhen.Molecule;
    height?: number | string;
}) => {
    const updateMolNo = useSelector((state: moorhen.State) => state.moleculeMapUpdate.moleculeUpdate.molNo);
    const updateSwitch = useSelector((state: moorhen.State) => state.moleculeMapUpdate.moleculeUpdate.switch);
    const showModelsModal = useSelector((state: moorhen.State) => state.modals.activeModals.includes(modalKeys.MODELS));

    const [carbohydrateList, setCarbohydrateList] = useState<privateer.ResultsEntry[] | null>(null);

    const validate = async () => {
        props.setBusy?.(true);
        const result = await props.molecule.getPrivateerValidation(true);
        setCarbohydrateList(result);
        props.setBusy?.(false);
    };

    useEffect(() => {
        if (props.molecule?.molNo === updateMolNo && showModelsModal) {
            validate();
        }
    }, [updateSwitch]);

    useEffect(() => {
        validate();
    }, []);

    return (
        <>
            {carbohydrateList === null ? (
                <LinearProgress variant="indeterminate" />
            ) : carbohydrateList.length > 0 ? (
                <>
                    {carbohydrateList.map(carbohydrate => {
                        return <MoorhenCarbohydrateCard key={carbohydrate.id} carbohydrate={carbohydrate} molecule={props.molecule} />;
                    })}
                </>
            ) : (
                <div>
                    <b>No Carbohydrates</b>
                </div>
            )}
        </>
    );
};
