import { useState, useRef, useEffect, useCallback } from "react";
import { Backdrop } from '@mui/material';
import { ArrowBackIosOutlined, ArrowForwardIosOutlined, FirstPageOutlined, WarningOutlined } from "@mui/icons-material";
import { getMultiColourRuleArgs } from '../../utils/MoorhenUtils';
import { Card, Row, Col, Form, FormSelect, Button, Spinner, Stack } from "react-bootstrap";
import { moorhen } from "../../types/moorhen";
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect";
import { MoorhenChainSelect } from "../select/MoorhenChainSelect";
import { MoorhenMolecule } from "../../utils/MoorhenMolecule"
import { MoorhenDraggableModalBase } from "../modal/MoorhenDraggableModalBase"
import MoorhenSlider from "../misc/MoorhenSlider";
import { webGL } from "../../types/mgWebGL";

export const MoorhenQuerySequenceModal = (props: {
    windowHeight: number;
    windowWidth: number;
    show: boolean;
    setShow: React.Dispatch<React.SetStateAction<boolean>>;
    molecules: moorhen.Molecule[];
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    glRef: React.RefObject<webGL.MGWebGL>;
    backgroundColor: [number, number, number, number];
    defaultBondSmoothness: number;
    monomerLibraryPath: string;
    changeMolecules: (arg0: moorhen.MolChange<MoorhenMolecule>) => void;
    setToastContent: React.Dispatch<React.SetStateAction<JSX.Element>>;
    transparentModalsOnMouseOut: boolean;
}) => {

    const [selectedModel, setSelectedModel] = useState<null | number>(null)
    const [selectedChain, setSelectedChain] = useState<string | null>(null)
    const [selectedSource, setSelectedSource] = useState<string>('PDB')
    const [queryResults, setQueryResults] = useState<JSX.Element[]>(null)
    const [currentResultsPage, setCurrentResultsPage] = useState<number>(0)
    const [numberOfHits, setNumberOfHits] = useState<number>(0)
    const [seqIdCutoff, setSeqIdCutoff] = useState<number>(90)
    const [eValCutoff, setEValCutoff] = useState<number>(0.1)
    const [busy, setBusy] = useState<boolean>(false);
    const timerRef = useRef<any>(null);
    const cachedSeqIdCutoff = useRef<number | null>(null);
    const cachedEValCutoff = useRef<number | null>(null);
    const moleculeSelectRef = useRef<HTMLSelectElement>();
    const chainSelectRef = useRef<HTMLSelectElement>();
    const sourceSelectRef =  useRef<HTMLSelectElement>();

    const fetchMoleculeFromURL = async (url: RequestInfo | URL, molName: string): Promise<moorhen.Molecule> => {
        const newMolecule = new MoorhenMolecule(props.commandCentre, props.glRef, props.monomerLibraryPath)
        newMolecule.setBackgroundColour(props.backgroundColor)
        newMolecule.defaultBondOptions.smoothness = props.defaultBondSmoothness
        try {
            await newMolecule.loadToCootFromURL(url, molName)
            if (newMolecule.molNo === -1) throw new Error("Cannot read the fetched molecule...")
            await newMolecule.fetchIfDirtyAndDraw('CBs')
            props.changeMolecules({ action: "Add", item: newMolecule })
            newMolecule.centreOn('/*/*/*/*', false)
            return newMolecule
        } catch (err) {
            props.setToastContent(
                <>
                    <WarningOutlined style={{margin: 0}}/>
                        <h4 style={{marginTop: '0.1rem', marginBottom: '0.1rem', marginLeft: '0.5rem', marginRight: '0.5rem'}}>
                            Failed to read molecule
                        </h4>
                    <WarningOutlined style={{margin: 0}}/>
                </>
            )
            console.log(`Cannot fetch molecule from ${url}`)
        }
    }

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

    const doPDBQuery = async (querySequence: string, start: number, seqIdCutoff: number = 0.9, eValCutoff: number = 0.1, resultsType: string = 'experimental') => {
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
                "results_content_type": [
                    resultsType
                ],
                "scoring_strategy": "sequence",
                "sort": [{
                    "sort_by": "score",
                    "direction": "desc"
                }],
                "paginate": {
                    "start": start,
                    "rows": 10
                }
            },
            "return_type": "polymer_entity"
        }

        try {
            const reponse = await fetch(`https://search.rcsb.org/rcsbsearch/v2/query?json=${encodeURIComponent(JSON.stringify(searchParams))}`)
            const result = await reponse.json()
            return result
        } catch (err) {
            console.log(err)
        }
    }

    const fetchAndSuperpose = async (polimerEntity: string, coordUrl: string, chainId: string, source: string) => {
        const newMolecule = await fetchMoleculeFromURL(coordUrl, polimerEntity)
        if (source === 'AFDB') {
            const newRule = {
                commandInput: {
                    message:'coot_command',
                    command: 'add_colour_rules_multi', 
                    returnType:'status',
                    commandArgs: getMultiColourRuleArgs(newMolecule, 'af2-plddt')
                },
                isMultiColourRule: true,
                ruleType: 'af2-plddt',
                label: `//*`
            }
            newMolecule.defaultColourRules = [newRule]
        } 
        await props.commandCentre.current.cootCommand({
            message: 'coot_command',
            command: 'SSM_superpose',
            returnType: 'superpose_results',
            commandArgs: [
                parseInt(moleculeSelectRef.current.value),
                chainSelectRef.current.value,
                newMolecule.molNo,
                chainId
            ],
            changesMolecules: [newMolecule.molNo]
        }, true)                            
        newMolecule.setAtomsDirty(true)
        await newMolecule.redraw()
        newMolecule.centreOn('/*/*/*/*', true)
    }

    const getPDBHitCard = async (polimerEntity: string, source: string = 'PDB') => {
        if (!polimerEntity) {
            return
        }
        
        let label: string
        let coordUrl: string
        let resolution: number
        let depositionYear: number
        let chains: string[]

        if (source === 'AFDB') {

            label = polimerEntity
            let entryId = polimerEntity.split('_')
            const entityId = entryId.pop()

            const results = await Promise.all([
                fetch(`https://data.rcsb.org/rest/v1/core/entry/${entryId.join('_')}`).then(result => result.json()),
                fetch(`https://data.rcsb.org/rest/v1/core/polymer_entity/${entryId.join('_')}/${entityId}`).then(result => result.json())
            ])

            const [entryResult, polymerResult] = results

            coordUrl = entryResult['rcsb_comp_model_provenance']['source_url']
            chains = polymerResult.rcsb_polymer_entity_container_identifiers.auth_asym_ids

        } else {

            const pdbCode = polimerEntity.slice(0, 4)
            const entityId = polimerEntity.slice(5)
            coordUrl = `https://files.rcsb.org/download/${pdbCode}.pdb`
            
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
                label = `${pdbCode}:${chains[0]} - ${resolution}Å - (${depositionYear})`
            
            } catch (err) {
                console.log(err)
            }
        }
        
        return <Card key={polimerEntity} style={{marginTop: '0.5rem'}}>
                    <Card.Body style={{padding:'0.5rem'}}>
                        <Row style={{display:'flex', justifyContent:'between'}}>
                            <Col style={{alignItems:'center', justifyContent:'left', display:'flex'}}>
                                <span>
                                    {label}
                                </span>
                            </Col>
                            <Col className='col-3' style={{margin: '0', padding:'0', justifyContent: 'right', display:'flex'}}>
                                <Button style={{marginRight:'0.5rem'}} onClick={() => { fetchAndSuperpose(polimerEntity, coordUrl, chains[0], source) }}>
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

    const queryOnlineServices = useCallback(async (seqId: number, eVal: number) => {
        if (seqId !== seqIdCutoff || eVal !== eValCutoff) {
            // User didn't finish moving the slider...
            return
        }  else if (!moleculeSelectRef.current.value || !chainSelectRef.current.value) {
            setQueryResults(null)
            return
        }
        
        setBusy(true)
        const molecule = props.molecules.find(molecule => molecule.molNo === parseInt(moleculeSelectRef.current.value))
        const sequence = molecule.sequences.find(sequence => sequence.chain === chainSelectRef.current.value)
        let results: { result_set: { [id: number]: { identifier: string; score: number; } }, total_count: number }
        
        results = await doPDBQuery(sequence.sequence.map(residue => residue.resCode).join(''), currentResultsPage * 10, seqIdCutoff / 100, eValCutoff, selectedSource === 'PDB' ? 'experimental' : 'computational')
        if (!results) {
            setNumberOfHits(0)
            setQueryResults(null)
            setBusy(false)
            return
        }

        const resultCards = await Promise.all(
            Object.keys(results.result_set).map(key => getPDBHitCard(results.result_set[key].identifier, selectedSource))
        )

        setNumberOfHits(results.total_count)
        setQueryResults(resultCards)
        
        setBusy(false)

    }, [seqIdCutoff, eValCutoff, props.molecules, currentResultsPage, selectedSource])

    useEffect(() => {
        cachedSeqIdCutoff.current = seqIdCutoff
        cachedEValCutoff.current = eValCutoff
        timerRef.current = setTimeout(() => {
            queryOnlineServices(cachedSeqIdCutoff.current, cachedEValCutoff.current);
        }, 1000);

    }, [selectedModel, selectedChain, selectedSource, eValCutoff, seqIdCutoff, currentResultsPage])

    useEffect(() => {
        
        setCurrentResultsPage(0)
        
    }, [numberOfHits])

    return <MoorhenDraggableModalBase
        transparentOnMouseOut={props.transparentModalsOnMouseOut}
        additionalChildren={
            <Backdrop sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }} open={busy}>
                <Spinner animation="border" style={{ marginRight: '0.5rem' }}/>
                <span>Fetching...</span>
            </Backdrop>
        }
        headerTitle='Query using a sequence'
        body={
            <>
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
                            <option value='AFDB' key='AFDB'>AFDB</option>
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
            </Row>
            <hr></hr>
            <Row>
                {queryResults?.length > 0 ? <span>Found {numberOfHits} hits</span> : null}
                {queryResults?.length > 0 ? queryResults : <span>No results found...</span>}
            </Row>
            </>
        }
        footer={
            <>
            <Stack gap={2} direction='horizontal' style={{paddingTop: '0.5rem', alignItems: 'center', alignContent: 'center', justifyContent: 'center' }}>
                {queryResults?.length > 0 ? <span>Page {currentResultsPage+1} of {Math.ceil(numberOfHits/10)}</span> : null}
                <Button variant='primary' onClick={() => setCurrentResultsPage(0)}>
                    <FirstPageOutlined/>
                </Button>
                <Button variant='primary' disabled={currentResultsPage === 0} onClick={() => setCurrentResultsPage((prev) => prev-1)}>
                    <ArrowBackIosOutlined/>
                </Button>
                <Button variant='primary' disabled={currentResultsPage === Math.ceil(numberOfHits/10) - 1} onClick={() => setCurrentResultsPage((prev) => prev+1)}>
                    <ArrowForwardIosOutlined/>
                </Button>
            </Stack>
            </>
        }
        {...props}
    />
}