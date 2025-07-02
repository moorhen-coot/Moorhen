import React, { useMemo, useCallback } from "react";
import { MoorhenSequenceViewer, moorhenSequenceToSeqViewer, MoorhenSeqViewTypes } from "../sequence-viewer/MoorhenSequenceViewer";
import { cidToSpec, sequenceIsValid } from '../../utils/utils';
import { moorhen } from "../../types/moorhen";
import { useSelector, useDispatch} from "react-redux";
import { setHoveredAtom } from "../../store/hoveringStatesSlice";
import { setResidueSelection } from "../../store/generalStatesSlice";
import { useSnackbar } from "notistack";

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
    const { enqueueSnackbar } = useSnackbar()

    const hoveredAtom = useSelector((state: moorhen.State) => state.hoveringStates.hoveredAtom);
    const residueSelection = useSelector((state: moorhen.State) => state.generalStates.residueSelection);

    const sequenceSelection = useMemo(() => {
        const selection:MoorhenSeqViewTypes.ResiduesSelection | null = residueSelection.molecule ? {
            molNo: residueSelection.molecule.molNo,
            chain: residueSelection.first.split('/')[2], 
            range: [
                parseInt(residueSelection.first.split('/')[3]),
                residueSelection.second ? parseInt(residueSelection.second.split('/')[3]) : parseInt(residueSelection.first.split('/')[3])
            ]
        } : null;
        return selection;
    }, [residueSelection]);

    const sequenceList = useMemo<MoorhenSeqViewTypes.SeqElement[]>(() => {    
        const newSequenceList = props.molecule.sequences.map(
            sequence => {            
                if (!sequenceIsValid(sequence.sequence)) {
                    return null
                }
                const newSeq = moorhenSequenceToSeqViewer(sequence, props.molecule.name, props.molecule.molNo)
                newSeq.residues = newSeq.residues.map(res => ({
                    ...res,
                    colour: null
                }))
                const seqColour = props.molecule.representations[0].colourRules.find(rule => rule.cid === '//' + newSeq.chain)?.color
                newSeq.colour = seqColour ? `color-mix(in srgb, ${seqColour}, rgb(255,255,255) 50%)` : null
                return newSeq
            }
        )
        return newSequenceList
    }, [props.molecule.sequences]);


    const display = (sequenceList && sequenceList.length > 0) ? true : false;

    const handleClickResidue = useCallback(
        (modelIndex, molName, chain, seqNum) => {
            props.setClickedResidue({ modelIndex, molName, chain, seqNum });
        },
        [props.setClickedResidue]
    );

    const handleResiduesSelection = useCallback(
        (selection: MoorhenSeqViewTypes.ResiduesSelection) => {
            if (selection.molNo !== props.molecule.molNo) return;
            const first = Math.min(selection.range[0], selection.range[1]);
            const second = Math.max(selection.range[0], selection.range[1]);
            const newSelection: moorhen.ResidueSelection = {
                molecule: props.molecule,
                first: '/1/' + selection.chain + '/' + first + '/CA',
                second: '/1/' + selection.chain + '/' + second + '/CA',
                cid: '/*/' + selection.chain + '/' + first + '-' + second + '/*',
                isMultiCid: false,
                label: '/*/' + selection.chain + '/' + first + '-' + second + '/*',
            };
            dispatch(setResidueSelection(newSelection));
            props.molecule.drawResidueSelection(newSelection.cid as string);
            enqueueSnackbar("residue-selection", { variant: "residueSelection", persist: true });
        },
        [props.molecule, dispatch, enqueueSnackbar]
    );

    const handleHoverResidue = useCallback(
        (molName, chain, resNum, resCode, resCID) => {
            dispatch(setHoveredAtom({ molecule: props.molecule, cid: resCID }));
        },
        [dispatch, props.molecule]
    );

    const hoveredResidue = useMemo (() => {
        if (hoveredAtom.cid) {
            const resInfo = cidToSpec(hoveredAtom.cid) 
            return {molNo: hoveredAtom.molecule.molNo, chain: resInfo.chain_id, resNum: resInfo.res_no}
        }
        else { return null}

    },[hoveredAtom])
    
    return (
        !display ? 
        <div>
            <b>No sequence data</b>
        </div>
        :
        <MoorhenSequenceViewer
            sequences={sequenceList}
            selectedResidues={sequenceSelection}
            onResidueClick={handleClickResidue}
            onResiduesSelect={handleResiduesSelection}
            onHoverResidue={handleHoverResidue}
            hoveredResidue={hoveredResidue}
            maxDisplayHeight={8}
        />
);
};