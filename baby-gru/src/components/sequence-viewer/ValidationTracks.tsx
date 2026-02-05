import React, { memo } from "react";
import { getColorFromGradient } from "../inputs";
import { gradientPresets } from "../inputs/MoorhenGradientPicker/gradientPresets";
import { MoorhenPopover, MoorhenStack } from "../interface-base";
import { Residue, SeqElement } from "./MoorhenSeqViewTypes";

interface ValidationTracksProps {
    sequence: SeqElement;
    residue: Residue | null;
    columnWidth?: number;
    handleResidueMouseUp?: (evt: React.MouseEvent<HTMLDivElement>) => void;
    validationTracks?: string[];
    popoverRef?: React.RefObject<HTMLDivElement>;
}

export const ValidationTracks = memo((props: ValidationTracksProps) => {
    const { sequence, residue, columnWidth, validationTracks = ["Overall RMSZ", "Density Correlation"] } = props;

    const [isPopoverShown, setIsPopoverShown] = React.useState<boolean>(false);

    const trackData = validationTracks.map(track => residue?.validationData?.[track] ?? { value: null });

    const tracks = trackData.map(data => {
        const value = Array.isArray(data.value) ? data.value[0] : data.value;
        const reverseGradient = data.reverseGradient ?? false;
        return (
            <div
                className="moorhen__seqviewer__residue-validation-box-top"
                style={
                    {
                        "--column-width": `${columnWidth}rem`,
                        "--bar-color": `${getColorFromGradient(data.gradientPreset ?? "Pool Party", value, reverseGradient, true)}`,
                        "--bar-height": `${value * 100}%`,
                    } as React.CSSProperties
                }
            />
        );
    });

    const validationDataCategories = Array.from(new Set(Object.values(residue?.validationData ?? {}).map(data => data.category)));
    const popoverContent =
        validationDataCategories.length > 0 ? (
            validationDataCategories.map(category => {
                const categoryData = Object.entries(residue?.validationData ?? {}).filter(([key, data]) => data.category === category);
                return (
                    <MoorhenStack direction="column" inputGrid card key={category}>
                        <span style={{ fontWeight: "bold", marginBottom: "0.5rem", display: "block" }}>{category}</span>
                        <div />
                        {categoryData.map(([key, data]) => (
                            <PopoverDisplayValue
                                key={key}
                                label={key}
                                value={data.value}
                                reverseColour={data.reverseGradient}
                                gradientPreset={data.gradientPreset ?? "Pool Party"}
                            />
                        ))}
                    </MoorhenStack>
                );
            })
        ) : (
            <span style={{ fontStyle: "italic" }}>No validation data available</span>
        );

    if (validationTracks.length > 0) {
        return (
            <MoorhenPopover
                isShown={isPopoverShown}
                setIsShown={setIsPopoverShown}
                linkRef={props.popoverRef}
                link={
                    <div
                        data-molname={sequence.molName}
                        data-molno={sequence.molNo}
                        data-chain={sequence.chain}
                        data-resnum={residue.resNum - (sequence.residuesDisplayOffset ? sequence.residuesDisplayOffset : 0)}
                        data-rescode={residue.resCode}
                        data-rescid={residue.resCID}
                        onMouseEnter={() => setIsPopoverShown(true)}
                        onMouseLeave={() => setIsPopoverShown(false)}
                        onMouseUp={props.handleResidueMouseUp}
                    >
                        {tracks}
                    </div>
                }
            >
                <span style={{ fontWeight: "bold", marginBottom: "0.5rem", display: "block" }}>
                    Residue Info: {sequence.chain} - {residue.resCode}
                    {residue.resNum}
                </span>
                {popoverContent}
                <span style={{ fontSize: "0.8rem", marginTop: "0.5rem", display: "block" }}>⟐ : Higher values are better </span>
            </MoorhenPopover>
        );
    } else {
        return null;
    }
});

const PopoverDisplayValue = (props: {
    label: string;
    value: number | [number, number];
    reverseColour?: boolean;
    gradientPreset?: keyof typeof gradientPresets;
}) => {
    const score = Array.isArray(props.value) ? props.value[0] : props.value;
    const label = Array.isArray(props.value) ? props.value[1] : props.value;
    const reverseColour = props.reverseColour ?? false;
    return (
        <MoorhenStack direction="row" align="center" gap="0.5rem">
            {props.label}: {label.toFixed(2)}
            <MoorhenStack direction="row" align="center" gap="0.25rem">
                <div
                    className="moorhen__seqviewer__residue-validation-popup-bar"
                    style={
                        {
                            "--bar-length": `${score * 100}%`,
                            "--bar-color": `${getColorFromGradient(props.gradientPreset ?? "Pool Party", score, reverseColour, true)}`,
                        } as React.CSSProperties
                    }
                />

                <span style={{ fontSize: "0.8rem" }}>{reverseColour && "⟐"}</span>
            </MoorhenStack>
        </MoorhenStack>
    );
};

ValidationTracks.displayName = "ValidationTracks";
