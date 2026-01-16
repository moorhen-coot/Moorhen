import { LinearProgress } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { MoorhenButton } from "@/components/inputs";
import { MoorhenAccordion } from "@/components/interface-base";
import { addGeneralRepresentation, removeGeneralRepresentation } from "@/store";
import { moorhen } from "../../../../types/moorhen";
import { privateer } from "../../../../types/privateer";
import { modalKeys } from "../../../../utils/enums";
import { MoorhenCarbohydrateCard } from "../../MoorhenCarbohydrateCard";

export const MoorhenCarbohydrateList = (props: {
    setBusy?: React.Dispatch<React.SetStateAction<boolean>>;
    molecule: moorhen.Molecule;
    height?: number | string;
}) => {
    const dispatch = useDispatch();
    const updateMolNo = useSelector((state: moorhen.State) => state.moleculeMapUpdate.moleculeUpdate.molNo);
    const updateSwitch = useSelector((state: moorhen.State) => state.moleculeMapUpdate.moleculeUpdate.switch);
    const showGlycoBlock: boolean = useSelector((state: moorhen.State) =>
        Boolean(state.molecules.generalRepresentations.find(item => item.style === "glycoBlocks" && item.parentMolecule === props.molecule))
    );

    const [carbohydrateList, setCarbohydrateList] = useState<privateer.ResultsEntry[] | null>(null);

    const validate = async () => {
        props.setBusy?.(true);
        const result = await props.molecule.getPrivateerValidation(true);
        setCarbohydrateList(result);
        props.setBusy?.(false);
    };

    useEffect(() => {
        if (props.molecule?.molNo === updateMolNo) {
            validate();
        }
    }, [updateSwitch]);

    useEffect(() => {
        validate();
    }, []);

    const toggleGlycoBlocks = () => {
        if (showGlycoBlock) {
            const representation = props.molecule.hide("glycoBlocks");
            dispatch(removeGeneralRepresentation(representation));
        } else {
            props.molecule.show("glycoBlocks").then(representation => {
                dispatch(addGeneralRepresentation(representation));
            });
        }
    };

    const extraControl = [
        <MoorhenButton
            icon={showGlycoBlock ? "MatSymVisibility" : "MatSymVisibilityOff"}
            variant="white"
            onClick={toggleGlycoBlocks}
            tooltip={showGlycoBlock ? "Hide Glyco-Blocks" : "Show Glyco-Blocks"}
        >
            <span style={{ fontSize: "0.8rem" }}>Glyco-Blocks</span>
        </MoorhenButton>,
    ];

    return (
        <MoorhenAccordion title="Carbohydrates" extraControls={extraControl}>
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
        </MoorhenAccordion>
    );
};
