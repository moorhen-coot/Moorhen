import { forwardRef } from "react";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import { ListItemButton, ListItemText, Collapse } from "@mui/material"
import {convertViewtoPx} from "../../utils/MoorhenUtils"
import { MoorhenControlsInterface } from "../MoorhenContainer"

interface MoorhenConsolePropsInterface extends MoorhenControlsInterface {
    busy: boolean;
    consoleMessage: string;
    dropdownId: number;
    accordionDropdownId: number;
    setAccordionDropdownId: React.Dispatch<React.SetStateAction<number>>;
    sideBarWidth: number;
    showSideBar: boolean;
}

export const MoorhenConsole = forwardRef<HTMLDivElement, MoorhenConsolePropsInterface>((props, ref) => {

    return <>
            <ListItemButton
                id="console-dropdown"
                style={{display:'flex', alignItems:'center'}}
                onClick={() => { props.dropdownId !== props.accordionDropdownId ? props.setAccordionDropdownId(props.dropdownId) : props.setAccordionDropdownId(-1) }}>
                <ListItemText primary="Console" />
                {props.dropdownId !== props.accordionDropdownId ? <ExpandMore/> : <ExpandLess/>}

            </ListItemButton>

            <Collapse id='console-collapse'  in={props.dropdownId === props.accordionDropdownId} timeout="auto" style={{width: props.sideBarWidth}}>
                <hr></hr>
                <div ref={ref} style={{
                    overflowY: "scroll",
                    height: convertViewtoPx(70, props.windowHeight),
                    textAlign: "left"
                }}>
                    <pre>{props.consoleMessage}
                    </pre>
                </div>
                <hr></hr>
            </Collapse>
    </> 
})