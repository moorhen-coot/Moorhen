import { useState } from "react";
import { MoorhenLoadScriptMenuItem } from "../menu-item/MoorhenLoadScriptMenuItem";
import { MoorhenSelfRestraintsMenuItem } from "../menu-item/MoorhenSelfRestraintsMenuItem";
import { MoorhenClearSelfRestraintsMenuItem } from "../menu-item/MoorhenClearSelfRestraintsMenuItem";
import { MoorhenRandomJiggleBlurMenuItem } from "../menu-item/MoorhenRandomJiggleBlurMenuItem";
import { MoorhenAddWatersMenuItem } from "../menu-item/MoorhenAddWatersMenuItem"
import { MoorhenStepRefinementMenuItem } from "../menu-item/MoorhenStepRefinementMenuItem"
import { MoorhenShiftFieldBFactorRefinement } from "../menu-item/MoorhenShiftFieldBFactorRefinement"
import { MoorhenMultiplyBfactorMenuItem } from "../menu-item/MoorhenMultiplyBfactorMenuItem"
import { MoorhenCalculateTrajectoryMenuItem } from "../menu-item/MoorhenCalculateTrajectoryMenuItem"
import { MoorhenNavBarExtendedControlsInterface } from "./MoorhenNavBar";
import { MenuItem } from "@mui/material";
import { useDispatch } from "react-redux";
import { setShowScriptingModal, setShowSliceNDiceModal, setShowSuperposeModal } from "../../store/activeModalsSlice";

export const MoorhenCalculateMenu = (props: MoorhenNavBarExtendedControlsInterface) => {
    const dispatch = useDispatch()
    
    const [popoverIsShown, setPopoverIsShown] = useState<boolean>(false)
    
    const menuItemProps = { setPopoverIsShown, ...props }

    return <>
            <MoorhenAddWatersMenuItem {...menuItemProps} />
            <MenuItem onClick={() => {
                dispatch(setShowSuperposeModal(true))
                document.body.click()
            }}>Superpose structures...</MenuItem>
            <MoorhenStepRefinementMenuItem key="step-refinement" {...menuItemProps}/>
            <MoorhenMultiplyBfactorMenuItem key="bfactor-multiply" {...menuItemProps}/>
            <MoorhenShiftFieldBFactorRefinement key="bfactor-refinement" {...menuItemProps}/>
            <MoorhenCalculateTrajectoryMenuItem key="calcualte-trajectory" {...menuItemProps}/>
            <MoorhenSelfRestraintsMenuItem
                glRef={props.glRef}
                commandCentre={props.commandCentre}
                setPopoverIsShown={setPopoverIsShown}
            />
            <MoorhenClearSelfRestraintsMenuItem
                glRef={props.glRef}
                commandCentre={props.commandCentre}
                setPopoverIsShown={setPopoverIsShown}
            />
            <MoorhenRandomJiggleBlurMenuItem
                glRef={props.glRef}
                commandCentre={props.commandCentre}
                setPopoverIsShown={setPopoverIsShown}
            />
            <MenuItem onClick={() => {
                dispatch(setShowSliceNDiceModal(true))
                document.body.click()
            }}>
                Slice-n-Dice...
            </MenuItem>
            {props.allowScripting && 
            <>
                <MoorhenLoadScriptMenuItem {...menuItemProps} />
                <MenuItem id="interactive-scripting-menu-item" onClick={() => { 
                    dispatch(setShowScriptingModal(true))
                    document.body.click()
                 }}>Interactive scripting...</MenuItem>
            </>
            }
            {props.extraCalculateMenuItems && props.extraCalculateMenuItems.map(menu => menu)}
    </>
}

