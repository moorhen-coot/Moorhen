import { Fragment, useEffect, useRef, useState } from "react"
import { Col, Row, Form, Card, Button } from 'react-bootstrap';
import { MoorhenMapSelect } from './MoorhenMapSelect'
import { MoorhenMoleculeSelect } from './MoorhenMoleculeSelect'

export const MoorhenUnmodelledBlobs = (props) => {
    const mapSelectRef = useRef();
    const moleculeSelectRef = useRef();
    const [blobs, setBlobs] = useState(null)
    const [selectedModel, setSelectedModel] = useState(null)
    const [selectedMap, setSelectedMap] = useState(null)
    const [cachedGemmiStructure, setCachedGemmiStructure] = useState(null)
    const [cardList, setCardList] = useState([])
    
    const handleModelChange = (evt) => {
        setSelectedModel(parseInt(evt.target.value))
    }

    const handleMapChange = (evt) => {
        setSelectedMap(parseInt(evt.target.value))
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
        if (props.maps.length === 0 || props.maps.length === 0) {
            setSelectedMap(null)
        } else if (selectedMap === null) {
            setSelectedMap(props.maps[0].molNo)
        } else if (!props.maps.map(map => map.molNo).includes(selectedMap)) {
            setSelectedMap(props.maps[0].molNo)
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
            setBlobs(newPepflips)
        }

        if (selectedModel === null || selectedMap === null || cachedGemmiStructure === null) {
            setBlobs(null)
            return
        }
        
        const inputData = {
            message:'coot_command',
            command: "unmodelled_blobs", 
            returnType:'interesting_places_data',
            commandArgs:[selectedModel, selectedMap]
        }
    
        fetchData(inputData)   

    }, [selectedMap, selectedModel, cachedGemmiStructure])

    useEffect(() => {

        if (selectedMap === null || selectedModel === null || props.dropdownId !== props.accordionDropdownId || !props.showSideBar) {
            setCardList([])
            return
        }

        let newCardList = []

        blobs.forEach((blob, index) => {
            newCardList.push(
                <Card key={index} style={{marginTop: '0.5rem'}}>
                    <Card.Body style={{padding:'0.5rem'}}>
                        <Row style={{display:'flex', justifyContent:'between'}}>
                            <Col style={{alignItems:'center', justifyContent:'left', display:'flex'}}>
                                {`${blob.buttonLabel} ( ${parseFloat(blob.featureValue).toFixed(2)}`} A <sup>3</sup> {' )'}
                            </Col>
                            <Col className='col-3' style={{margin: '0', padding:'0', justifyContent: 'right', display:'flex'}}>
                                <Button style={{marginRight:'0.5rem'}} onClick={() => {
                                            props.glRef.current.setOriginAnimated([-blob.coordX, -blob.coordY, -blob.coordZ])
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
        
    }, [blobs, props.backgroundColor, props.sideBarWidth, props.showSideBar, props.accordionDropdownId])

    return <Fragment>
                <Form style={{ padding:'0', margin: '0' }}>
                    <Form.Group>
                        <Row style={{ padding:'0', margin: '0' }}>
                            <Col>
                                <MoorhenMoleculeSelect width="" onChange={handleModelChange} molecules={props.molecules} ref={moleculeSelectRef}/>
                            </Col>
                            <Col>
                                <MoorhenMapSelect width="" onChange={handleMapChange} maps={props.maps} ref={mapSelectRef}/>
                            </Col>
                        </Row>
                    </Form.Group>
                </Form>
                <div style={{overflowY:'scroll', height:'100%', paddingTop:'0.5rem', paddingLeft:'0.25rem', paddingRight:'0.25rem'}} >
                    {cardList}
                </div>
            </Fragment>

}
