import { usePaths } from "../../InstanceManager";
import "./moorhen-icons.css";

type MoorhenIconPropsType = {
    name: string;
    alt?: string;
    size?: "small" | "medium" | "large" | "accordion";
    style?: React.CSSProperties;
    isActive?: boolean; // Optional prop to indicate if the icon is active
    className?: string; // Optional className for additional styling
};
export const MoorhenIcon = ({ name, alt, size, isActive = null, className = "", style = null }: MoorhenIconPropsType) => {
    const urlPrefix = usePaths().urlPrefix;
    const file = `${urlPrefix}/pixmaps/moorhen_icons/${name}.svg`;
    const internalClassName = className
        ? className
        : `moorhen__icon__${size} ${isActive !== null ? (isActive ? "moorhen__icon__active" : "moorhen__icon__inactive") : ""}`;
    return <img className={internalClassName} style={{ ...style }} draggable="false" aria-label={alt ? alt : name} src={`${file}`} />;
};
