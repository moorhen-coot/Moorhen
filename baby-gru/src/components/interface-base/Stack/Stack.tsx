import { AriaRole } from "react";
import "./moorhen-stack.css";

type MoorhenStackType = {
    direction?: "row" | "line" | "horizontal" | "column" | "vertical";
    gap?: number | string;
    justify?: "center" | "flex-start" | "flex-end" | "space-between" | "space-around" | "space-evenly";
    align?: "center" | "flex-start" | "flex-end" | "stretch" | "baseline" | "normal";
    children: React.ReactNode;
    style?: React.CSSProperties;
    card?: boolean;
    className?: string;
    inputGrid?: boolean;
    grid?: boolean;
    gridWidth?: 1 | 2 | 3 | 4;
    addMargin?: boolean;
    ref?: React.RefObject<HTMLDivElement>;
    flex?: 1 | 0;
    overflow?: "auto" | "hidden" | "visible" | "scroll" | "clip";
    role?: AriaRole;
    title?: string;
};

export const MoorhenStack = (props: MoorhenStackType) => {
    const {
        direction,
        gap,
        justify = "flex-start",
        align = "normal",
        children,
        style = null,
        card = null,
        className,
        inputGrid = false,
        gridWidth = 1,
        addMargin = false,
        ref = null,
        flex = 1,
        overflow = "visible",
        role = null,
    } = props;

    const title = props.title && props.card ? <div className="moorhen__stack_card_title">{props.title}</div> : null;
    let mainClass = inputGrid
        ? "moorhen__input-grid"
        : direction === "row" || direction === "line" || direction === "horizontal"
          ? "moorhen__stack__row"
          : "moorhen__stack__column";
    if (card) {
        mainClass += " moorhen__stack_card";
        if (title) {
            mainClass += " moorhen__stack_card--titled";
        }
    }
    if (addMargin && !card) {
        mainClass += " moorhen__stack_margins";
    }
    if (className) {
        mainClass += ` ${className}`;
    }
    const content = (
        <div
            className={mainClass}
            style={{
                ...(inputGrid && { gridTemplateColumns: `repeat(${gridWidth}, auto 1fr)` }),
                gap: gap,
                flex: flex,
                justifyContent: justify,
                alignItems: align,
                overflow: overflow,

                ...style,
            }}
            ref={ref}
            role={role}
        >
            {/* Absolutely positioned on the card's top border, so it moves with the card and
                takes no part in the card's flex or grid layout */}
            {title}
            {children}
        </div>
    );
    return content;
};
