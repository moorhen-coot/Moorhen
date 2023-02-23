import { useState } from "react";
import { MoorhenBackgroundColorMenuItem, MoorhenClipFogMenuItem } from "./MoorhenMenuItem";
import { Collapse, ListItemButton, ListItemText, MenuItem } from "@mui/material";
import { ExpandLess, ExpandMore } from "@mui/icons-material";

export const MoorhenViewMenu = (props) => {
    const [popoverIsShown, setPopoverIsShown] = useState(false)
    const menuItemProps = {setPopoverIsShown, ...props}

    return <>
            <ListItemButton 
                id="view-nav-dropdown" 
                onClick={() => {props.dropdownId !== props.currentDropdownId ? props.setCurrentDropdownId(props.dropdownId) : props.setCurrentDropdownId(-1)}}>
                <ListItemText primary="View" />
                {props.dropdownId !== props.currentDropdownId ? <ExpandMore/> : <ExpandLess/>}
            </ListItemButton>
            <Collapse in={props.dropdownId === props.currentDropdownId} timeout="auto" unmountOnExit>
                <MoorhenBackgroundColorMenuItem {...menuItemProps} />
                <hr></hr>
                <MoorhenClipFogMenuItem {...menuItemProps} />
                <MenuItem onClick={() => {
                    props.setShowColourRulesToast(true)
                    document.body.click()
                }}>
                    Set molecule colour rules
                </MenuItem>
            </Collapse>
        </>
    }

