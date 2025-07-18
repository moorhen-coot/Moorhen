import { MoorhenStore } from "../../moorhen";
import "./moorhen-icons.css";

export const MoorhenIcon = (props: { name: string; alt: string; size: "small" | "medium" | "large" }) => {
    const urlPrefix = MoorhenStore.getState().generalStates.urlPrefix;
    console.log(`MoorhenIcon: ${urlPrefix}/pixmaps/moorhen_icons/${props.name}.svg`);
    return (
        <img
            src={`${urlPrefix}/pixmaps/moorhen_icons/${props.name}.svg`}
            alt={props.alt}
            className={`moorhen__icon__${props.size} moorhen__icon__color`}
            draggable={false}
        />
    );
};
