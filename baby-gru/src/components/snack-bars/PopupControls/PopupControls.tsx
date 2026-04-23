import { useSelector } from "react-redux";
import { useRef } from "react";
import { RootState } from "@/store";
import { PopupControlList } from "./PopupControlList";
import "./popup-controls.css";

export const PopupControls = () => {
    const shownControl = useSelector((state: RootState) => state.globalUI.shownControl);
    const popupRef = useRef<HTMLDivElement>(null);
    const controlBar = shownControl ? PopupControlList.find(control => control.name === shownControl.name) : null;

    return (
        <div className="moorhen__popup-control-container">
            {controlBar && (
                <div className="moorhen__popup-control moorhen_stack_card" ref={popupRef}>
                    {controlBar.component}
                </div>
            )}{" "}
        </div>
    );
};
