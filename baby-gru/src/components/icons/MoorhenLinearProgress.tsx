export const MoorhenLinearProgress = (props: { colour?: string, thickness?: number, style?: React.CSSProperties, value?: number}) => {
    const { colour = "var(--moorhen-accent)", thickness = 4, value } = props;
    return (
        <span
            style={{ display: "inline-block", lineHeight: 0, width: "100%", color: colour, ...props.style }}
            aria-label={"progress-indicator"}
        >
            
{value === undefined ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 200 ${thickness}`}>
                <rect fill="currentColor" width="100%" height={thickness} rx="2"></rect>
                <rect fill="#fff" width="100%"  height={thickness} >
                    <animate
                        attributeName="x"
                        dur="2s"
                        values="-200;200"
                        keyTimes="0;1"
                        repeatCount="indefinite"
                    ></animate>
                </rect>
            </svg>) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 200 ${thickness}`}>
                <rect fill="#fff" width="100%"  height={thickness} rx="2"></rect>
                <rect fill="currentColor" width={`${value}%`} height={thickness} ></rect>
            </svg>
        )}
        </span>
    );
}