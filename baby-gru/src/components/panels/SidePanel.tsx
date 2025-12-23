import { useDispatch, useSelector } from "react-redux";
import { Activity, useRef, useState } from "react";
import { RootState, setShownSidePanel, setSidePanelIsOpen } from "@/store";
import { MapsPanel } from "./MapPanel/MapsPanel";
import { ModelsPanel } from "./ModelsPanel/ModelsPanel";
import "./side-panels.css";
import { TabsToggle } from "./tabsToggle";

export type PanelIDs = "model-panel" | "maps-panel";

export const MoorhenSidePanel = (props: { width: number }) => {
    const { width } = props;
    const dispatch = useDispatch();
    const height = useSelector((state: RootState) => state.sceneSettings.height);
    const sidePanelIsOpen = useSelector((state: RootState) => state.globalUI.sidePanelIsOpen);
    const [showHintLabel, setShowHintLabel] = useState<boolean>(null);
    const shownPanel = useSelector((state: RootState) => state.globalUI.shownSidePanel);

    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleMouseEnter = () => {
        timeoutRef.current = setTimeout(() => {
            setShowHintLabel(true);
        }, 350);
    };

    const handleMouseLeave = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        setShowHintLabel(false);
    };

    const togglePanels = (shown: boolean, id: PanelIDs) => {
        if (shown) {
            dispatch(setShownSidePanel(id));
        } else {
            dispatch(setShownSidePanel(null));
        }
        dispatch(setSidePanelIsOpen(shown));
    };

    const toggles = (
        <>
            <TabsToggle
                isShown={shownPanel === "maps-panel"}
                setIsShown={togglePanels}
                icon="menuMaps"
                label="Maps"
                showHintLabel={showHintLabel}
                id="maps-panel"
            />
            <TabsToggle
                isShown={shownPanel === "model-panel"}
                setIsShown={togglePanels}
                icon="menuModels"
                label="Models"
                showHintLabel={showHintLabel}
                id="model-panel"
            />{" "}
        </>
    );

    const panels = (
        <>
            <Activity mode={shownPanel === "maps-panel" ? "visible" : "hidden"}>
                <MapsPanel />
            </Activity>
            <Activity mode={shownPanel === "model-panel" ? "visible" : "hidden"}>
                <ModelsPanel />
            </Activity>
        </>
    );

    return (
        <>
            <div
                className={`moorhen__side-panel-tabs-container${sidePanelIsOpen ? " visible" : ""}`}
                style={{ "--side-panel-translate": `${-width}px` } as React.CSSProperties}
                onMouseEnter={() => handleMouseEnter()}
                onMouseLeave={() => handleMouseLeave()}
            >
                {toggles}
            </div>
            <div
                style={{ width: width, height: height, "--side-panel-translate": `${-width}px` } as React.CSSProperties}
                className={`moorhen__panel-container ${sidePanelIsOpen ? "moorhen__panel-container--visible" : ""}`}
            >
                {panels}
            </div>
        </>
    );
};
