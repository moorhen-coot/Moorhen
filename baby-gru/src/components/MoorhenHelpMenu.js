import { NavDropdown } from "react-bootstrap";
import { useState } from "react";
import { MoorhenSearchBar } from './MoorhenSearchBar';
import { MenuItem } from "@mui/material";
import { MoorhenAboutMenuItem } from "./MoorhenMenuItem";


export const MoorhenHelpMenu = (props) => {
    const [popoverIsShown, setPopoverIsShown] = useState(false)
    const menuItemProps = {setPopoverIsShown, ...props}

    return <>
            < NavDropdown 
                title="Help" 
                id="help-nav-dropdown" 
                style={{display:'flex', alignItems:'center'}}
                autoClose={popoverIsShown ? false : 'outside'}
                show={props.currentDropdownId === props.dropdownId}
                onToggle={() => {props.dropdownId !== props.currentDropdownId ? props.setCurrentDropdownId(props.dropdownId) : props.setCurrentDropdownId(-1)}}>
                    <MoorhenSearchBar {...props}/>
                    <hr></hr>
                    <MoorhenAboutMenuItem {...menuItemProps} />
                    <MenuItem>
                        More items will be added here...
                    </MenuItem>
            </NavDropdown >
        </>
    }
