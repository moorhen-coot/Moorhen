import { Fragment, useEffect, useRef, useState } from "react"
import { Col, Row, Form, Card, Button } from 'react-bootstrap';
import { MoorhenMoleculeSelect } from './MoorhenMoleculeSelect'

export const MoorhenFillMissingAtoms = (props) => {
    const moleculeSelectRef = useRef();
    const [residueList, setResidueList] = useState(null)
    const [selectedModel, setSelectedModel] = useState(null)
    const [cachedGemmiStructure, setCachedGemmiStructure] = useState(null)
    const [cardList, setCardList] = useState([])
    
    const handleModelChange = (evt) => {
        console.log(`Selected model ${evt.target.value}`)
        setSelectedModel(parseInt(evt.target.value))
    }

    const handleAtomFill = (...args) => {
        const fillPartialResidue = async (selectedMolecule, chainId, resNum, insCode) => {
            console.log(selectedMolecule, chainId, resNum, insCode)
            await props.commandCentre.current.cootCommand({
                returnType: "status",
                command: "fill_partial_residue",
                commandArgs: [selectedMolecule.molNo, chainId, resNum, insCode],
                changesMolecules: [selectedMolecule.molNo]
            }, true)

            if (props.refineAfterMod) {
                console.log('Triggering post-modification triple refinement...')
                await props.commandCentre.current.cootCommand({
                    returnType: "status",
                    command: 'refine_residues_using_atom_cid',
                    commandArgs: [selectedMolecule.molNo, `/${insCode}/${chainId}/${resNum}`, 'TRIPLE'],
                    changesMolecules: [selectedMolecule.molNo]
                }, true)    
            }
            selectedMolecule.setAtomsDirty(true)
            selectedMolecule.redraw(props.glRef)
            const mapUpdateEvent = new CustomEvent("mapUpdate", { detail: {origin: props.glRef.current.origin,  modifiedMolecule: selectedMolecule.molNo} })
            document.dispatchEvent(mapUpdateEvent);    
        }
        if (args.every(arg => arg !== null)) {
            fillPartialResidue(...args)
        }
    }

    useEffect(() => {
        if (props.molecules.length === 0) {
            setSelectedModel(null)
        } else if (selectedModel === null) {
            setSelectedModel(props.molecules[0].molNo)
        } else if (!props.molecules.map(molecule => molecule.molNo).includes(selectedModel)) {
            setSelectedModel(props.molecules[0].molNo)
        }

    }, [props.molecules.length])
   
    useEffect(() => {
        if (selectedModel !== null) {
            let selectedMoleculeIndex = props.molecules.findIndex(molecule => molecule.molNo === selectedModel);
            if (selectedMoleculeIndex !== -1 && props.molecules[selectedMoleculeIndex]){
                setCachedGemmiStructure(props.molecules[selectedMoleculeIndex].gemmiStructure)
            }
        }
    })
    
    useEffect(() => {
        async function fetchData(inputData) {
            let response = await props.commandCentre.current.cootCommand(inputData)
            let newResidueList = response.data.result.result
            setResidueList(newResidueList)
        }

        if (selectedModel === null) {
            setResidueList(null)
            return
        }
        
        const inputData = {
            message:'coot_command',
            command: "residues_with_missing_atoms", 
            returnType:'residue_specs',
            commandArgs:[selectedModel]
        }
    
        fetchData(inputData)   

    }, [selectedModel, cachedGemmiStructure])

    useEffect(() => {

        if (selectedModel === null || !props.toolAccordionBodyHeight || !props.showSideBar) {
            return;
        }

        let newCardList = []
        const selectedMolecule =  props.molecules.find(molecule => molecule.molNo === selectedModel)

        residueList.forEach(residue => {
            const label = `/${residue.modelNumber}/${residue.chainId}/${residue.resNum}${residue.insCode ? '.' + residue.insCode : ''}/`
            newCardList.push(
                <Card style={{margin: '0.5rem'}} key={label}>
                    <Card.Body>
                        <Row style={{display:'flex', justifyContent:'between'}}>
                            <Col style={{alignItems:'center', justifyContent:'left', display:'flex'}}>
                                {label}
                            </Col>
                            <Col className='col-3' style={{margin: '0', padding:'0', justifyContent: 'right', display:'flex'}}>
                                <Button onClick={() => selectedMolecule.centreOn(props.glRef, `/*/${residue.chainId}/${residue.resNum}-${residue.resNum}/*`)}>
                                    View
                                </Button>
                                <Button style={{marginRight:'0.5rem'}} onClick={() => {
                                            handleAtomFill(selectedMolecule, residue.chainId, residue.resNum, residue.insCode)
                                }}>
                                    Fill
                                </Button>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>
            )
        })

        setCardList(newCardList)
        
    }, [residueList, props.darkMode, props.toolAccordionBodyHeight, props.sideBarWidth, props.showSideBar])

    return <Fragment>
                <Form style={{ padding:'0', margin: '0' }}>
                    <Form.Group>
                        <Row style={{ padding:'0', margin: '0' }}>
                            <Col>
                                <MoorhenMoleculeSelect width="" onChange={handleModelChange} molecules={props.molecules} ref={moleculeSelectRef}/>
                            </Col>
                        </Row>
                    </Form.Group>
                </Form>
                <div style={{overflowY:'scroll', height:'100%', paddingTop:'0.5rem'}} >
                    {cardList}
                </div>
            </Fragment>

}
