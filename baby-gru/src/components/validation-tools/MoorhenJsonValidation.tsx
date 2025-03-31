import { useCallback, useState, useRef } from "react"
import { Col, Row, Form, Card } from 'react-bootstrap';
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
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect";
import { Icon, Button, IconButton } from "@mui/material";
import { CenterFocusWeakOutlined } from "@mui/icons-material";

export const MoorhenJsonValidation = (propsIn: {validationJson:any, collectedProps: moorhen.CollectedProps}) => {

    const props = propsIn.collectedProps
    const dispatch = useDispatch()

    const enableRefineAfterMod = useSelector((state: moorhen.State) => state.refinementSettings.enableRefineAfterMod)
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)
    const useRamaRestraints = useSelector((state: moorhen.State) => state.refinementSettings.useRamaRefinementRestraints)

    const { enqueueSnackbar } = useSnackbar()

    const filterMapFunction = (map: moorhen.Map) => map.isDifference

    const intoMoleculeRef = useRef<HTMLSelectElement | null>(null)

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

    const handleRefine = async (selectedMolecule: moorhen.Molecule, chainId: string, seqNum: number, insCode: string, method: string, tripleWithRama: boolean) => {

        if(tripleWithRama){
            await props.commandCentre.current.cootCommand({
                command: 'set_use_rama_plot_restraints',
                commandArgs: [true],
                returnType: "status"
            }, false)
        }

        await selectedMolecule.refineResiduesUsingAtomCid(`//${chainId}/${seqNum}`, method, 4000, true)

        if(tripleWithRama){
            //Restore previous setting, whether true or false
            await props.commandCentre.current.cootCommand({
                command: 'set_use_rama_plot_restraints',
                commandArgs: [useRamaRestraints],
                returnType: "status"
            }, false)
        }

        selectedMolecule.setAtomsDirty(true)
        await selectedMolecule.redraw()
        dispatch( triggerUpdate(selectedMolecule.molNo) )
    }

    const handleTripleRefineWithRamaRestraints = async (selectedMolecule: moorhen.Molecule, chainId: string, seqNum: number, insCode: string) => {
        //TODO - The Rama restraints!
        await selectedMolecule.refineResiduesUsingAtomCid(`//${chainId}/${seqNum}`, 'TRIPLE', 4000, true)
        selectedMolecule.setAtomsDirty(true)
        await selectedMolecule.redraw()
        dispatch( triggerUpdate(selectedMolecule.molNo) )
    }

    const handleAutoFitRotamer = async (selectedMolecule: moorhen.Molecule, chainId: string, seqNum: number, insCode: string) => {
        await props.commandCentre.current.cootCommand({
            returnType: "status",
            command: "fill_partial_residue",
            commandArgs: [
                selectedMolecule.molNo,
                chainId,
                chainId,
                insCode
            ],
            changesMolecules: [selectedMolecule.molNo]
        }, true)

        selectedMolecule.setAtomsDirty(true)
        await selectedMolecule.redraw()
        dispatch( triggerUpdate(selectedMolecule.molNo) )
        
    }

    const handleFlip = (...args: [moorhen.Molecule, string, number, string]) => {
        if (args.every(arg => arg !== null)) {
            flipPeptide(...args)
        }
    }


    const refine_svg = `${props.urlPrefix}/pixmaps/refine-1.svg`
    const flip_svg = `${props.urlPrefix}/pixmaps/flip-peptide.svg`
    const auto_fit_svg = `${props.urlPrefix}/pixmaps/auto-fit-rotamer.svg`

    const refineSvgIcon = (
        <Icon>
          <img alt="Refine" src={refine_svg} style={{verticalAlign:"top", height: "100%", width: "100%"}}/>
        </Icon>
    )

    const flipSvgIcon = (
        <Icon>
          <img alt="Flip peptide" src={flip_svg} style={{verticalAlign:"top", height: "100%", width: "100%"}}/>
        </Icon>
    )

    const autoFitRotamerSvgIcon = (
        <Icon>
          <img alt="Auto fit rotamer" src={auto_fit_svg} style={{verticalAlign:"top", height: "100%", width: "100%"}}/>
        </Icon>
    )

    const fetchCardData = useCallback(() => {
        let cards = []

        let selectedMolecule
        if(intoMoleculeRef.current)
            selectedMolecule = molecules.find(molecule => molecule.molNo === parseInt(intoMoleculeRef.current.value))

        if(propsIn.validationJson&&propsIn.validationJson.items){
            const things = propsIn.validationJson.items
            //console.log(things)
            cards = things.map((issue, index) => {
                let additionalLabel = ""
                let chainId = ""
                let resNum = -9999
                let insCode = ""
                if(issue["position-type"]&&issue["position-type"]==="by-residue-spec"&&issue["residue-spec"]){
                   additionalLabel = issue["residue-spec"][0]+"/"+issue["residue-spec"][1]
                   chainId = issue["residue-spec"][0]
                   resNum = parseInt(issue["residue-spec"][1])
                   insCode = issue["residue-spec"][2]
                }
                if(issue["position-type"]&&issue["position-type"]==="by-atom-spec-pair"&&issue["atom-1-spec"]&&issue["atom-2-spec"]){
                   additionalLabel = issue["atom-1-spec"][0]+"/"+issue["atom-1-spec"][1]+"/"+issue["atom-1-spec"][3] + " <--> " +
                                     issue["atom-2-spec"][0]+"/"+issue["atom-2-spec"][1]+"/"+issue["atom-2-spec"][3]
                   chainId = issue["atom-1-spec"][0]
                   resNum = parseInt(issue["atom-1-spec"][1])
                   insCode = issue["atom-1-spec"][2]
                }
                return <Card key={index} style={{marginTop: '0.5rem'}}>
                        <Card.Body style={{padding:'0.5rem'}}>
                             <Row>
                                <Col style={{alignItems:'center', justifyContent:'left', display:'flex'}}>
                                    {issue.label} {additionalLabel}
                                </Col>
                                <Col className='col-3' style={{margin: '0', padding:'0', justifyContent: 'right', display:'flex'}}>
                                    {selectedMolecule && <IconButton title="Centre on" aria-label="Centre on" style={{marginRight:'0.5rem'}} onClick={() => selectedMolecule.centreAndAlignViewOn(`//${chainId}/${resNum}-${resNum}/`, false)}>
                                        <CenterFocusWeakOutlined/>
                                    </IconButton>}
                                    {(selectedMolecule && issue["action"].indexOf("sphere-refinement-action")>-1) && <Button title="Sphere Refine" aria-label="Sphere Refine" sx={{ marginRight: '0.5rem', p: 0, minWidth:0 }} startIcon={refineSvgIcon} onClick={() => {
                                        handleRefine(selectedMolecule, chainId, resNum, insCode, "SPHERE", false)
                                    }}/>}
                                    {(selectedMolecule && issue["action"].indexOf("triple-refinement-with-rama-restraints-action")>-1) && <Button title="Triple Refine with Rama restraints" aria-label="Triple Refine with Rama restraints" startIcon={refineSvgIcon} sx={{ marginRight: '0.5rem', p: 0, minWidth:0 }} onClick={() => {
                                        handleRefine(selectedMolecule, chainId, resNum, insCode, "TRIPLE", false)
                                    }}/>}
                                    {(selectedMolecule && issue["action"].indexOf("triple-refinement-action")>-1) && <Button title="Triple Refine" aria-label="Triple Refine" sx={{ marginRight: '0.5rem', p: 0, minWidth:0 }} startIcon={refineSvgIcon} onClick={() => {
                                        handleRefine(selectedMolecule, chainId, resNum, insCode, "TRIPLE", false)
                                    }}/>}
                                    {(selectedMolecule && issue["action"].indexOf("side-chain-flip-action")>-1) && <Button title="Flip side chain" aria-label="Flip side chain" sx={{ marginRight: '0.5rem', p: 0, minWidth:0 }} startIcon={flipSvgIcon} onClick={() => {
                                        handleFlip(selectedMolecule, chainId, resNum, insCode)
                                    }}/>}
                                    {(selectedMolecule && issue["action"].indexOf("auto-fit-rotamer-action")>-1) && <Button title="Auto fit rotamer" aria-label="Auto fit rotamer" sx={{ marginRight: '0.5rem', p: 0, minWidth:0 }} startIcon={autoFitRotamerSvgIcon} onClick={() => {
                                        handleAutoFitRotamer(selectedMolecule, chainId, resNum, insCode)
                                    }}/>}
                                </Col>
                             </Row>
                        </Card.Body>
                    </Card>
            })
            return cards
        }
    },[propsIn,molecules])

    const cards = fetchCardData()
    return <>
                <MoorhenMoleculeSelect
                    width=""
                    label="Molecule"
                    allowAny={false}
                    molecules={molecules}
                    ref={intoMoleculeRef}
                    />
           {cards}
           </>
}
