import styled, { css } from "styled-components";
import { ClickAwayListener, FormGroup, IconButton, List, MenuItem, Tooltip } from '@mui/material';
import { MoorhenMergeMoleculesMenuItem, MoorhenGetMonomerMenuItem, MoorhenFitLigandRightHereMenuItem, MoorhenImportFSigFMenuItem } from "./MoorhenMenuItem";
import { cidToSpec, convertViewtoPx, getTooltipShortcutLabel } from "../utils/MoorhenUtils";
import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { Button, Overlay } from "react-bootstrap"

const ContextMenu = styled.div`
  position: absolute;
  
  border-radius: 5px;
  box-sizing: border-box;
  border-color: #4a4a4a;
  border-width: 1px;
  border-style: solid;
  ${({ top, left, backgroundColor }) => css`
    top: ${top}px;
    left: ${left}px;
    background-color: ${backgroundColor};
    `}
`;

const MoorhenContextQuickEditButton = (props) => {
  const target = useRef(null)
  const [prompt, setPrompt] = useState(null)
  const [localParameters, setLocalParameters] = useState({})

  useEffect(() => {
      setPrompt(props.prompt)
  }, [props.prompt])

  useEffect(() => {
      setLocalParameters(props.panelParameters)
  }, [])

  useEffect(() => {
      setLocalParameters(props.panelParameters)
  }, [props.panelParameters])

  const handleClick = async () => {
    const cootResult = await props.commandCentre.current.cootCommand(props.cootCommandInput)
   
    if (props.refineAfterMod && props.activeMap) {
      try {
          await props.commandCentre.current.cootCommand({
              returnType: "status",
              command: 'refine_residues_using_atom_cid',
              commandArgs: [ props.selectedMolecule.molNo, `//${props.chosenAtom.chain_id}/${props.chosenAtom.res_no}`, 'TRIPLE'],
              changesMolecules: [props.selectedMolecule.molNo]
          }, true)
      }
      catch (err) {
          console.log(`Exception raised in Refine [${err}]`)
      }
    }

    const mapUpdateEvent = new CustomEvent("mapUpdate", { detail: { origin: props.glRef.current.origin, modifiedMolecule: props.selectedMolecule.molNo } })
    document.dispatchEvent(mapUpdateEvent)
    props.selectedMolecule.setAtomsDirty(true)
    await Promise.all([
      props.selectedMolecule.redraw(props.glRef),
      props.timeCapsuleRef.current.addModification() 
    ])

    if(props.onExit) {
      props.onExit(props.selectedMolecule, cootResult)
    }

    props.setShowContextMenu(false)
  }

  return <>
          <Tooltip title={(props.needsMapData && !props.activeMap) || (props.needsAtomData && props.molecules.length === 0) ? '' : props.toolTip}>
              <IconButton 
                onClick={handleClick}
                style={{width:'2rem', height: '2rem', margin: 0, paddingRight: 0, paddingTop: 0, paddingBottom: 0, paddingLeft: '0.1rem'}}
                disabled={props.needsMapData && !props.activeMap || (props.needsAtomData && props.molecules.length === 0)}
              >
                {props.icon}
              </IconButton>
          </Tooltip>
        </>
}

MoorhenContextQuickEditButton.defaultProps = {
  needsMapData: false, needsAtomData: true, refineAfterMod: false, onExit: null
}

