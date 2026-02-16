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
    gridWidth?: 1 | 2 | 3 | 4;
    addMargin?: boolean;
    ref?: React.RefObject<HTMLDivElement>;
    flex?: 1 | 0;
};

export const MoorhenStack = ({
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
}: MoorhenStackType) => {
    let mainClass = inputGrid
        ? "moorhen__input-grid"
        : direction === "row" || direction === "line" || direction === "horizontal"
          ? "moorhen__stack__row"
          : "moorhen__stack__column";
    if (card) {
        mainClass += " moorhen__stack_card";
    }
    if (addMargin && !card) {
        mainClass += " moorhen__stack_margins";
    }
    if (className) {
        mainClass += ` ${className}`;
    }
    return (
        <div
            className={mainClass}
            style={{
                ...(inputGrid && { gridTemplateColumns: `repeat(${gridWidth}, auto 1fr)` }),
                gap: gap,
                flex: flex,
                justifyContent: justify,
                alignItems: align,
                ...style,
            }}
            ref={ref}
        >
            {children}
        </div>
    );
};
