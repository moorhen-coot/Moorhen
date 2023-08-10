import { useState } from "react";
import { MoorhenCopyFragmentUsingCidMenuItem } from "../menu-item/MoorhenCopyFragmentUsingCidMenuItem";
import { MoorhenDeleteUsingCidMenuItem } from "../menu-item/MoorhenDeleteUsingCidMenuItem"
import { MoorhenGoToMenuItem } from "../menu-item/MoorhenGoToMenuItem"
import { MoorhenMergeMoleculesMenuItem } from "../menu-item/MoorhenMergeMoleculesMenuItem"
import { MoorhenAddRemoveHydrogenAtomsMenuItem } from "../menu-item/MoorhenAddRemoveHydrogenAtomsMenuItem"
import { MenuItem } from "@mui/material";
import { MoorhenNavBarExtendedControlsInterface } from "./MoorhenNavBar";
import { MoorhenAddSimpleMenuItem } from "../menu-item/MoorhenAddSimpleMenuItem";

export const MoorhenEditMenu = (props: MoorhenNavBarExtendedControlsInterface) => {
    const [popoverIsShown, setPopoverIsShown] = useState(false)
    const menuItemProps = { setPopoverIsShown, ...props }

    return <>
            <MoorhenAddSimpleMenuItem key="add_simple" setPopoverIsShown={() => {}} {...menuItemProps} />
            <MoorhenAddRemoveHydrogenAtomsMenuItem key='add_remove_hydrogens' {...menuItemProps}/>
            <MoorhenMergeMoleculesMenuItem key="merge" {...menuItemProps} />
            <MoorhenDeleteUsingCidMenuItem key="delete" {...menuItemProps} />
            <MoorhenCopyFragmentUsingCidMenuItem key="copy_fragment" {...menuItemProps} />
            <MoorhenGoToMenuItem key="go_to_cid" {...menuItemProps} />
            {props.devMode &&
                <MenuItem onClick={() => {
                    props.setShowCreateAcedrgLinkModal(true)
                    document.body.click()
                }}>
                    Create covalent link between two atoms...
                </MenuItem>            
            }
            {props.extraEditMenuItems && props.extraEditMenuItems.map( menu => menu)}
    </>
}