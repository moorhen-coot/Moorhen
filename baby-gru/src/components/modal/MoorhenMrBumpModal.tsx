import { useRef, useState } from "react"
import { Form, Row, Col, Stack, Card, Container, ListGroup, Button, Tab, Tabs  } from "react-bootstrap"
import { useSelector, useDispatch } from "react-redux"
import { useSnackbar } from "notistack"
import { UndoOutlined, RedoOutlined, CenterFocusWeakOutlined, ExpandMoreOutlined, ExpandLessOutlined, VisibilityOffOutlined, VisibilityOutlined, DownloadOutlined, Settings, InfoOutlined } from '@mui/icons-material'
import { Slider,Typography } from '@mui/material'
import { moorhen } from "../../types/moorhen"
import { convertRemToPx, convertViewtoPx, readTextFile } from '../../utils/utils'
import { modalKeys } from "../../utils/enums"
import { MoorhenMolecule } from "../../utils/MoorhenMolecule"
import { addMoleculeList } from "../../store/moleculesSlice"
import { MoorhenDraggableModalBase } from "./MoorhenDraggableModalBase"

const mrbump_json_keys = ['modelName', 'rank', 'tarStart', 'tarEnd',
    'tarGroupStart', 'tarGroupEnd',
    'RID', 'ENS', 'eLLG', 'evalue', 'score', 'seqID',
    'coverage', 'resolution', 'experiment',
    'modelPDBfile', 'unmodifiedPDBfile', 'type',
    'mgName', 'chainSource', 'sourceChainID', 'source']

interface PictureDomains {
  [index: number]: [string[],number[]];
}
interface MrBUMPModelJson  {
    modelName: string;
    rank: number;
    tarStart: number;
    tarEnd: number;
    tarGroupStart: number;
    tarGroupEnd: number;
    RID: number;
    ENS: number;
    eLLG: number;
    evalue: number;
    score: number;
    seqID: number;
    coverage: number;
    resolution: number;
    experiment: string;
    modelPDBfile: string;
    unmodifiedPDBfile: string;
    type: string;
    mgName: string;
    chainSource: string;
    sourceChainID: string;
    source: string;
}

function rgb2hsv(r, g, b) {
    if (arguments.length === 1) {
        g = r.g, b = r.b, r = r.r;
    }
    let max = Math.max(r, g, b), min = Math.min(r, g, b),
        d = max - min,
        h,
        s = (max === 0 ? 0 : d / max),
        v = max / 255;

    switch (max) {
        case min: h = 0; break;
        case r: h = (g - b) + d * (g < b ? 6: 0); h /= 6 * d; break;
        case g: h = (b - r) + d * 2; h /= 6 * d; break;
        case b: h = (r - g) + d * 4; h /= 6 * d; break;
    }

    return {
        h: h,
        s: s,
        v: v
    };
}


function hsv2rgb(h, s, v) {
    let r, g, b, i, f, p, q, t;
    if (arguments.length === 1) {
        s = h.s, v = h.v, h = h.h;
    }
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }
    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255)
    };
}

