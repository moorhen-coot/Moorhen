import { useDispatch, useSelector } from "react-redux";
import { useRef } from "react";
import { useCommandCentre } from "../../InstanceManager";
import { triggerUpdate } from "../../store/moleculeMapUpdateSlice";
import { moorhen } from "../../types/moorhen";
import { MoorhenButton } from "../inputs";
import { MoorhenMoleculeSelect } from "../inputs";
import { MoorhenMapSelect } from "../inputs/Selector/MoorhenMapSelect";

export const ShiftFieldBFactor = () => {
    const moleculeSelectRef = useRef<null | HTMLSelectElement>(null);
    const mapSelectRef = useRef<null | HTMLSelectElement>(null);
    const commandCentre = useCommandCentre();

    const dispatch = useDispatch();
    const maps = useSelector((state: moorhen.State) => state.maps);
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);
    const doRefinement = async () => {
        if (!moleculeSelectRef.current.value || !mapSelectRef.current.value) {
            return;
        }

        const selectedMoleculeMolNo = parseInt(moleculeSelectRef.current.value);
        const selectedMapMolNo = parseInt(mapSelectRef.current.value);

        await commandCentre.current.cootCommand(
            {
                command: "shift_field_b_factor_refinement",
                commandArgs: [selectedMoleculeMolNo, selectedMapMolNo],
                returnType: "status",
            },
            false
        );

        dispatch(triggerUpdate(selectedMoleculeMolNo));
    };

    return (
        <>
            <MoorhenMoleculeSelect molecules={molecules} allowAny={false} ref={moleculeSelectRef} />
            <MoorhenMapSelect
                maps={maps}
                ref={mapSelectRef}
                filterFunction={map => map.hasReflectionData}
                width="100%"
                label="Map with reflection data"
            />
            <MoorhenButton onClick={doRefinement}>OK</MoorhenButton>
        </>
    );
};
