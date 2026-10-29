import React, { memo, useRef } from "react";
import { MoorhenStack, MoorhenTooltip } from "../interface-base";
import { Residue, SeqElement } from "./MoorhenSeqViewTypes";
import { ResidueBox } from "./ResidueBox";
import { ValidationTracks } from "./ValidationTracks";

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
            validationTracks = undefined,
        } = props;
        const validationTracksLabels = showValidationData
            ? validationTracks?.map((value, index) => {
                return (

                    <MoorhenTooltip key={`validation-track-label-${index}`} tooltip={`${value}`}>
                        <div className={`moorhen__seqviewer__sticky-left-column-validation-track-label`}
                        >
                            {value}
                        </div>
                    </MoorhenTooltip>
                );
            })
            : null;

        const residueColumns =
            sequence.residues?.map((residue, j) => (
                <ResidueColumn
                    key={sequence.molNo + sequence.chain + (sequence.key ?? "") + `column${j}`}
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
            )) ?? [];

        return (
            <MoorhenStack direction="row">
                <div
                    className="moorhen__seqviewer__sticky-left-column"
                    style={{ minWidth: `${nameColumnWidth}rem`, maxWidth: `${nameColumnWidth}rem` }}
                >
                    <div className="moorhen__seqviewer__sticky-left-column-seqName">
                        {sequence.displayName ? sequence.displayName : `${sequence.chain}`}</div>
                    {validationTracksLabels}
                </div>

                <div
                    className="moorhen__seqviewer__left-column-spacer"
                    style={{ minWidth: `${nameColumnWidth}rem`, maxWidth: `${nameColumnWidth}rem` }}
                />
                <div className="moorhen__seqviewer__residues-container" style={{ display: "flex", flexDirection: "row" }}>
                    {residueColumns}
                </div>
            </MoorhenStack>
        );
    }
);
SequenceRow.displayName = "SequenceRow";

// One residue and its validation tracks. The column element anchors the
// validation popover, so each column owns its ref.
const ResidueColumn = (props: {
    sequence: SeqElement;
    residue: Residue | null;
    index: number;
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
    const columnRef = useRef<HTMLDivElement>(null);
    return (
        <div ref={columnRef} style={{ display: "flex", flexDirection: "column" }}>
            <ResidueBox {...props} />
            {props.showValidationData && (
                <ValidationTracks
                    sequence={props.sequence}
                    residue={props.residue}
                    columnWidth={props.columnWidth}
                    handleResidueMouseUp={props.handleResidueMouseUp}
                    validationTracks={props.validationTracks}
                    popoverRef={columnRef}
                />
            )}
        </div>
    );
};
