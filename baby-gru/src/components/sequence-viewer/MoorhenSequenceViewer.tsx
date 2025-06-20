import { moorhen } from "../../types/moorhen";
import { useRef, useMemo, useEffect, useState, memo, useCallback } from "react";
import { clickedResidueType } from "../card/MoorhenMoleculeCard";
import Stack from "@mui/material/Stack";
import "./MoorhenSequenceViewer.css";
import { residueCodesOneToThree } from "../../utils/enums";
import { CustomHorizontalScrollbar } from "./CustomHorizontalScrollbar";
import { ExpandLessOutlined, ExpandMoreOutlined } from "@mui/icons-material";
import { cidToAtomInfo } from "../../utils/utils";

export type SequenceResiduesSelection = {
    molNo: number;
    chain: string;
    range: [number, number]
}

// this return the normal hook with a mutable ref, that can be accesed within a callback
function useStateWithRef<T>(defaultVal: T): [T, React.Dispatch<React.SetStateAction<T>>, React.RefObject<T>]{
    const [state, setState] = useState<T>(defaultVal)
    const ref = useRef<T>(null)
    ref.current = state
    return [state, setState, ref]
}

type MoorhenSequenceViewerPropsType = {
    sequences: { sequence: moorhen.Sequence; molName: string; molNo: number }[];
    clickedResidue?: clickedResidueType;
    onResidueClick?: ( modelIndex: number, molName: string, chain: string, seqNum: number ) => void;
    selectedResidues?: SequenceResiduesSelection;
    onResiduesSelect?: (selection: SequenceResiduesSelection ) => void;
    useMainStateResidueSelections?: boolean;
    onHoverResidue?: (molName: string, chain: string, resNum: number, resCode: string, resCID: string) => void;
    hoveredResidue?: {molNo: number, cid: string};
    maxDisplayHigh?: number;
};

type MoorhenSequenceViewerResidueType = {
    resNum: number;
    resCode: string;
    resCID: string;
    selected: boolean; 
    hovered: boolean;
};

type MoorhenSequenceViewerElementType = {
    molName: string;
    chain: string;
    molNo: number;
    residues: MoorhenSequenceViewerResidueType[];
};

