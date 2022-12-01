import { NavDropdown, Form, Button, Modal, Table } from "react-bootstrap";
import { BabyGruMolecule } from "../utils/BabyGruMolecule";
import { BabyGruMap } from "../utils/BabyGruMap";
import { useEffect, useState } from "react";
import { doDownloadText, readTextFile } from "../utils/BabyGruUtils";
import { MenuItem } from "@mui/material";
import "rc-tree/assets/index.css"
import Tree from 'rc-tree';
import { BabyGruCopyFragmentUsingCidMenuItem, BabyGruDeleteUsingCidMenuItem, BabyGruMergeMoleculesMenuItem } from "./BabyGruMenuItem";

export const BabyGruEditMenu = (props) => {
    const [popoverIsShown, setPopoverIsShown] = useState(false)
    const menuItemProps = { setPopoverIsShown, ...props }

    return <>
        <NavDropdown
            title="Edit"
            id="basic-nav-dropdown-edit"
            autoClose={popoverIsShown ? false : 'outside'}
            show={props.currentDropdownId === props.dropdownId}
            onToggle={() => { props.dropdownId !== props.currentDropdownId ? props.setCurrentDropdownId(props.dropdownId) : props.setCurrentDropdownId(-1) }}>
            <BabyGruMergeMoleculesMenuItem key="merge" {...menuItemProps} />
            <BabyGruDeleteUsingCidMenuItem key="delete" {...menuItemProps} />
            <BabyGruCopyFragmentUsingCidMenuItem key="copy_fragment" {...menuItemProps} />
        </NavDropdown>
    </>
}