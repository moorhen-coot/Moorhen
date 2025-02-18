import { MoorhenDraggableModalBase } from "./MoorhenDraggableModalBase"
import { moorhen } from "../../types/moorhen"
import { useRef, useState } from "react"
import { Form, Row, Col, Stack  } from "react-bootstrap"
import { convertRemToPx, convertViewtoPx} from '../../utils/utils'
import { useSelector, useDispatch } from "react-redux"
import { modalKeys } from "../../utils/enums"
import { MoorhenMolecule } from "../../utils/MoorhenMolecule"
import { readTextFile } from "../../utils/utils"
import { useSnackbar } from "notistack"
import { addMoleculeList } from "../../store/moleculesSlice"

export const MoorhenMrBumpModal = (props: moorhen.CollectedProps) => {
    const resizeNodeRef = useRef<HTMLDivElement>()

    const width = useSelector((state: moorhen.State) => state.sceneSettings.width)
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)

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

    const loadMrBumpFiles = async (files: FileList) => {

        const mrbump_json_keys = ['modelName', 'rank', 'tarStart', 'tarEnd',
         'tarGroupStart', 'tarGroupEnd',
         'RID', 'ENS', 'eLLG', 'evalue', 'score', 'seqID',
         'coverage', 'resolution', 'experiment',
         'modelPDBfile', 'unmodifiedPDBfile', 'type',
         'mgName', 'chainSource', 'sourceChainID', 'source']

        const readPromises: Promise<{molecule:moorhen.Molecule,domain:string}>[] = []
        const modelFiles = []
        const domains = {}

        for (const file of files) {
            if(file.name==="models.json"&&file.webkitRelativePath.includes("logs/models.json")){
                const fileContents = await readTextFile(file) as string
                const json = JSON.parse(fileContents)
                for(const [key, value] of Object.entries(json)){
                    const fullName = value[mrbump_json_keys.indexOf("modelPDBfile")]
                    const relName = fullName.substring(fullName.lastIndexOf("models/range_"))
                    modelFiles.push(relName)
                }
                break
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

        if(readPromises.length===0) return

        let newMolecules: {molecule:moorhen.Molecule,domain:string}[] = await Promise.all(readPromises)
        if (!newMolecules.every(molecule => molecule.molecule.molNo !== -1)) {
            enqueueSnackbar("Failed to read molecule", { variant: "warning" })
            newMolecules = newMolecules.filter(molecule => molecule.molecule.molNo !== -1)
            if (newMolecules.length === 0) {
                return
            }
        }

        let drawPromises: Promise<void>[] = []
        let molecules: moorhen.Molecule[] = []

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
                <Row key={'row'+item.name} style={{ padding: '0', margin: '0' }}>
                    <Col key={'row'+item.name}>
                    {item.name}
                    </Col>
                </Row>
            )
        })
        return (
            <Row key={'row'+key} style={{ padding: '0', margin: '0' }}>
                <Col key={'col'+key}>
                {key}{mols}
                </Col>
            </Row>
        )
    })

    console.log(mrBumpDomains)

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
                       Domains
                       {(Object.entries(mrBumpDomains).length>0) &&
                       <Row style={{ padding: '0', margin: '0' }}>
                       <Col>
                       {domains}
                       </Col>
                       </Row>
                       }
                    </>
                }
            />
}

