import { Fragment, useEffect, useRef, useState } from "react"
import { Col, Row, Form, Card, Button } from 'react-bootstrap';
import { BabyGruMapSelect } from './BabyGruMapSelect'
import { BabyGruMoleculeSelect } from './BabyGruMoleculeSelect'
import BabyGruSlider from './BabyGruSlider' 

export const BabyGruPepflipsDifferenceMap = (props) => {
    const mapSelectRef = useRef();
    const moleculeSelectRef = useRef();
    const [pepflips, setPepflips] = useState(null)
    const [selectedModel, setSelectedModel] = useState(null)
    const [selectedMap, setSelectedMap] = useState(null)
    const [cachedAtoms, setCachedAtoms] = useState(null)
    const [selectedRmsd, setSelectedRmsd] = useState(4.5)
    const [cardList, setCardList] = useState([])
    
    const isValidRmsd = (value) => {
        if(value < 2.5 || value > 7.0) {
            return false
        } 
        return true
    }

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
        setSelectedModel(evt.target.value)
    }

    const handleMapChange = (evt) => {
        console.log(`Selected map ${evt.target.value}`)
        setSelectedMap(evt.target.value)
    }

    const handleRmsdChange = (evt) => {
        if (isValidRmsd(evt.target.value)){
            console.log(`Selected RMSD ${evt.target.value}`)
            setSelectedRmsd(evt.target.value)
        } else {
            console.log('Invalid RMSD selected...')
            setSelectedRmsd(null)
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
            let selectedMoleculeIndex = props.molecules.findIndex(molecule => molecule.molNo == selectedModel);
            if (selectedMoleculeIndex != -1 && props.molecules[selectedMoleculeIndex]){
                setCachedAtoms(props.molecules[selectedMoleculeIndex].cachedAtoms)
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
            commandArgs:[selectedMap, selectedModel, selectedRmsd]
        }
    
        fetchData(inputData)   

    }, [selectedMap, selectedModel, cachedAtoms, selectedRmsd])

    useEffect(() => {

        if (selectedMap === null || selectedModel === null || selectedRmsd === null || !props.toolAccordionBodyHeight || !props.showSideBar) {
            return;
        }

        let newCardList = []

        pepflips.forEach(flip => {
            newCardList.push(
                <Card style={{margin: '0.5rem'}}>
                    <Card.Body>
                        <Row style={{display:'flex', justifyContent:'between'}}>
                            <Col style={{alignItems:'center', justifyContent:'left', display:'flex'}}>
                                {flip.buttonLabel}
                            </Col>
                            <Col className='col-3' style={{margin: '0', padding:'0', justifyContent: 'right', display:'flex'}}>
                                <Button onClick={() => {
                                            props.glRef.current.setOrigin([-flip.coordX, -flip.coordY, -flip.coordZ])
                                }}>
                                    View
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
                                <BabyGruMoleculeSelect width="" onChange={handleModelChange} molecules={props.molecules} ref={moleculeSelectRef}/>
                            </Col>
                            <Col>
                                <BabyGruMapSelect onlyDifferenceMaps={true} width="" onChange={handleMapChange} maps={props.maps} ref={mapSelectRef}/>
                            </Col>
                            <Col style={{justifyContent:'center', alignContent:'center', alignItems:'center', display:'flex'}}>
                                <Form.Group controlId="rmsdSlider" style={{margin:'0.5rem', width: '100%'}}>
                                    <BabyGruSlider minVal={2.5} maxVal={7.0} logScale={false} sliderTitle="RMSD" intialValue={4.5} externalValue={selectedRmsd} setExternalValue={setSelectedRmsd}/>
                                </Form.Group>
                            </Col>
                        </Row>
                    </Form.Group>
                </Form>
                <div style={{overflowY:'scroll', height:'100%', paddingTop:'0.5rem'}} >
                    {cardList}
                </div>
            </Fragment>

}
