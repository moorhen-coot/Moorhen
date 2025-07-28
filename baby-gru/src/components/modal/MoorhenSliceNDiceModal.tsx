import { useDispatch, useSelector } from "react-redux"
import { Button, Card, Col, Dropdown, Form, FormSelect, Row, Spinner, SplitButton, Stack } from "react-bootstrap"
import { Backdrop, IconButton, Slider, Tooltip } from "@mui/material"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { CenterFocusWeakOutlined, DownloadOutlined, InfoOutlined, WarningOutlined } from "@mui/icons-material"
import { moorhen } from "../../types/moorhen"
import { convertViewtoPx, findConsecutiveRanges, getMultiColourRuleArgs, hslToHex, readTextFile } from "../../utils/utils"
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect"
import { addMolecule, hideMolecule, showMolecule } from "../../store/moleculesSlice"
import { MoorhenColourRule } from "../../utils/MoorhenColourRule"
import { hideModal } from "../../store/modalsSlice"
import { modalKeys } from "../../utils/enums"
import { 
    setBFactorThreshold, setClusteringType, setMoleculeBfactors, setMoleculeMaxBfactor,
    setMoleculeMinBfactor, setNClusters, setPaeFileIsUploaded, setSlicingResults, setThresholdType
 } from "../../store/sliceNDiceSlice"
import { MoorhenDraggableModalBase } from "./MoorhenDraggableModalBase"
import { moorhenGlobalInstance } from "../../InstanceManager/MoorhenGlobalInstance"

const deleteHiddenResidues = async (molecule: moorhen.Molecule) => {
    if (molecule.excludedSelections.length > 0) {
        await molecule.deleteCid(molecule.excludedSelections.join('||'), false)
        await molecule.unhideAll(false)
    }
}

const MoorhenSliceNDiceCard = (props: {
    fragmentMolecule: moorhen.Molecule;
    label: string;
}) => {

    const [minFragmentSize, setMinFragmentSize] = useState<number>(1)

    const sizeThresholdRef = useRef<number>(1)
    const isBusy = useRef<boolean>(false)
    const isDirty = useRef<boolean>(false)

    const [residueMap, maxFragmentSize, themeColor] = useMemo(() => {
        const residueMap: {[chainID: string]: { size: number; cid: string; }[]} = {}
        props.fragmentMolecule.sequences.forEach(sequence => {
            const currentChainId = sequence.chain
            residueMap[currentChainId] = []
            const residueRanges = findConsecutiveRanges(sequence.sequence.map(residue => residue.resNum))
            residueMap[currentChainId] = residueRanges.map(range => {
                return {
                    size: range[1] - range[0] + 1,
                    cid: `//${currentChainId}/${range[0]}-${range[1]}`    
                }
            })
        })
        const maxFragmentSize = Math.max(...Object.keys(residueMap).map(chainId => {
            return Math.max(...residueMap[chainId].map(fragment => fragment.size))
        }))
        const themeColor = props.fragmentMolecule.defaultColourRules[0]?.color
        return [residueMap, maxFragmentSize, themeColor]
    }, [props.fragmentMolecule])

    const hideSmallFragments = useCallback(async () => {
        if (isDirty.current) {
            isBusy.current = true
            isDirty.current = false
            const toHideFragments = []
            for (const chainId in residueMap) {
                toHideFragments.push(...residueMap[chainId].filter(fragment => fragment.size < sizeThresholdRef.current))
            }
            if (toHideFragments.length > 0) {
                await props.fragmentMolecule.unhideAll(false)
                await props.fragmentMolecule.hideCid(toHideFragments.map(fragment => fragment.cid).join('||'))
            } else {
                await props.fragmentMolecule.unhideAll()                
            }
            isBusy.current = false
            hideSmallFragments()
        }
    }, [residueMap])

    const handleDownload = async () => {
        await deleteHiddenResidues(props.fragmentMolecule)
        await props.fragmentMolecule.downloadAtoms(props.fragmentMolecule.coordsFormat, props.fragmentMolecule.name.replace(" #", "_"))
    }

    return <Card style={{marginTop: '0.5rem'}}>
        <Card.Body style={{padding:'0.5rem'}}>
            <Row style={{display:'flex', justifyContent:'between'}}>
                <Col style={{alignItems:'center', justifyContent:'left', display:'flex'}}>
                    <span>
                        {props.label}
                    </span>
                </Col>
                <Col className='col-4' style={{margin: '0', padding:'0', justifyContent: 'right', display:'flex', alignItems: 'center'}}>
                <Slider
                    aria-label="Min. fragment size"
                    getAriaValueText={(newVal: number) => `Min. size ${newVal} res.`}
                    valueLabelFormat={(newVal: number) => `Min. size ${newVal} res.`}
                    valueLabelDisplay="auto"
                    value={minFragmentSize}
                    onChange={(evt: any, newVal: number) => {
                        setMinFragmentSize(newVal)
                        sizeThresholdRef.current = newVal
                        isDirty.current = true
                        if (!isBusy.current) {
                            hideSmallFragments()
                        }
                    }}
                    defaultValue={1}
                    min={1}
                    max={20}
                    style={{color: themeColor}}
                />
                <Tooltip title="View">
                    <IconButton style={{marginRight:'0.5rem', color: themeColor}} onClick={() => props.fragmentMolecule.centreOn('/*/*/*/*', true, true)}>
                        <CenterFocusWeakOutlined/>
                    </IconButton>
                </Tooltip>
                <Tooltip title="Download">
                    <IconButton style={{marginRight:'0.5rem', color: themeColor}} onClick={handleDownload}>
                        <DownloadOutlined/>
                    </IconButton>
                </Tooltip>
                </Col>
            </Row>
        </Card.Body>
    </Card>
}

