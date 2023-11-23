import { useEffect, useState } from "react";
import { Row, Col } from "react-bootstrap";
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { useSelector } from "react-redux";
import { getLigandSVG } from "../../utils/MoorhenUtils";
import { MoorhenLigandCard } from "../card/MoorhenLigandCard";

export const MoorhenLigandList = (props: { 
    setBusy?: React.Dispatch<React.SetStateAction<boolean>>;
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    molecule: moorhen.Molecule;
    glRef: React.RefObject<webGL.MGWebGL>; 
    height?: number | string;
}) => {

    const isDark = useSelector((state: moorhen.State) => state.canvasStates.isDark)

    const [ligandList, setLigandList] = useState<moorhen.LigandInfo[]>(null)

    useEffect(() => {
        async function updateLigandList() {
            props.setBusy(true)
            if (props.molecule.gemmiStructure === null || props.molecule.atomsDirty || props.molecule.ligands === null) {
                await props.molecule.updateAtoms()
            }
            if (props.molecule.gemmiStructure === null || props.molecule.ligands === null) {
                return
            }

            let ligandList: moorhen.LigandInfo[] = []

            for (const ligand of props.molecule.ligands) {
                const ligandSVG = await getLigandSVG(props.commandCentre, props.molecule.molNo, ligand.resName, isDark)
                ligandList.push({svg: ligandSVG, ...ligand})
            }

            setLigandList(ligandList)
            props.setBusy(false)
        }

        updateLigandList()

    }, [props.molecule.ligands])

    return <>
            {ligandList === null ?
            null
            : ligandList.length > 0 ? 
                <>
                    <Row style={{ maxHeight: props.height, overflowY: 'auto' }}>
                        <Col style={{paddingLeft: '0.5rem', paddingRight: '0.5rem'}}>
                            {ligandList.map((ligand, index) => {
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

MoorhenLigandList.defaultProps = { setBusy: () => {}, height: '30vh'}