;import { MoorhenMoleculeSelect, MoorhenNumberInput } from "@/components/inputs";
import { setSeqViewerOption, setShownBottomPanel } from "@/store";
import { RootState } from "@/store/MoorhenReduxStore";
import { useDispatch, useSelector } from "react-redux";
import { BaseSequenceViewerTab } from "./BaseSequenceViewerTab";
import { MoorhenStack } from "@/components/interface-base";


export const SequenceViewerTab = () => {
    const isActiveTab = useSelector((state: RootState) => state.bottomPanels.shownBottomPanel === "sequences-viewer");
    const seqviewerOption = useSelector((state: RootState) => state.bottomPanels.seqviewerOption);

    const dispatch = useDispatch();

    const handleExpand = () => {
        dispatch(setSeqViewerOption({...seqviewerOption, expanded: !seqviewerOption.expanded}))
    }

    const setSelectedMolecule = (val: string) => {
        dispatch(setSeqViewerOption({...seqviewerOption, selectedMolecule: val}))
    }

    const handleTitleClick = () => {
        dispatch(setShownBottomPanel(isActiveTab ? null : "sequences-viewer"))
    }

    const configPanel = (
        <MoorhenStack inputGrid>
            <MoorhenMoleculeSelect useUniqueId setSelectedMolecule={setSelectedMolecule} selectedMolecule={seqviewerOption.selectedMolecule} />
            <MoorhenNumberInput
                label="Max lines"
                labelPosition="left"
                minMax={[1, 10]}
                type="numberForm"
                decimalDigits={0}
                value={seqviewerOption.nOfLines}
                setValue={(val: number) => {
                    dispatch(setSeqViewerOption({ ...seqviewerOption, nOfLines: val }))
                }}
                width="4rem"
            />
                        <MoorhenNumberInput
                label="Column width"
                labelPosition="left"
                minMax={[0.5, 1.5]}
                type="numberForm"
                decimalDigits={1}
                value={seqviewerOption.columnWidth}
                setValue={(val: number) => {
                    dispatch(setSeqViewerOption({ ...seqviewerOption, columnWidth: val }))
                }}
                width="4rem"
            />
        </MoorhenStack>
    );

    return (
        <BaseSequenceViewerTab
            isActiveTab={isActiveTab}
            onTitleClick={handleTitleClick}
            titleText="Sequences"
            configPanel={configPanel}
            showExpandButton={seqviewerOption.showExpandButton}
            expandedState={seqviewerOption.expanded}
            onExpandClick={handleExpand}
        />
    );
};
