import { useRef } from "react";
import { Form, FormSelect } from "react-bootstrap";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem";

export const MoorhenDefaultBondSmoothnessPreferencesMenuItem = (props: {
    setDefaultBondSmoothness: React.Dispatch<React.SetStateAction<number>>;
    defaultBondSmoothness: number;
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>; 
}) => {
    
    const smoothnesSelectRef = useRef<null | HTMLSelectElement>(null)

    const onCompleted = () => {
        props.setDefaultBondSmoothness(parseInt(smoothnesSelectRef.current.value))
    }

    const panelContent =
        <>
            <Form.Group className="mb-3" style={{ width: '10rem', margin: '0' }} controlId="MoorhenSmoothnessSelector">
                <Form.Label>Smoothness</Form.Label>
                <FormSelect size="sm" ref={smoothnesSelectRef} defaultValue={props.defaultBondSmoothness}>
                    <option value={1} key={1}>Coarse</option>
                    <option value={2} key={2}>Nice</option>
                    <option value={3} key={3}>Smooth</option>
                </FormSelect>
            </Form.Group>
        </>

    return <MoorhenBaseMenuItem
        popoverPlacement='right'
        popoverContent={panelContent}
        menuItemText={"Default smoothness of molecule bonds..."}
        setPopoverIsShown={props.setPopoverIsShown}
        onCompleted={onCompleted}
    />

}