export const MoorhenSequenceViewer = memo((props: MoorhenSequenceViewerPropsType) => {
    const seqLenght = props.sequences.length
    const [isScrolling, setIsScrolling] = useState<boolean>(false);
    const [displayHigh, setDisplayHigh] = useState<number>(props.maxDisplayHigh < seqLenght ? props.maxDisplayHigh : seqLenght );
    const [sequencesSlice, setSequencesSlices] = useState<[number, number]>([0, displayHigh]);
    const [mouseIsHovering, setMouseIsHovering] = useState<boolean>(false);
    
    const [selectedResidues, setSelectedResidues, selectedResiduesRef] = useStateWithRef<SequenceResiduesSelection>(props.selectedResidues? props.selectedResidues : null)
    const [glideSelectStartRes, setGlideSelectStartRes,glideSelectStartResRef] = useStateWithRef<SequenceResiduesSelection>(null)
    const [isGliding, setIsGliding, isGlidingRef] = useStateWithRef<boolean>(false)
    const clickTimer = useRef<NodeJS.Timeout | null>(null);


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

        let newSelection: SequenceResiduesSelection = curentSelection
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
        props.onResidueClick(0, molName, chain, resNum );
    };

    const handleResidueMouseOver = useCallback((evt) => {
        const molName = evt.currentTarget.dataset.molname
        const chain = evt.currentTarget.dataset.chain
        const resNum = Number(evt.currentTarget.dataset.resnum)
        const resCode = evt.currentTarget.dataset.rescode
        const resCID = evt.currentTarget.dataset.rescid
            props.onHoverResidue(molName, chain, resNum, resCode, resCID);
    },[]);

    /** this part is the scroll down functionallity */
    const holdInterval = useRef<NodeJS.Timeout | null>(null);
    const startScrollUp = (val) => {
        if (holdInterval.current) return;
        holdInterval.current = setInterval(() => {
            scrollUp(val);
        }, 100);
    };

    const scrollUp = (val) => {
        if (sequencesSlice[0] === 0 && val < 0) {
            return;
        }
        if (sequencesSlice[1] === props.sequences.length && val > 0) {
            return;
        }

        setSequencesSlices((prev) => {
            if (prev[0] === 0 && val < 0) return prev;
            if (prev[1] === props.sequences.length && val > 0) return prev;
            return [prev[0] + val, prev[0] + val + displayHigh];
        });
    };

    const stopScroll = () => {
        if (holdInterval.current) {
            clearInterval(holdInterval.current);
            holdInterval.current = null;
        }
    };

    const maxVal =
        Math.max(
            ...props.sequences.map((seqObj) => {
                const sequence = seqObj.sequence;
                return sequence.sequence[sequence.sequence.length - 1].resNum;
            })
        ) + 1;

    const minVal = Math.min(
        ...props.sequences.map((seqObj) => {
            const sequence = seqObj.sequence;
            return sequence.sequence[0].resNum;
        })
    );

    const sequencesToDisplay = useMemo(() => {
        const sequenceElements: MoorhenSequenceViewerElementType[] = []      
        const orderedSelectionRange = selectedResidues?.range[0] < selectedResidues?.range[1] ? selectedResidues?.range : [selectedResidues?.range[1], selectedResidues?.range[0]];
        const orderedSequences = props.sequences.slice().sort((a, b) => {
            const chainA = a.sequence.chain.toUpperCase();
            const chainB = b.sequence.chain.toUpperCase();
            if (chainA < chainB) return -1;
            if (chainA > chainB) return 1;
            return 0;
        });
        orderedSequences.slice(sequencesSlice[0], sequencesSlice[1]).forEach((seqObj) => {
            const sequence = seqObj.sequence;
            const molName = seqObj.molName;
            const molNo = seqObj.molNo;
            const lastResi = sequence.sequence[sequence.sequence.length - 1].resNum;
            const residues = [];
            
            for (let i = minVal; i < maxVal; i++) {
                if (!sequence.sequence.some((residue) => residue.resNum === i)) {
                    if (i < lastResi) {
                        residues.push({
                            resNum: i,
                            resCode: "-",
                            resCID: "",
                            selected: false,
                            hovered: false,
                        });
                    } else {
                        residues.push(null);
                    }
                } else {
                    const resi = sequence.sequence.find((residue) => residue.resNum === i);

                    let selected = false;
                    if (isGliding) {
                        if (glideSelectStartRes && ((molNo === glideSelectStartRes.molNo) && (sequence.chain === glideSelectStartRes.chain))) {
                            if (glideSelectStartRes.range[0] === resi.resNum) {
                                selected = true;
                            }}
                    } else {
                        if (selectedResidues && ((molNo === selectedResidues.molNo) && (sequence.chain === selectedResidues.chain))) {
                            if (resi.resNum >= orderedSelectionRange[0] && resi.resNum <= orderedSelectionRange[1]) {
                                selected = true;
                        }
                    }}
                    
                    residues.push({
                        resNum: resi.resNum,
                        resCode: resi.resCode,
                        resCID: resi.cid,
                        selected: selected,
                        hovered: false,
                    });
                }
            }
            sequenceElements.push({
                molName: molName,
                molNo: molNo,
                chain: sequence.chain,
                residues: residues,
            });
        });
        return sequenceElements;
    }, [props.sequences, minVal, maxVal, sequencesSlice, selectedResidues, isGliding, glideSelectStartRes]);

    useEffect(() => {
        setSelectedResidues(props.selectedResidues)
    },[props.selectedResidues]
    )

    const tickMarks = useMemo(() => {
        const ticks = [];
        let startVal = minVal;
        const mod = minVal % 5;
        if (mod !== 1 && mod !== -4) {
            const n = (6 - mod) % 5;
            ticks.push(
                <div
                key = {'start tick'} 
                className={`tick-mark`} style={{ maxWidth: n + "rem", minWidth: n + "rem" }}>
                    {n > 1 ? minVal : null}
                </div>
            );
            startVal += n;
        }

        for (let i = startVal; i < maxVal; i = i + 5) {
            const left = maxVal - i;
            ticks.push(
                <div 
                key = {'tick ' + i}
                className={`tick-mark`} style={left < 5 ? { maxWidth: left + "rem", minWidth: left + "rem" } : {}}>
                    {i}
                </div>
            );
        }
        return ticks;
    }, [maxVal, minVal]);

    const [hoveredKey, setHoveredKey] = useState<string | null>(null);
    useEffect(() => {
        if (mouseIsHovering) {
            setHoveredKey(null);
            return;
        }
        if (props.hoveredResidue.cid) {
            const hoveredAtomInfo = cidToAtomInfo(props.hoveredResidue.cid);
            setHoveredKey(`${props.hoveredResidue.molNo}${hoveredAtomInfo.chain_id}${hoveredAtomInfo.res_no}`);
        } else {
            setHoveredKey(null);
        }
    }, [props.hoveredResidue]);

    const renderResidueBox = (sequence, residue, j) => {
        if (!residue) {
            return (
                <div key={sequence.molNo + sequence.chain + 'empty' + j} className="residue-box empty"></div>
            );
        } else {
            return (
                <div
                    key={sequence.molNo + sequence.chain + residue.resNum}
                    className={`residue-box ${j % 2 === 0 ? "even" : "odd"} ${residue.selected ? 'selected' : ''} ${hoveredKey ===  `${sequence.molNo}` + `${sequence.chain}` + `${residue.resNum}` ? 'hover' : ''} ${isGliding ? 'glideSelect' : ''}`}
                    data-molname={sequence.molName}
                    data-molno={sequence.molNo}
                    data-chain={sequence.chain}
                    data-resnum={residue.resNum}
                    data-rescode={residue.resCode}
                    data-rescid={residue.resCID}
                    onMouseOver={handleResidueMouseOver}
                    onMouseDown={handleResidueMouseDown}
                    onMouseUp={handleResidueMouseUp}
                >
                    {residue.resCode}
                </div>
            );
        }
    };

    const renderSequenceRow = (sequence, i) => {
        return (
            <div style={{ display: "flex", flexDirection: "column", width: "fit-content" }} key={sequence.molNo + sequence.chain + "_row"}>
                <div
                    style={{ display: "flex", flexDirection: "row" }}>
                    <div className="sticky-left-column">
                        {sequence.chain}
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
                    height: 72 + displayHigh*26 +  'px',
                }}
                /** Detect mouse on the seq viewer to switch to css hover of the residues box => better (feeling of) performance*/
                onMouseOver={() => setMouseIsHovering(true)} 
                onMouseOut={() => setMouseIsHovering(false)}
            >
                <div>
                    <Stack
                        direction="column"
                        style={{
                            zIndex: 4,
                            position: "absolute",
                            right: 3,
                            top: 50,
                        }}
                    >
                        {seqLenght > displayHigh ? (
                            <>
                                <div onClick={() => scrollUp(-1)} onMouseDown={() => startScrollUp(-1)} onMouseUp={stopScroll} style={{cursor: 'pointer'}}>
                                    <ExpandLessOutlined></ExpandLessOutlined>
                                </div>
                                <div onClick={() => scrollUp(+1)} onMouseDown={() => startScrollUp(+1)} onMouseUp={stopScroll} style={{cursor: 'pointer'}}>
                                    <ExpandMoreOutlined></ExpandMoreOutlined>
                                </div>
                            </>
                        ) : null}
                    </Stack>
                </div>
                    <CustomHorizontalScrollbar 
                    style={{ height: "calc(100% - 1rem)", minHeight: "3rem", width: seqLenght > displayHigh ? "calc(100% - 16px)" : "100%" }} 
                    onDraggingChange={setIsScrolling}>

                        <div className="sticky-tick-marks">
                            <div style={{ minWidth: "2rem", maxWidth: "2rem" }}></div>
                            {tickMarks}
                        </div>
                            {listOfDivs}                        
                    </CustomHorizontalScrollbar>
                </div>
        </>
    );
});
MoorhenSequenceViewer.displayName = "MoorhenSequenceViewer";