import "./moorhen-icons.css";
import { moorhenSVGs } from "./moorhen_icons";
import type { MoorhenSVG } from "./moorhen_icons";

type BaseIconProps = {
    alt?: string;
    size?: "small" | "medium" | "large" | "accordion";
    style?: React.CSSProperties;
    isActive?: boolean;
    className?: string;
    ref?: React.Ref<HTMLSpanElement | HTMLImageElement>;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
};

type MoorhenIconPropsType = BaseIconProps & ({ moorhenSVG: MoorhenSVG; src?: never } | { src: string; moorhenSVG?: never });

export const MoorhenIcon = ({
    moorhenSVG,
    src,
    alt,
    size,
    isActive = null,
    className = "",
    style = null,
    ref,
    onMouseEnter,
    onMouseLeave,
}: MoorhenIconPropsType) => {
    const internalClassName = className
        ? className
        : `moorhen__icon__${size} ${isActive !== null ? (isActive ? "moorhen__icon__active" : "moorhen__icon__inactive") : ""}`;

    if (moorhenSVG) {
        const SvgComponent = moorhenSVGs[moorhenSVG];
        return (
            <span
                className={internalClassName}
                style={{ display: "inline-block", lineHeight: 0, ...style }}
                aria-label={alt ? alt : moorhenSVG}
                ref={ref}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
            >
                <SvgComponent className="moorhen__icon" />
            </span>
        );
    }

    return <img className={internalClassName} style={{ ...style }} draggable="false" aria-label={alt} src={src} />;
};
