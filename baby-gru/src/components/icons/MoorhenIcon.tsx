import "./moorhen-icons.css";
import { moorhenSVGs } from "./moorhen_icons";
import type { MoorhenSVG } from "./moorhen_icons";

type BaseIconProps = {
    alt?: string;
    size?: "small" | "medium" | "large" | "accordion";
    style?: React.CSSProperties;
    isActive?: boolean;
    className?: string;
};

type MoorhenIconPropsType = BaseIconProps & ({ moorhenSVG: MoorhenSVG; src?: never } | { src: string; moorhenSVG?: never });

export const MoorhenIcon = ({ moorhenSVG, src, alt, size, isActive = null, className = "", style = null }: MoorhenIconPropsType) => {
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
            >
                <SvgComponent className="moorhen__icon" />
            </span>
        );
    }

    return <img className={internalClassName} style={{ ...style }} draggable="false" aria-label={alt} src={src} />;
};
