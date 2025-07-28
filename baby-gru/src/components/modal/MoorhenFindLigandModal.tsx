import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Card, Col, Form, Row, Spinner, Stack } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { Backdrop, IconButton, Tooltip } from "@mui/material";
import { CenterFocusWeakOutlined, CrisisAlertOutlined, DoneOutlined, MergeTypeOutlined } from "@mui/icons-material";
import { moorhen } from "../../types/moorhen";
import { convertViewtoPx } from '../../utils/utils';
import { MoorhenMapSelect } from "../select/MoorhenMapSelect";
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect";
import { MoorhenNumberForm } from "../select/MoorhenNumberForm";
import { triggerUpdate } from "../../store/moleculeMapUpdateSlice";
import { hideModal } from "../../store/modalsSlice";
import { modalKeys } from "../../utils/enums";
import { addMolecule } from "../../store/moleculesSlice";
import { MoorhenDraggableModalBase } from "./MoorhenDraggableModalBase"

const LigandHitCard = (props: {
    selectedMolNo: number;
    ligandMolecule: moorhen.Molecule;
    ligandCardMolNoFocus: number;
    setLigandCardMolNoFocus: React.Dispatch<React.SetStateAction<number>>;
    ligandResults: moorhen.Molecule[];
    setLigandResults: React.Dispatch<React.SetStateAction<moorhen.Molecule[]>>;
    allowAddNewFittedLigand?: boolean;
    allowMergeFittedLigand?: boolean;
}) => {

    const dispatch = useDispatch()

    const animateRefine = useSelector((state: moorhen.State) => state.refinementSettings.animateRefine)
    const activeMap = useSelector((state: moorhen.State) => state.generalStates.activeMap)
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)

    const {
        allowMergeFittedLigand, allowAddNewFittedLigand
    } = { allowMergeFittedLigand: true, allowAddNewFittedLigand: false, ...props }

    const handleShow = useCallback(async () => {
        if (props.ligandMolecule.representations.length > 0) {
            await props.ligandMolecule.show('CBs')
        } else {
            await props.ligandMolecule.fetchIfDirtyAndDraw('CBs')
        }
        await props.ligandMolecule.centreOn('/*/*/*/*', true, true)
    }, [])

    useEffect(() => {
        if (props.ligandCardMolNoFocus !== props.ligandMolecule.molNo) {
            props.ligandMolecule.hide('CBs')
        } else {
            handleShow()
        }
    }, [props.ligandCardMolNoFocus])

    const handleRefinement = useCallback(async (ligandMolecule: moorhen.Molecule) => {
        if (animateRefine) {
            ligandMolecule.refineResiduesUsingAtomCidAnimated('//', activeMap, -1)
        } else {
            ligandMolecule.refineResiduesUsingAtomCid('//', 'ALL')
        }
    }, [animateRefine, activeMap])

    const handleMerge = useCallback(async () => {
        const selectedMolecule = molecules.find(molecule => molecule.molNo === props.selectedMolNo)
        if (selectedMolecule) {
            await selectedMolecule.mergeMolecules([props.ligandMolecule], true)
            await props.ligandMolecule.delete()
            dispatch( triggerUpdate(selectedMolecule.molNo) )
            props.setLigandResults((prevLigands) => prevLigands.filter(ligand => ligand.molNo !== props.ligandMolecule.molNo))
        }
    }, [molecules])

    const handleAdd = useCallback(async () => {
        if (props.ligandMolecule) {
            dispatch( addMolecule(props.ligandMolecule) )
            props.setLigandResults((prevLigands) => prevLigands.filter(ligand => ligand.molNo !== props.ligandMolecule.molNo))
        }
    }, [])

    return <Card style={{marginTop: '0.5rem', borderStyle: 'solid', borderColor: isDark ? 'white' : 'grey', borderWidth: props.ligandCardMolNoFocus === props.ligandMolecule.molNo ? '3px' : '1px'}}>
        <Card.Body style={{padding:'0.5rem'}}>
            <Row style={{display:'flex', justifyContent:'between'}}>
                <Col style={{alignItems:'center', justifyContent:'left', display:'flex'}}>
                    <span>
                        {props.ligandMolecule.name}
                    </span>
                </Col>
                <Col className='col-3' style={{margin: '0', padding:'0', justifyContent: 'right', display:'flex'}}>
                    <Tooltip title="View">
                    <IconButton style={{ marginRight:'0.5rem', color: isDark ? 'white' : 'grey' }} onClick={() => props.setLigandCardMolNoFocus(props.ligandMolecule.molNo)}>
                        <CenterFocusWeakOutlined/>
                    </IconButton>
                    </Tooltip>
                    <Tooltip title="Refine">
                    <IconButton style={{ marginRight:'0.5rem', color: isDark ? 'white' : 'grey' }} onClick={() => handleRefinement(props.ligandMolecule)}>
                        <CrisisAlertOutlined/>
                    </IconButton>
                    </Tooltip>
                    {allowAddNewFittedLigand &&
                    <Tooltip title="Add to new molecule">
                    <IconButton style={{ marginRight:'0.5rem', color: isDark ? 'white' : 'grey' }} onClick={handleAdd}>
                        <DoneOutlined/>
                    </IconButton>
                    </Tooltip>                    
                    }
                    {allowMergeFittedLigand &&
                    <Tooltip title="Merge to molecule">
                    <IconButton style={{ marginRight:'0.5rem', color: isDark ? 'white' : 'grey' }} onClick={handleMerge}>
                        <MergeTypeOutlined/>
                    </IconButton>
                    </Tooltip>
                    }
                </Col>
            </Row>
        </Card.Body>
    </Card>
}

