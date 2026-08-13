import { useDispatch, useSelector } from "react-redux";
import { useState } from "react";
import { MoorhenMapSelect, MoorhenMoleculeSelect, MoorhenNumberInput, MoorhenSelect } from "@/components/inputs";
import { MoorhenInfoCard, MoorhenStack } from "@/components/interface-base";
import { RootState, setShownBottomPanel, setValidationOption } from "@/store";
import { BaseSequenceViewerTab } from "./BaseSequenceViewerTab";

const presets = {
    Default: ["Overall RMSZ", "Density Correlation"],
    RotaRama: ["Rota. ZScore", "Rama. ZScore"],
    Geometry: ["Bond RMSZ", "Angle RMSZ", "Chiral RMSZ", "Plane RMSZ", "Torsion RMSZ"],
    MMRRCC: ["MMRRCC All Atoms", "MMRRCC Side Chain"],
} 

export const ValidationTab = () => {
    const isActiveTab = useSelector((state: RootState) => state.bottomPanels.shownBottomPanel === "validation");
    const validationOption = useSelector((state: RootState) => state.bottomPanels.validationOption);
    const [preset, setPreset] = useState<string>("Default");
    const dispatch = useDispatch();

    const [numberOfLines, setNumberOfLines] = useState<number>(2);

    const handleTitleClick = () => {
        dispatch(setShownBottomPanel(isActiveTab ? null : "validation"))
    }

    const handleMoleculeSelect = (val: string) => {
        dispatch(setValidationOption({ ...validationOption, selectedMolecule: val }))
    }

    const handleMapSelect = (val: string) => {
        dispatch(setValidationOption({ ...validationOption, selectedMap: val }))
    }

    const handlePresetChange = (val: string) => {
        setPreset(val);
        if (val !== "Custom") {
            const newShownData = presets[val];
            dispatch(setValidationOption({ ...validationOption, shownData: newShownData }));
        }
    }

    const handleColumnWidthChange = (val: number) => {
        dispatch(setValidationOption({ ...validationOption, columnWidth: val }));
    }

    const handleNumberOfLinesChange = (val: number) => {
        setNumberOfLines(val);
        const newShownData = [...validationOption.shownData];
        while (newShownData.length < val) {
            newShownData.push("");
        }
        while (newShownData.length > val) {
            newShownData.pop();
        }
        dispatch(setValidationOption({ ...validationOption, shownData: newShownData }));
    }

    const availableData = validationOption.availableData.map(trackName => (
        <option key={trackName} value={trackName}>
            {trackName}
        </option>
    ));

    const dataSelectors = (Array.from({ length: numberOfLines }, (_, index) => (
        <MoorhenSelect
            key={`Track ${index + 1}`}
            label={`Track ${index + 1}`}
            value={validationOption.shownData[index] || "Empty"}
            onChange={(e) => {
                const newShownData = [...validationOption.shownData];
                newShownData[index] = e.target.value;
                dispatch(setValidationOption({ ...validationOption, shownData: newShownData }));
            }}
        >
            <option key="Empty" value="Empty">
                Empty
            </option>
            {availableData}
        </MoorhenSelect>)));

    const presetOptions = Object.keys(presets).map(presetName => (
        <option key={presetName} value={presetName}>
            {presetName}
        </option>
    ));


    const infoPanel = (
        <>
            <h1>Validation Panel</h1>
        </>
    );


    const configPanel = (<>
        <MoorhenStack inputGrid>
            <MoorhenMoleculeSelect useUniqueId setSelectedMolecule={handleMoleculeSelect} selectedMolecule={validationOption.selectedMolecule} />
           <MoorhenMapSelect useUniqueId setSelectedMap={handleMapSelect} selectedMap={validationOption.selectedMap} />
            <MoorhenSelect label="Preset" value={preset} setValue={handlePresetChange}>
                {presetOptions}
                <option key="Custom" value="Custom">
                    Custom
                </option>
            </MoorhenSelect>
            <MoorhenNumberInput
                label="Column width"
                labelPosition="left"
                minMax={[0.5, 1.5]}
                type="numberForm"
                decimalDigits={1}
                value={validationOption.columnWidth}
                setValue={handleColumnWidthChange}
                width="4rem"
            />
        </MoorhenStack>

{preset === "Custom" && <MoorhenStack inputGrid card>
            <MoorhenNumberInput
                label="Number of tracks"
                labelPosition="left"
                minMax={[1, 10]}
                type="numberForm"
                decimalDigits={0}
                value={numberOfLines}
                setValue={handleNumberOfLinesChange}
                width="4rem"
            />
            {dataSelectors}
        </MoorhenStack>}</>

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
