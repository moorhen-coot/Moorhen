import { useSelector } from "react-redux";
import { useMemo, useState } from "react";
import { moorhen } from "../../../types/moorhen";
import { MoorhenMapCard } from "../../card/MapCard/MoorhenMapCard";
import { MoorhenOrbitalCard } from "../../card/MapCard/MoorhenOrbitalCard";
import { CollapseAllCardsToggle } from "./utils/CollapseAllCardsToggle";
import { SidePanelContainer } from "./utils/SidePanelContainer";

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

    // Orbitals get their own, shorter card: no active toggle, no histogram, no radius. Same panel
    // though - a cube is a map once it is loaded, and splitting the panel would hide them.
    const displayData = maps.map((map, index) =>
        map.isCube ? (
            <MoorhenOrbitalCard
                key={map.molNo}
                map={map}
                initialContour={map.suggestedContourLevel ? map.suggestedContourLevel : 0.02}
                isOpen={allOpen}
                onCollapseToggle={(key, isOpen) => setActiveToggle({ key: key, isOpen: isOpen })}
            />
        ) : (
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
        <SidePanelContainer title="Maps" extraControls={extraControl}>
            {maps.length === 0 ? <span>No maps loaded</span> : sortedDisplayData}
        </SidePanelContainer>
    );
};
