import { useSelector } from "react-redux";
import { useLayoutEffect, useRef, useState } from "react";
import { RootState } from "@/store";
import { PopupControlList } from "./PopupControlList";
import "./popup-controls.css";

export const PopupControls = () => {
    const glWidth = useSelector((state: RootState) => state.sceneSettings.GlViewportWidth);
    const shownControl = useSelector((state: RootState) => state.globalUI.shownControl);
    const popupRef = useRef<HTMLDivElement>(null);
    const [left, setLeft] = useState<number>(glWidth / 2);

    useLayoutEffect(() => {
        if (popupRef.current) {
            const popupWidth = popupRef.current.offsetWidth;
            setLeft(glWidth / 2 - popupWidth / 2);
        }
    }, [glWidth, shownControl]);

    const controlBar = shownControl ? PopupControlList.find(control => control.name === shownControl.name) : null;

    if (!controlBar) {
        return null;
    }

    return (
        <div className="moorhen__popup-control-container moorhen_stack_card" style={{ left: left }} ref={popupRef}>
            {controlBar.component}
        </div>
    );
};
