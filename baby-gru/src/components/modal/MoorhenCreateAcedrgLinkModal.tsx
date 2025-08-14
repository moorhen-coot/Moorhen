import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { Button, Card, Dropdown, Form, InputGroup, Row, Spinner, SplitButton, Stack } from "react-bootstrap";
import { Backdrop, TextField } from "@mui/material";
import { useDispatch, useSelector } from 'react-redux';
import { usePaths, useMoorhenGlobalInstance } from '../../InstanceManager';
import { moorhen } from "../../types/moorhen";
import { cidToSpec, convertRemToPx, convertViewtoPx, parseAtomInfoLabel } from "../../utils/utils";
import { modalKeys } from '../../utils/enums';
import { hideModal } from '../../store/modalsSlice';
import { MoorhenDraggableModalBase } from "./MoorhenDraggableModalBase";


type AceDRGtomPickerProps = {
    monomerLibraryPath: string;
    id: number;
    awaitAtomClick: number;
    setAwaitAtomClick: React.Dispatch<React.SetStateAction<number>>;
}

const AceDRGtomPicker = forwardRef<any, AceDRGtomPickerProps>((props, ref) => {
    const [selectedAtom, setSelectedAtom] = useState<string>(null)
    const [monomerAtoms, setMonomerAtoms] = useState<moorhen.AtomInfo[]>([])
    const [monomerBonds, setMonomerBonds] = useState<{ atom_id_1: string; atom_id_2: string; bond_type: string; label: string; }[]>([])
    const [deleteAtom, setDeleteAtom] = useState<boolean>(false)
    const [changeOrderBond, setChangeOrderBond] = useState<boolean>(false)
    const [changeAtomCharge, setChangeAtomCharge] = useState<boolean>(false)
    const [newAtomCharge, setNewAtomCharge] = useState<string>(null)

    const selectedMolNoRef = useRef<number>(null)
    const selectedAtomValueRef = useRef<string>(null)
    const deleteAtomValueRef = useRef<boolean>(null)
    const deleteSelectedAtomValueRef = useRef<HTMLSelectElement | null>(null)
    const changeAtomChargeValueRef = useRef<boolean>(null)
    const changeSelectedAtomChargeValueRef = useRef<HTMLSelectElement | null>(null)
    const newAtomChargeValueRef = useRef<string>(null)
    const changeBondOrderValueRef = useRef<boolean>(null)
    const changeSelectedBondOrderValueRef = useRef<HTMLSelectElement | null>(null)
    const newBondOrderValueRef = useRef<HTMLSelectElement | null>(null)

    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)

    useImperativeHandle(ref, () => ({
        getFormData: (): moorhen.createCovLinkAtomInput => {return {
            selectedMolNo: selectedMolNoRef.current,
            selectedAtom: selectedAtomValueRef.current,
            deleteAtom: deleteAtomValueRef.current,
            deleteSelectedAtom: deleteSelectedAtomValueRef.current?.value,
            changeAtomCharge: changeAtomChargeValueRef.current,
            changeSelectedAtomCharge: changeSelectedAtomChargeValueRef.current?.value,
            newAtomCharge: newAtomChargeValueRef.current,
            changeBondOrder: changeBondOrderValueRef.current,
            changeSelectedBondOrder: changeSelectedBondOrderValueRef.current?.value,
            newBondOrder: newBondOrderValueRef.current?.value
        }}
    }), 
    [selectedMolNoRef, selectedAtomValueRef, deleteAtomValueRef, deleteSelectedAtomValueRef, changeSelectedAtomChargeValueRef, changeSelectedBondOrderValueRef, changeAtomChargeValueRef, newAtomChargeValueRef, newBondOrderValueRef, changeBondOrderValueRef])

    const getBonds = async (chosenMolecule: moorhen.Molecule, chosenAtom: moorhen.ResidueSpec) => {
        const compId = chosenAtom.res_name
        let fileContent = chosenMolecule.getDict(compId)

        if (!fileContent) {
            const response = await fetch(`${props.monomerLibraryPath}/${compId.toLowerCase()[0]}/${compId.toUpperCase()}.cif`)
            if (response.ok) {
                fileContent = await response.text()    
            }    
        }

        if (!fileContent) {
            console.log('Unable to get bonds for chosen atom...')
            return []
        }
        
        
        const doc = new window.CCP4Module.cifDocument()
        window.CCP4Module.cif_parse_string(doc, fileContent)
        
        const blocks = doc.blocks
        const blocksSize = blocks.size()
        
        const bonds: {
            atom_id_1: string;
            atom_id_2: string;
            bond_type: string;
            label: string;
        }[] = []
        for (let i = 0; i < blocksSize; i++) {
            const block = blocks.get(i)
            if (block.name !== 'comp_list') {
                const atom_id_1 = block.find_loop('_chem_comp_bond.atom_id_1')
                const atom_id_2 = block.find_loop('_chem_comp_bond.atom_id_2')
                const bond_type = block.find_loop('_chem_comp_bond.type')
                const loopSize = atom_id_1.length()
                for (let j = 0; j < loopSize; j++) {
                    bonds.push({
                        atom_id_1: atom_id_1.str(j),
                        atom_id_2: atom_id_2.str(j),
                        bond_type: bond_type.str(j),
                        label: `${atom_id_2.str(j)} -- ${atom_id_1.str(j)}`
                    })    
                }
                atom_id_1.delete()
                atom_id_2.delete()
                bond_type.delete()
            }
            block.delete()
        }
        blocks.delete()
        doc.delete()
        
        return bonds
    }

    const setAtomPickerEventListener = async (evt) => {
        const chosenMolecule = molecules.find(molecule => molecule.buffersInclude(evt.detail.buffer))
        const chosenAtom = cidToSpec(evt.detail.atom.label)
        const chosenResidueCid = `/${chosenAtom.mol_no}/${chosenAtom.chain_id}/${chosenAtom.res_no}-${chosenAtom.res_no}/*`
        const [atoms, monomerBonds] = await Promise.all([chosenMolecule.gemmiAtomsForCid(chosenResidueCid), getBonds(chosenMolecule, chosenAtom)])
        selectedMolNoRef.current = chosenMolecule.molNo
        setSelectedAtom(chosenAtom.cid)
        selectedAtomValueRef.current = chosenAtom.cid
        setMonomerAtoms(atoms)
        setMonomerBonds(monomerBonds)
        props.setAwaitAtomClick(-1)
    }

    useEffect(() => {
        if (props.awaitAtomClick === props.id) {
            document.addEventListener('atomClicked', setAtomPickerEventListener, { once: true })
        } 

        return () => {
            if (props.awaitAtomClick === props.id) {
                document.removeEventListener('atomClicked', setAtomPickerEventListener)
            }
        }
    }, [props.awaitAtomClick])

    return <Card style={{width: '100%', height: '100%', margin: 0, padding: '0.5rem', borderColor: 'grey', borderWidth: 3, overflowX: 'hidden', overflowY: 'auto'}}>
            <Stack direction='vertical' gap={2} style={{justifyContent: 'space-between'}}>
            <InputGroup>
                <Button variant="primary" onClick={() => props.setAwaitAtomClick(props.id)}>
                    Set Atom {props.id}
                </Button>
                <Form.Control type="text" readOnly={true} value={selectedAtom ? selectedAtom : 'No atom selected'} />
            </InputGroup>
            <div>
            <Form.Label style={{marginTop:'0.2rem', marginBottom: 0, display:'flex', justifyContent: 'left'}}>
                Delete atom...
            </Form.Label>
            <InputGroup>
                <SplitButton title={deleteAtom ? "Yes" : "No"}>
                    {/* @ts-ignore */}
                    <Dropdown.Item key="Yes" onClick={() => {
                        deleteAtomValueRef.current = true
                        setDeleteAtom(true)
                    }}>Yes</Dropdown.Item>
                    <Dropdown.Item key="No" onClick={() => {
                        deleteAtomValueRef.current = false
                        setDeleteAtom(false)
                    }}>No</Dropdown.Item>
                </SplitButton>
                <Form.Select disabled={!deleteAtom} ref={deleteSelectedAtomValueRef}>
                    {monomerAtoms.map(atom => {
                        const label = parseAtomInfoLabel(atom)
                        return <option key={label} value={label}>{atom.has_altloc ? `${atom.name}:${atom.alt_loc}` : atom.name}</option>
                    }) }
                </Form.Select>
            </InputGroup>
            </div>
            <div>
            <Form.Label style={{marginTop:'0.2rem', marginBottom: 0, display:'flex', justifyContent: 'left'}}>
                Change order of bond...
            </Form.Label>
            <InputGroup>
                <SplitButton title={changeOrderBond ? "Yes" : "No"}>
                    {/* @ts-ignore */}
                    <Dropdown.Item key="Yes" onClick={() => {
                        changeBondOrderValueRef.current = true
                        setChangeOrderBond(true)
                    }}>Yes</Dropdown.Item>
                    <Dropdown.Item key="No" onClick={() => {
                        changeBondOrderValueRef.current = false
                        setChangeOrderBond(false)
                    }}>No</Dropdown.Item>
                    </SplitButton>
                <Form.Select ref={changeSelectedBondOrderValueRef} disabled={!changeOrderBond}>
                    {monomerBonds.map(bond => <option key={bond.label} value={bond.label}>{bond.label}</option>) }
                </Form.Select>            
            </InputGroup>
            <Row style={{justifyContent: 'center', display: changeOrderBond ? 'flex' : 'none'}}>
                <Form.Select style={{width: '50%'}} ref={newBondOrderValueRef}>
                    <option key={'SINGLE'} value={'SINGLE'}>SINGLE</option>
                    <option key={'DOUBLE'} value={'DOUBLE'}>DOUBLE</option>
                    <option key={'TRIPLE'} value={'TRIPLE'}>TRIPLE</option>
                </Form.Select>
            </Row>
            </div>
            <div>
            <Form.Label style={{marginTop:'0.2rem', marginBottom: 0, display:'flex', justifyContent: 'left'}}>
                Change formal charge of an atom...
            </Form.Label>
            <InputGroup>
                <SplitButton title={changeAtomCharge ? "Yes" : "No"}>
                    {/* @ts-ignore */}
                    <Dropdown.Item key="Yes" onClick={() => {
                        changeAtomChargeValueRef.current = true
                        setChangeAtomCharge(true)
                    }}>Yes</Dropdown.Item>
                    <Dropdown.Item key="No" onClick={() => {
                        changeAtomChargeValueRef.current = false
                        setChangeAtomCharge(false)
                    }}>No</Dropdown.Item>
                </SplitButton>
                <Form.Select disabled={!changeAtomCharge} ref={changeSelectedAtomChargeValueRef}>
                    {monomerAtoms.map(atom => {
                        const label = parseAtomInfoLabel(atom)
                        return <option key={label} value={label}>{atom.has_altloc ? `${atom.name}:${atom.alt_loc}` : atom.name}</option>
                    }) }
                </Form.Select>
            </InputGroup>
            <Row style={{justifyContent: 'center', display: changeAtomCharge ? 'flex' : 'none'}}>
                <TextField
                    style={{margin: '0.5rem', width: '50%'}} 
                    label='New charge'
                    type='number'
                    variant="standard"
                    error={isNaN(parseInt(newAtomCharge)) || parseInt(newAtomCharge) === Infinity}
                    value={newAtomCharge}
                    onChange={(evt) => {
                        newAtomChargeValueRef.current = evt.target.value
                        setNewAtomCharge(evt.target.value)
                    }}
                />
            </Row>
            </div>
    </Stack>
    </Card> 

})

