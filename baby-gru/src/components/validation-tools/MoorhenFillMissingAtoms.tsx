import { Col, Row, Card, Button } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import { useCallback } from 'react';
import { useSnackbar } from 'notistack';
import { moorhenGlobalInstance } from '../../InstanceManager/MoorhenGlobalInstance';
import { moorhen } from "../../types/moorhen";
import { libcootApi } from '../../types/libcoot';
import { triggerUpdate } from '../../store/moleculeMapUpdateSlice';
import { cidToSpec, sleep } from '../../utils/utils';
import { hideModal } from '../../store/modalsSlice';
import { modalKeys } from '../../utils/enums';
import { MoorhenValidationListWidgetBase } from "./MoorhenValidationListWidgetBase";

export const MoorhenFillMissingAtoms = () => {
    const dispatch = useDispatch()

    const enableRefineAfterMod = useSelector((state: moorhen.State) => state.refinementSettings.enableRefineAfterMod)
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)
    const commandCentre = moorhenGlobalInstance.getCommandCentre()

    const { enqueueSnackbar } = useSnackbar()

    const fillPartialResidue = async (selectedMolecule: moorhen.Molecule, chainId: string, resNum: number, insCode: string) => {
        await commandCentre.cootCommand({
            returnType: "status",
            command: "fill_partial_residue",
            commandArgs: [selectedMolecule.molNo, chainId, resNum, insCode],
            changesMolecules: [selectedMolecule.molNo]
        }, true)

        if (enableRefineAfterMod) {
            await commandCentre.cootCommand({
                returnType: "status",
                command: 'refine_residues_using_atom_cid',
                commandArgs: [selectedMolecule.molNo, `//${chainId}/${resNum}`, 'TRIPLE', 4000],
                changesMolecules: [selectedMolecule.molNo]
            }, true)    
        }
        selectedMolecule.setAtomsDirty(true)
        await selectedMolecule.redraw()
        dispatch( triggerUpdate(selectedMolecule.molNo) )
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

        const response = await commandCentre.cootCommand(inputData, false) as moorhen.WorkerResponse<libcootApi.ResidueSpecJS[]>
        const newResidueList = response.data.result.result
        return newResidueList
    }

    const handleFillAll = useCallback((selectedMolecule: moorhen.Molecule, residues: libcootApi.ResidueSpecJS[]) => {
        dispatch( hideModal(modalKeys.FILL_PART_RES) )
        if (selectedMolecule) {
            const handleStepFillAtoms = async (cid: string) => {
                const resSpec = cidToSpec(cid)
                await selectedMolecule.centreAndAlignViewOn(cid, true)
                await sleep(1000)
                await fillPartialResidue(selectedMolecule, resSpec.chain_id, resSpec.res_no, resSpec.ins_code)
            }

            const residueList = residues.map(residue => {
                return {
                    cid: `//${residue.chainId}/${residue.resNum}/`
                }
            })
        
            enqueueSnackbar("fill-all-atoms", {
                variant: "residueSteps",
                persist: true,
                residueList: residueList,
                sleepTime: 1500,
                onStep: handleStepFillAtoms,
                onStart: async () => {
                    await selectedMolecule.fetchIfDirtyAndDraw('rotamer')
                },
                onStop: () => {
                    selectedMolecule.clearBuffersOfStyle('rotamer')
                },
            })
        }
    }, [molecules])

    const getCards = useCallback((selectedModel: number, selectedMap: number, residueList: libcootApi.ResidueSpecJS[]) => {
        const selectedMolecule =  molecules.find(molecule => molecule.molNo === selectedModel)
        
        let cards = residueList.map(residue => {
            const label = `/${residue.modelNumber}/${residue.chainId}/${residue.resNum}${residue.insCode ? '.' + residue.insCode : ''}/`
            return <Card style={{marginTop: '0.5rem'}} key={label}>
                    <Card.Body style={{padding:'0.5rem'}}>
                        <Row style={{display:'flex', justifyContent:'between'}}>
                            <Col style={{alignItems:'center', justifyContent:'left', display:'flex'}}>
                                {label}
                            </Col>
                            <Col className='col-3' style={{margin: '0', padding:'0', justifyContent: 'right', display:'flex'}}>
                                <Button style={{marginRight:'0.5rem'}} onClick={() => selectedMolecule.centreAndAlignViewOn(`//${residue.chainId}/${residue.resNum}-${residue.resNum}/`, true)}>
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
        if (cards.length > 0) {
            const button = <Button style={{width: '100%'}} onClick={() => handleFillAll(selectedMolecule, residueList)} key='fill-all-button'>
                Fill all
            </Button>
            cards = [button, ...cards]
        }
        return cards
    }, [molecules])

    return <MoorhenValidationListWidgetBase 
                enableMapSelect={false}
                fetchData={fetchCardData}
                getCards={getCards}
                menuId='fill-missing-atoms-validation'
            />
}
