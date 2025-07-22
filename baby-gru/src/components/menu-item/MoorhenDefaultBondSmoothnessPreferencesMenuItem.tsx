import { useRef } from "react";
import { Form, FormSelect } from "react-bootstrap";
import { useSelector, useDispatch } from "react-redux";
import { moorhen } from "../../types/moorhen";
import { setDefaultBondSmoothness } from "../../store/sceneSettingsSlice";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem";

export const MoorhenDefaultBondSmoothnessPreferencesMenuItem = (props: {
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>; 
    popoverPlacement?: "left" | "right";
}) => {
    
    const dispatch = useDispatch()

    const defaultBondSmoothness = useSelector((state: moorhen.State) => state.sceneSettings.defaultBondSmoothness)
    
    const smoothnesSelectRef = useRef<null | HTMLSelectElement>(null)

    const onCompleted = () => { dispatch(
        setDefaultBondSmoothness(parseInt(smoothnesSelectRef.current.value))
    )}

    const panelContent =
        <>
            <Form.Group className="mb-3" style={{ width: '10rem', margin: '0' }} controlId="MoorhenSmoothnessSelector">
                <Form.Label>Smoothness</Form.Label>
                <FormSelect size="sm" ref={smoothnesSelectRef} defaultValue={defaultBondSmoothness}>
                    <option value={1} key={1}>Coarse</option>
                    <option value={2} key={2}>Nice</option>
                    <option value={3} key={3}>Smooth</option>
                </FormSelect>
            </Form.Group>
        </>

    return <MoorhenBaseMenuItem
        popoverPlacement={props.popoverPlacement ?? "right"}
        popoverContent={panelContent}
        menuItemText={"Default smoothness of molecule bonds..."}
        setPopoverIsShown={props.setPopoverIsShown}
        onCompleted={onCompleted}
    />
}
