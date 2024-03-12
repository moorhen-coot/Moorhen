import { useDispatch, useSelector } from "react-redux"
import { MoorhenDraggableModalBase } from "./MoorhenDraggableModalBase"
import { moorhen } from "../../types/moorhen"
import { convertRemToPx, convertViewtoPx } from "../../utils/MoorhenUtils"
import { Button, ButtonGroup, Card, Col, Dropdown, Form, FormSelect, Row, Spinner, SplitButton, Stack } from "react-bootstrap"
import { Backdrop, IconButton, Slider, Tooltip } from "@mui/material"
import React, { useCallback, useEffect, useRef, useState } from "react"
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect"
import { hideMolecule, showMolecule } from "../../store/moleculesSlice"
import { CenterFocusWeakOutlined, DownloadOutlined } from "@mui/icons-material"

export const MoorhenSliceNDiceModal = (props: {
    show: boolean;
    setShow: React.Dispatch<React.SetStateAction<boolean>>;
    commandCentre: React.RefObject<moorhen.CommandCentre>;
}) => {
    
    const clusteringTypeSelectRef = useRef<null | HTMLSelectElement>(null)
    const moleculeSelectRef = useRef<null | HTMLSelectElement>(null)
    const nClustersRef = useRef<number>(2)

    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)
    const width = useSelector((state: moorhen.State) => state.sceneSettings.width)
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)

    const dispatch = useDispatch()
    const [nClusters, setNClusters] = useState<number>(2)
    const [selectedMolNo, setSelectedMolNo] = useState<number>(null)
    const [clusteringType, setClusteringType] = useState<string>('kmeans')
    const [busy, setBusy] = useState<boolean>(false)
    const [slicingResults, setSlicingResults] = useState<moorhen.Molecule[]>(null)
    const [sliceCards, setSliceCards] = useState<JSX.Element[]>(null)

    const getSliceCards = (sliceId: string, fragmentMolecule: moorhen.Molecule) => {
        return <Card key={sliceId} style={{marginTop: '0.5rem'}}>
            <Card.Body style={{padding:'0.5rem'}}>
                <Row style={{display:'flex', justifyContent:'between'}}>
                    <Col style={{alignItems:'center', justifyContent:'left', display:'flex'}}>
                        <span>
                            {sliceId}
                        </span>
                    </Col>
                    <Col className='col-3' style={{margin: '0', padding:'0', justifyContent: 'right', display:'flex'}}>
                    <Tooltip title="View">
                        <IconButton style={{marginRight:'0.5rem'}} onClick={() => fragmentMolecule.centreOn('/*/*/*/*', true, true)}>
                            <CenterFocusWeakOutlined/>
                        </IconButton>
                        </Tooltip>
                        <Tooltip title="Download">
                        <IconButton style={{marginRight:'0.5rem'}} onClick={() => fragmentMolecule.downloadAtoms()}>
                            <DownloadOutlined/>
                        </IconButton>
                        </Tooltip>
                    </Col>
                </Row>
            </Card.Body>
        </Card>
    }

    useEffect(() => {
        const selectedMolecule = molecules.find(molecule => molecule.molNo === parseInt(moleculeSelectRef.current.value))
        if (selectedMolecule && slicingResults?.length > 0) {
            setSliceCards(slicingResults?.map(fragmentMolecule => getSliceCards(fragmentMolecule.name, fragmentMolecule)))
        } else {
            setSliceCards([])
        }
    }, [slicingResults])

    const doSlice = useCallback(async () => {
        if (!moleculeSelectRef.current.value) {
            return
        }

        const selectedMolecule = molecules.find(molecule => molecule.molNo === parseInt(moleculeSelectRef.current.value))
        if (!selectedMolecule) {
            return
        }
        
        let commandArgs: (string | number)[]
        switch (clusteringTypeSelectRef.current.value) {
            case "kmeans":
            case "agglomerative":
                commandArgs = [ selectedMolecule.molNo, nClustersRef.current, clusteringTypeSelectRef.current.value ]
                break
            default:
                console.warn(`Unkown clustering algorithm ${clusteringTypeSelectRef.current}`)
                break
        }
        
        if (!commandArgs) {
            return
        }

        setBusy(true)

        if (slicingResults?.length > 0) {
            await Promise.all(
                slicingResults.sort((a, b) => { return  b.molNo - a.molNo }).map(sliceMolecule => sliceMolecule.delete(true))
            )
        }

        const result = await props.commandCentre.current.cootCommand({
            command: 'slicendice_slice',
            commandArgs: commandArgs,
            returnType: 'vector_pair_string_int'
        }, false)

        dispatch( hideMolecule(selectedMolecule) )

        const slices = [...new Set(result.data.result.result.filter(item => item.slice !== -1).map(item => item.slice))]
        const newMolecules = await Promise.all(slices.map(async(slice: number) => {
            const residueCids = result.data.result.result.filter(item => item.slice === slice).map(item => item.residue).join("||")
            const newMolecule = await selectedMolecule.copyFragmentUsingCid(residueCids, false)
            newMolecule.name = `Slice #${slice + 1}`
            newMolecule.setAtomsDirty(true)
            await newMolecule.fetchIfDirtyAndDraw('CRs')
            return newMolecule
        }))
        setSlicingResults(newMolecules.sort( (a, b) => {  return parseInt(a.name.replace('Slice #', '')) - parseInt(b.name.replace('Slice #', ''))  }))
        setBusy(false)
    }, [molecules, slicingResults])

    const handleClose = useCallback(async () => {
        if (slicingResults?.length > 0) {
            await Promise.all(
                slicingResults.sort((a, b) => { return  b.molNo - a.molNo }).map(sliceMolecule => sliceMolecule.delete(true))
            )
        }
        const selectedMolecule = molecules.find(molecule => molecule.molNo === parseInt(moleculeSelectRef.current.value))
        if (selectedMolecule) {
            dispatch( showMolecule(selectedMolecule) )
        }
        props.setShow(false)
    }, [slicingResults, molecules])

    const handleDownload = useCallback(async (doEnsemble: boolean = false) => {
        if (slicingResults?.length > 0) {
            await Promise.all(
                slicingResults.map(sliceMolecule => sliceMolecule.downloadAtoms())
            )
        }
    }, [slicingResults])

    const bodyContent = <Stack direction="vertical" gap={1}>
        <Stack direction="horizontal" gap={1} style={{display: 'flex', width: '100%'}}>
            <Form.Group style={{ margin: '0.5rem', width: '20rem' }}>
                <Form.Label>Clustering algorithm...</Form.Label>
                <FormSelect size="sm" ref={clusteringTypeSelectRef} defaultValue={'kmeans'} onChange={(evt) => {
                    setClusteringType(evt.target.value)
                    clusteringTypeSelectRef.current.value = evt.target.value
                }}>
                    <option value={'kmeans'} key={'kmeans'}>K-Means</option>
                    <option value={'agglomerative'} key={'agglomerative'}>Agglomerative</option>
                </FormSelect>
            </Form.Group>
            <MoorhenMoleculeSelect {...props} molecules={molecules} allowAny={false} ref={moleculeSelectRef} onChange={(evt) => setSelectedMolNo(parseInt(evt.target.value))}/>
        </Stack>
        {clusteringType === 'kmeans' && 
        <div style={{ paddingLeft: '2rem', paddingRight: '2rem', paddingTop: '0.1rem', paddingBottom: '0.1rem' }}>
        <Slider
            aria-label="Factor"
            getAriaValueText={(newVal: number) => `${newVal} slices`}
            valueLabelFormat={(newVal: number) => `${newVal} slices`}
            valueLabelDisplay="on"
            value={nClusters}
            onChange={(evt: any, newVal: number) => {
                nClustersRef.current = newVal
                setNClusters(newVal)
            }}
            marks={true}
            defaultValue={5}
            step={1}
            min={2}
            max={10}
            sx={{
                marginTop: '1.7rem',
                marginBottom: '0.8rem',
                    '& .MuiSlider-valueLabel': {
                        top: -1,
                        fontSize: 14,
                        fontWeight: 'bold',
                        color: 'grey',
                        backgroundColor: 'unset',
                    },
            }}
        />
        </div>
        }
        <hr></hr>
        <Row>
            {sliceCards?.length > 0 ? <span>Found {sliceCards.length} possible slice(s)</span> : null}
            {sliceCards?.length > 0 ? <div style={{height: '100px', width: '100%'}}>{sliceCards}</div> : <span>No results...</span>}
        </Row>
    </Stack>

    const footerContent = <Stack gap={2} direction='horizontal' style={{paddingTop: '0.5rem', alignItems: 'center', alignContent: 'center', justifyContent: 'center' }}>
        <SplitButton id='download-slice-n-dice' variant="primary" title="Download all" onClick={() => handleDownload()}>
            <Dropdown.Item eventKey="1" onClick={() => handleDownload()}>As individual files</Dropdown.Item>
            <Dropdown.Item eventKey="2" onClick={() => handleDownload(true)}>As an ensemble</Dropdown.Item>
        </SplitButton>
        <Button variant='primary' onClick={doSlice}>
            Slice
        </Button>
        <Button variant='danger' onClick={handleClose}>
            Close
        </Button>
    </Stack>

    const spinnerContent =  <Backdrop sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }} open={busy}>
                                <Spinner animation="border" style={{ marginRight: '0.5rem' }}/>
                                <span>Slicing...</span>
                            </Backdrop>


    return <MoorhenDraggableModalBase
                modalId="slice-n-dice-modal"
                left={width / 6}
                top={height / 6}
                show={props.show}
                setShow={handleClose}
                defaultHeight={convertViewtoPx(10, height)}
                defaultWidth={convertViewtoPx(10, width)}
                minHeight={convertViewtoPx(15, height)}
                minWidth={convertRemToPx(30)}
                maxHeight={convertViewtoPx(50, height)}
                maxWidth={convertViewtoPx(40, width)}
                additionalChildren={spinnerContent}
                headerTitle='Slice-n-Dice'
                footer={footerContent}
                body={bodyContent}
            />
}