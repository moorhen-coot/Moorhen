import React, { memo, useRef } from "react";
import { getColorFromGradient } from "../inputs";
import { gradientPresets } from "../inputs/MoorhenGradientPicker/gradientPresets";
import { MoorhenPopover, MoorhenStack } from "../interface-base";
import { Residue, SeqElement } from "./MoorhenSeqViewTypes";

const defaultColour = "rgb(198, 205, 238)";

interface ResidueBoxProps {
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
}

export const ResidueBox = memo((props: ResidueBoxProps) => {
    const {
        sequence,
        residue,
        index,
        columnWidth,
        fontSize,
        hoveredResidue = null,
        isGliding = false,
        handleResidueMouseOver,
        handleResidueMouseDown,
        handleResidueMouseUp,
    } = props;

    if (!residue) {
        return (
            <div
                key={sequence.molNo + sequence.chain + "empty" + index}
                className="moorhen__seqviewer__residue-box msv__empty"
                style={{ "--column-width": `${columnWidth}rem` } as React.CSSProperties}
            ></div>
        );
    } else {
        const colour = residue.colour ? residue.colour : sequence.colour ? sequence.colour : defaultColour;
        const colorAlternate = !sequence.blockAlternateColour ? (index % 2 === 0 ? "msv__even" : "msv__odd") : "msv__solid";
        const className = `moorhen__seqviewer__residue-box ${colorAlternate} ${
            residue.selected ? "msv__selected" : ""
        } ${hoveredResidue === residue.resNum ? "msv__hover" : ""} ${isGliding ? "glideSelect" : ""}`;
        return (
            <div
                role="button"
                key={sequence.molNo + sequence.chain + residue.resNum}
                className={className}
                data-molname={sequence.molName}
                data-molno={sequence.molNo}
                data-chain={sequence.chain}
                data-resnum={residue.resNum - (sequence.residuesDisplayOffset ? sequence.residuesDisplayOffset : 0)}
                data-rescode={residue.resCode}
                data-rescid={residue.resCID}
                onMouseOver={handleResidueMouseOver}
                onMouseDown={handleResidueMouseDown}
                onMouseUp={handleResidueMouseUp}
                style={
                    {
                        "--overlay-color": colour,
                        "--column-width": `${columnWidth}rem`,
                        fontSize: `${fontSize}rem`,
                    } as React.CSSProperties
                }
            >
                {!sequence.hideResCode ? (residue.resCode ? residue.resCode : " ") : " "}
            </div>
        );
    }
});
