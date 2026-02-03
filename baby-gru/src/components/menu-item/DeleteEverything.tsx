import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store";
import { emptyMaps } from "../../store/mapsSlice";
import { emptyMolecules } from "../../store/moleculesSlice";
import { MoorhenButton } from "../inputs";
import { MoorhenStack } from "../interface-base";

export const DeleteEverything = () => {
    const dispatch = useDispatch();
    const molecules = useSelector((state: RootState) => state.molecules.moleculeList);
    const maps = useSelector((state: RootState) => state.maps);

    const onCompleted = () => {
        maps.forEach(map => {
            map.delete();
        });
        molecules.forEach(molecule => {
            molecule.delete();
        });

        dispatch(emptyMolecules());
        dispatch(emptyMaps());
        document.body.click();
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
