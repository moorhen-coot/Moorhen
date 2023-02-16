import { Settings } from "@mui/icons-material";
import React, { useEffect, useState } from "react";
import { Card, Form, Row, Col, DropdownButton, Stack } from "react-bootstrap";
import parse from 'html-react-parser'
import { MenuItem } from "@mui/material";

export const MoorhenLigandList = (props) => {
    const [ligandList, setLigandList] = useState([])
    const [showState, setShowState] = useState({})

    const getLigandSVG = async (imol, compId) => {
        const result = await props.commandCentre.current.cootCommand({
            returnType: "string",
            command: 'get_svg_for_residue_type',
            commandArgs: [imol, compId, props.darkMode],
        }, true)
        
        const parser = new DOMParser()
        let theText = result.data.result.result
        let doc = parser.parseFromString(theText, "image/svg+xml")
        let xmin = 999
        let ymin = 999
        let xmax = -999
        let ymax = -999
        
        let lines = doc.getElementsByTagName("line")
        for (let l of lines) {
            const x1 = parseFloat(l.getAttribute("x1"))
            const y1 = parseFloat(l.getAttribute("y1"))
            const x2 = parseFloat(l.getAttribute("x2"))
            const y2 = parseFloat(l.getAttribute("y2"))
            if(x1>xmax) xmax = x1
            if(x1<xmin) xmin = x1
            if(y1>ymax) ymax = y1
            if(y1<ymin) ymin = y1
            if(x2>xmax) xmax = x2
            if(x2<xmin) xmin = x2
            if(y2>ymax) ymax = y2
            if(y2<ymin) ymin = y2
        }
        
        let texts = doc.getElementsByTagName("text");
        for (let t of texts) {
            const x = parseFloat(t.getAttribute("x"))
            const y = parseFloat(t.getAttribute("y"))
            if(x>xmax) xmax = x
            if(x<xmin) xmin = x
            if(y>ymax) ymax = y
            if(y<ymin) ymin = y
        }
        
        let polygons = doc.getElementsByTagName("polygon");
        for (let poly of polygons) {
            const points = poly.getAttribute("points").trim().split(" ")
            for (const point of points) {
                const xy = point.split(",")
                const x = parseFloat(xy[0])
                const y = parseFloat(xy[1])
                if(x>xmax) xmax = x
                if(x<xmin) xmin = x
                if(y>ymax) ymax = y
                if(y<ymin) ymin = y
            }
        }

        xmin -= 20
        ymin -= 20
        //xmax -= 120
        ymax -= 100
        let svgs = doc.getElementsByTagName("svg")
        const viewBoxStr = xmin+" "+ymin+" "+xmax+" "+ymax
        for (let item of svgs) {
            item.setAttribute("viewBox" , viewBoxStr)
            item.setAttribute("width" , "100%")
            item.setAttribute("height" , "100%")
            theText = item.outerHTML
        }
        
        return theText 
    }

    useEffect(() => {
        async function updateLigandList() {
            if (props.molecule.gemmiStructure === null || props.molecule.atomsDirty || props.molecule.ligands === null) {
                await props.molecule.updateAtoms()
            }
            if (props.molecule.gemmiStructure === null || props.molecule.ligands === null) {
                return
            }

            let ligandList = []
            for (const ligand of props.molecule.ligands) {
                const ligandSVG = await getLigandSVG(props.molecule.molNo, ligand.resName)
                ligandList.push({svg: ligandSVG, ...ligand})
            }
    
            setLigandList(ligandList)
        }

        updateLigandList()

    }, [props.molecule.ligands])

    return <>
            {ligandList.length > 0 ? 
                <>
                    <Row style={{ height: '100%' }}>
                        <Col style={{paddingLeft: '0.5rem', paddingRight: '0.5rem'}}>
                            {ligandList.map((ligand, index) => {
                                const keycd = `contact_dots-${ligand.chainName}/${ligand.resNum}(${ligand.resName})`
                                const keycf = `chemical_features-${ligand.chainName}/${ligand.resNum}(${ligand.resName})`
                                return <Card key={index} style={{marginTop: '0.5rem'}}>
                                            <Card.Body style={{padding:'0.5rem'}}>
                                                <Stack direction="horizontal" gap={2} style={{alignItems: 'center', height:'10rem'}}>
                                                    <Col style={{height: '100%'}}>
                                                        {ligand.svg ? parse(ligand.svg) : null}
                                                    </Col>
                                                    <Col className='col-3' style={{justifyContent: 'right', display:'flex'}}>
                                                        <Stack gap={2} style={{alignItems: 'center'}}>
                                                            <DropdownButton
                                                                key="dropDownButton"
                                                                title={`${ligand.chainName}/${ligand.resNum}(${ligand.resName})`}
                                                                variant="outlined"
                                                                >
                                                                <MenuItem onClick={() => {props.molecule.centreOn(props.glRef, `/*/${ligand.chainName}/${ligand.resNum}-${ligand.resNum}/*`)}}>
                                                                    Center on ligand
                                                                </MenuItem>
                                                                <hr></hr>
                                                                <div style={{maxHeight: '6rem', overflowY: 'auto', width:'15rem'}}>
                                                                <Form.Check
                                                                    key={keycd}
                                                                    label={"Contact dots"}
                                                                    type="checkbox"
                                                                    variant="outline"
                                                                    style={{'margin': '0.5rem'}}
                                                                    checked={showState[keycd]}
                                                                    onChange={(e) => {
                                                                        if (e.target.checked) {
                                                                            props.molecule.show(keycd, props.glRef)
                                                                            const changedState = { ...showState }
                                                                            changedState[keycd] = true
                                                                            setShowState(changedState)
                                                                        }
                                                                        else {
                                                                            props.molecule.hide(keycd, props.glRef)
                                                                            const changedState = { ...showState }
                                                                            changedState[keycd] = false
                                                                            setShowState(changedState)
                                                                        }
                                                                }}/>
                                                                <Form.Check
                                                                    key={keycf}
                                                                    label={"Chemical features"}
                                                                    type="checkbox"
                                                                    variant="outline"
                                                                    checked={showState[keycf]}
                                                                    style={{'margin': '0.5rem'}}
                                                                    onChange={(e) => {
                                                                        if (e.target.checked) {
                                                                            props.molecule.show(keycf, props.glRef)
                                                                            const changedState = { ...showState }
                                                                            changedState[keycf] = true
                                                                            setShowState(changedState)
                                                                        }
                                                                        else {
                                                                            props.molecule.hide(keycf, props.glRef)
                                                                            const changedState = { ...showState }
                                                                            changedState[keycf] = false
                                                                            setShowState(changedState)
                                                                        }
                                                                }}/>
                                                                </div>
                                                            </DropdownButton>
                                                    </Stack>
                                                    </Col>
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