AceDRGtomPicker.displayName = "AceDRGtomPicker"

export const MoorhenCreateAcedrgLinkModal = (props: {
    width: number;
}) => {
    
    const atomPickerOneRef = useRef(null)
    const atomPickerTwoRef = useRef(null)

    const moorhenGlobalInstance = useMoorhenGlobalInstance()
    const aceDRGInstance = moorhenGlobalInstance.getAceDRGInstance() 
    const monomerLibraryPath = usePaths().monomerLibraryPath
    const [awaitAtomClick, setAwaitAtomClick] = useState<number>(-1)
    const [errorMessage, setErrorMessage] = useState<string>('')
    
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)
    const width = useSelector((state: moorhen.State) => state.sceneSettings.width)

    const dispatch = useDispatch()

    const handleCancel = () => {
        dispatch( hideModal(modalKeys.ACEDRG) )
    }

    const handleSubmitToAcedrg = async () => {
        setErrorMessage('')
        const atomOneFormData = atomPickerOneRef.current.getFormData() as moorhen.createCovLinkAtomInput
        const atomTwoFormData = atomPickerTwoRef.current.getFormData() as moorhen.createCovLinkAtomInput
        console.log(atomOneFormData)
        console.log(atomTwoFormData)
        if (aceDRGInstance) {
            try {
                await aceDRGInstance.createCovalentLink(atomOneFormData, atomTwoFormData)
                dispatch( hideModal(modalKeys.ACEDRG) )
            } catch (err) {
                console.log('Something went wrong while trying to run aceDRG...')
                console.log(err)
                setErrorMessage(`ERROR: ${err}`)
            }
        }
    }

    return <MoorhenDraggableModalBase 
                modalId={modalKeys.ACEDRG}
                headerTitle="Create covalent link"
                left={width / 2}
                top={height / 3}
                minHeight={convertViewtoPx(10, height)}
                minWidth={convertRemToPx(37)}
                maxHeight={convertViewtoPx(90, height)}
                maxWidth={convertRemToPx(55)}
                additionalChildren={
                    <Backdrop sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }} open={awaitAtomClick !== -1}>
                        <Stack gap={2} direction='vertical'style={{justifyContent: 'center', alignItems: 'center'}}>
                            <Spinner animation="border" style={{ marginRight: '0.5rem' }}/>
                            <span>Click on an atom...</span>
                            <Button variant='danger' onClick={() => setAwaitAtomClick(-1)}>Cancel</Button>
                        </Stack>
                    </Backdrop>
                }
                body={
                    <Stack direction='horizontal' gap={2} style={{display: 'flex', flexDirection: 'row', justifyContent: 'space-between', height: '100%'}}>
                        <AceDRGtomPicker id={1} ref={atomPickerOneRef} awaitAtomClick={awaitAtomClick} setAwaitAtomClick={setAwaitAtomClick} monomerLibraryPath={monomerLibraryPath}/>
                        <AceDRGtomPicker id={2} ref={atomPickerTwoRef} awaitAtomClick={awaitAtomClick} setAwaitAtomClick={setAwaitAtomClick} monomerLibraryPath={monomerLibraryPath}/>
                    </Stack>
                }
                footer={
                    <div style={{display: 'flex', justifyContent: 'space-between', width: '100%'}}>
                    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'left', width: '50%'}}>
                        <Form.Control type="text" readOnly={true} value={errorMessage}/>
                    </div>
                    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'right'}}>
                        <Button variant='primary' onClick={handleSubmitToAcedrg}>Run AceDRG</Button>
                        <Button variant='danger' onClick={handleCancel} style={{marginLeft: '0.1rem'}}>Cancel</Button>
                    </div>
                    </div>
                }
                
            />
}
