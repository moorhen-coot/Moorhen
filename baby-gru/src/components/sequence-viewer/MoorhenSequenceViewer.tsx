import { memo, useRef, useState } from "react";
import { clickedResidueType } from "../card/MoleculeCard/MoleculeCard";
import { MoorhenButton } from "../inputs";
import { CustomHorizontalScrollbar } from "./CustomHorizontalScrollbar";
import type { ResiduesSelection, SeqElement } from "./MoorhenSeqViewTypes";
import "./MoorhenSequenceViewer.css";
import { SequenceRow } from "./SequenceRow";

type MoorhenSequenceViewerPropsType = {
    sequences: SeqElement | SeqElement[];
    clickedResidue?: clickedResidueType;
    onResidueClick?: (modelIndex: number, molName: string, chain: string, seqNum: number) => void;
    selectedResidues?: ResiduesSelection;
    setSelectedResidues?: (selection: ResiduesSelection) => void;
    onHoverResidue?: (molName: string, chain: string, resNum: number, resCode: string, resCID: string) => void;
    hoveredResidue?: { molNo: number; chain: string; resNum: number };
    maxDisplayHeight?: number;
    nameColumnWidth?: number;
    columnWidth?: number;
    selectIsActive?: boolean;
    reOrder?: boolean;
    fontSize?: number;
    showTitleBar?: boolean;
    className?: string;
    displayHeight?: number;
    style?: React.CSSProperties;
    showValidationData?: boolean;
    validationTracks?: string[];
};

