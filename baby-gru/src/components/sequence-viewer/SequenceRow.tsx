import React, { memo } from "react";
import { Residue, SeqElement } from "./MoorhenSeqViewTypes";
import { ResidueBox } from "./ResidueBox";

export const SequenceRow = memo(
    (props: {
        sequence: SeqElement;
        nameColumnWidth?: number;
        columnWidth?: number;
        fontSize?: number;
        hoveredResidue?: number | null;
        isGliding?: boolean;
        handleResidueMouseOver?: (evt: React.MouseEvent<HTMLDivElement>) => void;
        handleResidueMouseDown?: (evt: React.MouseEvent<HTMLDivElement>) => void;
        handleResidueMouseUp?: (evt: React.MouseEvent<HTMLDivElement>) => void;
        showValidationData?: boolean;
        validationTracks?: string[];
    }) => {
        const {
            sequence,
            nameColumnWidth,
            columnWidth,
            fontSize,
            hoveredResidue = null,
            isGliding = false,
            handleResidueMouseOver,
            handleResidueMouseDown,
            handleResidueMouseUp,
            showValidationData = true,
            validationTracks = "default",
        } = props;

        return (
            <div style={{ display: "flex", flexDirection: "row" }} key={sequence.molName + sequence.chain + "_row"}>
                <div
                    className="moorhen__seqviewer__sticky-left-column"
                    style={{ minWidth: `${nameColumnWidth}rem`, maxWidth: `${nameColumnWidth}rem` }}
                >
                    {sequence.displayName ? sequence.displayName : `${sequence.chain}`}
                </div>
                <div
                    className="moorhen__seqviewer__left-column-spacer"
                    style={{ minWidth: `${nameColumnWidth}rem`, maxWidth: `${nameColumnWidth}rem` }}
                ></div>
                <div className="moorhen__seqviewer__residues-container" style={{ display: "flex", flexDirection: "row" }}>
                    {sequence.residues.map((residue, j) => (
                        <ResidueBox
                            key={sequence.molNo + sequence.chain + (residue?.resNum ?? `empty${j}`)}
                            sequence={sequence}
                            residue={residue}
                            index={j}
                            columnWidth={columnWidth}
                            fontSize={fontSize}
                            hoveredResidue={hoveredResidue}
                            isGliding={isGliding}
                            handleResidueMouseOver={handleResidueMouseOver}
                            handleResidueMouseDown={handleResidueMouseDown}
                            handleResidueMouseUp={handleResidueMouseUp}
                            showValidationData={showValidationData}
                            validationTracks={validationTracks}
                        />
                    ))}
                </div>
            </div>
        );
    }
);
SequenceRow.displayName = "SequenceRow";
