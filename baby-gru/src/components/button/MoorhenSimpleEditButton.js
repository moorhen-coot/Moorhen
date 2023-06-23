import { Tooltip } from "@mui/material";
import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { Button, Overlay, Container, Row, FormSelect, FormGroup, FormLabel, Form } from "react-bootstrap"
import { cidToSpec, convertViewtoPx } from "../../utils/MoorhenUtils";

export const MoorhenSimpleEditButton = forwardRef((props, buttonRef) => {
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

    const atomClickedCallback = useCallback(async (event) => {
        let awaitMoreAtomClicks
        if (typeof (props.awaitMoreAtomClicksRef.current) !== 'undefined') {
            awaitMoreAtomClicks = JSON.parse(JSON.stringify(props.awaitMoreAtomClicksRef.current))
        }

        const onCompleted = async (molecule, chosenAtom, result) => {
            if (props.onCompleted) {
                props.onCompleted(molecule, chosenAtom)
            }
            if (props.refineAfterMod && props.activeMap) {
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
            const scoresUpdateEvent = new CustomEvent("scoresUpdate", { detail: { origin: props.glRef.current.origin, modifiedMolecule: molecule.molNo } })
            document.dispatchEvent(scoresUpdateEvent)
            if (props.onExit) {
                props.onExit(molecule, chosenAtom, result)
            }
        }

        if (!awaitMoreAtomClicks) {
            document.removeEventListener('atomClicked', atomClickedCallback, { once: true })
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

                        result = await props.commandCentre.current.cootCommand({
                            returnType: props.returnType,
                            command: props.cootCommand,
                            commandArgs: props.formatArgs(chosenMolecule, chosenAtom, localParameters),
                            changesMolecules: props.changesMolecule ? [chosenMolecule.molNo] : []
                        }, true)

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

    }, [props.molecules, props.activeMap, props.refineAfterMod, localParameters, props.formatArgs, props.awaitMoreAtomClicksRef])

    useEffect(() => {
        props.setCursorStyle("crosshair")
        if (props.awaitAtomClick && props.selectedButtonIndex === props.buttonIndex) {
            props.setCursorStyle("crosshair")
            document.addEventListener('atomClicked', atomClickedCallback, { once: true })
        }

        return () => {
            props.setCursorStyle("default")
            document.removeEventListener('atomClicked', atomClickedCallback, { once: true })
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
            prompt && <Overlay target={buttonRef ? buttonRef.current : target.current} show={props.buttonIndex === props.selectedButtonIndex} placement="top">
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
MoorhenSimpleEditButton.defaultProps = {
    id: '', toolTip: "", setCursorStyle: () => { },
    returnType: 'status', needsAtomData: true, prompt: null,
    setSelectedButtonIndex: () => { }, selectedButtonIndex: 0,
    changesMolecule: true, refineAfterMod: false, onCompleted: null,
    awaitAtomClick: true, onExit: null, awaitMoreAtomClicksRef: false
}

export const rigidBodyFitFormatArgs = (molecule, chosenAtom, selectedMode, activeMapMolNo) => {
    const selectedSequence = molecule.sequences.find(sequence => sequence.chain === chosenAtom.chain_id)
    let selectedResidueIndex
    let commandArgs
    let start
    let stop

    if (typeof selectedSequence === 'undefined') {
        selectedMode = 'SINGLE'
    } else {
        selectedResidueIndex = selectedSequence.sequence.findIndex(residue => residue.resNum === chosenAtom.res_no)
    }

    switch (selectedMode) {
        case 'SINGLE':
            commandArgs = [
                molecule.molNo,
                `//${chosenAtom.chain_id}/${chosenAtom.res_no}`,
                activeMapMolNo
            ]
            break
        case 'TRIPLE':
            start = selectedResidueIndex !== 0 ? selectedSequence.sequence[selectedResidueIndex - 1].resNum : chosenAtom.res_no
            stop = selectedResidueIndex < selectedSequence.sequence.length - 1 ? selectedSequence.sequence[selectedResidueIndex + 1].resNum : chosenAtom.res_no
            commandArgs = [
                molecule.molNo,
                `//${chosenAtom.chain_id}/${start}-${stop}`,
                activeMapMolNo
            ]
            break
        case 'QUINTUPLE':
            start = selectedResidueIndex !== 0 ? selectedSequence.sequence[selectedResidueIndex - 2].resNum : chosenAtom.res_no
            stop = selectedResidueIndex < selectedSequence.sequence.length - 2 ? selectedSequence.sequence[selectedResidueIndex + 2].resNum : selectedSequence.sequence[selectedResidueIndex - 1].resNum
            commandArgs = [
                molecule.molNo,
                `//${chosenAtom.chain_id}/${start}-${stop}`,
                activeMapMolNo
            ]
            break
        case 'HEPTUPLE':
            start = selectedResidueIndex !== 0 ? selectedSequence.sequence[selectedResidueIndex - 3].resNum : chosenAtom.res_no
            stop = selectedResidueIndex < selectedSequence.sequence.length - 3 ? selectedSequence.sequence[selectedResidueIndex + 3].resNum : selectedSequence.sequence[selectedResidueIndex - 1].resNum
            commandArgs = [
                molecule.molNo,
                `//${chosenAtom.chain_id}/${start}-${stop}`,
                activeMapMolNo
            ]
            break
        case 'CHAIN':
            commandArgs = [
                molecule.molNo,
                `//${chosenAtom.chain_id}/*`,
                activeMapMolNo
            ]
            break
        case 'ALL':
            commandArgs = [
                molecule.molNo,
                `//*/*`,
                activeMapMolNo
            ]
            break
        default:
            console.log('Unrecognised rigid body fit mode...')
            break
    }
    return commandArgs
}

export const MoorhenRigidBodyFitButton = (props) => {
    const modeSelectRef = useRef(null)
    const selectedResidueRef = useRef(null)
    const awaitMoreAtomClicksRef = useRef(false)
    const [panelParameters, setPanelParameters] = useState('TRIPLE')
    const [randomJiggleMode, setRandomJiggleMode] = useState(false)

    useEffect(() => {
        if (props.selectedButtonIndex === props.buttonIndex && !awaitMoreAtomClicksRef.current && modeSelectRef.current?.value === 'RESIDUE RANGE' && !selectedResidueRef.current) {
            awaitMoreAtomClicksRef.current = true
        } else if (props.selectedButtonIndex !== props.buttonIndex && (selectedResidueRef.current || awaitMoreAtomClicksRef.current)) {
            awaitMoreAtomClicksRef.current = false
            const { molecule, chosenAtom } = selectedResidueRef.current
            molecule.clearBuffersOfStyle('selection', props.glRef)
            selectedResidueRef.current = null
        }
    }, [props.selectedButtonIndex])

    const doRigidBodyFitting = async (molecule, chosenAtom, pp) => {
        if (modeSelectRef.current.value === 'RESIDUE RANGE' && !selectedResidueRef.current) {
            selectedResidueRef.current = { molecule, chosenAtom }
            awaitMoreAtomClicksRef.current = false
            molecule.drawSelection(props.glRef, chosenAtom.cid)
            return
        } else if (modeSelectRef.current.value === 'RESIDUE RANGE') {
            molecule.clearBuffersOfStyle('selection', props.glRef)
            const residueRange = [parseInt(selectedResidueRef.current.chosenAtom.res_no), parseInt(chosenAtom.res_no)].sort((a, b) => { return a - b })
            const commandArgs = [
                molecule.molNo,
                `//${chosenAtom.chain_id}/${residueRange[0]}-${residueRange[1]}`,
                props.activeMap.molNo
            ]
            await props.commandCentre.current.cootCommand({
                returnType: 'status',
                command: randomJiggleMode ? 'fit_to_map_by_random_jiggle_using_cid' : 'rigid_body_fit',
                commandArgs: randomJiggleMode ? [...commandArgs.slice(0, 2), 0, -1] : commandArgs,
                changesMolecules: [molecule.molNo]
            }, true)
        } else {
            const commandArgs = rigidBodyFitFormatArgs(molecule, chosenAtom, modeSelectRef.current.value, props.activeMap.molNo)
            await props.commandCentre.current.cootCommand({
                returnType: 'status',
                command: randomJiggleMode ? 'fit_to_map_by_random_jiggle_using_cid' : 'rigid_body_fit',
                commandArgs: randomJiggleMode ? [...commandArgs.slice(0, 2), 0, -1] : commandArgs,
                changesMolecules: [molecule.molNo]
            }, true)
        }
        selectedResidueRef.current = null
    }

    const MoorhenRigidBodyFitPanel = forwardRef((props, ref) => {
        const rigidBodyModes = ['SINGLE', 'TRIPLE', 'QUINTUPLE', 'HEPTUPLE', 'RESIDUE RANGE', 'CHAIN', 'ALL']
        return <Container>
            <Row>Please click an atom for rigid body fitting</Row>
            <Row>
                <FormGroup>
                    <FormLabel>Residue selection</FormLabel>
                    <FormSelect ref={ref} defaultValue={props.panelParameters}
                        onChange={(e) => {
                            if (e.target.value === 'RESIDUE RANGE') {
                                awaitMoreAtomClicksRef.current = true
                            } else {
                                awaitMoreAtomClicksRef.current = false
                                if (selectedResidueRef.current) {
                                    const { molecule, chosenAtom } = selectedResidueRef.current
                                    molecule.clearBuffersOfStyle('selection', props.glRef)
                                    selectedResidueRef.current = null
                                }
                            }
                            props.setPanelParameters(e.target.value)
                        }}>
                        {rigidBodyModes.map(optionName => {
                            return <option key={optionName} value={optionName}>{optionName}</option>
                        })}
                    </FormSelect>
                    <Form.Check
                        style={{ paddingTop: '0.1rem' }}
                        type="switch"
                        checked={randomJiggleMode}
                        onChange={() => { setRandomJiggleMode(!randomJiggleMode) }}
                        label="Use random jiggle fit" />
                </FormGroup>
            </Row>
        </Container>
    })

    return <MoorhenSimpleEditButton {...props}
        id='rigid-body-fit-button'
        toolTip="Rigid body fit"
        buttonIndex={props.buttonIndex}
        selectedButtonIndex={props.selectedButtonIndex}
        setSelectedButtonIndex={props.setSelectedButtonIndex}
        needsMapData={true}
        nonCootCommand={doRigidBodyFitting}
        panelParameters={panelParameters}
        awaitMoreAtomClicksRef={awaitMoreAtomClicksRef}
        refineAfterMod={false}
        prompt={<MoorhenRigidBodyFitPanel
            ref={modeSelectRef}
            glRef={props.glRef}
            setPanelParameters={setPanelParameters}
            panelParameters={panelParameters} />}
        icon={<img style={{ width: '100%', height: '100%' }} className="baby-gru-button-icon" src={`${props.urlPrefix}/baby-gru/pixmaps/rigid-body.svg`} alt='Rigid body fit' />}
        formatArgs={(m, c, p) => rigidBodyFitFormatArgs(m, c, p)}
    />
}

