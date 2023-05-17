import { NavDropdown } from "react-bootstrap";
import { useState } from "react";
import { MoorhenCopyFragmentUsingCidMenuItem, MoorhenDeleteUsingCidMenuItem, MoorhenMergeMoleculesMenuItem, 
    MoorhenGoToMenuItem, MoorhenAddRemoveHydrogenAtomsMenuItem, MoorhenSuperposeMenuItem} from "../menu-item/MoorhenMenuItem";
import { MoorhenCreateAcedrgLinkModal } from "../modal/MoorhenCreateAcedrgLinkModal"
import { MenuItem } from "@mui/material";

export const MoorhenEditMenu = (props) => {
    const [popoverIsShown, setPopoverIsShown] = useState(false)
    const [showCreateAcedrgLinkModal, setShowCreateAcedrgLinkModal] = useState(false)
    const menuItemProps = { setPopoverIsShown, ...props }

    return <>
        <NavDropdown
            title="Edit"
            id="edit-nav-dropdown"
            style={{display:'flex', alignItems:'center'}}
            autoClose={popoverIsShown ? false : 'outside'}
            show={props.currentDropdownId === props.dropdownId}
            onToggle={() => { props.dropdownId !== props.currentDropdownId ? props.setCurrentDropdownId(props.dropdownId) : props.setCurrentDropdownId(-1) }}>
            <MoorhenAddRemoveHydrogenAtomsMenuItem key='add_remove_hydrogens' {...menuItemProps}/>
            <MoorhenMergeMoleculesMenuItem key="merge" {...menuItemProps} />
            <MoorhenDeleteUsingCidMenuItem key="delete" {...menuItemProps} />
            <MoorhenCopyFragmentUsingCidMenuItem key="copy_fragment" {...menuItemProps} />
            <MoorhenGoToMenuItem key="go_to_cid" {...menuItemProps} />
            {props.aceDRGInstance && 
                <MenuItem onClick={() => setShowCreateAcedrgLinkModal(true)}>
                    Create covalent link between two atoms...
                </MenuItem>            
            }
            {props.extraEditMenuItems && props.extraEditMenuItems.map( menu => menu)}
        </NavDropdown>
        <MoorhenCreateAcedrgLinkModal {...menuItemProps} showCreateAcedrgLinkModal={showCreateAcedrgLinkModal} setShowCreateAcedrgLinkModal={setShowCreateAcedrgLinkModal}/>
    </>
}