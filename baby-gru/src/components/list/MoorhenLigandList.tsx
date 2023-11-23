import React, { useEffect, useState } from "react";
import { Card, Form, Row, Col, DropdownButton, Stack } from "react-bootstrap";
import parse from 'html-react-parser'
import { MenuItem } from "@mui/material";
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { useSelector } from "react-redux";
import { getLigandSVG } from "../../utils/MoorhenUtils";

export const MoorhenLigandList = (props: { 
    setBusy?: React.Dispatch<React.SetStateAction<boolean>>;
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    molecule: moorhen.Molecule;
    glRef: React.RefObject<webGL.MGWebGL>; 
    height?: number | string;
}) => {

    const isDark = useSelector((state: moorhen.State) => state.canvasStates.isDark)

    const [showState, setShowState] = useState<{ [key: string]: boolean }>({})
    const [ligandList, setLigandList] = useState<{
        svg: string;
        resName: string;
        chainName: string;
        resNum: string;
        modelName: string;
    }[]>(null)

    useEffect(() => {
        async function updateLigandList() {
            props.setBusy(true)
            if (props.molecule.gemmiStructure === null || props.molecule.atomsDirty || props.molecule.ligands === null) {
                await props.molecule.updateAtoms()
            }
            if (props.molecule.gemmiStructure === null || props.molecule.ligands === null) {
                return
            }

            let ligandList: {
                svg: string;
                resName: string;
                chainName: string;
                resNum: string;
                modelName: string;
            }[] = []

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
                                const ligandCid = `/*/${ligand.chainName}/${ligand.resNum}(${ligand.resName})`
                                const keycd = `contact_dots-${ligand.chainName}/${ligand.resNum}(${ligand.resName})`
                                const keyenv = `ligand_environment-${ligand.chainName}/${ligand.resNum}(${ligand.resName})`
                                const keyval = `ligand_validation-${ligand.chainName}/${ligand.resNum}(${ligand.resName})`
                                const keycf = `chemical_features-${ligand.chainName}/${ligand.resNum}(${ligand.resName})`
                                return <Card key={index} style={{marginTop: '0.5rem', marginLeft: '0.2rem', marginRight: '0.2rem'}}>
                                            <Card.Body style={{padding:'0.5rem'}}>
                                                <Stack direction="horizontal" gap={2} style={{alignItems: 'center' }}>
                                                            {ligand.svg ? parse(ligand.svg) : null}
                                                            <DropdownButton
                                                                key="dropDownButton"
                                                                title={`${ligand.chainName}/${ligand.resNum}(${ligand.resName})`}
                                                                variant="outlined"
                                                                >
                                                                <MenuItem onClick={() => {props.molecule.centreOn(`/*/${ligand.chainName}/${ligand.resNum}-${ligand.resNum}/*`)}}>
                                                                    Center on ligand
                                                                </MenuItem>
                                                                <hr></hr>
                                                                <div style={{maxHeight: '9rem', overflowY: 'auto', width:'15rem'}}>
                                                                <Form.Check
                                                                    key={keycd}
                                                                    label={"Contact dots"}
                                                                    type="checkbox"
                                                                    style={{'margin': '0.5rem'}}
                                                                    checked={showState[keycd]}
                                                                    onChange={(e) => {
                                                                        if (e.target.checked) {
                                                                            props.molecule.show('contact_dots', ligandCid)
                                                                            const changedState = { ...showState }
                                                                            changedState[keycd] = true
                                                                            setShowState(changedState)
                                                                        }
                                                                        else {
                                                                            props.molecule.hide('contact_dots', ligandCid)
                                                                            const changedState = { ...showState }
                                                                            changedState[keycd] = false
                                                                            setShowState(changedState)
                                                                        }
                                                                }}/>
                                                                <Form.Check
                                                                    key={keyenv}
                                                                    label={"Environment distances"}
                                                                    type="checkbox"
                                                                    style={{'margin': '0.5rem'}}
                                                                    checked={showState[keyenv]}
                                                                    onChange={(e) => {
                                                                        if (e.target.checked) {
                                                                            props.molecule.show('ligand_environment', ligandCid)
                                                                            const changedState = { ...showState }
                                                                            changedState[keyenv] = true
                                                                            setShowState(changedState)
                                                                        }
                                                                        else {
                                                                            props.molecule.hide('ligand_environment', ligandCid)
                                                                            const changedState = { ...showState }
                                                                            changedState[keyenv] = false
                                                                            setShowState(changedState)
                                                                        }
                                                                }}/>
                                                                <Form.Check
                                                                    key={keycf}
                                                                    label={"Chemical features"}
                                                                    type="checkbox"
                                                                    checked={showState[keycf]}
                                                                    style={{'margin': '0.5rem'}}
                                                                    onChange={(e) => {
                                                                        if (e.target.checked) {
                                                                            props.molecule.show('chemical_features', ligandCid)
                                                                            const changedState = { ...showState }
                                                                            changedState[keycf] = true
                                                                            setShowState(changedState)
                                                                        }
                                                                        else {
                                                                            props.molecule.hide('chemical_features', ligandCid)
                                                                            const changedState = { ...showState }
                                                                            changedState[keycf] = false
                                                                            setShowState(changedState)
                                                                        }
                                                                }}/>
                                                                <Form.Check
                                                                    key={keyval}
                                                                    label={"Geom. Validation"}
                                                                    type="checkbox"
                                                                    checked={showState[keyval]}
                                                                    style={{'margin': '0.5rem'}}
                                                                    onChange={(e) => {
                                                                        if (e.target.checked) {
                                                                            props.molecule.show('ligand_validation', ligandCid)
                                                                            const changedState = { ...showState }
                                                                            changedState[keyval] = true
                                                                            setShowState(changedState)
                                                                        }
                                                                        else {
                                                                            props.molecule.hide('ligand_validation', ligandCid)
                                                                            const changedState = { ...showState }
                                                                            changedState[keyval] = false
                                                                            setShowState(changedState)
                                                                        }
                                                                }}/>
                                                                </div>
                                                            </DropdownButton>
                                                </Stack>
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

MoorhenLigandList.defaultProps = { setBusy: () => {}, height: '30vh'}