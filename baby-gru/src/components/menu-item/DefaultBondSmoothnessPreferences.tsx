import { Form, FormSelect } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { useRef } from "react";
import { setDefaultBondSmoothness } from "../../store/sceneSettingsSlice";
import { moorhen } from "../../types/moorhen";
import { MoorhenButton } from "../inputs";

export const DefaultBondSmoothnessPreferences = () => {
    const dispatch = useDispatch();

    const defaultBondSmoothness = useSelector((state: moorhen.State) => state.sceneSettings.defaultBondSmoothness);

    const smoothnesSelectRef = useRef<null | HTMLSelectElement>(null);

    const menuItemText = "Default smoothness of molecule bonds...";

    const onCompleted = () => {
        dispatch(setDefaultBondSmoothness(parseInt(smoothnesSelectRef.current.value)));
    };

    const panelContent = (
        <>
            <Form.Group className="mb-3" style={{ width: "10rem", margin: "0" }} controlId="MoorhenSmoothnessSelector">
                <Form.Label>Smoothness</Form.Label>
                <FormSelect size="sm" ref={smoothnesSelectRef} defaultValue={defaultBondSmoothness}>
                    <option value={1} key={1}>
                        Coarse
                    </option>
                    <option value={2} key={2}>
                        Nice
                    </option>
                    <option value={3} key={3}>
                        Smooth
                    </option>
                </FormSelect>
            </Form.Group>
            <MoorhenButton onClick={onCompleted}>OK</MoorhenButton>
        </>
    );

    return panelContent;
};
