import { useSelector } from "react-redux";
import { MoorhenSequenceViewer, moorhenSequenceToSeqViewer } from "../sequence-viewer";
import { moorhen } from "../../types/moorhen";

export const EdgePanelSequenceViewer = () => {
    const molecule = useSelector((state: moorhen.State) => state.molecules.moleculeList[0]);
    const sidePanelIsShown = useSelector((state: moorhen.State) => state.globalUI.sidePanelIsShown);

    if (!molecule || !molecule.sequences || molecule.sequences.length === 0) {
        return <div> No Sequences to be shown</div>;
    }
    const sequences = molecule.sequences.map((sequence) =>
        moorhenSequenceToSeqViewer(sequence, molecule.name, molecule.molNo)
    );

    const handleClick = (modelIndex: number, molName: string, chain: string, seqNum: number) => {
        molecule.centreOn(`//${chain}/${seqNum}/*`);
    };

    return (
        <MoorhenSequenceViewer
            sequences={sequences}
            maxDisplayHeight={1}
            showTitleBar={false}
            onResidueClick={handleClick}
            className={`moorhen__edge-panel-sequence-viewer ${
                sidePanelIsShown ? "moorhen__edge-panel-sequence-viewer--side-panel-visible" : ""
            }`}
        />
    );
};
