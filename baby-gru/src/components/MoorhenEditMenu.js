import { NavDropdown } from "react-bootstrap";
import { useState } from "react";
import "rc-tree/assets/index.css"
import { MoorhenCopyFragmentUsingCidMenuItem, MoorhenDeleteUsingCidMenuItem, MoorhenMergeMoleculesMenuItem, MoorhenGoToMenuItem, MoorhenAddRemoveHydrogenAtomsMenuItem } from "./MoorhenMenuItem";

export const MoorhenEditMenu = (props) => {
    const [popoverIsShown, setPopoverIsShown] = useState(false)
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
        </NavDropdown>
    </>
}