import { useDispatch, useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { MoleculeCard } from "@/components/card/MoleculeCard/MoleculeCard";
import { MoorhenButton } from "@/components/inputs";
import { RootState, setShownSidePanel } from "@/store";
import { convertRemToPx } from "@/utils/utils";
import { CollapseAllCardsToggle } from "./utils/CollapseAllCardsToggle";
import { SidePanelContainer } from "./utils/SidePanelContainer";

export const ModelsPanel = () => {
    const [currentDropdownMolNo, setCurrentDropdownMolNo] = useState<number>(-1);
    const moleculeList = useSelector((state: RootState) => state.molecules.moleculeList);
    const dispatch = useDispatch();
    // Molecules of ligands only are listed in the Ligands panel, not given a card each here
    const records = useSelector((state: RootState) => state.molecules.moleculeRecords);
    const molecules = moleculeList.filter(molecule => !records[molecule.uniqueId]?.isLigandOnly);
    const ligandMolecules = moleculeList.filter(molecule => records[molecule.uniqueId]?.isLigandOnly);

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
            <MoleculeCard
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
        <SidePanelContainer title="Molecules" extraControls={extraControl}>
            {displayData.length === 0 && ligandMolecules.length === 0 ? <span>No models loaded</span> : displayData}
            {ligandMolecules.length > 0 && (
                <div className="moorhen__models-panel-ligands-note">
                    <span>
                        {ligandMolecules.length} ligand-only molecule{ligandMolecules.length === 1 ? "" : "s"}
                    </span>
                    <MoorhenButton onClick={() => dispatch(setShownSidePanel("ligands"))}>Ligands panel</MoorhenButton>
                </div>
            )}
        </SidePanelContainer>
    );
};
