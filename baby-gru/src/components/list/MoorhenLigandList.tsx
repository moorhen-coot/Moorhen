import { useEffect, useState } from "react";
import { Row, Col } from "react-bootstrap";
import { moorhen } from "../../types/moorhen";
import { useSelector } from "react-redux";
import { MoorhenLigandCard } from "../card/MoorhenLigandCard";
import { LinearProgress } from "@mui/material";
import { modalKeys } from "../../utils/enums";

export const MoorhenLigandList = (props: { 
    setBusy?: React.Dispatch<React.SetStateAction<boolean>>;
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    molecule: moorhen.Molecule;
    height?: number | string;
}) => {

    const updateMolNo = useSelector((state: moorhen.State) => state.moleculeMapUpdate.moleculeUpdate.molNo)
    const updateSwitch = useSelector((state: moorhen.State) => state.moleculeMapUpdate.moleculeUpdate.switch)
    const showModelsModal = useSelector((state: moorhen.State) => state.modals.activeModals.includes(modalKeys.MODELS))

    const [ligandList, setLigandList] = useState<moorhen.LigandInfo[]>(null)

    async function updateLigandList() {
        props.setBusy?.(true)
        if (props.molecule.gemmiStructure === null || props.molecule.atomsDirty || props.molecule.ligands === null) {
            await props.molecule.updateAtoms()
        }
        if (props.molecule.gemmiStructure === null || props.molecule.ligands === null) {
            return
        }

        const ligandList: moorhen.LigandInfo[] = []

        for (const ligand of props.molecule.ligands) {
            const [svg, chemCompInfo,smilesInfo,flev_svg] = await Promise.all([
                props.molecule.getLigandSVG(ligand.resName, true),
                props.commandCentre.current.cootCommand({
                    returnType: "string_string_pair_vector",
                    command: 'get_gphl_chem_comp_info',
                    commandArgs: [ligand.resName, props.molecule.molNo],
                }, false) as Promise<moorhen.WorkerResponse<{first: string; second: string}[]>>,
                props.commandCentre.current.cootCommand({
                    returnType: 'string',
                    command: "get_SMILES_for_residue_type",
                    commandArgs: [ligand.resName,props.molecule.molNo],
                }, false) as Promise<moorhen.WorkerResponse<string>>,
                props.molecule.getFLEVSVG(ligand.cid),
            ])
            ligandList.push({ svg, smiles: smilesInfo.data.result.result, chem_comp_info: chemCompInfo.data.result.result, flev_svg, ...ligand })
        }

        setLigandList(ligandList)
        props.setBusy?.(false)
    }
    
    useEffect(() => {
        if (showModelsModal) {
            updateLigandList()
        } else {
            setLigandList(null)
        }
    }, [showModelsModal])
    
    useEffect(() => {
        if (props.molecule?.molNo === updateMolNo && showModelsModal) {
            updateLigandList()
        }
    }, [updateSwitch])

    return <>
            {ligandList === null ?
                <LinearProgress variant="indeterminate"/>
            : ligandList.length > 0 ? 
                <>
                    <Row style={{ maxHeight: props.height ?? '30vh', overflowY: 'auto' }}>
                        <Col style={{paddingLeft: '0.5rem', paddingRight: '0.5rem'}}>
                            {ligandList.map(ligand => {
                                return <MoorhenLigandCard key={`${ligand.cid}-${props.molecule.molNo}`} ligand={ligand} molecule={props.molecule}/>
                            })}
                        </Col>
                    </Row>
                </>
                :
                <div>
                    <b>No ligands</b>
                </div>
            }
        </>
}