export const MoorhenSliceNDiceModal = () => {
    
    const paeFileContentsRef = useRef<null | string>(null)
    const paeFileUploadFormRef = useRef<null | HTMLInputElement>(null)
    const paeFileSelectFormRef = useRef<null | HTMLSelectElement>(null)
    const clusteringTypeSelectRef = useRef<null | HTMLSelectElement>(null)
    const moleculeSelectRef = useRef<null | HTMLSelectElement>(null)
    const nClustersRef = useRef<number>(2)
    const bFactorThresholdRef = useRef<number>(70)
    const selectedMoleculeCopyRef = useRef<moorhen.Molecule>(null)
    const prevSelectedMoleculeRef = useRef<moorhen.Molecule>(null)
    const isBusy = useRef<boolean>(false)
    const isDirty = useRef<boolean>(false)
    const thresholdTypeRef = useRef<string>('af2-plddt')

    const [selectedMolNo, setSelectedMolNo] = useState<number>(null)
    const [busy, setBusy] = useState<boolean>(false)
    const [showError, setShowError] = useState<boolean>(false)

    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)
    const width = useSelector((state: moorhen.State) => state.sceneSettings.width)
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)
    const paeFileIsUploaded = useSelector((state: moorhen.State) => state.sliceNDice.paeFileIsUploaded)
    const thresholdType = useSelector((state: moorhen.State) => state.sliceNDice.thresholdType)
    const moleculeBfactors = useSelector((state: moorhen.State) => state.sliceNDice.moleculeBfactors)
    const moleculeMinBfactor = useSelector((state: moorhen.State) => state.sliceNDice.moleculeMinBfactor)
    const moleculeMaxBfactor = useSelector((state: moorhen.State) => state.sliceNDice.moleculeMaxBfactor)
    const bFactorThreshold = useSelector((state: moorhen.State) => state.sliceNDice.bFactorThreshold)
    const nClusters = useSelector((state: moorhen.State) => state.sliceNDice.nClusters)
    const clusteringType = useSelector((state: moorhen.State) => state.sliceNDice.clusteringType)
    const slicingResults = useSelector((state: moorhen.State) => state.sliceNDice.slicingResults)
    // This is messy but it is how we pre-load input for slice-n-dice... Needed for CCP4 Cloud...
    const paeFileContents = useSelector((state: moorhen.State) => state.sliceNDice.paeFileContents)
    const disableFileUploads = useSelector((state: moorhen.State) => state.setup.disableFileUpload)

    const commandCentre = moorhenGlobalInstance.getCommandCentreRef()

    const dispatch = useDispatch()

    const setColourRule = useCallback(async (molecule: moorhen.Molecule, colourRuleType: string) => {
        const newColourRule = new MoorhenColourRule(
            colourRuleType, "/*/*/*/*", "#ffffff", commandCentre, true
        )
        newColourRule.setLabel(colourRuleType ===  'af2-plddt' ? "PLDDT" : "B-Factor")
        const ruleArgs = await getMultiColourRuleArgs(molecule, colourRuleType)
        newColourRule.setArgs([ ruleArgs ])
        newColourRule.setParentMolecule(molecule)
        molecule.defaultColourRules = [ newColourRule ]
        return newColourRule
    }, [commandCentre])

    useEffect(() => {
        const selectedMolecule = molecules.find(molecule => molecule.molNo === parseInt(moleculeSelectRef.current?.value))
        if (selectedMoleculeCopyRef.current?.molNo !== undefined && thresholdType && selectedMolecule) {
            setColourRule(selectedMoleculeCopyRef.current, thresholdType)
        }
    }, [thresholdType])

    useEffect(() => {
        const copyMolecule = async (molecule: moorhen.Molecule) => {
            prevSelectedMoleculeRef.current = molecule
            selectedMoleculeCopyRef.current = await molecule.copyFragmentUsingCid('//', false)
            selectedMoleculeCopyRef.current.name = molecule.name
            selectedMoleculeCopyRef.current.setAtomsDirty(true)
            await selectedMoleculeCopyRef.current.updateAtoms()
            await setColourRule(selectedMoleculeCopyRef.current, thresholdTypeRef.current)
            dispatch(hideMolecule(molecule))
        }

        const selectedMolecule = molecules.find(molecule => molecule.molNo === parseInt(moleculeSelectRef.current?.value))
        if (selectedMolecule) {
            const bFactors = selectedMolecule.getResidueBFactors()
            const max = parseFloat(Math.max(...bFactors.map(residue => residue.bFactor)).toFixed(1))
            const min = parseFloat(Math.min(...bFactors.map(residue => residue.bFactor)).toFixed(1))
            dispatch(setMoleculeBfactors( bFactors ))
            dispatch(setMoleculeMaxBfactor( max ))
            dispatch(setMoleculeMinBfactor( min ))
            dispatch(setBFactorThreshold( thresholdTypeRef.current === 'b-factor-norm' ? max : 70 ))
            bFactorThresholdRef.current = thresholdTypeRef.current === 'b-factor-norm' ? max : 70
            if (selectedMoleculeCopyRef.current === null) {
                // This here is necessary because React mounts components twice in strict mode and served in dev server
                // @ts-ignore
                selectedMoleculeCopyRef.current = 1
                copyMolecule(selectedMolecule).then(_ => {
                    isDirty.current = true
                    trimBfactorThreshold(bFactors)
                }).catch((err) => console.error(err))
            } else if (typeof selectedMoleculeCopyRef.current === 'object') {
                selectedMoleculeCopyRef.current.hide('CRs', '/*/*/*/*')
                if (prevSelectedMoleculeRef.current) dispatch(showMolecule(prevSelectedMoleculeRef.current))
                selectedMoleculeCopyRef.current.delete()
                .then(_ => {
                    if (slicingResults && slicingResults.length > 0) {
                        return Promise.all(
                            slicingResults.map(sliceMolecule => sliceMolecule.delete())
                        )
                    }
                }).then(_ => {
                    if (slicingResults && slicingResults.length > 0 ) dispatch(setSlicingResults(null))
                    return copyMolecule(selectedMolecule)
                })
                .then(_ => {
                    isDirty.current = true
                    trimBfactorThreshold(bFactors)
                })
                .catch((err) => console.error(err))
            }
        }
    }, [selectedMolNo])

    const trimBfactorThreshold = useCallback(async (bFactors?: { cid: string; bFactor: number; normalised_bFactor: number; }[]) => {
        if (isDirty.current) {
            isBusy.current = true
            isDirty.current = false
            if (slicingResults?.length > 0) {
                await Promise.all( slicingResults.map(sliceMolecule => sliceMolecule.delete()) )
                dispatch(setSlicingResults(null))
            }
            if (typeof selectedMoleculeCopyRef.current === 'object') {
                let cidsToHide: string[]
                if (thresholdTypeRef.current === 'b-factor-norm') {
                    cidsToHide = (bFactors ?? moleculeBfactors).filter(residue => residue.bFactor > bFactorThresholdRef.current).map(residue => residue.cid)
                } else {
                    cidsToHide = (bFactors ?? moleculeBfactors).filter(residue => residue.bFactor < bFactorThresholdRef.current).map(residue => residue.cid)
                }
                if (cidsToHide?.length > 0) {
                    await selectedMoleculeCopyRef.current.unhideAll(false)
                    await selectedMoleculeCopyRef.current.hideCid(cidsToHide.join('||'), true)
                    await selectedMoleculeCopyRef.current.show('CRs', '/*/*/*/*')
                } else {
                    await selectedMoleculeCopyRef.current.unhideAll(true)
                    await selectedMoleculeCopyRef.current.show('CRs', '/*/*/*/*')
                }
            }
            isBusy.current = false
            trimBfactorThreshold(bFactors)
        }
    }, [slicingResults, moleculeBfactors])

    const doSlice = useCallback(async () => {
        if (!moleculeSelectRef.current.value || (clusteringTypeSelectRef.current.value === 'pae' && !paeFileContentsRef.current)) {
            return
        }

        let selectedMolecule = molecules.find(molecule => molecule.molNo === parseInt(moleculeSelectRef.current.value))
        if (!selectedMolecule) {
            return
        }

        setBusy(true)

        let deleteSelectedMoleculeOnExit = false
        if (selectedMoleculeCopyRef.current?.excludedSelections?.length > 0 && clusteringTypeSelectRef.current.value !== 'pae') {
            deleteSelectedMoleculeOnExit = true
            selectedMolecule = await selectedMolecule.copyFragmentUsingCid('//', false)
            selectedMolecule.excludedSelections = selectedMoleculeCopyRef.current.excludedSelections
            selectedMolecule.excludedCids = selectedMoleculeCopyRef.current.excludedCids
            deleteHiddenResidues(selectedMolecule)
        }

        if (slicingResults?.length > 0) {
            await Promise.all(
                slicingResults.map(sliceMolecule => sliceMolecule.delete())
            )
        }

        let commandArgs: (string | number)[]
        switch (clusteringTypeSelectRef.current.value) {
            case "kmeans":
            case "agglomerative":
            case "birch":
            case "pae":
                commandArgs = [ selectedMolecule.molNo, nClustersRef.current, clusteringTypeSelectRef.current.value, paeFileContentsRef.current ? paeFileContentsRef.current : ""]
                break
            default:
                console.warn(`Unkown clustering algorithm ${clusteringTypeSelectRef.current}`)
                break
        }
        
        if (!commandArgs) {
            setBusy(false)
            dispatch(setSlicingResults(null))
            return
        }

        const result = await commandCentre.current.cootCommand({
            command: 'slicendice_slice',
            commandArgs: commandArgs,
            returnType: 'vector_pair_string_int'
        }, false)

        if (result.data.result.status === 'Exception') {
            console.warn(result.data.consoleMessage)
            setBusy(false)
            dispatch(setSlicingResults(null))
            setTimeout(() => setShowError(true), 500)
            setTimeout(() => setShowError(false), 3000)
            return
        }

        selectedMoleculeCopyRef.current?.hide?.('CRs', '/*/*/*/*')

        const slices = [...new Set(result.data.result.result.filter(item => item.slice !== -1).map(item => item.slice))]
        const newMolecules = await Promise.all(slices.map(async(slice: number, index: number) => {
            const residueCids = result.data.result.result.filter(item => item.slice === slice).map(item => item.residue).join("||")
            const newMolecule = await selectedMolecule.copyFragmentUsingCid(residueCids, false)
            newMolecule.name = `Slice #${slice + 1}`
            const colorHue = Math.floor((index * 40) + Math.floor(Math.random() * 6))
            const selectedColour = isDark ? hslToHex(colorHue, 80, 70) : hslToHex(colorHue, 50, 50)
            const newColourRule = new MoorhenColourRule(
                'cid', "/*/*/*/*", selectedColour, commandCentre
            )
            newColourRule.setArgs(["/*/*/*/*", selectedColour])
            newColourRule.setParentMolecule(newMolecule)
            newMolecule.defaultColourRules = [ newColourRule ]
            newMolecule.setAtomsDirty(true)
            if (clusteringTypeSelectRef.current.value === 'pae') {
                await newMolecule.updateAtoms()
                const bFactors = newMolecule.getResidueBFactors()
                let cidsToDelete: string[]
                if (thresholdTypeRef.current === 'b-factor-norm') {
                    cidsToDelete = bFactors.filter(residue => residue.bFactor > bFactorThresholdRef.current).map(residue => residue.cid)
                } else {
                    cidsToDelete = bFactors.filter(residue => residue.bFactor < bFactorThresholdRef.current).map(residue => residue.cid)
                }
                if (cidsToDelete?.length > 0) {
                    const result = await newMolecule.deleteCid(cidsToDelete.join('||'), false)
                    if (result.second < 1) {
                        await newMolecule.delete()
                        return
                    }
                    newMolecule.setAtomsDirty(true)
                } 
            }
            await newMolecule.fetchIfDirtyAndDraw('CRs')
            return newMolecule
        }))

        if (deleteSelectedMoleculeOnExit) {
            await selectedMolecule.delete()
        }

        dispatch(setSlicingResults(
            newMolecules.filter(molecule => molecule !== undefined).sort( (a, b) => {  return parseInt(a.name.replace('Slice #', '')) - parseInt(b.name.replace('Slice #', ''))  })
        ))
        setBusy(false)
    }, [molecules, slicingResults, isDark])

    const handleClose = useCallback(async (saveToMoorhen: boolean = false) => {
        if (slicingResults?.length > 0) {
            if (saveToMoorhen) {
                const sortedMolecules = [...slicingResults].sort((a, b) => { return  b.molNo - a.molNo })
                for (const sliceMolecule of sortedMolecules) {
                    sliceMolecule.isMRSearchModel = true
                    await deleteHiddenResidues(sliceMolecule)
                    dispatch( addMolecule(sliceMolecule) )
                }
            } else {
                await Promise.all(
                    slicingResults.map(sliceMolecule => sliceMolecule.delete())
                )
            }
        } else if (selectedMoleculeCopyRef.current && saveToMoorhen) {
            await deleteHiddenResidues(selectedMoleculeCopyRef.current)
            const newMolecule = await selectedMoleculeCopyRef.current.copyMolecule()
            dispatch(addMolecule(newMolecule))
        }
        
        await selectedMoleculeCopyRef.current?.delete?.()
        
        if (!saveToMoorhen) {
            const selectedMolecule = molecules.find(molecule => molecule.molNo === parseInt(moleculeSelectRef.current.value))
            if (selectedMolecule) {
                dispatch( showMolecule(selectedMolecule) )
            }
        }

        await commandCentre.current.cootCommand({
            command: 'end_delete_closed_molecules',
            commandArgs: [ ],
            returnType: 'void'
        }, false)
        dispatch( hideModal(modalKeys.SLICE_N_DICE) )
    }, [slicingResults, molecules])

    const handleDownload = useCallback(async (mergeSlices: boolean = false) => {
        if (slicingResults?.length > 0) {
            await Promise.all(slicingResults.map(fragmentMolecule => {
                return deleteHiddenResidues(fragmentMolecule)
            }))
            if (mergeSlices) {
                const moleculeCopy = await slicingResults[0].copyMolecule(false)
                await commandCentre.current.cootCommand({
                    command: 'merge_molecules',
                    commandArgs: [moleculeCopy.molNo, slicingResults.map(sliceMolecule => sliceMolecule.molNo).slice(1).join(':')],
                    returnType: "merge_molecules_return",    
                })
                moleculeCopy.name = 'slices'
                await moleculeCopy.downloadAtoms()
                await moleculeCopy.delete(true)
            } else {
                await Promise.all(
                    slicingResults.map(sliceMolecule => sliceMolecule.downloadAtoms(sliceMolecule.coordsFormat, sliceMolecule.name.replace(" #", "_")))
                )
            }
        }
    }, [slicingResults])

    const handlePaeFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.length > 0) {            
            const fileContents = await readTextFile(e.target.files[0]) as string
            if (fileContents.length > 0) {
                paeFileContentsRef.current = fileContents
                dispatch(setPaeFileIsUploaded(true))
            } else {
                paeFileContentsRef.current = null
                dispatch(setPaeFileIsUploaded(false))
            }
        }
    }

    const handleClusteringTypeChange = useCallback((evt) => {
        if (evt.target.value === 'pae') {
            paeFileContentsRef.current = paeFileContents.length > 0 ? paeFileContents[0].fileContents : null
            dispatch(setPaeFileIsUploaded(paeFileContents.length > 0))
        }
        clusteringTypeSelectRef.current.value = evt.target.value
        dispatch(setClusteringType(evt.target.value))
    }, [paeFileContents])

    const bodyContent = <Stack direction="vertical" gap={1}>
        <Stack direction="horizontal" gap={1} style={{display: 'flex', width: '100%'}}>
            <MoorhenMoleculeSelect width="100%" molecules={molecules} allowAny={false} ref={moleculeSelectRef} onChange={(evt) => setSelectedMolNo(parseInt(evt.target.value))}/>
            <Form.Group style={{ margin: '0.5rem', width: '100%' }}>
                <Form.Label>Clustering algorithm...</Form.Label>
                <FormSelect size="sm" ref={clusteringTypeSelectRef} defaultValue={'birch'} onChange={handleClusteringTypeChange}>
                    <option value={'birch'} key={'birch'}>Birch</option>
                    <option value={'kmeans'} key={'kmeans'}>K-Means</option>
                    <option value={'agglomerative'} key={'agglomerative'}>Agglomerative</option>
                    <option value={'pae'} key={'pae'}>PAE</option>
                </FormSelect>
            </Form.Group>
        </Stack>
        <Stack direction="horizontal" gap={1} style={{display: 'flex', width: '100%'}}>
        <div style={{ margin: "0.5rem", padding: '0.2rem',  width: '100%'}}>
                <Stack direction="horizontal" gap={2} style={{ justifyContent: 'center'}}>
                    <Form.Check
                        style={{margin: 0}} 
                        type="radio"
                        checked={thresholdType === 'af2-plddt'}
                        onChange={() => { 
                            dispatch(setThresholdType('af2-plddt'))
                            thresholdTypeRef.current = 'af2-plddt'
                            dispatch(setBFactorThreshold(70))
                            bFactorThresholdRef.current = 70    
                            isDirty.current = true
                            if (!isBusy.current) {
                                trimBfactorThreshold()
                            }
                        }}
                        label="PLDDT"/>
                    <Form.Check
                        style={{margin: 0}} 
                        type="radio"
                        checked={thresholdType === 'b-factor-norm'}
                        onChange={() => {
                            dispatch(setThresholdType('b-factor-norm'))
                            thresholdTypeRef.current = 'b-factor-norm'
                            dispatch(setBFactorThreshold(moleculeMaxBfactor))
                            bFactorThresholdRef.current = moleculeMaxBfactor    
                            isDirty.current = true
                            if (!isBusy.current) {
                                trimBfactorThreshold()
                            }    
                        }}
                        label="B-Factor"/>
                </Stack>
                <Slider
                    aria-label="B-Factor threshold"
                    getAriaValueText={(newVal: number) => `${newVal} ${thresholdType === 'b-factor-norm' ? "Å^2" : "PLDDT"}`}
                    valueLabelFormat={(newVal: number) => thresholdType === 'b-factor-norm' ? <span>{"≤ "}{newVal}</span> : <span>≥ {newVal}</span>}
                    valueLabelDisplay="on"
                    value={bFactorThreshold}
                    onChange={(evt: any, newVal: number) => {
                        dispatch(setBFactorThreshold(newVal))
                        bFactorThresholdRef.current = newVal
                        isDirty.current = true
                        if (!isBusy.current) {
                            trimBfactorThreshold()
                        }
                    }}
                    defaultValue={moleculeMinBfactor ? moleculeMinBfactor : 1}
                    min={moleculeMinBfactor ? moleculeMinBfactor : 1}
                    max={moleculeMaxBfactor ? moleculeMaxBfactor : 1}
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
            { ['kmeans', 'agglomerative', 'birch', 'pae'].includes(clusteringType) && 
            <div style={{ margin: "0.5rem", padding: '0.1rem', width: '100%'}}>
                <span>Number of slices</span>
                <Slider
                    aria-label="No. of clusters"
                    getAriaValueText={(newVal: number) => `${newVal}`}
                    valueLabelFormat={(newVal: number) => `${newVal}`}
                    valueLabelDisplay="on"
                    value={nClusters}
                    onChange={(evt: any, newVal: number) => {
                        nClustersRef.current = newVal
                        dispatch(setNClusters(newVal))
                    }}
                    marks={true}
                    defaultValue={5}
                    step={1}
                    min={1}
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
            </div>}
        </Stack>
        {clusteringType === 'pae' && 
            <Form.Group style={{ margin: '0.5rem', padding: '0.2rem' }} controlId="uploadPAE">
                <Form.Label>Upload PAE file</Form.Label>
                <Tooltip title='Predicted Aligned Error (PAE) .json file' placement="top">
                    <InfoOutlined style={{marginLeft: '0.1rem', marginBottom: '0.2rem', width: '15px', height: '15px'}}/>
                </Tooltip>
                {disableFileUploads ?
                <FormSelect size="sm" ref={paeFileSelectFormRef} onChange={(evt) => {
                    if (evt.target.value) {
                        paeFileContentsRef.current = evt.target.value
                        dispatch(setPaeFileIsUploaded(true))
                    }            
                }}>
                    {paeFileContents.map(item => {
                        return <option key={item.fileName} value={item.fileContents}>{item.fileName}</option>
                    })}
                </FormSelect>
                :
                <Form.Control ref={paeFileUploadFormRef} type="file" multiple={false} accept=".json" onChange={(e: React.ChangeEvent<HTMLInputElement>) => {handlePaeFileUpload(e)}} />
                }
            </Form.Group>    
        }
        <hr></hr>
        <Row>
            {slicingResults?.length > 0 ? <span>Found {slicingResults.length} possible slice(s)</span> : null}
            {slicingResults?.length > 0 ? <div style={{height: '100px', width: '100%'}}>{slicingResults?.map(fragmentMolecule => {
                return <MoorhenSliceNDiceCard
                            key={fragmentMolecule.molNo}
                            fragmentMolecule={fragmentMolecule}
                            label={fragmentMolecule.name}/>
            })}</div> : <span>No results...</span>}
        </Row>
    </Stack>

    const footerContent = <Stack gap={2} direction='horizontal' style={{paddingTop: '0.5rem', alignItems: 'space-between', alignContent: 'space-between', justifyContent: 'space-between', width: '100%' }}>
        <Stack gap={2} direction='horizontal' style={{ alignItems: 'center', alignContent: 'center', justifyContent: 'center' }}>
            <SplitButton id='download-slice-n-dice' variant="primary" title="Download all" onClick={() => handleDownload()}>
                <Dropdown.Item eventKey="1" onClick={() => handleDownload()}>As individual files</Dropdown.Item>
                <Dropdown.Item eventKey="2" onClick={() => handleDownload(true)}>As a single file</Dropdown.Item>
            </SplitButton>
        </Stack>
        <Stack gap={2} direction='horizontal' style={{ alignItems: 'center', alignContent: 'center', justifyContent: 'center' }}>
            <Button variant='primary' onClick={doSlice} disabled={clusteringType === 'pae' && !paeFileIsUploaded}>
                Slice
            </Button>
            <SplitButton id='download-slice-n-dice' variant="info" title="Save & Close" onClick={() => handleClose(true)}>
            <Dropdown.Item eventKey="1" onClick={() => handleClose(true)}>Close and save changes to Moorhen</Dropdown.Item>
                <Dropdown.Item eventKey="2" onClick={() => handleClose()}>Close without saving</Dropdown.Item>
            </SplitButton>
        </Stack>
    </Stack>

    const spinnerContent =  <Backdrop sx={{ display: 'flex', flexDirection: busy ? 'row' : 'column', color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }} open={busy || showError}>
                            {busy ?
                            <>
                                <Spinner animation="border" style={{ marginRight: '0.5rem' }}/>
                                <span>Slicing...</span>
                            </>
                            : showError ? 
                            <>
                                <WarningOutlined style={{width: '35px', height: '35px'}}/>
                                <span>Something went wrong...</span>
                            </>
                            : null
                            } 
                            </Backdrop>

    const header = <Stack direction="horizontal" gap={1}>
                        <span>
                            Slice-n-Dice
                        </span>
                        <Tooltip title="This pluggin uses Slice-N-Dice, a software for slicing models into distinct structural units. Preprint Simpkin, A. et al. (2022) available at bioRxiv." key={1}>
                            <Button variant='white' style={{margin: '0.1rem', padding: '0.1rem'}} onClick={() => window.open('https://doi.org/10.1101/2022.06.30.497974')}>
                                <InfoOutlined/>
                            </Button>
                        </Tooltip>
                    </Stack>

    return <MoorhenDraggableModalBase
                modalId={modalKeys.SLICE_N_DICE}
                left={width / 6}
                top={height / 6}
                minHeight={convertViewtoPx(15, height)}
                minWidth={convertViewtoPx(33, width)}
                maxHeight={convertViewtoPx(50, height)}
                maxWidth={convertViewtoPx(50, width)}
                additionalChildren={spinnerContent}
                headerTitle={header}
                footer={footerContent}
                body={bodyContent}
                onClose={handleClose}
            />
}
