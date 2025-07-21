import { Fragment, useEffect, useRef, useState } from "react"
import { Col, Row, Form } from 'react-bootstrap';
import { MoorhenMapSelect } from '../select/MoorhenMapSelect'
import { MoorhenMoleculeSelect } from '../select/MoorhenMoleculeSelect'
import { moorhen } from "../../types/moorhen";
import { useSelector } from "react-redux";
import { LinearProgress } from "@mui/material";
import { usePersistentState } from "../../store/menusSlice";

export const MoorhenValidationListWidgetBase = (props: {
    filterMapFunction?: (arg0: moorhen.Map) => boolean;
    fetchData: (arg0: number, arg1: number) => Promise<any>;
    getCards: (arg0: number, arg1: number, arg2: any) => React.JSX.Element[];
    extraControlForm?: React.JSX.Element;
    extraControlFormValue?: any;
    enableMapSelect?: boolean;
    menuId?: string;
}) => {

    const defaultProps = { 
        filterMapFunction: (_maps: moorhen.Map) => true, extraControlForm: null, extraControlFormValue: null, enableMapSelect: true }

    const {
        filterMapFunction, extraControlForm, extraControlFormValue, enableMapSelect, menuId = null
    } = { ...defaultProps, ...props }

    const mapSelectRef = useRef<undefined | HTMLSelectElement>(null);
    const moleculeSelectRef = useRef<undefined | HTMLSelectElement>(null);

    const [selectedModel, setSelectedModel] = menuId
        ? usePersistentState<null | number>(menuId, "selectedModel", null, true)
        : useState<null | number>(null);
    const [selectedMap, setSelectedMap] = menuId
        ? usePersistentState<null | number>(menuId, "selectedMap", null, true)
        : useState<null | number>(null);

    const [cardData, setCardData] = useState<any[]>([])
    const [cardList, setCardList] = useState<React.JSX.Element[]>([])
    const [busy, setBusy] = useState<boolean>(false)

    const updateMolNo = useSelector((state: moorhen.State) => state.moleculeMapUpdate.moleculeUpdate.molNo)
    const updateSwitch = useSelector((state: moorhen.State) => state.moleculeMapUpdate.moleculeUpdate.switch)
    const backgroundColor = useSelector((state: moorhen.State) => state.sceneSettings.backgroundColor)
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)
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
        const filteredMaps = maps.filter(map => filterMapFunction(map))

        if (maps.length === 0 || filteredMaps.length === 0) {
            setSelectedMap(null)
        } else if (selectedMap === null) {
            setSelectedMap(filteredMaps[0].molNo)
        } else if (!filteredMaps.map(map => map.molNo).includes(selectedMap)) {
            setSelectedMap(filteredMaps[0].molNo)
        }

    }, [maps.length])

    async function fetchData() {
        setBusy(true)
        if (selectedModel === null || (enableMapSelect && selectedMap === null)) {
            setCardData(null)
        } else {
            const newData = await props.fetchData(selectedModel, selectedMap)
            setCardData(newData)
        }
        setBusy(false)      
    }        

    useEffect(() => {
        fetchData()
    }, [selectedMap, selectedModel, extraControlFormValue])

    useEffect(() => {
        if (selectedModel !== null  && selectedModel === updateMolNo) {
            fetchData()
        }
    }, [updateSwitch])

    useEffect(() => {
        if (selectedModel === null || (enableMapSelect && selectedMap === null) || cardData === null) {
            setCardList([])
        } else {
            const newCardList = props.getCards(selectedModel, selectedMap, cardData)
            setCardList(newCardList)
        }
    }, [cardData, backgroundColor])

    return <Fragment>
                <Form style={{ padding:'0', margin: '0' }}>
                    <Form.Group>
                        <Row style={{ padding:'0', margin: '0' }}>
                            <Col>
                                <MoorhenMoleculeSelect width="" onChange={handleModelChange} molecules={molecules} ref={moleculeSelectRef} defaultValue={selectedModel}/>
                            </Col>
                            {enableMapSelect && 
                            <Col>
                                <MoorhenMapSelect filterFunction={filterMapFunction} width="" onChange={handleMapChange} maps={maps} ref={mapSelectRef} defaultValue={selectedMap}/>
                            </Col>
                            }
                            {extraControlForm}
                        </Row>
                    </Form.Group>
                </Form>                
                {busy && 
                <div style={{display: 'flex', justifyContent: 'center', padding: '0.5rem'}}>
                    <LinearProgress style={{width: '95%'}} variant="indeterminate"/>    
                </div>}
                <div style={{overflowY: 'auto', height:'100%', paddingTop:'0.5rem',}} >
                    {cardList.length > 0 ? cardList : busy ? null : <b>Nothing to show here...</b>}
                </div>
            </Fragment>
}
