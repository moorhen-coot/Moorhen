import { MoorhenDraggableModalBase } from "./MoorhenDraggableModalBase"
import { moorhen } from "../../types/moorhen"
import { useEffect, useRef, useState, createRef, useCallback } from "react"
import { Form, Row, Col, Stack, Card, Container, ListGroup, Button, Tab, Tabs, Table  } from "react-bootstrap"
import { Accordion, AccordionDetails, AccordionSummary } from '@mui/material';
import { convertRemToPx, convertViewtoPx} from '../../utils/utils'
import { useSelector, useDispatch } from "react-redux"
import { modalKeys } from "../../utils/enums"
import { MoorhenMolecule } from "../../utils/MoorhenMolecule"
import { readTextFile } from "../../utils/utils"
import { useSnackbar } from "notistack"
import { addMoleculeList } from "../../store/moleculesSlice"
import { UndoOutlined, RedoOutlined, CenterFocusWeakOutlined, ExpandMoreOutlined, ExpandLessOutlined, VisibilityOffOutlined, VisibilityOutlined, DownloadOutlined, Settings, InfoOutlined } from '@mui/icons-material'
import { Slider,Typography } from '@mui/material'
import { hideMolecule, showMolecule } from "../../store/moleculesSlice"
import { setHoveredAtom } from "../../store/hoveringStatesSlice";
import Fasta from "biojs-io-fasta"
import ProtvistaManager from "protvista-manager"
import ProtvistaSequence from "protvista-sequence"
import ProtvistaNavigation from "protvista-navigation"
import ProtvistaTrack from "protvista-track"

!window.customElements.get('protvista-navigation') && window.customElements.define("protvista-navigation", ProtvistaNavigation)
!window.customElements.get('protvista-sequence') && window.customElements.define("protvista-sequence", ProtvistaSequence)
!window.customElements.get('protvista-track') && window.customElements.define("protvista-track", ProtvistaTrack)
!window.customElements.get('protvista-manager') && window.customElements.define("protvista-manager", ProtvistaManager)

interface MrParsePDBModelJson  {
    chain_id : string;
    ellg : number;
    frac_scat : null|number;
    length : number;
    molecular_weight : number;
    name : string;
    ncopies : null|number;
    pdb_file : null|string;
    pdb_id : string;
    pdb_url : string;
    query_start : number;
    query_stop : number;
    range : string;
    region_id : number;
    region_index : number;
    resolution : number;
    rmsd : null|number;
    score : number;
    seq_ident : number;
    total_frac_scat : null|number;
    total_frac_scat_known : null|number;
}

interface MrParseAFModelJson  {
    chain_id : string;
    ellg : number;
    frac_scat : null|number;
    length : number;
    molecular_weight : number;
    name : string;
    ncopies : any;
    pdb_file : null|string;
    pdb_id : string;
    pdb_url : string;
    query_start : number;
    query_stop : number;
    range : string;
    region_id : number;
    region_index : number;
    resolution : number;
    rmsd : null|number;
    score : number;
    seq_ident : number;
    total_frac_scat : null|number;
    total_frac_scat_known : null|number;
}

type DisplaySettingsType = {
    rulerStart: number;
    start: number;
    end: number;
    seqLength: number;
    displaySequence: string;
}

