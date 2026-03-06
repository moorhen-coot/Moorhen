import { useEffect, useState } from "react";
import { MoorhenButton } from "@/components/inputs";

export const CollapseAllCardsToggle = (props: { keyList: number[]; allOpen; setAllOpen: (val) => void; activeToggle: { key; isOpen } }) => {
    const { allOpen, setAllOpen, keyList, activeToggle } = props;
    const [closedCards, setClosedCards] = useState<number[]>([]);

    useEffect(() => {
        if (!activeToggle.isOpen) {
            setAllOpen(null);
            setClosedCards(current => [...current, activeToggle.key]);
        } else {
            setAllOpen(null);
            setClosedCards(current => current.filter(card => card !== activeToggle.key));
        }
    }, [activeToggle]);

    const allManuallyClosed = keyList.every(key => closedCards.includes(key));

    const handleAllToggle = () => {
        if (allOpen === false || allManuallyClosed) {
            setAllOpen(true);
            setClosedCards([]);
        } else {
            setAllOpen(false);
            setClosedCards(keyList);
        }
    };
    const expand = allOpen === false || allManuallyClosed;
    return (
        <MoorhenButton
            type="icon-only"
            icon={expand ? "MatSymExpand" : "MatSymCollapse"}
            onClick={handleAllToggle}
            tooltip={expand ? "Expand all" : "Collapse all"}
            size="medium"
        />
    );
};
