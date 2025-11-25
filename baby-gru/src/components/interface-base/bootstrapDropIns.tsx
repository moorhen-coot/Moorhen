import React from "react";

type RowProps = {
    children?: React.ReactNode;
    style?: React.CSSProperties;
    className?: string;
    gap?: number; // px
};

export const Row: React.FC<RowProps> = ({ children, style, className, gap = 16 }) => {
    const half = gap / 2;
    return (
        <div
            className={className}
            style={{
                display: "flex",
                flexWrap: "wrap",
                marginLeft: -half,
                marginRight: -half,
                alignItems: "stretch",
                ...style,
            }}
        >
            {React.Children.map(children, child =>
                React.isValidElement(child) ? React.cloneElement(child as React.ReactElement<any>, { _colGutter: gap }) : child
            )}
        </div>
    );
};

type ColSize = number | boolean | "auto";

type ColProps = {
    children?: React.ReactNode;
    xs?: ColSize;
    sm?: ColSize;
    md?: ColSize;
    lg?: ColSize;
    style?: React.CSSProperties;
    className?: string;
    // internal prop injected by Row to set gutter
    _colGutter?: number;
};

export const Col: React.FC<ColProps> = ({ children, xs, sm, md, lg, style, className, _colGutter = 16 }) => {
    const half = _colGutter / 2;
    // choose the most specific provided size in this simplified implementation:
    const size: ColSize | undefined = xs ?? sm ?? md ?? lg;

    let widthStyle: React.CSSProperties;
    if (typeof size === "number") {
        const pct = (size / 12) * 100;
        widthStyle = { flex: `0 0 ${pct}%`, maxWidth: `${pct}%` };
    } else if (size === "auto") {
        // auto: shrink to content
        widthStyle = { flex: "0 0 auto", maxWidth: "none" };
    } else if (size === true) {
        // boolean true: take available space (like <Col sm> in react-bootstrap)
        widthStyle = { flex: "1 1 0%", maxWidth: "100%" };
    } else {
        // no size provided: behave like a flexible column
        widthStyle = { flex: "1 1 0%", maxWidth: "100%" };
    }

    return (
        <div
            className={className}
            style={{
                paddingLeft: half,
                paddingRight: half,
                boxSizing: "border-box",
                ...widthStyle,
                ...style,
            }}
        >
            {children}
        </div>
    );
};

type CardProps = {
    children?: React.ReactNode;
    style?: React.CSSProperties;
    className?: string;
};

export const CardBody: React.FC<{ children?: React.ReactNode; style?: React.CSSProperties; className?: string }> = ({
    children,
    style,
    className,
}) => {
    return (
        <div className={className} style={{ padding: 12, ...style }}>
            {children}
        </div>
    );
};

export const Card: React.FC<CardProps> & { Body: typeof CardBody } = ({ children, style, className }) => {
    return (
        <div
            className={className}
            style={{
                border: "1px solid rgba(0,0,0,0.12)",
                borderRadius: 6,
                background: "var(--bg-card, #fff)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                marginBottom: 12,
                overflow: "hidden",
                ...style,
            }}
        >
            {children}
        </div>
    );
};

Card.Body = CardBody;
