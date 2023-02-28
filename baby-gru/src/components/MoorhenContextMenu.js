import styled, { css } from "styled-components";
import { ClickAwayListener, List, MenuItem } from '@mui/material';
import { MoorhenMergeMoleculesMenuItem } from "./MoorhenMenuItem";
import { isDarkBackground } from '../WebGLgComponents/mgWebGL.js';

const ContextMenu = styled.div`
  position: absolute;
  width: 200px;
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



  const top = props.showContextMenu.pageY
  const left = props.showContextMenu.pageX
  const backgroundColor = isDarkBackground(...props.backgroundColor) ? '#858585' : '#ffffff' 
  let selectedMolecule
  if (props.showContextMenu.buffer){
    selectedMolecule = props.molecules.find(molecule => molecule.buffersInclude(props.showContextMenu.buffer))
  }
  
  return <ContextMenu top={top} left={left} backgroundColor={backgroundColor}>
              <ClickAwayListener onClickAway={() => props.setShowContextMenu(false)}>
                  <List>
                    {selectedMolecule && <MoorhenMergeMoleculesMenuItem key={'merge-molecules'} glRef={props.glRef} molecules={props.molecules} setPopoverIsShown={() => {}} menuItemText="Merge molecule into..." popoverPlacement='right' fromMolNo={selectedMolecule.molNo}/>}
                    <MenuItem>Copy</MenuItem>
                    <MenuItem>Delete</MenuItem>
                  </List>
              </ClickAwayListener>
          </ContextMenu>

}