import { useCallback, useState } from "react"
import { Col, Row, Form, Card, Button } from 'react-bootstrap';
import { MoorhenValidationListWidgetBase } from "./MoorhenValidationListWidgetBase"
import { MoorhenSlider } from '../misc/MoorhenSlider' 
import { libcootApi } from "../../types/libcoot";
import { moorhen } from "../../types/moorhen";
import { useDispatch, useSelector } from "react-redux";
import { triggerUpdate } from "../../store/moleculeMapUpdateSlice";
import { MoorhenResidueSteps } from '../toasts/MoorhenResidueSteps';
import { setNotificationContent } from '../../store/generalStatesSlice';
import { cidToSpec, sleep } from '../../utils/MoorhenUtils';
import { setShowPepFlipsValidationModal } from "../../store/activeModalsSlice";

interface Props extends moorhen.CollectedProps {
    dropdownId: number;
    accordionDropdownId: number;
    setAccordionDropdownId: React.Dispatch<React.SetStateAction<number>>;
    sideBarWidth: number;
    showSideBar: boolean;
}

export const MoorhenPepflipsDifferenceMap = (props: Props) => {
    
    const [selectedRmsd, setSelectedRmsd] = useState<number>(4.5)
    
    const dispatch = useDispatch()
    const enableRefineAfterMod = useSelector((state: moorhen.State) => state.refinementSettings.enableRefineAfterMod)
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)

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

    const fetchCardData = async (selectedModel: number, selectedMap: number): Promise<libcootApi.InterestingPlaceDataJS[]> => {

        if (selectedRmsd === null) {
            return null
        }
        
        const inputData: moorhen.cootCommandKwargs = {
            message:'coot_command',
            command: "pepflips_using_difference_map", 
            returnType:'interesting_places_data',
            commandArgs:[selectedModel, selectedMap, selectedRmsd]
        }
        
        let response = await props.commandCentre.current.cootCommand(inputData, false) as moorhen.WorkerResponse<libcootApi.InterestingPlaceDataJS[]>
        let newPepflips = response.data.result.result

        return newPepflips
    }

    const handleFlipAll = useCallback(async (selectedMolecule: moorhen.Molecule, residues: libcootApi.InterestingPlaceDataJS[]) => {
        dispatch( setShowPepFlipsValidationModal(false) )
        if (selectedMolecule) {
            const handleStepFlipPeptide = async (cid: string) => {
                const resSpec = cidToSpec(cid)
                await selectedMolecule.centreAndAlignViewOn(cid, false)
                await sleep(1000)
                await flipPeptide(selectedMolecule, resSpec.chain_id, resSpec.res_no, resSpec.ins_code)
            }

            const residueList = residues.map(residue => {
                return {
                    cid: `//${residue.chainId}/${residue.resNum}/`
                }
            })
        
            dispatch( setNotificationContent(
                <MoorhenResidueSteps 
                    timeCapsuleRef={props.timeCapsuleRef}
                    residueList={residueList}
                    sleepTime={1500}
                    onStep={handleStepFlipPeptide}
                    onStart={async () => {
                        await selectedMolecule.fetchIfDirtyAndDraw('rama')
                    }}
                    onStop={() => {
                        selectedMolecule.clearBuffersOfStyle('rama')
                    }}
                />
            ))
        }
    }, [molecules])
    
    const getCards = useCallback((selectedModel: number, selectedMap: number, newPepflips: libcootApi.InterestingPlaceDataJS[]): JSX.Element[] => {
        const selectedMolecule =  molecules.find(molecule => molecule.molNo === selectedModel)
        let cards = newPepflips.map((flip, index) => {
            return <Card key={index} style={{marginTop: '0.5rem'}}>
                    <Card.Body style={{padding:'0.5rem'}}>
                        <Row style={{display:'flex', justifyContent:'between'}}>
                            <Col style={{alignItems:'center', justifyContent:'left', display:'flex'}}>
                                {flip.buttonLabel}
                            </Col>
                            <Col className='col-3' style={{margin: '0', padding:'0', justifyContent: 'right', display:'flex'}}>
                                <Button style={{marginRight:'0.5rem'}} onClick={() => selectedMolecule.centreAndAlignViewOn(`//${flip.chainId}/${flip.resNum}-${flip.resNum}/`, false)}>
                                    View
                                </Button>
                                <Button style={{marginRight:'0.5rem'}} onClick={() => {
                                    handleFlip(selectedMolecule, flip.chainId, flip.resNum, flip.insCode)
                                }}>
                                    Flip
                                </Button>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>
        })
        if (cards.length > 0) {
            const button = <Button style={{width: '100%'}} onClick={() => handleFlipAll(selectedMolecule, newPepflips)} key='flip-all-button'>
                Flip all
            </Button>
            cards = [button, ...cards]
        }
        return cards
    }, [molecules])

    return <MoorhenValidationListWidgetBase 
                sideBarWidth={props.sideBarWidth}
                dropdownId={props.dropdownId}
                accordionDropdownId={props.accordionDropdownId}
                showSideBar={props.showSideBar}
                filterMapFunction={filterMapFunction}
                fetchData={fetchCardData}
                getCards={getCards}
                extraControlFormValue={selectedRmsd}
                extraControlForm={
                    <Col style={{justifyContent:'center', alignContent:'center', alignItems:'center', display:'flex'}}>
                        <Form.Group controlId="rmsdSlider" style={{margin:'0.5rem', width: '100%'}}>
                            <MoorhenSlider minVal={2.5} maxVal={7.0} logScale={false} sliderTitle="RMSD" initialValue={4.5} externalValue={selectedRmsd} setExternalValue={setSelectedRmsd}/>
                        </Form.Group>
                    </Col>
                }
            />
}
