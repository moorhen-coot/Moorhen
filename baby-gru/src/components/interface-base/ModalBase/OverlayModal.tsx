export const OverlayModal = (props: {
    children: React.ReactNode;
    isShown: boolean;
    overlay: React.ReactNode | React.JSX.Element | string;
    style?: React.CSSProperties;
}) => {
    const { children, isShown, overlay, style } = props;

    return (
        <div>
            {children}
            {isShown && (
                <div
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        backgroundColor: "rgba(0, 0, 0, 0.7)",
                        color: "white",
                        fontSize: "1.2em",
                        fontWeight: "bold",
                        fontFamily: "var(--moorhen-font-family)",
                        textAlign: "center",
                        ...style,
                    }}
                >
                    {overlay}
                </div>
            )}
        </div>
    );
};
