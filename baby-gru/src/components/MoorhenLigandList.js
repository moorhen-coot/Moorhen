import React, { useEffect, useState } from "react";
import { Card, Row, Col, Button } from "react-bootstrap";

export const MoorhenLigandList = (props) => {
    const [ligandList, setLigandList] = useState([])
    const [cachedStructure, setCachedStructure] = useState(null)

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
        const chains = model.chains
        for (let i = 0; i < chains.size(); i++) {
            let chain = chains.get(i)
            const ligands = chain.get_ligands_const()
            for (let j = 0; j < ligands.size(); j++) {
                let ligand = ligands.at(j)
                ligandList.push({res: ligand, chainName: chain.name})
            }
        }
        setLigandList(ligandList)

    }, [cachedStructure])

    useEffect(() => {
        setCachedStructure(props.molecule.gemmiStructure)
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
                                                        {`${ligand.chainName}/${ligand.res.seqid.str()}(${ligand.res.name})`}
                                                    </Col>
                                                    <Col className='col-3' style={{justifyContent: 'right', display:'flex'}}>
                                                        <Button onClick={() => {props.molecule.centreOn(props.glRef, `/*/${ligand.chainName}/${ligand.res.seqid.str()}-${ligand.res.seqid.str()}/*`)}}>
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
