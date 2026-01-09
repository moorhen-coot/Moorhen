import { useDispatch, useSelector } from "react-redux";
import React, { Activity, useCallback, useEffect, useRef, useState } from "react";
import { RootState, setShownSidePanel } from "@/store";
import { PanelIDs, PanelsList } from "./PanelList";
import { TabsToggle } from "./TabsToggle";
import "./side-panels.css";

export const MoorhenSidePanel = (props: { width: number }) => {
    const { width } = props;
    const height = useSelector((state: RootState) => state.sceneSettings.height);
    const [showHintLabel, setShowHintLabel] = useState<boolean>(null);
    const shownPanel = useSelector((state: RootState) => state.globalUI.shownSidePanel);
    const sidePanelIsOpen = shownPanel !== null;
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [activePanels, setActivePanels] = useState<PanelIDs[]>([]);

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

    const dispatch = useDispatch();

    const handleRemoveActivePanel = useCallback(
        (id: PanelIDs) => {
            if (activePanels.length === 1) {
                setShowHintLabel(false);
            }
            setActivePanels(prev => prev.filter(panelId => panelId !== id));
            if (shownPanel === id) {
                dispatch(setShownSidePanel(null));
                setShowHintLabel(false);
            }
        },
        [dispatch, shownPanel]
    );

    useEffect(() => {
        if (shownPanel && !activePanels.includes(shownPanel)) {
            setActivePanels(prev => [...prev, shownPanel]);
        }
    }, [shownPanel, activePanels]);

    const toggles: React.JSX.Element[] = activePanels.map(id => {
        return (
            <TabsToggle
                icon={PanelsList[id].icon}
                label={PanelsList[id].label}
                id={id}
                key={`${id}-tab-toggle`}
                showHintLabel={showHintLabel}
                onDelete={handleRemoveActivePanel}
            />
        );
    });

    const panels: React.JSX.Element[] = activePanels.map(id => {
        return (
            <Activity mode={shownPanel === id ? "visible" : "hidden"} key={`${id}-activity-panel`}>
                {PanelsList[id].panelContent}
            </Activity>
        );
    });

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