export const MoorhenMrBumpModal = (props: moorhen.CollectedProps) => {
    const resizeNodeRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<null | HTMLCanvasElement>(null)
    const [canvasDimensions, setCanvasDimensions] = useState<number>(700)

    const width = useSelector((state: moorhen.State) => state.sceneSettings.width)
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)

    const filesRef = useRef<null | HTMLInputElement>(null)

    const { enqueueSnackbar } = useSnackbar()

    const dispatch = useDispatch()

    //TODO - useSelector is need here if state is to be restored when closing/opening this component
    const [mrBumpDomains, setMrBumpDomains] = useState<{}>({})

    const backgroundColor = useSelector((state: moorhen.State) => state.sceneSettings.backgroundColor)
    const defaultBondSmoothness = useSelector((state: moorhen.State) => state.sceneSettings.defaultBondSmoothness)

    const readPdbFileMrBump = async (file: File, domain: string): Promise<{molecule:moorhen.Molecule,domain:string}> => {
        const newMolecule = new MoorhenMolecule(props.commandCentre, props.glRef, props.store, props.monomerLibraryPath)
        newMolecule.setBackgroundColour(backgroundColor)
        newMolecule.defaultBondOptions.smoothness = defaultBondSmoothness
        await newMolecule.loadToCootFromFile(file)
        return {molecule:newMolecule,domain:domain}
    }

    const drawDomainsPicture = (pic_domains:PictureDomains, models_json: MrBUMPModelJson[]) => {

        let minRes = 9999
        let maxRes = -9999
        for(const iter of Object.entries(pic_domains)){
            const val: number[] = iter[1][1]
            minRes = Math.min(minRes,val[0])
            maxRes = Math.max(maxRes,val[1])
        }

        const numRanges = Object.entries(pic_domains).length

        const ctx = canvasRef.current.getContext('2d')
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
        ctx.fillStyle = '#aaaaaa'
        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height)
        ctx.fillStyle = '#dddddd'
        ctx.fillRect(0, (numRanges+1)*30, canvasRef.current.width, canvasRef.current.height)

        ctx.strokeStyle = 'white'
        ctx.lineWidth = 2
        ctx.font = "18px helvetica"

        for(const iter of Object.entries(pic_domains)){
            const key: string = iter[0]
            const val: number[] = iter[1][1]
            const y = parseInt(key) * 30
            const s = (val[0] - minRes) / (maxRes-minRes) * canvasRef.current.width
            const e = (val[1] - minRes) / (maxRes-minRes) * canvasRef.current.width
            ctx.fillStyle = 'white'
            ctx.beginPath()
            ctx.roundRect(s, y, e-s, 16, 6)
            ctx.fill()
            ctx.stroke()
            ctx.fillStyle = 'black'
            const tm = ctx.measureText("Range "+key)
            ctx.fillText("Range "+key, (s+e-tm.width)/2, 4+y+(tm.actualBoundingBoxDescent+tm.actualBoundingBoxAscent)/2)
        }

        ctx.strokeStyle = 'black'

        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(0, (numRanges+1)*30)
        ctx.lineTo(canvasRef.current.width, (numRanges+1)*30)
        ctx.stroke()

        for(let i=0; i<maxRes; i += 20){
            ctx.beginPath()
            const x = (i - minRes) / (maxRes-minRes) * canvasRef.current.width
            ctx.moveTo(x, (numRanges+1)*30)
            ctx.lineTo(x, (numRanges+1)*30+15)
            ctx.stroke()
        }

        const tm2 = ctx.measureText("100")
        const t_off = 2*(tm2.actualBoundingBoxDescent+tm2.actualBoundingBoxAscent)
        const text_y = (numRanges+1)*30+t_off
        for(let i=0; i<maxRes; i += 100){
            const x = (i - minRes) / (maxRes-minRes) * canvasRef.current.width
            const tm = ctx.measureText(""+i)
            ctx.fillText(""+i, x-tm.width/2, 4+text_y+(tm2.actualBoundingBoxDescent+tm2.actualBoundingBoxAscent)/2)
        }

        ctx.font = "18px helvetica"
        ctx.miterLimit = 2

        const models_base_y = text_y + tm2.actualBoundingBoxDescent+tm2.actualBoundingBoxAscent + 10

        const redHsv = rgb2hsv(255,0,0)
        const blueHsv = rgb2hsv(0,0,255)

        let i = 0
        for(const model of models_json){
            const s = (model.tarStart - minRes) / (maxRes-minRes) * canvasRef.current.width
            const e = (model.tarEnd - minRes)   / (maxRes-minRes) * canvasRef.current.width
            const y = i * 30 + models_base_y
            let factor = model.seqID / 100.
            if(factor<0) factor = 0
            if(factor>1) factor = 1
            const fh = factor * redHsv.h + (1.0 - factor) * blueHsv.h
            const fs = factor * redHsv.s + (1.0 - factor) * blueHsv.s
            const fv = factor * redHsv.v + (1.0 - factor) * blueHsv.v
            const rgb = hsv2rgb(fh,fs,fv)
            let r_str = rgb.r.toString(16)
            let g_str = rgb.g.toString(16)
            let b_str = rgb.b.toString(16)
            if(r_str.length<2) r_str = "0" + r_str
            if(g_str.length<2) g_str = "0" + g_str
            if(b_str.length<2) b_str = "0" + b_str
            const col_str = '#'+r_str+g_str+b_str
            ctx.fillStyle = col_str
            ctx.strokeStyle = col_str
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.roundRect(s, y, e-s, 16, 6)
            ctx.fill()
            ctx.stroke()
            ctx.strokeStyle = 'white'
            const text = model.mgName + " (" + model.seqID.toFixed(2) + "%) (" + model.RID +")"
            ctx.fillStyle = 'black'
            ctx.lineWidth = 6
            const tm = ctx.measureText(text)
            ctx.strokeText(text, (s+e-tm.width)/2, 4+y+(tm.actualBoundingBoxDescent+tm.actualBoundingBoxAscent)/2)
            ctx.fillText(text, (s+e-tm.width)/2, 4+y+(tm.actualBoundingBoxDescent+tm.actualBoundingBoxAscent)/2)
            i++
        }
    }

    const loadMrBumpFiles = async (files: FileList) => {

        if(files.length===0) return

        const readPromises: Promise<{molecule:moorhen.Molecule,domain:string}>[] = []
        const modelFiles = []
        const domains = {}
        const pic_domains:PictureDomains = {}
        const allModels: string[] = []

        let alignText: string = ""
        let phmmerText: string = ""
        const models_json: MrBUMPModelJson[] = []

        for (const file of files) {
            if(file.name==="models.json"&&file.webkitRelativePath.includes("logs/models.json")){
                const fileContents = await readTextFile(file) as string
                const json = JSON.parse(fileContents)
                for(const iter of Object.entries(json)){
                    const key: string = iter[0]
                    const value: any = iter[1]
                    const fullName = value[mrbump_json_keys.indexOf("modelPDBfile")]
                    const relName = fullName.substring(fullName.lastIndexOf("models/range_"))
                    modelFiles.push(relName)
                    const this_model_json: MrBUMPModelJson = {} as MrBUMPModelJson
                    let iv = 0
                    for(const v of value){
                        this_model_json[mrbump_json_keys[iv]] = v
                        iv++
                    }
                    models_json.push(this_model_json)
                    allModels.push(this_model_json.modelName)
                    if(this_model_json.RID in pic_domains){
                        pic_domains[this_model_json.RID][0].push(this_model_json.modelName)
                    } else {
                        pic_domains[this_model_json.RID] = [[this_model_json.modelName],[this_model_json.tarGroupStart,this_model_json.tarGroupEnd]]
                    }
                }
            }
            if(file.name==="alignment_report.log"&&file.webkitRelativePath.includes("alignment_report.log")){
                alignText = await readTextFile(file) as string
            }
            if(file.name==="phmmer.log"&&file.webkitRelativePath.includes("phmmer.log")){
                phmmerText = await readTextFile(file) as string
            }
        }

        for (const file of files) {
            if(file.webkitRelativePath.includes("models/range_")){
                for (const modelFile of modelFiles) {
                    if(file.webkitRelativePath.includes(modelFile)){
                        const fullName = file.webkitRelativePath
                        const domStart = fullName.substring(fullName.lastIndexOf("models/range_")+"models/range_".length).search("/")
                        const domain = fullName.substring(fullName.lastIndexOf("models/range_")+"models/range_".length).substring(0,domStart)
                        readPromises.push(readPdbFileMrBump(file,domain))
                        if(domain in domains){
                            domains[domain].push(fullName)
                        } else {
                            domains[domain] = [fullName]
                        }
                    }
                }
            }
        }

        drawDomainsPicture(pic_domains,models_json)

        if(readPromises.length===0) return

        let newMolecules: {molecule:moorhen.Molecule,domain:string}[] = await Promise.all(readPromises)
        if (!newMolecules.every(molecule => molecule.molecule.molNo !== -1)) {
            enqueueSnackbar("Failed to read molecule", { variant: "warning" })
            newMolecules = newMolecules.filter(molecule => molecule.molecule.molNo !== -1)
            if (newMolecules.length === 0) {
                return
            }
        }

        const drawPromises: Promise<void>[] = []
        const molecules: moorhen.Molecule[] = []

        for (const newMolecule of newMolecules) {
            molecules.push(newMolecule.molecule)
            drawPromises.push(
                newMolecule.molecule.fetchIfDirtyAndDraw(newMolecule.molecule.atomCount >= 50000 ? 'CRs' : 'CBs')
            )
        }
        await Promise.all(drawPromises)

        dispatch(addMoleculeList(molecules))
        newMolecules.at(-1).molecule.centreOn('/*/*/*/*', true)

        const theDomains = {}
        for(const [key, value] of Object.entries(domains)){
            theDomains[key] = []
            for (const newMolecule of newMolecules) {
                if(newMolecule.domain === key){
                    theDomains[key].push(newMolecule.molecule)
                }
            }
        }

        setMrBumpDomains(theDomains)

    }

    const footerContent = <Stack gap={2} direction='horizontal' style={{paddingTop: '0.5rem', alignItems: 'space-between', alignContent: 'space-between', justifyContent: 'space-between', width: '100%' }}>
        <Stack gap={2} direction='horizontal' style={{ alignItems: 'center', alignContent: 'center', justifyContent: 'center' }}>
            <Form.Group style={{ width: '20rem', margin: '0.5rem', padding: '0rem' }} controlId="uploadMtBump" className="mb-3">
            {/* @ts-expect-error */}
            <Form.Control ref={filesRef} directory="" webkitdirectory="true" type="file" multiple={true} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { loadMrBumpFiles(e.target.files) }}/>
            </Form.Group>
        </Stack>
    </Stack>

    const domains = Object.entries(mrBumpDomains).map(([key, val]) => {
        const theMols = val as moorhen.Molecule[]
        const mols = theMols.map(item => {
            return (
                <ListGroup.Item key={'row'+item.name}>
                <Stack gap={2} direction='horizontal'>
                <Col className='align-items-center' style={{ display: 'flex', justifyContent: 'left'}}>
                    {item.name}
                </Col>
                <Col style={{ display: 'flex', justifyContent: 'right' }}>
                <Button key={1} size="sm" variant="outlined">
                <VisibilityOutlined />
                </Button>
                <Button key={2} size="sm" variant="outlined">
                <CenterFocusWeakOutlined />
                </Button>
                <Button key={3} size="sm" variant="outlined">
                <DownloadOutlined />
                </Button>
                </Col>
                </Stack>
                </ListGroup.Item>
            )
        })
        return (
                <ListGroup.Item key={'cardy'+key}>
                <Card key={'col'+key}>
                    <Card.Title style={{ backgroundColor: isDark ? '#adb5bd' : '#ecf0f1'}}>
                    <Stack gap={2} direction='horizontal'>
                    <Col className='align-items-center' style={{ display: 'flex', justifyContent: 'left'}}>
                    Range {key}
                    </Col>
                    <Col style={{ display: 'flex', justifyContent: 'right' }}>
                    <Button key={1} size="sm" variant="outlined">
                    <VisibilityOutlined />
                    </Button>
                    </Col>
                    </Stack>
                    </Card.Title>
                    <ListGroup className="list-group-flush">
                        {mols}
                    </ListGroup>
                    <Card.Footer>
                    <Typography gutterBottom style={{ display: 'flex', justifyContent: 'left'}}>Variance</Typography>
                    <Slider
                         aria-label="Small steps"
                         defaultValue={110}
                         step={10}
                         marks
                         min={10}
                         max={110}
                         valueLabelDisplay="auto"/>
                    </Card.Footer>
                </Card>
                </ListGroup.Item>
        )
    })

    return <MoorhenDraggableModalBase
                modalId={modalKeys.MRBUMP}
                left={width / 6}
                top={height / 3}
                minHeight={convertViewtoPx(30, height)}
                minWidth={convertRemToPx(37)}
                maxHeight={convertViewtoPx(70, height)}
                maxWidth={convertViewtoPx(50, width)}
                enforceMaxBodyDimensions={true}
                overflowY='auto'
                overflowX='auto'
                headerTitle='MrBump results'
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
                       {(Object.entries(mrBumpDomains).length>0) &&
                    <ListGroup>
                       {domains}
                    </ListGroup>
                       }
                    </Row>
                    </Container>
                    </Tab>
                    <Tab eventKey="ranges" title="Ranges">
                    <canvas ref={canvasRef} style={{ marginTop:'1rem' }} height={canvasDimensions} width={canvasDimensions}></canvas>
                    </Tab>
                    </Tabs>
                    </>
                }
            />
}
