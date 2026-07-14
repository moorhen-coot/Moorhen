;import { MoorhenMoleculeSelect, MoorhenNumberInput } from "@/components/inputs";
import { setSeqViewerOption, setShownBottomPanel } from "@/store";
import { RootState } from "@/store/MoorhenReduxStore";
import { useDispatch, useSelector } from "react-redux";
import { BaseSequenceViewerTab } from "./BaseSequenceViewerTab";


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
        <div>
            <MoorhenMoleculeSelect useUniqueId onSelect={setSelectedMolecule} selectedMolecule={seqviewerOption.selectedMolecule} />
            <p></p>
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
        </div>
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
