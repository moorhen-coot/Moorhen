import { Form } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { MoorhenSlider } from "../inputs";
import { setContourWheelSensitivityFactor, setMouseSensitivity, setZoomWheelSensitivityFactor } from "../../store/mouseSettings";
import { moorhen } from "../../types/moorhen";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem";

export const MoorhenMouseSensitivitySettingsMenuItem = (props: { setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>> }) => {
    const mouseSensitivity = useSelector((state: moorhen.State) => state.mouseSettings.mouseSensitivity);
    const zoomWheelSensitivityFactor = useSelector((state: moorhen.State) => state.mouseSettings.zoomWheelSensitivityFactor);
    const contourWheelSensitivityFactor = useSelector((state: moorhen.State) => state.mouseSettings.contourWheelSensitivityFactor);

    const dispatch = useDispatch();

    const panelContent = (
        <>
            <Form.Group
                controlId="mouseSensitivitySlider"
                style={{ paddingTop: "0rem", paddingBottom: "0.5rem", paddingRight: "0.5rem", paddingLeft: "1rem", width: "25rem" }}
            >
                <MoorhenSlider
                    minVal={0.01}
                    maxVal={1.0}
                    logScale={false}
                    sliderTitle="Mouse sensitivity"
                    stepButtons={0.01}
                    externalValue={mouseSensitivity}
                    setExternalValue={(value) => dispatch(setMouseSensitivity(value))}
                    decimalPlaces={2}
                />
            </Form.Group>
            <Form.Group
                controlId="zoomWheelSensitivitySlider"
                style={{ paddingTop: "0.5rem", paddingBottom: "0rem", paddingRight: "0.5rem", paddingLeft: "1rem", width: "25rem" }}
            >
                <MoorhenSlider
                    minVal={0.1}
                    maxVal={9.9}
                    logScale={false}
                    sliderTitle="Mouse wheel zoom sensitivity"
                    stepButtons={0.1}
                    externalValue={zoomWheelSensitivityFactor}
                    setExternalValue={(value) => dispatch(setZoomWheelSensitivityFactor(value))}
                    decimalPlaces={2}
                />
            </Form.Group>
            <Form.Group
                controlId="mapWheelSensitivitySlider"
                style={{ paddingTop: "0.5rem", paddingBottom: "0rem", paddingRight: "0.5rem", paddingLeft: "1rem", width: "25rem" }}
            >
                <MoorhenSlider
                    minVal={0.1}
                    maxVal={10}
                    logScale={true}
                    sliderTitle="Mouse wheel map contour sensitivity"
                    externalValue={contourWheelSensitivityFactor}
                    setExternalValue={(value) => dispatch(setContourWheelSensitivityFactor(value))}
                    decimalPlaces={2}
                />
            </Form.Group>
        </>
    );

    return (
        <MoorhenBaseMenuItem
            id="mouse-sens-settings-menu-item"
            popoverContent={panelContent}
            menuItemText="Mouse sensitivity..."
            onCompleted={() => {}}
            showOkButton={false}
            setPopoverIsShown={props.setPopoverIsShown}
        />
    );
};
