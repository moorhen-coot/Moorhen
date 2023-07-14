import { NavDropdown } from "react-bootstrap";
import { useState } from "react";
import { MoorhenLoadScriptMenuItem } from "../menu-item/MoorhenLoadScriptMenuItem";
import { MoorhenSuperposeMenuItem } from "../menu-item/MoorhenSuperposeMenuItem";
import { MoorhenScriptModal } from "../modal/MoorhenScriptModal";
import { MoorhenSuperposeResultsModal } from "../modal/MoorhenSuperposeResultsModal"
import { MenuItem } from "@mui/material";
import { MoorhenNavBarExtendedControlsInterface } from "./MoorhenNavBar";
import { libcootApi } from "../../types/libcoot";

export const MoorhenCalculateMenu = (props: MoorhenNavBarExtendedControlsInterface) => {
    const [popoverIsShown, setPopoverIsShown] = useState<boolean>(false)
    const [showCodeEditor, setShowCodeEditor] = useState<boolean>(false)
    const [superposeResults, setSuperposeResults] = useState<false | libcootApi.SuperposeResultsJS>(false)
    
    const menuItemProps = { setPopoverIsShown, ...props }

    return <>
            <MoorhenSuperposeMenuItem key="superpose_structures" setSuperposeResults={setSuperposeResults} {...menuItemProps} />
            {props.allowScripting && 
            <>
                <MoorhenLoadScriptMenuItem {...menuItemProps} />
                <MenuItem id="interactive-scripting-menu-item" onClick={() => { setShowCodeEditor(true) }}>Interactive scripting...</MenuItem>
            </>
            }
            {props.extraCalculateMenuItems && props.extraCalculateMenuItems.map( menu => menu)}
        <MoorhenScriptModal show={showCodeEditor} setShow={setShowCodeEditor} {...menuItemProps} />
        {/**<MoorhenSuperposeResultsModal superposeResults={superposeResults} setSuperposeResults={setSuperposeResults} {...menuItemProps} />*/}
    </>
}



