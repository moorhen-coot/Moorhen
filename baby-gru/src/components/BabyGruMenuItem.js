import { MenuItem } from "@mui/material";
import { OverlayTrigger, Popover, PopoverBody, PopoverHeader } from "react-bootstrap";

export const BabyGruMenuItem = (props) => {
    return <>
        {props.popoverContent ? <OverlayTrigger
            placement="right"
            delay={{ show: 250, hide: 400 }}
            overlay={<Popover id="popover-basic">
                <PopoverHeader as="h3">{props.menuItemTitle}</PopoverHeader>
                <PopoverBody>
                    {props.popoverContent}
                </PopoverBody>
            </Popover>}
            trigger="click"
        >
            <MenuItem variant="success">{props.menuItemTitle}</MenuItem>
        </OverlayTrigger> :
            <MenuItem variant="success">{props.menuItemTitle}</MenuItem>
        }
    </>
}