export const MoorhenContextMenu = (props) => {

  const handleRemoveHydrogens = async (selectedMolecule) => {
    await props.commandCentre.current.cootCommand({
      message: 'coot_command',
      command: 'delete_hydrogen_atoms',
      returnType: 'status',
      commandArgs: [selectedMolecule.molNo]
    })

    selectedMolecule.setAtomsDirty(true)
    selectedMolecule.redraw(props.glRef)
    props.setShowContextMenu(false)
  }

  const handleCreateBackup = async () => {
    const session = await props.timeCapsuleRef.current.fetchSession()
    const sessionString = JSON.stringify(session)
    const key = {dateTime: `${Date.now()}`, type: 'manual', name: '', molNames: session.moleculesNames}
    const keyString = JSON.stringify(key)
    await props.timeCapsuleRef.current.createBackup(keyString, sessionString)
    props.setShowContextMenu(false)
  }

  const deleteMoleculeIfEmpty = (molecule, cootResult) => {
    if (cootResult.data.result.result.second < 1) {
        console.log('Empty molecule detected, deleting it now...')
        molecule.delete(props.glRef)
        props.changeMolecules({ action: 'Remove', item: molecule })
    }
  }

  const top = props.showContextMenu.pageY
  const left = props.showContextMenu.pageX
  const backgroundColor = props.isDark ? '#858585' : '#ffffff' 
  let selectedMolecule
  let chosenAtom
  if (props.showContextMenu.buffer){
    selectedMolecule = props.molecules.find(molecule => molecule.buffersInclude(props.showContextMenu.buffer))
  }
  if (props.showContextMenu.atom) {
    chosenAtom = cidToSpec(props.showContextMenu.atom.label)
  }

  return <ContextMenu top={top} left={left} backgroundColor={backgroundColor}>
              <ClickAwayListener onClickAway={() => props.setShowContextMenu(false)}>
                  <List>
                    {selectedMolecule && chosenAtom ?
                    <>
                     <MoorhenMergeMoleculesMenuItem glRef={props.glRef} molecules={props.molecules} setPopoverIsShown={() => {}} menuItemText="Merge molecule into..." popoverPlacement='right' fromMolNo={selectedMolecule.molNo}/>
                     <MenuItem onClick={() => handleRemoveHydrogens(selectedMolecule)}>Remove hydrogens</MenuItem>
                     <MoorhenImportFSigFMenuItem glRef={props.glRef} molecules={props.molecules} setPopoverIsShown={() => {}} selectedMolNo={selectedMolecule.molNo} maps={props.maps} commandCentre={props.commandCentre} />
                     <MenuItem onClick={() => handleCreateBackup()}>Create backup</MenuItem>
                     <hr></hr>
                     <FormGroup style={{ margin: "0px", padding: "0px", width: '20rem' }} row>
                      <MoorhenContextQuickEditButton 
                          toolTip={props.shortCuts ? `Auto-fit Rotamer ${getTooltipShortcutLabel(JSON.parse(props.shortCuts).auto_fit_rotamer)}` : "Auto-fit Rotamer"}
                          icon={<img style={{width:'100%', height: '100%'}} src={`${props.urlPrefix}/baby-gru/pixmaps/auto-fit-rotamer.svg`} alt='Auto-Fit rotamer'/>}
                          needsMapData={true}
                          selectedMolecule={selectedMolecule}
                          chosenAtom={chosenAtom}
                          cootCommandInput={{
                              message: 'coot_command',
                              returnType: "status",
                              command: 'fill_partial_residue',
                              commandArgs: [selectedMolecule.molNo, chosenAtom.chain_id, chosenAtom.res_no, chosenAtom.ins_code],
                              changesMolecules: [selectedMolecule.molNo]
                          }}
                          {...props}
                      />
                      <MoorhenContextQuickEditButton 
                          icon={<img style={{width:'100%', height: '100%'}} src={`${props.urlPrefix}/baby-gru/pixmaps/flip-peptide.svg`} alt='Flip peptide'/>}
                          needsMapData={true}
                          selectedMolecule={selectedMolecule}
                          chosenAtom={chosenAtom}
                          toolTip={props.shortCuts ? `Flip Peptide ${getTooltipShortcutLabel(JSON.parse(props.shortCuts).flip_peptide)}` : "Flip Peptide"}
                          cootCommandInput={{
                              message: 'coot_command',
                              returnType: "status",
                              command: 'flipPeptide_cid',
                              commandArgs: [selectedMolecule.molNo, `//${chosenAtom.chain_id}/${chosenAtom.res_no}/${chosenAtom.atom_name}`, ''],
                              changesMolecules: [selectedMolecule.molNo]
                          }}
                          {...props}
                      />
                      <MoorhenContextQuickEditButton 
                          icon={<img style={{width:'100%', height: '100%'}} className="baby-gru-button-icon" src={`${props.urlPrefix}/baby-gru/pixmaps/side-chain-180.svg`} alt='Rotate Side-chain'/>}
                          selectedMolecule={selectedMolecule}
                          chosenAtom={chosenAtom}
                          toolTip="Rotate side-chain 180 degrees"
                          cootCommandInput={{
                              message: 'coot_command',
                              returnType: "status",
                              command: 'side_chain_180',
                              commandArgs: [selectedMolecule.molNo, `//${chosenAtom.chain_id}/${chosenAtom.res_no}`],
                              changesMolecules: [selectedMolecule.molNo]
                          }}
                          {...props}
                      />
                      <MoorhenContextQuickEditButton 
                          icon={<img style={{width:'100%', height: '100%'}} className="baby-gru-button-icon" src={`${props.urlPrefix}/baby-gru/pixmaps/refine-1.svg`} alt='Refine Residues'/>}
                          selectedMolecule={selectedMolecule}
                          chosenAtom={chosenAtom}
                          needsMapData={true}
                          refineAfterMod={false}
                          toolTip={props.shortCuts ? `Refine Residues ${getTooltipShortcutLabel(JSON.parse(props.shortCuts).triple_refine)}` : "Refine Residues"}
                          cootCommandInput={{
                              message: 'coot_command',
                              returnType: "status",
                              command: 'refine_residues_using_atom_cid',
                              commandArgs: [ selectedMolecule.molNo, `//${chosenAtom.chain_id}/${chosenAtom.res_no}`, 'TRIPLE'],
                              changesMolecules: [selectedMolecule.molNo]
                          }}
                          {...props}
                      />
                      <MoorhenContextQuickEditButton 
                          icon={<img style={{width:'100%', height: '100%'}} className="baby-gru-button-icon" src={`${props.urlPrefix}/baby-gru/pixmaps/delete.svg`} alt="delete-item"/>}
                          selectedMolecule={selectedMolecule}
                          chosenAtom={chosenAtom}
                          refineAfterMod={false}
                          toolTip={props.shortCuts ? `Delete Item ${getTooltipShortcutLabel(JSON.parse(props.shortCuts).delete_residue)}` : "Delete Item"}
                          onExit={deleteMoleculeIfEmpty}
                          cootCommandInput={{
                              message: 'coot_command',
                              returnType: "status",
                              command: 'delete_using_cid',
                              commandArgs: [selectedMolecule.molNo, `/1/${chosenAtom.chain_id}/${chosenAtom.res_no}/*${chosenAtom.alt_conf === "" ? "" : ":" + chosenAtom.alt_conf}`, 'LITERAL'],
                              changesMolecules: [selectedMolecule.molNo]
                          }}
                          {...props}
                      />
                      <MoorhenContextQuickEditButton 
                          icon={<img style={{width:'100%', height: '100%'}} className="baby-gru-button-icon" src={`${props.urlPrefix}/baby-gru/pixmaps/add-peptide-1.svg`} alt='Add Residue'/>}
                          selectedMolecule={selectedMolecule}
                          chosenAtom={chosenAtom}
                          needsMapData={true}
                          toolTip={props.shortCuts ? `Add Residue ${getTooltipShortcutLabel(JSON.parse(props.shortCuts).add_terminal_residue)}` : "Add Residue"}
                          cootCommandInput={{
                              message: 'coot_command',
                              returnType: "status",
                              command: 'add_terminal_residue_directly_using_cid',
                              commandArgs: [selectedMolecule.molNo, `//${chosenAtom.chain_id}/${chosenAtom.res_no}`],
                              changesMolecules: [selectedMolecule.molNo]
                          }}
                          {...props}
                      />
                      <MoorhenContextQuickEditButton 
                          icon={<img style={{width:'100%', height: '100%'}} className="baby-gru-button-icon" src={`${props.urlPrefix}/baby-gru/pixmaps/spin-view.svg`} alt='Eigen flip'/>}
                          selectedMolecule={selectedMolecule}
                          chosenAtom={chosenAtom}
                          toolTip={props.shortCuts ? `Eigen Flip: flip the ligand around its eigenvectors ${getTooltipShortcutLabel(JSON.parse(props.shortCuts).eigen_flip)}` : "Eigen Flip: flip the ligand around its eigenvectors"}
                          cootCommandInput={{
                              message: 'coot_command',
                              returnType: "status",
                              command: 'eigen_flip_ligand',
                              commandArgs: [selectedMolecule.molNo, `//${chosenAtom.chain_id}/${chosenAtom.res_no}`],
                              changesMolecules: [selectedMolecule.molNo]
                          }}
                          {...props}
                      />
                      <MoorhenContextQuickEditButton 
                          icon={<img style={{width:'100%', height: '100%'}} className="baby-gru-button-icon" src={`${props.urlPrefix}/baby-gru/pixmaps/edit-chi.svg`} alt='jed-flip'/>}
                          selectedMolecule={selectedMolecule}
                          chosenAtom={chosenAtom}
                          toolTip="JED Flip: wag the tail"
                          cootCommandInput={{
                              message: 'coot_command',
                              returnType: "status",
                              command: 'jed_flip',
                              commandArgs: [selectedMolecule.molNo, `//${chosenAtom.chain_id}/${chosenAtom.res_no}/${chosenAtom.atom_name}${chosenAtom.alt_conf === "" ? "" : ":" + chosenAtom.alt_conf}`, false],
                              changesMolecules: [selectedMolecule.molNo]
                          }}
                          {...props}
                      />
                      <MoorhenContextQuickEditButton 
                          icon={<img style={{width:'100%', height: '100%'}} className="baby-gru-button-icon" src={`${props.urlPrefix}/baby-gru/pixmaps/jed-flip-reverse.svg`} alt='jed-flip-reverse'/>}
                          selectedMolecule={selectedMolecule}
                          chosenAtom={chosenAtom}
                          toolTip="JED Flip: wag the dog"
                          cootCommandInput={{
                              message: 'coot_command',
                              returnType: "status",
                              command: 'jed_flip',
                              commandArgs: [selectedMolecule.molNo, `//${chosenAtom.chain_id}/${chosenAtom.res_no}/${chosenAtom.atom_name}${chosenAtom.alt_conf === "" ? "" : ":" + chosenAtom.alt_conf}`, true],
                              changesMolecules: [selectedMolecule.molNo]
                          }}
                          {...props}
                      />
                      <MoorhenContextQuickEditButton 
                          icon={<img style={{width:'100%', height: '100%'}} className="baby-gru-button-icon" alt="Add side chain" src={`${props.urlPrefix}/baby-gru/pixmaps/add-alt-conf.svg`}/>}
                          selectedMolecule={selectedMolecule}
                          chosenAtom={chosenAtom}
                          refineAfterMod={false}
                          toolTip="Add alternative conformation"
                          cootCommandInput={{
                              message: 'coot_command',
                              returnType: "status",
                              command: 'add_alternative_conformation',
                              commandArgs:  [selectedMolecule.molNo, `/1/${chosenAtom.chain_id}/${chosenAtom.res_no}/*${chosenAtom.alt_conf === "" ? "" : ":" + chosenAtom.alt_conf}`],
                              changesMolecules: [selectedMolecule.molNo]
                          }}
                          {...props}
                      />
                      <MoorhenContextQuickEditButton 
                          icon={<img style={{width:'100%', height: '100%'}} className="baby-gru-button-icon" alt="Cis/Trans" src={`${props.urlPrefix}/baby-gru/pixmaps/cis-trans.svg`}/>}
                          selectedMolecule={selectedMolecule}
                          chosenAtom={chosenAtom}
                          toolTip="Cis/Trans isomerisation"
                          cootCommandInput={{
                              message: 'coot_command',
                              returnType: "status",
                              command: 'cis_trans_convert',
                              commandArgs:  [selectedMolecule.molNo, `//${chosenAtom.chain_id}/${chosenAtom.res_no}/${chosenAtom.atom_name}${chosenAtom.alt_conf === "" ? "" : ":" + chosenAtom.alt_conf}`],
                              changesMolecules: [selectedMolecule.molNo]
                          }}
                          {...props}
                      />
                     </FormGroup>
                    </>
                    :
                    <>
                      <MoorhenGetMonomerMenuItem setPopoverIsShown={() => {}} defaultBondSmoothness={0} glRef={props.glRef} molecules={props.molecules} commandCentre={props.commandCentre} changeMolecules={props.changeMolecules} backgroundColor={props.backgroundColor}/>
                      <MoorhenFitLigandRightHereMenuItem setPopoverIsShown={() => {}} defaultBondSmoothness={0} glRef={props.glRef} maps={props.maps} molecules={props.molecules} commandCentre={props.commandCentre} changeMolecules={props.changeMolecules} backgroundColor={props.backgroundColor} />
                      <MenuItem onClick={() => handleCreateBackup()}>Create backup</MenuItem>
                    </>
                     }
                    
                  </List>
              </ClickAwayListener>
          </ContextMenu>

}