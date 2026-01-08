import { useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { MoorhenMoleculeCard } from "@/components/card/MoleculeCard/MoorhenMoleculeCard";
import { MoorhenButton } from "@/components/inputs";
import { RootState } from "@/store";
import { convertRemToPx } from "@/utils/utils";
import { PanelContainer } from "../PanelContainer";
import { CollapseAllCardsToggle } from "../utils/CollapseAllCardsToggle";

export const ModelsPanel = () => {
    const [currentDropdownMolNo, setCurrentDropdownMolNo] = useState<number>(-1);
    const molecules = useSelector((state: RootState) => state.molecules.moleculeList);

    const [allOpen, setallOpen] = useState<boolean | null>(null);
    const [activeToggle, setActiveToggle] = useState<{ key: number; isOpen: boolean }>({ key: null, isOpen: null });
    const extraControl = (
        <CollapseAllCardsToggle
            keyList={molecules.map(molecules => molecules.molNo)}
            allOpen={allOpen}
            setAllOpen={setallOpen}
            activeToggle={activeToggle}
        />
    );

    const displayData = molecules.map((molecule, index) => {
        return (
            <MoorhenMoleculeCard
                showSideBar={true}
                busy={false}
                dropdownId={1}
                accordionDropdownId={1}
                setAccordionDropdownId={arg0 => {}}
                sideBarWidth={convertRemToPx(37)}
                key={molecule.molNo}
                index={molecule.molNo}
                molecule={molecule}
                currentDropdownMolNo={currentDropdownMolNo}
                setCurrentDropdownMolNo={setCurrentDropdownMolNo}
                open={allOpen}
                onCollapseToggle={(key, isOpen) => setActiveToggle({ key: key, isOpen: isOpen })}
            />
        );
    });
    displayData.sort((a, b) => (a.props.index > b.props.index ? 1 : b.props.index > a.props.index ? -1 : 0));

    return (
        <PanelContainer title="Molecules" extraControls={extraControl}>
            {displayData.length === 0 ? <span>No models loaded</span> : displayData}
        </PanelContainer>
    );
};
