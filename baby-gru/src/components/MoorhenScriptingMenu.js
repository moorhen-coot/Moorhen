import { NavDropdown } from "react-bootstrap";
import { MenuItem } from '@mui/material';
import { useEffect, useState } from "react";
import { MoorhenLoadScriptMenuItem } from "./MoorhenMenuItem";
import { MoorhenScriptModal } from "./MoorhenScriptModal";

export const MoorhenScriptingMenu = (props) => {
    const [popoverIsShown, setPopoverIsShown] = useState(false)
    const menuItemProps = { setPopoverIsShown, ...props }
    const [showCodeEditor, setShowCodeEditor] = useState(false)

    return < NavDropdown
        title="Scripting"
        id="cryo-scripting-dropdown"
        style={{ display: 'flex', alignItems: 'center' }}
        autoClose={popoverIsShown ? false : 'outside'}
        show={props.currentDropdownId === props.dropdownId}
        onToggle={() => { props.dropdownId !== props.currentDropdownId ? props.setCurrentDropdownId(props.dropdownId) : props.setCurrentDropdownId(-1) }}>
        <MoorhenLoadScriptMenuItem {...menuItemProps} />
        <MenuItem onClick={() => { setShowCodeEditor(true) }}>Interactive</MenuItem>
        <MoorhenScriptModal show={showCodeEditor} setShow={setShowCodeEditor} {...menuItemProps} />
    </NavDropdown>
}
