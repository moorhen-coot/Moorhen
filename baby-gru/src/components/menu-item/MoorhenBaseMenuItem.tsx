import { MenuItem } from "@mui/material";
import { useRef } from "react";
import { OverlayTrigger, Popover, PopoverBody, PopoverHeader, Button } from "react-bootstrap";

export const MoorhenBaseMenuItem = (props: {
    popoverContent?: JSX.Element;
    popoverPlacement?: 'left' | 'right';
    onCompleted?: () => void;
    onEntering?: () => void;
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
    onExiting?: () => void;
    menuItemTitle?: string;
    showOkButton?: boolean;
    buttonVariant?: string;
    buttonText?: string;
    textClassName?: string;
    id?: string;
    menuItemText: string; 
    disabled?: boolean;
}) => {

    const resolveOrRejectRef = useRef({
        resolve: (_arg0?: any) => { },
        reject: (_arg0?: any) => { }
    })

    return <>
        {props.popoverContent ? <OverlayTrigger
            rootClose
            placement={props.popoverPlacement}
            trigger="click"

            onToggle={(doShow) => {
                if (doShow) {
                    new Promise((resolve, reject) => {
                        resolveOrRejectRef.current = { resolve, reject }
                    }).then(_result => {
                        props.onCompleted()
                        document.body.click()
                    }).catch(err => console.log(err))
                }
            }}

            onEntering={() => {
                props.onEntering()
            }}

            onEntered={() => {
                props.setPopoverIsShown(true)
            }}

            onExit={() => {
                props.setPopoverIsShown(false)
            }}

            onExiting={() => {
                props.onExiting()
            }}

            overlay={
                <Popover style={{ maxWidth: "40rem", zIndex: 99999 }}>
                    <PopoverHeader as="h3">{props.menuItemTitle}</PopoverHeader>
                    <PopoverBody>
                        {props.popoverContent}
                        {props.showOkButton &&
                            <Button variant={props.buttonVariant} onClick={() => {
                                resolveOrRejectRef.current.resolve()
                            }}>
                                {props.buttonText}
                            </Button>
                        }

                    </PopoverBody>
                </Popover>
            }>
            <MenuItem disabled={props.disabled} className={props.textClassName} id={props.id}>{props.menuItemText}</MenuItem>
        </OverlayTrigger> :
            <MenuItem disabled={props.disabled} className={props.textClassName}>{props.menuItemText}</MenuItem>
        }
    </>
}

MoorhenBaseMenuItem.defaultProps = {
    id: '',
    showOkButton: true,
    buttonText: "OK",
    buttonVariant: "primary",
    textClassName: "",
    popoverPlacement: "right",
    onEntering: () => { },
    onExiting: () => { },
    onCompleted: () => { },
    disabled: false
}
