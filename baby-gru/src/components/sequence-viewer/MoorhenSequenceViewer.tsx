import { moorhen } from "../../types/moorhen";
import { useRef, useMemo, useEffect, useState, memo, useCallback } from "react";
import { clickedResidueType } from "../card/MoorhenMoleculeCard";
import Stack from "@mui/material/Stack";
import "./MoorhenSequenceViewer.css";
import { CustomHorizontalScrollbar } from "./CustomHorizontalScrollbar";
import { AddOutlined, ExpandLessOutlined, ExpandMoreOutlined, RemoveOutlined } from "@mui/icons-material";

const defaultColour = 'rgb(198, 205, 238)';

export namespace MoorhenSeqViewTypes {
    export type ResiduesSelection = {
        molNo: number;
        chain: string;
        range: [number, number]
    }

    export type Residue = {
        resNum: number;
        resCode: string;
        resCID: string;
        selected?: boolean;
        colour?: string;
    };

    export type SeqElement = {
        molName: string;
        chain: string;
        molNo: number;
        hideResCode?: boolean;
        displayName?: string;
        residuesDisplayOffset?: number;
        colour?: string;
        missingAs?: string;
        blockAlternateColour?: boolean;
        residues: Residue[];
    };
}


// this return the normal hook with a mutable ref, that can be accesed within a callback
function useStateWithRef<T>(defaultVal: T): [T, React.Dispatch<React.SetStateAction<T>>, React.RefObject<T>]{
    const [state, setState] = useState<T>(defaultVal)
    const ref = useRef<T>(null)
    ref.current = state
    return [state, setState, ref]
}

export function stringToSeqViewer(seqAsString: string, start?: number, name?: string, molName?: string, molNo?: number, chain?: string): MoorhenSeqViewTypes.SeqElement {
    const sequence: MoorhenSeqViewTypes.SeqElement = {
        molName: molName ? molName : "",
        chain: chain ? chain : "",
        molNo: molNo ? molNo : 0,
        displayName: name ? name : "",
        residues: []
    };
    let resNum = start?  start : 1;
    for (const res of seqAsString) {
        sequence.residues.push({
            resNum: resNum++,
            resCode: res,
            resCID: '/' + sequence.molNo + '/' + sequence.chain + '/' + resNum 
        });
    }
    return sequence;
}

export function moorhenSequenceToSeqViewer(sequence: moorhen.Sequence, molName: string, molNo: number): MoorhenSeqViewTypes.SeqElement  {
    if (sequence !== null && sequence.sequence.length > 0) {
        return {
            molName: molName,
            chain: sequence.chain,
            molNo: molNo,
            residues: sequence.sequence.map(residue => ({
                resNum: residue.resNum,
                resCode: residue.resCode,
                resCID: residue.cid
            }))
        };
    }
    return null;
}

type MoorhenSequenceViewerPropsType = {
    sequences: MoorhenSeqViewTypes.SeqElement | MoorhenSeqViewTypes.SeqElement[];
    clickedResidue?: clickedResidueType;
    onResidueClick?: ( modelIndex: number, molName: string, chain: string, seqNum: number ) => void;
    selectedResidues?: MoorhenSeqViewTypes.ResiduesSelection;
    onResiduesSelect?: (selection: MoorhenSeqViewTypes.ResiduesSelection ) => void;
    useMainStateResidueSelections?: boolean;
    onHoverResidue?: (molName: string, chain: string, resNum: number, resCode: string, resCID: string) => void;
    hoveredResidue?: {molNo: number, chain: string, resNum: number};
    maxDisplayHeight?: number;
    nameColumnWidth?: number;
    columnWidth?: number;
    selectIsActive?: boolean;
    reOrder?: boolean;
    fontSize?: number;
};

