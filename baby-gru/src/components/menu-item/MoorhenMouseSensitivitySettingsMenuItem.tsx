import { Form } from "react-bootstrap"
import { MoorhenSlider } from "../misc/MoorhenSlider"
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"
import { setContourWheelSensitivityFactor, setMouseSensitivity, setZoomWheelSensitivityFactor } from "../../store/mouseSettings";
import { useDispatch, useSelector } from "react-redux";
import { moorhen } from "../../types/moorhen";

export const MoorhenMouseSensitivitySettingsMenuItem = (props: { setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>; }) => {

    const mouseSensitivity = useSelector((state: moorhen.State) => state.mouseSettings.mouseSensitivity)
    const zoomWheelSensitivityFactor = useSelector((state: moorhen.State) => state.mouseSettings.zoomWheelSensitivityFactor)
    const contourWheelSensitivityFactor = useSelector((state: moorhen.State) => state.mouseSettings.contourWheelSensitivityFactor)

    const dispatch = useDispatch()

    const panelContent = <>
        <Form.Group controlId="mouseSensitivitySlider" style={{paddingTop:'0rem', paddingBottom:'0.5rem', paddingRight:'0.5rem', paddingLeft:'1rem', width: '25rem'}}>
            <MoorhenSlider minVal={0.01} maxVal={1.0} logScale={false} sliderTitle="Mouse sensitivity" initialValue={mouseSensitivity} externalValue={mouseSensitivity} setExternalValue={(val: number) => dispatch(setMouseSensitivity(val))}/>
        </Form.Group>
        <Form.Group controlId="zoomWheelSensitivitySlider" style={{paddingTop:'0.5rem', paddingBottom:'0rem', paddingRight:'0.5rem', paddingLeft:'1rem', width: '25rem'}}>
            <MoorhenSlider minVal={0.1} maxVal={9.9} logScale={false} sliderTitle="Mouse wheel zoom sensitivity" initialValue={zoomWheelSensitivityFactor} externalValue={zoomWheelSensitivityFactor} setExternalValue={(val: number) => dispatch(setZoomWheelSensitivityFactor(val))}/>
        </Form.Group>
        <Form.Group controlId="mapWheelSensitivitySlider" style={{paddingTop:'0.5rem', paddingBottom:'0rem', paddingRight:'0.5rem', paddingLeft:'1rem', width: '25rem'}}>
            <MoorhenSlider minVal={0.1} maxVal={10} logScale={true} sliderTitle="Mouse wheel map contour sensitivity" initialValue={contourWheelSensitivityFactor} externalValue={contourWheelSensitivityFactor} setExternalValue={(val: number) => dispatch(setContourWheelSensitivityFactor(val))}/>
        </Form.Group>
    </>
    
    return  <MoorhenBaseMenuItem
            id='mouse-sens-settings-menu-item'
            popoverContent={panelContent}
            menuItemText="Mouse sensitivity..."
            onCompleted={() => {}}
            showOkButton={false}
            setPopoverIsShown={props.setPopoverIsShown}/>
}