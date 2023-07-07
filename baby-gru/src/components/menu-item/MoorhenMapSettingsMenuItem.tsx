import { Form } from "react-bootstrap"
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"
import MoorhenSlider from "../misc/MoorhenSlider";

export const MoorhenMapSettingsMenuItem = (props: {
    mapSolid: boolean;
    setMapSolid: React.Dispatch<React.SetStateAction<boolean>>;
    mapLitLines: boolean;
    setMapLitLines: React.Dispatch<React.SetStateAction<boolean>>;
    mapOpacity: number;
    setMapOpacity: React.Dispatch<React.SetStateAction<number>>;
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
    disabled: boolean;
}) => {

    const panelContent =
        <>
            <Form.Check
                type="switch"
                checked={props.mapSolid}
                onChange={() => { props.setMapSolid(!props.mapSolid) }}
                label="Draw as a surface" />
            {!props.mapSolid &&
                <Form.Check
                    type="switch"
                    checked={props.mapLitLines}
                    onChange={() => { props.setMapLitLines(!props.mapLitLines) }}
                    label="Activate lit lines" />
            }
            <Form.Group style={{ width: '100%', margin: '0.1rem' }} controlId="MoorhenMapOpacitySlider">
                <MoorhenSlider minVal={0.0} maxVal={1.0} logScale={false} sliderTitle="Opacity" initialValue={props.mapOpacity} externalValue={props.mapOpacity} setExternalValue={props.setMapOpacity} />
            </Form.Group>
        </>
    return <MoorhenBaseMenuItem
        popoverPlacement='left'
        popoverContent={panelContent}
        menuItemText={"Draw settings"}
        showOkButton={false}
        setPopoverIsShown={props.setPopoverIsShown}
        disabled={props.disabled}
    />

}
