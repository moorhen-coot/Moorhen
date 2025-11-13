import { useDispatch, useSelector } from "react-redux";
import { JSX, useState } from "react";
import { showModal } from "../../store/modalsSlice";
import { moorhen } from "../../types/moorhen";
import { modalKeys } from "../../utils/enums";
import { MoorhenMenuItem } from "../interface-base/MenuItem";
import { MoorhenAddWatersMenuItem } from "../menu-item/MoorhenAddWatersMenuItem";
import { MoorhenCalculateTrajectoryMenuItem } from "../menu-item/MoorhenCalculateTrajectoryMenuItem";
import { MoorhenClearSelfRestraintsMenuItem } from "../menu-item/MoorhenClearSelfRestraintsMenuItem";
import { MoorhenLoadScriptMenuItem } from "../menu-item/MoorhenLoadScriptMenuItem";
import { MoorhenMultiplyBfactorMenuItem } from "../menu-item/MoorhenMultiplyBfactorMenuItem";
import { MoorhenRandomJiggleBlurMenuItem } from "../menu-item/MoorhenRandomJiggleBlurMenuItem";
import { MoorhenSelfRestraintsMenuItem } from "../menu-item/MoorhenSelfRestraintsMenuItem";
//import { MoorhenStepRefinementMenuItem } from "../menu-item/MoorhenStepRefinementMenuItem"
import { MoorhenShiftFieldBFactorRefinement } from "../menu-item/MoorhenShiftFieldBFactorRefinement";

export type MenuItem = {
    label: string;
    content: React.JSX.Element;
};

export type MenuMap = {
    [key: number]: MenuItem;
};

export const MoorhenCalculateMenu = (props: { extraCalculateMenuItems?: React.ReactElement[] }) => {
    const [, setPopoverIsShown] = useState<boolean>(false);
    const dispatch = useDispatch();
    const menuItemProps = { setPopoverIsShown };
    const allowScripting = useSelector((state: moorhen.State) => state.generalStates.allowScripting);

    return (
        <>
            <MoorhenAddWatersMenuItem {...menuItemProps} />
            <MoorhenMenuItem
                onClick={() => {
                    dispatch(showModal(modalKeys.SUPERPOSE_MODELS));
                    document.body.click();
                }}
            >
                Superpose structures...
            </MoorhenMenuItem>
            {/* <MoorhenStepRefinementMenuItem key="step-refinement" {...menuItemProps}/>  this is causing huge memory leak*/}
            <MoorhenMultiplyBfactorMenuItem key="bfactor-multiply" {...menuItemProps} />
            <MoorhenShiftFieldBFactorRefinement key="bfactor-refinement" {...menuItemProps} />
            <MoorhenCalculateTrajectoryMenuItem key="calcualte-trajectory" {...menuItemProps} />
            <MoorhenSelfRestraintsMenuItem key="add-self-restraints" setPopoverIsShown={setPopoverIsShown} />
            <MoorhenClearSelfRestraintsMenuItem key="clear-self-restraints" setPopoverIsShown={setPopoverIsShown} />
            <MoorhenRandomJiggleBlurMenuItem setPopoverIsShown={setPopoverIsShown} />
            <MoorhenMenuItem
                onClick={() => {
                    dispatch(showModal(modalKeys.SLICE_N_DICE));
                    document.body.click();
                }}
            >
                Slice-n-Dice...
            </MoorhenMenuItem>
            {allowScripting && (
                <>
                    <MoorhenLoadScriptMenuItem {...menuItemProps} />
                    <MoorhenMenuItem
                        id="interactive-scripting-menu-item"
                        onClick={() => {
                            dispatch(showModal(modalKeys.SCRIPTING));
                            document.body.click();
                        }}
                    >
                        Interactive scripting...
                    </MoorhenMenuItem>
                </>
            )}
            {props.extraCalculateMenuItems && props.extraCalculateMenuItems.map(menu => menu)}
        </>
    );
};
