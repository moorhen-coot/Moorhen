import { Fragment, useEffect, useRef, useState } from "react"
import { Col, Row, Form } from 'react-bootstrap';
import { RamaPlot } from "../WebGLgComponents/Ramachandran"
import { convertRemToPx } from '../utils/MoorhenUtils';
import { MoorhenChainSelect } from './MoorhenChainSelect'
import { MoorhenMoleculeSelect } from './MoorhenMoleculeSelect'

export const MoorhenRamachandran = (props) => {
    const ramachandranRef = useRef();
    const ramaPlotDivRef = useRef();
    const moleculeSelectRef = useRef();
    const chainSelectRef = useRef();
    const [clickedResidue, setClickedResidue] = useState(null)
    const [ramaPlotDimensions, setRamaPlotDimensions] = useState(230)
    const [ramaPlotData, setRamaPlotData] = useState(null)
    const [selectedModel, setSelectedModel] = useState(null)
    const [selectedChain, setSelectedChain] = useState(null)
    const [cachedGemmiStructure, setCachedGemmiStructure] = useState(null)

    const getMolName = () => {
        if (selectedModel === null || props.molecules.length === 0) {
            return;
        }
        const coordMolNums = props.molecules.map(molecule => molecule.molNo);
        const molNames = props.molecules.map(molecule => molecule.name);
        let moleculeIndex = coordMolNums.findIndex(num => num === selectedModel)
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
            if (!moleculeSelectRef.current.value || !chainSelectRef.current.value) {
                setRamaPlotData(null)
                return
            }
            const inputData = {message:'coot_command', command:'ramachandran_validation', returnType:'ramachandran_data', commandArgs:[parseInt(moleculeSelectRef.current.value)], chainID: chainSelectRef.current.value}
            let response = await props.commandCentre.current.cootCommand(inputData)
            setRamaPlotData(response.data.result.result)
        }

        fetchRamaData()

    }, [selectedModel, selectedChain])

    useEffect(() => {

        ramachandranRef.current?.updatePlotData({ info: ramaPlotData, molName: getMolName(selectedModel), chainId: chainSelectRef.current.value, molNo: selectedModel });

    }, [ramaPlotData])



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
        console.log('cachedGemmiStructure changed')
        if (ramaPlotData === null || selectedModel === null || chainSelectRef.current.value === null || props.molecules.length === 0) {
            return;
        }

        async function fetchRamaData() {
            if (!moleculeSelectRef.current.value || !chainSelectRef.current.value) {
                setRamaPlotData(null)
                return
            }
            const inputData = {message:'coot_command', command:'ramachandran_validation', returnType:'ramachandran_data', commandArgs:[parseInt(moleculeSelectRef.current.value)], chainID: chainSelectRef.current.value}
            let response = await props.commandCentre.current.cootCommand(inputData)
            setRamaPlotData(response.data.result.result)
        }
        
        fetchRamaData()

    }, [cachedGemmiStructure])

    useEffect(() => {
        if (!clickedResidue) {
            return
        }

        let selectedMoleculeIndex = props.molecules.findIndex(molecule => molecule.name === clickedResidue.molName);
        if (selectedMoleculeIndex === -1) {
            console.log(`Cannot find molecule ${clickedResidue.molName}`)
            return
        }

        props.molecules[selectedMoleculeIndex].centreOn(props.glRef, `/*/${clickedResidue.chain}/${clickedResidue.seqNum}-${clickedResidue.seqNum}/*`)

    }, [clickedResidue])

    const handleModelChange = (evt) => {
        console.log(`Ramachandran selected model ${evt.target.value}`)
        setSelectedModel(parseInt(evt.target.value))
        setSelectedChain(chainSelectRef.current.value)
    }

    const handleChainChange = (evt) => {
        console.log(`Ramachandran selected chain ${evt.target.value}`)
        setSelectedChain(evt.target.value)
    }

    const handleHoveredAtom = (cid) => {
        if (selectedModel !== null) {
            let selectedMoleculeIndex = props.molecules.findIndex(molecule => molecule.molNo === selectedModel);
            if (selectedMoleculeIndex !== -1 && props.molecules[selectedMoleculeIndex]){
                props.setHoveredAtom({ molecule:props.molecules[selectedMoleculeIndex] , cid: cid })
            }
        }
    }

    useEffect(() => {
        if (props.hoveredAtom===null || props.hoveredAtom.molecule === null || props.hoveredAtom.cid === null || ramaPlotData === null || selectedModel === null || chainSelectRef.current.value === null || selectedModel !==  props.hoveredAtom.molecule.molNo || ramachandranRef.current === null) {
            return
        }

        const [_, insCode, chainId, resInfo, atomName]   = props.hoveredAtom.cid.split('/')

        if (chainSelectRef.current.value !== chainId || !resInfo) {
            return
        }
        
        const resNum = resInfo.split('(')[0]
        const oldHit = ramachandranRef.current.hit        
        const newHit = ramaPlotData.findIndex(residue => parseInt(residue.seqNum) === parseInt(resNum))

        if (newHit === -1 || newHit === oldHit) {
            return
        }

        ramachandranRef.current.hit = newHit
        ramachandranRef.current.doAnimation(oldHit, ramachandranRef.current)

    }, [props.hoveredAtom])



    return <Fragment>
        <Form style={{ padding:'0', margin: '0' }}>
            <Form.Group>
                <Row style={{ padding: '0', margin: '0' }}>
                    <Col>
                        <MoorhenMoleculeSelect width="" onChange={handleModelChange} molecules={props.molecules} ref={moleculeSelectRef}/>
                    </Col>
                    <Col>
                        <MoorhenChainSelect width="" molecules={props.molecules} onChange={handleChainChange} selectedCoordMolNo={selectedModel} ref={chainSelectRef} allowedTypes={[1, 2]}/>
                    </Col>
                </Row>
            </Form.Group>
        </Form>
        <div ref={ramaPlotDivRef} id="ramaPlotDiv" className="rama-plot-div" style={{height: '100%'}}>
            <RamaPlot ref={ramachandranRef}
                onClick={(result) => setClickedResidue(result)}
                setHoveredAtom={handleHoveredAtom} />
        </div>
    </Fragment>

}
