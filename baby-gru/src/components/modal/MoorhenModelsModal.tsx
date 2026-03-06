import { UnfoldLessOutlined } from "@mui/icons-material";
import { Button } from "react-bootstrap";
import { useSelector } from "react-redux";
import { useCallback, useEffect, useRef, useState } from "react";
import { moorhen } from "../../types/moorhen";
import { modalKeys } from "../../utils/enums";
import { convertRemToPx, convertViewtoPx } from "../../utils/utils";
import { MoleculeCard } from "../card/MoleculeCard/MoleculeCard";
import { MoorhenButton } from "../inputs";
import { MoorhenDraggableModalBase } from "../interface-base/ModalBase/DraggableModalBase";

export const MoorhenModelsModal = () => {
    const cardListRef = useRef([]);

    const [currentDropdownMolNo, setCurrentDropdownMolNo] = useState<number>(-1);

    const height = useSelector((state: moorhen.State) => state.sceneSettings.height);
    const width = useSelector((state: moorhen.State) => state.sceneSettings.width);
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);

    useEffect(() => {
        cardListRef.current = cardListRef.current.slice(0, molecules.length);
    }, [molecules]);

    const handleCollapseAll = useCallback(() => {
        cardListRef.current.forEach(card => {
            card.forceIsCollapsed(true);
        });
    }, [cardListRef.current, cardListRef]);

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
            />
        );
    });
    displayData.sort((a, b) => (a.props.index > b.props.index ? 1 : b.props.index > a.props.index ? -1 : 0));

    return (
        <MoorhenDraggableModalBase
            modalId={modalKeys.MODELS}
            left={width - (convertRemToPx(55) + 100)}
            top={height / 4}
            initialHeight={convertViewtoPx(40, height)}
            initialWidth={convertRemToPx(55)}
            minHeight={convertViewtoPx(10, height)}
            minWidth={convertRemToPx(20)}
            maxHeight={convertViewtoPx(90, height)}
            maxWidth={convertRemToPx(55)}
            headerTitle={"Models"}
            additionalHeaderButtons={[
                <MoorhenButton
                    variant="white"
                    key="collapse-all-maps"
                    style={{ margin: "0.1rem", padding: "0.1rem" }}
                    onClick={handleCollapseAll}
                >
                    <UnfoldLessOutlined />
                </MoorhenButton>,
            ]}
            body={molecules.length === 0 ? <span>No models loaded</span> : displayData}
            footer={null}
        />
    );
};
