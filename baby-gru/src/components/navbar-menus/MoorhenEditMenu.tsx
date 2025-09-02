import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { MoorhenMenuItem } from "../menu-item/MenuItem";
import { MoorhenCopyFragmentUsingCidMenuItem } from "../menu-item/MoorhenCopyFragmentUsingCidMenuItem";
import { MoorhenDeleteUsingCidMenuItem } from "../menu-item/MoorhenDeleteUsingCidMenuItem";
import { MoorhenGoToMenuItem } from "../menu-item/MoorhenGoToMenuItem";
import { MoorhenMergeMoleculesMenuItem } from "../menu-item/MoorhenMergeMoleculesMenuItem";
import { MoorhenAddSimpleMenuItem } from "../menu-item/MoorhenAddSimpleMenuItem";
import { MoorhenAddRemoveHydrogenAtomsMenuItem } from "../menu-item/MoorhenAddRemoveHydrogenAtomsMenuItem";
import { MoorhenMoveMoleculeHere } from "../menu-item/MoorhenMoveMoleculeHere";
import { MoorhenChangeChainIdMenuItem } from "../menu-item/MoorhenChangeChainIdMenuItem";
import { MoorhenSetOccupancyMenuItem } from "../menu-item/MoorhenSetOccupancyMenuItem";
import { MoorhenCreateSelectionMenuItem } from "../menu-item/MoorhenCreateSelectionMenuItem";
import { MoorhenSplitModelsMenuItem } from "../menu-item/MoorhenSplitModelsMenuItem";
import { moorhen } from "../../types/moorhen";
import { showModal } from "../../store/modalsSlice";
import { modalKeys } from "../../utils/enums";

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
            {props.extraEditMenuItems && props.extraEditMenuItems.map((menu) => menu)}
        </>
    );
};
