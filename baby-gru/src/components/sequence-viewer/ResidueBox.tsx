import React, { memo, useRef } from "react";
import { getColorFromGradient } from "../inputs";
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
    validationTracks?: "default" | string[];
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
        showValidationData = true,
        validationTracks = "default",
    } = props;
    const linkRef = useRef<HTMLDivElement | null>(null);
    const [isPopoverShown, setIsPopoverShown] = React.useState<boolean>(false);

    const geoValue = Math.max(
        ...(residue && residue.validationData && validationTracks === "default"
            ? Object.entries(residue.validationData)
                  .filter(([key]) => ["Rotamer", "Ramachandran", "Bonds", "Angles", "Peptide Omega"].includes(key))
                  .map(([, value]) => (Array.isArray(value) ? value[0] : value))
            : [])
    );
    console.log("geoValue", geoValue);

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
                ref={linkRef}
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
                >
                    {!sequence.hideResCode ? (residue.resCode ? residue.resCode : " ") : " "}
                </div>
                {showValidationData &&
                    validationTracks === "default" &&
                    (() => {
                        const validationRandomValue = Math.random() * 100;
                        return (
                            <MoorhenPopover
                                isShown={isPopoverShown}
                                setIsShown={setIsPopoverShown}
                                linkRef={linkRef}
                                link={
                                    <div onMouseEnter={() => setIsPopoverShown(true)} onMouseLeave={() => setIsPopoverShown(false)}>
                                        <div
                                            className="moorhen__seqviewer__residue-validation-box-top"
                                            style={
                                                {
                                                    "--column-width": `${columnWidth}rem`,
                                                    "--bar-color": `${getColorFromGradient("Pool Party", geoValue, false, true)}`,
                                                    "--bar-height": `${geoValue * 100}%`,
                                                } as React.CSSProperties
                                            }
                                        />
                                        <div
                                            className="moorhen__seqviewer__residue-validation-box-bottom"
                                            style={
                                                {
                                                    "--column-width": `${columnWidth}rem`,
                                                    "--bar-color": `${getColorFromGradient("Pool Party", (100 - validationRandomValue) / 100, false, true)}`,
                                                    "--bar-height": `${100 - validationRandomValue}%`,
                                                } as React.CSSProperties
                                            }
                                        />
                                    </div>
                                }
                            >
                                <>
                                    <span style={{ fontWeight: "bold", marginBottom: "0.5rem", display: "block" }}>
                                        Chain:{sequence.chain} - {residue.resCode}
                                        {residue.resNum}
                                    </span>
                                    <MoorhenStack direction="column" inputGrid>
                                        {residue.validationData &&
                                            Object.entries(residue.validationData).map(([key, score]) => (
                                                <PopoverDisplayValue key={key} label={key} value={score} />
                                            ))}
                                    </MoorhenStack>
                                </>
                            </MoorhenPopover>
                        );
                    })()}
            </div>
        );
    }
});

const PopoverDisplayValue = (props: { label: string; value: number | [number, number] }) => {
    const score = Array.isArray(props.value) ? props.value[0] : props.value;
    const label = Array.isArray(props.value) ? props.value[1] : props.value * 100;
    return (
        <MoorhenStack direction="row" align="center" gap="0.5rem">
            {props.label}: {label.toFixed(2)}
            <div
                className="moorhen__seqviewer__residue-validation-popup-bar"
                style={
                    {
                        "--bar-length": `${score * 100}%`,
                        "--bar-color": `${getColorFromGradient("Pool Party", score, false, true)}`,
                    } as React.CSSProperties
                }
            />
        </MoorhenStack>
    );
};

ResidueBox.displayName = "ResidueBox";
