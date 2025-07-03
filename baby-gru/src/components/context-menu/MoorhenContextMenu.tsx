import styled, { css } from "styled-components";
import { ClickAwayListener, FormGroup, List, Tooltip } from '@mui/material';
import { MoorhenBackgroundColorMenuItem } from "../menu-item/MoorhenBackgroundColorMenuItem"
import { atomInfoToResSpec, convertRemToPx } from "../../utils/utils";
import { useEffect, useRef, useState, useCallback, RefObject } from "react";
import { Popover, Overlay } from "react-bootstrap";
import { MoorhenAddAltConfButton } from "./MoorhenAddAltConfButton"
import { MoorhenAddTerminalResidueButton } from "./MoorhenAddTerminalResidueButton"
import { MoorhenAutofitRotamerButton } from "./MoorhenAutofitRotamerButton"
import { MoorhenFlipPeptideButton } from "./MoorhenFlipPeptideButton"
import { MoorhenConvertCisTransButton } from "./MoorhenConvertCisTransButton"
import { MoorhenSideChain180Button } from "./MoorhenSideChain180Button"
import { MoorhenRefineResiduesButton } from "./MoorhenRefineResiduesButton"
import { MoorhenDeleteButton } from "./MoorhenDeleteButton"
import { MoorhenMutateButton } from "./MoorhenMutateButton";
import { MoorhenEigenFlipLigandButton } from "./MoorhenEigenFlipLigandButton";
import { MoorhenJedFlipFalseButton } from "./MoorhenJedFlipFalseButton";
import { MoorhenJedFlipTrueButton } from "./MoorhenJedFlipTrueButton";
import { MoorhenRotamerChangeButton } from "./MoorhenRotamerChangeButton";
import { MoorhenRotateTranslateZoneButton } from "./MoorhenRotateTranslateZoneButton";
import { MoorhenDragAtomsButton } from "./MoorhenDragAtomsButton";
import { MoorhenRigidBodyFitButton } from "./MoorhenRigidBodyFitButton";
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { useSelector } from "react-redux";

interface ContextMenuProps {
  top: number;
  left: number;
  opacity: number;
}

const ContextMenu = styled.div<ContextMenuProps>`
  position: absolute;
  border-radius: 5px;
  box-sizing: border-box;
  ${({ top, left, opacity }) => css`
    top: ${top}px;
    left: ${left}px;
    background-color: transparent;
    opacity: ${opacity};
    `}
`;

