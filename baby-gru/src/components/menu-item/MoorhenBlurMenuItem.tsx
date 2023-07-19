import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react"
import { Form, InputGroup, NavDropdown } from "react-bootstrap";
import MoorhenSlider from "../misc/MoorhenSlider"
import { MoorhenLightPosition } from "../webMG/MoorhenLightPosition"
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"
import { webGL } from "../../types/mgWebGL";

export const MoorhenBlurMenuItem = (props: {
    setPopoverIsShown: Dispatch<SetStateAction<boolean>> ;
    depthBlurDepth: number;
    depthBlurRadius: number;
    setDepthBlurDepth: React.Dispatch<React.SetStateAction<number>>;
    setDepthBlurRadius: React.Dispatch<React.SetStateAction<number>>;
    setUseOffScreenBuffers: React.Dispatch<React.SetStateAction<boolean>>;
    useOffScreenBuffers: boolean;
}) => {

    const panelContent = <div>
                    <InputGroup style={{ padding:'0.5rem', width: '25rem'}}>
                        <Form.Check 
                            type="switch"
                            checked={props.useOffScreenBuffers}
                            onChange={() => { props.setUseOffScreenBuffers(!props.useOffScreenBuffers) }}
                            label="Do Depth Blur"/>
                    </InputGroup>
                    <MoorhenSlider minVal={0.0} maxVal={1.0} logScale={false} sliderTitle="Blur depth" initialValue={props.depthBlurDepth} externalValue={props.depthBlurDepth} setExternalValue={props.setDepthBlurDepth}/>
                    <MoorhenSlider minVal={2} maxVal={16} logScale={false} sliderTitle="Blur radius" initialValue={props.depthBlurRadius} externalValue={props.depthBlurRadius} allowFloats={false} setExternalValue={props.setDepthBlurRadius}/>
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

