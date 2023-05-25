import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react";
import { cidToSpec } from "../../utils/MoorhenUtils";
import Draggable from "react-draggable";
import { Button, Card, Dropdown, Form, InputGroup, Row, Spinner, SplitButton, Stack } from "react-bootstrap";
import { Backdrop, IconButton, TextField } from "@mui/material";
import { CloseOutlined } from "@mui/icons-material";

const AceDRGtomPicker = forwardRef((props, ref) => {
    const [selectedAtom, setSelectedAtom] = useState(null)
    const [monomerAtoms, setMonomerAtoms] = useState([])
    const [monomerBonds, setMonomerBonds] = useState([])
    const [deleteAtom, setDeleteAtom] = useState(false)
    const [changeOrderBond, setChangeOrderBond] = useState(false)
    const [changeAtomCharge, setChangeAtomCharge] = useState(false)
    const [newAtomCharge, setNewAtomCharge] = useState(null)

    const selectedAtomValueRef = useRef(null)
    const deleteAtomValueRef = useRef(null)
    const deleteSelectedAtomValueRef = useRef(null)
    const changeAtomChargeValueRef = useRef(null)
    const changeSelectedAtomChargeValueRef = useRef(null)
    const newAtomChargeValueRef = useRef(null)
    const changeBondOrderValueRef = useRef(null)
    const changeSelectedBondOrderValueRef = useRef(null)
    const newBondOrderValueRef = useRef(null)

    useImperativeHandle(ref, () => ({
        getFormData: () => {return {
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
    [selectedAtomValueRef, deleteAtomValueRef, deleteSelectedAtomValueRef, changeSelectedAtomChargeValueRef, changeSelectedBondOrderValueRef, changeAtomChargeValueRef, newAtomChargeValueRef, newBondOrderValueRef, changeBondOrderValueRef])

    const getBonds = async (chosenMolecule, chosenAtom) => {
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
        
        let bonds = []
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
        const chosenMolecule = props.molecules.find(molecule => molecule.buffersInclude(evt.detail.buffer))
        const chosenAtom = cidToSpec(evt.detail.atom.label)
        const chosenResidueCid = `/${chosenAtom.mol_no}/${chosenAtom.chain_id}/${chosenAtom.res_no}-${chosenAtom.res_no}/*`
        const [atoms, monomerBonds] = await Promise.all([chosenMolecule.gemmiAtomsForCid(chosenResidueCid), getBonds(chosenMolecule, chosenAtom)])
        setSelectedAtom(chosenAtom.cid)
        selectedAtomValueRef.current = chosenAtom.cid
        setMonomerAtoms(atoms)
        setMonomerBonds(monomerBonds)
        props.setAwaitAtomClick(false)
    }

    useEffect(() => {
        if (props.awaitAtomClick === props.id) {
            document.addEventListener('atomClicked', setAtomPickerEventListener, { once: true })
        } 

        return () => {
            if (props.awaitAtomClick === props.id) {
                document.removeEventListener('atomClicked', setAtomPickerEventListener, { once: true })
            }
        }
    }, [props.awaitAtomClick])

    return <Card style={{margin: 0, padding: '0.5rem', borderColor: 'grey', borderWidth: 3}}>
            <Stack direction='vertical' gap={2}>
            <InputGroup>
                <Button variant="primary" onClick={() => props.setAwaitAtomClick(props.id)}>
                    Set Atom {props.id}
                </Button>
                <Form.Control type="text" readOnly={true} value={selectedAtom ? selectedAtom : 'No atom selected'} />
            </InputGroup>
            <Form.Label style={{marginTop:'0.2rem', marginBottom: 0, display:'flex', justifyContent: 'left'}}>
                Delete atom...
            </Form.Label>
            <InputGroup>
                <SplitButton title={deleteAtom ? "Yes" : "No"}>
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
                    {monomerAtoms.map(atom => <option key={atom.label} value={atom.label}>{atom.has_altloc ? `${atom.name}:${atom.alt_loc}` : atom.name}</option>) }
                </Form.Select>
            </InputGroup>
            <Form.Label style={{marginTop:'0.2rem', marginBottom: 0, display:'flex', justifyContent: 'left'}}>
                Change order of bond...
            </Form.Label>
            <InputGroup>
                <SplitButton title={changeOrderBond ? "Yes" : "No"}>
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
            <Form.Label style={{marginTop:'0.2rem', marginBottom: 0, display:'flex', justifyContent: 'left'}}>
                Change formal charge of an atom...
            </Form.Label>
            <InputGroup>
                <SplitButton title={changeAtomCharge ? "Yes" : "No"}>
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
                    {monomerAtoms.map(atom => <option key={atom.label} value={atom.label}>{atom.has_altloc ? `${atom.name}:${atom.alt_loc}` : atom.name}</option>) }
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
    </Stack>
    </Card> 

})

export const MoorhenCreateAcedrgLinkModal = (props) => {
    const [opacity, setOpacity] = useState(1.0)
    const [awaitAtomClick, setAwaitAtomClick] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const atomPickerOneRef = useRef(null)
    const atomPickerTwoRef = useRef(null)

    const handleCancel = () => {
        props.setShowCreateAcedrgLinkModal(false)
    }

    const handleSubmitToAcedrg = async () => {
        setErrorMessage('')
        const atomOneFormData = atomPickerOneRef.current.getFormData()
        const atomTwoFormData = atomPickerTwoRef.current.getFormData()
        if (props.aceDRGInstance) {
            try {
                await props.aceDRGInstance.createCovalentLink(atomOneFormData, atomTwoFormData)
                props.setShowCreateAcedrgLinkModal(false)
            } catch (err) {
                console.log('Something went wrong while trying to run aceDRG...')
                console.log(err)
                setErrorMessage(`ERROR: ${err}`)
            }
        }
    }

    return  props.showCreateAcedrgLinkModal ?
        <Draggable handle=".handle">
            <Card style={{position: 'absolute', width: '45rem', opacity: opacity, top: '25rem', left: '25rem'}} onMouseOver={() => setOpacity(1)} onMouseOut={() => setOpacity(0.5)}>
            <Backdrop sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }} open={awaitAtomClick}>
            <Stack gap={2} direction='vertical'style={{justifyContent: 'center', alignItems: 'center'}}>
                <Spinner animation="border" style={{ marginRight: '0.5rem' }}/>
                <span>Click on an atom...</span>
                <Button variant='danger' onClick={() => setAwaitAtomClick(false)}>Cancel</Button>
            </Stack>
            </Backdrop>
            <Card.Header className='handle' style={{display: 'flex', alignItems: 'center', cursor: 'move', justifyContent: 'space-between'}}>
                Create covalent link
                <IconButton onClick={handleCancel}>
                    <CloseOutlined/>
                </IconButton>
            </Card.Header>
            <Card.Body style={{ alignItems: 'center', alignContent: 'center', justifyContent: 'center' }}>
                <Stack direction='horizontal' gap={2}>
                    <AceDRGtomPicker id={1} ref={atomPickerOneRef} awaitAtomClick={awaitAtomClick} setAwaitAtomClick={setAwaitAtomClick} {...props}/>
                    <AceDRGtomPicker id={2} ref={atomPickerTwoRef} awaitAtomClick={awaitAtomClick} setAwaitAtomClick={setAwaitAtomClick} {...props}/>
                </Stack>
            </Card.Body>
            <Card.Footer style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'left', width: '60%'}}>
                    <Form.Control type="text" readOnly={true} value={errorMessage}/>
                </div>
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'right'}}>
                    <Button variant='primary' onClick={handleSubmitToAcedrg}>Run AceDRG</Button>
                    <Button variant='danger' onClick={handleCancel} style={{marginLeft: '0.1rem'}}>Cancel</Button>
                </div>
            </Card.Footer>
            </Card>
        </Draggable>
    : 
    null
}
