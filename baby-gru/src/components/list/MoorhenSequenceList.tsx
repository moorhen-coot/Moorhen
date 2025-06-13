import React, { use, useEffect, useState } from "react";
import { Row, Col } from "react-bootstrap";
import { MoorhenSequenceViewer } from "../sequence-viewer/MoorhenSequenceViewer";
import { convertViewtoPx, sequenceIsValid } from '../../utils/utils';
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { useSelector, useDispatch} from "react-redux";
import { setHoveredAtom } from "../../store/hoveringStatesSlice";

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

    const dispatch = useDispatch();
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)
    const [sequenceList, setSequenceList] = useState<null | {sequence: (moorhen.Sequence | null), molName }[]>(null)

    useEffect(() => {
        props.setBusy(true)
        
        const newSequenceList = props.molecule.sequences.map(
            sequence => {
                if (!sequenceIsValid(sequence.sequence)) {
                    return {sequence: null, molName: props.molecule.name}
                }
                return { sequence: sequence, molName: props.molecule.name}
            }
        )      
        setSequenceList(newSequenceList)
        props.setBusy(false)

    }, [props.molecule.sequences]);

    const display = (sequenceList && sequenceList.length > 0) ? true : false;

    return (
        !display ? 
        <div>
            <b>No sequence data</b>
        </div>
        :
        <MoorhenSequenceViewer
            sequences={sequenceList}
            glRef={props.glRef}
            useMainStateResidueSelections={true}
            clickedResidue={props.clickedResidue}
            setClickedResidue={props.setClickedResidue}
            selectedResidues={props.selectedResidues}
            setSelectedResidues={props.setSelectedResidues}
            onHoverResidue={(molName, chain, resNum, resCode, resCID) => {dispatch(setHoveredAtom({ molecule: props.molecule, cid: resCID }));}}
            maxHeight={'16rem'}    
        />
);
};