import { IconButton, Popover, Tooltip } from "@mui/material"
import { atomInfoToResSpec, cidToSpec, getAtomInfoLabel, guid } from "../../utils/MoorhenUtils"
import { MoorhenNotification } from "./MoorhenNotification"
import { AdsClickOutlined, AllOutOutlined, CloseOutlined, CopyAllOutlined, CrisisAlertOutlined, DeleteOutlined, EditOutlined, FormatColorFillOutlined, Rotate90DegreesCw, SwapVertOutlined, SwipeRightAlt } from "@mui/icons-material"
import { batch, useDispatch, useSelector } from "react-redux"
import { moorhen } from "../../types/moorhen"
import { Button, Stack } from "react-bootstrap"
import { clearResidueSelection, setIsDraggingAtoms, setIsRotatingAtoms, setNotificationContent, setResidueSelection, setShowResidueSelection } from '../../store/generalStatesSlice';
import { useCallback, useEffect, useRef, useState } from "react"
import { addMolecule, removeMolecule, setHoveredAtom } from "../../moorhen"
import { HexColorInput, HexColorPicker } from "react-colorful"
import { MoorhenCidInputForm } from "../form/MoorhenCidInputForm"
import { MoorhenAcceptRejectRotateTranslate } from "./MoorhenAcceptRejectRotateTranslate"
import { MoorhenAcceptRejectDragAtoms } from "./MoorhenAcceptRejectDragAtoms"
import { triggerUpdate } from "../../store/moleculeMapUpdateSlice"

