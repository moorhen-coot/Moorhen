import { ClickAwayListener, FormGroup, IconButton } from "@mui/material"
import { useCallback, useEffect, useRef } from "react"
import { Button, FormLabel, FormSelect, Stack } from "react-bootstrap"
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";

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
    isDark: boolean;
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    selectedMolecule: moorhen.Molecule;
    chosenAtom: moorhen.ResidueSpec;
    activeMap: moorhen.Map;
    enableRefineAfterMod: boolean;
    refineAfterMod?: boolean;
    needsMapData?: boolean;
    needsAtomData?: boolean;
    molecules: moorhen.Molecule[];
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
    
    const doEdit = async (cootCommandInput: moorhen.cootCommandKwargs) => {
        const cootResult = await props.commandCentre.current.cootCommand(cootCommandInput, true)
        
        if (props.onCompleted) {
            props.onCompleted(props.selectedMolecule, props.chosenAtom)
        }
        
        if (props.refineAfterMod && props.enableRefineAfterMod && props.activeMap) {
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
        props.selectedMolecule.clearBuffersOfStyle('hover')
        await props.selectedMolecule.redraw()
      
        if(props.onExit) {
            props.onExit(props.selectedMolecule, props.chosenAtom, cootResult)
        }
        
        props.setShowContextMenu(false)
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
            onClick={handleClick}
            onMouseEnter={() => props.setToolTip(props.toolTipLabel)}
            style={{
                boxShadow: '0px 3px 5px -1px rgba(0,0,0,0.2),0px 6px 10px 0px rgba(0,0,0,0.14),0px 1px 18px 0px rgba(0,0,0,0.12)',
                width:'4rem',
                height: '4rem',
                marginTop: '0.5rem',
                marginRight: '0.5rem',
                paddingRight: '0.5rem',
                paddingTop: '0.5rem',
                paddingBottom: '0.5rem',
                paddingLeft: '0.5rem',
                backgroundColor: props.isDark ? 'grey' : 'white'
            }}
            disabled={props.needsMapData && !props.activeMap || (props.needsAtomData && props.molecules.length === 0)}
        >
            {props.icon}
        </IconButton>
    </>
}
  
MoorhenContextButtonBase.defaultProps = {
    needsMapData: false, needsAtomData: true, 
    refineAfterMod: false, onExit: null, onCompleted: null
}
  