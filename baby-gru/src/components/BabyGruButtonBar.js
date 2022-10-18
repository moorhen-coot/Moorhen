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

            <BabyGruSimpleEditButton {...props}
                cootCommand="auto_fit_rotamer"
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
                cootCommand="flipPeptide_cid"
                icon={<img className="baby-gru-button-icon" src="pixmaps/flip-peptide.svg" />}
                formatArgs={(molecule, chosenAtom) => {
                    return [
                        molecule.coordMolNo,
                        `//${chosenAtom.chain_id}/${chosenAtom.res_no}`,
                        '']
                }} />

        </ButtonGroup>
    </div>
}

const BabyGruSimpleEditButton = (props) => {
    const atomClickedBinding = createRef(null);

    return <Button variant='light' onClick={() => {
        props.setCursorStyle("crosshair")
        atomClickedBinding.current = document.addEventListener('atomClicked', (event) => {
            document.removeEventListener('atomClicked', atomClickedBinding.current)
            props.molecules.forEach(molecule => {
                props.setCursorStyle("default")
                const chosenAtom = cidToSpec(event.detail)
                cootCommand(props.cootWorker, {
                    returnType: "status",
                    command: props.cootCommand,
                    commandArgs: props.formatArgs(molecule, chosenAtom)
                }).then(_ => {
                    molecule.setAtomsDirty(true)
                    molecule.redraw(props.glRef)
                })

            })
        }, { once: true })
    }}>
        {props.icon}
    </Button>
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