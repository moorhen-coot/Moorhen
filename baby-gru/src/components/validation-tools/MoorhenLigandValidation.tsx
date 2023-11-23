import { moorhen } from "../../types/moorhen";
import { useSelector } from 'react-redux';
import { MoorhenValidationListWidgetBase } from "./MoorhenValidationListWidgetBase";
import { Button, Card, Col, Row, Stack, ToggleButton } from "react-bootstrap";
import { getLigandSVG } from "../../utils/MoorhenUtils";
import parse from 'html-react-parser'
import { useEffect, useState } from "react";
import { CenterFocusStrongOutlined, RadioButtonCheckedOutlined, RadioButtonUncheckedOutlined } from "@mui/icons-material";

interface Props extends moorhen.CollectedProps {
    dropdownId: number;
    accordionDropdownId: number;
    setAccordionDropdownId: React.Dispatch<React.SetStateAction<number>>;
    sideBarWidth: number;
    showSideBar: boolean;
}

export const LigandCard = (props: {
    ligand: moorhen.LigandInfo;
    index: number; 
    selectedMolecule: moorhen.Molecule; 
}) => {

    const styleKeys = [
        'contact_dots', 'chemical_features', 'ligand_environment', 'ligand_validation'
    ] as moorhen.RepresentationStyles[]

    const [showState, setShowState] = useState<{ [key: string]: boolean }>({})
    const isDark = useSelector((state: moorhen.State) => state.canvasStates.isDark)

    const { ligand, index, selectedMolecule } = props

    useEffect(() => {
        const changedState = { ...showState }
        styleKeys.forEach(style => changedState[style] = selectedMolecule.representations.some(representation => representation.style === style && representation.visible))
        setShowState(changedState)
        return () => {
            styleKeys.forEach(key => {
                selectedMolecule.hide(key, ligand.cid)
            })
        }
    }, [])

    const getToggleButton = (style: string, label: string) => {
        return <ToggleButton
                id={style}
                type="checkbox"
                variant={isDark ? "outline-light" : "outline-primary"}
                checked={showState[style]}
                style={{ marginLeft: '0.1rem', marginRight: '0.5rem', justifyContent: 'space-betweeen', display: 'flex' }}
                onClick={() => {
                    if (showState[style]) {
                        selectedMolecule.hide(style, ligand.cid)
                        const changedState = { ...showState }
                        changedState[style] = false
                        setShowState(changedState)
                    } else {
                        selectedMolecule.show(style, ligand.cid)
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

    return <Card key={index} style={{marginTop: '0.5rem'}}>
            <Card.Body style={{padding:'0.5rem'}}>
                <Row style={{display:'flex', justifyContent:'between'}}>
                    <Col style={{alignItems:'center', justifyContent:'left', display:'flex'}}>
                        {ligand.svg ? parse(ligand.svg) : <span>{ligand.cid}</span>}
                    </Col>
                    <Col className='col-3' style={{margin: '0', padding:'0', justifyContent: 'right', display:'flex'}}>
                        <Stack direction='vertical' gap={1} style={{display: 'flex', justifyContent: 'center'}}>
                            <Button style={{marginRight:'0.5rem', display: 'flex', justifyContent: 'left'}} onClick={() => {
                                selectedMolecule.centreOn(ligand.cid, true)
                            }}>
                                <CenterFocusStrongOutlined style={{marginRight: '0.5rem'}}/>
                                View
                            </Button>
                            {getToggleButton('chemical_features', 'Chem. Feat.')}
                            {getToggleButton('ligand_environment', 'Env. Dist.')}
                            {getToggleButton('contact_dots', 'Cont. dots')}
                            {getToggleButton('ligand_validation', 'Geom. Validation')}
                        </Stack>
                    </Col>
                </Row>
            </Card.Body>
        </Card>
}

export const MoorhenLigandValidation = (props: Props) => {
    const molecules = useSelector((state: moorhen.State) => state.molecules)
    const isDark = useSelector((state: moorhen.State) => state.canvasStates.isDark)

    const fetchCardData = async (selectedModel: number, selectedMap: number): Promise<moorhen.LigandInfo[]> => {
        let ligandInfo: moorhen.LigandInfo[] = []
        const selectedMolecule = molecules.find(molecule => molecule.molNo === selectedModel)
        
        if (selectedMolecule) {
            ligandInfo = await Promise.all(selectedMolecule.ligands.map(async (ligand) => {
                const ligandSVG = await getLigandSVG(props.commandCentre, selectedModel, ligand.resName, isDark)
                return {...ligand, svg: ligandSVG}
            }))
        }

        return ligandInfo
    }

    const getCards = (selectedModel: number, selectedMap: number, ligandInfo: moorhen.LigandInfo[]): JSX.Element[] => {
        const selectedMolecule = molecules.find(molecule => molecule.molNo === selectedModel)
        
        if (!selectedMolecule) {
            return []
        }

        return ligandInfo.map((ligand, index) => {
            return <LigandCard key={index} ligand={ligand} index={index} selectedMolecule={selectedMolecule}/>
        })
    }

    return <MoorhenValidationListWidgetBase 
                sideBarWidth={props.sideBarWidth}
                dropdownId={props.dropdownId}
                accordionDropdownId={props.accordionDropdownId}
                showSideBar={props.showSideBar}
                enableMapSelect={false}
                fetchData={fetchCardData}
                getCards={getCards}
            />
}
