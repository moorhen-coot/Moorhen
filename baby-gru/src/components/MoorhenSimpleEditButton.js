import { CheckOutlined, CloseOutlined } from "@mui/icons-material";
import { MenuItem, MenuList, Tooltip } from "@mui/material";
import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { Button, Overlay, Container, Row, FormSelect, FormGroup, FormLabel, Card, Form } from "react-bootstrap"
import { MoorhenMoleculeSelect } from "./MoorhenMoleculeSelect";
import { MoorhenCidInputForm } from "./MoorhenCidInputForm";
import { cidToSpec, getTooltipShortcutLabel, residueCodesThreeToOne, convertViewtoPx } from "../utils/MoorhenUtils";

const MoorhenSimpleEditButton = forwardRef((props, buttonRef) => {
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

    const atomClickedCallback = useCallback(event => {
        let awaitMoreAtomClicks
        if (typeof(props.awaitMoreAtomClicksRef.current) !== 'undefined'){
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
                        commandArgs: [ molecule.molNo, `//${chosenAtom.chain_id}/${chosenAtom.res_no}`, 'TRIPLE'],
                        changesMolecules: [molecule.molNo]
                    }, true)
                }
                catch (err) {
                    console.log(`Exception raised in Refine [${err}]`)
                }
            }
            molecule.setAtomsDirty(true)
            molecule.redraw(props.glRef)
            const mapUpdateEvent = new CustomEvent("mapUpdate", { detail: { origin: props.glRef.current.origin, modifiedMolecule: molecule.molNo } })
            document.dispatchEvent(mapUpdateEvent)
            if (props.onExit) {
                props.onExit(molecule, chosenAtom, result)
            }
        }

        if (!awaitMoreAtomClicks) {
            document.removeEventListener('atomClicked', atomClickedCallback, { once: true })
        }

        props.molecules.forEach(async (molecule) => {
            let result
            try {
                if (molecule.buffersInclude(event.detail.buffer)) {
                    props.setCursorStyle("default")
                    const chosenAtom = cidToSpec(event.detail.atom.label)
                    if (!awaitMoreAtomClicks) {
                        props.setSelectedButtonIndex(null)
                    }
                    if (props.cootCommand) {
                        result = await props.commandCentre.current.cootCommand({
                            returnType: props.returnType,
                            command: props.cootCommand,
                            commandArgs: props.formatArgs(molecule, chosenAtom, localParameters),
                            changesMolecules: props.changesMolecule ? [molecule.molNo] : []
                        }, true)
                    } else if (props.nonCootCommand) {
                        result = await props.nonCootCommand(molecule, chosenAtom, localParameters)
                    }
                    if (!awaitMoreAtomClicks) {
                        onCompleted(molecule, chosenAtom, result)
                        props.timeCapsuleRef.current.addModification()
                    }
                }
            } catch (err) {
                console.log('Encountered', err)
            }
        })

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

export const MoorhenAutofitRotamerButton = (props) => {
    const [toolTip, setToolTip] = useState("Auto-fit Rotamer")

    useEffect(() => {
        if (props.shortCuts) {
            const shortCut = JSON.parse(props.shortCuts).auto_fit_rotamer
            setToolTip(`Auto-fit Rotamer ${getTooltipShortcutLabel(shortCut)}`)
        }
    }, [props.shortCuts])

    return <MoorhenSimpleEditButton {...props}
        id='auto-fit-rotamer-edit-button'
        toolTip={toolTip}
        buttonIndex={props.buttonIndex}
        selectedButtonIndex={props.selectedButtonIndex}
        setSelectedButtonIndex={props.setSelectedButtonIndex}
        needsMapData={true}
        cootCommand="fill_partial_residue"
        prompt="Click atom in residue to fit rotamer"
        icon={<img style={{width:'100%', height: '100%'}} className="baby-gru-button-icon" src={`${props.urlPrefix}/baby-gru/pixmaps/auto-fit-rotamer.svg`} alt='Auto-Fit rotamer' />}
        formatArgs={(molecule, chosenAtom) => {
            return [
                molecule.molNo,
                chosenAtom.chain_id,
                chosenAtom.res_no,
                chosenAtom.ins_code
            ]
        }} />
}

