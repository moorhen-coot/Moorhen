import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useStateWithRef } from "../../hooks/useStateWithRef";
import { clickedResidueType } from "../card/MoleculeCard/MoleculeCard";
import { MoorhenButton } from "../inputs";
import type { GradientColourTable, GradientPreset } from "../inputs/MoorhenGradientPicker/gradientPresets";
import { CustomHorizontalScrollbar } from "./CustomHorizontalScrollbar";
import type { HoveredResidue, HoveredResidueSubscription, ResiduesSelection, SeqElement } from "./MoorhenSeqViewTypes";
import "./MoorhenSequenceViewer.css";
import { SequenceRow } from "./SequenceRow";

type MoorhenSequenceViewerPropsType = {
    sequences: SeqElement | SeqElement[];
    clickedResidue?: clickedResidueType;
    onResidueClick?: (modelIndex: number, molName: string, chain: string, seqNum: number) => void;
    selectedResidues?: ResiduesSelection;
    setSelectedResidues?: (selection: ResiduesSelection) => void;
    onHoverResidue?: (molName: string, chain: string, resNum: number, resCode: string, resCID: string) => void;
    /** The residue to highlight as hovered. Prefer subscribeToHoveredResidue: a change of this prop re-renders the viewer. */
    hoveredResidue?: HoveredResidue;
    /** Highlights the hovered residue it reports, outside React (no re-render at mouse rate) */
    subscribeToHoveredResidue?: HoveredResidueSubscription;
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
    showValidationData?: boolean;
    validationTracks?: string[];
    /** The colour gradient of the validation tracks, as a preset name or as colour stops (0 is the good end) */
    validationGradient?: GradientPreset | GradientColourTable;
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
        validationGradient,
    } = props;
    const inputArray = useMemo(() => (Array.isArray(props.sequences) ? props.sequences : [props.sequences]), [props.sequences]);
    const noSequence: boolean = inputArray.length === 0;
    const invalidSequences: boolean = inputArray.some(seqObj => !seqObj || !seqObj.residues || seqObj.residues.length === 0);
    const validationTracks = useMemo(() => {
        if (!props.validationTracks) {
            return null;
        }
        return props.validationTracks.map((track, index) => (track === "" ? `empty track ${index + 1}` : track));
    }, [props.validationTracks]);


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
    const mouseIsHoveringRef = useRef<boolean>(false);
    
    const [_selectedResidues, _setSelectedResidues] = useState<ResiduesSelection>(
        props.selectedResidues ? props.selectedResidues : null
    );
    const selectedResiduesRef = useRef<ResiduesSelection>(props.selectedResidues ? props.selectedResidues : null);

    const selectedResidues = props.setSelectedResidues ? props.selectedResidues : _selectedResidues;
    selectedResiduesRef.current = selectedResidues;
    const setSelectedResidues = props.setSelectedResidues ? props.setSelectedResidues : _setSelectedResidues;


    const [glideSelectStartRes, setGlideSelectStartRes, glideSelectStartResRef] = useStateWithRef<ResiduesSelection>(null);
    const [isGliding, setIsGliding, isGlidingRef] = useStateWithRef<boolean>(false);
    const clickTimer = useRef<NodeJS.Timeout | null>(null);

    const handleResidueMouseDown = useCallback(evt => {
        const molNo = Number(evt.currentTarget.dataset.molno);
        const chain = evt.currentTarget.dataset.chain;
        const resNum = Number(evt.currentTarget.dataset.resnum);
        if (evt.shiftKey) {
            return;
        } else {
            setGlideSelectStartRes({ molNo: molNo, chain: chain, range: [resNum, null] });
            clearClickTimer();
            // Long press: once the timer fires, the mouse up will select (single residue or range)
            clickTimer.current = setTimeout(() => {
                clickTimer.current = null;
                setIsGliding(true);
            }, 300);
        }
    }, []);

    const clearClickTimer = () => {
        if (clickTimer.current) {
            clearTimeout(clickTimer.current);
            clickTimer.current = null;
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
        const start = glideSelectStartResRef.current;
        const isDrag = start && (start.molNo !== molNo || start.chain !== chain || start.range[0] !== resNum);
        const isShortClick = clickTimer.current !== null;
        clearClickTimer();
        if (start && (isDrag || !isShortClick)) {
            // Long click (selects the residue) or click-and-drag (selects the range)
            handleGlideSelect(molNo, chain, resNum);
        } else {
            // Short click on a single residue: center on it only, no selection
            handleResidueClick(molName, chain, resNum);
        }
        setGlideSelectStartRes(null);
        setIsGliding(false);
    }, []);

    const handleGlideSelect = (molNo, chain, resNum) => {
        if (molNo === glideSelectStartResRef.current.molNo && chain === glideSelectStartResRef.current.chain) {
            setSelectedResidues({
                molNo: molNo,
                chain: chain,
                range: [glideSelectStartResRef.current.range[0], resNum],
            });
        } else {
            setGlideSelectStartRes(null);
        }
    };

    const handleShiftSelect = (molNo, chain, resNum) => {
        const currentSelection = selectedResiduesRef.current;

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
        selectedResidues,
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

    /**
     * The hovered residue (from the 3D view, or the viewer itself through onHoverResidue) is shown
     * outside React: a data-hovered attribute moved from residue box to residue box, so no component
     * re-renders at mouse rate. An attribute, not a class: React rewrites className when the
     * selection changes, but leaves an attribute it does not manage alone.
     */
    const containerRef = useRef<HTMLDivElement>(null);
    const hoveredInfoRef = useRef<HTMLDivElement>(null);
    const hoveredResidueRef = useRef<HoveredResidue | null>(null);
    const hoveredElementsRef = useRef<Element[]>([]);

    const applyHoveredResidue = useCallback(() => {
        const residue = hoveredResidueRef.current;
        const container = containerRef.current;
        const elements =
            residue && container
                ? Array.from(
                      container.querySelectorAll(
                          `.moorhen__seqviewer__residue-box[data-molno="${residue.molNo}"][data-chain="${CSS.escape(residue.chain)}"][data-resnum="${residue.resNum}"]`
                      )
                  )
                : [];
        hoveredElementsRef.current.forEach(element => {
            if (!elements.includes(element)) element.removeAttribute("data-hovered");
        });
        elements.forEach(element => element.setAttribute("data-hovered", ""));
        hoveredElementsRef.current = elements;
    }, []);

    const { subscribeToHoveredResidue, hoveredResidue: hoveredResidueProp } = props;
    useEffect(() => {
        if (!subscribeToHoveredResidue) return;
        return subscribeToHoveredResidue(residue => {
            hoveredResidueRef.current = residue;
            applyHoveredResidue();
        });
    }, [subscribeToHoveredResidue, applyHoveredResidue]);

    useEffect(() => {
        if (subscribeToHoveredResidue) return;
        hoveredResidueRef.current = hoveredResidueProp ?? null;
        applyHoveredResidue();
    }, [hoveredResidueProp, subscribeToHoveredResidue, applyHoveredResidue]);

    // Residue boxes mounted by a render (scrolled into view, sequences changed) get the attribute too
    useLayoutEffect(() => {
        applyHoveredResidue();
    });

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
            // The title bar is written directly: a state would re-render the viewer at mouse rate
            if (hoveredInfoRef.current) {
                hoveredInfoRef.current.textContent = `Chain: ${chain} Res: ${resNum} ${resCode}`;
            }
        },
        [onHoverResidue, isScrollingRef]
    );

    const listOfSeqs: React.JSX.Element[] = useMemo(() => {
        if (noSequence || invalidSequences) {
            return null;
        }
        return sequencesToDisplay?.map((seqObj, index) => {
            return (
                <SequenceRow
                    key={`${seqObj.molNo}-${seqObj.chain}-${seqObj.key ? seqObj.key : index}`}
                    sequence={seqObj}
                    nameColumnWidth={nameColumnWidth}
                    columnWidth={columnWidth}
                    fontSize={fontSize}
                    isGliding={isGlidingRef.current}
                    handleResidueMouseOver={handleResidueMouseOver}
                    handleResidueMouseDown={handleResidueMouseDown}
                    handleResidueMouseUp={handleResidueMouseUp}
                    showValidationData={showValidationData}
                    validationTracks={validationTracks}
                    validationGradient={validationGradient}
                />
            );
        });
    }, [
        noSequence,
        invalidSequences,
        sequencesToDisplay,
        nameColumnWidth,
        columnWidth,
        fontSize,
        isGlidingRef,
        handleResidueMouseOver,
        handleResidueMouseDown,
        handleResidueMouseUp,
        validationTracks,
        validationGradient,
    ]);

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

    const scrollbarKey = useMemo(() => {
        return `${sequencesToDisplay?.length}-${minVal}-${maxVal}-${displayHeight}`;
    }, [sequencesToDisplay?.length, minVal, maxVal, displayHeight]);

    if (noSequence) {
        return <div className="moorhen__seqviewer-container moorhen__seqviewer-no-sequence">No sequences available</div>;
    }

    if (invalidSequences) {
        return <div>Some sequences are empty or invalid</div>;
    }

    return (
        <>
            <div
                ref={containerRef}
                className={`moorhen__seqviewer-container ${className ?? ""}`}
                // style={{ ...props.style, height: (showTitleBar ? 72 : 50) + displayHeight * 26 + "px" }}
                /** Detect mouse on the seq viewer to switch to css hover of the residues box => better (feeling of) performance*/
                onMouseEnter={() => {
                    mouseIsHoveringRef.current = true;
                }}
                onMouseLeave={() => {
                    mouseIsHoveringRef.current = false;
                }}
            >
                <div>
                    {showTitleBar && (
                        <div className="moorhen__seqviewer__hovered-residue-info">
                            <div ref={hoveredInfoRef}>Chain: - Res: -</div>
                        </div>
                    )}
                </div>
                <div style={{ display: "flex", flexDirection: "row" }}>
                    {leftButtonsBar}
                    <CustomHorizontalScrollbar
                        key={scrollbarKey}
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
