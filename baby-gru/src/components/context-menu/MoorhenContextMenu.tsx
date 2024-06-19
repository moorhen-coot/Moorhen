import styled, { css } from "styled-components";
import { ClickAwayListener, FormGroup, List, Tooltip } from '@mui/material';
import { MoorhenBackgroundColorMenuItem } from "../menu-item/MoorhenBackgroundColorMenuItem"
import { atomInfoToResSpec, convertRemToPx } from "../../utils/utils";
import { useEffect, useRef, useState, useCallback, MutableRefObject, RefObject } from "react";
import { Popover, Overlay, FormLabel, FormSelect, Button, Stack } from "react-bootstrap";
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
import { MoorhenRigidBodyFitButton } from "../button/MoorhenRigidBodyFitButton";
import { moorhen } from "../../types/moorhen";
import { JSX } from "react/jsx-runtime";
import { webGL } from "../../types/mgWebGL";
import { useSelector } from "react-redux";

const ContextMenu = styled.div`
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

const MoorhenPopoverOptions = (props: {
  showContextMenu: boolean;
  setShowOverlay: React.Dispatch<React.SetStateAction<boolean>>;
  label: string;
  options: string[];
  extraInput: (arg0: MutableRefObject<any>) => JSX.Element;
  nonCootCommand?: (arg0: moorhen.Molecule, arg1: moorhen.ResidueSpec, arg2: string) => void;
  doEdit: (arg0: moorhen.cootCommandKwargs) => void;
  formatArgs: (arg0: string, arg1: MutableRefObject<any>) => moorhen.cootCommandKwargs;
  selectedMolecule: moorhen.Molecule;
  chosenAtom: moorhen.ResidueSpec; 
}) => {

  const selectRef = useRef<null | HTMLSelectElement>(null)
  const extraInputRef = useRef(null)
  
  const handleRightClick = useCallback(() => {
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
  const [overlayContents, setOverlayContents] = useState<null | JSX.Element>(null)
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
              <MoorhenAutofitRotamerButton mode='context' {...collectedProps} />
              <MoorhenFlipPeptideButton mode='context' {...collectedProps}/>
              <MoorhenSideChain180Button mode='context' {...collectedProps}/> 
              <MoorhenRefineResiduesButton mode='context' {...collectedProps}/> 
              <MoorhenDeleteButton mode='context' {...collectedProps} />
              <MoorhenMutateButton mode='context' {...collectedProps} />
              <MoorhenAddTerminalResidueButton mode='context' {...collectedProps} />
              <MoorhenRotamerChangeButton mode='context' {...collectedProps}/>
              <MoorhenRigidBodyFitButton  mode='context' {...collectedProps}/>
              <MoorhenEigenFlipLigandButton mode='context' {...collectedProps}/>
              <MoorhenJedFlipFalseButton mode='context' {...collectedProps}/>
              <MoorhenJedFlipTrueButton mode='context' {...collectedProps}/>
              <MoorhenRotateTranslateZoneButton mode='context' {...collectedProps} />
              <MoorhenDragAtomsButton mode='context' {...collectedProps} />
              <MoorhenAddAltConfButton mode ='context' {...collectedProps} />
              <MoorhenConvertCisTransButton mode='context' {...collectedProps} />
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
