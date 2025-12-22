import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../store/MoorhenReduxStore";
import { setShowSidePanel } from "../../store/globalUISlice";
import { MapsPanel } from "./MapPanel/MapsPanel";
import "./side-panels.css";

export const MoorhenSidePanel = (props: { width: number }) => {
    const dispatch = useDispatch();
    const height = useSelector((state: RootState) => state.sceneSettings.height);
    const scenewidth = useSelector((state: RootState) => state.sceneSettings.width);
    const isShown = useSelector((state: RootState) => state.globalUI.sidePanelIsShown);
    const { width } = props;

    const toggle = (
        <button
            className={`moorhen__panel-container-toggle-button ${isShown ? "moorhen__panel-container-toggle-button--visible" : ""}`}
            onClick={() => {
                dispatch(setShowSidePanel(!isShown));
            }}
            style={{ "--side-panel-translate": `${-width}px` } as React.CSSProperties}
        >
            {isShown ? "Hide" : "Show"}
        </button>
    );

    return (
        <>
            {toggle}
            <div
                style={{ width: width, height: height, "--side-panel-translate": `${-width}px` } as React.CSSProperties}
                className={`moorhen__panel-container ${isShown ? "moorhen__panel-container--visible" : ""}`}
            >
                <MapsPanel />
            </div>
        </>
    );
};
