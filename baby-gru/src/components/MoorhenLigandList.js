import React, { useEffect, useState } from "react";
import { Card, Row, Col, Button } from "react-bootstrap";

export const MoorhenLigandList = (props) => {
    const [ligandList, setLigandList] = useState([])
    const [cachedGemmiStructure, setCachedGemmiStructure] = useState(null)

    useEffect(() => {
        async function updateMoleculeAtoms() {
            await props.molecule.updateAtoms()
        }

        if (props.molecule.gemmiStructure === null || props.molecule.atomsDirty) {
            updateMoleculeAtoms()
        }
        if (props.molecule.gemmiStructure === null) {
            return
        }
        
        let ligandList = []
        const model = props.molecule.gemmiStructure.first_model()

        try{
            const chains = model.chains
            const chainsSize = chains.size()
            for (let i = 0; i < chainsSize; i++) {
                const chain = chains.get(i)
                const chainName = chain.name
                const ligands = chain.get_ligands_const()
                const ligandsSize = ligands.size()
                for (let j = 0; j < ligandsSize; j++) {
                    let ligand = ligands.at(j)
                    const resName = ligand.name
                    const ligandSeqId = ligand.seqid
                    const resNum = ligandSeqId.str()
                    ligandList.push({resName: resName, chainName: chainName, resNum: resNum})
                    ligand.delete()
                    ligandSeqId.delete()
                }
                chain.delete()
                ligands.delete()
            }
            chains.delete()
    
        } finally {
            model.delete()
        }

        setLigandList(ligandList)

    }, [cachedGemmiStructure])

    useEffect(() => {
        setCachedGemmiStructure(props.molecule.gemmiStructure)
    })

    return <>
            {ligandList.length > 0 ? 
                <>
                    <Row style={{ height: '100%' }}>
                        <Col>
                            {ligandList.map(ligand => {
                                return <Card style={{margin: '0.5rem'}}>
                                            <Card.Body>
                                                <Row style={{display:'flex', justifyContent:'between'}}>
                                                    <Col style={{alignItems:'center', justifyContent:'left', display:'flex'}}>
                                                        {`${ligand.chainName}/${ligand.resNum}(${ligand.resName})`}
                                                    </Col>
                                                    <Col className='col-3' style={{justifyContent: 'right', display:'flex'}}>
                                                        <Button onClick={() => {props.molecule.centreOn(props.glRef, `/*/${ligand.chainName}/${ligand.resNum}-${ligand.resNum}/*`)}}>
                                                            View
                                                        </Button>
                                                    </Col>
                                                </Row>
                                            </Card.Body>
                                        </Card>
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
