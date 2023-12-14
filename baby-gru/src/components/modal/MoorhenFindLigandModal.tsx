import { MoorhenDraggableModalBase } from "./MoorhenDraggableModalBase"
import { moorhen } from "../../types/moorhen";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Card, Col, Form, Row, Spinner, Stack } from "react-bootstrap";
import { convertRemToPx, convertViewtoPx} from '../../utils/MoorhenUtils';
import { useSelector } from "react-redux";
import { MoorhenMapSelect } from "../select/MoorhenMapSelect";
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect";
import { MoorhenNumberForm } from "../select/MoorhenNumberForm";
import { Backdrop, IconButton, Tooltip } from "@mui/material";
import { CenterFocusWeakOutlined, CrisisAlertOutlined, MergeTypeOutlined } from "@mui/icons-material";

export const MoorheFindLigandModal = (props: { show: boolean; setShow: React.Dispatch<React.SetStateAction<boolean>>; }) => {    
    const molecules = useSelector((state: moorhen.State) => state.molecules)
    const maps = useSelector((state: moorhen.State) => state.maps)
    const width = useSelector((state: moorhen.State) => state.sceneSettings.width)
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)

    const intoMoleculeRef = useRef<HTMLSelectElement | null>(null)
    const ligandMoleculeRef = useRef<HTMLSelectElement | null>(null)
    const mapSelectRef = useRef<HTMLSelectElement | null>(null)
    const useConformersRef = useRef<boolean>(false)
    const fitAnywhereRef = useRef<boolean>(false)
    const conformerCountRef = useRef<string>(null)

    const [useConformers, setUseConformers] = useState<boolean>(false)
    const [fitAnywhere, setFitAnywhere] = useState<boolean>(false)
    const [busy, setBusy] = useState<boolean>(false)
    const [ligandResults, setLigandResults] = useState<moorhen.Molecule[]>(null)
    const [ligandCards, setLigandCards] = useState<JSX.Element[]>(null)

    useEffect(() => {
        const selectedMolecule = molecules.find(molecule => molecule.molNo === parseInt(intoMoleculeRef.current.value))
        if (selectedMolecule && ligandResults?.length > 0) {
            setLigandCards(ligandResults?.map(ligandMolecule => getLigandCard(selectedMolecule, ligandMolecule)))
        } else {
            setLigandCards([])
        }
    }, [ligandResults])

    const getLigandCard = (molecule: moorhen.Molecule, newLigandMolecule: moorhen.Molecule) => {
        return <Card key={newLigandMolecule.molNo} style={{marginTop: '0.5rem'}}>
            <Card.Body style={{padding:'0.5rem'}}>
                <Row style={{display:'flex', justifyContent:'between'}}>
                    <Col style={{alignItems:'center', justifyContent:'left', display:'flex'}}>
                        <span>
                            {newLigandMolecule.name}
                        </span>
                    </Col>
                    <Col className='col-3' style={{margin: '0', padding:'0', justifyContent: 'right', display:'flex'}}>
                        <Tooltip title="View">
                        <IconButton style={{marginRight:'0.5rem'}} onClick={() => newLigandMolecule.centreOn('/*/*/*/*', true, true)}>
                            <CenterFocusWeakOutlined/>
                        </IconButton>
                        </Tooltip>
                        <Tooltip title="Refine">
                        <IconButton style={{marginRight:'0.5rem'}} onClick={() => newLigandMolecule.refineResiduesUsingAtomCid('//', 'ALL') }>
                            <CrisisAlertOutlined/>
                        </IconButton>
                        </Tooltip>
                        <Tooltip title="Merge">
                        <IconButton style={{marginRight:'0.5rem'}} onClick={() => {
                            molecule.mergeMolecules([newLigandMolecule], true).then(_ => newLigandMolecule.delete())
                            setLigandResults((prevLigands) => prevLigands.filter(ligand => ligand.molNo !== newLigandMolecule.molNo))
                        }}>
                            <MergeTypeOutlined/>
                        </IconButton>
                        </Tooltip>
                    </Col>
                </Row>
            </Card.Body>
        </Card>
    }

    const handleClose = () => {
        ligandResults?.forEach(ligandMolecule => ligandMolecule.delete())
        props.setShow(false)
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
                true,
                useConformersRef.current,
                parseInt(conformerCountRef.current)
            )
            setLigandResults(newMolecules)
        }
        setBusy(false)
    }, [molecules, ligandResults])

    const bodyContent = <>
        <Row style={{ padding: '0', margin: '0' }}>
            <Col>
                <MoorhenMapSelect width="" maps={maps} label="Map" ref={mapSelectRef} />
            </Col>
            <Col>
                <MoorhenMoleculeSelect width="" molecules={molecules} label="Protein molecule" allowAny={false} ref={intoMoleculeRef} filterFunction={(molecule: moorhen.Molecule) => !molecule.isLigand} />
            </Col>
            <Col>
                <MoorhenMoleculeSelect width="" molecules={molecules} label="Ligand molecule" allowAny={false} ref={ligandMoleculeRef} filterFunction={(molecule: moorhen.Molecule) => molecule.isLigand} />
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
            {ligandCards?.length > 0 ? <span>Found {ligandCards.length} possible ligand location(s)</span> : null}
            {ligandCards?.length > 0 ? <div style={{height: '100px', width: '100%'}}>{ligandCards}</div> : <span>No results...</span>}
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
                modalId="find-ligand-modal"
                left={width / 6}
                top={height / 6}
                show={props.show}
                setShow={handleClose}
                defaultHeight={convertViewtoPx(10, height)}
                defaultWidth={convertViewtoPx(10, width)}
                minHeight={convertViewtoPx(15, height)}
                minWidth={convertRemToPx(40)}
                maxHeight={convertViewtoPx(50, height)}
                maxWidth={convertViewtoPx(50, width)}
                additionalChildren={spinnerContent}
                headerTitle='Find ligand'
                footer={footerContent}
                body={bodyContent}
            />
}

