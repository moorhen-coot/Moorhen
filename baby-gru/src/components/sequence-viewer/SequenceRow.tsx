import React, { memo } from "react";
import { SeqElement, Residue } from "./MoorhenSeqViewTypes";

const defaultColour = "rgb(198, 205, 238)";

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
        } = props;

        const renderResidueBox = (sequence: SeqElement, residue: Residue, j: number) => {
            if (!residue) {
                return (
                    <div
                        key={sequence.molNo + sequence.chain + "empty" + j}
                        className="moorhen__seqviewer__residue-box msv__empty"
                        style={{ "--column-width": `${columnWidth}rem` } as React.CSSProperties}
                    ></div>
                );
            } else {
                const colour = residue.colour ? residue.colour : sequence.colour ? sequence.colour : defaultColour;
                const colorAlternate = !sequence.blockAlternateColour
                    ? j % 2 === 0
                        ? "msv__even"
                        : "msv__odd"
                    : "msv__solid";
                const className = `moorhen__seqviewer__residue-box ${colorAlternate} ${
                    residue.selected ? "msv__selected" : ""
                } ${hoveredResidue === residue.resNum ? "msv__hover" : ""} ${isGliding ? "glideSelect" : ""}`;
                return (
                    <div
                        role="button"
                        key={sequence.molNo + sequence.chain + residue.resNum}
                        className={className}
                        style={
                            {
                                "--overlay-color": colour,
                                "--column-width": `${columnWidth}rem`,
                                fontSize: `${fontSize}rem`,
                            } as React.CSSProperties
                        }
                        data-molname={sequence.molName}
                        data-molno={sequence.molNo}
                        data-chain={sequence.chain}
                        data-resnum={
                            residue.resNum - (sequence.residuesDisplayOffset ? sequence.residuesDisplayOffset : 0)
                        }
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
                <div
                    className="moorhen__seqviewer__residues-container"
                    style={{ display: "flex", flexDirection: "row" }}
                >
                    {sequence.residues.map((residue, j) => renderResidueBox(sequence, residue, j))}
                </div>
            </div>
        );
    }
);
SequenceRow.displayName = "SequenceRow";
