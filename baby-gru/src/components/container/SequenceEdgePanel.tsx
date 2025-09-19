import { MoorhenSequenceViewer, moorhenSequenceToSeqViewer } from "../sequence-viewer";
import { useSelector } from "react-redux";
import { moorhen } from "../../types/moorhen";

export const EdgePanelSequenceViewer = () => {
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList);

    if (!molecules || molecules.length === 0) {
        return <div></div>;
    }
    return (
        <MoorhenSequenceViewer
            sequences={moorhenSequenceToSeqViewer(molecules[0].sequences[0], molecules[0].name, molecules[0].molNo)}
            maxDisplayHeight={1}
            showTitleBar={false}
            className="moorhen__edge-panel-sequence-viewer"
        />
    );
};
