import { Fragment, useEffect, useRef, useState, useLayoutEffect } from "react"
import { Col, Row, Form } from 'react-bootstrap';
import { RamaPlot } from "../WebGL/Ramachandran"
import { convertRemToPx } from '../utils/BabyGruUtils';
import { BabyGruChainSelect } from './BabyGruChainSelect'
import { BabyGruMoleculeSelect } from './BabyGruMoleculeSelect'

export const BabyGruRamachandran = (props) => {
    const ramachandranRef = useRef();
    const ramaPlotDivRef = useRef();
    const moleculeSelectRef = useRef();
    const chainSelectRef = useRef();
    const [clickedResidue, setClickedResidue] = useState(null)
    const [message, setMessage] = useState("")
    const [ramaPlotDimensions, setRamaPlotDimensions] = useState(230)
    const [ramaPlotData, setRamaPlotData] = useState(null)
    const [selectedModel, setSelectedModel] = useState(null)
    const [selectedChain, setSelectedChain] = useState(null)
    const [cachedAtoms, setCachedAtoms] = useState(null)

    const getMolName = () => {
        if (selectedModel === null || props.molecules.length === 0) {
            return;
        }
        const coordMolNums = props.molecules.map(molecule => molecule.coordMolNo);
        const molNames = props.molecules.map(molecule => molecule.name);
        let moleculeIndex = coordMolNums.findIndex(num => num == selectedModel)
        return molNames[moleculeIndex];
    }

    useEffect(() => {
        setTimeout(() => {
            let plotHeigth = (ramaPlotDivRef.current.clientHeight)
            let plotWidth = (ramaPlotDivRef.current.clientWidth)
            if (plotHeigth > 0 && plotWidth > 0) {
                plotHeigth > plotWidth ? setRamaPlotDimensions(plotWidth - convertRemToPx(3)) : setRamaPlotDimensions(plotHeigth - convertRemToPx(3))
            }
        }, 50);

    }, [props.toolAccordionBodyHeight, props.windowHeight, props.windowWidth])

    useEffect(() => {
        ramachandranRef.current?.setState({ ramaPlotDimensions: ramaPlotDimensions })
    }, [ramaPlotDimensions])

    useEffect(() => {
        async function fetchRamaData() {
            if (moleculeSelectRef.current.value === null || chainSelectRef.current.value === null) {
                setRamaPlotData(null)
                return
            }
            const inputData = { message: "get_rama", coordMolNo: moleculeSelectRef.current.value, chainId: chainSelectRef.current.value }
            let response = await props.commandCentre.current.postMessage(inputData)
            setRamaPlotData(response.data.result)
        }
        fetchRamaData()

    }, [selectedModel, selectedChain])

    useEffect(() => {

        ramachandranRef.current?.updatePlotData({ info: ramaPlotData, molName: getMolName(selectedModel), chainId: chainSelectRef.current.value, coordMolNo: selectedModel });

    }, [ramaPlotData])



    useEffect(() => {
        if (props.molecules.length === 0) {
            setSelectedModel(null)
        } else if (selectedModel === null) {
            setSelectedModel(props.molecules[0].coordMolNo)
        } else if (!props.molecules.map(molecule => molecule.coordMolNo).includes(selectedModel)) {
            setSelectedModel(props.molecules[0].coordMolNo)
        }

    }, [props.molecules.length])

    useEffect(() => {
        if (selectedModel !== null && props.molecules[selectedModel]) {
            setCachedAtoms(props.molecules[selectedModel].cachedAtoms)
        }
    })

    useEffect(() => {
        console.log('cachedAtoms changed')
        if (ramaPlotData === null || selectedModel === null || selectedChain === null || props.molecules.length === 0) {
            return;
        }

        async function fetchRamaData() {
            if (moleculeSelectRef.current.value === null || chainSelectRef.current.value === null) {
                setRamaPlotData(null)
                return
            }
            const inputData = { message: "get_rama", coordMolNo: moleculeSelectRef.current.value, chainId: chainSelectRef.current.value }
            let response = await props.commandCentre.current.postMessage(inputData)
            setRamaPlotData(response.data.result)
        }
        fetchRamaData()

    }, [cachedAtoms])

    useEffect(() => {
        if (!clickedResidue) {
            return
        }

        let selectedMoleculeIndex = props.molecules.findIndex(molecule => molecule.name === clickedResidue.molName);
        if (selectedMoleculeIndex === -1) {
            console.log(`Cannot find molecule ${clickedResidue.molName}`)
            return
        }

        props.molecules[selectedMoleculeIndex].centreOn(props.glRef, clickedResidue)

    }, [clickedResidue])

    const handleModelChange = (evt) => {
        console.log(`Ramachandran selected model ${evt.target.value}`)
        setSelectedModel(evt.target.value)
        setSelectedChain(chainSelectRef.current.value)
    }

    const handleChainChange = (evt) => {
        console.log(`Ramachandran selected chain ${evt.target.value}`)
        setSelectedChain(evt.target.value)
    }


    return <Fragment>
        <Form style={{ paddingTop: '0.5rem', margin: '0' }}>
            <Form.Group>
                <Row style={{ padding: '0', margin: '0' }}>
                    <Col>
                        <BabyGruMoleculeSelect width="" onChange={handleModelChange} molecules={props.molecules} ref={moleculeSelectRef}/>
                    </Col>
                    <Col>
                        <BabyGruChainSelect width="" molecules={props.molecules} onChange={handleChainChange} selectedCoordMolNo={selectedModel} ref={chainSelectRef}/>
                    </Col>
                </Row>
            </Form.Group>
        </Form>
        <div ref={ramaPlotDivRef} id="ramaPlotDiv" className="rama-plot-div">
            <RamaPlot ref={ramachandranRef}
                onClick={(result) => setClickedResidue(result)}
                setMessage={setMessage} />
            <br></br>
            <span>{message}</span>
        </div>
    </Fragment>

}
