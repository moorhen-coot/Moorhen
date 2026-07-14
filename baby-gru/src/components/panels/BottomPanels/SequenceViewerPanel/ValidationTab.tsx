import { useDispatch, useSelector } from "react-redux";
import { useState } from "react";
import { MoorhenMapSelect, MoorhenMoleculeSelect, MoorhenNumberInput } from "@/components/inputs";
import { MoorhenInfoCard, MoorhenStack } from "@/components/interface-base";
import { RootState, setShownBottomPanel, setValidationOption } from "@/store";
import { BaseSequenceViewerTab } from "./BaseSequenceViewerTab";


export const ValidationTab = () => {
    const isActiveTab = useSelector((state: RootState) => state.bottomPanels.shownBottomPanel === "validation");
    const validationOption = useSelector((state: RootState) => state.bottomPanels.validationOption);
    const dispatch = useDispatch();

    const [numberOfLines, setNumberOfLines] = useState<number>(2);

    const handleTitleClick = () => {
        dispatch(setShownBottomPanel(isActiveTab ? null : "validation"))
    }

    const handleMoleculeSelect = (val: string) => {
        dispatch(setValidationOption({...validationOption, selectedMolecule: val}))
    }

    const handleMapSelect = (val: string) => {
        dispatch(setValidationOption({...validationOption, selectedMap: val}))
    }

    const infoPanel = (
        <>
            <h1>Validation Panel</h1>
        </>
    );

    

    const configPanel = (
        <MoorhenStack inputGrid>
            <MoorhenMoleculeSelect useUniqueId setSelectedMolecule={handleMoleculeSelect} selectedMolecule={validationOption.selectedMolecule} />
            <MoorhenMapSelect useUniqueId setSelectedMap={handleMapSelect} selectedMap={validationOption.selectedMap} />
            <MoorhenNumberInput
                label="Number of lines"
                labelPosition="left"
                minMax={[1, 10]}
                type="numberForm"
                decimalDigits={0}
                value={numberOfLines}
                setValue={val => setNumberOfLines(val)}
                width="4rem"
            />
        </MoorhenStack>
    );

    return (
        <BaseSequenceViewerTab
            isActiveTab={isActiveTab}
            onTitleClick={handleTitleClick}
            titleText="Validation"
            configPanel={configPanel}
            infoCard={<MoorhenInfoCard infoText={infoPanel} />}
        />
    );
};
