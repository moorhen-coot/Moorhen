import { useState } from "react";
import { MenuItem } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { MoorhenLoadScriptMenuItem } from "../menu-item/MoorhenLoadScriptMenuItem";
import { MoorhenSelfRestraintsMenuItem } from "../menu-item/MoorhenSelfRestraintsMenuItem";
import { MoorhenClearSelfRestraintsMenuItem } from "../menu-item/MoorhenClearSelfRestraintsMenuItem";
import { MoorhenRandomJiggleBlurMenuItem } from "../menu-item/MoorhenRandomJiggleBlurMenuItem";
import { MoorhenAddWatersMenuItem } from "../menu-item/MoorhenAddWatersMenuItem"
//import { MoorhenStepRefinementMenuItem } from "../menu-item/MoorhenStepRefinementMenuItem"
import { MoorhenShiftFieldBFactorRefinement } from "../menu-item/MoorhenShiftFieldBFactorRefinement"
import { MoorhenMultiplyBfactorMenuItem } from "../menu-item/MoorhenMultiplyBfactorMenuItem"
import { MoorhenCalculateTrajectoryMenuItem } from "../menu-item/MoorhenCalculateTrajectoryMenuItem"
import { showModal } from "../../store/modalsSlice";
import { modalKeys } from "../../utils/enums";
import { convertViewtoPx } from "../../utils/utils";
import { moorhen } from "../../types/moorhen";

export const MoorhenCalculateMenu = (props: {
    dropdownId: string;
    extraCalculateMenuItems? : React.ReactElement[];
    allowScripting?: boolean;
}) => {

    const [, setPopoverIsShown] = useState<boolean>(false)
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height) 
    const dispatch = useDispatch()      
    const menuItemProps = { setPopoverIsShown}

    return <div style={{maxHeight: convertViewtoPx(65, height), overflow: 'auto'}}>
            <MoorhenAddWatersMenuItem {...menuItemProps} />
            <MenuItem onClick={() => {
                dispatch(showModal(modalKeys.SUPERPOSE_MODELS))
                document.body.click()
            }}>Superpose structures...</MenuItem>
            {/* <MoorhenStepRefinementMenuItem key="step-refinement" {...menuItemProps}/>  this is causing huge memory leak*/}
            <MoorhenMultiplyBfactorMenuItem key="bfactor-multiply" {...menuItemProps}/>
            <MoorhenShiftFieldBFactorRefinement key="bfactor-refinement" {...menuItemProps}/>
            <MoorhenCalculateTrajectoryMenuItem key="calcualte-trajectory" {...menuItemProps}/>
            <MoorhenSelfRestraintsMenuItem key="add-self-restraints" setPopoverIsShown={setPopoverIsShown}/>
            <MoorhenClearSelfRestraintsMenuItem key="clear-self-restraints" setPopoverIsShown={setPopoverIsShown}/>
            <MoorhenRandomJiggleBlurMenuItem setPopoverIsShown={setPopoverIsShown} />
            <MenuItem onClick={() => {
                dispatch(showModal(modalKeys.SLICE_N_DICE))
                document.body.click()
            }}>
                Slice-n-Dice...
            </MenuItem>
            {props.allowScripting && 
            <>
                <MoorhenLoadScriptMenuItem {...menuItemProps} />
                <MenuItem id="interactive-scripting-menu-item" onClick={() => { 
                    dispatch(showModal(modalKeys.SCRIPTING))
                    document.body.click()
                 }}>Interactive scripting...</MenuItem>
            </>
            }
            {props.extraCalculateMenuItems && props.extraCalculateMenuItems.map(menu => menu)}
    </div>
}