export const MoorhenSequenceViewer = memo((props: MoorhenSequenceViewerPropsType) => {
    const { 
        nameColumnWidth = 2,
        columnWidth = 1,
        reOrder = true,   
        fontSize = columnWidth
        } = props;
    const inputArray = Array.isArray(props.sequences) ? props.sequences : [props.sequences];

    if (inputArray.length === 0) {
        return <div>No sequences available</div>;
    }
    if (inputArray.some(seqObj => !seqObj || !seqObj.residues || seqObj.residues.length === 0)) {
        return <div>Some sequences are empty or invalid</div>;       
    }
    
    // Create a new array with updated residue numbers, preserving immutability and only modifying resNum
    const applyOffset = (seqArray: MoorhenSeqViewTypes.SeqElement[]) =>
        seqArray.map(seq => ({
            ...seq,
            residues: seq.residues.map(res => ({
                ...res,
                resNum: res.resNum + (seq.residuesDisplayOffset ?? 0),
            })),
        }));

    const sequencesArray = applyOffset(inputArray)

    const seqLength = sequencesArray.length;
    const [isScrolling, setIsScrolling, isScrollingRef] = useStateWithRef<boolean>(false);
    const [displayHeight, setDisplayHeight] = useState<number>(props.maxDisplayHeight < seqLength ? props.maxDisplayHeight : seqLength);
    const [sequencesSlice, setSequencesSlices] = useState<[number, number]>([0, displayHeight]);
    const [mouseIsHovering, setMouseIsHovering, mouseIsHoveringRef] = useStateWithRef<boolean>(false);
    const [selectedResidues, setSelectedResidues, selectedResiduesRef] = useStateWithRef<MoorhenSeqViewTypes.ResiduesSelection>(props.selectedResidues ? props.selectedResidues : null)
    const [glideSelectStartRes, setGlideSelectStartRes, glideSelectStartResRef] = useStateWithRef<MoorhenSeqViewTypes.ResiduesSelection>(null)
    const [isGliding, setIsGliding, isGlidingRef] = useStateWithRef<boolean>(false)
    const clickTimer = useRef<NodeJS.Timeout | null>(null);
    const [hoveredResidue, setHoveredResidue] = useState<{molName: string, chain: string, resNum: number, resCode: string}>(null);


    const handleResidueMouseDown = useCallback((evt) => {
        const molNo = Number(evt.currentTarget.dataset.molno)
        const chain = evt.currentTarget.dataset.chain
        const resNum = Number(evt.currentTarget.dataset.resnum)
        if (evt.shiftKey) {
            return;
        } else {
            setGlideSelectStartRes({molNo: molNo, chain: chain, range: [resNum, null]})
            clickTimer.current = setTimeout(() => {clearClickTimer()} , 300)
        }
    },[]);

    const clearClickTimer = () => {
        if (clickTimer.current) {
            clearTimeout(clickTimer.current);
            clickTimer.current = null;
            setIsGliding(true);
        }
    }

    const handleResidueMouseUp = useCallback((evt) => {
        const molName = evt.currentTarget.dataset.molname
        const molNo = Number(evt.currentTarget.dataset.molno)
        const chain = evt.currentTarget.dataset.chain
        const resNum = Number(evt.currentTarget.dataset.resnum)
        if (evt.shiftKey) {
            handleShiftSelect(molNo, chain, resNum);
            return;
        }        
        if (clickTimer.current) {
            clearClickTimer();
            if (props.onResidueClick)   {
                props.onResidueClick(0, molName, chain, resNum);
            }
        }
        if (!isGlidingRef.current) {
            handleResidueClick(molName, chain, resNum);
        } else {
            handleGlideSelect(molNo, chain, resNum);
        }
        setIsGliding(false);
    },[])

    const handleGlideSelect = (molNo, chain, resNum) => {
        if ((molNo === glideSelectStartResRef.current.molNo) && (chain === glideSelectStartResRef.current.chain)) {
            setSelectedResidues({molNo: molNo, chain: chain, range: [glideSelectStartResRef.current.range[0], resNum]})
            if (props.onResiduesSelect) {
                props.onResiduesSelect({molNo: molNo, chain: chain, range: [glideSelectStartResRef.current.range[0], resNum]});
            }
        } else {
            setGlideSelectStartRes(null)
        }
    }

    const handleShiftSelect = (molNo, chain, resNum) => {
        const curentSelection = selectedResiduesRef.current

        let newSelection: MoorhenSeqViewTypes.ResiduesSelection = curentSelection
        ? { 
            molNo: curentSelection.molNo, 
            chain: curentSelection.chain, 
            range: [...curentSelection.range] 
            }
        : null;

        if (!curentSelection) {
            newSelection = {
                molNo: molNo,
                chain: chain,
                range: [resNum, resNum],
            };
        }
        else if (curentSelection && ((molNo === curentSelection.molNo) && (chain === curentSelection.chain))) {
            const orderedSelectionRange = curentSelection.range[0] < curentSelection.range[1] ? curentSelection.range : [curentSelection.range[1], curentSelection.range[0]];
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

        if (newSelection !== curentSelection) {
            setSelectedResidues(newSelection);
            if (props.onResiduesSelect) {
                props.onResiduesSelect(newSelection);
            }
        }
    }

    const handleResidueClick = (molName, chain, resNum) => {
        setIsGliding(false)
        if (props.onResidueClick)
        props.onResidueClick(0, molName, chain, resNum );
    };

    const handleResidueMouseOver = useCallback((evt) => {
        const resNum = Number(evt.currentTarget.dataset.resnum)
        const chain = evt.currentTarget.dataset.chain
        const molName = evt.currentTarget.dataset.molname
        const resCode = evt.currentTarget.dataset.rescode
            
        if (props.onHoverResidue && mouseIsHoveringRef.current && !isScrollingRef.current) {
            
            const resCID = evt.currentTarget.dataset.rescid
            props.onHoverResidue(molName, chain, resNum, resCode, resCID);
        }
        setHoveredResidue({
            molName: molName,
            chain: chain,
            resCode: resCode,
            resNum: resNum
        });
}, []);

    /** this part is the scroll down functionallity */
    const holdInterval = useRef<NodeJS.Timeout | null>(null);
    const startScrollUp = (val) => {
        if (holdInterval.current) return;
        holdInterval.current = setInterval(() => {
            scrollUp(val);
        }, 50);
    };

    const scrollUp = (val) => {
        if (sequencesSlice[0] === 0 && val < 0) {
            return;
        }
        if (sequencesSlice[1] === sequencesArray.length && val > 0) {
            return;
        }

        setSequencesSlices((prev) => {
            if (prev[0] === 0 && val < 0) return prev;
            if (prev[1] === sequencesArray.length && val > 0) return prev;
            return [prev[0] + val, prev[0] + val + displayHeight];
        });
    };

    const stopScroll = () => {
        if (holdInterval.current) {
            clearInterval(holdInterval.current);
            holdInterval.current = null;
        }
    };

    const handleChangeDisplaySize = (val) => {
        if ((val > 0) && (displayHeight < sequencesArray.length)) {
            setDisplayHeight((prev) => Math.min(prev + 1, props.maxDisplayHeight));
        } else if (val < 0 ) {
            setDisplayHeight((prev) => Math.max(prev - 1, 1));
        }
    };
    useMemo(() => {
        setSequencesSlices([sequencesSlice[0], sequencesSlice[0] + displayHeight]);
    },[displayHeight])

    const maxVal =
        Math.max(
            ...sequencesArray.map((seqObj) => {
                const sequence = seqObj.residues;
                return sequence[sequence.length - 1].resNum;
            })
        ) + 1;

    const minVal = Math.min(
        ...sequencesArray.map((seqObj) => {
            const sequence = seqObj.residues;
            return sequence[0].resNum;
        })
    );

    const sequencesToDisplay = useMemo(() => {

        const sequenceElements: MoorhenSeqViewTypes.SeqElement[] = []
        let orderedSequences: MoorhenSeqViewTypes.SeqElement[] = [];
        const orderedSelectionRange = selectedResidues?.range[0] < selectedResidues?.range[1] ? selectedResidues?.range : [selectedResidues?.range[1], selectedResidues?.range[0]];
        if (reOrder){
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

        orderedSequences.slice(sequencesSlice[0], sequencesSlice[1]).forEach((seqObj) => {
            const sequence = seqObj.residues;
            const molNo = seqObj.molNo;
            const chain = seqObj.chain;
            const lastResi = sequence[sequence.length - 1].resNum;
            const firstResi = sequence[0].resNum;
            const residues = [];
            
            for (let i = minVal; i < maxVal; i++) {
                if (!sequence.some((residue) => residue.resNum === i)) {
                    if (i < firstResi) {
                        residues.push(null);                   
                    } else if (i < lastResi) {
                        if (seqObj.missingAs === 'none') {
                            residues.push(null);
                        } else {
                        residues.push({
                            resNum: i,
                            resCode: seqObj.missingAs ? seqObj.missingAs : "-",
                            resCID: "",
                            selected: false,
                            hovered: false,
                        });}
                    } else {
                        residues.push(null);
                    }
                } else {
                    const resi = sequence.find((residue) => residue.resNum === i);

                    let selected = false;
                    if (isGliding) {
                        if (glideSelectStartRes && ((molNo === glideSelectStartRes.molNo) && (chain === glideSelectStartRes.chain))) {
                            if (glideSelectStartRes.range[0] === resi.resNum) {
                                selected = true;
                            }}
                    } else {
                        if (selectedResidues && ((molNo === selectedResidues.molNo) && (chain === selectedResidues.chain))) {
                            if (resi.resNum >= orderedSelectionRange[0] && resi.resNum <= orderedSelectionRange[1]) {
                                selected = true;
                        }
                    }}

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
        return sequenceElements;
    }, [sequencesArray, minVal, maxVal, sequencesSlice, selectedResidues, isGliding, glideSelectStartRes]);

    useEffect(() => {
        setSelectedResidues(props.selectedResidues)
    },[props.selectedResidues]);
    
    const tickMarks = useMemo(() => {
        const ticks = [];
        let startVal = minVal;
        const mod = minVal % 5;
        if (mod !== 1 && mod !== -4) {
            const n = (6 - mod) % 5;
            ticks.push(
                <div
                key = {'start tick'} 
                className={`tick-mark`} style={{ maxWidth: columnWidth * n + "rem", minWidth: columnWidth * n + "rem" }}>
                </div>
            );
            startVal += n;
        }

        for (let i = startVal; i < maxVal; i = i + 5) {
            const left = maxVal - i;
            ticks.push(
                <div 
                key = {'tick ' + i}
                className={`tick-mark`} style={left < 5 ? { maxWidth: left*columnWidth + "rem", minWidth: left*columnWidth + "rem" } : { maxWidth: columnWidth*5 + "rem", minWidth: columnWidth*5 + "rem" }}>
                    {i}
                </div>
            );
        }
        return ticks;
    }, [maxVal, minVal, props.columnWidth]);



    const [hoveredKey, setHoveredKey] = useState<string | null>(null);
    
    useEffect(() => {
        if (mouseIsHovering) {
            if (hoveredKey) {
            setHoveredKey(null);
            }
            return;
        }
        if (props.hoveredResidue) {
            if (sequencesArray.some(seqObj => seqObj.molNo === props.hoveredResidue.molNo)) {
                setHoveredKey(`${props.hoveredResidue.molNo}${props.hoveredResidue.chain}${props.hoveredResidue.resNum}`);
            }
        } else {
            setHoveredKey(null);
        }
    }, [props.hoveredResidue]);


    const renderResidueBox = (sequence: MoorhenSeqViewTypes.SeqElement, residue: MoorhenSeqViewTypes.Residue, j: number) => {
        if (!residue) {
            return (
                <div key={sequence.molNo + sequence.chain + 'empty' + j} className="residue-box empty" style={{ "--column-width": `${columnWidth}rem` } as React.CSSProperties}></div>
            );
        } else {
            let hover = false
            if (hoveredKey ===  `${sequence.molNo}` + `${sequence.chain}` + `${residue.resNum}`) {
                hover = true
            }
            const colour = residue.colour ? residue.colour  : sequence.colour ? sequence.colour : defaultColour;
            const colorAlternate = !sequence.blockAlternateColour ? (j % 2 === 0 ? "even" : "odd") : "solid";
            const className = `residue-box ${colorAlternate} ${residue.selected ? 'selected' : ''} ${hover ? 'hover' : ''} ${isGliding ? 'glideSelect' : ''}`;
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
    const renderSequenceRow = (sequence: MoorhenSeqViewTypes.SeqElement, i) => {
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
    };

    const listOfDivs = useMemo(() => {
        const result = sequencesToDisplay?.map(renderSequenceRow);
        return result;
    }, [sequencesToDisplay, hoveredKey]);

    return (
        <>
            <div
                style={{
                    padding: "0.5rem",
                    border: "1px solid lightgrey",
                    borderRadius: "4px",
                    marginBottom: "0.5rem",
                    height: 72 + displayHeight * 26 +  'px',
                }}
                /** Detect mouse on the seq viewer to switch to css hover of the residues box => better (feeling of) performance*/
                onMouseOver={() => setMouseIsHovering(true)} 
                onMouseOut={() => setMouseIsHovering(false)}
            >
                <div>
                    {hoveredResidue && (
                        <div className="hovered-residue-info">
                            <div>Chain: {hoveredResidue.chain}   Res: {hoveredResidue.resNum} {hoveredResidue.resCode}</div>

                        </div>
                    )}
                    <Stack
                        direction="column"
                        style={{
                            zIndex: 4,
                            position: "absolute",
                            right: 3,
                            top: 50,
                        }}
                    >
                        {seqLength > displayHeight ? (
                                <div onMouseDown={() => startScrollUp(-1)} onMouseUp={stopScroll} style={{cursor: 'pointer'}}>
                                    <ExpandLessOutlined></ExpandLessOutlined>
                                </div>
                                ) : null}
                        {seqLength > 1 ? (
                            <>
                                <div onClick={() => handleChangeDisplaySize(1)} >
                                    <AddOutlined></AddOutlined>
                                </div>
                                <div onClick={() => handleChangeDisplaySize(-1)}>
                                    <RemoveOutlined></RemoveOutlined>
                                </div>
                            </>
                                ) : null}

                        {seqLength > displayHeight ? (
                                <div onMouseDown={() => startScrollUp(+1)} onMouseUp={stopScroll} style={{cursor: 'pointer'}}>
                                    <ExpandMoreOutlined></ExpandMoreOutlined>
                                </div>
                                ) : null}
                    </Stack>
                </div>
                    <CustomHorizontalScrollbar 
                    style={{ height: "calc(100% - 1rem)", minHeight: "3rem", width: seqLength > displayHeight ? "calc(100% - 16px)" : "100%" }} 
                    onDraggingChange={setIsScrolling}>

                        <div className="sticky-tick-marks">
                            <div style={{ minWidth: `${nameColumnWidth}rem`, maxWidth: `${nameColumnWidth}rem` }}></div>
                            {tickMarks}
                        </div>
                            {listOfDivs}                        
                    </CustomHorizontalScrollbar>
                </div>
        </>
    );
});
MoorhenSequenceViewer.displayName = "MoorhenSequenceViewer";