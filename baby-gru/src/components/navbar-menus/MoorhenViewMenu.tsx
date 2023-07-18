import { Form, InputGroup } from "react-bootstrap";
import { useState } from "react";
import { MenuItem } from "@mui/material";
import { MoorhenClipFogMenuItem } from "../menu-item/MoorhenClipFogMenuItem";
import { MoorhenLightingMenuItem } from "../menu-item/MoorhenLightingMenuItem"
import { MoorhenBackgroundColorMenuItem } from "../menu-item/MoorhenBackgroundColorMenuItem"
import { MoorhenNavBarExtendedControlsInterface } from "./MoorhenNavBar";

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
                    <InputGroup style={{ padding:'0.5rem', width: '25rem'}}>
                        <Form.Check 
                            type="switch"
                            checked={props.useOffScreenBuffers}
                            onChange={() => { props.setUseOffScreenBuffers(!props.useOffScreenBuffers) }}
                            label="Use off-screen buffers"/>
                    </InputGroup>
                    <hr></hr>
                    <MoorhenBackgroundColorMenuItem {...menuItemProps} />
                    <MoorhenClipFogMenuItem {...menuItemProps} />
                    <MoorhenLightingMenuItem {...menuItemProps} />
                    <MenuItem id="change-molecule-colours-menu-item" onClick={() => {
                        props.setShowColourRulesToast(true)
                        document.body.click()
                    }}>
                        Set molecule colour rules...
                    </MenuItem>
        </>
    }
