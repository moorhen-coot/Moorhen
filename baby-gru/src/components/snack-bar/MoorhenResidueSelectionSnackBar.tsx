import { IconButton, Popover, Tooltip } from "@mui/material"
import { cidToSpec } from "../../utils/utils"
import { AdsClickOutlined, AllOutOutlined, CloseOutlined, CopyAllOutlined, CrisisAlertOutlined, DeleteOutlined, EditOutlined, FormatColorFillOutlined, Rotate90DegreesCw, SwapVertOutlined, SwipeRightAlt } from "@mui/icons-material"
import { batch, useDispatch, useSelector } from "react-redux"
import { moorhen } from "../../types/moorhen"
import { Button, Stack } from "react-bootstrap"
import { clearResidueSelection, setIsDraggingAtoms, setIsRotatingAtoms, setResidueSelection, setShowResidueSelection } from '../../store/generalStatesSlice';
import { forwardRef, useCallback, useEffect, useRef, useState } from "react"
import { addMolecule, removeMolecule } from "../../store/moleculesSlice"
import { setHoveredAtom } from "../../store/hoveringStatesSlice"
import { HexColorInput, HexColorPicker } from "react-colorful"
import { MoorhenCidInputForm } from "../form/MoorhenCidInputForm"
import { triggerUpdate } from "../../store/moleculeMapUpdateSlice"
import { MoorhenColourRule } from "../../utils/MoorhenColourRule"
import { SnackbarContent, enqueueSnackbar, useSnackbar } from "notistack"

export const MoorhenResidueSelectionSnackBar = forwardRef<HTMLDivElement, {id: string}>((props, ref) => {

    const notificationComponentRef = useRef(null)
    const changeColourAnchorRef = useRef(null)
    const cidAnchorRef = useRef(null)
    const cidFormRef = useRef(null)

    const [cidFormValue, setCidFormValue] = useState<null | string>(null)
    const [showCidEditForm, setShowCidEditForm] = useState<boolean>(false)
    const [invalidCid, setInvalidCid] = useState<boolean>(false)
    const [showColourPopover, setShowColourPopover] = useState<boolean>(false)
    const [tooltipContents, setTooltipContents] = useState<null | string>(null)
    const [selectedColour, setSelectedColour] = useState<string>('#808080')

    const dispatch = useDispatch()

    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)
    const residueSelection = useSelector((state: moorhen.State) => state.generalStates.residueSelection)
    const activeMap = useSelector((state: moorhen.State) => state.generalStates.activeMap)
    const animateRefine = useSelector((state: moorhen.State) => state.refinementSettings.animateRefine)

    const { closeSnackbar } = useSnackbar()

    useEffect(() => {
        dispatch(setShowResidueSelection(true))
        return () => {
            dispatch(setShowResidueSelection(false))
        }
    }, [])

    const clearSelection = useCallback(() => {
        setCidFormValue(null)
        setShowCidEditForm(false)
        setShowColourPopover(false)
        setInvalidCid(false)
        molecules.forEach(molecule => molecule.clearBuffersOfStyle('residueSelection'))
        closeSnackbar(props.id)
    }, [molecules])

    useEffect(() => {
        if (Object.keys(residueSelection).every(key => !residueSelection[key])) {
            clearSelection()
        }
    }, [residueSelection, clearSelection])

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
        const newColourRules: moorhen.ColourRule[] = []

        if (residueSelection.isMultiCid && Array.isArray(residueSelection.cid)) {
            residueSelection.cid.forEach(cid => {
                const newColourRule = new MoorhenColourRule(
                    'cid', cid, selectedColour, residueSelection.molecule.commandCentre, false
                )
                newColourRule.setArgs([ cid, selectedColour ])
                newColourRule.setParentMolecule(residueSelection.molecule)
                newColourRules.push(newColourRule)
            })
        } else if (residueSelection.molecule && residueSelection.cid) {
            const newColourRule = new MoorhenColourRule(
                'cid', residueSelection.cid as string, selectedColour, residueSelection.molecule.commandCentre, false
            )
            newColourRule.setArgs([ residueSelection.cid as string, selectedColour ])
            newColourRule.setParentMolecule(residueSelection.molecule)
            newColourRules.push(newColourRule)
        } else if (residueSelection.molecule && residueSelection.first) {
            const startResSpec = cidToSpec(residueSelection.first)
            const cid =`/${startResSpec.mol_no}/${startResSpec.chain_id}/${startResSpec.res_no}-${startResSpec.res_no}`
            const newColourRule = new MoorhenColourRule(
                'cid', cid as string, selectedColour, residueSelection.molecule.commandCentre, false
            )
            newColourRule.setArgs([ cid as string, selectedColour ])
            newColourRule.setParentMolecule(residueSelection.molecule)
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
            batch(() => {
                molecules.forEach(molecule => molecule.clearBuffersOfStyle('residueSelection'))
                dispatch( setHoveredAtom({ molecule: null, cid: null }) )
                dispatch( setIsRotatingAtoms(true) )
                enqueueSnackbar("accept-reject-rotate", {
                    variant: 'acceptRejectRotateTranslateAtoms',
                    persist: true,
                    cidRef: {current: cid},
                    glRef: residueSelection.molecule.glRef,
                    moleculeRef: {current: residueSelection.molecule},
                    onClose: () => residueSelection.molecule.drawResidueSelection(cid),
                })
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
            molecules.forEach(molecule => molecule.clearBuffersOfStyle('residueSelection'))
            batch(() => {
                dispatch( setHoveredAtom({ molecule: null, cid: null }) )
                dispatch( setIsDraggingAtoms(true) )
                enqueueSnackbar("accept-reject-dragging-atoms", {
                    onClose: () => residueSelection.molecule.drawResidueSelection(cid.join('||')),
                    variant: "acceptRejectDraggingAtoms",
                    persist: true,
                    commandCentre: residueSelection.molecule.commandCentre,
                    monomerLibraryPath: residueSelection.molecule.monomerLibraryPath,
                    glRef: residueSelection.molecule.glRef,
                    cidRef: { current: cid },
                    moleculeRef: { current: residueSelection.molecule }
                })
            })
        }
    }, [residueSelection])

    return <SnackbarContent ref={ref} className="moorhen-notification-div" style={{ backgroundColor: isDark ? 'grey' : 'white', color: isDark ? 'white' : 'grey' }}>
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
                        <IconButton disabled={activeMap === null} onClick={handleRefinement} onMouseEnter={() => setTooltipContents('Refine')}>
                            <CrisisAlertOutlined/>
                        </IconButton>
                        <IconButton disabled={activeMap === null} onClick={handleDragAtoms} onMouseEnter={() => setTooltipContents('Drag atoms')}>
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
                        overflowY: 'hidden', borderRadius: '8px', marginTop: '1rem'
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
                        overflowY: 'hidden', borderRadius: '8px', marginTop: '1rem'
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
        </SnackbarContent>
})
