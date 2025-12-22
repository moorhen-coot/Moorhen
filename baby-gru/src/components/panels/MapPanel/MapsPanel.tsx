import { useSelector } from "react-redux";
import { useMemo, useState } from "react";
import { moorhen } from "../../../types/moorhen";
import { MoorhenMapCard } from "../../card/MapCard/MoorhenMapCard";

export const MapsPanel = () => {
    const [collapseAll, setCollapseAll] = useState<boolean>(false);
    const [collapsedCards, setCollapsedCards] = useState<number[]>([]);

    const maps = useSelector((state: moorhen.State) => state.maps);

    const handleCollapseAll = () => {
        if (collapseAll) {
            setCollapseAll(false);
            setCollapsedCards([]);
        } else {
            setCollapseAll(true);
            const allCards = maps.map(map => map.molNo);
            setCollapsedCards(allCards);
        }
    };

    // const handleCollapseToggle = key => {
    //     if (collapsedCards.includes(key)) {
    //         setCollapseAll(false);
    //         setCollapsedCards(collapsedCards.filter(card => card !== key));
    //     } else {
    //         if (collapsedCards.length === 1) {
    //             setCollapseAll(true);
    //         }
    //         setCollapsedCards([...collapsedCards, key]);
    //     }
    // };

    const [modalWidth, setModalWidth] = useState<number>(512);

    const displayData = useMemo(() => {
        return maps.map((map, index) => (
            <MoorhenMapCard
                key={map.molNo}
                map={map}
                initialContour={map.suggestedContourLevel ? map.suggestedContourLevel : 0.8}
                initialRadius={map.suggestedRadius ? map.suggestedRadius : 13}
                isCollapsed={collapsedCards.includes(map.molNo) ? true : false}
                //onCollapseToggle={key => handleCollapseToggle(key)}
                modalWidth={modalWidth}
            />
        ));
    }, [modalWidth, collapsedCards, collapseAll, maps]);

    const sortedDisplayData = useMemo(() => {
        return [...displayData].sort((a, b) => (a.props.index > b.props.index ? 1 : b.props.index > a.props.index ? -1 : 0));
    }, [maps, displayData, collapseAll, collapsedCards]);

    return <>{maps.length === 0 ? <span>No maps loaded</span> : sortedDisplayData}</>;
};
