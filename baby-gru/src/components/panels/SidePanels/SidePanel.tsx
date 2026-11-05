import { useDispatch, useSelector } from "react-redux";
import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useMoorhenInstance } from "@/InstanceManager/useMoorhenInstance";
import type { SidePanelExtension } from "@/InstanceManager/UiExtensions";
import { ActivityCompat } from "@/components/interface-base/Compatibility";
import useStateWithRef from "@/hooks/useStateWithRef";
import { RootState, setEnableAtomHovering, setShownSidePanel } from "@/store";
import { setSidePanelWidth } from "@/store/globalUISlice";
import { PanelsList, SidePanelIDs, MoorhenPanel } from "./SidePanelList";
import { TabsToggle } from "./TabsToggle";
import { SidePanelContainer } from "./utils/SidePanelContainer";
import "./side-panels.css";
import { PanelErrorBoundary } from "@/components/interface-base";

const toMoorhenPanel = (panel: SidePanelExtension): MoorhenPanel => ({
    icon: panel.icon,
    label: panel.label,
    panelContent:
        "slotName" in panel ? (
            <SidePanelContainer title={panel.title ?? panel.label}>
                <slot name={panel.slotName} />
            </SidePanelContainer>
        ) : (
            <>{panel.content}</>
        ),
});

export const MoorhenSidePanel = () => {
    const uiExtensions = useMoorhenInstance().uiExtensions;
    const extensionPanels = useSyncExternalStore(uiExtensions.subscribe, uiExtensions.getSidePanels);
    const allPanels: Record<string, MoorhenPanel> = useMemo(() => {
        const panels: Record<string, MoorhenPanel> = { ...PanelsList };
        extensionPanels.forEach(panel => {
            panels[panel.id] = toMoorhenPanel(panel);
        });
        return panels;
    }, [extensionPanels]);
    const height = useSelector((state: RootState) => state.sceneSettings.height);
    const [showHintLabel, setShowHintLabel] = useState<boolean>(null);
    const shownPanel = useSelector((state: RootState) => state.globalUI.shownSidePanel);
    const sidePanelIsOpen = shownPanel !== null;
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [activePanels, setActivePanels] = useState<SidePanelIDs[]>([]);
    const enableAtomHovering = useSelector((state: RootState) => state.hoveringStates.enableAtomHovering);
    const cachedEnableAtomHovering = useRef(false);
    const abortControllerRef = useRef<AbortController | null>(null);
    const lastMousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    //const sidePanelWidth = useSelector((state: RootState) => state.globalUI.sidePanelWidth);
    const minWidth = 150;
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
        (id: SidePanelIDs) => {
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
        if (shownPanel) {
            setActivePanels(prev => prev.includes(shownPanel) ? prev : [...prev, shownPanel]);
        }
    }, [shownPanel]);

    // Tell extensions when they are shown or hidden. An extension registered while its id is already
    // shown counts as opening then, and one removed while shown as closing.
    const previouslyShown = useRef<SidePanelExtension | null>(null);
    useEffect(() => {
        const shown = (shownPanel && extensionPanels.find(panel => panel.id === shownPanel)) || null;
        if (shown === previouslyShown.current) return;
        previouslyShown.current?.onClose?.();
        shown?.onOpen?.();
        previouslyShown.current = shown;
    }, [shownPanel, extensionPanels]);

    // A panel removed from the registry while open has nothing left to render
    const shownPanels = activePanels.filter(id => allPanels[id]);

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
        lastMousePos.current = { x: evt.pageX, y: evt.pageY };
        setWidth(prev => {
            let _width = prev - deltaX;
            if (_width < minWidth) {
                _width = minWidth;
            } else if (_width > maxWidth) {
                _width = maxWidth;
            }
            return _width;
        });
    };

    const toggles: React.JSX.Element[] = shownPanels.map(id => {
        return (
            <TabsToggle
                icon={allPanels[id].icon}
                label={allPanels[id].label}
                id={id}
                key={`${id}-tab-toggle`}
                showHintLabel={showHintLabel}
                onDelete={handleRemoveActivePanel}
            />
        );
    });

    const panels: React.JSX.Element[] = shownPanels.map(id => {
        return (
            <ActivityCompat mode={shownPanel === id ? "visible" : "hidden"} key={`${id}-activity-panel`}>
                <PanelErrorBoundary panelName={allPanels[id].label}>
                    {allPanels[id].panelContent}
                </PanelErrorBoundary>
            </ActivityCompat>
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
