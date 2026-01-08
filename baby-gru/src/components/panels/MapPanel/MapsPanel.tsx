import { useSelector } from "react-redux";
import { useMemo, useState } from "react";
import { moorhen } from "../../../types/moorhen";
import { MoorhenMapCard } from "../../card/MapCard/MoorhenMapCard";
import { PanelContainer } from "../PanelContainer";
import { CollapseAllCardsToggle } from "../utils/CollapseAllCardsToggle";

export const MapsPanel = () => {
    const maps = useSelector((state: moorhen.State) => state.maps);

    const [allOpen, setallOpen] = useState<boolean | null>(null);
    const [activeToggle, setActiveToggle] = useState<{ key: number; isOpen: boolean }>({ key: null, isOpen: null });
    const extraControl = (
        <CollapseAllCardsToggle
            keyList={maps.map(maps => maps.molNo)}
            allOpen={allOpen}
            setAllOpen={setallOpen}
            activeToggle={activeToggle}
        />
    );

    const displayData = maps.map((map, index) => (
        <MoorhenMapCard
            key={map.molNo}
            map={map}
            initialContour={map.suggestedContourLevel ? map.suggestedContourLevel : 0.8}
            initialRadius={map.suggestedRadius ? map.suggestedRadius : 13}
            isOpen={allOpen}
            onCollapseToggle={(key, isOpen) => setActiveToggle({ key: key, isOpen: isOpen })}
        />
    ));

    const sortedDisplayData = [...displayData].sort((a, b) => (a.props.index > b.props.index ? 1 : b.props.index > a.props.index ? -1 : 0));

    return (
        <PanelContainer title="Maps" extraControls={extraControl}>
            {maps.length === 0 ? <span>No maps loaded</span> : sortedDisplayData}
        </PanelContainer>
    );
};
