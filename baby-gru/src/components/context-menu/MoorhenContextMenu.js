import styled, { css } from "styled-components";
import { ClickAwayListener, FormGroup, IconButton, List, MenuItem, Tooltip } from '@mui/material';
import { MoorhenAddSimpleMenuItem } from "../menu-item/MoorhenAddSimpleMenuItem"
import { MoorhenGetMonomerMenuItem } from "../menu-item/MoorhenGetMonomerMenuItem"
import { MoorhenFitLigandRightHereMenuItem } from "../menu-item/MoorhenFitLigandRightHereMenuItem"
import { MoorhenImportFSigFMenuItem } from "../menu-item/MoorhenImportFSigFMenuItem";
import { MoorhenMergeMoleculesMenuItem } from "../menu-item/MoorhenMergeMoleculesMenuItem"
import { MoorhenBackgroundColorMenuItem } from "../menu-item/MoorhenBackgroundColorMenuItem"
import { cidToSpec, convertRemToPx } from "../../utils/MoorhenUtils";
import { getBackupLabel } from "../../utils/MoorhenTimeCapsule"
import { useEffect, useRef, useState, useCallback } from "react";
import { Popover, Overlay, FormLabel, FormSelect, Button, Stack, Form } from "react-bootstrap";
import { rigidBodyFitFormatArgs } from "../button/MoorhenSimpleEditButton";
import { MoorhenAddAltConfButton } from "../button/MoorhenAddAltConfButton"
import { MoorhenAddTerminalResidueButton } from "../button/MoorhenAddTerminalResidueButton"
import { MoorhenAutofitRotamerButton } from "../button/MoorhenAutofitRotamerButton"
import { MoorhenFlipPeptideButton } from "../button/MoorhenFlipPeptideButton"
import { MoorhenConvertCisTransButton } from "../button/MoorhenConvertCisTransButton"
import { MoorhenSideChain180Button } from "../button/MoorhenSideChain180Button"
import { MoorhenRefineResiduesButton } from "../button/MoorhenRefineResiduesButton"
import { MoorhenDeleteButton } from "../button/MoorhenDeleteButton"
import { MoorhenMutateButton } from "../button/MoorhenMutateButton";
import { MoorhenEigenFlipLigandButton } from "../button/MoorhenEigenFlipLigandButton";
import { MoorhenJedFlipFalseButton } from "../button/MoorhenJedFlipFalseButton";
import { MoorhenJedFlipTrueButton } from "../button/MoorhenJedFlipTrueButton";
import { MoorhenRotamerChangeButton } from "../button/MoorhenRotamerChangeButton";
import { MoorhenRotateTranslateZoneButton } from "../button/MoorhenRotateTranslateZoneButton";
import { MoorhenDragAtomsButton } from "../button/MoorhenDragAtomsButton";

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

  const collectedProps = {selectedMolecule, chosenAtom, setOverlayContents, setShowOverlay, toolTip, setToolTip, setOpacity, setOverrideMenuContents, ...props}

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
                      <MoorhenAutofitRotamerButton mode='context' {...collectedProps} />
                      <MoorhenFlipPeptideButton mode='context' {...collectedProps}/>
                      <MoorhenSideChain180Button mode='context' {...collectedProps}/> 
                      <MoorhenRefineResiduesButton mode='context' {...collectedProps}/> 
                      <MoorhenDeleteButton mode='context' {...collectedProps} />
                      <MoorhenMutateButton mode='context' {...collectedProps} />
                      <MoorhenAddTerminalResidueButton mode='context' {...collectedProps} />
                      <MoorhenRotamerChangeButton mode='context' {...collectedProps}/>
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
                      <MoorhenEigenFlipLigandButton mode='context' {...collectedProps}/>
                      <MoorhenJedFlipFalseButton mode='context' {...collectedProps}/>
                      <MoorhenJedFlipTrueButton mode='context' {...collectedProps}/>
                      <MoorhenRotateTranslateZoneButton mode='context' {...collectedProps} />
                      <MoorhenDragAtomsButton mode='context' {...collectedProps}
                      />
                      <MoorhenAddAltConfButton mode ='context' {...collectedProps} />
                      <MoorhenConvertCisTransButton mode='context' {...collectedProps} />
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
