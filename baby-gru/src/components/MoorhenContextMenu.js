import styled, { css } from "styled-components";
import { ClickAwayListener, List, MenuItem } from '@mui/material';
import { MoorhenMergeMoleculesMenuItem, MoorhenGetMonomerMenuItem, MoorhenFitLigandRightHereMenuItem, MoorhenImportFSigFMenuItem } from "./MoorhenMenuItem";

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

  const top = props.showContextMenu.pageY
  const left = props.showContextMenu.pageX
  const backgroundColor = props.isDark ? '#858585' : '#ffffff' 
  let selectedMolecule
  if (props.showContextMenu.buffer){
    selectedMolecule = props.molecules.find(molecule => molecule.buffersInclude(props.showContextMenu.buffer))
  }

  // Connect to map
  // Make backup
  // show spiner even if drawer is open


  return <ContextMenu top={top} left={left} backgroundColor={backgroundColor}>
              <ClickAwayListener onClickAway={() => props.setShowContextMenu(false)}>
                  <List>
                    {selectedMolecule ?
                    <>
                     <MoorhenMergeMoleculesMenuItem glRef={props.glRef} molecules={props.molecules} setPopoverIsShown={() => {}} menuItemText="Merge molecule into..." popoverPlacement='right' fromMolNo={selectedMolecule.molNo}/>
                     <MenuItem onClick={() => handleRemoveHydrogens(selectedMolecule)}>Remove hydrogens</MenuItem>
                     <MoorhenImportFSigFMenuItem glRef={props.glRef} molecules={props.molecules} setPopoverIsShown={() => {}} selectedMolNo={selectedMolecule.molNo} maps={props.maps} commandCentre={props.commandCentre} />
                     <MenuItem onClick={() => handleCreateBackup()}>Create backup</MenuItem>
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