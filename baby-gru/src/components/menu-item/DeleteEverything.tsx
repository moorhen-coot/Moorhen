import { Form } from "react-bootstrap";
import { batch, useDispatch, useSelector } from "react-redux";
import { emptyMaps } from "../../store/mapsSlice";
import { emptyMolecules } from "../../store/moleculesSlice";
import { moorhen } from "../../types/moorhen";
import { MoorhenButton } from "../inputs";

export const DeleteEverything = (props: { setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>> }) => {
    const dispatch = useDispatch();
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);
    const maps = useSelector((state: moorhen.State) => state.maps);

    const menuItemText = "Delete everything";

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
        <>
            <Form.Group style={{ width: "18rem", margin: "0.5rem" }} controlId="MoorhenGetDeleteEverythingMenuItem" className="mb-3">
                <span style={{ fontWeight: "bold" }}>Warning: this action cannot be reversed.</span>
            </Form.Group>
            <MoorhenButton onClick={onCompleted}>OK</MoorhenButton>
        </>
    );
};
