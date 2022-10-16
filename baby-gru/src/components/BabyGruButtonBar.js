import { createRef } from "react";
import { ButtonGroup, Button } from "react-bootstrap"
import { cootCommand, postCootMessage } from "../BabyGruUtils"
import { circles_fragment_shader_source } from "../WebGL/circle-fragment-shader";

export const BabyGruButtonBar = (props) => {
    const atomClickedBinding = createRef(null);
    return <div
        style={{
            overflow: "auto",
            backgroundColor: "white",
        }}>
        <ButtonGroup vertical>
            <Button variant='light' onClick={() => {
                //props.setConsoleOutput('Select atom in residue for which to flip peptide')
                props.setCursorStyle("crosshair")
                atomClickedBinding.current = document.addEventListener('atomClicked', (event) => {
                    //props.setConsoleOutput(`Selected atom ${event.detail}`)
                    document.removeEventListener('atomClicked', atomClickedBinding.current)
                    //Currrently don't know which molecule has been edited...appply flip to all
                    props.molecules.forEach(molecule => {
                        props.setCursorStyle("default")
                        const chosenAtom = cidToSpec(event.detail)
                        /*
                                                cootCommand(props.cootWorker, {
                                                    returnType: "status",
                                                    command: "flipPeptide_cid",
                                                    commandArgs: [
                                                        molecule.coordMolNo,
                                                        `/${chosenAtom.chain_id}/${chosenAtom.res_no}`,
                                                        ''
                                                    ]
                                                }).then(response => {
                                                    molecule.setAtomsDirty(true)
                                                    molecule.redraw(props.glRef)
                                                })
                        */



                        postCootMessage(props.cootWorker, {
                            message: 'flipPeptide',
                            coordMolNo: molecule.coordMolNo,
                            cid: event.detail
                        }).then(_ => {
                            molecule.setAtomsDirty(true)
                            molecule.redraw(props.glRef)
                        })


                    })
                }, { once: true })
            }}>
                <img className="baby-gru-button-icon" src="pixmaps/flip-peptide.svg" />
            </Button>

            <Button variant='light' onClick={() => {
                //props.setConsoleOutput('Select atom in residue for which to autofit rotamer')
                props.setCursorStyle("crosshair")
                atomClickedBinding.current = document.addEventListener('atomClicked', (event) => {
                    //props.setConsoleOutput(`Selected atom ${event.detail}`)
                    document.removeEventListener('atomClicked', atomClickedBinding.current)
                    //Currrently don't know which molecule has been edited...appply flip to all
                    props.molecules.forEach(molecule => {
                        props.setCursorStyle("default")
                        const chosenAtom = cidToSpec(event.detail)

                        cootCommand(props.cootWorker, {
                            returnType: "status",
                            command: "auto_fit_rotamer",
                            commandArgs: [
                                molecule.coordMolNo,
                                chosenAtom.chain_id,
                                chosenAtom.res_no,
                                chosenAtom.ins_code,
                                chosenAtom.alt_conf,
                                props.activeMap.mapMolNo
                            ]
                        }).then(_ => {
                            molecule.setAtomsDirty(true)
                            molecule.redraw(props.glRef)
                        })

                    })
                }, { once: true })
            }}>
                <img className="baby-gru-button-icon" src="pixmaps/auto-fit-rotamer.svg" />
            </Button>

        </ButtonGroup>
    </div>
}

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