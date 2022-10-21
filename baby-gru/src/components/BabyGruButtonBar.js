import { createRef, useCallback, useEffect, useRef, useState } from "react";
import { ButtonGroup, Button, Popover, Overlay, Container, Row, FormSelect, FormGroup, FormLabel } from "react-bootstrap"
import { cootCommand, postCootMessage } from "../BabyGruUtils"
import { circles_fragment_shader_source } from "../WebGL/circle-fragment-shader";
import { inspect } from 'util';

const BabyGruRefinementPanel = (props) => {
    const refinementModes = ['SINGLE', 'TRIPLE', 'QUINTUPLE', 'HEPTUPLE', 'SPHERE', 'BIG_SPHERE', 'CHAIN', 'ALL']
    return <Container>
        <Row>Please click an atom for centre of refinement</Row>
        <Row>
            <FormGroup>
                <FormLabel>Refinement mode</FormLabel>
                <FormSelect defaultValue={props.panelParameters.refine.mode}
                    onChange={(e) => {
                        const newParameters = {...props.panelParameters}
                        newParameters.refine.mode = e.target.value
                        props.setPanelParameters(newParameters)
                    }}>
                    {refinementModes.map(optionName => {
                        return <option value={optionName}>{optionName}</option>
                    })}
                </FormSelect></FormGroup>
        </Row>
    </Container>
}

const BabyGruDeletePanel = (props) => {
    const deleteModes = ['ATOM', 'RESIDUE', 'CHAIN']
    return <Container>
        <Row>Please click an atom for core of deletion</Row>
        <Row>
            <FormGroup>
                <FormLabel>Delete mode</FormLabel>
                <FormSelect defaultValue={props.panelParameters.delete.mode}
                    onChange={(e) => {
                        const newParameters = {...props.panelParameters}
                        newParameters.delete.mode = e.target.value
                        props.setPanelParameters(newParameters)
                    }}>
                    {deleteModes.map(optionName => {
                        return <option value={optionName}>{optionName}</option>
                    })}
                </FormSelect></FormGroup>
        </Row>
    </Container>
}

const refinementFormatArgs = (molecule, chosenAtom, pp) => {
    //console.log({ molecule, chosenAtom, pp })
    return [
        molecule.coordMolNo,
        `//${chosenAtom.chain_id}/${chosenAtom.res_no}`,
        pp.refine.mode]
}

const deleteFormatArgs = (molecule, chosenAtom, pp) => {
    //console.log({ molecule, chosenAtom, pp })
    return [
        molecule.coordMolNo,
        `//${chosenAtom.chain_id}/${chosenAtom.res_no}`,
        pp.delete.mode]
}

export const BabyGruButtonBar = (props) => {
    const [selectedbuttonIndex, setSelectedbuttonIndex] = useState(null);
    const [panelParameters, setPanelParameters] = useState({ 
        refine:{mode: 'TRIPLE' },
        delete:{mode: 'ATOM' }
    })

    useEffect(() => {
        console.log('panelPaarameters', panelParameters)
    }, [panelParameters])

    return <div
        style={{
            overflow: "auto",
            backgroundColor: "white",
        }}>
        <ButtonGroup vertical>

            <BabyGruSimpleEditButton {...props}
                buttonIndex={"0"}
                selectedbuttonIndex={selectedbuttonIndex}
                setSelectedbuttonIndex={setSelectedbuttonIndex}
                needsMapData={true}
                cootCommand="auto_fit_rotamer"
                prompt="Click atom in residue to fit rotamer"
                icon={<img className="baby-gru-button-icon" src="pixmaps/auto-fit-rotamer.svg" />}
                formatArgs={(molecule, chosenAtom) => {
                    return [
                        molecule.coordMolNo,
                        chosenAtom.chain_id,
                        chosenAtom.res_no,
                        chosenAtom.ins_code,
                        chosenAtom.alt_conf,
                        props.activeMap.mapMolNo]
                }} />

            <BabyGruSimpleEditButton {...props}
                buttonIndex={"1"}
                selectedbuttonIndex={selectedbuttonIndex}
                setSelectedbuttonIndex={setSelectedbuttonIndex}
                needsMapData={false}
                cootCommand="flipPeptide_cid"
                prompt="Click atom in residue to flip"
                icon={<img className="baby-gru-button-icon" src="pixmaps/flip-peptide.svg" />}
                formatArgs={(molecule, chosenAtom) => {
                    return [molecule.coordMolNo, `//${chosenAtom.chain_id}/${chosenAtom.res_no}`, '']
                }} />

            <BabyGruSimpleEditButton {...props}
                buttonIndex={"2"}
                selectedbuttonIndex={selectedbuttonIndex}
                setSelectedbuttonIndex={setSelectedbuttonIndex}
                needsMapData={true}
                cootCommand="refine_residues_using_atom_cid"
                panelParameters={panelParameters}
                prompt={<BabyGruRefinementPanel
                    setPanelParameters={setPanelParameters}
                    panelParameters={panelParameters} />}
                icon={<img className="baby-gru-button-icon" src="pixmaps/refine-1.svg" />}
                formatArgs={(m, c, p) => refinementFormatArgs(m, c, p)} />

            <BabyGruSimpleEditButton {...props}
                buttonIndex={"3"}
                selectedbuttonIndex={selectedbuttonIndex}
                setSelectedbuttonIndex={setSelectedbuttonIndex}
                needsMapData={true}
                cootCommand="delete_using_cid"
                panelParameters={panelParameters}
                prompt={<BabyGruDeletePanel
                    setPanelParameters={setPanelParameters}
                    panelParameters={panelParameters} />}
                icon={<img className="baby-gru-button-icon" src="pixmaps/delete.svg" />}
                formatArgs={(m, c, p) => deleteFormatArgs(m, c, p)} />
        </ButtonGroup>
    </div>
}