export const MoorhenContextMenu = (props: {
  urlPrefix: string;
  showContextMenu: false | moorhen.AtomRightClickEventInfo;
  timeCapsuleRef: React.RefObject<moorhen.TimeCapsule>;
  setShowContextMenu: React.Dispatch<React.SetStateAction<false | moorhen.AtomRightClickEventInfo>>;
  viewOnly: boolean;
  glRef: React.RefObject<webGL.MGWebGL>;
  commandCentre: RefObject<moorhen.CommandCentre>;
  monomerLibraryPath: string;
  defaultActionButtonSettings: moorhen.actionButtonSettings;
  setDefaultActionButtonSettings: (arg0: {key: string; value: string}) => void;
}) => {

  const contextMenuRef = useRef(null)
  const quickActionsFormGroupRef = useRef<HTMLInputElement>(null)
  
  const [showOverlay, setShowOverlay] = useState<boolean>(false)
  const [overlayContents, setOverlayContents] = useState<null | React.JSX.Element>(null)
  const [overrideMenuContents, setOverrideMenuContents] = useState<boolean>(false)
  const [opacity, setOpacity] = useState<number>(1.0)
  const [toolTip, setToolTip] = useState<string>('')
  
  const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)
  const width = useSelector((state: moorhen.State) => state.sceneSettings.width)
  const height = useSelector((state: moorhen.State) => state.sceneSettings.height)

  const handleContextMenu = useCallback((evt) => {
    evt.stopPropagation()
    evt.preventDefault()
    evt.stopImmediatePropagation()
  }, [])

  useEffect(() => {
    if (contextMenuRef.current) {
      const domNode = contextMenuRef.current
      domNode.addEventListener("contextmenu", handleContextMenu)
      return () => {
        domNode.removeEventListener("contextmenu", handleContextMenu)
      }  
    }
  }, [handleContextMenu, contextMenuRef]);

  let selectedMolecule: moorhen.Molecule
  let chosenAtom: moorhen.ResidueSpec
  if (props.showContextMenu && props.showContextMenu.buffer){
    selectedMolecule = molecules.find(molecule => molecule.buffersInclude(props.showContextMenu ? props.showContextMenu.buffer : null))
  }
  if (props.showContextMenu && props.showContextMenu.atom) {
    chosenAtom = atomInfoToResSpec(props.showContextMenu.atom)
  }

  // Do not show context menu unless clicked on atom. We might to revert this in the future...
  if (!chosenAtom) {
    return null
  }
  
  let top = props.showContextMenu ? props.showContextMenu.pageY : null
  let left = props.showContextMenu ? props.showContextMenu.pageX : null
  const menuWidth = selectedMolecule && chosenAtom ? convertRemToPx(19) : convertRemToPx(7)
  const menuHeight = selectedMolecule && chosenAtom ? convertRemToPx(19) : convertRemToPx(7)
  
  if (width - left < menuWidth) {
    left -= menuWidth
  }
  if (height - top < menuHeight) {
    top -= menuHeight
  }
    
  let placement: "left" | "right" = "right"
  if (width * 0.5 < left){
    placement = 'left'
  }
  
  const menuPosition = {top, left, placement}

  const collectedProps = {selectedMolecule, chosenAtom, setOverlayContents, setShowOverlay, toolTip, setToolTip, setOpacity, setOverrideMenuContents, ...props}

  return <>
      <ContextMenu ref={contextMenuRef} top={overrideMenuContents ? 0 : menuPosition.top} left={overrideMenuContents ? 0 : menuPosition.left} opacity={opacity}>
        {overrideMenuContents ? 
          overrideMenuContents 
        :
          <ClickAwayListener onClickAway={() => !showOverlay && props.setShowContextMenu(false)}>
            <List>
              {props.viewOnly ? 
                <MoorhenBackgroundColorMenuItem setPopoverIsShown={() => { }}/>
              :
              selectedMolecule && chosenAtom &&
              <div style={{ display:'flex', justifyContent: 'center' }}>
              <Tooltip className="moorhen-tooltip" title={toolTip}>
              <FormGroup ref={quickActionsFormGroupRef} style={{ justifyContent: 'center', margin: "0px", padding: "0px", width: '18rem' }} row>
              <MoorhenAutofitRotamerButton {...collectedProps} />
              <MoorhenFlipPeptideButton {...collectedProps}/>
              <MoorhenSideChain180Button {...collectedProps}/> 
              <MoorhenRefineResiduesButton {...collectedProps}/> 
              <MoorhenDeleteButton {...collectedProps} />
              <MoorhenMutateButton {...collectedProps} />
              <MoorhenAddTerminalResidueButton {...collectedProps} />
              <MoorhenRotamerChangeButton {...collectedProps}/>
              <MoorhenRigidBodyFitButton  {...collectedProps}/>
              <MoorhenEigenFlipLigandButton {...collectedProps}/>
              <MoorhenJedFlipFalseButton {...collectedProps}/>
              <MoorhenJedFlipTrueButton {...collectedProps}/>
              <MoorhenRotateTranslateZoneButton {...collectedProps} />
              <MoorhenDragAtomsButton {...collectedProps} />
              <MoorhenAddAltConfButton {...collectedProps} />
              <MoorhenConvertCisTransButton {...collectedProps} />
              </FormGroup>
              </Tooltip>
              </div>
              }
            </List>
          </ClickAwayListener>
        }
      </ContextMenu>
      {!overrideMenuContents &&
        <Overlay placement={menuPosition.placement} show={showOverlay} target={quickActionsFormGroupRef.current}>
            <Popover className="context-button-popover" style={{borderRadius: '1rem', boxShadow: '0px 2px 1px -1px rgba(0,0,0,0.2),0px 1px 1px 0px rgba(0,0,0,0.14),0px 1px 3px 0px rgba(0,0,0,0.12)'}}>
            <Popover.Body>
              {overlayContents}
            </Popover.Body>
          </Popover>
        </Overlay>
      }
    </>
        

}
