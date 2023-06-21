import { Fragment, useEffect, useRef, useState } from "react"
import { Col, Row, Form } from 'react-bootstrap';
import { MoorhenMapSelect } from '../select/MoorhenMapSelect'
import { MoorhenMoleculeSelect } from '../select/MoorhenMoleculeSelect'
import { moorhen } from "../../types/moorhen";
import { gemmi } from "../../types/gemmi";

export const MoorhenValidationListWidgetBase = (props: {
    molecules: moorhen.Molecule[];
    maps: moorhen.Map[];
    filterMapFunction?: (arg0: moorhen.Map) => boolean;
    fetchData: (arg0: number, arg1: number) => Promise<any>;
    dropdownId: number;
    accordionDropdownId: number;
    showSideBar: boolean;
    getCards: (arg0: number, arg1: number, arg2: any) => JSX.Element[];
    backgroundColor: [number, number, number, number];
    sideBarWidth: number;
    extraControlForm?: JSX.Element;
    extraControlFormValue?: any;
    enableMapSelect?: boolean;
}) => {

    const mapSelectRef = useRef<undefined | HTMLSelectElement>();
    const moleculeSelectRef = useRef<undefined | HTMLSelectElement>();
    const [selectedModel, setSelectedModel] = useState<null | number>(null)
    const [selectedMap, setSelectedMap] = useState<null | number>(null)
    const [cachedGemmiStructure, setCachedGemmiStructure] = useState<null | gemmi.Structure>(null)
    const [cardData, setCardData] = useState<any[]>([])
    const [cardList, setCardList] = useState<JSX.Element[]>([])
    
    const handleModelChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedModel(parseInt(evt.target.value))
    }

    const handleMapChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
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
        const filteredMaps = props.maps.filter(map => props.filterMapFunction(map))

        if (props.maps.length === 0 || filteredMaps.length === 0) {
            setSelectedMap(null)
        } else if (selectedMap === null) {
            setSelectedMap(filteredMaps[0].molNo)
        } else if (!filteredMaps.map(map => map.molNo).includes(selectedMap)) {
            setSelectedMap(filteredMaps[0].molNo)
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
        async function fetchData() {
            if (selectedModel === null || (props.enableMapSelect && selectedMap === null)) {
                setCardData(null)
            } else {
                let newData = await props.fetchData(selectedModel, selectedMap)
                setCardData(newData)
            }            
        }        
    
        fetchData()   

    }, [selectedMap, selectedModel, cachedGemmiStructure, props.extraControlFormValue])

    useEffect(() => {
        if (selectedModel === null || (props.enableMapSelect && selectedMap === null) || cardData === null || props.dropdownId !== props.accordionDropdownId || !props.showSideBar) {
            setCardList([])
        } else {
            const newCardList = props.getCards(selectedModel, selectedMap, cardData)
            setCardList(newCardList)
        }
    }, [cardData, props.backgroundColor, props.sideBarWidth, props.showSideBar, props.accordionDropdownId])

    return <Fragment>
                <Form style={{ padding:'0', margin: '0' }}>
                    <Form.Group>
                        <Row style={{ padding:'0', margin: '0' }}>
                            <Col>
                                <MoorhenMoleculeSelect width="" onChange={handleModelChange} molecules={props.molecules} ref={moleculeSelectRef}/>
                            </Col>
                            {props.enableMapSelect && 
                            <Col>
                                <MoorhenMapSelect filterFunction={props.filterMapFunction} width="" onChange={handleMapChange} maps={props.maps} ref={mapSelectRef}/>
                            </Col>
                            }
                            {props.extraControlForm}
                        </Row>
                    </Form.Group>
                </Form>
                <div style={{overflowY:'scroll', height:'100%', paddingTop:'0.5rem', paddingLeft:'0.25rem', paddingRight:'0.25rem'}} >
                    {cardList}
                </div>
            </Fragment>
}

MoorhenValidationListWidgetBase.defaultProps = {filterMapFunction: (maps: moorhen.Map) => {return true}, extraControlForm: null, extraControlFormValue: null, enableMapSelect: true}