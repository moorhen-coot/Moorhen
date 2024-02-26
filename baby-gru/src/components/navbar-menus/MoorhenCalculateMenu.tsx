import { useState } from "react";
import { MoorhenLoadScriptMenuItem } from "../menu-item/MoorhenLoadScriptMenuItem";
import { MoorhenSuperposeMenuItem } from "../menu-item/MoorhenSuperposeMenuItem";
import { MoorhenSelfRestraintsMenuItem } from "../menu-item/MoorhenSelfRestraintsMenuItem";
import { MoorhenClearSelfRestraintsMenuItem } from "../menu-item/MoorhenClearSelfRestraintsMenuItem";
import { MoorhenRandomJiggleBlurMenuItem } from "../menu-item/MoorhenRandomJiggleBlurMenuItem";
import { MoorhenAddWatersMenuItem } from "../menu-item/MoorhenAddWatersMenuItem"
import { MoorhenStepRefinementMenuItem } from "../menu-item/MoorhenStepRefinementMenuItem"
import { MoorhenShiftFieldBFactorRefinement } from "../menu-item/MoorhenShiftFieldBFactorRefinement"
import { MoorhenMultiplyBfactorMenuItem } from "../menu-item/MoorhenMultiplyBfactorMenuItem"
import { MoorhenNavBarExtendedControlsInterface } from "./MoorhenNavBar";
import { MenuItem } from "@mui/material";
import { libcootApi } from "../../types/libcoot";
import { useDispatch } from "react-redux";
import { setShowScriptingModal } from "../../store/activeModalsSlice";

export const MoorhenCalculateMenu = (props: MoorhenNavBarExtendedControlsInterface) => {
    const dispatch = useDispatch()
    
    const [popoverIsShown, setPopoverIsShown] = useState<boolean>(false)
    const [superposeResults, setSuperposeResults] = useState<false | libcootApi.SuperposeResultsJS>(false)
    
    const menuItemProps = { setPopoverIsShown, ...props }

    return <>
            <MoorhenAddWatersMenuItem {...menuItemProps} />
            <MoorhenSuperposeMenuItem key="superpose_structures" setSuperposeResults={setSuperposeResults} {...menuItemProps} />
            <MoorhenStepRefinementMenuItem key="step-refinement" {...menuItemProps}/>
            <MoorhenMultiplyBfactorMenuItem key="bfactor-multiply" {...menuItemProps}/>
            <MoorhenShiftFieldBFactorRefinement key="bfactor-refinement" {...menuItemProps}/>
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

