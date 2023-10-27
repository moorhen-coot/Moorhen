import { useState } from "react";
import { MoorhenLoadScriptMenuItem } from "../menu-item/MoorhenLoadScriptMenuItem";
import { MoorhenSuperposeMenuItem } from "../menu-item/MoorhenSuperposeMenuItem";
import { MoorhenSelfRestraintsMenuItem } from "../menu-item/MoorhenSelfRestraintsMenuItem";
import { MoorhenClearSelfRestraintsMenuItem } from "../menu-item/MoorhenClearSelfRestraintsMenuItem";
import { MoorhenRandomJiggleBlurMenuItem } from "../menu-item/MoorhenRandomJiggleBlurMenuItem";
import { MoorhenNavBarExtendedControlsInterface } from "./MoorhenNavBar";
import { MenuItem } from "@mui/material";
import { libcootApi } from "../../types/libcoot";

export const MoorhenCalculateMenu = (props: MoorhenNavBarExtendedControlsInterface) => {
    const [popoverIsShown, setPopoverIsShown] = useState<boolean>(false)
    const [superposeResults, setSuperposeResults] = useState<false | libcootApi.SuperposeResultsJS>(false)
    
    const menuItemProps = { setPopoverIsShown, ...props }

    return <>
            <MoorhenSuperposeMenuItem key="superpose_structures" setSuperposeResults={setSuperposeResults} {...menuItemProps} />
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
                    props.setShowScripting(true)
                    document.body.click()
                 }}>Interactive scripting...</MenuItem>
            </>
            }
            {props.extraCalculateMenuItems && props.extraCalculateMenuItems.map(menu => menu)}
    </>
}

