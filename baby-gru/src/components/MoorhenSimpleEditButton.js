import { CheckOutlined, CloseOutlined } from "@mui/icons-material";
import { MenuItem, MenuList, Tooltip } from "@mui/material";
import { createRef, forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { Button, Overlay, Container, Row, FormSelect, FormGroup, FormLabel, Card } from "react-bootstrap"
import { MoorhenMoleculeSelect } from "./MoorhenMoleculeSelect";
import { cidToSpec } from "../utils/MoorhenUtils";

const refinementFormatArgs = (molecule, chosenAtom, pp) => {
    return [
        molecule.molNo,
        `//${chosenAtom.chain_id}/${chosenAtom.res_no}`,
        pp.refine.mode]
}

const MoorhenSimpleEditButton = forwardRef((props, buttonRef) => {
    const [prompt, setPrompt] = useState(null)
    const target = useRef(null)
    const [localParameters, setLocalParameters] = useState({})

    useEffect(() => {
        setPrompt(props.prompt)
    }, [props.prompt])

    useEffect(() => {
        setLocalParameters(props.panelParameters)
    }, [])

    useEffect(() => {
        //console.log('changing panelParameters', props.panelParameters)
        setLocalParameters(props.panelParameters)
    }, [props.panelParameters])

    const atomClickedCallback = useCallback(event => {
        //console.log('in atomClickedcallback', event, props.molecules.length)
        document.removeEventListener('atomClicked', atomClickedCallback, { once: true })
        props.molecules.forEach(async (molecule) => {
            console.log('Testing molecule ', molecule.molNo)
            try {
                if (molecule.buffersInclude(event.detail.buffer)) {
                    //console.log('Succeeded')
                    props.setCursorStyle("default")
                    const chosenAtom = cidToSpec(event.detail.atom.label)
                    let formattedArgs = props.formatArgs(molecule, chosenAtom, localParameters)
                    props.setSelectedButtonIndex(null)
                    if (props.cootCommand) {
                        await props.commandCentre.current.cootCommand({
                            returnType: "status",
                            command: props.cootCommand,
                            commandArgs: formattedArgs,
                            changesMolecules: props.changesMolecule ? [molecule.molNo] : []
                        }, true)
                        if (props.refineAfterMod && props.activeMap) {
                            console.log('Triggering post-modification triple refinement...')
                            try {
                                const result = await props.commandCentre.current.cootCommand({
                                    returnType: "status",
                                    command: 'refine_residues_using_atom_cid',
                                    commandArgs: refinementFormatArgs(molecule, chosenAtom, { refine: { mode: 'TRIPLE' } }),
                                    changesMolecules: [molecule.molNo]
                                }, true)
                                console.log(`Refine result `, result)
                            }
                            catch (err) {
                                console.log(`Exception raised in Refine [${err}]`)
                            }
                        }
                        molecule.setAtomsDirty(true)
                        molecule.redraw(props.glRef)
                        //Here use originChanged event to force recontour (relevant for live updating maps)
                        const originChangedEvent = new CustomEvent("originChanged",
                            { "detail": props.glRef.current.origin });
                        document.dispatchEvent(originChangedEvent);

                    }
                    else if (props.nonCootCommand) {
                        props.nonCootCommand(molecule, chosenAtom, localParameters)
                    }
                }
                else {
                    console.log('molecule for buffer not found')
                }
            }
            catch (err) {
                console.log('Encountered', err)
            }
        })
    }, [props.molecules.length, props.activeMap, props.refineAfterMod, localParameters])

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
    }, [props.selectedButtonIndex])

    return <>
        <Tooltip title={props.toolTip}>
            <Button value={props.buttonIndex}
                id={props.id}
                size="sm"
                ref={buttonRef ? buttonRef : target}
                active={props.buttonIndex === props.selectedButtonIndex}
                variant='light'
                style={{ borderColor: props.buttonIndex === props.selectedButtonIndex ? 'red' : '' }}
                disabled={props.needsMapData && !props.activeMap ||
                    (props.needsAtomData && props.molecules.length === 0)}
                onClick={(evt) => {
                    props.setSelectedButtonIndex(props.buttonIndex !== props.selectedButtonIndex ? props.buttonIndex : null)
                }}>
                {props.icon}
            </Button>
        </Tooltip>

        {
            prompt && <Overlay target={buttonRef ? buttonRef.current : target.current} show={props.buttonIndex === props.selectedButtonIndex} placement="top">
                {({ placement, arrowProps, show: _show, popper, ...props }) => (
                    <div
                        {...props}
                        style={{
                            position: 'absolute',
                            marginBottom: '0.5rem',
                            backgroundColor: 'rgba(150, 200, 150, 0.5)',
                            padding: '2px 10px',
                            color: 'black',
                            borderRadius: 3,
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
    id: '',
    toolTip: "", setCursorStyle: () => { },
    needsAtomData: true, setSelectedButtonIndex: () => { }, selectedButtonIndex: 0, prompt: null,
    awaitAtomClick: true, changesMolecule: true, refineAfterMod: false
}


export const MoorhenAutofitRotamerButton = (props) => {
    return <MoorhenSimpleEditButton {...props}
        id='auto-fit-rotamer-edit-button'
        toolTip="Auto-fit Rotamer"
        buttonIndex={props.buttonIndex}
        selectedButtonIndex={props.selectedButtonIndex}
        setSelectedButtonIndex={props.setSelectedButtonIndex}
        needsMapData={true}
        cootCommand="auto_fit_rotamer"
        prompt="Click atom in residue to fit rotamer"
        icon={<img className="baby-gru-button-icon" src={`${props.urlPrefix}/baby-gru/pixmaps/auto-fit-rotamer.svg`} />}
        formatArgs={(molecule, chosenAtom) => {
            return [
                molecule.molNo,
                chosenAtom.chain_id,
                chosenAtom.res_no,
                chosenAtom.ins_code,
                chosenAtom.alt_conf,
                props.activeMap.molNo]
        }} />
}

export const MoorhenFlipPeptideButton = (props) => {
    return <MoorhenSimpleEditButton {...props}
        id="flip-peptide-edit-button"
        toolTip="Flip Peptide"
        buttonIndex={props.buttonIndex}
        selectedButtonIndex={props.selectedButtonIndex}
        setSelectedButtonIndex={props.setSelectedButtonIndex}
        needsMapData={false}
        cootCommand="flipPeptide_cid"
        prompt="Click atom in residue to flip"
        icon={<img className="baby-gru-button-icon" src={`${props.urlPrefix}/baby-gru/pixmaps/flip-peptide.svg`} />}
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
        icon={<img className="baby-gru-button-icon" alt="Cis/Trans" src={`${props.urlPrefix}/baby-gru/pixmaps/cis-trans.svg`} />}
        formatArgs={(molecule, chosenAtom) => {
            return [molecule.molNo, `//${chosenAtom.chain_id}/${chosenAtom.res_no}/${chosenAtom.atom_name}${chosenAtom.alt_conf === "" ? "" : ":" + chosenAtom.alt_conf
                }`]
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
        icon={<img className="baby-gru-button-icon" src={`${props.urlPrefix}/baby-gru/pixmaps/side-chain-180.svg`} />}
        formatArgs={(molecule, chosenAtom) => {
            return [molecule.molNo, `//${chosenAtom.chain_id}/${chosenAtom.res_no}`]
        }} />
}

export const MoorhenRefineResiduesUsingAtomCidButton = (props) => {

    const [panelParameters, setPanelParameters] = useState({
        refine: { mode: 'TRIPLE' },
        delete: { mode: 'ATOM' },
        mutate: { toType: "ALA" }
    })

    const MoorhenRefinementPanel = (props) => {
        const refinementModes = ['SINGLE', 'TRIPLE', 'QUINTUPLE', 'HEPTUPLE', 'SPHERE', 'BIG_SPHERE', 'CHAIN', 'ALL']
        return <Container>
            <Row>Please click an atom for centre of refinement</Row>
            <Row>
                <FormGroup>
                    <FormLabel>Refinement mode</FormLabel>
                    <FormSelect defaultValue={props.panelParameters.refine.mode}
                        onChange={(e) => {
                            const newParameters = { ...props.panelParameters }
                            newParameters.refine.mode = e.target.value
                            props.setPanelParameters(newParameters)
                        }}>
                        {refinementModes.map(optionName => {
                            return <option value={optionName}>{optionName}</option>
                        })}
                    </FormSelect>
                </FormGroup>
            </Row>
        </Container>
    }
    return <MoorhenSimpleEditButton {...props}
        id='refine-residues-edit-button'
        toolTip="Refine Residues"
        buttonIndex={props.buttonIndex}
        selectedButtonIndex={props.selectedButtonIndex}
        setSelectedButtonIndex={props.setSelectedButtonIndex}
        needsMapData={true}
        cootCommand="refine_residues_using_atom_cid"
        panelParameters={panelParameters}
        prompt={<MoorhenRefinementPanel
            setPanelParameters={setPanelParameters}
            panelParameters={panelParameters} />}
        icon={<img className="baby-gru-button-icon" src={`${props.urlPrefix}/baby-gru/pixmaps/refine-1.svg`} />}
        formatArgs={(m, c, p) => refinementFormatArgs(m, c, p)}
        refineAfterMod={false} />
}

export const MoorhenAddSideChainButton = (props) => {
    return <MoorhenSimpleEditButton {...props}
        toolTip="Add a side chain"
        buttonIndex={props.buttonIndex}
        selectedButtonIndex={props.selectedButtonIndex}
        setSelectedButtonIndex={props.setSelectedButtonIndex}
        needsMapData={false}
        cootCommand="fill_side_chain"
        prompt="Click atom in residue to add a side chain"
        icon={<img className="baby-gru-button-icon" alt="Add side chain" src={`${props.urlPrefix}/baby-gru/pixmaps/add-sidechain.svg`} />}
        formatArgs={(molecule, chosenAtom) => {
            return [molecule.molNo, chosenAtom.chain_id, chosenAtom.res_no, chosenAtom.ins_code]
        }} />
}

export const MoorhenDeleteUsingCidButton = (props) => {
    const [panelParameters, setPanelParameters] = useState({
        refine: { mode: 'TRIPLE' },
        delete: { mode: 'ATOM' },
        mutate: { toType: "ALA" }
    })
    const MoorhenDeletePanel = (props) => {
        const deleteModes = ['ATOM', 'RESIDUE', 'CHAIN']
        return <Container>
            <Row>Please click an atom for core of deletion</Row>
            <Row>
                <FormGroup>
                    <FormLabel>Delete mode</FormLabel>
                    <FormSelect defaultValue={props.panelParameters.delete.mode}
                        onChange={(e) => {
                            const newParameters = { ...props.panelParameters }
                            newParameters.delete.mode = e.target.value
                            props.setPanelParameters(newParameters)
                        }}>
                        {deleteModes.map(optionName => {
                            return <option value={optionName}>{optionName}</option>
                        })}
                    </FormSelect>
                </FormGroup>
            </Row>
        </Container>
    }
    const deleteFormatArgs = (molecule, chosenAtom, pp) => {
        //console.log({ molecule, chosenAtom, pp })
        return pp.delete.mode === 'CHAIN' ?
            [molecule.molNo, `/1/${chosenAtom.chain_id}/*/*:*`, 'LITERAL'] :
            pp.delete.mode === 'RESIDUE' ?
                [molecule.molNo,
                `/1/${chosenAtom.chain_id}/${chosenAtom.res_no}/*${chosenAtom.alt_conf === "" ? "" : ":" + chosenAtom.alt_conf}`,
                    'LITERAL'] :
                [molecule.molNo,
                `/1/${chosenAtom.chain_id}/${chosenAtom.res_no}/${chosenAtom.atom_name}${chosenAtom.alt_conf === "" ? "" : ":" + chosenAtom.alt_conf
                }`,
                    'LITERAL']
    }
    return <MoorhenSimpleEditButton {...props}
        toolTip="Delete Item"
        buttonIndex={props.buttonIndex}
        selectedButtonIndex={props.selectedButtonIndex}
        setSelectedButtonIndex={props.setSelectedButtonIndex}
        needsMapData={false}
        cootCommand="delete_using_cid"
        panelParameters={panelParameters}
        prompt={<MoorhenDeletePanel
            setPanelParameters={setPanelParameters}
            panelParameters={panelParameters} />}
        icon={<img className="baby-gru-button-icon" src={`${props.urlPrefix}/baby-gru/pixmaps/delete.svg`} />}
        formatArgs={(m, c, p) => deleteFormatArgs(m, c, p)} />
}

export const MoorhenMutateButton = (props) => {
    const [panelParameters, setPanelParameters] = useState({
        refine: { mode: 'TRIPLE' },
        delete: { mode: 'ATOM' },
        mutate: { toType: "ALA" }
    })
    const MoorhenMutatePanel = (props) => {
        const toTypes = ['ALA', 'CYS', 'ASP', 'GLU', 'PHE', 'GLY', 'HIS', 'ILE',
            'LYS', 'LEU', 'MET', 'ASN', 'PRO', 'GLN', 'ARG', 'SER', 'THR', 'VAL', 'TRP', 'TYR']
        return <Container>
            <Row>Please identify residue to mutate</Row>
            <Row>
                <FormGroup>
                    <FormLabel>To residue of type</FormLabel>
                    <FormSelect defaultValue={props.panelParameters.mutate.toType}
                        onChange={(e) => {
                            const newParameters = { ...props.panelParameters }
                            newParameters.mutate.toType = e.target.value
                            props.setPanelParameters(newParameters)
                        }}>
                        {toTypes.map(optionName => {
                            return <option value={optionName}>{optionName}</option>
                        })}
                    </FormSelect>
                </FormGroup>
            </Row>
        </Container>
    }
    const mutateFormatArgs = (molecule, chosenAtom, pp) => {
        return [
            molecule.molNo,
            `//${chosenAtom.chain_id}/${chosenAtom.res_no}`,
            pp.mutate.toType]
    }
    return <MoorhenSimpleEditButton {...props}
        id='mutate-residue-edit-button'
        toolTip="Simple Mutate"
        buttonIndex={props.buttonIndex}
        selectedButtonIndex={props.selectedButtonIndex}
        setSelectedButtonIndex={props.setSelectedButtonIndex}
        needsMapData={false}
        cootCommand="mutate"
        panelParameters={panelParameters}
        prompt={<MoorhenMutatePanel
            setPanelParameters={setPanelParameters}
            panelParameters={panelParameters} />}
        icon={<img className="baby-gru-button-icon" src={`${props.urlPrefix}/baby-gru/pixmaps/mutate.svg`} />}
        formatArgs={(m, c, p) => mutateFormatArgs(m, c, p)} />
}

export const MoorhenAddTerminalResidueDirectlyUsingCidButton = (props) => {
    return <MoorhenSimpleEditButton {...props}
        toolTip="Add Residue"
        buttonIndex={props.buttonIndex}
        selectedButtonIndex={props.selectedButtonIndex}
        setSelectedButtonIndex={props.setSelectedButtonIndex}
        needsMapData={false}
        cootCommand="add_terminal_residue_directly_using_cid"
        prompt="Click atom in residue to add a residue to that residue"
        icon={<img className="baby-gru-button-icon" src={`${props.urlPrefix}/baby-gru/pixmaps/add-peptide-1.svg`} />}
        formatArgs={(molecule, chosenAtom) => {
            return [molecule.molNo, `//${chosenAtom.chain_id}/${chosenAtom.res_no}`]
        }} />
}

export const MoorhenEigenFlipLigandButton = (props) => {
    return <MoorhenSimpleEditButton {...props}
        id='eigen-flip-edit-button'
        toolTip="Eigen Flip: flip the ligand around its eigenvectors"
        buttonIndex={props.buttonIndex}
        selectedButtonIndex={props.selectedButtonIndex}
        setSelectedButtonIndex={props.setSelectedButtonIndex}
        needsMapData={false}
        cootCommand="eigen_flip_ligand"
        prompt="Click atom in residue to eigen flip it"
        icon={<img className="baby-gru-button-icon" src={`${props.urlPrefix}/baby-gru/pixmaps/spin-view.svg`} />}
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
        icon={<img className="baby-gru-button-icon" src={`${props.urlPrefix}/baby-gru/pixmaps/edit-chi.svg`} />}
        formatArgs={(molecule, chosenAtom) => {
            return [molecule.molNo, `//${chosenAtom.chain_id}/${chosenAtom.res_no}/${chosenAtom.atom_name}`, false]
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
        icon={<img className="baby-gru-button-icon" src={`${props.urlPrefix}/baby-gru/pixmaps/jed-flip-reverse.svg`} />}
        formatArgs={(molecule, chosenAtom) => {
            return [molecule.molNo, `//${chosenAtom.chain_id}/${chosenAtom.res_no}/${chosenAtom.atom_name}`, true]
        }} />
}

export const MoorhenRotateTranslateZoneButton = (props) => {
    const [showAccept, setShowAccept] = useState(false)
    const theButton = useRef(null)
    const { changeMolecules, molecules, backgroundColor, glRef } = props
    const fragmentMolecule = useRef(null)
    const chosenMolecule = useRef(null)

    const acceptTransform = useCallback(async (e) => {
        glRef.current.setActiveMolecule(null)
        const transformedAtoms = fragmentMolecule.current.transformedCachedAtomsAsMovedAtoms(glRef)
        await chosenMolecule.current.updateWithMovedAtoms(transformedAtoms, glRef)
        changeMolecules({ action: 'Remove', item: fragmentMolecule.current })
        const response = fragmentMolecule.current.delete(glRef)
        setShowAccept(false)
    }, [fragmentMolecule.current, chosenMolecule.current, molecules, changeMolecules])

    const rejectTransform = useCallback(async (e) => {
        glRef.current.setActiveMolecule(null)
        changeMolecules({ action: 'Remove', item: fragmentMolecule.current })
        const response = fragmentMolecule.current.delete(glRef)
        setShowAccept(false)
    }, [fragmentMolecule.current, chosenMolecule.current, molecules, changeMolecules])

    const nonCootCommand = async (molecule, chosenAtom, p) => {
        chosenMolecule.current = molecule
        /* Copy the component to move into a new molecule */
        const newMolecule = await molecule.copyFragment(
            chosenAtom.chain_id, chosenAtom.res_no, chosenAtom.res_no, props.glRef, false
        )
        fragmentMolecule.current = newMolecule
        /* redraw */
        props.changeMolecules({ action: "Add", item: newMolecule })
        props.glRef.current.setActiveMolecule(newMolecule)
        setShowAccept(true)
    }

    return <><MoorhenSimpleEditButton ref={theButton} {...props}
        toolTip="Rotate/Translate zone"
        buttonIndex={props.buttonIndex}
        selectedButtonIndex={props.selectedButtonIndex}
        setSelectedButtonIndex={props.setSelectedButtonIndex}
        needsMapData={false}
        nonCootCommand={nonCootCommand}
        prompt="Click atom in residue to totate/translate around"
        icon={<img className="baby-gru-button-icon" src={`${props.urlPrefix}/baby-gru/pixmaps/rtz.svg`} />}
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
                        <Card.Body className="">
                            <Button onClick={acceptTransform}><CheckOutlined /></Button>
                            <Button className="mx-2" onClick={rejectTransform}><CloseOutlined /></Button>
                        </Card.Body>
                    </Card>
                </div>
            )}
        </Overlay>
    </>
}



export const MoorhenAddSimpleButton = (props) => {
    const molType = createRef("HOH")
    const selectRef = useRef()

    const [panelParameters, setPanelParameters] = useState({
        refine: { mode: 'TRIPLE' },
        delete: { mode: 'ATOM' },
        mutate: { toType: "ALA" }
    })

    const MoorhenAddSimplePanel = (props) => {
        const molTypes = ['HOH', 'SO4', 'PO4', 'GOL', 'CIT', 'EDO']
        return <Container>
            <MenuList>
                {molTypes.map(molType => <MenuItem key={molType} onClick={() => {
                    props.typeSelected(molType)
                }}>{molType}</MenuItem>)}
            </MenuList>
            <MoorhenMoleculeSelect {...props} allowAny={false} ref={props.selectRef} />
        </Container>
    }

    const typeSelected = useCallback(value => {
        props.molecules
            .filter(molecule => molecule.molNo === parseInt(selectRef.current.value))
            .forEach(molecule => {
                console.log({ molecule })
                molecule.addLigandOfType(value,
                    props.glRef.current.origin.map(coord => -coord),
                    props.glRef)
            })
    })

    return <MoorhenSimpleEditButton {...props}
        toolTip="Add simple"
        buttonIndex={props.buttonIndex}
        selectedButtonIndex={props.selectedButtonIndex}
        setSelectedButtonIndex={props.setSelectedButtonIndex}
        needsMapData={false}
        needsAtomData={true}
        panelParameters={panelParameters}
        prompt={<MoorhenAddSimplePanel
            {...props}
            setPanelParameters={setPanelParameters}
            panelParameters={panelParameters}
            typeSelected={typeSelected}
            selectRef={selectRef}
            awaitAtomClick={false}
        />}
        icon={<img className="baby-gru-button-icon" src={`${props.urlPrefix}/baby-gru/pixmaps/atom-at-pointer.svg`} />}
    />
}
