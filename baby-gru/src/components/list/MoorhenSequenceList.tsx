import React, { useEffect, useState, useMemo } from "react";
import { MoorhenSequenceViewer, SequenceResiduesSelection } from "../sequence-viewer/MoorhenSequenceViewer";
import { convertViewtoPx, sequenceIsValid } from '../../utils/utils';
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { useSelector, useDispatch} from "react-redux";
import { setHoveredAtom } from "../../store/hoveringStatesSlice";
import { cidToAtomInfo } from "../../utils/utils";

export const MoorhenSequenceList = (props: { 
    setBusy: React.Dispatch<React.SetStateAction<boolean>>;
    molecule: moorhen.Molecule; 
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
    const [sequenceList, setSequenceList] = useState<null | {sequence: (moorhen.Sequence | null), molName: string, molNo: number }[]>(null)
    const updateSwitch = useSelector((state: moorhen.State) => state.moleculeMapUpdate.moleculeUpdate.switch);
    const hoveredAtom = useSelector((state: moorhen.State) => state.hoveringStates.hoveredAtom);
    const residueSelection = useSelector((state: moorhen.State) => state.generalStates.residueSelection);
    const [sequenceSelection, setSequenceSelection] = useState<SequenceResiduesSelection | null>(null)
    
    useEffect(() => {
        const selection:SequenceResiduesSelection | null = residueSelection.molecule ? {
            molNo: residueSelection.molecule.molNo, 
            chain: residueSelection.first.split('/')[2], 
            range: [
                parseInt(residueSelection.first.split('/')[3]),
                residueSelection.second ? parseInt(residueSelection.second.split('/')[3]) : parseInt(residueSelection.first.split('/')[3])
            ]
        } : null;

        setSequenceSelection(selection)
        console.log(selection)
    }, [residueSelection]);

    useEffect(() => {
        props.setBusy(true)
        
        const newSequenceList = props.molecule.sequences.map(
            sequence => {
                if (!sequenceIsValid(sequence.sequence)) {
                    return {sequence: null, molName: props.molecule.name, molNo: props.molecule.molNo}
                }
                return { sequence: sequence, molName: props.molecule.name, molNo: props.molecule.molNo}
            }
        )      
        setSequenceList(newSequenceList)
        props.setBusy(false)

    }, [props.molecule.sequences, updateSwitch]);

    const display = (sequenceList && sequenceList.length > 0) ? true : false;

    const handleClickResidue = (modelIndex: number, molName: string, chain: string, seqNum: number ) => {
        props.setClickedResidue({modelIndex, molName, chain, seqNum})
    }

    const handleResiduesSelection = () => {
        props.setSelectedResidues
    }

    return (
        !display ? 
        <div>
            <b>No sequence data</b>
        </div>
        :
        <MoorhenSequenceViewer
            sequences={sequenceList}
            selectedResidues={sequenceSelection}
            onResidueClick={(modelIndex, molName, chain, seqNum) => handleClickResidue(modelIndex, molName, chain, seqNum )}
            onResiduesSelect={handleResiduesSelection}
            onHoverResidue={(molName, chain, resNum, resCode, resCID) => {dispatch(setHoveredAtom({ molecule: props.molecule, cid: resCID }));}}
            hoveredResidue={hoveredAtom ? { molNo: props.molecule.molNo, cid: hoveredAtom.cid } : { molNo: null, cid: null }}
            maxDisplayHigh={8}
        />
);
};