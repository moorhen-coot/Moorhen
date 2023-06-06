import styled, { css } from "styled-components";
import { ClickAwayListener, FormGroup, IconButton, List, MenuItem, Tooltip } from '@mui/material';
import { ArrowBackIosOutlined, ArrowForwardIosOutlined, CheckOutlined, CloseOutlined, FirstPageOutlined } from "@mui/icons-material";
import { MoorhenMergeMoleculesMenuItem, MoorhenGetMonomerMenuItem, MoorhenFitLigandRightHereMenuItem, MoorhenImportFSigFMenuItem, MoorhenBackgroundColorMenuItem, MoorhenAddSimpleMenuItem } from "../menu-item/MoorhenMenuItem";
import { cidToSpec, convertRemToPx, getTooltipShortcutLabel } from "../../utils/MoorhenUtils";
import { getBackupLabel } from "../../utils/MoorhenTimeCapsule"
import { useEffect, useRef, useState, useCallback } from "react";
import { Popover, Overlay, FormLabel, FormSelect, Button, Stack, Form, Card } from "react-bootstrap";
import { deleteFormatArgs, rigidBodyFitFormatArgs } from "../button/MoorhenSimpleEditButton";
import Draggable from "react-draggable";
import { MoorhenMolecule } from "../../utils/MoorhenMolecule";

const ContextMenu = styled.div`
  position: absolute;
  border-radius: 5px;
  box-sizing: border-box;
  border-color: #4a4a4a;
  border-width: 1px;
  border-style: solid;
  ${({ top, left, backgroundColor, opacity }) => css`
    top: ${top}px;
    left: ${left}px;
    background-color: ${backgroundColor};
    opacity: ${opacity};
    `}
`;

const MoorhenPopoverOptions = (props) => {
  const selectRef = useRef(null)
  const extraInputRef = useRef(null)
  
  const handleRightClick = useCallback((e) => {
    if (props.showContextMenu) {
      props.setShowOverlay(false)
    }
  }, [])

  useEffect(() => {
    document.addEventListener("rightClick", handleRightClick);
    return () => {
        document.removeEventListener("rightClick", handleRightClick);
    };

}, [handleRightClick]);

  return <ClickAwayListener onClickAway={() => props.setShowOverlay(false)}>
          <Stack direction="vertical" gap={2}>
            <FormGroup>
              <FormLabel>{props.label}</FormLabel>
              <FormSelect ref={selectRef} defaultValue='TRIPLE'>
                  {props.options.map(optionName => {
                      return <option key={optionName} value={optionName}>{optionName}</option>
                  })}
              </FormSelect>
            </FormGroup>
            {props.extraInput(extraInputRef)}
            <Button onClick={() => {
              if (!props.nonCootCommand) {
                props.doEdit(props.formatArgs(selectRef.current.value, extraInputRef))
              } else {
                props.nonCootCommand(props.selectedMolecule, props.chosenAtom, selectRef.current.value)
              }
            }}>
              OK
            </Button>
          </Stack>
        </ClickAwayListener>
}

MoorhenPopoverOptions.defaultProps = {extraInput: () => null, nonCootCommand: false}

const MoorhenContextQuickEditButton = (props) => {

  const doEdit = async (cootCommandInput) => {
    const cootResult = await props.commandCentre.current.cootCommand(cootCommandInput)
   
    if (props.onCompleted) {
      props.onCompleted(props.selectedMolecule, props.chosenAtom)
    }

    if (props.refineAfterMod && props.activeMap) {
      try {
          await props.commandCentre.current.cootCommand({
              returnType: "status",
              command: 'refine_residues_using_atom_cid',
              commandArgs: [ props.selectedMolecule.molNo, `//${props.chosenAtom.chain_id}/${props.chosenAtom.res_no}`, 'TRIPLE', 4000],
              changesMolecules: [props.selectedMolecule.molNo]
          }, true)
      }
      catch (err) {
          console.log(`Exception raised in Refine [${err}]`)
      }
    }

    const scoresUpdateEvent = new CustomEvent("scoresUpdate", { detail: { origin: props.glRef.current.origin, modifiedMolecule: props.selectedMolecule.molNo } })
    document.dispatchEvent(scoresUpdateEvent)
    props.selectedMolecule.setAtomsDirty(true)
    props.selectedMolecule.clearBuffersOfStyle('hover', props.glRef)
    await Promise.all([
      props.selectedMolecule.redraw(props.glRef),
      props.timeCapsuleRef.current.addModification() 
    ])

    if(props.onExit) {
      props.onExit(props.selectedMolecule, props.chosenAtom, cootResult)
    }

    props.setShowContextMenu(false)

  }

  const handleClick = async () => {
    if (props.popoverSettings) {
      props.setOverlayContents(
        <MoorhenPopoverOptions {...props.popoverSettings} chosenAtom={props.chosenAtom} selectedMolecule={props.selectedMolecule} showContextMenu={props.showContextMenu} doEdit={doEdit} setShowOverlay={props.setShowOverlay}/>
      )
      setTimeout(() => props.setShowOverlay(true), 50)
    } else if (props.nonCootCommand) {
      await props.nonCootCommand(props.selectedMolecule, props.chosenAtom)
    } else {
      await doEdit(props.cootCommandInput)
    }
  }

  return <>
          <IconButton 
              onClick={handleClick}
              onMouseEnter={(evt) => props.setToolTip(props.toolTipLabel)}
              style={{width:'3rem', height: '3rem', marginTop: '0.5rem', paddingRight: 0, paddingTop: 0, paddingBottom: 0, paddingLeft: '0.1rem'}}
              disabled={props.needsMapData && !props.activeMap || (props.needsAtomData && props.molecules.length === 0)}
            >
              {props.icon}
          </IconButton>
      </>
}

