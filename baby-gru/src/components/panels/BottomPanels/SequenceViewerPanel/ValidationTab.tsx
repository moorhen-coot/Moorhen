import { useDispatch, useSelector } from "react-redux";
import { useState } from "react";
import {  MoorhenMoleculeSelect, MoorhenNumberInput, MoorhenPopoverButton } from "@/components/inputs";
import { MoorhenInfoCard } from "@/components/interface-base";
import { RootState, setShownBottomPanel } from "@/store";

export const ValidationTab = () => {
    const isActiveTab = useSelector((state: RootState) => state.bottomPanels.shownBottomPanel === "validation");
    const dispatch = useDispatch();

    const [selectedMolecule, setSelectedMolecule] = useState<number>(-999);
    const [numberOfLines, setNumberOfLines] = useState<number>(4);

        const handleTitleClick = () => {
            dispatch(setShownBottomPanel(isActiveTab ? null : "validation"))
        }

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
        <div className={`moorhen__bottom-panel-tab ${isActiveTab  ? "" : "background"}`}>
            {isActiveTab && <MoorhenPopoverButton size="small">{configPanel}</MoorhenPopoverButton>}
            <button className="moorhen__bottom-panel-button" onClick={handleTitleClick}>
                &nbsp;&nbsp;Validation&nbsp;&nbsp;
            </button>
            {isActiveTab && <MoorhenInfoCard infoText={infoPanel} />}
        </div>
    );
};
