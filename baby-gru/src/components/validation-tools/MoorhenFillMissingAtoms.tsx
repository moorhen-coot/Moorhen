import { Col, Row, Card, Button } from 'react-bootstrap';
import { MoorhenValidationListWidgetBase } from "./MoorhenValidationListWidgetBase";
import { moorhen } from "../../types/moorhen";
import { libcootApi } from '../../types/libcoot';
import { useSelector } from 'react-redux';

interface Props extends moorhen.CollectedProps {
    dropdownId: number;
    accordionDropdownId: number;
    setAccordionDropdownId: React.Dispatch<React.SetStateAction<number>>;
    sideBarWidth: number;
    showSideBar: boolean;
}

export const MoorhenFillMissingAtoms = (props: Props) => {
    const enableRefineAfterMod = useSelector((state: moorhen.State) => state.miscAppSettings.enableRefineAfterMod)
    const molecules = useSelector((state: moorhen.State) => state.molecules)

    const fillPartialResidue = async (selectedMolecule: moorhen.Molecule, chainId: string, resNum: number, insCode: string) => {
        await props.commandCentre.current.cootCommand({
            returnType: "status",
            command: "fill_partial_residue",
            commandArgs: [selectedMolecule.molNo, chainId, resNum, insCode],
            changesMolecules: [selectedMolecule.molNo]
        }, true)

        if (enableRefineAfterMod) {
            await props.commandCentre.current.cootCommand({
                returnType: "status",
                command: 'refine_residues_using_atom_cid',
                commandArgs: [selectedMolecule.molNo, `/${insCode}/${chainId}/${resNum}`, 'TRIPLE', 4000],
                changesMolecules: [selectedMolecule.molNo]
            }, true)    
        }
        selectedMolecule.setAtomsDirty(true)
        selectedMolecule.redraw()
        const scoresUpdateEvent: moorhen.ScoresUpdateEvent = new CustomEvent("scoresUpdate", { detail: {origin: props.glRef.current.origin,  modifiedMolecule: selectedMolecule.molNo} })
        document.dispatchEvent(scoresUpdateEvent);    
    }

    const handleAtomFill = (...args: [moorhen.Molecule, string, number, string]) => {
        if (args.every(arg => arg !== null)) {
            fillPartialResidue(...args)
        }
    }

    async function fetchCardData(selectedModel: number, selectedMap: number): Promise<libcootApi.ResidueSpecJS[]> {
        const inputData = {
            message: 'coot_command',
            command: 'residues_with_missing_atoms',
            returnType: 'residue_specs',
            commandArgs: [selectedModel]
        }

        let response = await props.commandCentre.current.cootCommand(inputData, false) as moorhen.WorkerResponse<libcootApi.ResidueSpecJS[]>
        let newResidueList = response.data.result.result
        return newResidueList
    }

    const getCards = (selectedModel: number, selectedMap: number, residueList: libcootApi.ResidueSpecJS[]) => {
        const selectedMolecule =  molecules.find(molecule => molecule.molNo === selectedModel)
        
        return residueList.map(residue => {
            const label = `/${residue.modelNumber}/${residue.chainId}/${residue.resNum}${residue.insCode ? '.' + residue.insCode : ''}/`
            return <Card style={{marginTop: '0.5rem'}} key={label}>
                    <Card.Body style={{padding:'0.5rem'}}>
                        <Row style={{display:'flex', justifyContent:'between'}}>
                            <Col style={{alignItems:'center', justifyContent:'left', display:'flex'}}>
                                {label}
                            </Col>
                            <Col className='col-3' style={{margin: '0', padding:'0', justifyContent: 'right', display:'flex'}}>
                                <Button style={{marginRight:'0.5rem'}} onClick={() => selectedMolecule.centreOn(`/*/${residue.chainId}/${residue.resNum}-${residue.resNum}/*`)}>
                                    View
                                </Button>
                                <Button style={{marginRight:'0.5rem'}} onClick={() => {
                                            handleAtomFill(selectedMolecule, residue.chainId, residue.resNum, residue.insCode)
                                }}>
                                    Fill
                                </Button>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>
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