MoorhenContextQuickEditButton.defaultProps = {
  needsMapData: false, needsAtomData: true, 
  refineAfterMod: false, onExit: null, onCompleted: null
}

export const MoorhenContextMenu = (props) => {
  const contextMenuRef = useRef(null)
  const quickActionsFormGroupRef = useRef(null)
  const [showOverlay, setShowOverlay] = useState(false)
  const [overlayContents, setOverlayContents] = useState(null)
  const [overrideMenuContents, setOverrideMenuContents] = useState(false)
  const [opacity, setOpacity] = useState(1.0)
  const [toolTip, setToolTip] = useState('')
  const backgroundColor = props.isDark ? '#858585' : '#ffffff' 
  
  let selectedMolecule
  let chosenAtom
  if (props.showContextMenu.buffer){
    selectedMolecule = props.molecules.find(molecule => molecule.buffersInclude(props.showContextMenu.buffer))
  }
  if (props.showContextMenu.atom) {
    chosenAtom = cidToSpec(props.showContextMenu.atom.label)
  }

  let top = props.showContextMenu.pageY
  let left = props.showContextMenu.pageX
  const menuWidth = selectedMolecule && chosenAtom ? convertRemToPx(26) : convertRemToPx(7)
  const menuHeight = selectedMolecule && chosenAtom ? convertRemToPx(17) : convertRemToPx(7)
  
  if (props.windowWidth - left < menuWidth) {
    left -= menuWidth
  }
  if (props.windowHeight - top < menuHeight) {
    top -= menuHeight
  }
    
  let placement = "right"
  if (props.windowWidth * 0.5 < left){
    placement = 'left'
  }
  
  const menuPosition = {top, left, placement}

  const collectedProps = {selectedMolecule, chosenAtom, setOverlayContents, setShowOverlay, toolTip, setToolTip, ...props}

  const handleCreateBackup = async () => {
    await props.timeCapsuleRef.current.updateDataFiles()
    const session = await props.timeCapsuleRef.current.fetchSession(false)
    const sessionString = JSON.stringify(session)
    const key = {
        dateTime: `${Date.now()}`,
        type: 'manual',
        molNames: session.moleculeData.map(mol => mol.name),
        mapNames: session.mapData.map(map => map.uniqueId),
        mtzNames: session.mapData.filter(map => map.hasReflectionData).map(map => map.associatedReflectionFileName)
    }
    const keyString = JSON.stringify({
      ...key,
      label: getBackupLabel(key)
    })
    await props.timeCapsuleRef.current.createBackup(keyString, sessionString)
    props.setShowContextMenu(false)
  }

  const doDragAtoms = async (molecule, chosenAtom, selectedMode) => {
    const selectedSequence = molecule.sequences.find(sequence => sequence.chain === chosenAtom.chain_id)
    let draggingDirty = false
    let refinementDirty = false
    let busy = false
    let selectedResidueIndex
    let start
    let stop

    if (typeof selectedSequence === 'undefined') {
      selectedMode = 'SINGLE'
    } else {
      selectedResidueIndex = selectedSequence.sequence.findIndex(residue => residue.resNum === chosenAtom.res_no)
    }

    switch (selectedMode) {
      case 'SINGLE':
        start = chosenAtom.res_no
        stop = chosenAtom.res_no
        break;
      case 'TRIPLE':
        start = selectedResidueIndex !== 0 ? selectedSequence.sequence[selectedResidueIndex - 1].resNum : chosenAtom.res_no
        stop = selectedResidueIndex < selectedSequence.sequence.length - 1 ? selectedSequence.sequence[selectedResidueIndex + 1].resNum : chosenAtom.res_no
        break;
      case 'QUINTUPLE':
        start = selectedResidueIndex !== 0 ? selectedSequence.sequence[selectedResidueIndex - 2].resNum : chosenAtom.res_no
        stop = selectedResidueIndex < selectedSequence.sequence.length - 2 ? selectedSequence.sequence[selectedResidueIndex + 2].resNum : selectedSequence.sequence[selectedResidueIndex - 1].resNum
        break;
      case 'HEPTUPLE':
        start = selectedResidueIndex !== 0 ? selectedSequence.sequence[selectedResidueIndex - 3].resNum : chosenAtom.res_no
        stop = selectedResidueIndex < selectedSequence.sequence.length - 3 ? selectedSequence.sequence[selectedResidueIndex + 3].resNum : selectedSequence.sequence[selectedResidueIndex - 1].resNum
        break;
      default:
        console.log('Unrecognised dragging atoms selection...')
        break;
    }
    
    if (!start || !stop) {
      return
    }

    /* Copy the component to move into a new molecule */
    const fragmentCid = `//${chosenAtom.chain_id}/${start}-${stop}/*`
    const copyResult = await props.commandCentre.current.cootCommand({
      returnType: 'int',
      command: 'copy_fragment_for_refinement_using_cid',
      commandArgs: [molecule.molNo, fragmentCid]
    }, true)
    const moltenFragment = new MoorhenMolecule(props.commandCentre, props.monomerLibraryPath)
    moltenFragment.molNo = copyResult.data.result.result
    
    /* Define functions for the panel */
    const animateRefine = async (chosenMolecule, n_cyc, n_iteration, final_n_cyc=100) => {
      for (let i = 0; i <= n_iteration; i++) {
          const result = await props.commandCentre.current.cootCommand({
              returnType: 'status_instanced_mesh_pair',
              command: 'refine',
              commandArgs: [chosenMolecule.molNo, i !== n_iteration ? n_cyc : final_n_cyc]
          }, true)
          if (result.data.result.result.status !== -2){
              return
          }
          if (i !== n_iteration) {
              await chosenMolecule.drawWithStyleFromMesh('CBs', props.glRef, [result.data.result.result.mesh])
          }
      }
      chosenMolecule.setAtomsDirty(true)
      await chosenMolecule.fetchIfDirtyAndDraw('CBs', props.glRef)
    }

    const atomDraggedCallback = async (evt) => {
      draggingDirty = true
      if (!busy) {
          moltenFragment.clearBuffersOfStyle('hover', props.glRef)
          await handleAtomDragged(evt.detail.atom.atom.label)    
      }
    }

    const mouseUpCallback = async () => {
      if(refinementDirty) {
          await refineNewPosition()
      }
      moltenFragment.displayObjects.transformation.origin = [0, 0, 0]
      moltenFragment.displayObjects.transformation.quat = null
    }

    const handleAtomDragged = async(atomCid) => {
      if(draggingDirty && atomCid) {
          busy = true
          refinementDirty = true
          draggingDirty = false
          const movedAtoms = moltenFragment.transformedCachedAtomsAsMovedAtoms(props.glRef, atomCid)
          if(movedAtoms.length < 1 || typeof movedAtoms[0][0] === 'undefined') {
              // The atom dragged was not part of the molten molecule
              refinementDirty = false
              busy = false
              return
          }
          const chosenAtom = cidToSpec(atomCid)
          const result = await props.commandCentre.current.cootCommand({
              returnType: 'instanced_mesh',
              command: 'add_target_position_restraint_and_refine',
              commandArgs: [moltenFragment.molNo, `//${chosenAtom.chain_id}/${chosenAtom.res_no}/${chosenAtom.atom_name}`, movedAtoms[0][0].x, movedAtoms[0][0].y, movedAtoms[0][0].z, 10],
          }, true)
          await moltenFragment.drawWithStyleFromMesh('CBs', props.glRef, [result.data.result.result])
          busy = false
          handleAtomDragged(atomCid)
      }
    }

    const refineNewPosition = async () => {
      if (!busy) {
          busy = true
          refinementDirty = false
          await props.commandCentre.current.cootCommand({
              returnType: 'status',
              command: 'clear_target_position_restraints',
              commandArgs: [moltenFragment.molNo]
          }, true)
          await animateRefine(moltenFragment, 10, 5)
          busy = false    
      } else {
          setTimeout(() => refineNewPosition(), 100)
      }
    }

    const finishDragging = async (acceptTransform) => {
      document.removeEventListener('atomDragged', atomDraggedCallback)
      document.removeEventListener('mouseup', mouseUpCallback)
      props.glRef.current.setDraggableMolecule(null)
      if (busy) {
        setTimeout(() => finishDragging(acceptTransform), 100)
        return
      }
      if(acceptTransform){
          await props.commandCentre.current.cootCommand({
              returnType: 'status',
              command: 'clear_refinement',
              commandArgs: [molecule.molNo],
          }, true)
          await props.commandCentre.current.cootCommand({
              returnType: 'status',
              command: 'replace_fragment',
              commandArgs: [molecule.molNo, moltenFragment.molNo, fragmentCid],
          }, true)
          molecule.atomsDirty = true
          await molecule.redraw(props.glRef)
          const scoresUpdateEvent = new CustomEvent("scoresUpdate", { detail: { origin: props.glRef.current.origin, modifiedMolecule: molecule.molNo } })
          document.dispatchEvent(scoresUpdateEvent)
      }
      props.changeMolecules({ action: 'Remove', item: moltenFragment })
      moltenFragment.delete(props.glRef)
      molecule.unhideAll(props.glRef)

      setOverrideMenuContents(false)
      setOpacity(1)
      props.setShowContextMenu(false)
    }

    /* Initiate refinement */
    await props.commandCentre.current.cootCommand({
      returnType: 'status',
      command: 'init_refinement_of_molecule_as_fragment_based_on_reference',
      commandArgs: [moltenFragment.molNo, molecule.molNo, props.activeMap.molNo]
    }, true)
    
    /* Show the panel */
    setShowOverlay(false)
    setOpacity(0.5)
    document.addEventListener('atomDragged', atomDraggedCallback)
    document.addEventListener('mouseup', mouseUpCallback)
    setOverrideMenuContents(
      <Draggable>
        <Card style={{position: 'absolute', width: '15rem', cursor: 'move'}} onMouseOver={() => setOpacity(1)} onMouseOut={() => setOpacity(0.5)}>
          <Card.Header>Accept dragging ?</Card.Header>
          <Card.Body style={{ alignItems: 'center', alignContent: 'center', justifyContent: 'center' }}>
            <Stack direction='horizontal' gap={2}>
              <Button onClick={() => finishDragging(true)}><CheckOutlined /></Button>
              <Button onClick={() => finishDragging(false)}><CloseOutlined /></Button>
            </Stack>
          </Card.Body>
        </Card>
      </Draggable>
    )
  
    /* Redraw with animation*/
    molecule.hideCid(fragmentCid, props.glRef)
    moltenFragment.setAtomsDirty(true)
    await moltenFragment.fetchIfDirtyAndDraw('CBs', props.glRef)
    await animateRefine(moltenFragment, 10, 5, 10)
    props.changeMolecules({ action: "Add", item: moltenFragment })
    props.glRef.current.setDraggableMolecule(moltenFragment)
  }

  const doRotateTranslate = async (molecule, chosenAtom, selectedMode) => {
    let fragmentCid
    switch (selectedMode) {
        case 'ATOM':
            fragmentCid = `//${chosenAtom.chain_id}/${chosenAtom.res_no}/${chosenAtom.atom_name}${chosenAtom.alt_conf === "" ? "" : ":" + chosenAtom.alt_conf}`
            break;
        case 'RESIDUE':
            fragmentCid = `//${chosenAtom.chain_id}/${chosenAtom.res_no}/*${chosenAtom.alt_conf === "" ? "" : ":" + chosenAtom.alt_conf}`
            break;
        case 'CHAIN':
            fragmentCid = `//${chosenAtom.chain_id}`
            break;
        case 'MOLECULE':
            fragmentCid = `/*/*`
            break;
        default:
            console.log('Unrecognised rotate/translate selection...')
            break;        
    }
    
    if (!fragmentCid) {
        return
    }
    
    const newMolecule = await molecule.copyFragmentUsingCid(
      fragmentCid, props.glRef.current.background_colour, molecule.cootBondsOptions.smoothness, props.glRef, false
    )

    const acceptTransform = async () => {
      props.glRef.current.setActiveMolecule(null)
      const transformedAtoms = newMolecule.transformedCachedAtomsAsMovedAtoms(props.glRef)
      await molecule.updateWithMovedAtoms(transformedAtoms, props.glRef)
      props.changeMolecules({ action: 'Remove', item: newMolecule })
      newMolecule.delete(props.glRef)
      molecule.unhideAll(props.glRef)
      setOverrideMenuContents(false)
      setOpacity(1)
      const scoresUpdateEvent = new CustomEvent("scoresUpdate", { detail: { origin: props.glRef.current.origin, modifiedMolecule: molecule.molNo } })
      document.dispatchEvent(scoresUpdateEvent)
      props.setShowContextMenu(false)
    }

    const rejectTransform = async () => {
      props.glRef.current.setActiveMolecule(null)
      props.changeMolecules({ action: 'Remove', item: newMolecule })
      newMolecule.delete(props.glRef)
      molecule.unhideAll(props.glRef)
      setOverrideMenuContents(false)
      setOpacity(1)
      props.setShowContextMenu(false)
    }
    
    setShowOverlay(false)
    setOpacity(0.5)
    setOverrideMenuContents(
      <Draggable>
        <Card style={{position: 'absolute', width: '15rem', cursor: 'move'}} onMouseOver={() => setOpacity(1)} onMouseOut={() => setOpacity(0.5)}>
          <Card.Header>Accept rotate/translate ?</Card.Header>
          <Card.Body style={{ alignItems: 'center', alignContent: 'center', justifyContent: 'center' }}>
            <em>{"Hold <Shift><Alt> to translate"}</em>
            <br></br>
            <em>{props.shortCuts ? `Hold ${getTooltipShortcutLabel(JSON.parse(props.shortCuts).residue_camera_wiggle)} to move view` : null}</em>
            <br></br>
            <br></br>
            <Stack direction='horizontal' gap={2}>
              <Button onClick={acceptTransform}><CheckOutlined /></Button>
              <Button onClick={rejectTransform}><CloseOutlined /></Button>
            </Stack>
          </Card.Body>
        </Card>
      </Draggable>
    )

    molecule.hideCid(fragmentCid, props.glRef)
    await newMolecule.updateAtoms()
    
    Object.keys(molecule.displayObjects)
      .filter(style => { return ['CRs', 'CBs', 'ligands', 'gaussian', 'MolecularSurface', 'VdWSurface', 'DishyBases','VdwSpheres','allHBonds'].includes(style) })
      .forEach(async style => {
          if (molecule.displayObjects[style].length > 0 &&
              molecule.displayObjects[style][0].visible) {
              await newMolecule.drawWithStyleFromAtoms(style, props.glRef)
          }
    })
    
    props.changeMolecules({ action: "Add", item: newMolecule })
    props.glRef.current.setActiveMolecule(newMolecule)
  }

  const doRotamerChange = async (molecule, chosenAtom) => {
    /* define fragment CID */
    const fragmentCid = `//${chosenAtom.chain_id}/${chosenAtom.res_no}/*${chosenAtom.alt_conf === "" ? "" : ":" + chosenAtom.alt_conf}`
    const alt_conf = chosenAtom.alt_conf === "" ? "" : chosenAtom.alt_conf
    if (!fragmentCid) {
        return
    }
    molecule.hideCid(fragmentCid, props.glRef)
    
    /* Copy the component to move into a new molecule */
    const newMolecule = await molecule.copyFragmentUsingCid(fragmentCid, props.glRef.current.background_colour, molecule.cootBondsOptions.smoothness, props.glRef, false)
    
    /* Next rotaner */
    const rotamerInfo = await props.commandCentre.current.cootCommand({
        returnType: 'rotamer_info_t',
        command: 'change_to_next_rotamer',
        commandArgs: [newMolecule.molNo, fragmentCid, alt_conf],
    }, true)        

    /* redraw */
    newMolecule.drawSelection(props.glRef, fragmentCid)
    await newMolecule.updateAtoms()
    Object.keys(molecule.displayObjects)
        .filter(style => { return ['CRs', 'CBs', 'ligands', 'gaussian', 'MolecularSurface', 'VdWSurface', 'DishyBases','VdwSpheres','allHBonds'].includes(style) })
        .forEach(async style => {
            if (molecule.displayObjects[style].length > 0 &&
                molecule.displayObjects[style][0].visible) {
                await newMolecule.drawWithStyleFromAtoms(style, props.glRef)
            }
        })
    props.changeMolecules({ action: "Add", item: newMolecule })

    /* General functions */
    const getPopoverContents = (rotamerInfo) => {
      const rotamerName = rotamerInfo.data.result.result.name
      const rotamerRank = rotamerInfo.data.result.result.rank
      const rotamerProbability = rotamerInfo.data.result.result.richardson_probability

      return <Draggable>
              <Card style={{position: 'absolute', width: '15rem', cursor: 'move'}} onMouseOver={() => setOpacity(1)} onMouseOut={() => setOpacity(0.5)}>
                <Card.Header>Accept new rotamer ?</Card.Header>
                <Card.Body style={{ alignItems: 'center', alignContent: 'center', justifyContent: 'center' }}>
                <span>Current rotamer: {rotamerName} ({rotamerRank+1}<sup>{rotamerRank === 0 ? 'st' : rotamerRank === 1 ? 'nd' : rotamerRank === 2 ? 'rd' : 'th'}</sup>)</span>
                <br></br>
                <span>Probability: {rotamerProbability}%</span>
                  <Stack gap={2} direction='horizontal' style={{paddingTop: '0.5rem', alignItems: 'center', alignContent: 'center', justifyContent: 'center' }}>
                  <Button onClick={() => changeRotamer('change_to_first_rotamer')}><FirstPageOutlined/></Button>
                    <Button onClick={() => changeRotamer('change_to_previous_rotamer')}><ArrowBackIosOutlined/></Button>
                    <Button onClick={() => changeRotamer('change_to_next_rotamer')}><ArrowForwardIosOutlined/></Button>
                  </Stack>
                  <Stack gap={2} direction='horizontal' style={{paddingTop: '0.5rem', alignItems: 'center', alignContent: 'center', justifyContent: 'center' }}>
                    <Button onClick={acceptTransform}><CheckOutlined /></Button>
                    <Button className="mx-2" onClick={rejectTransform}><CloseOutlined /></Button>
                  </Stack>
                </Card.Body>
              </Card>
            </Draggable>
    }

    const changeRotamer = async (command) => {
      const rotamerInfo = await props.commandCentre.current.cootCommand({
          returnType: 'rotamer_info_t',
          command: command,
          commandArgs: [newMolecule.molNo, fragmentCid, alt_conf],
      }, true)
      newMolecule.setAtomsDirty(true)
      newMolecule.clearBuffersOfStyle('selection', props.glRef)
      newMolecule.drawSelection(props.glRef, fragmentCid)
      await newMolecule.redraw(props.glRef)
      setOverrideMenuContents(getPopoverContents(rotamerInfo))  
    }

    const acceptTransform = async () => {
      await props.commandCentre.current.cootCommand({
          returnType: 'status',
          command: 'replace_fragment',
          commandArgs: [molecule.molNo, newMolecule.molNo, fragmentCid],
      }, true)
      molecule.setAtomsDirty(true)
      await molecule.redraw(props.glRef)
      props.changeMolecules({ action: 'Remove', item: newMolecule })
      newMolecule.delete(props.glRef)
      molecule.unhideAll(props.glRef)
      setOverrideMenuContents(false)
      setOpacity(1)
      const scoresUpdateEvent = new CustomEvent("scoresUpdate", { detail: { origin: props.glRef.current.origin, modifiedMolecule: molecule.molNo } })
      document.dispatchEvent(scoresUpdateEvent)
      props.setShowContextMenu(false)
    }

    const rejectTransform = async (e) => {
      props.changeMolecules({ action: 'Remove', item: newMolecule })
      newMolecule.delete(props.glRef)
      molecule.unhideAll(props.glRef)
      setOverrideMenuContents(false)
      setOpacity(1)
      props.setShowContextMenu(false)
    }
    
    /* Set popover contents */
    setOpacity(0.5)
    setOverrideMenuContents(getPopoverContents(rotamerInfo))
  }

  const deleteMoleculeIfEmpty = (molecule, chosenAtom, cootResult) => {
    if (cootResult.data.result.result.second < 1) {
        console.log('Empty molecule detected, deleting it now...')
        molecule.delete(props.glRef)
        props.changeMolecules({ action: 'Remove', item: molecule })
    }
  }

  const autoFitRotamer = useCallback(async (molecule, chosenAtom) => {
    const formattedArgs = [
        molecule.molNo,
        chosenAtom.chain_id,
        chosenAtom.res_no,
        chosenAtom.ins_code,
        chosenAtom.alt_conf,
        props.activeMap.molNo
    ]
    await props.commandCentre.current.cootCommand({
        returnType: "status",
        command: "auto_fit_rotamer",
        commandArgs: formattedArgs,
        changesMolecules: [molecule.molNo]
    }, true)
  }, [props.activeMap, props.commandCentre])

  return <>
      <ContextMenu ref={contextMenuRef} top={menuPosition.top} left={menuPosition.left} backgroundColor={backgroundColor} opacity={opacity}>
        {overrideMenuContents ? 
        overrideMenuContents 
        :
              <ClickAwayListener onClickAway={() => !showOverlay && props.setShowContextMenu(false)}>
                  <List>
                    {
                    props.viewOnly ? 
                      <MoorhenBackgroundColorMenuItem setPopoverIsShown={() => { }} backgroundColor={props.backgroundColor} setBackgroundColor={props.setBackgroundColor}/>
                    :              
                    selectedMolecule && chosenAtom ?
                    <>
                     <MoorhenMergeMoleculesMenuItem glRef={props.glRef} molecules={props.molecules} setPopoverIsShown={() => {}} menuItemText="Merge molecule into..." popoverPlacement='right' fromMolNo={selectedMolecule.molNo}/>
                     <MoorhenImportFSigFMenuItem glRef={props.glRef} molecules={props.molecules} setPopoverIsShown={() => {}} selectedMolNo={selectedMolecule.molNo} maps={props.maps} commandCentre={props.commandCentre} />
                     <MenuItem disabled={!props.enableTimeCapsule} onClick={() => handleCreateBackup()}>Create backup</MenuItem>
                     <hr></hr>
                     <div style={{ display:'flex', justifyContent: 'center' }}>
                     <Tooltip title={toolTip}>
                     <FormGroup ref={quickActionsFormGroupRef} style={{ justifyContent: 'center', margin: "0px", padding: "0px", width: '26rem' }} row>
                      <MoorhenContextQuickEditButton 
                          toolTipLabel={props.shortCuts ? `Auto-fit Rotamer ${getTooltipShortcutLabel(JSON.parse(props.shortCuts).auto_fit_rotamer)}` : "Auto-fit Rotamer"}
                          icon={<img style={{padding:'0.1rem', width:'100%', height: '100%'}} src={`${props.urlPrefix}/baby-gru/pixmaps/auto-fit-rotamer.svg`} alt='Auto-Fit rotamer'/>}
                          needsMapData={true}
                          cootCommandInput={{
                              message: 'coot_command',
                              returnType: "status",
                              command: 'fill_partial_residue',
                              commandArgs: [selectedMolecule.molNo, chosenAtom.chain_id, chosenAtom.res_no, chosenAtom.ins_code],
                              changesMolecules: [selectedMolecule.molNo]
                          }}
                          {...collectedProps}
                      />
                      <MoorhenContextQuickEditButton 
                          icon={<img style={{padding:'0.1rem', width:'100%', height: '100%'}} src={`${props.urlPrefix}/baby-gru/pixmaps/flip-peptide.svg`} alt='Flip peptide'/>}
                          needsMapData={true}
                          toolTipLabel={props.shortCuts ? `Flip Peptide ${getTooltipShortcutLabel(JSON.parse(props.shortCuts).flip_peptide)}` : "Flip Peptide"}
                          cootCommandInput={{
                              message: 'coot_command',
                              returnType: "status",
                              command: 'flipPeptide_cid',
                              commandArgs: [
                                selectedMolecule.molNo,
                                `//${chosenAtom.chain_id}/${chosenAtom.res_no}/${chosenAtom.atom_name}${chosenAtom.alt_conf === "" ? "" : ":" + chosenAtom.alt_conf}`,
                                chosenAtom.alt_conf === "" ? "" : chosenAtom.alt_conf
                              ],
                              changesMolecules: [selectedMolecule.molNo]
                          }}
                          {...collectedProps}
                      />
                      <MoorhenContextQuickEditButton 
                          icon={<img style={{padding:'0.1rem', width:'100%', height: '100%'}} className="baby-gru-button-icon" src={`${props.urlPrefix}/baby-gru/pixmaps/side-chain-180.svg`} alt='Rotate Side-chain'/>}
                          toolTipLabel="Rotate side-chain 180 degrees"
                          cootCommandInput={{
                              message: 'coot_command',
                              returnType: "status",
                              command: 'side_chain_180',
                              commandArgs: [selectedMolecule.molNo, `//${chosenAtom.chain_id}/${chosenAtom.res_no}`],
                              changesMolecules: [selectedMolecule.molNo]
                          }}
                          {...collectedProps}
                      />
                      <MoorhenContextQuickEditButton 
                          icon={<img style={{padding:'0.1rem', width:'100%', height: '100%'}} className="baby-gru-button-icon" src={`${props.urlPrefix}/baby-gru/pixmaps/refine-1.svg`} alt='Refine Residues'/>}
                          needsMapData={true}
                          refineAfterMod={false}
                          toolTipLabel={props.shortCuts ? `Refine Residues ${getTooltipShortcutLabel(JSON.parse(props.shortCuts).triple_refine)}` : "Refine Residues"}
                          popoverSettings={{
                            label: 'Refinement mode',
                            options: ['SINGLE', 'TRIPLE', 'QUINTUPLE', 'HEPTUPLE', 'SPHERE', 'BIG_SPHERE', 'CHAIN', 'ALL'],
                            formatArgs: (selectedOption) => {
                              return {
                                message: 'coot_command',
                                returnType: "status",
                                command: 'refine_residues_using_atom_cid',
                                commandArgs: [ selectedMolecule.molNo, `//${chosenAtom.chain_id}/${chosenAtom.res_no}`, selectedOption, 4000],
                                changesMolecules: [selectedMolecule.molNo]
                              }
                            }
                            }}
                          {...collectedProps}
                      />
                      <MoorhenContextQuickEditButton 
                          icon={<img style={{padding:'0.1rem', width:'100%', height: '100%'}} className="baby-gru-button-icon" src={`${props.urlPrefix}/baby-gru/pixmaps/delete.svg`} alt="delete-item"/>}
                          refineAfterMod={false}
                          toolTipLabel={props.shortCuts ? `Delete Item ${getTooltipShortcutLabel(JSON.parse(props.shortCuts).delete_residue)}` : "Delete Item"}
                          onExit={deleteMoleculeIfEmpty}
                          popoverSettings={{
                            label: 'Delete mode',
                            options: ['ATOM', 'RESIDUE', 'RESIDUE HYDROGENS', 'RESIDUE SIDE-CHAIN', 'CHAIN', 'CHAIN HYDROGENS', 'MOLECULE HYDROGENS'],
                            formatArgs: (selectedOption) => {
                              return {
                                message: 'coot_command',
                                returnType: "status",
                                command: 'delete_using_cid',
                                commandArgs: deleteFormatArgs(selectedMolecule, chosenAtom, selectedOption),
                                changesMolecules: [selectedMolecule.molNo]
                              }
                            }
                            }}
                          {...collectedProps}
                      />
                      <MoorhenContextQuickEditButton 
                          icon={<img style={{padding:'0.1rem', width:'100%', height: '100%'}} className="baby-gru-button-icon" src={`${props.urlPrefix}/baby-gru/pixmaps/mutate.svg`} alt='Mutate'/>}
                          refineAfterMod={false}
                          needsMapData={true}
                          onCompleted={autoFitRotamer}
                          toolTipLabel="Mutate residue"
                          popoverSettings={{
                            label: 'Mutate to...',
                            options: [
                              'ALA', 'CYS', 'ASP', 'GLU', 'PHE', 'GLY', 'HIS', 'ILE', 'LYS', 'LEU',
                               'MET', 'ASN', 'PRO', 'GLN', 'ARG', 'SER', 'THR', 'VAL', 'TRP', 'TYR'
                            ],
                            formatArgs: (selectedOption) => {
                              return {
                                message: 'coot_command',
                                returnType: "status",
                                command: 'mutate',
                                commandArgs: [selectedMolecule.molNo, `//${chosenAtom.chain_id}/${chosenAtom.res_no}`, selectedOption],
                                changesMolecules: [selectedMolecule.molNo]
                              }
                            }
                            }}
                          {...collectedProps}
                      />
                      <MoorhenContextQuickEditButton 
                          icon={<img style={{padding:'0.1rem', width:'100%', height: '100%'}} className="baby-gru-button-icon" src={`${props.urlPrefix}/baby-gru/pixmaps/add-peptide-1.svg`} alt='Add Residue'/>}
                          needsMapData={true}
                          toolTipLabel={props.shortCuts ? `Add Residue ${getTooltipShortcutLabel(JSON.parse(props.shortCuts).add_terminal_residue)}` : "Add Residue"}
                          cootCommandInput={{
                              message: 'coot_command',
                              returnType: "status",
                              command: 'add_terminal_residue_directly_using_cid',
                              commandArgs: [selectedMolecule.molNo, `//${chosenAtom.chain_id}/${chosenAtom.res_no}`],
                              changesMolecules: [selectedMolecule.molNo]
                          }}
                          {...collectedProps}
                      />
                      <MoorhenContextQuickEditButton 
                          icon={<img style={{padding:'0.1rem', width:'100%', height: '100%'}} alt="change rotamer" className="baby-gru-button-icon" src={`${props.urlPrefix}/baby-gru/pixmaps/rotamers.svg`}/>}
                          toolTipLabel="Change rotamers"
                          nonCootCommand={doRotamerChange}
                          {...collectedProps}
                      />
                      <MoorhenContextQuickEditButton 
                          icon={<img style={{padding:'0.1rem', width:'100%', height: '100%'}} className="baby-gru-button-icon" src={`${props.urlPrefix}/baby-gru/pixmaps/rigid-body.svg`} alt='Rigid body fit'/>}
                          refineAfterMod={false}
                          needsMapData={true}
                          onCompleted={autoFitRotamer}
                          toolTipLabel="Rigid body fit"
                          popoverSettings={{
                            extraInput: (ref) => {
                              return <Form.Check
                                            ref={ref}
                                            style={{paddingTop: '0.1rem'}} 
                                            type="switch"
                                            label="Use random jiggle fit"/>
                            },
                            label: 'Fitting mode',
                            options: ['SINGLE', 'TRIPLE', 'QUINTUPLE', 'HEPTUPLE', 'CHAIN', 'ALL'],
                            formatArgs: (selectedOption, extraInputRef) => {
                              const randomJiggleMode = extraInputRef.current.checked
                              const commandArgs = rigidBodyFitFormatArgs(selectedMolecule, chosenAtom, selectedOption, props.activeMap.molNo)
                              return {
                                message: 'coot_command',
                                returnType: "status",
                                command: randomJiggleMode ? 'fit_to_map_by_random_jiggle_using_cid' : 'rigid_body_fit',
                                commandArgs: randomJiggleMode ?  [...commandArgs.slice(0, 2), 0, -1] : commandArgs,
                                changesMolecules: [selectedMolecule.molNo]
                              }
                            }
                            }}
                          {...collectedProps}
                      />
                      <MoorhenContextQuickEditButton 
                          icon={<img style={{padding:'0.1rem', width:'100%', height: '100%'}} className="baby-gru-button-icon" src={`${props.urlPrefix}/baby-gru/pixmaps/spin-view.svg`} alt='Eigen flip'/>}
                          toolTipLabel={props.shortCuts ? `Eigen Flip: flip the ligand around its eigenvectors ${getTooltipShortcutLabel(JSON.parse(props.shortCuts).eigen_flip)}` : "Eigen Flip: flip the ligand around its eigenvectors"}
                          cootCommandInput={{
                              message: 'coot_command',
                              returnType: "status",
                              command: 'eigen_flip_ligand',
                              commandArgs: [selectedMolecule.molNo, `//${chosenAtom.chain_id}/${chosenAtom.res_no}`],
                              changesMolecules: [selectedMolecule.molNo]
                          }}
                          {...collectedProps}
                      />
                      <MoorhenContextQuickEditButton 
                          icon={<img style={{padding:'0.1rem', width:'100%', height: '100%'}} className="baby-gru-button-icon" src={`${props.urlPrefix}/baby-gru/pixmaps/edit-chi.svg`} alt='jed-flip'/>}
                          toolTipLabel="JED Flip: wag the tail"
                          cootCommandInput={{
                              message: 'coot_command',
                              returnType: "status",
                              command: 'jed_flip',
                              commandArgs: [selectedMolecule.molNo, `//${chosenAtom.chain_id}/${chosenAtom.res_no}/${chosenAtom.atom_name}${chosenAtom.alt_conf === "" ? "" : ":" + chosenAtom.alt_conf}`, false],
                              changesMolecules: [selectedMolecule.molNo]
                          }}
                          {...collectedProps}
                      />
                      <MoorhenContextQuickEditButton 
                          icon={<img style={{padding:'0.1rem', width:'100%', height: '100%'}} className="baby-gru-button-icon" src={`${props.urlPrefix}/baby-gru/pixmaps/jed-flip-reverse.svg`} alt='jed-flip-reverse'/>}
                          toolTipLabel="JED Flip: wag the dog"
                          cootCommandInput={{
                              message: 'coot_command',
                              returnType: "status",
                              command: 'jed_flip',
                              commandArgs: [selectedMolecule.molNo, `//${chosenAtom.chain_id}/${chosenAtom.res_no}/${chosenAtom.atom_name}${chosenAtom.alt_conf === "" ? "" : ":" + chosenAtom.alt_conf}`, true],
                              changesMolecules: [selectedMolecule.molNo]
                          }}
                          {...collectedProps}
                      />
                      <MoorhenContextQuickEditButton 
                          icon={<img style={{padding:'0.1rem', width:'100%', height: '100%'}} alt="rotate/translate" className="baby-gru-button-icon" src={`${props.urlPrefix}/baby-gru/pixmaps/rtz.svg`}/>}
                          toolTipLabel="Rotate/Translate zone"
                          popoverSettings={{
                            label: 'Rotate/translate mode...',
                            options: ['ATOM', 'RESIDUE', 'CHAIN', 'MOLECULE'],
                            nonCootCommand: doRotateTranslate,
                            }}
                          {...collectedProps}
                      />
                      <MoorhenContextQuickEditButton 
                          icon={<img style={{padding:'0.1rem', width:'100%', height: '100%'}} alt="drag atoms" className="baby-gru-button-icon" src={`${props.urlPrefix}/baby-gru/pixmaps/drag.svg`}/>}
                          toolTipLabel="Drag atoms"
                          popoverSettings={{
                            label: 'Drag mode...',
                            options: ['SINGLE', 'TRIPLE', 'QUINTUPLE', 'HEPTUPLE'],
                            nonCootCommand: doDragAtoms,
                            }}
                          {...collectedProps}
                      />
                      <MoorhenContextQuickEditButton 
                          icon={<img style={{padding:'0.1rem', width:'100%', height: '100%'}} className="baby-gru-button-icon" alt="Add side chain" src={`${props.urlPrefix}/baby-gru/pixmaps/add-alt-conf.svg`}/>}
                          refineAfterMod={false}
                          toolTipLabel="Add alternative conformation"
                          cootCommandInput={{
                              message: 'coot_command',
                              returnType: "status",
                              command: 'add_alternative_conformation',
                              commandArgs:  [selectedMolecule.molNo, `/1/${chosenAtom.chain_id}/${chosenAtom.res_no}/*${chosenAtom.alt_conf === "" ? "" : ":" + chosenAtom.alt_conf}`],
                              changesMolecules: [selectedMolecule.molNo]
                          }}
                          {...collectedProps}
                      />
                      <MoorhenContextQuickEditButton 
                          icon={<img style={{padding:'0.1rem', width:'100%', height: '100%'}} className="baby-gru-button-icon" alt="Cis/Trans" src={`${props.urlPrefix}/baby-gru/pixmaps/cis-trans.svg`}/>}
                          toolTipLabel="Cis/Trans isomerisation"
                          cootCommandInput={{
                              message: 'coot_command',
                              returnType: "status",
                              command: 'cis_trans_convert',
                              commandArgs:  [selectedMolecule.molNo, `//${chosenAtom.chain_id}/${chosenAtom.res_no}/${chosenAtom.atom_name}${chosenAtom.alt_conf === "" ? "" : ":" + chosenAtom.alt_conf}`],
                              changesMolecules: [selectedMolecule.molNo]
                          }}
                          {...collectedProps}
                      />
                     </FormGroup>
                     </Tooltip>
                     </div>
                    </>
                    :
                    <>
                      <MoorhenAddSimpleMenuItem setPopoverIsShown={() => {}} popoverPlacement={menuPosition.placement} defaultBondSmoothness={0} glRef={props.glRef} molecules={props.molecules} commandCentre={props.commandCentre} changeMolecules={props.changeMolecules} backgroundColor={props.backgroundColor}/>
                      <MoorhenGetMonomerMenuItem setPopoverIsShown={() => {}} popoverPlacement={menuPosition.placement} defaultBondSmoothness={0} glRef={props.glRef} molecules={props.molecules} commandCentre={props.commandCentre} changeMolecules={props.changeMolecules} backgroundColor={props.backgroundColor}/>
                      <MoorhenFitLigandRightHereMenuItem setPopoverIsShown={() => {}} popoverPlacement={menuPosition.placement} defaultBondSmoothness={0} glRef={props.glRef} maps={props.maps} molecules={props.molecules} commandCentre={props.commandCentre} changeMolecules={props.changeMolecules} backgroundColor={props.backgroundColor} />
                      <MoorhenBackgroundColorMenuItem setPopoverIsShown={() => { }} popoverPlacement={menuPosition.placement} backgroundColor={props.backgroundColor} setBackgroundColor={props.setBackgroundColor}/>
                      <MenuItem disabled={!props.enableTimeCapsule} onClick={() => handleCreateBackup()}>Create backup</MenuItem>
                    </>
                     }
                    
                  </List>
        </ClickAwayListener>
        }
          </ContextMenu>
          <Overlay placement={menuPosition.placement} show={showOverlay} target={quickActionsFormGroupRef.current}>
              <Popover>
              <Popover.Body>
                {overlayContents}
              </Popover.Body>
            </Popover>          
          </Overlay>
          </>
        

}