export const BabyGruSimpleEditButton = (props) => {
    const [showPrompt, setShowPrompt] = useState(false)
    const target = useRef(null);
    const [prompt, setPrompt] = useState(null)
    const [localParameters, setLocalParameters] = useState({})

    useEffect(() => {
        setPrompt(props.prompt)
    }, [props.prompt])

    useEffect(() => {
        setLocalParameters(props.panelParameters)
    }, [])

    useEffect(() => {
        console.log('changing panelParameters', props.panelParameters)
        setLocalParameters(props.panelParameters)
    }, [props.panelParameters])

    useEffect(() => {
        console.log('changed localParameters', localParameters)
        document.removeEventListener('atomClicked', atomClickedCallback, { once: true })
        document.addEventListener('atomClicked', atomClickedCallback, { once: true })
    }, [localParameters])

    const atomClickedCallback = useCallback(event => {
        console.log('in atomClickedcallback', event)
        props.molecules.forEach(molecule => {
            console.log('Testing molecule ', molecule.coordMolNo)
            if (molecule.buffersInclude(event.detail.buffer)) {
                setShowPrompt(false)
                props.setCursorStyle("default")
                const chosenAtom = cidToSpec(event.detail.atom.label)
                let formattedArgs = props.formatArgs(molecule, chosenAtom, localParameters)
                cootCommand(props.cootWorker, {
                    returnType: "status",
                    command: props.cootCommand,
                    commandArgs: formattedArgs
                }).then(_ => {
                    molecule.setAtomsDirty(true)
                    molecule.redraw(props.glRef)
                    props.setSelectedbuttonIndex(null)
                })
            }
            else {
                console.log('molecule for buffer not found')
            }
        })
    }, [localParameters, props.molecules])

    return <>
        <Button value={props.buttonIndex}
            size="sm"
            ref={target}
            active={props.buttonIndex === props.selectedbuttonIndex}
            variant='light'
            disabled={props.needsMapData && !props.activeMap || props.molecules.length === 0}
            onClick={(e) => {
                if (props.selectedbuttonIndex === e.currentTarget.value) {
                    props.setSelectedbuttonIndex(null)
                    props.setCursorStyle("default")
                    document.removeEventListener('atomClicked', atomClickedCallback, { once: true })
                    setShowPrompt(false)
                    return
                }
                props.setSelectedbuttonIndex(props.buttonIndex)
                props.setCursorStyle("crosshair")
                document.addEventListener('atomClicked', atomClickedCallback, { once: true })
                if (props.prompt) {
                    setShowPrompt(true)
                }
            }}>
            {props.icon}
        </Button>

        {
            prompt && <Overlay target={target.current} show={showPrompt} placement="left">
                {({ placement, arrowProps, show: _show, popper, ...props }) => (
                    <div
                        {...props}
                        style={{
                            position: 'absolute',
                            backgroundColor: 'rgba(100, 255, 100, 0.85)',
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
}
BabyGruSimpleEditButton.defaultProps = { setCursorStyle: () => { }, setselectedButtonIndex: () => { }, selectedButtonIndex: 0, prompt: null }

const cidToSpec = (cid) => {
    //coordMolNo, chain_id, res_no, ins_code, alt_conf
    const cidTokens = cid.split('/')
    const chain_id = cidTokens[2]
    const res_no = parseInt(cidTokens[3])
    const atom_name = cidTokens[4]
    const ins_code = ""
    const alt_conf = ""
    return { chain_id, res_no, atom_name, ins_code, alt_conf }
}