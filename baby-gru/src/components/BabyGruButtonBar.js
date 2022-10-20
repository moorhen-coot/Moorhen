import { createRef, useCallback, useEffect, useRef, useState } from "react";
import { ButtonGroup, Button, Popover, Overlay, Container, Row, FormSelect, FormGroup, FormLabel } from "react-bootstrap"
import { cootCommand, postCootMessage } from "../BabyGruUtils"
import { circles_fragment_shader_source } from "../WebGL/circle-fragment-shader";


export const BabyGruButtonBar = (props) => {
    const [selectedbuttonIndex, setSelectedbuttonIndex] = useState(null);
    const [refinementMode, setRefinementMode] = useState("TRIPLE");

    useEffect(() => {
        console.log('refinement mode now', refinementMode)
    }, [refinementMode])

    let refinementFormatArgs = useCallback((molecule, chosenAtom) => {
        return [
            molecule.coordMolNo,
            `//${chosenAtom.chain_id}/${chosenAtom.res_no}`,
            refinementMode]
    }, [refinementMode])

    const BabyGruRefinementPanel = (props) => {
        const refinementModes = ['SINGLE', 'TRIPLE', 'QUINTUPLE', 'HEPTUPLE', 'SPHERE', 'BIG_SPHERE', 'CHAIN', 'ALL']
        return <Container>
            <Row>Please click an atom for centre of refinement</Row>
            <Row>
                <FormGroup>
                    <FormLabel>Refinement mode</FormLabel>
                    <FormSelect defaultValue={refinementMode}
                        onChange={(e) => { setRefinementMode(e.target.value) }}>
                        {refinementModes.map(optionName => {
                            return <option value={optionName}>{optionName}</option>
                        })}
                    </FormSelect></FormGroup>
            </Row>
        </Container>
    }


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
                cootCommand="flipPeptide_cid"
                prompt="Click atom in residue to flip"
                icon={<img className="baby-gru-button-icon" src="pixmaps/flip-peptide.svg" />}
                formatArgs={(molecule, chosenAtom) => {
                    return [molecule.coordMolNo, `//${chosenAtom.chain_id}/${chosenAtom.res_no}`, '']
                }} />

            <BabyGruSimpleEditButton {...props}
                buttonIndex={"1"}
                selectedbuttonIndex={selectedbuttonIndex}
                setSelectedbuttonIndex={setSelectedbuttonIndex}
                cootCommand="refine_residues_using_atom_cid"
                prompt={<BabyGruRefinementPanel />}
                icon={<img className="baby-gru-button-icon" src="pixmaps/refine-1.svg" />}
                formatArgs={refinementFormatArgs} />
        </ButtonGroup>
    </div>
}

export const BabyGruSimpleEditButton = (props) => {
    const [showPrompt, setShowPrompt] = useState(false)
    const target = useRef(null);
    const [prompt, setPrompt] = useState(null)

    useEffect(() => {
        setPrompt(props.prompt)
    }, [props.prompt])

    useEffect(() => {
        console.log('argFormatter changed')
    }, [props.formatArgs])

    const atomClickedCallback = useCallback(event => {
        props.molecules.forEach(molecule => {
            if (molecule.buffersInclude(event.detail.buffer)) {
                setShowPrompt(false)
                props.setCursorStyle("default")
                const chosenAtom = cidToSpec(event.detail.atom.label)
                let formattedArgs = props.formatArgs(molecule, chosenAtom)
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
        })
    }, [props.formatArgs])

    return <>
        <Button value={props.buttonIndex}
            size="sm"
            ref={target}
            active={props.buttonIndex === props.selectedbuttonIndex}
            variant='light'
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