export const MoorhenFlipPeptideButton = (props) => {
    const [toolTip, setToolTip] = useState("Flip Peptide")

    useEffect(() => {
        if (props.shortCuts) {
            const shortCut = JSON.parse(props.shortCuts).flip_peptide
            setToolTip(`Flip Peptide ${getTooltipShortcutLabel(shortCut)}`)
        }
    }, [props.shortCuts])

    return <MoorhenSimpleEditButton {...props}
        id="flip-peptide-edit-button"
        toolTip={toolTip}
        buttonIndex={props.buttonIndex}
        selectedButtonIndex={props.selectedButtonIndex}
        setSelectedButtonIndex={props.setSelectedButtonIndex}
        needsMapData={false}
        cootCommand="flipPeptide_cid"
        prompt="Click atom in residue to flip"
        icon={<img style={{width:'100%', height: '100%'}} className="baby-gru-button-icon" src={`${props.urlPrefix}/baby-gru/pixmaps/flip-peptide.svg`} alt='Flip Peptide' />}
        formatArgs={(molecule, chosenAtom) => {
            return [molecule.molNo, `//${chosenAtom.chain_id}/${chosenAtom.res_no}/${chosenAtom.atom_name}`, '']
        }} />
}

export const MoorhenConvertCisTransButton = (props) => {
    return <MoorhenSimpleEditButton {...props}
        id='cis-trans-edit-button'
        toolTip="Cis/Trans isomerisation"
        buttonIndex={props.buttonIndex}
        selectedButtonIndex={props.selectedButtonIndex}
        setSelectedButtonIndex={props.setSelectedButtonIndex}
        needsMapData={false}
        cootCommand="cis_trans_convert"
        prompt="Click atom in residue to convert"
        icon={<img style={{width:'100%', height: '100%'}} className="baby-gru-button-icon" alt="Cis/Trans" src={`${props.urlPrefix}/baby-gru/pixmaps/cis-trans.svg`} />}
        formatArgs={(molecule, chosenAtom) => {
            return [molecule.molNo, `//${chosenAtom.chain_id}/${chosenAtom.res_no}/${chosenAtom.atom_name}${chosenAtom.alt_conf === "" ? "" : ":" + chosenAtom.alt_conf}`]
        }} />
}

export const MoorhenSideChain180Button = (props) => {
    return <MoorhenSimpleEditButton {...props}
        id='rotate-sidechain-edit-button'
        toolTip="Rotate side-chain 180 degrees"
        buttonIndex={props.buttonIndex}
        selectedButtonIndex={props.selectedButtonIndex}
        setSelectedButtonIndex={props.setSelectedButtonIndex}
        needsMapData={false}
        cootCommand="side_chain_180"
        prompt="Click atom in residue to flip sidechain"
        icon={<img style={{width:'100%', height: '100%'}} className="baby-gru-button-icon" src={`${props.urlPrefix}/baby-gru/pixmaps/side-chain-180.svg`} alt='Rotate Side-chain' />}
        formatArgs={(molecule, chosenAtom) => {
            return [molecule.molNo, `//${chosenAtom.chain_id}/${chosenAtom.res_no}`]
        }} />
}

