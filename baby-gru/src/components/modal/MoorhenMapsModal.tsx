import { UnfoldLessOutlined } from "@mui/icons-material";
import { Button } from "react-bootstrap";
import { useSelector } from "react-redux";
import { useMemo, useState } from "react";
import { moorhen } from "../../types/moorhen";
import { modalKeys } from "../../utils/enums";
import { convertRemToPx, convertViewtoPx } from "../../utils/utils";
import { MoorhenMapCard } from "../card/MoorhenMapCard";
import { MoorhenDraggableModalBase } from "../interface-base/DraggableModalBase";

export const MoorhenMapsModal = () => {
    const [collapseAll, setCollapseAll] = useState<boolean>(false);
    const [collapsedCards, setCollapsedCards] = useState<number[]>([]);
    const width = useSelector((state: moorhen.State) => state.sceneSettings.width);
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height);
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

    const handleCollapseToggle = key => {
        if (collapsedCards.includes(key)) {
            setCollapseAll(false);
            setCollapsedCards(collapsedCards.filter(card => card !== key));
        } else {
            if (collapsedCards.length === 1) {
                setCollapseAll(true);
            }
            setCollapsedCards([...collapsedCards, key]);
        }
    };

    const [modalWidth, setModalWidth] = useState<number>(512);

    const displayData = useMemo(() => {
        return maps.map((map, index) => (
            <MoorhenMapCard
                key={map.molNo}
                map={map}
                initialContour={map.suggestedContourLevel ? map.suggestedContourLevel : 0.8}
                initialRadius={map.suggestedRadius ? map.suggestedRadius : 13}
                isCollapsed={collapsedCards.includes(map.molNo) ? true : false}
                onCollapseToggle={key => handleCollapseToggle(key)}
                modalWidth={modalWidth}
            />
        ));
    }, [modalWidth, collapsedCards, collapseAll, maps]);

    const sortedDisplayData = useMemo(() => {
        return [...displayData].sort((a, b) => (a.props.index > b.props.index ? 1 : b.props.index > a.props.index ? -1 : 0));
    }, [maps, displayData, collapseAll, collapsedCards]);

    return (
        <MoorhenDraggableModalBase
            modalId={modalKeys.MAPS}
            left={width - convertRemToPx(55)}
            top={height - convertViewtoPx(90, height)}
            initialHeight={convertViewtoPx(50, height)}
            initialWidth={convertRemToPx(32)}
            minHeight={convertViewtoPx(10, height)}
            minWidth={convertRemToPx(28)}
            maxHeight={convertViewtoPx(90, height)}
            maxWidth={convertRemToPx(55)}
            onResize={(evt, ref, direction, delta, size) => {
                setModalWidth(size.width);
            }}
            headerTitle={"Maps"}
            additionalHeaderButtons={[
                <Button variant="white" key="collapse-all-maps" style={{ margin: "0.1rem", padding: "0.1rem" }} onClick={handleCollapseAll}>
                    <UnfoldLessOutlined />
                </Button>,
            ]}
            body={maps.length === 0 ? <span>No maps loaded</span> : sortedDisplayData}
            footer={null}
        />
    );
};
