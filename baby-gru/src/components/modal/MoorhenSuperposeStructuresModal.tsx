import { MoorhenDraggableModalBase } from "./MoorhenDraggableModalBase"
import { moorhen } from "../../types/moorhen";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { Button, Card, Col, Form, FormSelect, Row, Spinner, Stack } from "react-bootstrap";
import { convertViewtoPx } from '../../utils/utils';
import { useDispatch, useSelector } from "react-redux";
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect";
import { MoorhenChainSelect } from "../select/MoorhenChainSelect";
import { Backdrop, IconButton, Tooltip } from "@mui/material";
import { useSnackbar } from "notistack";
import { addMolecule } from "../../moorhen";
import { MoorhenSequenceRangeSlider } from "../misc/MoorhenSequenceRangeSlider";
import { DeleteOutlined, WarningAmberOutlined } from "@mui/icons-material";
import { hideModal } from "../../store/modalsSlice";
import { modalKeys } from "../../utils/enums";

const lsqkbResidueRangesReducer = (oldList: moorhen.lskqbResidueRangeMatch[], change: {action: string; item?: moorhen.lskqbResidueRangeMatch}) => {
    let newState: moorhen.lskqbResidueRangeMatch[]
    
    switch (change.action) {
        case "add":
            newState = [ ...oldList.filter(item => JSON.stringify(item) !== JSON.stringify(change.item)), change.item ]
            break
        case "remove":
            newState = [ ...oldList.filter(item => JSON.stringify(item) !== JSON.stringify(change.item)) ]
            break
        case "empty":
            newState = [ ]
            break
        default:
            console.warn(`Unrecognised lsqkb residue range reducer action type ${change.action}`)
            newState = [ ...oldList ]
            break
    }
    
    return newState
}

const initialLsqkbResidueRanges: moorhen.lskqbResidueRangeMatch[] = []

const LskqbResidueRangeMatchCard = (props: { 
    item: moorhen.lskqbResidueRangeMatch;
    removeItem: () => void;
    refMolNo: number;
    movMolNo: number;
}) => {
    
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)

    const [warning, setWarning] = useState<string | null>(null)

    useEffect(() => {
        const doSanityCheck = async () => {
            const refMolecule = molecules.find(molecule => molecule.molNo === props.refMolNo)
            const movMolecule = molecules.find(molecule => molecule.molNo === props.movMolNo)
            if (refMolecule && movMolecule) {
                const atomsRef = await refMolecule.gemmiAtomsForCid(`//${props.item.refChainId}/${props.item.refResidueRange[0]}-${props.item.refResidueRange[1]}/CA`)
                const atomsMov = await movMolecule.gemmiAtomsForCid(`//${props.item.movChainId}/${props.item.movResidueRange[0]}-${props.item.movResidueRange[1]}/CA`)
                if (atomsMov.length !== atomsRef.length) {
                    setWarning(
                        `Unequal number of residues selected in the reference (${atomsRef.length} res.) and moving (${atomsMov.length} res.) structures.
                        Only first ${atomsRef.length < atomsMov.length ? atomsRef.length : atomsMov.length} res. will be used.`
                    )
                }
            }    
        }
        doSanityCheck()
    }, [])
    
    return <Card style={{marginTop: '0.5rem', borderStyle: 'solid', borderColor: isDark ? 'white' : 'grey', borderWidth: '1px'}}>
        <Card.Body style={{padding:'0.5rem'}}>
            <Row style={{display:'flex', justifyContent:'between'}}>
                <Col style={{alignItems:'center', justifyContent:'left', display:'flex', flexDirection: "column"}}>
                    <Row>
                        Reference
                    </Row>
                    <Row>
                        {`//${props.item.refChainId}/${props.item.refResidueRange[0]}-${props.item.refResidueRange[1]}`}
                    </Row>
                </Col>
                <Col style={{alignItems:'center', justifyContent:'left', display:'flex', flexDirection: "column"}}>
                    <Row>
                        Moving
                    </Row>
                    <Row>
                        {`//${props.item.movChainId}/${props.item.movResidueRange[0]}-${props.item.movResidueRange[1]}`}
                    </Row>
                </Col>
                {warning &&
                <Col style={{margin: '0', padding:'0', justifyContent: 'center', display:'flex', alignItems: "center"}}>
                    <Tooltip title={warning}>
                        <WarningAmberOutlined style={{ marginRight:'0.5rem', color: isDark ? 'white' : 'grey' }}/>
                    </Tooltip>
                </Col>
                }
                <Col className='col-3' style={{margin: '0', padding:'0', justifyContent: 'right', display:'flex'}}>
                    <Tooltip title="Delete">
                    <IconButton style={{ marginRight:'0.5rem', color: isDark ? 'white' : 'grey' }} onClick={props.removeItem}>
                        <DeleteOutlined/>
                    </IconButton>
                    </Tooltip>
                </Col>
            </Row>
        </Card.Body>
    </Card>
}

