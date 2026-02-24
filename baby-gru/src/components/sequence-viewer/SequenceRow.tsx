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
        const refList: React.RefObject<HTMLDivElement>[] = sequence.residues?.map(() => useRef<HTMLDivElement>(null)) ?? [];

        const residueBoxes = sequence.residues?.map((residue, j) => (
            <div key={sequence.molNo + sequence.chain + `box${j}`} ref={refList[j]}>
                <ResidueBox
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
            </div>
        ));

        const validationTracksLabels = showValidationData
            ? validationTracks?.map((value, index) => {
                  return (
                      <div
                          className="moorhen__seqviewer__sticky-left-column"
                          style={{
                              minWidth: `${nameColumnWidth}rem`,
                              maxWidth: `${nameColumnWidth}rem`,
                              height: "1.5rem",
                              top: `${1 + 1.5 * (index + 1)}rem`,
                          }}
                      >
                          <MoorhenTooltip tooltip={`${value}`}>
                              <div
                                  style={{
                                      display: "flex",
                                      width: "100%",
                                      textAlign: "left",
                                      fontSize: "0.75rem",
                                      fontStyle: "italic",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      lineHeight: "1",
                                  }}
                              >
                                  {value}
                              </div>
                          </MoorhenTooltip>
                      </div>
                  );
              })
            : null;

        const validationTracksComponents = showValidationData
            ? sequence.residues.map((residue, j) => (
                  <ValidationTracks
                      key={sequence.molNo + sequence.chain + `box${j}` + "_validation"}
                      popoverRef={refList[j]}
                      sequence={sequence}
                      residue={residue}
                      columnWidth={columnWidth}
                      handleResidueMouseUp={handleResidueMouseUp}
                      validationTracks={validationTracks}
                  />
              ))
            : null;

        return (
            <MoorhenStack direction="row">
                <div
                    className="moorhen__seqviewer__sticky-left-column"
                    style={{ minWidth: `${nameColumnWidth}rem`, maxWidth: `${nameColumnWidth}rem` }}
                >
                    {sequence.displayName ? sequence.displayName : `${sequence.chain}`}
                </div>
                {validationTracksLabels}
                <div
                    className="moorhen__seqviewer__left-column-spacer"
                    style={{ minWidth: `${nameColumnWidth}rem`, maxWidth: `${nameColumnWidth}rem` }}
                />
                <MoorhenStack direction="column">
                    <div className="moorhen__seqviewer__residues-container" style={{ display: "flex", flexDirection: "row" }}>
                        {residueBoxes}
                    </div>
                    <div className="moorhen__seqviewer__residues-container" style={{ display: "flex", flexDirection: "row" }}>
                        {validationTracksComponents}
                    </div>
                </MoorhenStack>
            </MoorhenStack>
        );
    }
);
SequenceRow.displayName = "SequenceRow";