export const MoorhenResidueSelectionActions = (props) => {

    const notificationKeyRef = useRef<string>(guid())
    const notificationComponentRef = useRef()
    const changeColourAnchorRef = useRef()
    const cidAnchorRef = useRef()
    const cidFormRef = useRef()

    const [cidFormValue, setCidFormValue] = useState<null | string>(null)
    const [showCidEditForm, setShowCidEditForm] = useState<boolean>(false)
    const [invalidCid, setInvalidCid] = useState<boolean>(false)
    const [showColourPopover, setShowColourPopover] = useState<boolean>(false)
    const [tooltipContents, setTooltipContents] = useState<null | string>(null)
    const [selectedColour, setSelectedColour] = useState<string>('#808080')

    const dispatch = useDispatch()
    const showResidueSelection = useSelector((state: moorhen.State) => state.generalStates.showResidueSelection)
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)
    const isChangingRotamers = useSelector((state: moorhen.State) => state.generalStates.isChangingRotamers)
    const isRotatingAtoms = useSelector((state: moorhen.State) => state.generalStates.isRotatingAtoms)
    const isDraggingAtoms = useSelector((state: moorhen.State) => state.generalStates.isDraggingAtoms)
    const residueSelection = useSelector((state: moorhen.State) => state.generalStates.residueSelection)
    const activeMap = useSelector((state: moorhen.State) => state.generalStates.activeMap)
    const animateRefine = useSelector((state: moorhen.State) => state.miscAppSettings.animateRefine)

    const clearSelection = useCallback(() => {
        dispatch( setShowResidueSelection(false) )
        dispatch( setNotificationContent(null) )
        setCidFormValue(null)
        setShowCidEditForm(false)
        setShowColourPopover(false)
        setInvalidCid(false)
        molecules.forEach(molecule => molecule.clearBuffersOfStyle('residueSelection'))
    }, [molecules])

    useEffect(() => {
        if (Object.keys(residueSelection).every(key => !residueSelection[key])) {
            clearSelection()
        }
    }, [residueSelection, clearSelection])

    const handleAtomClicked = useCallback(async (evt: moorhen.AtomClickedEvent) => {
        if (!evt.detail.isResidueSelection || evt.detail.buffer.id == null || isDraggingAtoms || isRotatingAtoms || isChangingRotamers) {
            return
        } 

        const selectedMolecule = molecules.find(molecule => molecule.buffersInclude(evt.detail.buffer))
        if (!selectedMolecule) {
            dispatch( clearResidueSelection() )
            return
        }
        
        if (residueSelection.first === null || residueSelection.molecule === null || residueSelection.molecule.molNo !== selectedMolecule.molNo) {
            const resSpec = atomInfoToResSpec(evt.detail.atom)
            await selectedMolecule.drawResidueSelection(`/*/${resSpec.chain_id}/${resSpec.res_no}-${resSpec.res_no}/*`)
            dispatch(
                setResidueSelection({
                    molecule: selectedMolecule,
                    first: resSpec.cid,
                    second: null,
                    cid: null,
                    isMultiCid: false,
                    label: `/${resSpec.mol_no}/${resSpec.chain_id}/${resSpec.res_no}`
                })
            )
            dispatch( setShowResidueSelection(true) )
            return
        }

        const startResSpec = cidToSpec(residueSelection.first)
        const stopResSpec = atomInfoToResSpec(evt.detail.atom)
        if (startResSpec.chain_id !== stopResSpec.chain_id) {
            dispatch( clearResidueSelection() )
        } else {
            const sortedResNums = [startResSpec.res_no, stopResSpec.res_no].sort(function(a, b){return a - b})
            const cid = `/*/${startResSpec.chain_id}/${sortedResNums[0]}-${sortedResNums[1]}/*`
            await selectedMolecule.drawResidueSelection(cid)
            dispatch(
                setResidueSelection({
                    molecule: selectedMolecule,
                    first: residueSelection.first,
                    second: stopResSpec.cid,
                    cid: cid,
                    isMultiCid: false,
                    label: `/${startResSpec.mol_no}/${startResSpec.chain_id}/${sortedResNums[0]}-${sortedResNums[1]}`
                })
            )
            dispatch( setShowResidueSelection(true) )
        }
    }, [residueSelection, isRotatingAtoms, isChangingRotamers, isDraggingAtoms])

    useEffect(() => {
        document.addEventListener('atomClicked', handleAtomClicked)
        return () => {
            document.removeEventListener('atomClicked', handleAtomClicked)
        }
    }, [handleAtomClicked])

    const handleResidueCidChange =  useCallback(async () => {
        if(!cidFormValue) {
            console.warn('No cid input, doing nothing...')
            return
        }

        if (!residueSelection.molecule) {
            console.warn('Need to create valid selection before editing the CID, doing nothing...')
            return
        }
        
        try { 
            const newSelection = await residueSelection.molecule.parseCidIntoSelection(cidFormValue)
            if (!newSelection) {
                throw new Error(`Specified CID resulted in no residue selection: ${cidFormValue}`)
            }

            await residueSelection.molecule.drawResidueSelection(cidFormValue)
            dispatch( setResidueSelection(newSelection) )
            setCidFormValue(null)
            setShowCidEditForm(false)
            setInvalidCid(false)
            dispatch( setShowResidueSelection(true) )
        } catch (err) {
            console.warn(err)
            console.warn('Error parsing the cid...')
            setInvalidCid(true)
        }

    }, [residueSelection, cidFormValue])

    const handleSelectionCopy = useCallback(async () => {
        let cid: string
        
        if (residueSelection.isMultiCid && Array.isArray(residueSelection.cid)) {
            cid = residueSelection.cid.join('||')
        } else if (residueSelection.molecule && residueSelection.cid) {
            cid = residueSelection.cid as string
        } else if (residueSelection.molecule && residueSelection.first) {
            const startResSpec = cidToSpec(residueSelection.first)
            cid =`/${startResSpec.mol_no}/${startResSpec.chain_id}/${startResSpec.res_no}-${startResSpec.res_no}`
        }

        if (cid) {
            const newMolecule = await residueSelection.molecule.copyFragmentUsingCid(cid, true)
            dispatch( addMolecule(newMolecule) )
        }
        
        dispatch( clearResidueSelection() )
    }, [residueSelection])

    const handleRefinement = useCallback(async () => {
        molecules.forEach(molecule => molecule.clearBuffersOfStyle('residueSelection'))
        if (residueSelection.isMultiCid && Array.isArray(residueSelection.cid)) {
            if (animateRefine) {
                await residueSelection.molecule.refineResiduesUsingAtomCidAnimated(residueSelection.cid.join('||'), activeMap, -1)
            } else {
                await residueSelection.molecule.refineResiduesUsingAtomCid(residueSelection.cid.join('||'), 'LITERAL')
            }
        } else if (residueSelection.molecule && residueSelection.cid) {
            const startResSpec = cidToSpec(residueSelection.first)
            const stopResSpec = cidToSpec(residueSelection.second)
            const sortedResNums = [startResSpec.res_no, stopResSpec.res_no].sort(function(a, b){return a - b})
            if (animateRefine) {
                await residueSelection.molecule.refineResiduesUsingAtomCidAnimated(`/${startResSpec.mol_no}/${startResSpec.chain_id}/${sortedResNums[0]}-${sortedResNums[1]}`, activeMap, -1)
            } else {
                await residueSelection.molecule.refineResidueRange(startResSpec.chain_id, sortedResNums[0], sortedResNums[1], 5000, true)
            }
        } else if (residueSelection.molecule && residueSelection.first) {
            const startResSpec = cidToSpec(residueSelection.first)
            if (animateRefine) {
                await residueSelection.molecule.refineResiduesUsingAtomCidAnimated(`/${startResSpec.mol_no}/${startResSpec.chain_id}/${startResSpec.res_no}-${startResSpec.res_no}`, activeMap, -1)
            } else {
                await residueSelection.molecule.refineResidueRange(startResSpec.chain_id, startResSpec.res_no, startResSpec.res_no, 5000, true)
            }
        }
        dispatch( triggerUpdate(residueSelection.molecule.molNo) )
        dispatch( clearResidueSelection() )
    }, [residueSelection, animateRefine, activeMap])

    const handleDelete = useCallback(async () => {
        let cid: string
        
        if (residueSelection.isMultiCid && Array.isArray(residueSelection.cid)) {
            cid = residueSelection.cid.join('||')
        } else if (residueSelection.molecule && residueSelection.cid) {
            cid = residueSelection.cid as string
        } else if (residueSelection.molecule && residueSelection.first) {
            const startResSpec = cidToSpec(residueSelection.first)
            cid = `/${startResSpec.mol_no}/${startResSpec.chain_id}/${startResSpec.res_no}-${startResSpec.res_no}`
        }

        if (cid) {
            const result = await residueSelection.molecule.deleteCid(cid, true)
            if (result.second < 1) {
                console.log('Empty molecule detected, deleting it now...')
                await residueSelection.molecule.delete()
                dispatch(removeMolecule(residueSelection.molecule))
            }
            dispatch( triggerUpdate(residueSelection.molecule.molNo) )
        }

        dispatch( clearResidueSelection() )
    }, [residueSelection])

    const handleExpandSelection = useCallback(async () => {
        let cid: string
        let label: string
        
        // FIXME: We want to be able to expand multiCid selections since the user is now able to manually create them...
        if (residueSelection.isMultiCid) {
            // pass
        } else if (residueSelection.molecule && residueSelection.cid) {
            cid = residueSelection.cid as string
            const startResSpec = cidToSpec(residueSelection.first)
            const stopResSpec = cidToSpec(residueSelection.second)
            const sortedResNums = [startResSpec.res_no, stopResSpec.res_no].sort(function(a, b){return a - b})
            label = `/${startResSpec.mol_no}/${startResSpec.chain_id}/${sortedResNums[0]}-${sortedResNums[1]} +7Å`
        } else if (residueSelection.molecule && residueSelection.first) {
            const startResSpec = cidToSpec(residueSelection.first)
            cid = `/${startResSpec.mol_no}/${startResSpec.chain_id}/${startResSpec.res_no}-${startResSpec.res_no}`
            label = `/${startResSpec.mol_no}/${startResSpec.chain_id}/${startResSpec.res_no} +7Å`
        }

        if (cid) {
            const result = await residueSelection.molecule.getNeighborResiduesCids(cid, 7)
            await residueSelection.molecule.drawResidueSelection(result.join('||'))
            dispatch(
                setResidueSelection({
                    molecule: residueSelection.molecule,
                    first: residueSelection.first,
                    second: residueSelection.second,
                    cid: result,
                    isMultiCid: true,
                    label: label
                })
            )
        }
    }, [residueSelection])

    const handleInvertSelection = useCallback(async () => {
        let cid: string
        
        if (residueSelection.isMultiCid && Array.isArray(residueSelection.cid)) {
            cid = residueSelection.cid.join('||')
        } else if (residueSelection.molecule && residueSelection.cid) {
            cid = residueSelection.cid as string
        } else if (residueSelection.molecule && residueSelection.first) {
            const startResSpec = cidToSpec(residueSelection.first)
            cid = `/${startResSpec.mol_no}/${startResSpec.chain_id}/${startResSpec.res_no}-${startResSpec.res_no}`
        }

        if (cid) {
            const result = residueSelection.molecule.getNonSelectedCids(cid)
            const newCid = result.join('||')
            await residueSelection.molecule.drawResidueSelection(newCid)
            dispatch(
                setResidueSelection({
                    molecule: residueSelection.molecule,
                    first: residueSelection.first,
                    second: residueSelection.second,
                    cid: result,
                    isMultiCid: true,
                    label: newCid
                })
            )
        }
    }, [residueSelection])

    const handleColourChange = useCallback(async () => {
        let newColourRules: moorhen.ColourRule[] = []

        if (residueSelection.isMultiCid && Array.isArray(residueSelection.cid)) {
            residueSelection.cid.forEach(cid => newColourRules.push({
                args: [cid, selectedColour],
                isMultiColourRule: false,
                ruleType: 'cid',
                color: selectedColour,
                label: cid,
            }))
        } else if (residueSelection.molecule && residueSelection.cid) {
            newColourRules.push({
                args: [residueSelection.cid as string, selectedColour],
                isMultiColourRule: false,
                ruleType: 'cid',
                color: selectedColour,
                label: residueSelection.cid as string,
            })
        } else if (residueSelection.molecule && residueSelection.first) {
            const startResSpec = cidToSpec(residueSelection.first)
            const cid =`/${startResSpec.mol_no}/${startResSpec.chain_id}/${startResSpec.res_no}-${startResSpec.res_no}`
            newColourRules.push({
                args: [cid as string, selectedColour],
                isMultiColourRule: false,
                ruleType: 'cid',
                color: selectedColour,
                label: cid as string,
            })
        }

        newColourRules.forEach((newColourRule, idx) => {
            residueSelection.molecule.defaultColourRules.push(newColourRule)
            if (idx === newColourRules.length - 1) {
                residueSelection.molecule.redraw()
            }
        })

        setShowColourPopover(false)

    }, [residueSelection, selectedColour])

    const handleRigidBodyFit = useCallback(async () => {
        if (!activeMap) {
            console.warn('Cannot do rigid body fit without an active map...')
            return
        }

        let cid: string
        
        if (residueSelection.isMultiCid && Array.isArray(residueSelection.cid)) {
            cid = residueSelection.cid.join('||')
        } else if (residueSelection.molecule && residueSelection.cid) {
            cid = residueSelection.cid as string
        } else if (residueSelection.molecule && residueSelection.first) {
            const startResSpec = cidToSpec(residueSelection.first)
            cid = `/${startResSpec.mol_no}/${startResSpec.chain_id}/${startResSpec.res_no}-${startResSpec.res_no}`
        }

        if (cid) {
            await residueSelection.molecule.rigidBodyFit(cid, activeMap.molNo, true)
            dispatch( triggerUpdate(residueSelection.molecule.molNo) )
        }

        dispatch( clearResidueSelection() )
    }, [activeMap, residueSelection])

    const handleRotateTranslate = useCallback(async () => {
        let cid: string
        
        if (residueSelection.isMultiCid && Array.isArray(residueSelection.cid)) {
            cid = residueSelection.cid.join('||')
        } else if (residueSelection.molecule && residueSelection.cid) {
            cid = residueSelection.cid as string
        } else if (residueSelection.molecule && residueSelection.first) {
            const startResSpec = cidToSpec(residueSelection.first)
            cid = `/${startResSpec.mol_no}/${startResSpec.chain_id}/${startResSpec.res_no}-${startResSpec.res_no}`
        }

        if (cid) {
            const onExit = () => {
                dispatch( setNotificationContent(null) )
                dispatch( clearResidueSelection() )
            }
            batch(() => {
                molecules.forEach(molecule => molecule.clearBuffersOfStyle('residueSelection'))
                dispatch( clearResidueSelection() )
                dispatch( setHoveredAtom({ molecule: null, cid: null }) )
                dispatch( setIsRotatingAtoms(true) )
                dispatch( setNotificationContent(
                    <MoorhenAcceptRejectRotateTranslate
                        onExit={onExit}
                        cidRef={{current: cid}}
                        glRef={residueSelection.molecule.glRef}
                        moleculeRef={{current: residueSelection.molecule}}/>)
                )
            })
        }

    }, [residueSelection])

    const handleDragAtoms = useCallback(() => {
        let cid: string[]
        
        if (residueSelection.isMultiCid && Array.isArray(residueSelection.cid)) {
            cid = residueSelection.cid
        } else if (residueSelection.molecule && residueSelection.cid) {
            cid = [residueSelection.cid as string]
        } else if (residueSelection.molecule && residueSelection.first) {
            const startResSpec = cidToSpec(residueSelection.first)
            cid = [`/${startResSpec.mol_no}/${startResSpec.chain_id}/${startResSpec.res_no}-${startResSpec.res_no}`]
        }

        if (cid) {
            const onExit = () => {
                dispatch( setNotificationContent(null) )
                dispatch( clearResidueSelection() )
            }
            molecules.forEach(molecule => molecule.clearBuffersOfStyle('residueSelection'))
            batch(() => {
                dispatch( clearResidueSelection() )
                dispatch( setHoveredAtom({ molecule: null, cid: null }) )
                dispatch( setIsDraggingAtoms(true) )
                dispatch( setNotificationContent(
                    <MoorhenAcceptRejectDragAtoms
                        onExit={onExit}
                        commandCentre={residueSelection.molecule.commandCentre}
                        monomerLibraryPath={residueSelection.molecule.monomerLibraryPath}
                        cidRef={{current: cid}}
                        glRef={residueSelection.molecule.glRef}
                        moleculeRef={{current: residueSelection.molecule}}/>)
                )
            })
        }

    }, [residueSelection])

    return showResidueSelection ?
        <MoorhenNotification key={notificationKeyRef.current} width={19}>
            <Tooltip className="moorhen-tooltip" title={tooltipContents} style={{zIndex: 99}}>
            <Stack ref={notificationComponentRef} direction="vertical" gap={1}>
                <Stack gap={0} direction="horizontal" style={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{paddingLeft: '2.2rem', width: '100%', display: 'flex', justifyContent: 'center'}}>{
                        `${residueSelection.label?.length > 16 ? residueSelection.label.substring(0, 12) + '...' : residueSelection.label}`
                    }</span>
                    <IconButton onClick={() => dispatch( clearResidueSelection() )} onMouseEnter={() => setTooltipContents('Clear selection')} style={{padding: 0}}>
                        <CloseOutlined/>
                    </IconButton>
                </Stack>
                <hr style={{margin: 0, padding: 0}}></hr>
                <Stack gap={2} direction="vertical" style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                    <Stack gap={2} direction='horizontal' style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                        <IconButton onClick={handleRefinement} onMouseEnter={() => setTooltipContents('Refine')}>
                            <CrisisAlertOutlined/>
                        </IconButton>
                        <IconButton onClick={handleDragAtoms} onMouseEnter={() => setTooltipContents('Drag atoms')}>
                            <AdsClickOutlined/>
                        </IconButton>
                        <IconButton onClick={handleSelectionCopy} onMouseEnter={() => setTooltipContents('Copy fragment')}>
                            <CopyAllOutlined/>
                        </IconButton>
                        <IconButton onClick={handleExpandSelection} onMouseEnter={() => setTooltipContents('Expand to neighbouring residues')}>
                            <AllOutOutlined/>
                        </IconButton>
                        <IconButton onClick={handleDelete} onMouseEnter={() => setTooltipContents('Delete')}>
                            <DeleteOutlined/>
                        </IconButton>
                    </Stack>
                    <Stack gap={2} direction='horizontal' style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                        <IconButton ref={cidAnchorRef} onClick={() => {
                            setShowCidEditForm((prev) => !prev)
                            setCidFormValue(null)
                            setShowColourPopover(false)
                            setInvalidCid(false)
                        }} onMouseEnter={() => setTooltipContents('Edit selection')}>
                            <EditOutlined style={{height: '23px', width: '23px', padding: '0.05rem', marginLeft: '0.2rem'}}/>
                        </IconButton>
                        <IconButton onClick={handleInvertSelection} onMouseEnter={() => setTooltipContents('Invert selection')}>
                            <SwapVertOutlined/>
                        </IconButton>
                        <IconButton ref={changeColourAnchorRef} onClick={() => {
                            setShowColourPopover((prev) => !prev)
                            setShowCidEditForm(false)
                            setInvalidCid(false)
                            setCidFormValue(null)
                        }} onMouseEnter={() => setTooltipContents('Change colour')}>
                            <FormatColorFillOutlined/>
                        </IconButton>
                        <IconButton onClick={handleRotateTranslate} onMouseEnter={() => setTooltipContents('Rotate/Translate')}>
                            <Rotate90DegreesCw/>
                        </IconButton>
                        <IconButton disabled={activeMap === null} onClick={handleRigidBodyFit} onMouseEnter={() => setTooltipContents('Rigid body fit')}>
                            <SwipeRightAlt/>
                        </IconButton>
                    </Stack>
                </Stack>
            <Popover 
                onMouseEnter={() => setTooltipContents(null)} 
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                open={showColourPopover}
                anchorEl={changeColourAnchorRef.current}
                onClose={() => setShowColourPopover(false)}
                sx={{
                    '& .MuiPaper-root': {
                        overflowY: 'hidden', borderRadius: '8px'
                    }
                }}>
                <Stack gap={3} direction='horizontal'>
                    <div style={{width: '100%', textAlign: 'center'}}>
                        <HexColorPicker style={{padding: '0.05rem'}} color={selectedColour} onChange={(color) => setSelectedColour(color)}/>
                        <div style={{width: '100%', display: 'flex', justifyContent: 'center'}}>
                            <div className="moorhen-hex-input-decorator">#</div>
                            <HexColorInput className="moorhen-hex-input" color={selectedColour} onChange={(color) => setSelectedColour(color)}/>
                        </div>
                        <Button size="sm" variant="primary" style={{width: '80%', margin: '0.25rem'}} onClick={handleColourChange}>Apply</Button>
                    </div>
                </Stack>
            </Popover>
            <Popover 
                onMouseEnter={() => setTooltipContents(null)} 
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                open={showCidEditForm}
                anchorEl={cidAnchorRef.current}
                onClose={() => {
                    setShowCidEditForm(false)
                    setInvalidCid(false)
                }}
                sx={{
                    '& .MuiPaper-root': {
                        overflowY: 'hidden', borderRadius: '8px'
                    }
                }}>
                <Stack gap={3} direction='horizontal'>
                    <div style={{ padding: '0.2rem', textAlign: 'center'}}>
                        <MoorhenCidInputForm margin="0" width="100%" onChange={(evt) => setCidFormValue(evt.target.value)} ref={cidFormRef} invalidCid={invalidCid}/>
                        <Button size="sm" variant="primary" style={{width: '80%', margin: '0.25rem'}} onClick={handleResidueCidChange}>Apply</Button>
                    </div>
                </Stack>
            </Popover>
            </Stack>
            </Tooltip>
        </MoorhenNotification>
    : null
}