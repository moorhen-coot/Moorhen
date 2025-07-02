
import React, { memo } from 'react';
import { MoorhenSeqViewTypes } from './MoorhenSequenceViewer';
const defaultColour = 'rgb(198, 205, 238)';

export const SequenceRow = memo((props: { 
    sequence: MoorhenSeqViewTypes.SeqElement,
    nameColumnWidth?: number,
    columnWidth?: number,
    fontSize?: number,
    hoveredResidue?: number | null
    isGliding?: boolean,
    handleResidueMouseOver?: (evt: React.MouseEvent<HTMLDivElement>) => void,
    handleResidueMouseDown?: (evt: React.MouseEvent<HTMLDivElement>) => void
    handleResidueMouseUp?: (evt: React.MouseEvent<HTMLDivElement>) => void,
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
        handleResidueMouseUp 
    } = props;

     const renderResidueBox = (sequence: MoorhenSeqViewTypes.SeqElement, residue: MoorhenSeqViewTypes.Residue, j: number) => {
        if (!residue) {
            return (
                <div key={sequence.molNo + sequence.chain + 'empty' + j} className="residue-box empty" style={{ "--column-width": `${columnWidth}rem` } as React.CSSProperties}></div>
            );
        } else {
            const colour = residue.colour ? residue.colour  : sequence.colour ? sequence.colour : defaultColour;
            const colorAlternate = !sequence.blockAlternateColour ? (j % 2 === 0 ? "even" : "odd") : "solid";
            const className = `residue-box ${colorAlternate} ${residue.selected ? 'selected' : ''} ${hoveredResidue === residue.resNum ? 'hover' : ''} ${isGliding ? 'glideSelect' : ''}`;
            return (
                <div
                    key={sequence.molNo + sequence.chain + residue.resNum}
                    className={className}
                    style={{ "--overlay-color": colour, "--column-width": `${columnWidth}rem`, fontSize:`${fontSize}rem`} as React.CSSProperties}
                    data-molname={sequence.molName}
                    data-molno={sequence.molNo}
                    data-chain={sequence.chain}
                    data-resnum={residue.resNum - (sequence.residuesDisplayOffset ? sequence.residuesDisplayOffset : 0)}
                    data-rescode={residue.resCode}
                    data-rescid={residue.resCID}
                    onMouseOver={handleResidueMouseOver}
                    onMouseDown={handleResidueMouseDown} 
                    onMouseUp={handleResidueMouseUp}
                >
                    {!sequence.hideResCode ? (residue.resCode ? residue.resCode : " ") : " "}
                </div>
            );
        }
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", width: "fit-content" }} key={sequence.molName + sequence.chain + "_row"}>
            <div
                style={{ display: "flex", flexDirection: "row" }}>
                <div className="sticky-left-column"
                    style={{ minWidth: `${nameColumnWidth}rem`, maxWidth: `${nameColumnWidth}rem` }}>
                    {sequence.displayName ? sequence.displayName : `${sequence.chain}`}
                </div>
                <div className="residues-container" style={{ display: "flex", flexDirection: "row" }}>
                    {sequence.residues.map((residue, j) => renderResidueBox(sequence, residue, j))}
                </div>
            </div>
        </div>
    );
});
SequenceRow.displayName = "SequenceRow";