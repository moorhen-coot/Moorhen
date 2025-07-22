import { Form } from "react-bootstrap"
import { useDispatch } from "react-redux";
import { MoorhenSlider } from "../inputs/MoorhenSlider";
import { moorhen } from "../../types/moorhen";
import { setMapAlpha, setMapStyle } from "../../store/mapContourSettingsSlice";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"

export const MoorhenMapSettingsMenuItem = (props: {
    map: moorhen.Map;
    mapStyle: "solid" | "lit-lines" | "lines";
    mapOpacity: number;
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
    disabled: boolean;
}) => {

    const dispatch = useDispatch()

    const panelContent =
        <>
            {props.mapStyle !== "lit-lines" && 
            <Form.Check
                type="switch"
                checked={props.mapStyle === "solid"}
                onChange={() => { dispatch( setMapStyle({ molNo: props.map.molNo, style: props.mapStyle === "solid" ? "lines" : "solid" }) ) }}
                label="Draw as a surface" />
            }
            {props.mapStyle !== "solid" &&
                <Form.Check
                    type="switch"
                    checked={props.mapStyle === "lit-lines"}
                    onChange={() => { dispatch( setMapStyle({ molNo: props.map.molNo, style: props.mapStyle === "lit-lines" ? "lines" : "lit-lines" }) ) }}
                    label="Activate lit lines" />
            }
            <Form.Group style={{ width: '100%', margin: '0.1rem' }} controlId="MoorhenMapOpacitySlider">
                <MoorhenSlider
                    minVal={0.0}
                    maxVal={1.0}
                    decimalPlaces={2}
                    logScale={false}
                    sliderTitle="Opacity"
                    externalValue={props.mapOpacity}
                    setExternalValue={(newVal: number) => dispatch( setMapAlpha({molNo: props.map.molNo, alpha: newVal}) )} />
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
