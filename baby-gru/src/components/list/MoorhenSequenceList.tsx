import React, { useEffect, useState } from "react";
import { Row, Col } from "react-bootstrap";
import { MoorhenSequenceViewer } from "../sequence-viewer/MoorhenSequenceViewer";
import { convertViewtoPx, sequenceIsValid } from '../../utils/utils';
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { useSelector } from "react-redux";

export const MoorhenSequenceList = (props: { 
    setBusy: React.Dispatch<React.SetStateAction<boolean>>;
    molecule: moorhen.Molecule; 
    glRef: React.RefObject<webGL.MGWebGL>;
    selectedResidues: [number, number];
    setSelectedResidues: React.Dispatch<React.SetStateAction<[number, number]>>;
    clickedResidue: {
        modelIndex: number;
        molName: string;
        chain: string;
        seqNum: number;
    };
    setClickedResidue: React.Dispatch<React.SetStateAction<{
        modelIndex: number;
        molName: string;
        chain: string;
        seqNum: number;
    }>>;
}) => {
    
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)

    const [sequenceList, setSequenceList] = useState<null | { chain: string; sequence: (moorhen.Sequence | null) }[]>(null)

    useEffect(() => {
        props.setBusy(true)
        
        const newSequenceList = props.molecule.sequences.map(
            sequence => {
                if (!sequenceIsValid(sequence.sequence)) {
                    return { chain: sequence.chain, sequence: null }
                }
                return { chain: sequence.chain, sequence: sequence }
            }
        )
        
        setSequenceList(newSequenceList)
        props.setBusy(false)

    }, [props.molecule.sequences])

    return sequenceList !== null && sequenceList.length > 0 ?
        <>
            <Row style={{ maxHeight: convertViewtoPx(30, height), overflowY: 'auto' }}>
                <Col>
                    {props.molecule.sequences.map(
                        sequence => {
                            if (!sequenceIsValid(sequence.sequence)) {
                                return (
                                    <div>
                                        <p>{`Unable to parse sequence data for chain ${sequence?.chain}`}</p>
                                    </div>
                                )
                            }
                            return (<MoorhenSequenceViewer
                                key={`${props.molecule.molNo}-${sequence.chain}`}
                                sequence={sequence}
                                molecule={props.molecule}
                                glRef={props.glRef}
                                useMainStateResidueSelections={true}
                                clickedResidue={props.clickedResidue}
                                setClickedResidue={props.setClickedResidue}
                                selectedResidues={props.selectedResidues}
                                setSelectedResidues={props.setSelectedResidues}
                            />)
                        }
                    )}
                </Col>
            </Row>
        </>
        :
        <div>
            <b>No sequence data</b>
        </div>
}