export const MoorhenSequenceViewer = memo((props: MoorhenSequenceViewerPropsType) => {
    const {
        nameColumnWidth = 2,
        columnWidth = 1,
        reOrder = true,
        fontSize = columnWidth,
        showTitleBar = true,
        className,
        onHoverResidue,
        showValidationData = false,
    } = props;
    const inputArray = Array.isArray(props.sequences) ? props.sequences : [props.sequences];
    const noSequence: boolean = inputArray.length === 0;
    const invalidSequences: boolean = inputArray.some(seqObj => !seqObj || !seqObj.residues || seqObj.residues.length === 0);
    const validationTracks = props.validationTracks
        ? props.validationTracks.map((track, index) => (track === "" ? `empty track ${index + 1}` : track))
        : null;

    const applyOffset = (seqArray: SeqElement[]) =>
        seqArray.map(seq => ({
            ...seq,
            residues: seq.residues.map(res => ({
                ...res,
                resNum: res.resNum + (seq.residuesDisplayOffset ?? 0),
            })),
        }));

    const sequencesArray = noSequence || invalidSequences ? [] : applyOffset(inputArray);

    const seqLength = sequencesArray.length;
    const [isScrolling, setIsScrolling] = useState<boolean>(false);
    const displayHeight = props.displayHeight
        ? props.displayHeight
        : props.maxDisplayHeight < seqLength
          ? props.maxDisplayHeight
          : seqLength;

    //const [displayHeight, setDisplayHeight] = useState<number>(_displayHeight > 0 ? _displayHeight : 1);
    // The stored start can be past the last full window when the display grows
    // or the list shrinks, so it is clamped wherever it is used.
    const [sliceStart, setSliceStart] = useState<number>(0);
    const maxSliceStart = Math.max(0, seqLength - displayHeight);
    const clampedSliceStart = Math.min(sliceStart, maxSliceStart);
    const sequencesSlice: [number, number] = [clampedSliceStart, clampedSliceStart + displayHeight];
    const [mouseIsHovering, setMouseIsHovering] = useState<boolean>(false);

    const [_selectedResidues, _setSelectedResidues] = useState<ResiduesSelection>(props.selectedResidues ? props.selectedResidues : null);

    const selectedResidues = props.setSelectedResidues ? props.selectedResidues : _selectedResidues;
    const setSelectedResidues = props.setSelectedResidues ? props.setSelectedResidues : _setSelectedResidues;

    const [glideSelectStartRes, setGlideSelectStartRes] = useState<ResiduesSelection>(null);
    const [isGliding, setIsGliding] = useState<boolean>(false);
    const clickTimer = useRef<NodeJS.Timeout | null>(null);
    const [hoveredResidue, setHoveredResidue] = useState<{
        molName: string;
        chain: string;
        resNum: number;
        resCode: string;
    }>(null);

    const handleResidueMouseDown = evt => {
        const molNo = Number(evt.currentTarget.dataset.molno);
        const chain = evt.currentTarget.dataset.chain;
        const resNum = Number(evt.currentTarget.dataset.resnum);
        if (evt.shiftKey) {
            return;
        } else {
            setGlideSelectStartRes({ molNo: molNo, chain: chain, range: [resNum, null] });
            clickTimer.current = setTimeout(() => {
                clearClickTimer();
            }, 300);
        }
    };

    const clearClickTimer = () => {
        if (clickTimer.current) {
            clearTimeout(clickTimer.current);
            clickTimer.current = null;
            setIsGliding(true);
        }
    };

    const handleResidueMouseUp = evt => {
        const molName = evt.currentTarget.dataset.molname;
        const molNo = Number(evt.currentTarget.dataset.molno);
        const chain = evt.currentTarget.dataset.chain;
        const resNum = Number(evt.currentTarget.dataset.resnum);
        if (evt.shiftKey) {
            handleShiftSelect(molNo, chain, resNum);
            return;
        }
        if (clickTimer.current) {
            clearClickTimer();
            if (props.onResidueClick) {
                props.onResidueClick(0, molName, chain, resNum);
            }
        }
        if (!isGliding) {
            handleResidueClick(molName, chain, resNum);
        } else {
            handleGlideSelect(molNo, chain, resNum);
        }
        setIsGliding(false);
    };

    const handleGlideSelect = (molNo, chain, resNum) => {
        if (molNo === glideSelectStartRes.molNo && chain === glideSelectStartRes.chain) {
            setSelectedResidues({
                molNo: molNo,
                chain: chain,
                range: [glideSelectStartRes.range[0], resNum],
            });
        } else {
            setGlideSelectStartRes(null);
        }
    };

    const handleShiftSelect = (molNo, chain, resNum) => {
        const currentSelection = selectedResidues;

        let newSelection: ResiduesSelection = currentSelection
            ? {
                  molNo: currentSelection.molNo,
                  chain: currentSelection.chain,
                  range: [...currentSelection.range],
              }
            : null;

        if (!currentSelection) {
            newSelection = {
                molNo: molNo,
                chain: chain,
                range: [resNum, resNum],
            };
        } else if (currentSelection && molNo === currentSelection.molNo && chain === currentSelection.chain) {
            const orderedSelectionRange =
                currentSelection.range[0] < currentSelection.range[1]
                    ? currentSelection.range
                    : [currentSelection.range[1], currentSelection.range[0]];
            if (resNum < orderedSelectionRange[0]) {
                newSelection = {
                    molNo: molNo,
                    chain: chain,
                    range: [resNum, orderedSelectionRange[1]],
                };
            } else if (resNum > orderedSelectionRange[1]) {
                newSelection = {
                    molNo: molNo,
                    chain: chain,
                    range: [orderedSelectionRange[0], resNum],
                };
            }
        }

        if (newSelection !== currentSelection) {
            setSelectedResidues(newSelection);
            // if (props.setSelectedResidue) {
            //     props.setSelectedResidue(newSelection);
            // }
        }
    };

    const handleResidueClick = (molName, chain, resNum) => {
        setIsGliding(false);
        if (props.onResidueClick) props.onResidueClick(0, molName, chain, resNum);
    };

    /** this part is the scroll down functionality */
    const holdInterval = useRef<NodeJS.Timeout | null>(null);
    const timeoutScroll = useRef<NodeJS.Timeout | null>(null);
    const startScrollUp = val => {
        scroll(val);

        timeoutScroll.current = setTimeout(() => {
            holdInterval.current = setInterval(() => {
                scroll(val);
            }, 200);
        }, 500);
    };

    // Uses the functional update so the hold-to-scroll interval, which keeps
    // the closure from the render it started in, still sees the latest slice.
    const scroll = val => {
        setSliceStart(prev => Math.max(0, Math.min(Math.min(prev, maxSliceStart) + val, maxSliceStart)));
    };

    const stopScroll = () => {
        clearTimeout(timeoutScroll.current);
        clearInterval(holdInterval.current);
        holdInterval.current = null;
        timeoutScroll.current = null;
    };

    // const handleChangeDisplaySize = val => {
    //     if (val > 0 && displayHeight < sequencesArray.length) {
    //         setDisplayHeight(prev => Math.min(prev + 1, props.maxDisplayHeight));
    //     } else if (val < 0) {
    //         setDisplayHeight(prev => Math.max(prev - 1, 1));
    //     }
    // };

    const [sequencesToDisplay, minVal, maxVal] = (() => {
        if (noSequence || invalidSequences) {
            return [null, 0, 0];
        }
        const sequenceElements: SeqElement[] = [];
        let orderedSequences: SeqElement[] = [];
        const selectionRange = selectedResidues?.range;
        const orderedSelectionRange =
            selectionRange && selectionRange[0] < selectionRange[1] ? selectionRange : [selectionRange?.[1], selectionRange?.[0]];
        if (reOrder) {
            orderedSequences = sequencesArray.slice().sort((a, b) => {
                const chainA = a.chain.toUpperCase();
                const chainB = b.chain.toUpperCase();
                if (chainA < chainB) return -1;
                if (chainA > chainB) return 1;
                return 0;
            });
        } else {
            orderedSequences = sequencesArray;
        }

        const slicedSequences = orderedSequences.slice(sequencesSlice[0], sequencesSlice[1]);

        const maxVal =
            Math.max(
                ...slicedSequences.map(seqObj => {
                    const sequence = seqObj.residues;
                    return sequence[sequence.length - 1].resNum;
                })
            ) + 1;

        const minVal = Math.min(
            ...slicedSequences.map(seqObj => {
                const sequence = seqObj.residues;
                return sequence[0].resNum;
            })
        );

        slicedSequences.forEach(seqObj => {
            const sequence = seqObj.residues;
            const molNo = seqObj.molNo;
            const chain = seqObj.chain;
            const lastResi = sequence[sequence.length - 1].resNum;
            const firstResi = sequence[0].resNum;
            const residues = [];
            const residueByNum = new Map(sequence.map(residue => [residue.resNum, residue]));

            for (let i = minVal; i < maxVal; i++) {
                const resi = residueByNum.get(i);
                if (!resi) {
                    if (i < firstResi) {
                        residues.push(null);
                    } else if (i < lastResi) {
                        if (seqObj.missingAs === "none") {
                            residues.push(null);
                        } else {
                            residues.push({
                                resNum: i,
                                resCode: seqObj.missingAs ? seqObj.missingAs : "-",
                                resCID: "",
                                selected: false,
                                hovered: false,
                            });
                        }
                    } else {
                        residues.push(null);
                    }
                } else {
                    let selected = false;
                    if (isGliding) {
                        if (glideSelectStartRes && molNo === glideSelectStartRes.molNo && chain === glideSelectStartRes.chain) {
                            if (glideSelectStartRes.range[0] === resi.resNum) {
                                selected = true;
                            }
                        }
                    } else {
                        if (selectedResidues && molNo === selectedResidues.molNo && chain === selectedResidues.chain) {
                            if (resi.resNum >= orderedSelectionRange[0] && resi.resNum <= orderedSelectionRange[1]) {
                                selected = true;
                            }
                        }
                    }

                    residues.push({
                        ...resi,
                        selected: selected,
                    });
                }
            }
            sequenceElements.push({
                ...seqObj,
                residues: residues,
            });
        });
        return [sequenceElements, minVal, maxVal];
    })();

    const tickMarks = (() => {
        if (noSequence || invalidSequences) {
            return null;
        }
        const ticks = [];
        let startVal = minVal;
        const mod = minVal % 5;
        if (mod !== 1 && mod !== -4) {
            const n = (6 - mod) % 5;
            ticks.push(
                <div
                    key={"start tick"}
                    className={`moorhen__seqviewer__tick-mark`}
                    style={{ maxWidth: columnWidth * n + "rem", minWidth: columnWidth * n + "rem" }}
                ></div>
            );
            startVal += n;
        }

        for (let i = startVal; i < maxVal; i = i + 5) {
            const left = maxVal - i;
            ticks.push(
                <div
                    key={"tick " + i}
                    className={`moorhen__seqviewer__tick-mark`}
                    style={
                        left < 5
                            ? { maxWidth: left * columnWidth + "rem", minWidth: left * columnWidth + "rem" }
                            : { maxWidth: columnWidth * 5 + "rem", minWidth: columnWidth * 5 + "rem" }
                    }
                >
                    {i}
                </div>
            );
        }
        return ticks;
    })();

    const handleResidueMouseOver = evt => {
        const resNum = Number(evt.currentTarget.dataset.resnum);
        const chain = evt.currentTarget.dataset.chain;
        const molName = evt.currentTarget.dataset.molname;
        const resCode = evt.currentTarget.dataset.rescode;

        if (onHoverResidue && mouseIsHovering && !isScrolling) {
            const resCID = evt.currentTarget.dataset.rescid;
            onHoverResidue(molName, chain, resNum, resCode, resCID);
        }
        setHoveredResidue({
            molName: molName,
            chain: chain,
            resCode: resCode,
            resNum: resNum,
        });
    };

    const hoveredRef =
        props.hoveredResidue && !mouseIsHovering && sequencesArray.some(seqObj => seqObj.molNo === props.hoveredResidue.molNo)
            ? {
                  molno: props.hoveredResidue.molNo,
                  chain: props.hoveredResidue.chain,
                  resNum: props.hoveredResidue.resNum,
              }
            : null;

    const listOfSeqs: React.JSX.Element[] = (() => {
        if (noSequence || invalidSequences) {
            return null;
        }
        return sequencesToDisplay?.map((seqObj, index) => {
            const hoveredResidue = hoveredRef
                ? seqObj.molNo === hoveredRef.molno && seqObj.chain === hoveredRef.chain
                    ? hoveredRef.resNum
                    : null
                : null;
            return (
                <SequenceRow
                    key={`${seqObj.molNo}-${seqObj.chain}-${seqObj.key ? seqObj.key : index}`}
                    sequence={seqObj}
                    nameColumnWidth={nameColumnWidth}
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
            );
        });
    })();

    const leftButtonsBar =
        seqLength > displayHeight ? (
            <div className="moorhen__seqviewer-updown-buttons-bar">
                <MoorhenButton type="icon-only" icon="MatSymArrowUpward" onMouseDown={() => startScrollUp(-1)} onMouseUp={stopScroll} />
                <MoorhenButton type="icon-only" icon="MatSymArrowDownward" onMouseDown={() => startScrollUp(+1)} onMouseUp={stopScroll} />
                {/* {seqLength > 1 ? (
                <>
                    <div onClick={() => handleChangeDisplaySize(1)}>
                        <AddOutlined></AddOutlined>
                    </div>
                    <div onClick={() => handleChangeDisplaySize(-1)}>
                        <RemoveOutlined></RemoveOutlined>
                    </div>
                </>
            ) : null} */}
            </div>
        ) : null;

    const scrollbarKey = `${sequencesToDisplay?.length}-${minVal}-${maxVal}-${displayHeight}`;

    if (noSequence) {
        return <div className="moorhen__seqviewer-container moorhen__seqviewer-no-sequence">No sequences available</div>;
    }

    if (invalidSequences) {
        return <div>Some sequences are empty or invalid</div>;
    }

    return (
        <>
            <div
                className={`moorhen__seqviewer-container ${className ?? ""}`}
                // style={{ ...props.style, height: (showTitleBar ? 72 : 50) + displayHeight * 26 + "px" }}
                /** Detect mouse on the seq viewer to switch to css hover of the residues box => better (feeling of) performance*/
                onMouseEnter={() => {
                    setMouseIsHovering(true);
                }}
                onMouseLeave={() => {
                    setMouseIsHovering(false);
                }}
            >
                <div>
                    {showTitleBar && (
                        <div className="moorhen__seqviewer__hovered-residue-info">
                            <div>
                                {hoveredResidue
                                    ? `Chain: ${hoveredResidue.chain} Res: ${hoveredResidue.resNum} ${hoveredResidue.resCode}`
                                    : "Chain: - Res: -"}
                            </div>
                        </div>
                    )}
                </div>
                <div style={{ display: "flex", flexDirection: "row" }}>
                    {leftButtonsBar}
                    <CustomHorizontalScrollbar key={scrollbarKey} onDraggingChange={setIsScrolling}>
                        <div className="moorhen__seqviewer__sticky-tick-marks">
                            <div style={{ minWidth: `${nameColumnWidth}rem`, maxWidth: `${nameColumnWidth}rem` }}></div>
                            {tickMarks}
                        </div>
                        {listOfSeqs}
                    </CustomHorizontalScrollbar>
                </div>
            </div>
        </>
    );
});
MoorhenSequenceViewer.displayName = "MoorhenSequenceViewer";
