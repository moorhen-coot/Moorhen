import { MoorhenDraggableModalBase } from "./MoorhenDraggableModalBase"
import { moorhen } from "../../types/moorhen";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Form, FormSelect, Spinner, Stack } from "react-bootstrap";
import { convertViewtoPx } from '../../utils/MoorhenUtils';
import { useDispatch, useSelector } from "react-redux";
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect";
import { MoorhenChainSelect } from "../select/MoorhenChainSelect";
import { libcootApi } from "../../types/libcoot";
import { Backdrop } from "@mui/material";
import { useSnackbar } from "notistack";
import { addMolecule } from "../../moorhen";


export const MoorheSuperposeStructuresModal = (props: { show: boolean; setShow: React.Dispatch<React.SetStateAction<boolean>>; commandCentre: React.RefObject<moorhen.CommandCentre> }) => {    
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)
    const width = useSelector((state: moorhen.State) => state.sceneSettings.width)
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)

    const refChainSelectRef = useRef<null | HTMLSelectElement>(null)
    const refMoleculeSelectRef = useRef<null | HTMLSelectElement>(null)
    const movChainSelectRef = useRef<null | HTMLSelectElement>(null)
    const movMoleculeSelectRef = useRef<null | HTMLSelectElement>(null)
    const makeCopyOfMovStructCheckRef = useRef<null | HTMLInputElement>(null)

    const [selectedRefModel, setSelectedRefModel] = useState<null | number>(null)
    const [selectedRefChain, setSelectedRefChain] = useState<null | string>(null)
    const [selectedMovModel, setSelectedMovModel] = useState<null | number>(null)
    const [selectedMovChain, setSelectedMovChain] = useState<null | string>(null)
    const [busy, setBusy] = useState<boolean>(false)

    const dispatch = useDispatch()
    
    const { enqueueSnackbar } = useSnackbar()

    const handleClose = () => props.setShow(false)

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

        await props.commandCentre.current.cootCommand({
            message: 'coot_command',
            command: 'SSM_superpose',
            returnType: 'superpose_results',
            commandArgs: [
                refMolecule.molNo,
                refChainSelectRef.current.value,
                movMolecule.molNo,
                movChainSelectRef.current.value
            ],
            changesMolecules: [movMolecule.molNo]
        }, true) as moorhen.WorkerResponse<libcootApi.SuperposeResultsJS>

        movMolecule.setAtomsDirty(true)
        await movMolecule.redraw()
        movMolecule.centreOn('/*/*/*/*', true)

        if (makeCopyOfMovStructCheckRef.current.checked) {
            dispatch( addMolecule(movMolecule) )
        }

        setBusy(false)
        props.setShow(false)

    }, [molecules, props.commandCentre])


    const handleModelChange = (evt: React.ChangeEvent<HTMLSelectElement>, isReferenceModel: boolean) => {
        const selectedMolecule = molecules.find(molecule => molecule.molNo === parseInt(evt.target.value))
        if (isReferenceModel) {
            setSelectedRefModel(parseInt(evt.target.value))
            setSelectedRefChain(selectedMolecule.sequences[0].chain)
        } else {
            setSelectedMovModel(parseInt(evt.target.value))
            setSelectedMovChain(selectedMolecule.sequences[0].chain)
        }
    }

    const handleChainChange = (evt: React.ChangeEvent<HTMLSelectElement>, isReferenceModel: boolean) => {
        if (isReferenceModel) {
            setSelectedRefChain(evt.target.value)
        } else {
            setSelectedMovChain(evt.target.value)
        }
    }

    useEffect(() => {
        if (molecules.length === 0) {
            setSelectedRefModel(null)
            setSelectedMovModel(null)
            return
        }

        if (selectedRefModel === null || !molecules.map(molecule => molecule.molNo).includes(selectedRefModel)) {
            setSelectedRefModel(molecules[0].molNo)
        }

        if (selectedMovModel === null || !molecules.map(molecule => molecule.molNo).includes(selectedMovModel)) {
            setSelectedMovModel(molecules[0].molNo)
        }

    }, [molecules.length])

    const bodyContent = <Stack direction="vertical" gap={1} style={{ display: 'flex' }}>
        <Form.Group style={{  margin: '0.5rem' }}>
            <Form.Label>Algorithm</Form.Label>
            <FormSelect>
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
            </Form.Group>
            <Form.Group key="moving-model-select" style={{ margin: '0.5rem', width: '100%' }} controlId="movModelSelect" className="mb-3">
                <Form.Label>
                    Moving structure
                </Form.Label>
                <MoorhenMoleculeSelect width="100%" molecules={molecules} ref={movMoleculeSelectRef} onChange={(evt) => handleModelChange(evt, false)} />
                <MoorhenChainSelect width="100%" molecules={molecules} onChange={(evt) => handleChainChange(evt, false)} selectedCoordMolNo={selectedMovModel} allowedTypes={[1, 2]} ref={movChainSelectRef} />
            </Form.Group>
        </Stack>
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
            <Button variant='danger' onClick={handleClose}>
                Close
            </Button>
        </Stack>
    </>

    const spinnerContent =  <Backdrop sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }} open={busy}>
                                <Spinner animation="border" style={{ marginRight: '0.5rem' }}/>
                                <span>Calculating...</span>
                            </Backdrop>

    return <MoorhenDraggableModalBase
                modalId="superpose-structures-modal"
                left={width / 6}
                top={height / 6}
                show={props.show}
                setShow={handleClose}
                defaultHeight={convertViewtoPx(10, height)}
                defaultWidth={convertViewtoPx(10, width)}
                minHeight={convertViewtoPx(15, height)}
                minWidth={convertViewtoPx(25, width)}
                maxHeight={convertViewtoPx(30, height)}
                maxWidth={convertViewtoPx(50, width)}
                headerTitle='Superpose structures'
                footer={footerContent}
                body={bodyContent}
                additionalChildren={spinnerContent}
            />
}

