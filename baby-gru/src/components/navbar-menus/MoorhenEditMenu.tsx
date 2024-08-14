import { useState } from "react";
import { MenuItem } from "@mui/material";
import { MoorhenCopyFragmentUsingCidMenuItem } from "../menu-item/MoorhenCopyFragmentUsingCidMenuItem";
import { MoorhenDeleteUsingCidMenuItem } from "../menu-item/MoorhenDeleteUsingCidMenuItem"
import { MoorhenGoToMenuItem } from "../menu-item/MoorhenGoToMenuItem"
import { MoorhenMergeMoleculesMenuItem } from "../menu-item/MoorhenMergeMoleculesMenuItem"
import { MoorhenAddSimpleMenuItem } from "../menu-item/MoorhenAddSimpleMenuItem";
import { MoorhenAddRemoveHydrogenAtomsMenuItem } from "../menu-item/MoorhenAddRemoveHydrogenAtomsMenuItem"
import { MoorhenMoveMoleculeHere } from "../menu-item/MoorhenMoveMoleculeHere"
import { MoorhenChangeChainIdMenuItem } from "../menu-item/MoorhenChangeChainIdMenuItem"
import { MoorhenCreateSelectionMenuItem } from "../menu-item/MoorhenCreateSelectionMenuItem"
import { MoorhenSplitModelsMenuItem } from "../menu-item/MoorhenSplitModelsMenuItem"
import { MoorhenNavBarExtendedControlsInterface } from "./MoorhenNavBar";
import { moorhen } from "../../types/moorhen";
import { useDispatch, useSelector } from "react-redux";
import { showModal } from "../../store/modalsSlice";
import { modalKeys } from "../../utils/enums";
import { convertViewtoPx } from "../../utils/utils";

export const MoorhenEditMenu = (props: MoorhenNavBarExtendedControlsInterface) => {
    
    const [popoverIsShown, setPopoverIsShown] = useState(false)
    
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)
    const devMode = useSelector((state: moorhen.State) => state.generalStates.devMode)
    
    const dispatch = useDispatch()

    const menuItemProps = { setPopoverIsShown, ...props }
    
    return <div style={{maxHeight: convertViewtoPx(65, height), overflow: 'auto'}}>
            <MoorhenAddSimpleMenuItem key="add_simple" setPopoverIsShown={() => {}} {...menuItemProps} />
            <MoorhenAddRemoveHydrogenAtomsMenuItem key='add_remove_hydrogens' {...menuItemProps}/>
            <MoorhenMergeMoleculesMenuItem key="merge" {...menuItemProps} />
            <MoorhenMoveMoleculeHere key="move" {...menuItemProps}/>
            <MoorhenChangeChainIdMenuItem key="change_chain_id" {...menuItemProps}/>
            <MoorhenSplitModelsMenuItem key="split_models" {...menuItemProps}/>
            <MoorhenDeleteUsingCidMenuItem key="delete" {...menuItemProps} />
            <MoorhenCreateSelectionMenuItem key="create-selection" {...menuItemProps} />
            <MoorhenCopyFragmentUsingCidMenuItem key="copy_fragment" {...menuItemProps} />
            <MoorhenGoToMenuItem key="go_to_cid" {...menuItemProps} />
            {devMode &&
                <MenuItem onClick={() => {
                    dispatch(showModal(modalKeys.ACEDRG))
                    document.body.click()
                }}>
                    Create covalent link between two atoms...
                </MenuItem>            
            }
            {props.extraEditMenuItems && props.extraEditMenuItems.map( menu => menu)}
    </div>
}