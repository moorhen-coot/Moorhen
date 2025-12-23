import { useSelector } from "react-redux";
import { useEffect, useRef, useState } from "react";
import { MoorhenMoleculeCard } from "@/components/card/MoleculeCard/MoorhenMoleculeCard";
import { RootState } from "@/store";
import { convertRemToPx, convertViewtoPx } from "@/utils/utils";

export const ModelsPanel = () => {
    const cardListRef = useRef([]);

    const [currentDropdownMolNo, setCurrentDropdownMolNo] = useState<number>(-1);

    // const height = useSelector((state: RootState) => state.sceneSettings.height);
    // const width = useSelector((state: RootState) => state.sceneSettings.width);
    const molecules = useSelector((state: RootState) => state.molecules.moleculeList);

    useEffect(() => {
        cardListRef.current = cardListRef.current.slice(0, molecules.length);
    }, [molecules]);

    const displayData = molecules.map((molecule, index) => {
        return (
            <MoorhenMoleculeCard
                // ref={el => (cardListRef.current[index] = el)}
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
            />
        );
    });
    displayData.sort((a, b) => (a.props.index > b.props.index ? 1 : b.props.index > a.props.index ? -1 : 0));

    return <>{displayData.length === 0 ? <span>No models loaded</span> : displayData}</>;
};
