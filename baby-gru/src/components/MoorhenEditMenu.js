import { useState } from "react";
import "rc-tree/assets/index.css"
import { MoorhenCopyFragmentUsingCidMenuItem, MoorhenDeleteUsingCidMenuItem, MoorhenMergeMoleculesMenuItem, 
    MoorhenGoToMenuItem, MoorhenAddRemoveHydrogenAtomsMenuItem, MoorhenSuperposeMenuItem} from "./MoorhenMenuItem";
import { Collapse, ListItemButton, ListItemText } from "@mui/material";
import { ExpandLess, ExpandMore } from "@mui/icons-material";

export const MoorhenEditMenu = (props) => {
    const [popoverIsShown, setPopoverIsShown] = useState(false)
    const menuItemProps = { setPopoverIsShown, ...props }

    return <>
        <ListItemButton
            id="edit-nav-dropdown"
            autoClose={popoverIsShown ? false : 'outside'}
            show={props.currentDropdownId === props.dropdownId}
            style={{display:'flex', alignItems:'center'}}
            onClick={() => { props.dropdownId !== props.currentDropdownId ? props.setCurrentDropdownId(props.dropdownId) : props.setCurrentDropdownId(-1) }}>
            <ListItemText primary="Edit" />
            {props.dropdownId !== props.currentDropdownId ? <ExpandMore/> : <ExpandLess/>}
        </ListItemButton>
        <Collapse in={props.dropdownId === props.currentDropdownId} timeout="auto" unmountOnExit>
            <MoorhenAddRemoveHydrogenAtomsMenuItem key='add_remove_hydrogens' {...menuItemProps}/>
            <MoorhenMergeMoleculesMenuItem key="merge" {...menuItemProps} />
            <MoorhenDeleteUsingCidMenuItem key="delete" {...menuItemProps} />
            <MoorhenSuperposeMenuItem key="superpose_structures" {...menuItemProps} />
            <MoorhenCopyFragmentUsingCidMenuItem key="copy_fragment" {...menuItemProps} />
            <MoorhenGoToMenuItem key="go_to_cid" {...menuItemProps} />
        </Collapse>
    </>
}