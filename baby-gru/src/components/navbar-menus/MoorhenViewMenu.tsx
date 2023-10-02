import { Form, InputGroup } from "react-bootstrap";
import { useContext, useState } from "react";
import { MoorhenClipFogMenuItem } from "../menu-item/MoorhenClipFogMenuItem";
import { MoorhenLightingMenuItem } from "../menu-item/MoorhenLightingMenuItem"
import { MoorhenBlurMenuItem } from "../menu-item/MoorhenBlurMenuItem"
import { MoorhenBackgroundColorMenuItem } from "../menu-item/MoorhenBackgroundColorMenuItem"
import { MoorhenNavBarExtendedControlsInterface } from "./MoorhenNavBar";
import { MoorhenScenePresetMenuItem } from "../menu-item/MoorhenScenePresetMenuItem"
import { MoorhenContext } from "../../utils/MoorhenContext";
import { moorhen } from "../../types/moorhen";

export const MoorhenViewMenu = (props: MoorhenNavBarExtendedControlsInterface) => {
    const context = useContext<undefined | moorhen.Context>(MoorhenContext);
    const [popoverIsShown, setPopoverIsShown] = useState(false)
    const menuItemProps = {setPopoverIsShown, ...props}

    return <>
                <InputGroup className='moorhen-input-group-check'>
                    <Form.Check 
                        type="switch"
                        checked={context.drawFPS}
                        onChange={() => { context.setDrawFPS(!context.drawFPS) }}
                        label="Show frames per second counter"/>
                </InputGroup>
                <InputGroup className='moorhen-input-group-check'>
                    <Form.Check 
                        type="switch"
                        checked={props.enableAtomHovering}
                        onChange={() => { 
                            props.setEnableAtomHovering(!props.enableAtomHovering)
                            props.setHoveredAtom({molecule: null, cid: null})
                         }}
                        label="Enable atom hovering"/>
                </InputGroup>
                <InputGroup className='moorhen-input-group-check'>
                    <Form.Check 
                        type="switch"
                        checked={context.drawCrosshairs}
                        onChange={() => { context.setDrawCrosshairs(!context.drawCrosshairs) }}
                        label="Show crosshairs"/>
                </InputGroup>
                <InputGroup className='moorhen-input-group-check'>
                    <Form.Check 
                        type="switch"
                        checked={context.drawAxes}
                        onChange={() => { context.setDrawAxes(!context.drawAxes) }}
                        label="Show axes"/>
                </InputGroup>
                <InputGroup className='moorhen-input-group-check'>
                    <Form.Check 
                        type="switch"
                        checked={context.drawMissingLoops}
                        onChange={() => { context.setDrawMissingLoops(!context.drawMissingLoops) }}
                        label="Show missing loops"/>
                </InputGroup>
                <InputGroup className='moorhen-input-group-check'>
                    <Form.Check 
                        type="switch"
                        checked={context.drawInteractions}
                        onChange={() => { context.setDrawInteractions(!context.drawInteractions) }}
                        label="Show Environment Distances"/>
                </InputGroup>
                <InputGroup className='moorhen-input-group-check'>
                    <Form.Check 
                        type="switch"
                        checked={context.doPerspectiveProjection}
                        onChange={() => { context.setDoPerspectiveProjection(!context.doPerspectiveProjection) }}
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
