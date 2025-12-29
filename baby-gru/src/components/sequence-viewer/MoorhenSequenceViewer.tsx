import { memo, useCallback, useMemo, useRef, useState } from "react";
import { useStateWithRef } from "../../hooks/useStateWithRef";
import { clickedResidueType } from "../card/MoleculeCard/MoorhenMoleculeCard";
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
    onResiduesSelect?: (selection: ResiduesSelection) => void;
    useMainStateResidueSelections?: boolean;
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
    forceRedrawScrollBarKey?: string | number;
    style?: React.CSSProperties;
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
    } = props;
    const inputArray = useMemo(() => (Array.isArray(props.sequences) ? props.sequences : [props.sequences]), [props.sequences]);
    const noSequence: boolean = inputArray.length === 0;
    const invalidSequences: boolean = inputArray.some(seqObj => !seqObj || !seqObj.residues || seqObj.residues.length === 0);

    const applyOffset = (seqArray: SeqElement[]) =>
        seqArray.map(seq => ({
            ...seq,
            residues: seq.residues.map(res => ({
                ...res,
                resNum: res.resNum + (seq.residuesDisplayOffset ?? 0),
            })),
        }));

    const sequencesArray = useMemo(() => {
        if (noSequence || invalidSequences) return [];
        return applyOffset(inputArray);
    }, [inputArray, noSequence, invalidSequences]);

    const seqLength = sequencesArray.length;
    const [, setIsScrolling, isScrollingRef] = useStateWithRef<boolean>(false);
    const displayHeight = props.displayHeight
        ? props.displayHeight
        : props.maxDisplayHeight < seqLength
          ? props.maxDisplayHeight
          : seqLength;

    //const [displayHeight, setDisplayHeight] = useState<number>(_displayHeight > 0 ? _displayHeight : 1);
    const [sequencesSlice, setSequencesSlices] = useState<[number, number]>([0, displayHeight]);
    const [mouseIsHovering, setMouseIsHovering, mouseIsHoveringRef] = useStateWithRef<boolean>(false);
    const [internalSelectedResidues, setInternalSelectedResidues, internalSelectedResiduesRef] = useStateWithRef<ResiduesSelection>(
        props.selectedResidues ? props.selectedResidues : null
    );
    const selectedResidues = props.selectedResidues === undefined ? internalSelectedResidues : props.selectedResidues;

    const [glideSelectStartRes, setGlideSelectStartRes, glideSelectStartResRef] = useStateWithRef<ResiduesSelection>(null);
    const [isGliding, setIsGliding, isGlidingRef] = useStateWithRef<boolean>(false);
    const clickTimer = useRef<NodeJS.Timeout | null>(null);
    const [hoveredResidue, setHoveredResidue] = useState<{
        molName: string;
        chain: string;
        resNum: number;
        resCode: string;
    }>(null);

    const handleResidueMouseDown = useCallback(evt => {
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
    }, []);

    const clearClickTimer = () => {
        if (clickTimer.current) {
            clearTimeout(clickTimer.current);
            clickTimer.current = null;
            setIsGliding(true);
        }
    };

    const handleResidueMouseUp = useCallback(evt => {
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
        if (!isGlidingRef.current) {
            handleResidueClick(molName, chain, resNum);
        } else {
            handleGlideSelect(molNo, chain, resNum);
        }
        setIsGliding(false);
    }, []);

    const handleGlideSelect = (molNo, chain, resNum) => {
        if (molNo === glideSelectStartResRef.current.molNo && chain === glideSelectStartResRef.current.chain) {
            setInternalSelectedResidues({
                molNo: molNo,
                chain: chain,
                range: [glideSelectStartResRef.current.range[0], resNum],
            });
            if (props.onResiduesSelect) {
                props.onResiduesSelect({
                    molNo: molNo,
                    chain: chain,
                    range: [glideSelectStartResRef.current.range[0], resNum],
                });
            }
        } else {
            setGlideSelectStartRes(null);
        }
    };

    const handleShiftSelect = (molNo, chain, resNum) => {
        const currentSelection = internalSelectedResiduesRef.current;

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
            setInternalSelectedResidues(newSelection);
            if (props.onResiduesSelect) {
                props.onResiduesSelect(newSelection);
            }
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

    const scroll = val => {
        if (sequencesSlice[0] === 0 && val < 0) {
            return;
        }
        if (sequencesSlice[1] === sequencesArray.length && val > 0) {
            return;
        }

        setSequencesSlices(prev => {
            if (prev[0] === 0 && val < 0) return prev;
            if (prev[1] === sequencesArray.length && val > 0) return prev;
            return [prev[0] + val, prev[0] + val + displayHeight];
        });
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

    useMemo(() => {
        if (noSequence || invalidSequences) return [];
        setSequencesSlices(current => [current[0], current[0] + displayHeight]);
    }, [inputArray, displayHeight, noSequence, invalidSequences]);

    const [sequencesToDisplay, minVal, maxVal] = useMemo(() => {
        if (noSequence || invalidSequences) {
            return [null, 0, 0];
        }
        const sequenceElements: SeqElement[] = [];
        let orderedSequences: SeqElement[] = [];
        const orderedSelectionRange =
            selectedResidues?.range[0] < selectedResidues?.range[1]
                ? selectedResidues?.range
                : [selectedResidues?.range[1], selectedResidues?.range[0]];
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

            for (let i = minVal; i < maxVal; i++) {
                if (!sequence.some(residue => residue.resNum === i)) {
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
                    const resi = sequence.find(residue => residue.resNum === i);

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
    }, [
        sequencesArray,
        sequencesSlice,
        isGliding,
        glideSelectStartRes,
        props.selectedResidues,
        internalSelectedResidues,
        noSequence,
        invalidSequences,
        inputArray,
    ]);

    const tickMarks = useMemo(() => {
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
    }, [maxVal, minVal, columnWidth, noSequence, invalidSequences]);

    let hoveredRef: { molno: number; chain: string; resNum: number } | null = null;

    const handleResidueMouseOver = useCallback(
        evt => {
            const resNum = Number(evt.currentTarget.dataset.resnum);
            const chain = evt.currentTarget.dataset.chain;
            const molName = evt.currentTarget.dataset.molname;
            const resCode = evt.currentTarget.dataset.rescode;

            if (onHoverResidue && mouseIsHoveringRef.current && !isScrollingRef.current) {
                const resCID = evt.currentTarget.dataset.rescid;
                onHoverResidue(molName, chain, resNum, resCode, resCID);
            }
            setHoveredResidue({
                molName: molName,
                chain: chain,
                resCode: resCode,
                resNum: resNum,
            });
        },
        [onHoverResidue, setHoveredResidue, mouseIsHoveringRef, isScrollingRef]
    );

    if (props.hoveredResidue && !mouseIsHovering) {
        if (sequencesArray.some(seqObj => seqObj.molNo === props.hoveredResidue.molNo)) {
            hoveredRef = {
                molno: props.hoveredResidue.molNo,
                chain: props.hoveredResidue.chain,
                resNum: props.hoveredResidue.resNum,
            };
        }
    } else {
        hoveredRef = null;
    }

    const listOfSeqs: React.JSX.Element[] = useMemo(() => {
        if (noSequence || invalidSequences) {
            return null;
        }
        return sequencesToDisplay?.map(seqObj => {
            const hoveredResidue = hoveredRef
                ? seqObj.molNo === hoveredRef.molno && seqObj.chain === hoveredRef.chain
                    ? hoveredRef.resNum
                    : null
                : null;
            return (
                <SequenceRow
                    key={seqObj.molNo + seqObj.chain}
                    sequence={seqObj}
                    nameColumnWidth={nameColumnWidth}
                    columnWidth={columnWidth}
                    fontSize={fontSize}
                    hoveredResidue={hoveredResidue}
                    isGliding={isGlidingRef.current}
                    handleResidueMouseOver={handleResidueMouseOver}
                    handleResidueMouseDown={handleResidueMouseDown}
                    handleResidueMouseUp={handleResidueMouseUp}
                />
            );
        });
    }, [
        noSequence,
        invalidSequences,
        sequencesToDisplay,
        hoveredRef,
        nameColumnWidth,
        columnWidth,
        fontSize,
        isGlidingRef,
        handleResidueMouseOver,
        handleResidueMouseDown,
        handleResidueMouseUp,
    ]);

    const leftButtonsBar =
        seqLength > displayHeight ? (
            <div className="moorhen__seqviewer-updown-buttons-bar">
                <MoorhenButton type="icon-only" icon="MUISymbolArrowUpward" onMouseDown={() => startScrollUp(-1)} onMouseUp={stopScroll} />
                <MoorhenButton
                    type="icon-only"
                    icon="MUISymbolArrowDownward"
                    onMouseDown={() => startScrollUp(+1)}
                    onMouseUp={stopScroll}
                />
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

    const scrollbarKey = useMemo(() => {
        return `${sequencesToDisplay?.length}-${minVal}-${maxVal}-${displayHeight}`;
    }, [sequencesToDisplay?.length, minVal, maxVal, displayHeight]);

    if (noSequence) {
        return <div className="moorhen__seqviewer-no-sequence">No sequences available</div>;
    }

    if (invalidSequences) {
        return <div>Some sequences are empty or invalid</div>;
    }

    return (
        <>
            <div
                className={`moorhen__seqviewer-container ${className}`}
                style={{ ...props.style, height: (showTitleBar ? 72 : 50) + displayHeight * 26 + "px" }}
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
                    <CustomHorizontalScrollbar
                        key={scrollbarKey}
                        style={{ width: seqLength > displayHeight ? "calc(100% - 40px)" : "100%" }}
                        onDraggingChange={setIsScrolling}
                        forceRedrawScrollBarKey={props.forceRedrawScrollBarKey}
                    >
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
