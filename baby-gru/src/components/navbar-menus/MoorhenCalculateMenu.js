import { NavDropdown } from "react-bootstrap";
import { useState } from "react";
import { MoorhenSuperposeMenuItem, MoorhenLoadScriptMenuItem } from "../menu-item/MoorhenMenuItem";
import { MoorhenScriptModal } from "../modal/MoorhenScriptModal";
import { MenuItem } from "@mui/material";

export const MoorhenCalculateMenu = (props) => {
    const [popoverIsShown, setPopoverIsShown] = useState(false)
    const menuItemProps = { setPopoverIsShown, ...props }
    const [showCodeEditor, setShowCodeEditor] = useState(false)

    return <>
        <NavDropdown
            title="Calculate"
            id="calculate-nav-dropdown"
            style={{display:'flex', alignItems:'center'}}
            autoClose={popoverIsShown ? false : 'outside'}
            show={props.currentDropdownId === props.dropdownId}
            onToggle={() => { props.dropdownId !== props.currentDropdownId ? props.setCurrentDropdownId(props.dropdownId) : props.setCurrentDropdownId(-1) }}>
            <MoorhenSuperposeMenuItem key="superpose_structures" {...menuItemProps} />
            {props.allowScripting && 
            <>
                <MoorhenLoadScriptMenuItem {...menuItemProps} />
                <MenuItem id="interactive-scripting-menu-item" onClick={() => { setShowCodeEditor(true) }}>Interactive scripting...</MenuItem>
            </>
            }
            {props.extraCalculateMenuItems && props.extraCalculateMenuItems.map( menu => menu)}
        </NavDropdown>
        <MoorhenScriptModal show={showCodeEditor} setShow={setShowCodeEditor} {...menuItemProps} />            
    </>
}



