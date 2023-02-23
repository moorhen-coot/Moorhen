import { useState } from "react";
import { MoorhenAddWatersMenuItem, MoorhenCentreOnLigandMenuItem, MoorhenFitLigandRightHereMenuItem, MoorhenGetMonomerMenuItem, MoorhenImportDictionaryMenuItem } from "./MoorhenMenuItem";
import { Collapse, List, ListItemButton, ListItemText, MenuItem } from "@mui/material";
import { ExpandLess, ExpandMore } from "@mui/icons-material";

export const MoorhenLigandMenu = (props) => {
    const [popoverIsShown, setPopoverIsShown] = useState(false)
    const menuItemProps = { setPopoverIsShown, ...props }

    return <>
        <ListItemButton
            id="ligand-nav-dropdown"
            onClick={() => { props.dropdownId !== props.currentDropdownId ? props.setCurrentDropdownId(props.dropdownId) : props.setCurrentDropdownId(-1) }}>
            <ListItemText primary="Ligand" />
            {props.dropdownId !== props.currentDropdownId ? <ExpandMore/> : <ExpandLess/>}
        </ListItemButton>
        <Collapse in={props.dropdownId === props.currentDropdownId} timeout="auto" unmountOnExit>
            <MoorhenGetMonomerMenuItem {...menuItemProps} />
            <MoorhenImportDictionaryMenuItem {...menuItemProps} />
            <MoorhenCentreOnLigandMenuItem {...menuItemProps} />
            <MoorhenAddWatersMenuItem {...menuItemProps} />
            <MoorhenFitLigandRightHereMenuItem {...menuItemProps} />
        </Collapse>
    </>
}



