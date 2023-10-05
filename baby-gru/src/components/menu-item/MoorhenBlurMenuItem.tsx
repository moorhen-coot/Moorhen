import { Dispatch, SetStateAction, useContext } from "react"
import { Form, InputGroup } from "react-bootstrap";
import { MoorhenSlider } from "../misc/MoorhenSlider"
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"
import { MoorhenContext } from "../../utils/MoorhenContext";
import { moorhen } from "../../types/moorhen";

export const MoorhenBlurMenuItem = (props: {
    setPopoverIsShown: Dispatch<SetStateAction<boolean>> ;
}) => {

    const context = useContext<undefined | moorhen.Context>(MoorhenContext);
    
    const { useOffScreenBuffers, setUseOffScreenBuffers, depthBlurDepth, setDepthBlurDepth, depthBlurRadius, setDepthBlurRadius } = context

    const panelContent = <div>
                    <InputGroup className='moorhen-input-group-check'>
                        <Form.Check 
                            type="switch"
                            checked={useOffScreenBuffers}
                            onChange={() => { setUseOffScreenBuffers(!useOffScreenBuffers) }}
                            label="Do Depth Blur"/>
                    </InputGroup>
                    <MoorhenSlider minVal={0.0} maxVal={1.0} logScale={false} sliderTitle="Blur depth" initialValue={depthBlurDepth} externalValue={depthBlurDepth} setExternalValue={setDepthBlurDepth}/>
                    <MoorhenSlider minVal={2} maxVal={16} logScale={false} sliderTitle="Blur radius" initialValue={depthBlurRadius} externalValue={depthBlurRadius} allowFloats={false} setExternalValue={setDepthBlurRadius}/>
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