export const MoorheFindLigandModal = (props: {
    allowAddNewFittedLigand?: boolean;
    allowMergeFittedLigand?: boolean;
}) => {    
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)
    const maps = useSelector((state: moorhen.State) => state.maps)
    const width = useSelector((state: moorhen.State) => state.sceneSettings.width)
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)

    const intoMoleculeRef = useRef<HTMLSelectElement | null>(null)
    const ligandMoleculeRef = useRef<HTMLSelectElement | null>(null)
    const mapSelectRef = useRef<HTMLSelectElement | null>(null)
    const useConformersRef = useRef<boolean>(false)
    const fitAnywhereRef = useRef<boolean>(false)
    const conformerCountRef = useRef<string>(null)

    const [ligandCardMolNoFocus, setLigandCardMolNoFocus] = useState<number>(null)
    const [useConformers, setUseConformers] = useState<boolean>(false)
    const [fitAnywhere, setFitAnywhere] = useState<boolean>(false)
    const [busy, setBusy] = useState<boolean>(false)
    const [ligandResults, setLigandResults] = useState<moorhen.Molecule[]>(null)

    const dispatch = useDispatch()

    const handleClose = () => {
        ligandResults?.forEach(ligandMolecule => ligandMolecule.delete())
        dispatch( hideModal(modalKeys.FIT_LIGAND) )
    }

    const findLigand = useCallback(async () => {
        if (!mapSelectRef.current.value || !ligandMoleculeRef.current.value || !intoMoleculeRef.current.value) {
            console.warn("Missing input, cannot find ligand...")
            return
        }
        if (useConformersRef.current && !conformerCountRef.current) {
            console.warn('Unable to parse conformer count into a valid int...')
            return
        }
        if (ligandResults?.length > 0) {
            ligandResults.forEach(ligandMolecule => ligandMolecule.delete())
        }
        setBusy(true)
        const selectedMolecule = molecules.find(molecule => molecule.molNo === parseInt(intoMoleculeRef.current.value))
        if (selectedMolecule) {
            const newMolecules = await selectedMolecule.fitLigand(
                parseInt(mapSelectRef.current.value),
                parseInt(ligandMoleculeRef.current.value),
                !fitAnywhereRef.current,
                false,
                useConformersRef.current,
                parseInt(conformerCountRef.current)
            )
            setLigandResults(newMolecules)
        }
        setBusy(false)
    }, [molecules, ligandResults])

    const handleMoleculeSelectChange = useCallback(() => {
        if (ligandResults?.length > 0) {
            ligandResults.forEach(ligandMolecule => ligandMolecule.delete())
            setLigandResults([])
        } 
    }, [ligandResults])

    const bodyContent = <>
        <Row style={{ padding: '0', margin: '0' }}>
            <Col>
                <MoorhenMapSelect width="" maps={maps} label="Map" ref={mapSelectRef} />
            </Col>
            <Col>
                <MoorhenMoleculeSelect
                    width=""
                    molecules={molecules}
                    label="Molecule"
                    allowAny={false}
                    ref={intoMoleculeRef} 
                    filterFunction={(molecule) => !molecule.isLigand}
                    onChange={handleMoleculeSelectChange}/>
            </Col>
            <Col>
                <MoorhenMoleculeSelect
                    width=""
                    molecules={molecules}
                    label="Ligand"
                    allowAny={false}
                    ref={ligandMoleculeRef}
                    filterFunction={(molecule) => molecule.isLigand}
                    onChange={handleMoleculeSelectChange}/>
            </Col>
        </Row>
        <Row style={{ padding: '0', margin: '0' }}>
            <Col style={{ alignContent: 'start', alignItems: 'start', display: 'flex', flexDirection: 'column' }}>
                <Form.Check
                    style={{margin: '0.5rem'}} 
                    type="radio"
                    checked={!fitAnywhere}
                    onChange={() => { 
                        fitAnywhereRef.current = !fitAnywhere
                        setFitAnywhere(!fitAnywhere)
                    }}
                    label="Search right here"/>
                <Form.Check
                    style={{margin: '0.5rem'}} 
                    type="radio"
                    checked={fitAnywhere}
                    onChange={() => { 
                        fitAnywhereRef.current = !fitAnywhere
                        setFitAnywhere(!fitAnywhere)
                    }}
                    label="Search everywhere"/>
            </Col>
            <Col style={{justifyContent:'center', alignContent:'center', alignItems:'center', display:'flex'}}>
                <Form.Check
                    style={{margin: '0.5rem'}} 
                    type="switch"
                    checked={useConformers}
                    onChange={() => { 
                        useConformersRef.current = !useConformers
                        setUseConformers(!useConformers)
                    }}
                    label="Flexible ligand"/>
            </Col>
            <Col style={{justifyContent:'center', alignContent:'center', alignItems:'center', display:'flex'}}>
                <MoorhenNumberForm ref={conformerCountRef} label="No. of conformers" defaultValue={10} disabled={!useConformers} width="10rem" padding="0" margin="0"/>
            </Col>
        </Row>
        <hr></hr>
        <Row>
            {ligandResults?.length > 0 ? <span>Found {ligandResults.length} possible ligand location(s)</span> : null}
            {ligandResults?.length > 0 ? <div style={{height: '100px', width: '100%'}}>{
            ligandResults.map(ligandMolecule => {
                return <LigandHitCard
                            key={ligandMolecule.molNo}
                            ligandMolecule={ligandMolecule}
                            selectedMolNo={parseInt(intoMoleculeRef.current?.value)}
                            ligandCardMolNoFocus={ligandCardMolNoFocus}
                            setLigandCardMolNoFocus={setLigandCardMolNoFocus}
                            ligandResults={ligandResults}
                            setLigandResults={setLigandResults}
                            />
            })
            }</div> : <span>No results...</span>}
        </Row>
    </>

    const footerContent = <>
        <Stack gap={2} direction='horizontal' style={{paddingTop: '0.5rem', alignItems: 'center', alignContent: 'center', justifyContent: 'center' }}>
        <Button variant='primary' onClick={findLigand}>
                Find
            </Button>
            <Button variant='danger' onClick={handleClose}>
                Close
            </Button>
        </Stack>
    </>

    const spinnerContent =  <Backdrop sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }} open={busy}>
                                <Spinner animation="border" style={{ marginRight: '0.5rem' }}/>
                                <span>Finding ligand...</span>
                            </Backdrop>

    return <MoorhenDraggableModalBase
                modalId={modalKeys.FIT_LIGAND}
                left={width / 6}
                top={height / 6}
                minHeight={convertViewtoPx(15, height)}
                minWidth={convertViewtoPx(25, width)}
                maxHeight={convertViewtoPx(50, height)}
                maxWidth={convertViewtoPx(50, width)}
                additionalChildren={spinnerContent}
                headerTitle='Find ligand'
                onClose={handleClose}
                footer={footerContent}
                body={bodyContent}
            />
}

