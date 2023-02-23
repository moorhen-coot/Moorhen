import { useState } from "react";
import { MoorhenSearchBar } from './MoorhenSearchBar';
import { MoorhenAboutMenuItem } from "./MoorhenMenuItem";
import { Collapse, ListItemButton, ListItemText, MenuItem } from "@mui/material";
import { ExpandLess, ExpandMore } from "@mui/icons-material";

export const MoorhenHelpMenu = (props) => {
    const [popoverIsShown, setPopoverIsShown] = useState(false)
    const menuItemProps = {setPopoverIsShown, ...props}

    return <>
        <ListItemButton 
            id="help-nav-dropdown" 
            onClick={() => {props.dropdownId !== props.currentDropdownId ? props.setCurrentDropdownId(props.dropdownId) : props.setCurrentDropdownId(-1)}}>
            <ListItemText primary="Help" />
            {props.dropdownId !== props.currentDropdownId ? <ExpandMore/> : <ExpandLess/>}
        </ListItemButton>
        <Collapse in={props.dropdownId === props.currentDropdownId} timeout="auto" unmountOnExit>
            <MoorhenSearchBar {...props}/>
            <hr></hr>
            <MoorhenAboutMenuItem {...menuItemProps} />
            <MenuItem>
                More items will be added here...
            </MenuItem>
        </Collapse>
    </>
}

