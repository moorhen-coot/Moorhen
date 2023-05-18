import { forwardRef } from "react";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import { ListItemButton, ListItemText, Collapse } from "@mui/material"
import {convertViewtoPx} from "../../utils/MoorhenUtils"

export const MoorhenConsole = forwardRef((props, ref) => {

    return <>
            <ListItemButton
                id="console-dropdown"
                show={props.accordionDropdownId === props.dropdownId}
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