export const MoorhenMrParseModal = (props: moorhen.CollectedProps) => {
    const resizeNodeRef = useRef<HTMLDivElement>()

    const width = useSelector((state: moorhen.State) => state.sceneSettings.width)
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)

    const filesRef = useRef<null | HTMLInputElement>(null)

    const { enqueueSnackbar } = useSnackbar()

    const dispatch = useDispatch()
    const [mrParseModels, setMrParseModels] = useState<moorhen.Molecule[]>([])
    const [targetSequence, setTargetSequence] = useState<string>("")
    const [afJson, setAfJson] = useState<any[]>([])
    const [esmJson, setEsmJson] = useState<any[]>([])
    const [homologsJson, setHomologsJson] = useState<any[]>([])

    const backgroundColor = useSelector((state: moorhen.State) => state.sceneSettings.backgroundColor)
    const defaultBondSmoothness = useSelector((state: moorhen.State) => state.sceneSettings.defaultBondSmoothness)
    const visibleMolecules = useSelector((state: moorhen.State) => state.molecules.visibleMolecules)

    const AFManagerRef = useRef<any>(null)
    const AFSelectedResiduesTrackRef = useRef<{}>({})
    const AFSequenceRef = useRef<any>(null)
    AFSelectedResiduesTrackRef[0] = createRef()
    AFSelectedResiduesTrackRef[1] = createRef()

    const HomologsManagerRef = useRef<any>(null)
    const HomologsSelectedResiduesTrackRef = useRef<{}>({})
    const HomologsSequenceRef = useRef<any>(null)
    HomologsSelectedResiduesTrackRef[0] = createRef()
    HomologsSelectedResiduesTrackRef[1] = createRef()

    const [AFDisplaySettings, setAFDisplaySettings] = useState<DisplaySettingsType>({
        rulerStart: 0,
        start: 0,
        end: 1,
        seqLength: 1,
        displaySequence: "A"
    })

    const [HomologsDisplaySettings, setHomologsDisplaySettings] = useState<DisplaySettingsType>({
        rulerStart: 0,
        start: 0,
        end: 1,
        seqLength: 1,
        displaySequence: "A"
    })

    const readPdbFile = async (file: File): Promise<moorhen.Molecule> => {
        const newMolecule = new MoorhenMolecule(props.commandCentre, props.glRef, props.store, props.monomerLibraryPath)
        newMolecule.setBackgroundColour(backgroundColor)
        newMolecule.defaultBondOptions.smoothness = defaultBondSmoothness
        await newMolecule.loadToCootFromFile(file)
        return newMolecule
    }

    useEffect(() => {
        let minRes = 0
        let maxRes = 0

        const allSelectedResiduesTrackData = []

        homologsJson.forEach(res => {
            const foundModel = mrParseModels.find(mod => ("homologs/"+mod.name+".pdb" === res.pdb_file))
            if(Object.hasOwn(res,"query_start")&&res.query_start<minRes){
                minRes = res.query_start
            }
            if(Object.hasOwn(res,"query_stop")&&res.query_stop>maxRes){
                maxRes = res.query_stop
            }
            const selectedResiduesTrackData  = []
            if(foundModel&&Object.hasOwn(res,"query_start")&&Object.hasOwn(res,"query_stop")){
                const seq = foundModel.sequences[0].sequence
                let baseNum;
                if(seq.length>0)
                    baseNum = seq[0].resNum
                seq.forEach((r,i) => {
                    selectedResiduesTrackData.push({
                        "accession": "X",
                        "type": ""+r.resNum,
                        "color": "#4f3727",
                        "locations": [{"fragments": [{start:r.resNum-baseNum+res.query_start+1,end:r.resNum-baseNum+res.query_start+1}]}]
                    })
                })
            }
            allSelectedResiduesTrackData.push(selectedResiduesTrackData)
        })

        const seq = targetSequence //".".repeat(maxRes-minRes+1)

        if(HomologsSequenceRef.current){
            HomologsSequenceRef.current.sequence = seq
            HomologsSequenceRef.current._createSequence()
        }
        const newSequenceData = {
            rulerStart: 0,
            start: minRes,
            end: maxRes,
            seqLength: seq.length,
            displaySequence: seq
        }
        setHomologsDisplaySettings(newSequenceData)

        homologsJson.map((el,i) => {
            if(HomologsSelectedResiduesTrackRef[i].current){
                HomologsSelectedResiduesTrackRef[i].current.removeEventListener("click", handleClick)
                HomologsSelectedResiduesTrackRef[i].current.removeEventListener('change', (e) => {handleChange(e,el.chain_id,el.pdb_file,el.query_start)})
                HomologsSelectedResiduesTrackRef[i].current.removeEventListener('dblclick', disableDoubleClick, true)
                HomologsSelectedResiduesTrackRef[i].current.data = allSelectedResiduesTrackData[i]
                HomologsSelectedResiduesTrackRef[i].current.addEventListener("click", handleClick)
                HomologsSelectedResiduesTrackRef[i].current.addEventListener("change", (e) => {handleChange(e,el.chain_id,el.pdb_file,el.query_start)})
                HomologsSelectedResiduesTrackRef[i].current.addEventListener('dblclick', disableDoubleClick, true)
            }
        })

    }, [homologsJson,targetSequence,mrParseModels])

    const handleChange = useCallback((evt,chain_id,model_id,seq_start) => {
        setTimeout(() => {
            if(evt&&evt.detail&&(evt.detail.eventtype==="mouseover"||evt.detail.eventtype==="click")){
                if(evt.detail.feature){
                    if(evt.detail.feature&&evt.detail.feature.locations&&evt.detail.feature.locations.length>0){
                        if(evt.detail.feature.locations[0].fragments&&evt.detail.feature.locations[0].fragments.length>0){
                            const frag = evt.detail.feature.locations[0].fragments[0]
                            if(Object.hasOwn(frag,"start")&&Object.hasOwn(frag,"end")){
                                if(frag.start===frag.end){
                                    const foundModel = mrParseModels.find(mod => (("models/"+mod.name+".pdb" === model_id)||"homologs/"+mod.name+".pdb" === model_id))
                                    if(foundModel){
                                        if(foundModel.sequences.length>0&&foundModel.sequences[0]&&foundModel.sequences[0].sequence.length>0){
                                            const cid = `//${chain_id}/${evt.detail.feature.type}/CA`
                                            if(evt.detail.eventtype==="click"){
                                                foundModel.centreOn(cid)
                                            } else if (evt.detail.eventtype === "mouseover") {
                                                dispatch( setHoveredAtom({ molecule: foundModel, cid: cid }) )
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }, 1)
    },[mrParseModels])

    const handleClick = (evt: MouseEvent) => {
    }

    const disableDoubleClick = (evt: MouseEvent) => {
        evt.preventDefault()
        evt.stopPropagation()
    }

    useEffect(() => {

        let minRes = 0
        let maxRes = 0

        const allSelectedResiduesTrackData = []

        afJson.forEach(res => {
            const foundModel = mrParseModels.find(mod => ("models/"+mod.name+".pdb" === res.pdb_file))
            if(Object.hasOwn(res,"query_start")&&res.query_start<minRes){
                minRes = res.query_start
            }
            if(Object.hasOwn(res,"query_stop")&&res.query_stop>maxRes){
                maxRes = res.query_stop
            }
            if(Object.hasOwn(res,"plddt_regions")){
                const selectedResiduesTrackData  = []
                if(foundModel){
                    const seq = foundModel.sequences[0].sequence
                    const ver_range = foundModel.name.substring(res.name.length+1)
                    const fname_base = parseInt(ver_range.substring(ver_range.indexOf("_")+1).split("-")[0])
                    const baseNum = fname_base
                    seq.forEach((r,i) => {
                        const loc = r.resNum-baseNum+res.query_start
                        let color = null
                        if(Object.hasOwn(res.plddt_regions,"v_low")){
                            res.plddt_regions.v_low.forEach(region => {
                                for(let ires=region[0];ires<=region[1];ires++){
                                    if(ires+1===loc){
                                        color = "#FF7D45"
                                        break
                                    }
                                }
                           })
                        }
                        if(!color&&Object.hasOwn(res.plddt_regions,"low")){
                            res.plddt_regions.low.forEach(region => {
                                for(let ires=region[0];ires<=region[1];ires++){
                                    if(ires+1===loc){
                                        color = "#FFDB13"
                                        break
                                    }
                                }
                           })
                        }
                        if(!color&&Object.hasOwn(res.plddt_regions,"confident")){
                            res.plddt_regions.confident.forEach(region => {
                                for(let ires=region[0];ires<=region[1];ires++){
                                    if(ires+1===loc){
                                        color = "#65CBF3"
                                        break
                                    }
                                }
                           })
                        }
                        if(!color&&Object.hasOwn(res.plddt_regions,"v_high")){
                            res.plddt_regions.v_high.forEach(region => {
                                for(let ires=region[0];ires<=region[1];ires++){
                                    if(ires+1===loc){
                                        color = "#0053D6"
                                        break
                                    }
                                }
                           })
                        }
                        if(!color) color = "#FF0000"
                        selectedResiduesTrackData.push({
                                "accession": "X",
                                "type": ""+r.resNum,
                                "color": color,
                                "locations": [{"fragments": [{start:loc,end:loc}]}]
                        })
                    })
                }
                allSelectedResiduesTrackData.push(selectedResiduesTrackData)
            }
        })

        const seq = targetSequence //".".repeat(maxRes-minRes+1)

        if( AFSequenceRef.current){
            AFSequenceRef.current.sequence = seq
            AFSequenceRef.current._createSequence()
        }
        const newSequenceData = {
            rulerStart: 0,
            start: minRes,
            end: maxRes,
            seqLength: seq.length,
            displaySequence: seq
        }
        setAFDisplaySettings(newSequenceData)

        afJson.map((el,i) => {
            if(AFSelectedResiduesTrackRef[i].current){
                AFSelectedResiduesTrackRef[i].current.removeEventListener("click", handleClick)
                AFSelectedResiduesTrackRef[i].current.removeEventListener('change', (e) => {handleChange(e,"A",el.pdb_file,el.query_start)})
                AFSelectedResiduesTrackRef[i].current.removeEventListener('dblclick', disableDoubleClick, true)
                AFSelectedResiduesTrackRef[i].current.data = allSelectedResiduesTrackData[i]
                AFSelectedResiduesTrackRef[i].current.addEventListener("click", handleClick)
                AFSelectedResiduesTrackRef[i].current.addEventListener("change", (e) => {handleChange(e,"A",el.pdb_file,el.query_start)})
                AFSelectedResiduesTrackRef[i].current.addEventListener('dblclick', disableDoubleClick, true)
            }
        })
    }, [afJson,targetSequence,mrParseModels])

    const loadMrParseFiles = async (files: FileList) => {

        if(files.length===0) return

        const readPromises: Promise<moorhen.Molecule>[] = []
        const modelFiles: string[] = []

        for (const file of files) {
            if(file.name==="input.fasta"){
                try {
                    const fileContents = await readTextFile(file) as string
                    const seqs = Fasta.parse(fileContents)
                    setTargetSequence(seqs[0].seq)
                } catch(e) {
                    console.log("Failed to extract sequence from input.fasta")
                }
            }
            if(file.name==="af_models.json"){
                setAfJson([])
                const fileContents = await readTextFile(file) as string
                const json = JSON.parse(fileContents)
                json.map((el,i) => {
                    AFSelectedResiduesTrackRef[i] = createRef()
                })
                setAfJson(json)
                for(const iter of Object.entries(json)){
                    const key: string = iter[0]
                    const value: MrParseAFModelJson = iter[1] as MrParseAFModelJson
                    const fullName = value["pdb_file"]
                    if(fullName){
                        const relName = fullName.substring(fullName.lastIndexOf("models/")+"models/".length)
                        modelFiles.push(fullName)
                    }
                }
            }
            if(file.name==="esm_models.json"){
                const fileContents = await readTextFile(file) as string
                const json = JSON.parse(fileContents)
                setEsmJson(json)
                for(const iter of Object.entries(json)){
                    const key: string = iter[0]
                    const value: any = iter[1]
                    //console.log(value)
                }
            }
            if(file.name==="homologs.json"){
                const fileContents = await readTextFile(file) as string
                const json = JSON.parse(fileContents)
                json.map((el,i) => {
                    HomologsSelectedResiduesTrackRef[i] = createRef()
                })
                setHomologsJson(json)
                for(const iter of Object.entries(json)){
                    const key: string = iter[0]
                    const value: MrParsePDBModelJson = iter[1] as MrParsePDBModelJson
                    const fullName = value["pdb_file"]
                    if(fullName){
                        const relName = fullName.substring(fullName.lastIndexOf("homologs/")+"homologs/".length)
                        modelFiles.push(fullName)
                    }
                }
            }
        }

        for (const file of files) {
            for (const modelFile of modelFiles) {
                if(file.webkitRelativePath.includes(modelFile)){
                    const fullName = file.webkitRelativePath
                    readPromises.push(readPdbFile(file))
                }
            }
        }

        if(readPromises.length===0) return

        let newMolecules: moorhen.Molecule[] = await Promise.all(readPromises)
        if (!newMolecules.every(molecule => molecule.molNo !== -1)) {
            enqueueSnackbar("Failed to read molecule", { variant: "warning" })
            newMolecules = newMolecules.filter(molecule =>molecule.molNo !== -1)
            if (newMolecules.length === 0) {
                return
            }
        }

        let drawPromises: Promise<void>[] = []
        let molecules: moorhen.Molecule[] = []

        for (const newMolecule of newMolecules) {
            molecules.push(newMolecule)
            drawPromises.push(
                newMolecule.fetchIfDirtyAndDraw('CRs')
            )
        }
        await Promise.all(drawPromises)

        dispatch(addMoleculeList(molecules))
        newMolecules.at(-1).centreOn('/*/*/*/*', true)

        setMrParseModels(newMolecules)
    }

    const footerContent = <Stack gap={2} direction='horizontal' style={{paddingTop: '0.5rem', alignItems: 'space-between', alignContent: 'space-between', justifyContent: 'space-between', width: '100%' }}>
        <Stack gap={2} direction='horizontal' style={{ alignItems: 'center', alignContent: 'center', justifyContent: 'center' }}>
            <Form.Group style={{ width: '20rem', margin: '0.5rem', padding: '0rem' }} controlId="uploadMrParse" className="mb-3">
            {/* @ts-expect-error */}
            <Form.Control ref={filesRef} directory="" webkitdirectory="true" type="file" multiple={true} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { loadMrParseFiles(e.target.files) }}/>
            </Form.Group>
        </Stack>
    </Stack>

    const model_files = mrParseModels.map(item => {
            const isVisible = (visibleMolecules.indexOf(item.molNo)>-1)
            const handleDownload = async () => {
                await item.downloadAtoms()
            }
            const handleCentering = () => {
                item.centreOn()
            }
            const handleVisibility = (() => {
                dispatch( isVisible ? hideMolecule(item) : showMolecule(item) )
            })
            return (
                <ListGroup.Item key={'row'+item.name}>
                <Stack gap={2} direction='horizontal'>
                <Col className='align-items-center' style={{ display: 'flex', justifyContent: 'left'}}>
                    {item.name}
                </Col>
                <Col style={{ display: 'flex', justifyContent: 'right' }}>
                <Button key={1} size="sm" variant="outlined" onClick={handleVisibility}>
                {isVisible ? <VisibilityOutlined /> : <VisibilityOffOutlined />}
                </Button>
                <Button key={2} size="sm" variant="outlined" onClick={handleCentering}>
                <CenterFocusWeakOutlined />
                </Button>
                <Button key={3} size="sm" variant="outlined" onClick={handleDownload}>
                <DownloadOutlined />
                </Button>
                </Col>
                </Stack>
                {false &&
                <Stack gap={2} direction='horizontal'>
                <Typography gutterBottom style={{ display: 'flex', justifyContent: 'left'}}>Variance</Typography>
                <Slider
                     aria-label="Small steps"
                     defaultValue={110}
                     step={10}
                     marks
                     min={10}
                     max={110}
                     valueLabelDisplay="auto"/>
                </Stack>
                }
                </ListGroup.Item>
            )
    })

    //console.log(afJson)
    //console.log(esmJson)
    //console.log(homologsJson)

    return <MoorhenDraggableModalBase
                modalId={modalKeys.MRPARSE}
                left={width / 6}
                top={height / 3}
                minHeight={convertViewtoPx(30, height)}
                minWidth={convertRemToPx(37)}
                maxHeight={convertViewtoPx(70, height)}
                maxWidth={convertViewtoPx(90, width)}
                enforceMaxBodyDimensions={true}
                overflowY='auto'
                overflowX='auto'
                headerTitle='MrParse results'
                footer={footerContent}
                resizeNodeRef={resizeNodeRef}
                body={
                    <>
                    <Tabs
                        defaultActiveKey="controls"
                        id="uncontrolled-tab-example"
                        className="mb-3"
                    >
                    <Tab eventKey="controls" title="Controls">
                    <Container>
                    <Row>
                       {(mrParseModels.length>0) &&
                    <ListGroup>
                       {model_files}
                    </ListGroup>
                       }
                    </Row>
                    </Container>
                    </Tab>
                    <Tab eventKey="sequence" title="Results">
                    <Container>
                    <Accordion defaultExpanded className="moorhen-accordion" disableGutters={true} elevation={0} >
                    <AccordionSummary
                        style={{backgroundColor: isDark ? '#adb5bd' : '#ecf0f1'}}
                        expandIcon={<ExpandMoreOutlined />}
                    >
                    Experimental structures from the PDB
                    </AccordionSummary>
                    <AccordionDetails style={{padding: '0.2rem', backgroundColor: isDark ? '#ced5d6' : 'white'}}>
                    <Table>
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>PDB</th>
                            <th>Resolution</th>
                            <th>Region</th>
                            <th>Range</th>
                            <th>Length</th>
                            <th>eLLG</th>
                            <th>Mol. Wt.</th>
                            <th>eRMSD</th>
                            <th>Seq. Ident.</th>
                          </tr>
                        </thead>
                        <tbody>
                    {homologsJson.map((homEl,i) => (
                        <tr  key={i}>
                          <td>{homEl.name}</td>
                          <td>{homEl.pdb_id}</td>
                          <td>{homEl.resolution.toFixed(2)}</td>
                          <td>{homEl.region_id}</td>
                          <td>{homEl.range}</td>
                          <td>{homEl.length}</td>
                          <td>{homEl.ellg}</td>
                          <td>{homEl.molecular_weight}</td>
                          <td>{homEl.rmsd}</td>
                          <td>{homEl.seq_ident.toFixed(2)}</td>
                        </tr>
                        ))}
                        </tbody>
                    </Table>
                    <protvista-manager ref={HomologsManagerRef}>
                        <Row>
                       <Col md={3}>
                       </Col>
                       <Col md={9}>
                        <protvista-sequence
                            ref={HomologsSequenceRef}
                            sequence={HomologsDisplaySettings.displaySequence}
                            length={HomologsDisplaySettings.seqLength}
                            numberofticks="10"
                            displaystart={HomologsDisplaySettings.start}
                            displayend={HomologsDisplaySettings.end}
                            use-ctrl-to-zoom
                        />
                        </Col>
                        </Row>
                        {homologsJson.map((homEl,i) => (
                       <Row key={i}>
                       <Col md={3}>
                       {homEl.pdb_id}
                       </Col>
                       <Col md={9}>
                        <protvista-track
                            ref={el => HomologsSelectedResiduesTrackRef[i].current = el}
                            length={HomologsDisplaySettings.seqLength}
                            displaystart={HomologsDisplaySettings.start}
                            displayend={HomologsDisplaySettings.end}
                            height='15'
                            min-height='15'
                            use-ctrl-to-zoom
                        />
                       </Col>
                       </Row>
                        ))}
                    </protvista-manager>
                    </AccordionDetails>
                    </Accordion>
                    <Accordion defaultExpanded className="moorhen-accordion" disableGutters={true} elevation={0} >
                    <AccordionSummary
                        style={{backgroundColor: isDark ? '#adb5bd' : '#ecf0f1'}}
                        expandIcon={<ExpandMoreOutlined />}
                    >
                    Structure predictions from the EBI AlphaFold database
                    </AccordionSummary>
                    <AccordionDetails style={{padding: '0.2rem', backgroundColor: isDark ? '#ced5d6' : 'white'}}>
                    <Table>
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Date made</th>
                            <th>Range</th>
                            <th>Length</th>
                            <th>Average pLDDT</th>
                            <th>H-score</th>
                            <th>Seq. Ident.</th>
                          </tr>
                        </thead>
                        <tbody>
                        {afJson.map((afEl,i) => (
                           <tr key={i}>
                              <td>{afEl.name}</td>
                              <td>{afEl.date_made}</td>
                              <td>{afEl.range}</td>
                              <td>{afEl.length}</td>
                              <td>{afEl.avg_plddt.toFixed(2)}</td>
                              <td>{afEl.h_score}</td>
                              <td>{afEl.seq_ident.toFixed(2)}</td>
                           </tr>
                        ))}
                        </tbody>
                    </Table>
                    <protvista-manager ref={AFManagerRef}>
                       <Row>
                       <Col md={3}>
                       </Col>
                       <Col md={9}>
                        <protvista-sequence
                            ref={AFSequenceRef}
                            sequence={AFDisplaySettings.displaySequence}
                            length={AFDisplaySettings.seqLength}
                            numberofticks="10"
                            displaystart={AFDisplaySettings.start}
                            displayend={AFDisplaySettings.end}
                            use-ctrl-to-zoom
                        />
                       </Col>
                       </Row>
                        {afJson.map((afEl,i) => (
                       <Row key={i}>
                       <Col md={3}>
                       {afEl.model_id}
                       </Col>
                       <Col md={9}>
                        <protvista-track
                            ref={el => AFSelectedResiduesTrackRef[i].current = el}
                            length={AFDisplaySettings.seqLength}
                            displaystart={AFDisplaySettings.start}
                            displayend={AFDisplaySettings.end}
                            height='15'
                            min-height='15'
                            use-ctrl-to-zoom
                        />
                       </Col>
                       </Row>
                        ))}
                        </protvista-manager>
                    </AccordionDetails>
                    </Accordion>
                    </Container>
                    </Tab>
                    </Tabs>
                    </>
                }
            />
}
