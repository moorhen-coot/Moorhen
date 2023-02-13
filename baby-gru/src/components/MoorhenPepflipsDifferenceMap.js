import { Fragment, useEffect, useRef, useState } from "react"
import { Col, Row, Form, Card, Button } from 'react-bootstrap';
import { MoorhenMapSelect } from './MoorhenMapSelect'
import { MoorhenMoleculeSelect } from './MoorhenMoleculeSelect'
import MoorhenSlider from './MoorhenSlider' 

export const MoorhenPepflipsDifferenceMap = (props) => {
    const mapSelectRef = useRef();
    const moleculeSelectRef = useRef();
    const [pepflips, setPepflips] = useState(null)
    const [selectedModel, setSelectedModel] = useState(null)
    const [selectedMap, setSelectedMap] = useState(null)
    const [cachedGemmiStructure, setCachedGemmiStructure] = useState(null)
    const [selectedRmsd, setSelectedRmsd] = useState(4.5)
    const [cardList, setCardList] = useState([])
    
    const getDifferenceMaps = () => {
        let differenceMaps = []
        
        if (props.maps) {
            props.maps.forEach(map => {
                if(map.isDifference){
                    differenceMaps.push(map)
                }
            })
        }

        return differenceMaps

    }

    const handleModelChange = (evt) => {
        console.log(`Selected model ${evt.target.value}`)
        setSelectedModel(parseInt(evt.target.value))
    }

    const handleMapChange = (evt) => {
        console.log(`Selected map ${evt.target.value}`)
        setSelectedMap(parseInt(evt.target.value))
    }

    const handleFlip = (...args) => {
        const flipPeptide = async (selectedMolNo, chainId, insCode, seqNum) => {
            await props.commandCentre.current.cootCommand({
                returnType: "status",
                command: "flipPeptide_cid",
                commandArgs: [selectedMolNo, `/${insCode}/${chainId}/${seqNum}/C`, ''],
                changesMolecules: [selectedMolNo]
            }, true)

            if (props.refineAfterMod) {
                console.log('Triggering post-modification triple refinement...')
                await props.commandCentre.current.cootCommand({
                    returnType: "status",
                    command: 'refine_residues_using_atom_cid',
                    commandArgs: [selectedMolNo, `/${insCode}/${chainId}/${seqNum}`, 'TRIPLE'],
                    changesMolecules: [selectedMolNo]
                }, true)    
            }

            const selectedMolecule = props.molecules.find(molecule => molecule.molNo === selectedModel)
            selectedMolecule.setAtomsDirty(true)
            selectedMolecule.redraw(props.glRef)
            const mapUpdateEvent = new CustomEvent("mapUpdate", { detail: {origin: props.glRef.current.origin,  modifiedMolecule: selectedMolecule.molNo} })
            document.dispatchEvent(mapUpdateEvent)
        }

        if (args.every(arg => arg !== null)) {
            flipPeptide(...args)
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
        const differenceMaps = getDifferenceMaps()

        if (props.maps.length === 0 || differenceMaps.length === 0) {
            setSelectedMap(null)
        } else if (selectedMap === null) {
            setSelectedMap(differenceMaps[0].molNo)
        } else if (!differenceMaps.map(map => map.molNo).includes(selectedMap)) {
            setSelectedMap(differenceMaps[0].molNo)
        }

    }, [props.maps.length])
   
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
            let newPepflips = response.data.result.result
            setPepflips(newPepflips)
        }

        if (selectedModel === null || selectedMap === null || selectedRmsd === null) {
            setPepflips(null)
            return
        }
        
        const inputData = {
            message:'coot_command',
            command: "pepflips_using_difference_map", 
            returnType:'interesting_places_data',
            commandArgs:[selectedModel, selectedMap, selectedRmsd]
        }
    
        fetchData(inputData)   

    }, [selectedMap, selectedModel, cachedGemmiStructure, selectedRmsd])

    useEffect(() => {

        if (selectedMap === null || selectedModel === null || selectedRmsd === null || !props.toolAccordionBodyHeight || !props.showSideBar) {
            return;
        }

        let newCardList = []

        pepflips.forEach((flip, index) => {
            newCardList.push(
                <Card key={index} style={{marginTop: '0.5rem'}}>
                    <Card.Body style={{padding:'0.5rem'}}>
                        <Row style={{display:'flex', justifyContent:'between'}}>
                            <Col style={{alignItems:'center', justifyContent:'left', display:'flex'}}>
                                {flip.buttonLabel}
                            </Col>
                            <Col className='col-3' style={{margin: '0', padding:'0', justifyContent: 'right', display:'flex'}}>
                                <Button style={{marginRight:'0.5rem'}} onClick={() => {
                                            props.glRef.current.setOriginAnimated([-flip.coordX, -flip.coordY, -flip.coordZ])
                                }}>
                                    View
                                </Button>
                                <Button style={{marginRight:'0.5rem'}} onClick={() => {
                                            handleFlip(selectedModel, flip.chainId, flip.insCode,  flip.seqNum)
                                }}>
                                    Flip
                                </Button>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>
            )
        })

        setCardList(newCardList)
        
    }, [pepflips, props.darkMode, props.toolAccordionBodyHeight, props.sideBarWidth, props.showSideBar])

    return <Fragment>
                <Form style={{ padding:'0', margin: '0' }}>
                    <Form.Group>
                        <Row style={{ padding:'0', margin: '0' }}>
                            <Col>
                                <MoorhenMoleculeSelect width="" onChange={handleModelChange} molecules={props.molecules} ref={moleculeSelectRef}/>
                            </Col>
                            <Col>
                                <MoorhenMapSelect filterFunction={(map) => map.isDifference} width="" onChange={handleMapChange} maps={props.maps} ref={mapSelectRef}/>
                            </Col>
                            <Col style={{justifyContent:'center', alignContent:'center', alignItems:'center', display:'flex'}}>
                                <Form.Group controlId="rmsdSlider" style={{margin:'0.5rem', width: '100%'}}>
                                    <MoorhenSlider minVal={2.5} maxVal={7.0} logScale={false} sliderTitle="RMSD" initialValue={4.5} externalValue={selectedRmsd} setExternalValue={setSelectedRmsd}/>
                                </Form.Group>
                            </Col>
                        </Row>
                    </Form.Group>
                </Form>
                <div style={{overflowY:'scroll', height:'100%', paddingTop:'0.5rem', paddingLeft:'0.25rem', paddingRight:'0.25rem'}} >
                    {cardList}
                </div>
            </Fragment>

}
