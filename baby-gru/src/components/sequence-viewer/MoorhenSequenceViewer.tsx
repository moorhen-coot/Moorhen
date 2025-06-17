import { moorhen } from "../../types/moorhen";
import { useRef, useMemo, useEffect, useState } from "react";
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

type SequenceElementType = {
    molName: string;
    chain: string;
    molNo: number;
    residues: { resNum: number; resCode: string; resCID: string; hovered: boolean; selected: boolean }[];
    };


export const MoorhenSequenceViewer = (props: MoorhenSequenceViewerPropsType) => {
    const seqLenght = props.sequences.length
    const [hoveredRes, setHoveredRes] = useState<string>("Seq Viewer");
    const [isScrolling, setIsScrolling] = useState<boolean>(false);
    const [displayHigh, setDisplayHigh] = useState<number>(props.maxDisplayHigh < seqLenght ? props.maxDisplayHigh : seqLenght );
    const [sequencesSlice, setSequencesSlices] = useState<[number, number]>([0, displayHigh]);
    const [sequencesToDisplay, setSeqToDisplay] = useState<SequenceElementType[]>(null)
    const [selectedResidues, setSelectedResidues] = useState<SequenceResiduesSelection>(props.selectedResidues? props.selectedResidues : null)
    const [glideSelectStartRes, setGlideSelectStartRes] = useState<SequenceResiduesSelection>(null)
    const [isGliding, setIsGliding] = useState<boolean>(false)
    const clickTimer = useRef<NodeJS.Timeout | null>(null);

    const handleMouseDown = (molNo, chain, resNum, resCode, resCID) => {
        setGlideSelectStartRes({molNo: molNo, chain: chain, range: [resNum, null]})
        clickTimer.current = setTimeout(() => {clearClickTimer()} , 300)
    }

    const clearClickTimer = () => {
        if (clickTimer.current) {
            clearTimeout(clickTimer.current);
            clickTimer.current = null;
            setIsGliding(true);
        }
    }

    const handleMouseUp = (molNo, chain, resNum, resCode, resCID) => {
        if (clickTimer.current) {
            clearClickTimer();
            if (props.onResidueClick)   {
                props.onResidueClick(0, molNo, chain, resNum);
            }
        }
        if (!isGliding) {
            handleResidueClick(molNo, chain, resNum);
        } else {
            handleGlideSelect(molNo, chain, resNum);
        }
        setIsGliding(false);
    }

    const handleGlideSelect = (molNo, chain, resNum) => {
        if ((molNo === glideSelectStartRes.molNo) && (chain === glideSelectStartRes.chain)) {
            setSelectedResidues({molNo: molNo, chain: chain, range: [glideSelectStartRes.range[0], resNum]})
            if (props.onResiduesSelect) {
                props.onResiduesSelect({molNo: molNo, chain: chain, range: [glideSelectStartRes.range[0], resNum]});
            }
        } else {
            setGlideSelectStartRes(null)
        }
    }

    const handleResidueClick = (molName, chain, resNum) => {
        setIsGliding(false)
        props.onResidueClick(0, molName, chain, resNum );
    };

    const handleMouseOver = (molName, chain, resNum, resCode, resCID) => {
        if (!isScrolling) {
            setHoveredRes(chain + " " + resNum + " " + residueCodesOneToThree[resCode]);
            props.onHoverResidue(molName, chain, resNum, resCode, resCID);
        }
    };

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

    const getSeqToDisplay = () => {
        const sequenceElements: SequenceElementType[] = []      
        const hoveredAtomInfo = props.hoveredResidue.cid ? cidToAtomInfo(props.hoveredResidue.cid) : null
        const orderedSelectionRange = selectedResidues?.range[0] < selectedResidues?.range[1] ? selectedResidues?.range : [selectedResidues?.range[1], selectedResidues?.range[0]];

        props.sequences.forEach((seqObj) => {
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

                    let hovered = false
                    if (hoveredAtomInfo && (molNo === props.hoveredResidue.molNo)) {
                        const resiInfo = cidToAtomInfo(resi.cid)
                        if ((resiInfo.chain_id === hoveredAtomInfo.chain_id) && (resiInfo.res_no === hoveredAtomInfo.res_no)){
                        hovered = true
                        }
                    }


                    let selected = false;
                    if (!isGliding) {
                        if (selectedResidues && ((molNo === selectedResidues.molNo) && (sequence.chain === selectedResidues.chain))) {
                            if (resi.resNum >= orderedSelectionRange[0] && resi.resNum <= orderedSelectionRange[1]) {
                                selected = true;
                            } }
                        } else {
                        if (glideSelectStartRes && ((molNo === glideSelectStartRes.molNo) && (sequence.chain === glideSelectStartRes.chain))) {
                            if (glideSelectStartRes.range[0] === resi.resNum) {
                                selected = true;
                            }
                        }
                    }
                    residues.push({
                        resNum: resi.resNum,
                        resCode: resi.resCode,
                        resCID: resi.cid,
                        selected: selected,
                        hovered: hovered,
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
        setSeqToDisplay(sequenceElements)
    };
   
    useEffect(() => {
        getSeqToDisplay()
    }, [props.sequences, props.hoveredResidue, minVal, maxVal, selectedResidues]);

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
    }, [maxVal]);

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
            >
                <div>
                    {hoveredRes}
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

                        <div style={{ display: "flex", flexDirection: "column", width: "fit-content" }}>
                            {sequencesToDisplay?.slice(sequencesSlice[0], sequencesSlice[1]).map((sequence, i) => (
                                <div
                                key = {sequence.molNo + sequence.chain} 
                                style={{ display: "flex", flexDirection: "row" }}>
                                    <div className="sticky-left-column">{sequence.chain}</div>
                                    {sequence.residues.map((residue, j) =>
                                        residue ? (
                                            <div
                                                key = {sequence.molNo + sequence.chain + residue.resNum}
                                                className={`residue-box ${j % 2 === 0 ? "even" : "odd"} ${residue.selected ? 'selected' : ''} ${residue.hovered ? 'hover' : ''} ${isGliding ? 'glideSelect' : ''}`}
                                                onMouseOver={() => {
                                                    handleMouseOver(sequence.molName, sequence.chain, residue.resNum, residue.resCode, residue.resCID);
                                                }}
                                                onMouseDown= {() => handleMouseDown(sequence.molNo, sequence.chain, residue.resNum, residue.resCode, residue.resCID) 
                                                }
                                                onMouseUp = {() => handleMouseUp(sequence.molNo, sequence.chain, residue.resNum, residue.resCode, residue.resCID) 
                                                }                                          
                                            >
                                                {residue.resCode}
                                            </div>
                                        ) : (
                                            <div key={sequence.molNo + sequence.chain + 'empty' + j} className={`residue-box empty`}></div>
                                        )
                                    )}
                                </div>
                            ))}
                        </div>
                    </CustomHorizontalScrollbar>
                </div>
        </>
    );
};
