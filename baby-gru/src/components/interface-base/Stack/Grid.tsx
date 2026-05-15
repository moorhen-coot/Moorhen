export const MoorhenGrid = (props: {
    children: React.ReactNode;
    gap?: string;
    columns: number;
    style?: React.CSSProperties;
}) => {
    const { children, gap = "0px", columns, style = null } = props;

    return (
        <div
            className="moorhen__grid"
            style={{
                display: "grid",
                gridTemplateColumns: `repeat(${columns}, auto)`,
                gap: gap,
                ...style,
            }}
        >
            {children}
        </div>
    );
}