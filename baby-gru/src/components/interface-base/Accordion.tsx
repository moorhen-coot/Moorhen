import React, { SyntheticEvent, useCallback, useState } from "react";
import { MoorhenButton } from "../inputs";
import "./accordion.css";

export type MoorhenAccordionType = {
    title: string | React.JSX.Element;
    children: React.ReactNode;
    disabled?: boolean;
    defaultOpen?: boolean;
    extraControls?: React.JSX.Element[];
    type?: "default" | "card";
    onChange?: (isExpanded: boolean) => void;
    onOpen?: () => void;
    onClose?: () => void;
};

export const MoorhenAccordion = (props: MoorhenAccordionType) => {
    const { title, children, disabled = false, defaultOpen = false, extraControls = null, type = "default" } = props;
    const [isOpen, setIsOpen] = useState<boolean>(defaultOpen);

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
                className={`moorhen__accordion-header ${type === "default" ? "" : "moorhen__accordion-header-card"} ${disabled ? "disabled" : ""} ${isOpen ? " moorhen__accordion-open" : " moorhen__accordion-closed"}`}
            >
                <div className="moorhen-accordion-title">{title}</div>
                <div className="moorhen__accordion-control-panel">
                    {extraControls}
                    <MoorhenButton
                        type="icon-only"
                        icon="MUISymbolKeyboardArrowDown"
                        onClick={handleChange}
                        className={`moorhen__accordion-toggle-${isOpen ? "open" : "close"}`}
                    />
                </div>
            </div>
            <div className={`moorhen__accordion-content-${isOpen ? "shown" : "hidden"}`}>{children}</div>
        </div>
    );
};