export const MoorheSuperposeStructuresModal = (props: { commandCentre: React.RefObject<moorhen.CommandCentre> }) => {    

    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)
    const width = useSelector((state: moorhen.State) => state.sceneSettings.width)
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)

    const refChainSelectRef = useRef<null | HTMLSelectElement>(null)
    const refMoleculeSelectRef = useRef<null | HTMLSelectElement>(null)
    const movChainSelectRef = useRef<null | HTMLSelectElement>(null)
    const movMoleculeSelectRef = useRef<null | HTMLSelectElement>(null)
    const makeCopyOfMovStructCheckRef = useRef<null | HTMLInputElement>(null)
    const algorithmSelectRef = useRef<null | HTMLSelectElement>(null)
    const lsqkbModeRef = useRef<number>(0)
    const movResidueRangeRef = useRef<[number, number]>([1, 100])
    const refResidueRangeRef = useRef<[number, number]>([1, 100])

    const [lsqkbResidueRanges, setLsqkbResidueRanges] = useReducer(lsqkbResidueRangesReducer, initialLsqkbResidueRanges)
    const [selectedRefModel, setSelectedRefModel] = useState<null | number>(null)
    const [selectedRefChain, setSelectedRefChain] = useState<null | string>(null)
    const [selectedMovModel, setSelectedMovModel] = useState<null | number>(null)
    const [selectedMovChain, setSelectedMovChain] = useState<null | string>(null)
    const [algortihm, setAlgorithm] = useState<null | string>("ssm")
    const [lsqkbMode, setLsqkbMode] = useState<string>("all-atoms")
    const [busy, setBusy] = useState<boolean>(false)

    const dispatch = useDispatch()
    
    const { enqueueSnackbar } = useSnackbar()

    const handleSuperpose = useCallback(async () => {
        if (!refMoleculeSelectRef || !movMoleculeSelectRef) {
            return
        }

        const refMolecule = molecules.find(molecule => molecule.molNo === parseInt(refMoleculeSelectRef.current.value))

        let movMolecule: moorhen.Molecule
        if (makeCopyOfMovStructCheckRef.current.checked) {
            const selectedMovMolecule = molecules.find(molecule => molecule.molNo === parseInt(movMoleculeSelectRef.current.value))
            movMolecule = await selectedMovMolecule.copyMolecule()
        } else {
            movMolecule = molecules.find(molecule => molecule.molNo === parseInt(movMoleculeSelectRef.current.value))
        }


        if (!refMolecule || !movMolecule) {
            return
        } else if (refMolecule.molNo === movMolecule.molNo && refChainSelectRef.current.value === movChainSelectRef.current.value) {
            enqueueSnackbar("Cannot superpose structure to itself", { variant: "warning" })
            return
        }

        setBusy(true)
        
        if (algorithmSelectRef.current.value === "ssm") {
            await movMolecule.SSMSuperpose(movChainSelectRef.current.value, refMolecule.molNo, refChainSelectRef.current.value)
        } else {
            await movMolecule.lsqkbSuperpose(refMolecule.molNo, lsqkbResidueRanges, lsqkbModeRef.current)
        }

        if (makeCopyOfMovStructCheckRef.current.checked) {
            dispatch( addMolecule(movMolecule) )
        }

        setBusy(false)
        dispatch( hideModal(modalKeys.SUPERPOSE_MODELS) )
        
    }, [molecules, props.commandCentre, lsqkbResidueRanges])


    const handleModelChange = (evt: React.ChangeEvent<HTMLSelectElement>, isReferenceModel: boolean) => {
        const selectedMolecule = molecules.find(molecule => molecule.molNo === parseInt(evt.target.value))
        if (isReferenceModel) {
            setSelectedRefModel(parseInt(evt.target.value))
            setSelectedRefChain(selectedMolecule.sequences[0].chain)
        } else {
            setSelectedMovModel(parseInt(evt.target.value))
            setSelectedMovChain(selectedMolecule.sequences[0].chain)
        }
        setLsqkbResidueRanges({ action: "empty" })
    }

    const handleChainChange = (evt: React.ChangeEvent<HTMLSelectElement>, isReferenceModel: boolean) => {
        if (isReferenceModel) {
            setSelectedRefChain(evt.target.value)
        } else {
            setSelectedMovChain(evt.target.value)
        }
    }

    const handleAddLsqkbMatch = useCallback(() => {
        const refMolecule = molecules.find(molecule => molecule.molNo === parseInt(refMoleculeSelectRef.current.value))
        const movMolecule = molecules.find(molecule => molecule.molNo === parseInt(movMoleculeSelectRef.current.value))
        if (refMolecule && movMolecule) {
            const refSequence = refMolecule.sequences.find(sequence => sequence.chain === refChainSelectRef.current.value)
            const movSequence = movMolecule.sequences.find(sequence => sequence.chain === movChainSelectRef.current.value)
            if (refSequence && movSequence) {
                const refStartResNum = refSequence.sequence[refResidueRangeRef.current[0] - 1]?.resNum
                const refEndResNum = refSequence.sequence[refResidueRangeRef.current[1] - 1]?.resNum
                const movStartResNum = movSequence.sequence[movResidueRangeRef.current[0] - 1]?.resNum
                const movEndResNum = movSequence.sequence[movResidueRangeRef.current[1] - 1]?.resNum
                const newMatch = {
                    refChainId: refChainSelectRef.current.value,
                    movChainId: movChainSelectRef.current.value,
                    refResidueRange: [refStartResNum, refEndResNum] as [number, number],
                    movResidueRange: [movStartResNum, movEndResNum] as [number, number]
                }
                setLsqkbResidueRanges({ action: "add", item: newMatch })        
            } else {
                enqueueSnackbar("Something went wrong...", { variant: "warning" })
            }
        } else {
            enqueueSnackbar("Something went wrong...", { variant: "warning" })
        }
    }, [molecules])

    useEffect(() => {
        if (molecules.length === 0) {
            setSelectedRefModel(null)
            setSelectedMovModel(null)
            setSelectedRefChain(null)
            setSelectedMovChain(null)
            return
        }

        if (selectedRefModel === null || !molecules.map(molecule => molecule.molNo).includes(selectedRefModel)) {
            setSelectedRefModel(molecules[0].molNo)
            setSelectedRefChain(molecules[0].sequences[0].chain)
        }

        if (selectedMovModel === null || !molecules.map(molecule => molecule.molNo).includes(selectedMovModel)) {
            setSelectedMovModel(molecules[0].molNo)
            setSelectedMovChain(molecules[0].sequences[0].chain)
        }

    }, [molecules.length])

    const bodyContent = <Stack direction="vertical" gap={1} style={{ display: 'flex' }}>
        <Form.Group style={{  margin: '0.5rem' }}>
            <Form.Label>Algorithm</Form.Label>
            <FormSelect ref={algorithmSelectRef} value={algortihm} onChange={(evt) => setAlgorithm(evt.target.value)}>
                <option value={"ssm"}>SSM</option>
                <option value={"lsqkb"}>LSQKB</option>
            </FormSelect>
        </Form.Group>
        <hr></hr>
        <Stack direction="horizontal" gap={1} style={{ display: 'flex' }}>
            <Form.Group key="reference-model-select" style={{  margin: '0.5rem', width: '100%' }} controlId="refModelSelect" className="mb-3">
                <Form.Label>
                    Reference structure
                </Form.Label>
                <MoorhenMoleculeSelect width="100%" molecules={molecules} ref={refMoleculeSelectRef} onChange={(evt) => handleModelChange(evt, true)} />
                <MoorhenChainSelect width="100%" molecules={molecules} onChange={(evt) => handleChainChange(evt, true)} selectedCoordMolNo={selectedRefModel} allowedTypes={[1, 2]} ref={refChainSelectRef} />
                {algortihm === 'lsqkb' && 
                <MoorhenSequenceRangeSlider ref={refResidueRangeRef} selectedMolNo={selectedRefModel} selectedChainId={selectedRefChain}/>
                }
            </Form.Group>
            <Form.Group key="moving-model-select" style={{ margin: '0.5rem', width: '100%' }} controlId="movModelSelect" className="mb-3">
                <Form.Label>
                    Moving structure
                </Form.Label>
                <MoorhenMoleculeSelect width="100%" molecules={molecules} ref={movMoleculeSelectRef} onChange={(evt) => handleModelChange(evt, false)} />
                <MoorhenChainSelect width="100%" molecules={molecules} onChange={(evt) => handleChainChange(evt, false)} selectedCoordMolNo={selectedMovModel} allowedTypes={[1, 2]} ref={movChainSelectRef} />
                {algortihm === 'lsqkb' && 
                <MoorhenSequenceRangeSlider ref={movResidueRangeRef} selectedMolNo={selectedMovModel} selectedChainId={selectedMovChain}/>
                }
            </Form.Group>
        </Stack>
        {algortihm === "lsqkb" && <>
        <Button onClick={handleAddLsqkbMatch}>
            Add match
        </Button>
        <hr></hr>
        {lsqkbResidueRanges.length > 0 ? 
            lsqkbResidueRanges.map(item => {
                return <LskqbResidueRangeMatchCard key={JSON.stringify(item)} refMolNo={selectedRefModel} movMolNo={selectedMovModel} item={item} removeItem={() => setLsqkbResidueRanges({ action: "remove", item: item })}/>
            })
            :
            <span>No matches defined for alignment...</span>
        }
        <hr></hr>
        <Form.Label style={{ margin: '0.5rem' }}>
            Match atoms
        </Form.Label>
        <Form.Group style={{ margin: '0.5rem', display: "flex", width: '100%', flexDirection: 'row', justifyContent: 'space-around' }} controlId="lsqkb-settings" className="mb-3">
            <Form.Check
                style={{ margin: "0.5rem", justifyContent: "inherit", display: "flex", gap: "0.5rem"}} 
                type="radio"
                checked={lsqkbMode === 'all-atoms'}
                onChange={() => { 
                    lsqkbModeRef.current = 0
                    setLsqkbMode("all-atoms")
                }}
                label="All Atoms"/>
            <Form.Check
                style={{ margin: "0.5rem", justifyContent: "inherit", display: "flex", gap: "0.5rem"}} 
                type="radio"
                checked={lsqkbMode === 'mainchain'}
                onChange={() => { 
                    lsqkbModeRef.current = 1
                    setLsqkbMode("mainchain")
                }}
                label="Main Chain"/>
            <Form.Check
                style={{ margin: "0.5rem", justifyContent: "inherit", display: "flex", gap: "0.5rem"}} 
                type="radio"
                checked={lsqkbMode === 'c-alphas'}
                onChange={() => { 
                    lsqkbModeRef.current = 2
                    setLsqkbMode("c-alphas")
                }}
                label="C-Alphas"/>
        </Form.Group>
        <hr></hr>
        </>}
        <Form.Check
            style={{ margin: "0.5rem", justifyContent: "inherit", display: "flex", gap: "0.5rem"}} 
            type="switch"
            ref={makeCopyOfMovStructCheckRef}
            label="Move a copy of moving structure"/>
    </Stack>

    const footerContent = <>
        <Stack gap={2} direction='horizontal' style={{paddingTop: '0.5rem', alignItems: 'center', alignContent: 'center', justifyContent: 'center' }}>
        <Button variant='primary' onClick={handleSuperpose}>
                Superpose
            </Button>
            <Button variant='danger' onClick={() => dispatch( hideModal(modalKeys.SUPERPOSE_MODELS) )}>
                Close
            </Button>
        </Stack>
    </>

    const spinnerContent =  <Backdrop sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }} open={busy}>
                                <Spinner animation="border" style={{ marginRight: '0.5rem' }}/>
                                <span>Calculating...</span>
                            </Backdrop>

    return <MoorhenDraggableModalBase
                modalId={modalKeys.SUPERPOSE_MODELS}
                left={width / 6}
                top={height / 6}
                defaultHeight={convertViewtoPx(10, height)}
                defaultWidth={convertViewtoPx(10, width)}
                minHeight={convertViewtoPx(15, height)}
                minWidth={convertViewtoPx(25, width)}
                maxHeight={convertViewtoPx(50, height)}
                maxWidth={convertViewtoPx(50, width)}
                headerTitle='Superpose structures'
                footer={footerContent}
                body={bodyContent}
                additionalChildren={spinnerContent}
            />
}

