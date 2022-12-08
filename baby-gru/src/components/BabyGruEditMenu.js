import { NavDropdown } from "react-bootstrap";
import { useState } from "react";
import "rc-tree/assets/index.css"
import { BabyGruCopyFragmentUsingCidMenuItem, BabyGruDeleteUsingCidMenuItem, BabyGruMergeMoleculesMenuItem, BabyGruGoToMenuItem } from "./BabyGruMenuItem";

export const BabyGruEditMenu = (props) => {
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
            <BabyGruMergeMoleculesMenuItem key="merge" {...menuItemProps} />
            <BabyGruDeleteUsingCidMenuItem key="delete" {...menuItemProps} />
            <BabyGruCopyFragmentUsingCidMenuItem key="copy_fragment" {...menuItemProps} />
            <BabyGruGoToMenuItem key="go_to_cid" {...menuItemProps} />
        </NavDropdown>
    </>
}