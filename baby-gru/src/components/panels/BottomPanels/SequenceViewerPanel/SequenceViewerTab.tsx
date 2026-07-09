;import { MoorhenButton, MoorhenMoleculeSelect, MoorhenNumberInput, MoorhenPopoverButton } from "@/components/inputs";

export type SequenceViewerOption = {
    showExpandButton: boolean;
    nOfLines:number;
    expanded: boolean;
    selectedMolecule: number
};

export const SequenceViewerTab = (props: {
    bottomPanelIsShown: boolean;
    toggleBottomPanel: () => void;
    seqviewerOption: SequenceViewerOption;
    setSeqViewerOption: React.Dispatch<SequenceViewerOption>;
}) => {
    const { bottomPanelIsShown, toggleBottomPanel, seqviewerOption,setSeqViewerOption } = props;

    const handleExpand = () => {
        setSeqViewerOption({...seqviewerOption, expanded: !seqviewerOption.expanded})
    }

    const setSelectedMolecule = (val) => {
        setSeqViewerOption({...seqviewerOption, selectedMolecule: val})
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
                setValue={val => setSeqViewerOption({...seqviewerOption, nOfLines: val})}
                width="4rem"
            />
        </div>
    );

    return (
        <div
            className={`moorhen__bottom-panel-tab ${bottomPanelIsShown ? "" : "moorhen__sequence-panel-tab-panel-is-hidden"}`}
            // style={{ left: `${(GlViewportWidth - convertRemToPx(10)) / 2}px`, bottom: expand ? `${displaySize - 1}px` : "76px" }}
        >
            {bottomPanelIsShown && <MoorhenPopoverButton size="small">{configPanel}</MoorhenPopoverButton>}
            <button className="moorhen__bottom-panel-button" onClick={toggleBottomPanel}>
                &nbsp;&nbsp;Sequences&nbsp;&nbsp;
            </button>
            {bottomPanelIsShown &&
                (seqviewerOption.showExpandButton ? (
                    <MoorhenButton
                        type="icon-only"
                        icon={seqviewerOption.expanded ? "MatSymDoubleArrowDown" : "MatSymDoubleArrowUp"}
                        size="small"
                        onClick={handleExpand}
                    />
                ) : (
                    <span>&nbsp;&nbsp;</span>
                ))}
        </div>
    );
};
