import { Tooltip } from "@mui/material";
import React, { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { Button, Overlay } from "react-bootstrap"
import { cidToSpec, convertViewtoPx } from "../../utils/MoorhenUtils";
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";

type MoorhenEditButtonProps = {
    id?: string;
    prompt?: string | JSX.Element;
    panelParameters?: any;
    awaitMoreAtomClicksRef?: React.RefObject<boolean> | boolean;
    onCompleted?: (arg0: moorhen.Molecule, arg2: moorhen.ResidueSpec) => void;
    onExit?: (arg0: moorhen.Molecule, arg2: moorhen.ResidueSpec, arg3: any) => void;
    enableRefineAfterMod: boolean;
    refineAfterMod?: boolean;
    glRef: React.RefObject<webGL.MGWebGL>;
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    activeMap: moorhen.Map;
    molecules: moorhen.Molecule[];
    cootCommand?: boolean;
    timeCapsuleRef: React.RefObject<moorhen.TimeCapsule>;
    nonCootCommand?: (arg0: moorhen.Molecule, arg2: moorhen.ResidueSpec, arg3: string) => any;
    setCursorStyle?: React.Dispatch<React.SetStateAction<string>>;
    setSelectedButtonIndex?: React.Dispatch<React.SetStateAction<string>>;
    buttonIndex: string;
    getCootCommandInput?: (arg0: moorhen.Molecule, arg2: moorhen.ResidueSpec, arg3: string) => moorhen.cootCommandKwargs;
    selectedButtonIndex?: string;
    awaitAtomClick?: boolean;
    toolTip?: string;
    windowHeight: number;
    needsMapData?: boolean;
    needsAtomData?: boolean;
    icon: JSX.Element;
}

export const MoorhenEditButtonBase = forwardRef<HTMLButtonElement, MoorhenEditButtonProps>((props, buttonRef) => {
    const target = useRef<null | HTMLButtonElement>(null)
    const [prompt, setPrompt] = useState<null | string | JSX.Element>(null)
    const [localParameters, setLocalParameters] = useState<string>('')

    useEffect(() => {
        setPrompt(props.prompt)
    }, [props.prompt])

    useEffect(() => {
        setLocalParameters(props.panelParameters)
    }, [])

    useEffect(() => {
        setLocalParameters(props.panelParameters)
    }, [props.panelParameters])

    const atomClickedCallback = useCallback(async (event: moorhen.AtomClickedEvent) => {
        let awaitMoreAtomClicks: boolean
        if (typeof (props.awaitMoreAtomClicksRef) !== 'boolean' && typeof (props.awaitMoreAtomClicksRef.current) !== 'undefined') {
            awaitMoreAtomClicks = JSON.parse(JSON.stringify(props.awaitMoreAtomClicksRef.current))
        }

        const onCompleted = async (molecule: moorhen.Molecule, chosenAtom: moorhen.ResidueSpec, result: any) => {
            if (props.onCompleted) {
                props.onCompleted(molecule, chosenAtom)
            }
            if (props.refineAfterMod && props.enableRefineAfterMod && props.activeMap) {
                try {
                    await props.commandCentre.current.cootCommand({
                        returnType: "status",
                        command: 'refine_residues_using_atom_cid',
                        commandArgs: [molecule.molNo, `//${chosenAtom.chain_id}/${chosenAtom.res_no}`, 'TRIPLE', 4000],
                        changesMolecules: [molecule.molNo]
                    }, true)
                }
                catch (err) {
                    console.log(`Exception raised in Refine [${err}]`)
                }
            }
            molecule.setAtomsDirty(true)
            molecule.clearBuffersOfStyle('hover', props.glRef)
            await molecule.redraw(props.glRef)
            const scoresUpdateEvent: moorhen.ScoresUpdateEvent = new CustomEvent("scoresUpdate", { detail: { origin: props.glRef.current.origin, modifiedMolecule: molecule.molNo } })
            document.dispatchEvent(scoresUpdateEvent)
            if (props.onExit) {
                props.onExit(molecule, chosenAtom, result)
            }
        }

        if (!awaitMoreAtomClicks) {
            document.removeEventListener('atomClicked', atomClickedCallback)
        }

        const chosenMolecule = props.molecules.find(molecule => molecule.buffersInclude(event.detail.buffer))
        if (typeof chosenMolecule !== 'undefined') {
            let result
            try {
                if (chosenMolecule.buffersInclude(event.detail.buffer)) {
                    props.setCursorStyle("default")
                    const chosenAtom = cidToSpec(event.detail.atom.label)
                    if (!awaitMoreAtomClicks) {
                        props.setSelectedButtonIndex(null)
                    }
                    if (props.cootCommand) {
                        const cootCommandInput = props.getCootCommandInput(chosenMolecule, chosenAtom, localParameters)
                        result = await props.commandCentre.current.cootCommand(cootCommandInput, true)
                    } else if (props.nonCootCommand) {
                        result = await props.nonCootCommand(chosenMolecule, chosenAtom, localParameters)
                    }
                    if (!awaitMoreAtomClicks) {
                        onCompleted(chosenMolecule, chosenAtom, result)
                        props.timeCapsuleRef.current.addModification()
                    }
                }
            } catch (err) {
                console.log('Encountered', err)
            }
        }

    }, [props.molecules, props.activeMap, props.refineAfterMod, props.enableRefineAfterMod, localParameters, props.getCootCommandInput, props.awaitMoreAtomClicksRef])

    useEffect(() => {
        props.setCursorStyle("crosshair")
        if (props.awaitAtomClick && props.selectedButtonIndex === props.buttonIndex) {
            props.setCursorStyle("crosshair")
            document.addEventListener('atomClicked', atomClickedCallback, { once: true })
        }

        return () => {
            props.setCursorStyle("default")
            document.removeEventListener('atomClicked', atomClickedCallback)
        }
    }, [props.selectedButtonIndex, atomClickedCallback])

    const buttonSize = Math.max(convertViewtoPx(5, props.windowHeight), 40)

    return <>
        <Tooltip title={(props.needsMapData && !props.activeMap) || (props.needsAtomData && props.molecules.length === 0) ? '' : props.toolTip}>
            <div >
                <Button value={props.buttonIndex}
                    id={props.id}
                    size="sm"
                    ref={buttonRef ? buttonRef : target}
                    active={props.buttonIndex === props.selectedButtonIndex}
                    variant='light'
                    style={{ width: buttonSize, height: buttonSize, padding: '0rem', borderColor: props.buttonIndex === props.selectedButtonIndex ? 'red' : '' }}
                    disabled={props.needsMapData && !props.activeMap ||
                        (props.needsAtomData && props.molecules.length === 0)}
                    onClick={(evt) => {
                        props.setSelectedButtonIndex(props.buttonIndex !== props.selectedButtonIndex ? props.buttonIndex : null)
                    }}>
                    {props.icon}
                </Button>
            </div>
        </Tooltip>

        {
            prompt && <Overlay target={(buttonRef && buttonRef !== null && typeof buttonRef !== 'function') ? buttonRef.current : target.current} show={props.buttonIndex === props.selectedButtonIndex} placement="top">
                {({ placement, arrowProps, show: _show, popper, ...props }) => (
                    <div
                        {...props}
                        style={{
                            position: 'absolute',
                            marginBottom: '0.1rem',
                            backgroundColor: 'rgba(150, 200, 150, 0.5)',
                            padding: '2px 10px',
                            color: 'black',
                            borderRadius: 3,
                            zIndex: 9999,
                            ...props.style,
                        }}
                    >{prompt}
                    </div>
                )}
            </Overlay>
        }
    </>
})

MoorhenEditButtonBase.defaultProps = {
    id: '', toolTip: "", setCursorStyle: () => { },
    needsAtomData: true, prompt: null, cootCommand: true,
    setSelectedButtonIndex: () => { }, selectedButtonIndex: '0',
    refineAfterMod: false, onCompleted: null, 
    awaitAtomClick: true, onExit: null, awaitMoreAtomClicksRef: false
}
