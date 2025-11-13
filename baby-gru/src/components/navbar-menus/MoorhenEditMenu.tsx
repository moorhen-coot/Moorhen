import { useDispatch, useSelector } from "react-redux";
import { useState } from "react";
import { showModal } from "../../store/modalsSlice";
import { moorhen } from "../../types/moorhen";
import { modalKeys } from "../../utils/enums";
import { MoorhenMenuItem } from "../interface-base/MenuItem";
import { MoorhenAddRemoveHydrogenAtomsMenuItem } from "../menu-item/MoorhenAddRemoveHydrogenAtomsMenuItem";
import { MoorhenAddSimpleMenuItem } from "../menu-item/MoorhenAddSimpleMenuItem";
import { MoorhenChangeChainIdMenuItem } from "../menu-item/MoorhenChangeChainIdMenuItem";
import { MoorhenCopyFragmentUsingCidMenuItem } from "../menu-item/MoorhenCopyFragmentUsingCidMenuItem";
import { MoorhenCreateSelectionMenuItem } from "../menu-item/MoorhenCreateSelectionMenuItem";
import { MoorhenDeleteUsingCidMenuItem } from "../menu-item/MoorhenDeleteUsingCidMenuItem";
import { MoorhenGoToMenuItem } from "../menu-item/MoorhenGoToMenuItem";
import { MoorhenMergeMoleculesMenuItem } from "../menu-item/MoorhenMergeMoleculesMenuItem";
import { MoorhenMoveMoleculeHere } from "../menu-item/MoorhenMoveMoleculeHere";
import { MoorhenSetOccupancyMenuItem } from "../menu-item/MoorhenSetOccupancyMenuItem";
import { MoorhenSplitModelsMenuItem } from "../menu-item/MoorhenSplitModelsMenuItem";

export const MoorhenEditMenu = (props: { extraEditMenuItems?: React.ReactNode[] }) => {
    const [, setPopoverIsShown] = useState(false);

    const devMode = useSelector((state: moorhen.State) => state.generalStates.devMode);

    const dispatch = useDispatch();

    const menuItemProps = { setPopoverIsShown };

    return (
        <>
            <MoorhenAddSimpleMenuItem key="add_simple" {...menuItemProps} />
            <MoorhenAddRemoveHydrogenAtomsMenuItem key="add_remove_hydrogens" {...menuItemProps} />
            <MoorhenMergeMoleculesMenuItem key="merge" {...menuItemProps} />
            <MoorhenMoveMoleculeHere key="move" {...menuItemProps} />
            <MoorhenChangeChainIdMenuItem key="change_chain_id" {...menuItemProps} />
            <MoorhenSetOccupancyMenuItem key="set-occupancy" {...menuItemProps} />
            <MoorhenSplitModelsMenuItem key="split_models" {...menuItemProps} />
            <MoorhenDeleteUsingCidMenuItem key="delete" {...menuItemProps} />
            <MoorhenCreateSelectionMenuItem key="create-selection" {...menuItemProps} />
            <MoorhenCopyFragmentUsingCidMenuItem key="copy_fragment" {...menuItemProps} />
            <MoorhenGoToMenuItem key="go_to_cid" {...menuItemProps} />
            {devMode && (
                <MoorhenMenuItem
                    onClick={() => {
                        dispatch(showModal(modalKeys.ACEDRG));
                        document.body.click();
                    }}
                >
                    Create covalent link between two atoms...
                </MoorhenMenuItem>
            )}
            {props.extraEditMenuItems && props.extraEditMenuItems.map(menu => menu)}
        </>
    );
};
