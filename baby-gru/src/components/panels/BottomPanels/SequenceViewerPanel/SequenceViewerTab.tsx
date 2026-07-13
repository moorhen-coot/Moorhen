;import { MoorhenButton, MoorhenMoleculeSelect, MoorhenNumberInput, MoorhenPopoverButton } from "@/components/inputs";
import { setSeqViewerOption, setShownBottomPanel } from "@/store";
import { RootState } from "@/store/MoorhenReduxStore";
import { useDispatch, useSelector } from "react-redux";


export type SequenceViewerOption = {
    showExpandButton: boolean;
    nOfLines:number;
    expanded: boolean;
    selectedMolecule: number
};

export const SequenceViewerTab = () => {
    const isActiveTab = useSelector((state: RootState) => state.bottomPanels.shownBottomPanel === "sequences-viewer");
    const seqviewerOption = useSelector((state: RootState) => state.bottomPanels.seqviewerOption);

    const dispatch = useDispatch();

    const handleExpand = () => {
        dispatch(setSeqViewerOption({...seqviewerOption, expanded: !seqviewerOption.expanded}))
    }

    const setSelectedMolecule = (val) => {
        dispatch(setSeqViewerOption({...seqviewerOption, selectedMolecule: val}))
    }

    const handleTitleClick = () => {
        dispatch(setShownBottomPanel(isActiveTab ? null : "sequences-viewer"))
    }

    const configPanel = (
        <div>
            <MoorhenMoleculeSelect onSelect={setSelectedMolecule} selectedMolecule={seqviewerOption.selectedMolecule} />
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
        <div
            className={`moorhen__bottom-panel-tab ${isActiveTab  ? "" : "background"}`}
            // style={{ left: `${(GlViewportWidth - convertRemToPx(10)) / 2}px`, bottom: expand ? `${displaySize - 1}px` : "76px" }}
        >
            {isActiveTab && (<MoorhenPopoverButton size="small">{configPanel}</MoorhenPopoverButton>)}
            <button className="moorhen__bottom-panel-button" onClick={handleTitleClick}>
                &nbsp;&nbsp;Sequences&nbsp;&nbsp;
            </button>
            { isActiveTab && (
                (seqviewerOption.showExpandButton ? (
                    <MoorhenButton
                        type="icon-only"
                        icon={seqviewerOption.expanded ? "MatSymDoubleArrowDown" : "MatSymDoubleArrowUp"}
                        size="small"
                        onClick={handleExpand}
                    />
                ) : (
                    <span>&nbsp;&nbsp;</span>
                )))}
        </div>
    );
};
