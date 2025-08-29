import { MenuItem } from "@mui/material";
import { useRef } from "react";
import { OverlayTrigger, Popover, PopoverBody, PopoverHeader, Button } from "react-bootstrap";

export const MoorhenBaseMenuItem = (props: {
    popoverContent?: React.JSX.Element;
    popoverPlacement?: "left" | "right";
    onCompleted?: () => void;
    onEntering?: () => void;
    setPopoverIsShown?: React.Dispatch<React.SetStateAction<boolean>>;
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
    const defaultProps = {
        id: "",
        showOkButton: true,
        buttonText: "OK",
        buttonVariant: "primary",
        textClassName: "",
        popoverPlacement: "right",
        onEntering: () => {},
        onExiting: () => {},
        onCompleted: () => {},
        disabled: false,
    };

    const {
        popoverContent,
        popoverPlacement,
        onCompleted,
        onEntering,
        setPopoverIsShown,
        onExiting,
        menuItemTitle,
        showOkButton,
        buttonVariant,
        buttonText,
        textClassName,
        id,
        menuItemText,
        disabled,
    } = { ...defaultProps, ...props };

    const resolveOrRejectRef = useRef({
        resolve: (_arg0?: any) => {},
        reject: (_arg0?: any) => {},
    });

    return (
        <>
            {popoverContent ? (
                <OverlayTrigger
                    rootClose
                    placement={popoverPlacement as "left" | "right"}
                    trigger="click"
                    onToggle={(doShow) => {
                        if (doShow) {
                            new Promise((resolve, reject) => {
                                resolveOrRejectRef.current = { resolve, reject };
                            })
                                .then((_result) => {
                                    onCompleted();
                                    document.body.click();
                                })
                                .catch((err) => console.log(err));
                        }
                    }}
                    onEntering={() => {
                        onEntering();
                    }}
                    onEntered={() => {
                        setPopoverIsShown?.(true);
                    }}
                    onExit={() => {
                        setPopoverIsShown?.(false);
                    }}
                    onExiting={() => {
                        onExiting();
                    }}
                    overlay={
                        <Popover style={{ maxWidth: "40rem", zIndex: 99999 }}>
                            <PopoverHeader as="h3">{menuItemTitle}</PopoverHeader>
                            <PopoverBody>
                                {popoverContent}
                                {showOkButton && (
                                    <Button
                                        variant={buttonVariant}
                                        onClick={() => {
                                            resolveOrRejectRef.current.resolve();
                                        }}
                                    >
                                        {buttonText}
                                    </Button>
                                )}
                            </PopoverBody>
                        </Popover>
                    }
                >
                    <MenuItem disabled={disabled} className={textClassName} id={id}>
                        {menuItemText}
                    </MenuItem>
                </OverlayTrigger>
            ) : (
                <MenuItem disabled={disabled} className={textClassName}>
                    {menuItemText}
                </MenuItem>
            )}
        </>
    );
};
