import { moorhen } from "../../types/moorhen";
import { useSelector } from 'react-redux';
import { Button, Card, Col, Row, Stack, ToggleButton } from "react-bootstrap";
import { useEffect, useState } from "react";
import { CenterFocusStrongOutlined, RadioButtonCheckedOutlined, RadioButtonUncheckedOutlined } from "@mui/icons-material";
import parse from 'html-react-parser'
import { guid } from "../../utils/MoorhenUtils";

export const MoorhenLigandCard = (props: {
    ligand: moorhen.LigandInfo;
    molecule: moorhen.Molecule;
    validationStyles?: moorhen.RepresentationStyles[]
}) => {

    const validationLabels = {
        'chemical_features': 'Chem. Feat.',
        'ligand_environment': 'Env. Dist.',
        'contact_dots': 'Cont. dots',
        'ligand_validation': 'Geom. Validation',
    }

    const [showState, setShowState] = useState<{ [key: string]: boolean }>({})
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)

    const { ligand, molecule } = props

    useEffect(() => {
        const changedState = { ...showState }
        props.validationStyles.forEach(style => changedState[style] = molecule.representations.some(representation => representation.style === style && representation.visible))
        setShowState(changedState)
        return () => {
            props.validationStyles.forEach(key => {
                molecule.hide(key, ligand.cid)
            })
        }
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
            <Card.Body style={{padding:'0.5rem'}}>
                <Row style={{display:'flex', justifyContent:'between'}}>
                    <Col style={{alignItems:'center', justifyContent:'left', display:'flex'}}>
                        {ligand.svg ? parse(ligand.svg) : <span>{ligand.cid}</span>}
                    </Col>
                    <Col className='col-3' style={{margin: '0', padding:'0', justifyContent: 'right', display:'flex'}}>
                        <Stack direction='vertical' gap={1} style={{display: 'flex', justifyContent: 'center'}}>
                            <Button variant="secondary" style={{marginRight:'0.5rem', display: 'flex', justifyContent: 'left'}} onClick={() => {
                                molecule.centreOn(ligand.cid, true)
                            }}>
                                <CenterFocusStrongOutlined style={{marginRight: '0.5rem'}}/>
                                {ligand.cid}
                            </Button>
                            {props.validationStyles.map(style => {
                                return getToggleButton(style, validationLabels[style])
                            })}
                        </Stack>
                    </Col>
                </Row>
            </Card.Body>
        </Card>
}

MoorhenLigandCard.defaultProps = {
    validationStyles: [
        'contact_dots', 'chemical_features', 'ligand_environment', 'ligand_validation'
    ]
}