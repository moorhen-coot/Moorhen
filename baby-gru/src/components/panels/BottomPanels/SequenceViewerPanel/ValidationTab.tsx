import { useSelector } from "react-redux";
import { useState } from "react";
import { MoorhenButton, MoorhenMoleculeSelect, MoorhenNumberInput, MoorhenPopoverButton } from "@/components/inputs";
import { MoorhenInfoCard } from "@/components/interface-base";
import { RootState } from "@/store";
import { convertRemToPx } from "@/utils/utils";

export const ValidationTab = (props: { bottomPanelIsShown: boolean; toggleBottomPanel: () => void; showExpandButton: boolean }) => {
    const { bottomPanelIsShown, toggleBottomPanel, showExpandButton } = props;
    const sidePanelIsOpen = useSelector((state: RootState) => state.globalUI.shownSidePanel !== null);
    const GlViewportWidth = useSelector((state: RootState) => state.sceneSettings.GlViewportWidth);
    const expand = true;

    const [selectedMolecule, setSelectedMolecule] = useState<number>(-999);
    const [numberOfLines, setNumberOfLines] = useState<number>(4);

    const infoPanel = (
        <>
            <h1>Validation Panel</h1>
        </>
    );
    const configPanel = (
        <div>
            <MoorhenMoleculeSelect onSelect={setSelectedMolecule} selectedMolecule={selectedMolecule} />
            <p></p>
            <MoorhenNumberInput
                label="Max lines"
                labelPosition="left"
                minMax={[1, 10]}
                type="numberForm"
                decimalDigits={0}
                value={numberOfLines}
                setValue={val => setNumberOfLines(val)}
                width="4rem"
            />
        </div>
    );

    return (
        <div className={`moorhen__bottom-panel-tab ${bottomPanelIsShown ? "" : "moorhen__sequence-panel-tab-panel-is-hidden"}`}>
            {bottomPanelIsShown && <MoorhenPopoverButton size="small">{configPanel}</MoorhenPopoverButton>}
            <button className="moorhen__bottom-panel-button" onClick={toggleBottomPanel}>
                &nbsp;&nbsp;Validation&nbsp;&nbsp;
            </button>
            {bottomPanelIsShown && <MoorhenInfoCard infoText={infoPanel} />}
        </div>
    );
};
