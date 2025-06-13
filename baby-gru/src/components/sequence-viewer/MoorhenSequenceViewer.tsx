import { moorhen } from "../../types/moorhen";
import { useMemo, useEffect, useState } from "react";
import { webGL } from "../../types/mgWebGL";
import { clickedResidueType } from '../card/MoorhenMoleculeCard';
import Stack from "@mui/material/Stack";
import './MoorhenSequenceViewer.css';
import { residueCodesOneToThree } from "../../utils/enums";
import { on } from "events";


type MoorhenSequenceViewerPropsType = {
    sequences: {sequence: moorhen.Sequence,  molName: string}[];
    glRef: React.RefObject<webGL.MGWebGL>
    clickedResidue: clickedResidueType;
    setClickedResidue: React.Dispatch<React.SetStateAction<clickedResidueType>>;
    selectedResidues: [number, number];
    setSelectedResidues: React.Dispatch<React.SetStateAction<[number, number]>>;
    useMainStateResidueSelections?: boolean
    onHoverResidue?: (molName: string, chain: string, resNum: number, resCode: string, resCID: string) => void;
    maxHeight?: string;
}

export const MoorhenSequenceViewer = (props: MoorhenSequenceViewerPropsType) => {

    const [overedRes, setOveredRes] = useState<string>(('Seq Viewer'));

    const handleResidueClick = (molName, chain, resNum) => {
        props.setClickedResidue({ modelIndex: 0, molName: molName, chain: chain, seqNum: resNum })
        }

    const handleMouseOver = (molName, chain, resNum, resCode, resCID) => {
        setOveredRes(chain + ' ' + resNum + ' ' + residueCodesOneToThree[resCode])
        props.onHoverResidue(molName, chain, resNum, resCode, resCID)
    }

    const maxVal = Math.max(...props.sequences.map(seqObj => {
        const sequence = seqObj.sequence;
        return sequence.sequence[sequence.sequence.length - 1].resNum
    })) + 1;

    let minVal = Math.min(...props.sequences.map(seqObj => {
        const sequence = seqObj.sequence;
        return sequence.sequence[0].resNum
    }));

    type SequenceElementType = {
        molName: string;
        chain: string;
        residues: { resNum: number; resCode: string; resCID: string }[];
    };

    const sequencesToDisplay: SequenceElementType[] = useMemo(() => {
        const sequenceElements: SequenceElementType[] = [];
        props.sequences.forEach((seqObj) => {
            const sequence = seqObj.sequence;
            const molName = seqObj.molName;
            const lastResi = sequence.sequence[sequence.sequence.length -1].resNum
            const residues = []
                for (let i = minVal ; i < maxVal; i ++) {
                    if (!sequence.sequence.some(residue => residue.resNum === i)) {
                        if (i < lastResi){
                            residues.push({
                                resNum: i,
                                resCode: '-',
                                resCID: ''
                                })
                        } else {
                            residues.push(null)
                        }
                    } else {
                        const resi = sequence.sequence.find(residue => residue.resNum === i)
                        residues.push({
                            resNum: resi.resNum,
                            resCode: resi.resCode,
                            resCID: resi.cid
                        })
                    }
                }
            sequenceElements.push({
                molName: molName,
                chain: sequence.chain,
                residues: residues
            });
        });
        return sequenceElements;
    }, [props.sequences]);


    const tickMarks = useMemo(() => {
        const ticks = []
        let startVal = minVal
        const mod = minVal % 5 ;       
            if ((mod !== 1) && (mod !== -4)) {
                const n = (6 - (mod)) % 5;
                ticks.push(             
                    <div className={`tick-mark`} style={{maxWidth: n+'rem', minWidth: n +'rem'}}>
                    {n > 1 ? minVal : null}
                    </div>
                )
                startVal += n
            }

            for (let i = startVal ; i < maxVal; i = i + 5) {
                const left = maxVal - i 
                ticks.push(
                    <div className={`tick-mark`}
                    style = {left < 5 ? {maxWidth: left+'rem', minWidth: left+'rem'} : {}}>
                     {i}   
                    </div>
                )
            }
        return ticks
    }
    , [maxVal])


    return (
        <>
            <div style={{ padding: '0.5rem', 
                        border: '1px solid lightgrey', 
                        borderRadius: '4px', 
                        marginBottom: '0.5rem',
                        maxHeight: props.maxHeight ? props.maxHeight : 'none',
                        height: 5 + (props.sequences.length * 1.5) + 'rem',}}>
                <div>{overedRes}</div>
                <div style={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                }}>
                    <div
                        className="scrollable-table"
                        style={{
                            overflow: 'scroll',                    
                            width: '100%',
                            height: 'calc(100% - 1rem)',
                            minHeight: '3rem',
                        }}
                    >

                        <div className="sticky-tick-marks">
                            <div style={{minWidth: '2rem', maxWidth: '2rem',}}></div> {/* Empty space for chain names */}
                            {tickMarks}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', width: 'fit-content' }}>
                            {sequencesToDisplay.map((sequence, i) => (
                                <div style={{ display: 'flex', flexDirection: 'row' }} key={i}>

                                    <div className="sticky-left-column">
                                        {sequence.chain}
                                    </div>

                                    {sequence.residues.map((residue, j) => (
                                        residue? 
                                        <div key={j}
                                            className={`residue-box ${ j % 2 === 0 ? 'even' : 'odd'}`}
                                            onClick={() => {handleResidueClick(sequence.molName, sequence.chain, residue.resNum)}}
                                            onMouseOver={() => {handleMouseOver(sequence.molName, sequence.chain, residue.resNum, residue.resCode, residue.resCID)}}
                                        >
                                            {residue.resCode}
                                        </div>
                                        : <div className={`residue-box empty`}></div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
