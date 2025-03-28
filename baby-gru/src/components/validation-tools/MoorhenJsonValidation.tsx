import { useCallback, useState } from "react"
import { Col, Row, Form, Card, Button } from 'react-bootstrap';
import { MoorhenValidationListWidgetBase } from "./MoorhenValidationListWidgetBase"
import { MoorhenSlider } from '../misc/MoorhenSlider' 
import { libcootApi } from "../../types/libcoot";
import { moorhen } from "../../types/moorhen";
import { useDispatch, useSelector } from "react-redux";
import { triggerUpdate } from "../../store/moleculeMapUpdateSlice";
import { cidToSpec, sleep } from '../../utils/utils';
import { hideModal } from "../../store/modalsSlice";
import { useSnackbar } from "notistack";
import { modalKeys } from "../../utils/enums";

export const MoorhenJsonValidation = (propsIn: {validationJson:any, collectedProps: moorhen.CollectedProps}) => {
    
    const props = propsIn.collectedProps
    const dispatch = useDispatch()

    const enableRefineAfterMod = useSelector((state: moorhen.State) => state.refinementSettings.enableRefineAfterMod)
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)

    const { enqueueSnackbar } = useSnackbar()

    const filterMapFunction = (map: moorhen.Map) => map.isDifference

    const flipPeptide = async (selectedMolecule: moorhen.Molecule, chainId: string, seqNum: number, insCode: string) => {
        await props.commandCentre.current.cootCommand({
            returnType: "status",
            command: "flipPeptide_cid",
            commandArgs: [selectedMolecule.molNo, `//${chainId}/${seqNum}/C`, ''],
            changesMolecules: [selectedMolecule.molNo]
        }, true)

        if (enableRefineAfterMod) {
            await props.commandCentre.current.cootCommand({
                returnType: "status",
                command: 'refine_residues_using_atom_cid',
                commandArgs: [selectedMolecule.molNo, `//${chainId}/${seqNum}`, 'TRIPLE', 4000],
                changesMolecules: [selectedMolecule.molNo]
            }, true)    
        }

        selectedMolecule.setAtomsDirty(true)
        await selectedMolecule.redraw()
        dispatch( triggerUpdate(selectedMolecule.molNo) )
    }

    const handleFlip = (...args: [moorhen.Molecule, string, number, string]) => {
        if (args.every(arg => arg !== null)) {
            flipPeptide(...args)
        }
    }

    const fetchCardData = useCallback(() => {
        const things = propsIn.validationJson.items
        return things
    },[propsIn])

    /*
                                <Button style={{marginRight:'0.5rem'}} onClick={() => selectedMolecule.centreAndAlignViewOn(`//${flip.chainId}/${flip.resNum}-${flip.resNum}/`, false)}>
                                <Button style={{marginRight:'0.5rem'}} onClick={() => {
                                    handleFlip(selectedMolecule, flip.chainId, flip.resNum, flip.insCode)
                                }}>
    */
    
    let cards = []
    //const selectedMolecule =  molecules.find(molecule => molecule.molNo === selectedModel)
    if(propsIn.validationJson&&propsIn.validationJson.items){
        const things = propsIn.validationJson.items
        console.log(things)
        cards = things.map((flip, index) => {
            let additionalLabel = ""
            if(flip["position-type"]&&flip["position-type"]==="by-residue-spec"&&flip["residue-spec"])
               additionalLabel = flip["residue-spec"][0]+"/"+flip["residue-spec"][1]
            if(flip["position-type"]&&flip["position-type"]==="by-atom-spec-pair"&&flip["atom-1-spec"]&&flip["atom-2-spec"])
               additionalLabel = flip["atom-1-spec"][0]+"/"+flip["atom-1-spec"][1]+"/"+flip["atom-1-spec"][3] + " <--> " +
                                 flip["atom-2-spec"][0]+"/"+flip["atom-2-spec"][1]+"/"+flip["atom-2-spec"][3]
            return <Card key={index} style={{marginTop: '0.5rem'}}>
                    <Card.Body style={{padding:'0.5rem'}}>
                         <Row>
                            <Col style={{alignItems:'center', justifyContent:'left', display:'flex'}}>
                                {flip.label} {additionalLabel}
                            </Col>
                            <Col className='col-3' style={{margin: '0', padding:'0', justifyContent: 'right', display:'flex'}}>
                                <Button style={{marginRight:'0.5rem'}}>
                                    View
                                </Button>
                                <Button style={{marginRight:'0.5rem'}}>
                                    Flip
                                </Button>
                            </Col>
                         </Row>
                    </Card.Body>
                </Card>
        })
    }

    return <>
           {cards}
           </>
}
