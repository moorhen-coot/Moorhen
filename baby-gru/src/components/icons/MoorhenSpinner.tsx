type SpinnerProps = {
    size?: number | string;
    colour?: string;
    backgroundColour?: string;
};
export const MoorhenSpinner = (props: SpinnerProps) => {
    const { size = 30, colour = "var(--moorhen-primary)", backgroundColour = "var(--moorhen-primary)" } = props;
    return (
        <span
            className="moorhen-icon-loading-spinner"
            style={{ display: "inline-block", lineHeight: 0, width: size, color: "#ff0000" }}
            aria-label={"progress-indicator"}
        >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
                <radialGradient id="a12" cx=".66" fx=".66" cy=".3125" fy=".3125" gradientTransform="scale(1.5)">
                    <stop offset="0" stop-color={colour}></stop>
                    <stop offset=".3" stop-color={colour} stop-opacity=".9"></stop>
                    <stop offset=".6" stop-color={colour} stop-opacity=".6"></stop>
                    <stop offset=".8" stop-color={colour} stop-opacity=".3"></stop>
                    <stop offset="1" stop-color={colour} stop-opacity="0"></stop>
                </radialGradient>
                <circle
                    transform-origin="center"
                    fill="none"
                    stroke="url(#a12)"
                    stroke-width="15"
                    stroke-linecap="round"
                    stroke-dasharray="200 1000"
                    stroke-dashoffset="0"
                    cx="100"
                    cy="100"
                    r="70"
                >
                    <animateTransform
                        type="rotate"
                        attributeName="transform"
                        calcMode="spline"
                        dur="2"
                        values="360;0"
                        keyTimes="0;1"
                        keySplines="0 0 1 1"
                        repeatCount="indefinite"
                    ></animateTransform>
                </circle>
                <circle
                    transform-origin="center"
                    fill="none"
                    opacity=".2"
                    stroke={backgroundColour}
                    stroke-width="15"
                    stroke-linecap="round"
                    cx="100"
                    cy="100"
                    r="70"
                ></circle>
            </svg>
        </span>
    );
};
