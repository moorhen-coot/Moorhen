import { MoorhenSearchBar } from './MoorhenSearchBar';
import { MoorhenAboutMenuItem } from "./MoorhenMenuItem";
import { Collapse, ListItemButton, ListItemText, MenuItem } from "@mui/material";
import { ExpandLess, ExpandMore } from "@mui/icons-material";

export const MoorhenHelpMenu = (props) => {

    return <>
        <ListItemButton 
            id="help-nav-dropdown" 
            onClick={() => {props.dropdownId !== props.currentDropdownId ? props.setCurrentDropdownId(props.dropdownId) : props.setCurrentDropdownId(-1)}}>
            <ListItemText primary="Help" />
            {props.dropdownId !== props.currentDropdownId ? <ExpandMore/> : <ExpandLess/>}
        </ListItemButton>
        <Collapse in={props.dropdownId === props.currentDropdownId} timeout="auto" unmountOnExit>
            <hr></hr>
            <MoorhenSearchBar {...props}/>
            <MoorhenAboutMenuItem {...props} />
            <MenuItem>
                More items will be added here...
            </MenuItem>
            <hr></hr>
        </Collapse>
    </>
}

