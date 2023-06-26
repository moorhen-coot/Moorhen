import { useState, useRef, useEffect, useCallback } from "react";
import Draggable from "react-draggable";
import { Backdrop, IconButton } from '@mui/material';
import { CloseOutlined } from "@mui/icons-material";
import { convertViewtoPx } from '../../utils/MoorhenUtils';
import { Card, Row, Col, Form, FormSelect, Button, Spinner } from "react-bootstrap";
import { moorhen } from "../../types/moorhen";
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect";
import { MoorhenChainSelect } from "../select/MoorhenChainSelect";
import { MoorhenMolecule } from "../../utils/MoorhenMolecule"
import MoorhenSlider from "../misc/MoorhenSlider";
import { webGL } from "../../types/mgWebGL";

export const MoorhenQuerySequenceModal = (props: {
    windowHeight: number;
    windowWidth: number;
    setShow: React.Dispatch<React.SetStateAction<boolean>>;
    molecules: moorhen.Molecule[];
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    glRef: React.RefObject<webGL.MGWebGL>;
    backgroundColor: [number, number, number, number];
    defaultBondSmoothness: number;
    monomerLibraryPath: string;
    changeMolecules: (arg0: moorhen.MolChange<MoorhenMolecule>) => void;
}) => {

    const [opacity, setOpacity] = useState(0.5)
    const [selectedModel, setSelectedModel] = useState<null | number>(null)
    const [selectedChain, setSelectedChain] = useState<string | null>(null)
    const [selectedSource, setSelectedSource] = useState<string | null>(null)
    const [queryResults, setQueryResults] = useState<JSX.Element[]>(null)
    const [seqIdCutoff, setSeqIdCutoff] = useState<number>(90)
    const [eValCutoff, setEValCutoff] = useState<number>(0.1)
    const [maxNoHits, setMaxNoHits] = useState<number>(10)
    const [busy, setBusy] = useState<boolean>(false);
    const timerRef = useRef<any>(null);
    const cachedSeqIdCutoff = useRef<number | null>(null);
    const cachedEValCutoff = useRef<number | null>(null);
    const cachedMaxNoHits = useRef<number | null>(null);
    const moleculeSelectRef = useRef<HTMLSelectElement>();
    const chainSelectRef = useRef<HTMLSelectElement>();
    const sourceSelectRef =  useRef<HTMLSelectElement>();

    const handleModelChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedModel(parseInt(evt.target.value))
        setSelectedChain(chainSelectRef.current.value)
    }

    const handleChainChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedChain(evt.target.value)
    }

    const handleSourceChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedSource(evt.target.value)
    }

    const doPDBQuery = async (querySequence: string, seqIdCutoff: number = 0.9, eValCutoff: number = 0.1, maxNumberHits: number = 10) => {
        if (!querySequence) {
            return
        }

        const searchParams = {
            "query": {
              "type": "terminal",
              "service": "sequence",
              "parameters": {
                "evalue_cutoff": eValCutoff,
                "identity_cutoff": seqIdCutoff,
                "sequence_type": "protein",
                "value": querySequence
              }
            },
            "request_options": {
                "scoring_strategy": "sequence",
                "sort": [{
                    "sort_by": "score",
                    "direction": "desc"
                }],
                "paginate": {
                    "start": 0,
                    "rows": maxNumberHits
                }
            },
            "return_type": "polymer_entity"
        }

        try {
            const reponse = await fetch(`https://search.rcsb.org/rcsbsearch/v2/query?json=${encodeURIComponent(JSON.stringify(searchParams))}`)
            const result = await reponse.json()
            return result.result_set as { [id: number]: { identifier: string; score: number; } }
        } catch (err) {
            console.log(err)
        }
    }

    const getPDBHitCard = async (polimerEntity: string) => {
        if (!polimerEntity) {
            return
        }
        
        const pdbCode = polimerEntity.slice(0, 4)
        const entityId = polimerEntity.slice(5)
        let resolution: number
        let depositionYear: number
        let chains: string[]
        try {
            const results = await Promise.all([
                fetch(`https://data.rcsb.org/rest/v1/core/entry/${pdbCode}`).then(result => result.json()),
                fetch(`https://data.rcsb.org/rest/v1/core/polymer_entity/${pdbCode}/${entityId}`).then(result => result.json())
            ])

            const [entryResult, polymerResult] = results

            resolution = entryResult.rcsb_entry_info.resolution_combined[0].toFixed(1)
            const depositionDate = new Date(entryResult.rcsb_accession_info.initial_release_date)
            depositionYear = depositionDate.getFullYear()
            chains = polymerResult.rcsb_polymer_entity_container_identifiers.auth_asym_ids
        } catch (err) {
            console.log(err)
        }
        
        return <Card key={pdbCode} style={{marginTop: '0.5rem'}}>
                    <Card.Body style={{padding:'0.5rem'}}>
                        <Row style={{display:'flex', justifyContent:'between'}}>
                            <Col style={{alignItems:'center', justifyContent:'left', display:'flex'}}>
                                <span>
                                    {`${pdbCode}:${chains[0]} - ${resolution}Å - (${depositionYear})`}
                                </span>
                            </Col>
                            <Col className='col-3' style={{margin: '0', padding:'0', justifyContent: 'right', display:'flex'}}>
                                <Button style={{marginRight:'0.5rem'}} onClick={async () => { 
                                    const newMolecule = await fetchMoleculeFromURL(`https://pdb-redo.eu/db/${pdbCode}/${pdbCode}_final.pdb`, polimerEntity) 
                                    await props.commandCentre.current.cootCommand({
                                        message: 'coot_command',
                                        command: 'SSM_superpose',
                                        returnType: 'superpose_results',
                                        commandArgs: [
                                            parseInt(moleculeSelectRef.current.value),
                                            chainSelectRef.current.value,
                                            newMolecule.molNo,
                                            chains[0]
                                        ],
                                    })                            
                                    newMolecule.setAtomsDirty(true)
                                    await newMolecule.redraw(props.glRef)
                                }}>
                                    Fetch
                                </Button>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>
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

    const fetchMoleculeFromURL = (url: RequestInfo | URL, molName: string): Promise<moorhen.Molecule> => {
        const newMolecule = new MoorhenMolecule(props.commandCentre, props.monomerLibraryPath)
        newMolecule.setBackgroundColour(props.backgroundColor)
        newMolecule.cootBondsOptions.smoothness = props.defaultBondSmoothness
        return new Promise(async (resolve, reject) => {
            try {
                await newMolecule.loadToCootFromURL(url, molName)
                await newMolecule.fetchIfDirtyAndDraw('CBs', props.glRef)
                props.changeMolecules({ action: "Add", item: newMolecule })
                newMolecule.centreOn(props.glRef, '/*/*/*/*', false)
                resolve(newMolecule)
            } catch (err) {
                console.log(err)
            }   
        })
    }

    const queryOnlineServices = useCallback(async (seqId: number, eVal: number, maxHits: number) => {
        if (seqId !== seqIdCutoff || eVal !== eValCutoff || maxHits !== maxNoHits) {
            // User didn't finish moving the slider...
            return
        }  else if (!moleculeSelectRef.current.value || !chainSelectRef.current.value) {
            setQueryResults(null)
            return
        }
        setBusy(true)
        const molecule = props.molecules.find(molecule => molecule.molNo === parseInt(moleculeSelectRef.current.value))
        const sequence = molecule.sequences.find(sequence => sequence.chain === chainSelectRef.current.value)
        let results
        if (sourceSelectRef.current.value === 'PDB') {
            results = await doPDBQuery(sequence.sequence.map(residue => residue.resCode).join(''), seqIdCutoff/100, eValCutoff, maxHits) as { [id: number]: { identifier: string; score: number; } }
            if (results) {
                const resultCards = await Promise.all(
                    Object.keys(results).map(key => getPDBHitCard(results[key].identifier))
                )
                setQueryResults(resultCards)
            } else {
                setQueryResults(null)
            }
        }
        setBusy(false)

    }, [seqIdCutoff, eValCutoff, maxNoHits, props.molecules])

    useEffect(() => {
        cachedSeqIdCutoff.current = seqIdCutoff
        cachedEValCutoff.current = eValCutoff
        cachedMaxNoHits.current = maxNoHits
        timerRef.current = setTimeout(() => {
            queryOnlineServices(cachedSeqIdCutoff.current, cachedEValCutoff.current, cachedMaxNoHits.current);
        }, 1000);
        

    }, [selectedModel, selectedChain, selectedSource, eValCutoff, seqIdCutoff, maxNoHits])


    return <Draggable handle=".handle">
        <Card
            style={{position: 'absolute', top: '5rem', left: '5rem', opacity: opacity, width: props.windowWidth ? convertViewtoPx(35, props.windowWidth) : '35wh'}}
            onMouseOver={() => setOpacity(1)}
            onMouseOut={() => setOpacity(0.5)}
        >
            <Backdrop sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }} open={busy}>
                <Spinner animation="border" style={{ marginRight: '0.5rem' }}/>
                <span>Fetching...</span>
            </Backdrop>
            <Card.Header className="handle" style={{ justifyContent: 'space-between', display: 'flex', cursor: 'move', alignItems:'center'}}>
                Query using a sequence
                <IconButton style={{margin: '0.1rem', padding: '0.1rem'}} onClick={() => props.setShow(false)}>
                    <CloseOutlined/>
                </IconButton>
            </Card.Header>
            <Card.Body style={{maxHeight: props.windowHeight ? convertViewtoPx(45, props.windowHeight) : '45vh', overflowY: 'scroll'}}>
                <Row style={{ padding: '0', margin: '0' }}>
                    <Col>
                        <MoorhenMoleculeSelect width="" onChange={handleModelChange} molecules={props.molecules} ref={moleculeSelectRef}/>
                    </Col>
                    <Col>
                        <MoorhenChainSelect width="" molecules={props.molecules} onChange={handleChainChange} selectedCoordMolNo={selectedModel} ref={chainSelectRef} allowedTypes={[1, 2]}/>
                    </Col>
                    <Col>
                        <Form.Group style={{ margin: '0.5rem' }}>
                            <Form.Label>Source</Form.Label>
                            <FormSelect size="sm" ref={sourceSelectRef} defaultValue={'PDB'} onChange={handleSourceChange}>
                                <option value='PDB' key='PDB'>PDB</option>
                            </FormSelect>
                        </Form.Group>
                    </Col>
                </Row>
                <Row>
                    <Col style={{justifyContent:'center', alignContent:'center', alignItems:'center', display:'flex'}}>
                        <Form.Group controlId="eValueSlider" style={{margin:'0.5rem', width: '100%'}}>
                            <MoorhenSlider minVal={0.1} maxVal={1.0} logScale={false} sliderTitle="E-Val cutoff" initialValue={0.1} externalValue={eValCutoff} setExternalValue={setEValCutoff}/>
                        </Form.Group>
                    </Col>
                    <Col style={{justifyContent:'center', alignContent:'center', alignItems:'center', display:'flex'}}>
                        <Form.Group controlId="seqIdSlider" style={{margin:'0.5rem', width: '100%'}}>
                            <MoorhenSlider minVal={1} maxVal={100} logScale={false} sliderTitle="Seq. Id. cutoff" initialValue={90} externalValue={seqIdCutoff} allowFloats={false} setExternalValue={setSeqIdCutoff}/>
                        </Form.Group>
                    </Col>
                    <Col style={{justifyContent:'center', alignContent:'center', alignItems:'center', display:'flex'}}>
                        <Form.Group controlId="maxNoHitsSlider" style={{margin:'0.5rem', width: '100%'}}>
                            <MoorhenSlider minVal={1} maxVal={50} logScale={false} sliderTitle="Max no. hits shown" initialValue={10} externalValue={maxNoHits} allowFloats={false} setExternalValue={setMaxNoHits}/>
                        </Form.Group>
                    </Col>
                </Row>
                <hr></hr>
                <Row>
                    {queryResults?.length > 0 ? <span>Showing {queryResults.length} hits</span> : null}
                    {queryResults?.length > 0 ? queryResults : <span>No results found...</span>}
                </Row>
            </Card.Body>
        </Card>
    </Draggable>
}