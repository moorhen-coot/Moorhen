import { createRef, useCallback, useEffect, useRef, useState } from "react";
import { ButtonGroup, Button, Popover, Overlay } from "react-bootstrap"
import { cootCommand, postCootMessage } from "../BabyGruUtils"
import { circles_fragment_shader_source } from "../WebGL/circle-fragment-shader";

export const BabyGruButtonBar = (props) => {
    const [selectedbuttonIndex, setSelectedbuttonIndex] = useState(null)

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
                    return [
                        molecule.coordMolNo,
                        `//${chosenAtom.chain_id}/${chosenAtom.res_no}`,
                        '']
                }} />

            <BabyGruSimpleEditButton {...props}
                buttonIndex={"1"}
                selectedbuttonIndex={selectedbuttonIndex}
                setSelectedbuttonIndex={setSelectedbuttonIndex}
                cootCommand="refine_residues_using_atom_cid"
                prompt="Click atom for centre of refinement"
                icon={<img className="baby-gru-button-icon" src="pixmaps/refine-1.svg" />}
                formatArgs={(molecule, chosenAtom) => {
                    return [
                        molecule.coordMolNo,
                        `//${chosenAtom.chain_id}/${chosenAtom.res_no}`,
                        'BIG_SPHERE']
                }} />

        </ButtonGroup>
    </div>
}

export const BabyGruSimpleEditButton = (props) => {
    const [showPrompt, setShowPrompt] = useState(false)
    const target = useRef(null);
    const [prompt, setPrompt] = useState(null)

    useEffect(() => {
        setPrompt(props.prompt)
    }, [])

    const atomClickedCallback = useCallback(event => {
        props.molecules.forEach(molecule => {
            if (molecule.buffersInclude(event.detail.buffer)) {
                console.log('Passed buffersInclude')
                setShowPrompt(false)
                props.setCursorStyle("default")
                const chosenAtom = cidToSpec(event.detail.atom.label)
                cootCommand(props.cootWorker, {
                    returnType: "status",
                    command: props.cootCommand,
                    commandArgs: props.formatArgs(molecule, chosenAtom)
                }).then(_ => {
                    molecule.setAtomsDirty(true)
                    molecule.redraw(props.glRef)
                    props.setSelectedbuttonIndex(null)
                })
            }
        })
    })

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
                            backgroundColor: 'rgba(255, 100, 100, 0.85)',
                            padding: '2px 10px',
                            color: 'white',
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