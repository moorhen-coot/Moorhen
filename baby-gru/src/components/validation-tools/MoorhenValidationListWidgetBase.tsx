import { Fragment, useEffect, useRef, useState } from "react"
import { Col, Row, Form } from 'react-bootstrap';
import { MoorhenMapSelect } from '../select/MoorhenMapSelect'
import { MoorhenMoleculeSelect } from '../select/MoorhenMoleculeSelect'
import { moorhen } from "../../types/moorhen";
import { gemmi } from "../../types/gemmi";
import { useSelector } from "react-redux";

export const MoorhenValidationListWidgetBase = (props: {
    filterMapFunction?: (arg0: moorhen.Map) => boolean;
    fetchData: (arg0: number, arg1: number) => Promise<any>;
    dropdownId: number;
    accordionDropdownId: number;
    showSideBar: boolean;
    getCards: (arg0: number, arg1: number, arg2: any) => JSX.Element[];
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

    const backgroundColor = useSelector((state: moorhen.State) => state.canvasStates.backgroundColor)
    const molecules = useSelector((state: moorhen.State) => state.molecules)
    const maps = useSelector((state: moorhen.State) => state.maps)

    const handleModelChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedModel(parseInt(evt.target.value))
    }

    const handleMapChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedMap(parseInt(evt.target.value))
    }
    
    useEffect(() => {
        if (molecules.length === 0) {
            setSelectedModel(null)
        } else if (selectedModel === null) {
            setSelectedModel(molecules[0].molNo)
        } else if (!molecules.map(molecule => molecule.molNo).includes(selectedModel)) {
            setSelectedModel(molecules[0].molNo)
        }

    }, [molecules.length])

    useEffect(() => {
        const filteredMaps = maps.filter(map => props.filterMapFunction(map))

        if (maps.length === 0 || filteredMaps.length === 0) {
            setSelectedMap(null)
        } else if (selectedMap === null) {
            setSelectedMap(filteredMaps[0].molNo)
        } else if (!filteredMaps.map(map => map.molNo).includes(selectedMap)) {
            setSelectedMap(filteredMaps[0].molNo)
        }

    }, [maps.length])
   
    useEffect(() => {
        if (selectedModel !== null) {
            let selectedMoleculeIndex = molecules.findIndex(molecule => molecule.molNo === selectedModel);
            if (selectedMoleculeIndex !== -1 && molecules[selectedMoleculeIndex]){
                setCachedGemmiStructure(molecules[selectedMoleculeIndex].gemmiStructure)
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
    }, [cardData, backgroundColor, props.sideBarWidth, props.showSideBar, props.accordionDropdownId])

    return <Fragment>
                <Form style={{ padding:'0', margin: '0' }}>
                    <Form.Group>
                        <Row style={{ padding:'0', margin: '0' }}>
                            <Col>
                                <MoorhenMoleculeSelect width="" onChange={handleModelChange} molecules={molecules} ref={moleculeSelectRef}/>
                            </Col>
                            {props.enableMapSelect && 
                            <Col>
                                <MoorhenMapSelect filterFunction={props.filterMapFunction} width="" onChange={handleMapChange} maps={maps} ref={mapSelectRef}/>
                            </Col>
                            }
                            {props.extraControlForm}
                        </Row>
                    </Form.Group>
                </Form>
                <div style={{overflowY: 'auto', height:'100%', paddingTop:'0.5rem', paddingLeft:'0.25rem', paddingRight:'0.25rem'}} >
                    {cardList}
                </div>
            </Fragment>
}

MoorhenValidationListWidgetBase.defaultProps = {filterMapFunction: (maps: moorhen.Map) => {return true}, extraControlForm: null, extraControlFormValue: null, enableMapSelect: true}