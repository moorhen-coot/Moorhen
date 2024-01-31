import { ClickAwayListener, FormGroup, IconButton } from "@mui/material"
import { useCallback, useEffect, useRef } from "react"
import { Button, FormLabel, FormSelect, Stack } from "react-bootstrap"
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { useDispatch, useSelector } from "react-redux";
import { triggerScoresUpdate } from "../../store/connectedMapsSlice";
import { setHoveredAtom } from "../../store/hoveringStatesSlice";

const MoorhenPopoverOptions = (props: {
    showContextMenu: false | moorhen.AtomRightClickEventInfo;
    setShowOverlay: React.Dispatch<React.SetStateAction<boolean>>;
    label: string;
    options: string[];
    extraInput?: (arg0: React.MutableRefObject<any>) => JSX.Element;
    nonCootCommand?: (arg0: moorhen.Molecule, arg1: moorhen.ResidueSpec, arg2: string) => void;
    doEdit: (arg0: moorhen.cootCommandKwargs) => void;
    getCootCommandInput?: (arg0: moorhen.Molecule, arg2: moorhen.ResidueSpec, arg3: string, arg4?: React.MutableRefObject<any>) => moorhen.cootCommandKwargs;
    selectedMolecule: moorhen.Molecule;
    chosenAtom: moorhen.ResidueSpec; 
    defaultValue?: string;
    setDefaultValue?: (arg0: string) => void;
}) => {
    
    const selectRef = useRef<HTMLSelectElement | null>(null)
    const extraInputRef = useRef(null)
    
    const handleRightClick = useCallback((e) => {
        if (props.showContextMenu) {
            props.setShowOverlay(false)
        }
    }, [])

    const handleClick = useCallback(() => {
        props.setDefaultValue(selectRef.current.value)
        if (!props.nonCootCommand) {
            props.doEdit(props.getCootCommandInput(props.selectedMolecule, props.chosenAtom, selectRef.current.value, extraInputRef))
        } else {
            props.nonCootCommand(props.selectedMolecule, props.chosenAtom, selectRef.current.value)
        }
      }, [props])
    
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
                <FormSelect key={props.label} ref={selectRef} defaultValue={props.defaultValue ? props.defaultValue : 'TRIPLE'}>
                    {props.options.map(optionName => {
                        return <option key={optionName} value={optionName}>{optionName}</option>
                    })}
                </FormSelect>
            </FormGroup>
            {props.extraInput(extraInputRef)}
            <Button onClick={handleClick}>
                OK
            </Button>
        </Stack>
    </ClickAwayListener>
    }

MoorhenPopoverOptions.defaultProps = {extraInput: () => null, nonCootCommand: false}
  

export const MoorhenContextButtonBase = (props: {
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    selectedMolecule: moorhen.Molecule;
    chosenAtom: moorhen.ResidueSpec;
    refineAfterMod?: boolean;
    needsMapData?: boolean;
    needsAtomData?: boolean;
    nonCootCommand?: (arg0: moorhen.Molecule, arg1: moorhen.ResidueSpec, arg2?: string) => Promise<void>;
    glRef: React.RefObject<webGL.MGWebGL>;
    cootCommandInput?: moorhen.cootCommandKwargs;
    setOverlayContents: React.Dispatch<React.SetStateAction<JSX.Element>>;
    setShowOverlay: React.Dispatch<React.SetStateAction<boolean>>;
    timeCapsuleRef: React.RefObject<moorhen.TimeCapsule>;
    setShowContextMenu: React.Dispatch<React.SetStateAction<false | moorhen.AtomRightClickEventInfo>>;
    onExit?: (arg0: moorhen.Molecule, arg1: moorhen.ResidueSpec, arg2: any) => void;
    onCompleted?: (arg0: moorhen.Molecule, arg1: moorhen.ResidueSpec) => void;
    icon: JSX.Element;
    setToolTip: React.Dispatch<React.SetStateAction<string>>;
    toolTipLabel: string;
    showContextMenu: false | moorhen.AtomRightClickEventInfo;
    popoverSettings?: {
        label: string;
        options: string[];
        nonCootCommand?: (arg0: moorhen.Molecule, arg1: moorhen.ResidueSpec, arg2: string) => void;
        getCootCommandInput?: (arg0: moorhen.Molecule, arg2: moorhen.ResidueSpec, arg3: string) => moorhen.cootCommandKwargs;
        extraInput?: (arg0: React.RefObject<any>) => JSX.Element;
        defaultValue?: string;
        setDefaultValue?: (arg0: string) => void;
    };
}) => {
    
    const dispatch = useDispatch()
    const molecules = useSelector((state: moorhen.State) => state.molecules)
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)
    const enableRefineAfterMod = useSelector((state: moorhen.State) => state.miscAppSettings.enableRefineAfterMod)
    const activeMap = useSelector((state: moorhen.State) => state.generalStates.activeMap)
    const animateRefine = useSelector((state: moorhen.State) => state.miscAppSettings.animateRefine)

    const doEdit = async (cootCommandInput: moorhen.cootCommandKwargs) => {
        dispatch( setHoveredAtom({molecule: null, cid: null}) )
        props.setShowContextMenu(false)
        
        const cootResult = await props.commandCentre.current.cootCommand(cootCommandInput, true)
        
        if (props.onCompleted) {
            props.onCompleted(props.selectedMolecule, props.chosenAtom)
        }
        
        if (props.refineAfterMod && enableRefineAfterMod && activeMap) {
            try {
                if (animateRefine) {
                    await props.selectedMolecule.refineResiduesUsingAtomCidAnimated(`//${props.chosenAtom.chain_id}/${props.chosenAtom.res_no}`, activeMap, 3, true, false)
                } else {
                    await props.selectedMolecule.refineResiduesUsingAtomCid(`//${props.chosenAtom.chain_id}/${props.chosenAtom.res_no}`, 'TRIPLE', 4000, true)
                }
            }
            catch (err) {
                console.log(`Exception raised in Refine [${err}]`)
            }
        } else {
            props.selectedMolecule.setAtomsDirty(true)
            await props.selectedMolecule.redraw()
        }
        
        dispatch( triggerScoresUpdate(props.selectedMolecule.molNo) )
        props.selectedMolecule.clearBuffersOfStyle('hover')
      
        if(props.onExit) {
            props.onExit(props.selectedMolecule, props.chosenAtom, cootResult)
        }        
    }
  
    const handleClick = useCallback(async () => {
      if (props.popoverSettings) {
        props.setOverlayContents(
          <MoorhenPopoverOptions {...props.popoverSettings} chosenAtom={props.chosenAtom} selectedMolecule={props.selectedMolecule} showContextMenu={props.showContextMenu} doEdit={doEdit} setShowOverlay={props.setShowOverlay}/>
        )
        setTimeout(() => props.setShowOverlay(true), 50)
      } else if (props.nonCootCommand) {
        await props.nonCootCommand(props.selectedMolecule, props.chosenAtom)
      } else if (props.cootCommandInput) {
        await doEdit(props.cootCommandInput)
      }
    }, [props])
    
    return <>
        <IconButton 
            className="moorhen-context-button"
            onClick={handleClick}
            onMouseEnter={() => props.setToolTip(props.toolTipLabel)}
            style={{ backgroundColor: isDark ? 'grey' : 'white' }}
            disabled={props.needsMapData && !activeMap || (props.needsAtomData && molecules.length === 0)}
        >
            {props.icon}
        </IconButton>
    </>
}
  
MoorhenContextButtonBase.defaultProps = {
    needsMapData: false, needsAtomData: true, 
    refineAfterMod: true, onExit: null, onCompleted: null
}
  