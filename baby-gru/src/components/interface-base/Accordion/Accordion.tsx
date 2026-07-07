import React, { useCallback, useEffect, useState } from "react";
import { MoorhenButton } from "../../inputs";
import "./accordion.css";

export type MoorhenAccordionType = {
    title: string | React.JSX.Element;
    children: React.ReactNode;
    disabled?: boolean;
    defaultOpen?: boolean;
    extraControls?: React.JSX.Element[];
    hideExtraControlsWhenClosed?: boolean;
    type?: "default" | "card";
    twoLinesHeader?: boolean;
    onChange?: (isExpanded: boolean) => void;
    onOpen?: () => void;
    onClose?: () => void;
    open?: boolean;
};

export const MoorhenAccordion = (props: MoorhenAccordionType) => {
    const { title, children, disabled = false, defaultOpen = false, extraControls = null, hideExtraControlsWhenClosed = false, type = "default", twoLinesHeader = false } = props;
    const [isOpen, setIsOpen] = useState<boolean>(defaultOpen);

    useEffect(() => {
        if (props.open !== null && props.open !== undefined) {
            setIsOpen(props.open);
        }
    }, [props.open]);

    const handleChange = useCallback(() => {
        if (isOpen) {
            props.onClose?.();
            props.onChange?.(false);
        } else {
            props.onOpen?.();
            props.onChange?.(true);
        }
        setIsOpen(!isOpen);
    }, [props.onClose, props.onChange, props.onOpen, isOpen]);

    return (
        <div className={`moorhen__accordion-container ${type === "default" ? "" : "moorhen__accordion-container-card"} `}>
            <div
                className={`moorhen__accordion-header ${type === "default" ? "" : "moorhen__accordion-header-card"} ${twoLinesHeader && (isOpen || !hideExtraControlsWhenClosed) ? "two-lines" : ""} ${disabled ? "disabled" : ""} ${isOpen ? " moorhen__accordion-open" : " moorhen__accordion-closed"}`}
            >
                <div className="moorhen__accordion-title">{title}</div>
                <div className="moorhen__accordion-control-panel">
                    {!hideExtraControlsWhenClosed || isOpen ? extraControls : null}
                    <MoorhenButton
                        type="icon-only"
                        icon="MatSymKeyboardArrowDown"
                        onClick={handleChange}
                        className={`moorhen__accordion-toggle-${isOpen ? "open" : "close"}`}
                        tooltip={isOpen ? "Collapse" : "Expand"}
                    />
                </div>
            </div>
            <div className={`moorhen__accordion-content-${isOpen ? "shown" : "hidden"}`}>{isOpen ? children : null}</div>
        </div>
    );
};
