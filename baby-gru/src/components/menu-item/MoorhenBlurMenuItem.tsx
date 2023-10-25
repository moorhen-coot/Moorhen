import { Form, InputGroup } from "react-bootstrap";
import { MoorhenSlider } from "../misc/MoorhenSlider"
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"
import { moorhen } from "../../types/moorhen";
import { useSelector, useDispatch } from "react-redux";
import { setDepthBlurDepth, setDepthBlurRadius, setUseOffScreenBuffers } from "../../store/sceneSettingsSlice";

export const MoorhenBlurMenuItem = (props: {
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>> ;
}) => {

    const dispatch = useDispatch()
    const useOffScreenBuffers = useSelector((state: moorhen.State) => state.sceneSettings.useOffScreenBuffers)
    const depthBlurDepth = useSelector((state: moorhen.State) => state.sceneSettings.depthBlurDepth)
    const depthBlurRadius = useSelector((state: moorhen.State) => state.sceneSettings.depthBlurRadius)
    
    const panelContent = <div>
                    <InputGroup className='moorhen-input-group-check'>
                        <Form.Check 
                            type="switch"
                            checked={useOffScreenBuffers}
                            onChange={() => { dispatch(
                                setUseOffScreenBuffers(!useOffScreenBuffers)
                            )}}
                            label="Do Depth Blur"/>
                    </InputGroup>
                    <MoorhenSlider minVal={0.0} maxVal={1.0} logScale={false} sliderTitle="Blur depth" initialValue={depthBlurDepth} externalValue={depthBlurDepth} setExternalValue={(val: number) => dispatch(setDepthBlurDepth(val))}/>
                    <MoorhenSlider minVal={2} maxVal={16} logScale={false} sliderTitle="Blur radius" initialValue={depthBlurRadius} externalValue={depthBlurRadius} allowFloats={false} setExternalValue={(val: number) => dispatch(setDepthBlurRadius(val))}/>
    </div>

    return <MoorhenBaseMenuItem
        id='lighting-menu-item'
        showOkButton={false}
        popoverContent={panelContent}
        menuItemText="Depth blur..."
        onCompleted={() => { }}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}

