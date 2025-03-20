import { MoorhenDraggableModalBase } from "./MoorhenDraggableModalBase"
import { moorhen } from "../../types/moorhen"
import { useEffect, useRef, useState, createRef } from "react"
import { Form, Row, Col, Stack, Card, Container, ListGroup, Button, Tab, Tabs  } from "react-bootstrap"
import { convertRemToPx, convertViewtoPx} from '../../utils/utils'
import { useSelector, useDispatch } from "react-redux"
import { modalKeys } from "../../utils/enums"
import { MoorhenMolecule } from "../../utils/MoorhenMolecule"
import { readTextFile } from "../../utils/utils"
import { useSnackbar } from "notistack"
import { addMoleculeList } from "../../store/moleculesSlice"
import { UndoOutlined, RedoOutlined, CenterFocusWeakOutlined, ExpandMoreOutlined, ExpandLessOutlined, VisibilityOffOutlined, VisibilityOutlined, DownloadOutlined, Settings, InfoOutlined } from '@mui/icons-material'
import { Slider,Typography } from '@mui/material'
import { hideMolecule, showMolecule } from "../../store/moleculesSlice";
import ProtvistaManager from "protvista-manager";
import ProtvistaSequence from "protvista-sequence";
import ProtvistaNavigation from "protvista-navigation";
import ProtvistaTrack from "protvista-track";

!window.customElements.get('protvista-navigation') && window.customElements.define("protvista-navigation", ProtvistaNavigation);
!window.customElements.get('protvista-sequence') && window.customElements.define("protvista-sequence", ProtvistaSequence);
!window.customElements.get('protvista-track') && window.customElements.define("protvista-track", ProtvistaTrack);
!window.customElements.get('protvista-manager') && window.customElements.define("protvista-manager", ProtvistaManager);

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
    const [afJson, setAfJson] = useState<any[]>([])
    const [esmJson, setEsmJson] = useState<any[]>([])
    const [homologsJson, setHomologsJson] = useState<any[]>([])

    const backgroundColor = useSelector((state: moorhen.State) => state.sceneSettings.backgroundColor)
    const defaultBondSmoothness = useSelector((state: moorhen.State) => state.sceneSettings.defaultBondSmoothness)
    const visibleMolecules = useSelector((state: moorhen.State) => state.molecules.visibleMolecules)

    const managerRef = useRef<any>(null);
    const selectedResiduesTrackRef = useRef<{}>({})
    const sequenceRef = useRef<any>(null);

    selectedResiduesTrackRef[0] = createRef()
    selectedResiduesTrackRef[1] = createRef()

    const [displaySettings, setDisplaySettings] = useState<DisplaySettingsType>({
        rulerStart: 0,
        start: 0,
        end: 15,
        seqLength: 16,
        displaySequence: "ABCDEFGHIJKLMNOP"
    });

    const readPdbFile = async (file: File): Promise<moorhen.Molecule> => {
        const newMolecule = new MoorhenMolecule(props.commandCentre, props.glRef, props.store, props.monomerLibraryPath)
        newMolecule.setBackgroundColour(backgroundColor)
        newMolecule.defaultBondOptions.smoothness = defaultBondSmoothness
        await newMolecule.loadToCootFromFile(file)
        return newMolecule
    }

    useEffect(() => {
        /* Here I will construct some useful track data from the MrParse json */
        console.log(afJson)
        const selectedResiduesTrackData  = [
            {
                "accession": "X",
                "color": "red",
                "locations": [{"fragments": [{start:1,end:4}]}]
            },
            {
                "accession": "X",
                "color": "blue",
                "locations": [{"fragments": [{start:7,end:10}]}]
            },

        ]

        afJson.map((el,i) => {
            console.log(selectedResiduesTrackRef[i])
            selectedResiduesTrackRef[i].current.data = selectedResiduesTrackData
        })
    }, [afJson])

    const loadMrParseFiles = async (files: FileList) => {

        if(files.length===0) return

        const readPromises: Promise<moorhen.Molecule>[] = []
        const modelFiles: string[] = []

        for (const file of files) {
            if(file.name==="af_models.json"){
                setAfJson([])
                const fileContents = await readTextFile(file) as string
                const json = JSON.parse(fileContents)
                json.map((el,i) => {
                    selectedResiduesTrackRef[i] = createRef()
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
                    console.log(value)
                }
            }
            if(file.name==="homologs.json"){
                const fileContents = await readTextFile(file) as string
                const json = JSON.parse(fileContents)
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

    console.log(afJson)
    console.log(esmJson)
    console.log(homologsJson)
    console.log(selectedResiduesTrackRef)

    return <MoorhenDraggableModalBase
                modalId={modalKeys.MRPARSE}
                left={width / 6}
                top={height / 3}
                minHeight={convertViewtoPx(30, height)}
                minWidth={convertRemToPx(37)}
                maxHeight={convertViewtoPx(70, height)}
                maxWidth={convertViewtoPx(50, width)}
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
                    <Tab disabled={true} eventKey="sequence" title="Sequence (in development)">
                    <div style={{width: '100%'}}>
                    <protvista-manager ref={managerRef}>
                        <protvista-sequence
                            ref={sequenceRef}
                            sequence={displaySettings.displaySequence}
                            length={displaySettings.seqLength}
                            numberofticks="0"
                            displaystart={displaySettings.start}
                            displayend={displaySettings.end}
                            use-ctrl-to-zoom
                        />
                        {afJson.map((afEl,i) => (
                        <protvista-track
                            key={i}
                            ref={el => selectedResiduesTrackRef[i].current = el}
                            length={displaySettings.seqLength}
                            displaystart={displaySettings.start}
                            displayend={displaySettings.end}
                            height='10'
                            use-ctrl-to-zoom
                        />
                        ))}
                        </protvista-manager>
                    </div>
                    </Tab>
                    </Tabs>
                    </>
                }
            />
}
