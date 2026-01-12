import { time } from "node:console";
import { batch, useDispatch, useSelector } from "react-redux";
import { useTimeCapsule } from "@/InstanceManager";
import { emptyMaps } from "../../store/mapsSlice";
import { emptyMolecules } from "../../store/moleculesSlice";
import { moorhen } from "../../types/moorhen";
import { MoorhenButton } from "../inputs";
import { MoorhenStack } from "../interface-base";

export const DeleteEverything = () => {
    const dispatch = useDispatch();
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);
    const maps = useSelector((state: moorhen.State) => state.maps);

    const onCompleted = () => {
        maps.forEach(map => {
            map.delete();
        });
        molecules.forEach(molecule => {
            molecule.delete();
        });
        batch(() => {
            dispatch(emptyMolecules());
            dispatch(emptyMaps());
        });
    };

    return (
        <MoorhenStack align="center" gap="1rem">
            <span style={{ fontWeight: "bold" }}>Warning: this action cannot be reversed.</span>
            <MoorhenButton onClick={onCompleted} variant="danger">
                Delete everything
            </MoorhenButton>
        </MoorhenStack>
    );
};
