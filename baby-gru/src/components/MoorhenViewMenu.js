import { Form, InputGroup, NavDropdown } from "react-bootstrap";
import { useState } from "react";
import { MenuItem } from "@mui/material";
import { MoorhenBackgroundColorMenuItem, MoorhenClipFogMenuItem } from "./MoorhenMenuItem";

export const MoorhenViewMenu = (props) => {
    const [popoverIsShown, setPopoverIsShown] = useState(false)
    const menuItemProps = {setPopoverIsShown, ...props}

    return <>
            < NavDropdown 
                    title="View" 
                    id="view-nav-dropdown" 
                    style={{display:'flex', alignItems:'center'}}
                    autoClose={popoverIsShown ? false : 'outside'}
                    show={props.currentDropdownId === props.dropdownId}
                    onToggle={() => {props.dropdownId !== props.currentDropdownId ? props.setCurrentDropdownId(props.dropdownId) : props.setCurrentDropdownId(-1)}}>
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
                            checked={props.drawMissingLoops}
                            onChange={() => { props.setDrawMissingLoops(!props.drawMissingLoops) }}
                            label="Show missing loops"/>
                    </InputGroup>
                    {/*
                    <InputGroup style={{ padding:'0.5rem', width: '25rem'}}>
                        <Form.Check 
                            type="switch"
                            checked={props.drawInteractions}
                            onChange={() => { props.setDrawInteractions(!props.drawInteractions) }}
                            label="Show H-Bonds"/>
                    </InputGroup>
                    */}
                    <hr></hr>
                    <MoorhenBackgroundColorMenuItem {...menuItemProps} />
                    <MoorhenClipFogMenuItem {...menuItemProps} />
                    <MenuItem onClick={() => {
                        props.setShowColourRulesToast(true)
                        document.body.click()
                    }}>
                        Set molecule colour rules
                    </MenuItem>
            </NavDropdown>
        </>
    }
