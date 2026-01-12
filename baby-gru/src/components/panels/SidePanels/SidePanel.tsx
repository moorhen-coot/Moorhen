import { useDispatch, useSelector } from "react-redux";
import React, { Activity, useCallback, useEffect, useRef, useState } from "react";
import useStateWithRef from "@/hooks/useStateWithRef";
import { RootState, setEnableAtomHovering, setShownSidePanel } from "@/store";
import { setSidePanelWidth } from "@/store/globalUISlice";
import { PanelIDs, PanelsList } from "./SidePanelList";
import { TabsToggle } from "./TabsToggle";
import "./side-panels.css";

export const MoorhenSidePanel = () => {
    const height = useSelector((state: RootState) => state.sceneSettings.height);
    const [showHintLabel, setShowHintLabel] = useState<boolean>(null);
    const shownPanel = useSelector((state: RootState) => state.globalUI.shownSidePanel);
    const sidePanelIsOpen = shownPanel !== null;
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [activePanels, setActivePanels] = useState<PanelIDs[]>([]);
    const enableAtomHovering = useSelector((state: RootState) => state.hoveringStates.enableAtomHovering);
    const cachedEnableAtomHovering = useRef(false);
    const abortControllerRef = useRef<AbortController | null>(null);
    const lastMousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    //const sidePanelWidth = useSelector((state: RootState) => state.globalUI.sidePanelWidth);
    const minWidth = 450;
    const maxWidth = 900;
    const [width, setWidth, widthRef] = useStateWithRef(450);
    const [noAnimation, setNoAnimation] = useState(false);
    const dispatch = useDispatch();

    //Floating labels
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

    //** Resizable logic */
    const handleResizeStart = (evt: React.MouseEvent<HTMLElement, MouseEvent>): void => {
        if (enableAtomHovering) {
            dispatch(setEnableAtomHovering(false));
            cachedEnableAtomHovering.current = true;
        } else {
            cachedEnableAtomHovering.current = false;
        }
        evt.preventDefault();
        evt.stopPropagation();
        setNoAnimation(true);

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();
        lastMousePos.current = { x: evt.pageX, y: evt.pageY };
        /// pointer move vs mousemove is what make it work smoothly !
        window.addEventListener("pointermove", resizeModal, {
            signal: abortControllerRef.current.signal,
            passive: false,
        });
        window.addEventListener("pointerup", handleResizeStop, {
            signal: abortControllerRef.current.signal,
            passive: false,
        });
    };

    const handleResizeStop = () => {
        abortControllerRef.current?.abort();
        if (cachedEnableAtomHovering.current) {
            dispatch(setEnableAtomHovering(true));
        }
        setNoAnimation(false);
        dispatch(setSidePanelWidth(widthRef.current));
    };

    const resizeModal = evt => {
        evt.preventDefault();
        evt.stopPropagation();
        const deltaX = evt.pageX - lastMousePos.current.x;
        const deltaY = evt.pageY - lastMousePos.current.y;
        lastMousePos.current = { x: evt.pageX, y: evt.pageY };
        let _width = width - deltaX;
        // if (_width < minWidth) {
        //     _width = minWidth;
        // } else if (width > maxWidth) {
        //     _width = maxWidth;
        // }

        setWidth(prev => prev - deltaX);
    };

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
                className={`moorhen__side-panel-tabs-container${sidePanelIsOpen ? " visible" : ""} ${noAnimation ? "no_animation" : ""}`}
                style={{ "--side-panel-translate": `${-width}px` } as React.CSSProperties}
                onMouseEnter={() => handleMouseEnter()}
                onMouseLeave={() => handleMouseLeave()}
            >
                {toggles}
            </div>
            <div
                style={{ width: width, height: height, "--side-panel-translate": `${-width}px` } as React.CSSProperties}
                className={`moorhen__panel-container ${noAnimation ? "no_animation" : ""} ${sidePanelIsOpen ? "moorhen__panel-container--visible" : ""}`}
            >
                <button className="moorhen__side-panel-resize-button" onMouseDown={handleResizeStart} />
                {panels}
            </div>
        </>
    );
};
