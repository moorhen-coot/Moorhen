import { BubbleChartOutlined } from "@mui/icons-material";
import React, { useEffect, useState } from "react";
import { Card, Form, Row, Col, Button, DropdownButton } from "react-bootstrap";

export const MoorhenLigandList = (props) => {
    const [ligandList, setLigandList] = useState([])
    const [ligandListSVG, setLigandListSVG] = useState({})
    const [cachedGemmiStructure, setCachedGemmiStructure] = useState(null)
    const [showState, setShowState] = useState({})

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

        ligandList.forEach(ligand => {
            const compid = ligand.resName
            props.commandCentre.current.cootCommand({
                returnType: "string",
                command: 'get_svg_for_residue_type',
                commandArgs: [props.molecule.molNo,compid],
            }, true).then(result => {
                const parser = new DOMParser()
                let doc = parser.parseFromString(result.data.result.result,"image/svg+xml")
                let svgs = doc.getElementsByTagName("svg");
                let theText = result.data.result.result
                let xmin = 999
                let ymin = 999
                let xmax = -999
                let ymax = -999
                let lines = doc.getElementsByTagName("line");
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
                    points.forEach(point => {
                        const xy = point.split(",")
                        const x = parseFloat(xy[0])
                        const y = parseFloat(xy[1])
                        if(x>xmax) xmax = x
                        if(x<xmin) xmin = x
                        if(y>ymax) ymax = y
                        if(y<ymin) ymin = y
                    })
                }
                xmin -= 20
                ymin -= 20
                xmax += 20
                ymax += 20
                const viewBoxStr = xmin+" "+ymin+" "+xmax+" "+ymax
                for (let item of svgs) {
                    item.setAttribute("viewBox" , viewBoxStr)
                    theText = item.outerHTML
                }
                ligandListSVG[compid] = theText
        })
        })

    }, [cachedGemmiStructure])

    useEffect(() => {
        setCachedGemmiStructure(props.molecule.gemmiStructure)
    })

    return <>
            {ligandList.length > 0 ? 
                <>
                    <Row style={{ height: '100%' }}>
                        <Col style={{paddingLeft: '0.5rem', paddingRight: '0.5rem'}}>
                            {ligandList.map((ligand, index) => {
                                const keycd = `contact_dots-${ligand.chainName}/${ligand.resNum}(${ligand.resName})`
                                const keycf = `chemical_features-${ligand.chainName}/${ligand.resNum}(${ligand.resName})`
                                const compid = ligand.resName;
                                let svg = ""
                                if(compid in ligandListSVG){
                                    //FIXME - Uncomment this to make ligand pictures appear.
                                    //svg = ligandListSVG[compid];
                                }
                                return <Card key={index} style={{marginTop: '0.5rem'}}>
                                            <Card.Body style={{padding:'0.5rem'}}>
                                                <Row style={{display:'flex', justifyContent:'between'}}>
                                                    <Col style={{alignItems:'center', justifyContent:'left', display:'flex'}}>
                                                        {`${ligand.chainName}/${ligand.resNum}(${ligand.resName})`}
                                                    </Col>
                                                    <Col className='col-3' style={{justifyContent: 'right', display:'flex'}}>
                                                        <DropdownButton
                                                            key="dropDownButton"
                                                            title={<BubbleChartOutlined/>}
                                                            variant="outlined"
                                                        >
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
                                                        <Button onClick={() => {props.molecule.centreOn(props.glRef, `/*/${ligand.chainName}/${ligand.resNum}-${ligand.resNum}/*`)}}>
                                                            View
                                                        </Button>
                                                    </Col>
                                                </Row>
                                                <Row>
                                                <div dangerouslySetInnerHTML={{__html: svg}}></div>
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
