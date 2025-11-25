import "./moorhen-stack.css";

type MoorhenStackType = {
    direction?: "row" | "line" | "horizontal" | "column" | "vertical";
    gap?: number | string;
    justify?: "center" | "flex-start" | "flex-end" | "space-between" | "space-around" | "space-evenly";
    align?: "center" | "flex-start" | "flex-end" | "stretch" | "baseline" | "normal";
    children: React.ReactNode;
    style?: React.CSSProperties;
};

export const MoorhenStack = ({ direction, gap, justify = "flex-start", align = "normal", children, style = null }: MoorhenStackType) => {
    const mainClass =
        direction === "row" || direction === "line" || direction === "horizontal" ? `moorhen__stack__row` : `moorhen__stack__column`;
    return (
        <div className={mainClass} style={{ gap, justifyContent: justify, alignItems: align, ...style }}>
            {children}
        </div>
    );
};