export const MoorhenRefineResiduesUsingAtomCidButton = (props) => {
    const modeSelectRef = useRef(null)
    const selectedResidueRef = useRef(null)
    const awaitMoreAtomClicksRef = useRef(false)
    const [panelParameters, setPanelParameters] = useState('TRIPLE')
    const [toolTip, setToolTip] = useState("Refine Residues")

    useEffect(() => {
        if (props.shortCuts) {
            const shortCut = JSON.parse(props.shortCuts).triple_refine
            setToolTip(`Refine Residues ${getTooltipShortcutLabel(shortCut)}`)
        }
    }, [props.shortCuts])

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

    const doRefinement = async (molecule, chosenAtom, pp) => {
        if (modeSelectRef.current.value === 'RESIDUE RANGE' && !selectedResidueRef.current) {
            selectedResidueRef.current = { molecule, chosenAtom }
            awaitMoreAtomClicksRef.current = false
            molecule.drawSelection(props.glRef, chosenAtom.cid)
            return
        } else if (modeSelectRef.current.value === 'RESIDUE RANGE') {
            const [start, stop] = [parseInt(selectedResidueRef.current.chosenAtom.res_no), parseInt(chosenAtom.res_no)].sort((a, b) => {return a - b})
            molecule.clearBuffersOfStyle('selection', props.glRef)
            await props.commandCentre.current.cootCommand({
                returnType: 'status',
                command: 'refine_residue_range',
                commandArgs: [molecule.molNo, chosenAtom.chain_id, start, stop],
                changesMolecules: [molecule.molNo]
            }, true)
        } else {
            await props.commandCentre.current.cootCommand({
                returnType: 'status',
                command: 'refine_residues_using_atom_cid',
                commandArgs: [molecule.molNo, chosenAtom.cid, pp],
                changesMolecules: [molecule.molNo]
            }, true)
        }
        selectedResidueRef.current = null
    }

    const MoorhenRefinementPanel = forwardRef((props, ref) => {
        const refinementModes = ['SINGLE', 'TRIPLE', 'QUINTUPLE', 'HEPTUPLE', 'RESIDUE RANGE', 'SPHERE', 'BIG_SPHERE', 'CHAIN', 'ALL']
        return <Container>
            <Row>Please click an atom for centre of refinement</Row>
            <Row>
                <FormGroup>
                    <FormLabel>Refinement mode</FormLabel>
                    <FormSelect ref={ref} defaultValue={props.panelParameters}
                        onChange={(e) => {
                            if(e.target.value === 'RESIDUE RANGE'){
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
                        {refinementModes.map(optionName => {
                            return <option key={optionName} value={optionName}>{optionName}</option>
                        })}
                    </FormSelect>
                </FormGroup>
            </Row>
        </Container>
    })

    return <MoorhenSimpleEditButton {...props}
        id='refine-residues-edit-button'
        toolTip={toolTip}
        buttonIndex={props.buttonIndex}
        selectedButtonIndex={props.selectedButtonIndex}
        setSelectedButtonIndex={props.setSelectedButtonIndex}
        needsMapData={true}
        nonCootCommand={doRefinement}
        panelParameters={panelParameters}
        awaitMoreAtomClicksRef={awaitMoreAtomClicksRef}
        refineAfterMod={false}
        formatArgs={() => {}}
        prompt={<MoorhenRefinementPanel
            ref={modeSelectRef}
            glRef={props.glRef}
            setPanelParameters={setPanelParameters}
            panelParameters={panelParameters} />}
        icon={<img style={{width:'100%', height: '100%'}} className="baby-gru-button-icon" src={`${props.urlPrefix}/baby-gru/pixmaps/refine-1.svg`} alt='Refine Residues' />}
    />
}

export const MoorhenAddSideChainButton = (props) => {

    return <MoorhenSimpleEditButton {...props}
        toolTip="Add a side chain"
        buttonIndex={props.buttonIndex}
        selectedButtonIndex={props.selectedButtonIndex}
        setSelectedButtonIndex={props.setSelectedButtonIndex}
        needsMapData={true}
        cootCommand="fill_partial_residue"
        prompt="Click atom in residue to add a side chain"
        icon={<img style={{width:'100%', height: '100%'}} className="baby-gru-button-icon" alt="Add side chain" src={`${props.urlPrefix}/baby-gru/pixmaps/add-side-chain.svg`} />}
        formatArgs={(molecule, chosenAtom) => {
            return [molecule.molNo, chosenAtom.chain_id, chosenAtom.res_no, chosenAtom.ins_code]
        }} />
}

export const MoorhenAddAltConfButton = (props) => {

    return <MoorhenSimpleEditButton {...props}
        toolTip="Add alternative conformation"
        buttonIndex={props.buttonIndex}
        selectedButtonIndex={props.selectedButtonIndex}
        setSelectedButtonIndex={props.setSelectedButtonIndex}
        needsMapData={false}
        cootCommand="add_alternative_conformation"
        prompt="Click atom in residue to add alternative conformation"
        refineAfterMod={false}
        icon={<img style={{width:'100%', height: '100%'}} className="baby-gru-button-icon" alt="Add side chain" src={`${props.urlPrefix}/baby-gru/pixmaps/add-alt-conf.svg`} />}
        formatArgs={(molecule, chosenAtom) => {
            return [molecule.molNo, `/1/${chosenAtom.chain_id}/${chosenAtom.res_no}/*${chosenAtom.alt_conf === "" ? "" : ":" + chosenAtom.alt_conf}`]
        }} />
}

export const deleteFormatArgs = (molecule, chosenAtom, pp) => {
    let commandArgs
    if (pp === 'CHAIN') {
        commandArgs = [molecule.molNo, `/1/${chosenAtom.chain_id}/*/*:*`, 'LITERAL']
    } else if (pp === 'RESIDUE') {
        commandArgs = [molecule.molNo, `/1/${chosenAtom.chain_id}/${chosenAtom.res_no}/*${chosenAtom.alt_conf === "" ? "" : ":" + chosenAtom.alt_conf}`, 'LITERAL']
    } else if (pp === 'ATOM') {
        commandArgs = [molecule.molNo, `/1/${chosenAtom.chain_id}/${chosenAtom.res_no}/${chosenAtom.atom_name}${chosenAtom.alt_conf === "" ? "" : ":" + chosenAtom.alt_conf}`, 'LITERAL']
    } else if (pp === 'RESIDUE SIDE-CHAIN') {
        commandArgs = [molecule.molNo, `/1/${chosenAtom.chain_id}/${chosenAtom.res_no}/!N,CA,CB,C,O,HA,H`, 'LITERAL']
    } else if (pp === 'RESIDUE HYDROGENS') {
        commandArgs = [molecule.molNo, `/1/${chosenAtom.chain_id}/${chosenAtom.res_no}/[H,D]`, 'LITERAL']
    } else if (pp === 'MOLECULE HYDROGENS') {
        commandArgs = [molecule.molNo, `/1/*/*/[H,D]`, 'LITERAL']
    } else {
        commandArgs = [molecule.molNo, `/1/${chosenAtom.chain_id}/*/[H,D]`, 'LITERAL']
    }
    return commandArgs
}

export const MoorhenDeleteUsingCidButton = (props) => {
    const [toolTip, setToolTip] = useState("Delete Item")
    const [panelParameters, setPanelParameters] = useState('ATOM' )

    useEffect(() => {
        if (props.shortCuts) {
            const shortCut = JSON.parse(props.shortCuts).delete_residue
            setToolTip(`Delete Item ${getTooltipShortcutLabel(shortCut)}`)
        }
    }, [props.shortCuts])

    const deleteMoleculeIfEmpty = (molecule, chosenAtom, cootResult) => {
        if (cootResult.data.result.result.second < 1) {
            console.log('Empty molecule detected, deleting it now...')
            molecule.delete(props.glRef)
            props.changeMolecules({ action: 'Remove', item: molecule })
        }
    }

    const MoorhenDeletePanel = (props) => {
        const deleteModes = ['ATOM', 'RESIDUE', 'RESIDUE HYDROGENS', 'RESIDUE SIDE-CHAIN', 'CHAIN', 'CHAIN HYDROGENS', 'MOLECULE HYDROGENS']
        return <Container>
            <Row>Please click an atom for core of deletion</Row>
            <Row>
                <FormGroup>
                    <FormLabel>Delete mode</FormLabel>
                    <FormSelect defaultValue={props.panelParameters}
                        onChange={(e) => {
                            props.setPanelParameters(e.target.value)
                        }}>
                        {deleteModes.map(optionName => {
                            return <option key={optionName} value={optionName}>{optionName}</option>
                        })}
                    </FormSelect>
                </FormGroup>
            </Row>
        </Container>
    }

    return <MoorhenSimpleEditButton {...props}
        toolTip={toolTip}
        buttonIndex={props.buttonIndex}
        selectedButtonIndex={props.selectedButtonIndex}
        setSelectedButtonIndex={props.setSelectedButtonIndex}
        needsMapData={false}
        cootCommand="delete_using_cid"
        returnType="pair"
        onExit={deleteMoleculeIfEmpty}
        panelParameters={panelParameters}
        prompt={<MoorhenDeletePanel
            setPanelParameters={setPanelParameters}
            panelParameters={panelParameters} />}
        icon={<img style={{width:'100%', height: '100%'}} className="baby-gru-button-icon" src={`${props.urlPrefix}/baby-gru/pixmaps/delete.svg`} alt="delete-item"/>}
        formatArgs={(m, c, p) => deleteFormatArgs(m, c, p)}
        refineAfterMod={false} />
}

export const MoorhenMutateButton = (props) => {

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

    const [panelParameters, setPanelParameters] = useState("ALA")

    const MoorhenMutatePanel = (props) => {
        const toTypes = ['ALA', 'CYS', 'ASP', 'GLU', 'PHE', 'GLY', 'HIS', 'ILE',
            'LYS', 'LEU', 'MET', 'ASN', 'PRO', 'GLN', 'ARG', 'SER', 'THR', 'VAL', 'TRP', 'TYR']
        return <Container>
            <Row>Please identify residue to mutate</Row>
            <Row>
                <FormGroup>
                    <FormLabel>To residue of type</FormLabel>
                    <FormSelect defaultValue={props.panelParameters}
                        onChange={(e) => {
                            props.setPanelParameters(e.target.value)
                        }}>
                        {toTypes.map(optionName => {
                            return <option key={optionName} value={optionName}>{`${optionName} (${residueCodesThreeToOne[optionName]})`}</option>
                        })}
                    </FormSelect>
                </FormGroup>
            </Row>
        </Container>
    }

    const mutateFormatArgs = (molecule, chosenAtom, pp) => {
        return [molecule.molNo, `//${chosenAtom.chain_id}/${chosenAtom.res_no}`, pp]
    }

    return <MoorhenSimpleEditButton {...props}
        id='mutate-residue-edit-button'
        toolTip="Simple Mutate"
        buttonIndex={props.buttonIndex}
        selectedButtonIndex={props.selectedButtonIndex}
        setSelectedButtonIndex={props.setSelectedButtonIndex}
        needsMapData={true}
        onCompleted={autoFitRotamer}
        cootCommand="mutate"
        panelParameters={panelParameters}
        prompt={<MoorhenMutatePanel
            setPanelParameters={setPanelParameters}
            panelParameters={panelParameters} />}
        icon={<img style={{width:'100%', height: '100%'}} className="baby-gru-button-icon" src={`${props.urlPrefix}/baby-gru/pixmaps/mutate.svg`} alt='Mutate' />}
        formatArgs={(m, c, p) => mutateFormatArgs(m, c, p)} />
}

export const MoorhenAddTerminalResidueDirectlyUsingCidButton = (props) => {
    const [toolTip, setToolTip] = useState("Add Residue")

    useEffect(() => {
        if (props.shortCuts) {
            const shortCut = JSON.parse(props.shortCuts).add_terminal_residue
            setToolTip(`Add Residue ${getTooltipShortcutLabel(shortCut)}`)
        }
    }, [props.shortCuts])

    return <MoorhenSimpleEditButton {...props}
        toolTip={toolTip}
        buttonIndex={props.buttonIndex}
        selectedButtonIndex={props.selectedButtonIndex}
        setSelectedButtonIndex={props.setSelectedButtonIndex}
        needsMapData={true}
        cootCommand="add_terminal_residue_directly_using_cid"
        prompt="Click atom in residue to add a residue to that residue"
        icon={<img style={{width:'100%', height: '100%'}} className="baby-gru-button-icon" src={`${props.urlPrefix}/baby-gru/pixmaps/add-peptide-1.svg`} alt='Add Residue' />}
        formatArgs={(molecule, chosenAtom) => {
            return [molecule.molNo, `//${chosenAtom.chain_id}/${chosenAtom.res_no}`]
        }} />
}

export const MoorhenEigenFlipLigandButton = (props) => {
    const [toolTip, setToolTip] = useState("Eigen Flip: flip the ligand around its eigenvectors")

    useEffect(() => {
        if (props.shortCuts) {
            const shortCut = JSON.parse(props.shortCuts).eigen_flip
            setToolTip(`Eigen Flip: flip the ligand around its eigenvectors ${getTooltipShortcutLabel(shortCut)}`)
        }
    }, [props.shortCuts])

    return <MoorhenSimpleEditButton {...props}
        id='eigen-flip-edit-button'
        toolTip={toolTip}
        buttonIndex={props.buttonIndex}
        selectedButtonIndex={props.selectedButtonIndex}
        setSelectedButtonIndex={props.setSelectedButtonIndex}
        needsMapData={false}
        cootCommand="eigen_flip_ligand"
        prompt="Click atom in residue to eigen flip it"
        icon={<img style={{width:'100%', height: '100%'}} className="baby-gru-button-icon" src={`${props.urlPrefix}/baby-gru/pixmaps/spin-view.svg`} alt='Eigen flip' />}
        formatArgs={(molecule, chosenAtom) => {
            return [molecule.molNo, `//${chosenAtom.chain_id}/${chosenAtom.res_no}`]
        }} />
}

export const MoorhenJedFlipFalseButton = (props) => {
    return <MoorhenSimpleEditButton {...props}
        toolTip="JED Flip: wag the tail"
        buttonIndex={props.buttonIndex}
        selectedButtonIndex={props.selectedButtonIndex}
        setSelectedButtonIndex={props.setSelectedButtonIndex}
        needsMapData={false}
        cootCommand="jed_flip"
        prompt="Click atom in residue to flip around that rotatable bond - wag the tail"
        icon={<img style={{width:'100%', height: '100%'}} className="baby-gru-button-icon" src={`${props.urlPrefix}/baby-gru/pixmaps/edit-chi.svg`} alt='jed-flip'/>}
        formatArgs={(molecule, chosenAtom) => {
            return [molecule.molNo, `//${chosenAtom.chain_id}/${chosenAtom.res_no}/${chosenAtom.atom_name}${chosenAtom.alt_conf === "" ? "" : ":" + chosenAtom.alt_conf}`, false]
        }} />
}

export const MoorhenJedFlipTrueButton = (props) => {
    return <MoorhenSimpleEditButton {...props}
        toolTip="JED Flip: wag the dog"
        buttonIndex={props.buttonIndex}
        selectedButtonIndex={props.selectedButtonIndex}
        setSelectedButtonIndex={props.setSelectedButtonIndex}
        needsMapData={false}
        cootCommand="jed_flip"
        prompt="Click atom in residue to flip around that rotatable bond - wag the dog"
        icon={<img style={{width:'100%', height: '100%'}} alt="jed-flip-reverse" className="baby-gru-button-icon" src={`${props.urlPrefix}/baby-gru/pixmaps/jed-flip-reverse.svg`} />}
        formatArgs={(molecule, chosenAtom) => {
            return [molecule.molNo, `//${chosenAtom.chain_id}/${chosenAtom.res_no}/${chosenAtom.atom_name}${chosenAtom.alt_conf === "" ? "" : ":" + chosenAtom.alt_conf}`, true]
        }} />
}

export const MoorhenRotateTranslateZoneButton = (props) => {
    const [showAccept, setShowAccept] = useState(false)
    const [tips, setTips] = useState(null)
    const theButton = useRef(null)
    const fragmentMolecule = useRef(null)
    const chosenMolecule = useRef(null)
    const rotateTranslateMode = useRef('RESIDUE')
    const fragmentCid = useRef(null)
    const customCid = useRef(null)
    const { changeMolecules, backgroundColor, glRef, shortCuts, defaultBondSmoothness } = props

    const MoorhenRotateTranslatePanel = () => {
        const rotateTranslateModes = ['ATOM', 'RESIDUE', 'CHAIN', 'MOLECULE', 'CUSTOM']
        const [localRotateTranslateMode, setLocalRotateTranslateMode] = useState(rotateTranslateMode.current)
        return <Container>
            <Row>Please click an atom to define object</Row>
            <Row>
                <FormGroup>
                    <FormLabel>Rotate/translate mode</FormLabel>
                    <FormSelect defaultValue={rotateTranslateMode.current}
                        onChange={(e) => {
                            rotateTranslateMode.current = e.target.value
                            setLocalRotateTranslateMode(rotateTranslateMode.current)
                        }}>
                        {rotateTranslateModes.map(optionName => {
                            return <option key={optionName} value={optionName}>{optionName}</option>
                        })}
                    </FormSelect>
                </FormGroup>
            </Row>
            <Row>
                {localRotateTranslateMode === 'CUSTOM' && 
                    <MoorhenCidInputForm defaultValue={customCid.current} onChange={(e) => { customCid.current = e.target.value }} placeholder={customCid.current ? "" : "Input custom cid e.g. //A,B"}/>
                }
            </Row>
        </Container>
    }

    useEffect(() => {
        if (shortCuts) {
            const shortCut = JSON.parse(shortCuts).residue_camera_wiggle
            setTips(<>
                <em>{"Hold <Shift><Alt> to translate"}</em>
                <br></br>
                <em>{`Hold ${getTooltipShortcutLabel(shortCut)} to move view`}</em>
                <br></br>
                <br></br>
            </>
            )
        }
    }, [shortCuts])

    const acceptTransform = useCallback(async (e) => {
        glRef.current.setActiveMolecule(null)
        const transformedAtoms = fragmentMolecule.current.transformedCachedAtomsAsMovedAtoms(glRef)
        await chosenMolecule.current.updateWithMovedAtoms(transformedAtoms, glRef)
        changeMolecules({ action: 'Remove', item: fragmentMolecule.current })
        fragmentMolecule.current.delete(glRef)
        chosenMolecule.current.unhideAll(glRef)
        setShowAccept(false)
        const mapUpdateEvent = new CustomEvent("mapUpdate", { detail: { origin: glRef.current.origin, modifiedMolecule: chosenMolecule.current.molNo } })
        document.dispatchEvent(mapUpdateEvent)
    }, [changeMolecules, glRef])

    const rejectTransform = useCallback(async (e) => {
        glRef.current.setActiveMolecule(null)
        changeMolecules({ action: 'Remove', item: fragmentMolecule.current })
        fragmentMolecule.current.delete(glRef)
        chosenMolecule.current.unhideAll(glRef)
        setShowAccept(false)
    }, [changeMolecules, glRef])

    const nonCootCommand = async (molecule, chosenAtom, p) => {
        chosenMolecule.current = molecule
        switch (rotateTranslateMode.current) {
            case 'ATOM':
                fragmentCid.current =
                    `//${chosenAtom.chain_id}/${chosenAtom.res_no}/${chosenAtom.atom_name}${chosenAtom.alt_conf === "" ? "" : ":" + chosenAtom.alt_conf}`
                break;
            case 'RESIDUE':
                fragmentCid.current =
                    `//${chosenAtom.chain_id}/${chosenAtom.res_no}/*${chosenAtom.alt_conf === "" ? "" : ":" + chosenAtom.alt_conf}`
                break;
            case 'CHAIN':
                fragmentCid.current =
                    `//${chosenAtom.chain_id}`
                break;
            case 'MOLECULE':
                fragmentCid.current =
                    `/*/*`
                break;
            case 'CUSTOM':
                fragmentCid.current = customCid.current
                break;
            default:
                console.log('Unrecognised rotate/translate selection...')
                break;        
        }
        if (!fragmentCid.current) {
            return
        }
        chosenMolecule.current.hideCid(fragmentCid.current, glRef)
        /* Copy the component to move into a new molecule */
        const newMolecule = await molecule.copyFragmentUsingCid(
            fragmentCid.current, backgroundColor, defaultBondSmoothness, glRef, false
        )
        await newMolecule.updateAtoms()
        Object.keys(molecule.displayObjects)
            .filter(style => { return ['CRs', 'CBs', 'ligands', 'gaussian', 'MolecularSurface', 'VdWSurface', 'DishyBases'].includes(style) })
            .forEach(async style => {
                if (molecule.displayObjects[style].length > 0 &&
                    molecule.displayObjects[style][0].visible) {
                    await newMolecule.drawWithStyleFromAtoms(style, glRef)
                }
            })
        fragmentMolecule.current = newMolecule
        /* redraw */
        changeMolecules({ action: "Add", item: newMolecule })
        glRef.current.setActiveMolecule(newMolecule)
        setShowAccept(true)
    }

    return <><MoorhenSimpleEditButton ref={theButton} {...props}
        toolTip="Rotate/Translate zone"
        buttonIndex={props.buttonIndex}
        selectedButtonIndex={props.selectedButtonIndex}
        setSelectedButtonIndex={props.setSelectedButtonIndex}
        needsMapData={false}
        nonCootCommand={nonCootCommand}
        prompt={<MoorhenRotateTranslatePanel />}
        icon={<img style={{width:'100%', height: '100%'}} alt="rotate/translate" className="baby-gru-button-icon" src={`${props.urlPrefix}/baby-gru/pixmaps/rtz.svg`}/>}
        formatArgs={(molecule, chosenAtom) => {
            return [molecule.molNo, `//${chosenAtom.chain_id}/${chosenAtom.res_no}/${chosenAtom.atom_name}`, true]
        }} />
        <Overlay target={theButton.current} show={showAccept} placement="top">
            {({ placement, arrowProps, show: _show, popper, ...props }) => (
                <div
                    {...props}
                    style={{
                        position: 'absolute', padding: '2px 10px', borderRadius: 3,
                        backgroundColor: backgroundColor,
                        ...props.style,
                    }}
                >
                    <Card className="mx-2">
                        <Card.Header >Accept rotate/translate ?</Card.Header>
                        <Card.Body style={{ alignItems: 'center', alignContent: 'center', justifyContent: 'center' }}>
                            {tips}
                            <Button onClick={acceptTransform}><CheckOutlined /></Button>
                            <Button className="mx-2" onClick={rejectTransform}><CloseOutlined /></Button>
                        </Card.Body>
                    </Card>
                </div>
            )}
        </Overlay>
    </>
}

export const rigidBodyFitFormatArgs = (molecule, chosenAtom, selectedMode, activeMapMolNo) => {
    let commandArgs
    const selectedSequence = molecule.sequences.find(sequence => sequence.chain === chosenAtom.chain_id)
    const selectedResidueIndex = selectedSequence.sequence.findIndex(residue => residue.resNum === chosenAtom.res_no)
    let start
    let stop
    
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
            const residueRange = [parseInt(selectedResidueRef.current.chosenAtom.res_no), parseInt(chosenAtom.res_no)].sort((a, b) => {return a - b})
            const commandArgs = [
                molecule.molNo,
                `//${chosenAtom.chain_id}/${residueRange[0]}-${residueRange[1]}`,
                props.activeMap.molNo
            ]
            await props.commandCentre.current.cootCommand({
                returnType: 'status',
                command: randomJiggleMode ? 'fit_to_map_by_random_jiggle_using_cid' : 'rigid_body_fit',
                commandArgs: randomJiggleMode ?  [...commandArgs.slice(0, 2), 0, -1] : commandArgs,
                changesMolecules: [molecule.molNo]
            }, true)
        } else {
            const commandArgs = rigidBodyFitFormatArgs(molecule, chosenAtom, modeSelectRef.current.value, props.activeMap.molNo)
            await props.commandCentre.current.cootCommand({
                returnType: 'status',
                command: randomJiggleMode ? 'fit_to_map_by_random_jiggle_using_cid' : 'rigid_body_fit',
                commandArgs: randomJiggleMode ?  [...commandArgs.slice(0, 2), 0, -1] : commandArgs,
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
                    <FormLabel>Fitting mode</FormLabel>
                    <FormSelect ref={ref} defaultValue={props.panelParameters}
                        onChange={(e) => {
                            if(e.target.value === 'RESIDUE RANGE'){
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
                        style={{paddingTop: '0.1rem'}} 
                        type="switch"
                        checked={randomJiggleMode}
                        onChange={() => { setRandomJiggleMode(!randomJiggleMode) }}
                    label="Use random jiggle fit"/>
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
        icon={<img style={{width:'100%', height: '100%'}} className="baby-gru-button-icon" src={`${props.urlPrefix}/baby-gru/pixmaps/rigid-body.svg`} alt='Rigid body fit' />}
        formatArgs={(m, c, p) => rigidBodyFitFormatArgs(m, c, p)}
        />
}

export const MoorhenAddSimpleButton = (props) => {
    const selectRef = useRef()

    const MoorhenAddSimplePanel = (props) => {
        const molTypes = ['HOH', 'SO4', 'PO4', 'GOL', 'CIT', 'EDO']
        return <Container>
            <MenuList>
                {molTypes.map(molType => {
                    return <MenuItem key={molType} onClick={() => {props.onTypeSelectedCallback(molType)}}>{molType}</MenuItem>
                })}
            </MenuList>
            <MoorhenMoleculeSelect {...props} allowAny={false} ref={props.selectRef} />
        </Container>
    }

    const onTypeSelectedCallback = useCallback(async (value) => {
        const selectedMolecule = props.molecules.find(molecule => molecule.molNo === parseInt(selectRef.current.value))
        if (selectedMolecule) {
            await selectedMolecule.addLigandOfType(value, props.glRef.current.origin.map(coord => -coord), props.glRef)
            props.setSelectedButtonIndex(null)
            const mapUpdateEvent = new CustomEvent("mapUpdate", { detail: { origin: props.glRef.current.origin, modifiedMolecule: selectedMolecule.molNo } })
            document.dispatchEvent(mapUpdateEvent)    
        }
    }, [props.molecules, props.glRef])

    return <MoorhenSimpleEditButton {...props}
        toolTip="Add simple"
        buttonIndex={props.buttonIndex}
        selectedButtonIndex={props.selectedButtonIndex}
        setSelectedButtonIndex={props.setSelectedButtonIndex}
        needsMapData={false}
        needsAtomData={true}
        prompt={<MoorhenAddSimplePanel
            {...props}
            onTypeSelectedCallback={onTypeSelectedCallback}
            selectRef={selectRef}
        />}
        icon={<img style={{width:'100%', height: '100%'}} className="baby-gru-button-icon" src={`${props.urlPrefix}/baby-gru/pixmaps/atom-at-pointer.svg`} alt='add...' />}
    />
}
