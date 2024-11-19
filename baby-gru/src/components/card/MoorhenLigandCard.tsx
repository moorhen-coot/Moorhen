import { moorhen } from "../../types/moorhen";
import { useSelector } from 'react-redux';
import { Button, Card, Col, Row, Stack, ToggleButton } from "react-bootstrap";
import { useEffect, useRef, useState } from "react";
import { CenterFocusStrongOutlined, HelpOutlined, RadioButtonCheckedOutlined, RadioButtonUncheckedOutlined } from "@mui/icons-material";
import parse from 'html-react-parser'
import { convertViewtoPx, guid } from "../../utils/utils";
import { LinearProgress, Popover, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material";

export const MoorhenLigandCard = (props: {
    ligand: moorhen.LigandInfo;
    molecule: moorhen.Molecule;
    validationStyles?: moorhen.RepresentationStyles[];
    calculateQScore?: boolean;
}) => {

    const validationLabels = {
        'chemical_features': 'Chem. Feat.',
        'ligand_environment': 'Env. Dist.',
        'contact_dots': 'Cont. dots',
        'ligand_validation': 'Geom. Validation',
    }

    const anchorEl = useRef(null)

    const [showState, setShowState] = useState<{ [key: string]: boolean }>({})
    const [showInfoTable, setShowInfoTable] = useState<boolean>(false)
    const [qScore, setQScore] = useState<number | null>(null)
    
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)
    const width = useSelector((state: moorhen.State) => state.sceneSettings.width)
    const activeMap = useSelector((state: moorhen.State) => state.generalStates.activeMap)

    const defaultValidationStyles = [
        'contact_dots', 'chemical_features', 'ligand_environment', 'ligand_validation'
    ]
    
    const { ligand, molecule, validationStyles, calculateQScore } = { validationStyles: defaultValidationStyles, calculateQScore: false,  ...props }

    useEffect(() => {
        const changedState = { ...showState }
        validationStyles.forEach(style => changedState[style] = molecule.representations.some(representation => representation.style === style && representation.visible))
        setShowState(changedState)
        return () => {
            validationStyles.forEach(key => {
                molecule.hide(key, ligand.cid)
            })
        }
    }, [])

    useEffect(() => {
        const getQScore = async () => {
            if (activeMap && calculateQScore) {
                const qScoreResponse = await molecule.calculateQscore(activeMap, ligand.cid)
                setQScore(qScoreResponse?.[0]?.value)
            }    
        }
        getQScore()
    }, [])

    const getToggleButton = (style: string, label: string) => {
        return <ToggleButton
                key={`${style}-${molecule.molNo}-${ligand.cid}`}
                id={style}
                type="checkbox"
                variant={isDark ? "outline-light" : "outline-primary"}
                checked={showState[style]}
                style={{ marginLeft: '0.1rem', marginRight: '0.5rem', justifyContent: 'space-betweeen', display: 'flex' }}
                onClick={() => {
                    if (showState[style]) {
                        molecule.hide(style, ligand.cid)
                        const changedState = { ...showState }
                        changedState[style] = false
                        setShowState(changedState)
                    } else {
                        molecule.show(style, ligand.cid)
                        const changedState = { ...showState }
                        changedState[style] = true
                        setShowState(changedState)
                    }
                }}
                value={""}                >
                {showState[style] ? <RadioButtonCheckedOutlined/> : <RadioButtonUncheckedOutlined/>}
                <span style={{marginLeft: '0.5rem'}}>{label}</span>
        </ToggleButton>
    }

    // For some reason a random key needs to be used here otherwise the scroll of the card list gets reset with every re-render
    return <Card key={guid()} style={{marginTop: '0.5rem'}}>
            <Card.Body ref={anchorEl} style={{padding:'0.5rem'}}>
                <Row style={{display:'flex', justifyContent:'between'}}>
                    <Col style={{alignItems:'center', justifyContent:'left', display:'flex'}}>
                        {ligand.chem_comp_info?.length > 0 &&
                            <Popover 
                                anchorOrigin={{vertical: 'center', horizontal: 'center'}}
                                transformOrigin={{vertical: 'center', horizontal: 'center'}}
                                open={showInfoTable}
                                onClose={() => setShowInfoTable(false)}
                                anchorEl={{
                                    nodeType: 1,
                                    getBoundingClientRect: () => anchorEl.current.getBoundingClientRect()
                                  }}
                                sx={{
                                    '& .MuiPaper-root': {
                                        overflowY: 'hidden', borderRadius: '8px', padding: '0.5rem', background: isDark ? 'grey' : 'white'
                                    }
                                }}                            
                            >
                            <TableContainer style={{maxWidth: convertViewtoPx(40, width), maxHeight: convertViewtoPx(40, height), overflow: 'auto'}}>
                                <Table stickyHeader={true}>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Field</TableCell>
                                            <TableCell>Value</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                    {ligand.chem_comp_info.map((chemInfo, idx) => 
                                        <TableRow style={{backgroundColor: idx % 2 !== 0 ? 'white' : 'rgba(233, 233, 233, 0.3)'}} key={`${chemInfo.first} - ${chemInfo.second}`} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                            <TableCell component="th" scope="row">{chemInfo.first}</TableCell>
                                            <TableCell component="th" scope="row">{chemInfo.second}</TableCell>
                                        </TableRow>

                                    )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                            </Popover>}
                            <Stack direction="vertical" gap={1}>
                                {ligand.svg ? parse(ligand.svg) : <span>{ligand.cid}</span>}
                                {(calculateQScore && activeMap) ?
                                <div style={{ display: "flex", justifyContent: "center" }}>
                                    {
                                    qScore ? <span>Q-Score: {qScore.toFixed(2)}</span> : <LinearProgress variant="indeterminate" style={{ width: "50%" }}/>
                                    }
                                </div>
                                : null}
                            </Stack>
                    </Col>
                    <Col className='col-3' style={{margin: '0', padding:'0', justifyContent: 'right', display:'flex'}}>
                        <Stack direction='vertical' gap={1} style={{display: 'flex', justifyContent: 'center'}}>
                            <Button variant="secondary" style={{marginRight:'0.5rem', display: 'flex', justifyContent: 'left'}} onClick={() => {
                                molecule.centreOn(ligand.cid, true, true)
                            }}>
                                <CenterFocusStrongOutlined style={{marginRight: '0.5rem'}}/>
                                {ligand.cid}
                            </Button>
                            {validationStyles.map(style => {
                                return getToggleButton(style, validationLabels[style])
                            })}
                            {ligand.chem_comp_info?.length > 0 &&
                            <Button  variant="secondary" style={{marginRight:'0.5rem', display: 'flex', justifyContent: 'left'}} onClick={() => setShowInfoTable((prev) => !prev)}>
                                <HelpOutlined style={{marginRight: '0.5rem'}}/>
                                Show info
                            </Button>
                            }
                        </Stack>
                    </Col>
                </Row>
            </Card.Body>
        </Card>
}
