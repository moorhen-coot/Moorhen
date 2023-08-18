import { Form, InputGroup } from "react-bootstrap";
import { useState } from "react";
import { MoorhenClipFogMenuItem } from "../menu-item/MoorhenClipFogMenuItem";
import { MoorhenLightingMenuItem } from "../menu-item/MoorhenLightingMenuItem"
import { MoorhenBlurMenuItem } from "../menu-item/MoorhenBlurMenuItem"
import { MoorhenBackgroundColorMenuItem } from "../menu-item/MoorhenBackgroundColorMenuItem"
import { MoorhenNavBarExtendedControlsInterface } from "./MoorhenNavBar";
import { MoorhenScenePresetMenuItem } from "../menu-item/MoorhenScenePresetMenuItem"

export const MoorhenViewMenu = (props: MoorhenNavBarExtendedControlsInterface) => {
    const [popoverIsShown, setPopoverIsShown] = useState(false)
    const menuItemProps = {setPopoverIsShown, ...props}

    return <>
                <InputGroup style={{ padding:'0.5rem', width: '25rem'}}>
                    <Form.Check 
                        type="switch"
                        checked={props.drawFPS}
                        onChange={() => { props.setDrawFPS(!props.drawFPS) }}
                        label="Show frames per second counter"/>
                </InputGroup>
                <InputGroup style={{ padding:'0.5rem', width: '25rem'}}>
                    <Form.Check 
                        type="switch"
                        checked={props.drawCrosshairs}
                        onChange={() => { props.setDrawCrosshairs(!props.drawCrosshairs) }}
                        label="Show crosshairs"/>
                </InputGroup>
                <InputGroup style={{ padding:'0.5rem', width: '25rem'}}>
                    <Form.Check 
                        type="switch"
                        checked={props.drawAxes}
                        onChange={() => { props.setDrawAxes(!props.drawAxes) }}
                        label="Show axes"/>
                </InputGroup>
                <InputGroup style={{ padding:'0.5rem', width: '25rem'}}>
                    <Form.Check 
                        type="switch"
                        checked={props.drawMissingLoops}
                        onChange={() => { props.setDrawMissingLoops(!props.drawMissingLoops) }}
                        label="Show missing loops"/>
                </InputGroup>
                <InputGroup style={{ padding:'0.5rem', width: '25rem'}}>
                    <Form.Check 
                        type="switch"
                        checked={props.drawInteractions}
                        onChange={() => { props.setDrawInteractions(!props.drawInteractions) }}
                        label="Show Environment Distances"/>
                </InputGroup>
                <InputGroup style={{ padding:'0.5rem', width: '25rem'}}>
                    <Form.Check 
                        type="switch"
                        checked={props.doPerspectiveProjection}
                        onChange={() => { props.setDoPerspectiveProjection(!props.doPerspectiveProjection) }}
                        label="Perspective projection"/>
                </InputGroup>
                <hr></hr>
                <MoorhenScenePresetMenuItem {...menuItemProps} />
                <MoorhenBackgroundColorMenuItem {...menuItemProps} />
                <MoorhenClipFogMenuItem {...menuItemProps} />
                <MoorhenLightingMenuItem {...menuItemProps} />
                {props.glRef.current.isWebGL2 () && <MoorhenBlurMenuItem {...menuItemProps} />}
    </>
}
