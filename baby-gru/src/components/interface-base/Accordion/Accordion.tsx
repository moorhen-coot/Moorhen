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

const INTERACTIVE = "button, input, select, textarea, a, label, [role='button'], .moorhen__accordion-control-panel";

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

    // The whole header opens and closes the accordion, except a click on something interactive in it
    // (extra controls, the chevron, a name button in the title...), which keeps its own meaning. Clicks
    // from a popover opened from the header reach here through the React tree but are not inside
    // the header element, so they are ignored too.
    const handleHeaderClick = (evt: React.MouseEvent<HTMLDivElement>) => {
        if (disabled) return;
        const target = evt.target as Element;
        if (!evt.currentTarget.contains(target)) return;
        if (target.closest(INTERACTIVE) && evt.currentTarget.contains(target.closest(INTERACTIVE))) return;
        handleChange();
    };

    return (
        <div className={`moorhen__accordion-container ${type === "default" ? "" : "moorhen__accordion-container-card"} `}>
            {/* A larger mouse target only: the chevron button stays the keyboard control */}
            {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
            <div
                onClick={handleHeaderClick}
                className={`moorhen__accordion-header ${type === "default" ? "" : "moorhen__accordion-header-card"} ${twoLinesHeader && (isOpen || !hideExtraControlsWhenClosed) ? "two-lines" : ""} ${disabled ? "disabled" : ""} ${isOpen ? " moorhen__accordion-open" : " moorhen__accordion-closed"}`}
            >
                <div className="moorhen__accordion-title">{title}</div>
                <div className="moorhen__accordion-control-panel">
                    {!hideExtraControlsWhenClosed || isOpen ? extraControls : null}
                    <MoorhenButton
                        type="icon-only"
                        icon="MatSymKeyboardArrowDown"
                        disabled={disabled}
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
