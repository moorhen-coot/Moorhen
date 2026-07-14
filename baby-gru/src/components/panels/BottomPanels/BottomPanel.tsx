import { useSelector, } from "react-redux";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ActivityCompat } from "@/components/interface-base/Compatibility";
import { RootState } from "@/store";
import { BottomPanelIDs, BottomPanelsList } from "./BottomPanelsList";
import {  SequenceViewerTab } from "./SequenceViewerPanel/SequenceViewerTab";
import { ValidationTab } from "./SequenceViewerPanel/ValidationTab";
import "./bottom-panel.css";

export const BottomPanelContainer = () => {
    const sidePanelWidth = useSelector((state: RootState) => state.globalUI.sidePanelWidth);
    const sidePanelIsOpen = useSelector((state: RootState) => state.globalUI.shownSidePanel);
    const [activePanels] = useState<BottomPanelIDs[]>(["sequences-viewer", "validation"]);
    const [containerHeight, setContainerHeight] = useState<number | null>(null);
    const contentRef = useRef<HTMLDivElement | null>(null);
    const width = window.innerWidth - (sidePanelIsOpen ? sidePanelWidth : 0);
    const shownPanel = useSelector((state: RootState) => state.bottomPanels.shownBottomPanel);
    const seqviewerOption = useSelector((state: RootState) => state.bottomPanels.seqviewerOption);

    useLayoutEffect(() => {
        if (!contentRef.current) {
            return;
        }
        setContainerHeight(contentRef.current.scrollHeight);
    }, []);

    useEffect(() => {
        if (!contentRef.current) {
            return;
        }

        const resizeObserver = new ResizeObserver(() => {
            if (!contentRef.current) {
                return;
            }
            setContainerHeight(contentRef.current.scrollHeight);
        });

        resizeObserver.observe(contentRef.current);

        return () => {
            resizeObserver.disconnect();
        };
    }, []);

    const panels: React.JSX.Element[] = activePanels.map(id => {
        return (
            <ActivityCompat mode={shownPanel === id ? "visible" : "hidden"} key={`${id}-activity-panel`}>
                {BottomPanelsList[id].renderPanelContent(seqviewerOption)}
            </ActivityCompat>
        );
    });

    return (
        <div
            className="moorhen__bottom-panel-container"
            style={{ width: width, height: containerHeight !== null ? `${containerHeight}px` : undefined }}
        >
            <div ref={contentRef}>
                <div className="moorhen__bottom-panel-tabs-container">
                    <SequenceViewerTab/>
                    <ValidationTab/>
                </div>
                {panels}
            </div>
        </div>
    );
};
